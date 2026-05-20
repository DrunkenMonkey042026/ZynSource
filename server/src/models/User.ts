import { Schema, model, type InferSchemaType } from 'mongoose'

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['seeker', 'recruiter'], required: true },
    // Phase 2B: verified employer
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    // Phase 2E: preferred locale
    locale: { type: String, default: 'en' },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string }
export const User = model('User', UserSchema)
