import { Schema, model } from 'mongoose'

export const APPLICATION_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

const NoteSchema = new Schema(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true },
)

const StatusHistorySchema = new Schema(
  {
    from: String,
    to: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false },
)

const ApplicationSchema = new Schema(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeUrlSnapshot: { type: String, default: '' },
    coverLetter: { type: String, default: '' },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied', index: true },
    notes: { type: [NoteSchema], default: [] },
    statusHistory: { type: [StatusHistorySchema], default: [] },
  },
  { timestamps: true },
)

ApplicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true })
ApplicationSchema.index({ jobId: 1, status: 1 })

export const Application = model('Application', ApplicationSchema)
