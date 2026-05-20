import { Schema, model } from 'mongoose'

const SavedSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Mirror /api/jobs filter shape. Stored as a plain object.
    filters: {
      q: { type: String, default: '' },
      city: { type: String, default: '' },
      skills: { type: String, default: '' },
      jobType: { type: String, default: '' },
      workMode: { type: String, default: '' },
      expMin: { type: String, default: '' },
      salaryMin: { type: String, default: '' },
    },
    frequency: { type: String, enum: ['instant', 'daily', 'weekly'], default: 'daily' },
    lastSentAt: { type: Date },
  },
  { timestamps: true },
)

export const SavedSearch = model('SavedSearch', SavedSearchSchema)
