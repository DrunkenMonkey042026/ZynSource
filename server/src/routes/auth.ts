import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { User } from '../models/User.js'
import { Profile } from '../models/Profile.js'
import { requireAuth, signToken } from '../middleware/auth.js'
import { HttpError } from '../middleware/error.js'

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['seeker', 'recruiter']),
})

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const existing = await User.findOne({ email: input.email })
    if (existing) throw new HttpError(409, 'Email already registered')
    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await User.create({
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
    })
    if (input.role === 'seeker') {
      await Profile.create({ userId: user._id })
    }
    const token = signToken({ userId: String(user._id), role: user.role as 'seeker' | 'recruiter' })
    res.json({
      token,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body)
    const user = await User.findOne({ email: input.email })
    if (!user) throw new HttpError(401, 'Invalid credentials')
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new HttpError(401, 'Invalid credentials')
    const token = signToken({ userId: String(user._id), role: user.role as 'seeker' | 'recruiter' })
    res.json({
      token,
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth!.userId)
    if (!user) throw new HttpError(404, 'User not found')
    res.json({
      user: { id: String(user._id), email: user.email, name: user.name, role: user.role },
    })
  } catch (err) {
    next(err)
  }
})
