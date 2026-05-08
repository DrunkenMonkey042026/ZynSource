import { Schema, model } from 'mongoose'

const JobSchema = new Schema(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    company: { type: String, required: true },
    companyLogoUrl: { type: String, default: '' },
    location: { type: String, default: '' },
    city: { type: String, required: true, index: true },
    state: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    workMode: { type: String, enum: ['onsite', 'hybrid', 'remote'], default: 'onsite' },
    jobType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship'], default: 'full-time' },
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number, default: 0 },
    salaryMinINR: { type: Number },
    salaryMaxINR: { type: Number },
    salaryHidden: { type: Boolean, default: false },
    skills: { type: [String], default: [], index: true },
    visaSponsorship: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'closed', 'draft'], default: 'open', index: true },
    applicationCount: { type: Number, default: 0 },
    // Phase 2A: AI matching
    embedding: { type: [Number], default: undefined, select: false },
  },
  { timestamps: true },
)

JobSchema.index({ status: 1, city: 1, skills: 1 })
JobSchema.index({ title: 'text', description: 'text', company: 'text' })

export const Job = model('Job', JobSchema)
