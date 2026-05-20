import { Router } from 'express'
import { Notification } from '../models/Notification.js'
import { requireAuth } from '../middleware/auth.js'

export const notificationsRouter = Router()

notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const items = await Notification.find({ userId: req.auth!.userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean()
    const unread = await Notification.countDocuments({ userId: req.auth!.userId, readAt: { $exists: false } })
    res.json({ items, unread })
  } catch (err) {
    next(err)
  }
})

notificationsRouter.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.auth!.userId, readAt: { $exists: false } },
      { $set: { readAt: new Date() } },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

notificationsRouter.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await Notification.updateOne(
      { _id: req.params.id, userId: req.auth!.userId },
      { $set: { readAt: new Date() } },
    )
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
