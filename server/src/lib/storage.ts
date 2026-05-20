import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env, features } from './env.js'

const s3 = features.cloudStorage
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  : null

export interface UploadedFile {
  key: string // S3 object key (or local /uploads/<file> when fallback)
  signedUrl: string // freshly-generated URL (S3 presigned, or local proxy path)
  bytes?: number
}

const URL_TTL_SECONDS = 60 * 60 // 1 hour
const SIGNED_URL_TTL_SECONDS = URL_TTL_SECONDS

function inferContentType(originalName: string) {
  const ext = path.extname(originalName).toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.doc') return 'application/msword'
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return 'application/octet-stream'
}

/**
 * Persist an uploaded local temp file. Uses S3 (private ACL) if credentials are present,
 * otherwise keeps it in /uploads (Phase 1 behaviour).
 */
export async function persistFile(localPath: string, originalName: string): Promise<UploadedFile> {
  if (s3 && env.AWS_S3_BUCKET) {
    const ext = path.extname(originalName).toLowerCase()
    const id = crypto.randomBytes(8).toString('hex')
    const key = `resumes/${Date.now()}-${id}${ext}`
    const body = fs.readFileSync(localPath)
    await s3.send(
      new PutObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: inferContentType(originalName),
        ContentDisposition: `inline; filename="${originalName.replace(/"/g, '')}"`,
      }),
    )
    // Best-effort cleanup of the multer temp file
    try {
      fs.unlinkSync(localPath)
    } catch {
      /* ignore */
    }
    const signedUrl = await signedUrlFor(key)
    return { key, signedUrl, bytes: body.length }
  }

  // Local fallback: keep the file at /uploads/<filename>; key is the same path.
  const filename = path.basename(localPath)
  const localUrl = `/uploads/${filename}`
  return { key: localUrl, signedUrl: localUrl }
}

/**
 * Generate a fresh presigned URL for an existing S3 key.
 * For local-fallback "keys" (those starting with /uploads/), just echo them back.
 */
export async function signedUrlFor(key: string, expiresIn = SIGNED_URL_TTL_SECONDS): Promise<string> {
  if (!key) return ''
  if (key.startsWith('/uploads/')) return key
  if (!s3 || !env.AWS_S3_BUCKET) return key
  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }),
      { expiresIn },
    )
  } catch (err) {
    console.error('[storage.signedUrlFor] failed:', err)
    return ''
  }
}

/**
 * Delete a previously persisted file. Best-effort; never throws.
 */
export async function deleteFile({ key }: { key?: string }) {
  if (!key) return
  if (key.startsWith('/uploads/')) {
    const local = path.join(process.cwd(), key)
    try {
      if (fs.existsSync(local)) fs.unlinkSync(local)
    } catch {
      /* ignore */
    }
    return
  }
  if (!s3 || !env.AWS_S3_BUCKET) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }))
  } catch {
    /* ignore */
  }
}

/**
 * Fetch the bytes of a file. Used to send PDFs to OpenAI for parsing.
 * Works for both S3 keys and local /uploads paths.
 */
export async function fetchBytes(key: string): Promise<Buffer | null> {
  if (!key) return null
  if (key.startsWith('/uploads/')) {
    const local = path.join(process.cwd(), key)
    try {
      return fs.readFileSync(local)
    } catch {
      return null
    }
  }
  if (!s3 || !env.AWS_S3_BUCKET) return null
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: key }))
    const chunks: Buffer[] = []
    const stream = res.Body as NodeJS.ReadableStream
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer))
    }
    return Buffer.concat(chunks)
  } catch (err) {
    console.error('[storage.fetchBytes] failed:', err)
    return null
  }
}
