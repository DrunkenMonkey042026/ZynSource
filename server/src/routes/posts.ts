import { Router } from 'express'
import { z } from 'zod'
import { Post } from '../models/Post.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { HttpError } from '../middleware/error.js'
import { toSlug } from '../lib/slug.js'

export const postsRouter = Router()

// Public — list published posts
postsRouter.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))
    const tag = String(req.query.tag || '').trim()

    const filter: Record<string, unknown> = { status: 'published' }
    if (tag) filter.tags = tag

    const [items, total] = await Promise.all([
      Post.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-bodyMarkdown')
        .lean(),
      Post.countDocuments(filter),
    ])
    res.json({ items, total, page, limit })
  } catch (err) {
    next(err)
  }
})

// Public — single post
postsRouter.get('/:slug', async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' }).lean()
    if (!post) throw new HttpError(404, 'Post not found')
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

const postSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).optional(),
  excerpt: z.string().max(280).optional(),
  bodyMarkdown: z.string().min(10),
  coverImageUrl: z.string().optional(),
  authorName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
})

// Admin — create
postsRouter.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const input = postSchema.parse(req.body)
    const slug = input.slug || toSlug(input.title)
    const publishedAt = input.status === 'published' ? new Date() : undefined
    const post = await Post.create({ ...input, slug, publishedAt })
    res.json({ post })
  } catch (err) {
    next(err)
  }
})

// Admin — update
postsRouter.patch('/:slug', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
    if (!post) throw new HttpError(404, 'Post not found')
    const input = postSchema.partial().parse(req.body)
    Object.assign(post, input)
    if (input.status === 'published' && !post.publishedAt) post.publishedAt = new Date()
    await post.save()
    res.json({ post })
  } catch (err) {
    next(err)
  }
})
