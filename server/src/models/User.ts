import { Schema, model, type InferSchemaType } from 'mongoose'

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['seeker', 'recruiter'], required: true },
  },
  { timestamps: true },
)

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: string }
export const User = model('User', UserSchema)
