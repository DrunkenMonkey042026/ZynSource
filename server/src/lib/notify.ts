import { Notification, type NotificationType } from '../models/Notification.js'

/**
 * Create an in-app notification. Best-effort; never throws.
 */
export async function notify(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
}) {
  try {
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      link: input.link ?? '',
    })
  } catch (err) {
    console.error('[notify] failed:', err)
  }
}
