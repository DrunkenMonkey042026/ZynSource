import path from 'node:path'
import fs from 'node:fs'
import { v2 as cloudinary } from 'cloudinary'
import { env, features } from './env.js'

if (features.cloudStorage) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME!,
    api_key: env.CLOUDINARY_API_KEY!,
    api_secret: env.CLOUDINARY_API_SECRET!,
    secure: true,
  })
}

export interface UploadedFile {
  url: string // public URL (or local /uploads/... path)
  publicId?: string // Cloudinary public_id, for deletion later
  bytes?: number
}

/**
 * Persist an uploaded file. Uses Cloudinary if credentials are present,
 * otherwise falls back to local /uploads (Phase 1 behaviour).
 */
export async function persistFile(localPath: string, originalName: string): Promise<UploadedFile> {
  if (features.cloudStorage) {
    const result = await cloudinary.uploader.upload(localPath, {
      resource_type: 'raw',
      folder: 'zynsource/resumes',
      use_filename: true,
      unique_filename: true,
      filename_override: originalName,
    })
    // Remove the temp local copy now that it's in Cloudinary
    try {
      fs.unlinkSync(localPath)
    } catch {
      /* ignore */
    }
    return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes }
  }

  // Local fallback: keep the file at /uploads/<filename>
  const filename = path.basename(localPath)
  return { url: `/uploads/${filename}` }
}

/**
 * Delete a previously persisted file. Best-effort; never throws.
 */
export async function deleteFile(file: { url?: string; publicId?: string }) {
  if (file.publicId && features.cloudStorage) {
    try {
      await cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw' })
    } catch {
      /* ignore */
    }
    return
  }
  if (file.url && file.url.startsWith('/uploads/')) {
    const local = path.join(process.cwd(), file.url)
    try {
      if (fs.existsSync(local)) fs.unlinkSync(local)
    } catch {
      /* ignore */
    }
  }
}
