import { Schema, model } from 'mongoose'

const WorkHistorySchema = new Schema(
  {
    company: String,
    title: String,
    startDate: String,
    endDate: String,
    description: String,
  },
  { _id: false },
)

const EducationSchema = new Schema(
  {
    institution: String,
    degree: String,
    year: String,
  },
  { _id: false },
)

const ParsePreviewSchema = new Schema(
  {
    headline: String,
    skills: [String],
    workHistory: [WorkHistorySchema],
    education: [EducationSchema],
  },
  { _id: false },
)

const ProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    headline: { type: String, default: '' },
    location: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    experienceYears: { type: Number, default: 0 },
    currentSalaryINR: { type: Number },
    expectedSalaryINR: { type: Number },
    skills: { type: [String], default: [] },
    workHistory: { type: [WorkHistorySchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    resumeUrl: { type: String, default: '' }, // last-signed URL (may be stale; refresh from resumeKey)
    resumeKey: { type: String, default: '' }, // S3 object key, or "/uploads/..." for local fallback
    visaSponsorshipNeeded: { type: Boolean, default: false },
    openToRemote: { type: Boolean, default: true },
    visibilityScore: { type: Number, default: 0 },
    // Phase 2A: AI fields
    embedding: { type: [Number], default: undefined, select: false }, // sparse, 1024 floats
    parseStatus: { type: String, enum: ['idle', 'pending', 'done', 'failed'], default: 'idle' },
    parsePreview: { type: ParsePreviewSchema, default: null },
  },
  { timestamps: true },
)

export const Profile = model('Profile', ProfileSchema)
