import { Schema, model } from 'mongoose'

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logoUrl: { type: String, default: '' },
    aboutMarkdown: { type: String, default: '' },
    websiteUrl: { type: String, default: '' },
    locationsText: { type: String, default: '' },
    sizeText: { type: String, default: '' },
    founded: { type: String, default: '' },
    // Cached aggregates, refreshed lazily
    reviewCount: { type: Number, default: 0 },
    reviewAverage: { type: Number, default: 0 },
  },
  { timestamps: true },
)

CompanySchema.index({ name: 'text' })

export const Company = model('Company', CompanySchema)
