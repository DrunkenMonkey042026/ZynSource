import { Schema, model } from 'mongoose'

export const NOTIFICATION_TYPES = [
  'welcome',
  'new_applicant',
  'application_status',
  'application_submitted',
  'review_received',
  'system',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: '' },
    readAt: { type: Date },
  },
  { timestamps: true },
)

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 })

export const Notification = model('Notification', NotificationSchema)
