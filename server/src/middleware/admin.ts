import type { Request, Response, NextFunction } from 'express'
import { User } from '../models/User.js'
import { adminEmails } from '../lib/env.js'

/**
 * Gate routes by ADMIN_EMAILS env list. Requires `requireAuth` to have run first.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) return res.status(401).json({ error: 'Authentication required' })
  if (adminEmails.size === 0) return res.status(403).json({ error: 'No admins configured (set ADMIN_EMAILS)' })
  const user = await User.findById(req.auth.userId).select('email').lean()
  if (!user || !adminEmails.has(user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin only' })
  }
  next()
}
