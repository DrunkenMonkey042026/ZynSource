import { Schema, model } from 'mongoose'

const ReviewSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    headline: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    anonymous: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// One review per (company, author) pair
ReviewSchema.index({ companyId: 1, authorUserId: 1 }, { unique: true })

export const Review = model('Review', ReviewSchema)
