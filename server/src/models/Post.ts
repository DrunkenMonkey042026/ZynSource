import { Schema, model } from 'mongoose'

const PostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, default: '', maxlength: 280 },
    bodyMarkdown: { type: String, required: true },
    coverImageUrl: { type: String, default: '' },
    authorName: { type: String, default: 'ZynSource' },
    tags: { type: [String], default: [], index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
)

PostSchema.index({ title: 'text', excerpt: 'text', bodyMarkdown: 'text' })

export const Post = model('Post', PostSchema)
