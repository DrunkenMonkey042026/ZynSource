import { Schema, model } from 'mongoose'

const AnonymousAlertSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    filters: {
      q: { type: String, default: '' },
      city: { type: String, default: '' },
      skills: { type: String, default: '' },
      jobType: { type: String, default: '' },
      workMode: { type: String, default: '' },
      expMin: { type: String, default: '' },
      salaryMin: { type: String, default: '' },
    },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'weekly' },
    confirmToken: { type: String, default: '' },
    confirmed: { type: Boolean, default: false },
    lastSentAt: { type: Date },
  },
  { timestamps: true },
)

export const AnonymousAlert = model('AnonymousAlert', AnonymousAlertSchema)
