import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatINR(amount?: number) {
  if (amount == null) return ''
  if (amount >= 10_000_00) {
    return `₹${(amount / 100_000).toFixed(1)} L`
  }
  if (amount >= 1_000) {
    return `₹${(amount / 1_000).toFixed(0)}k`
  }
  return `₹${amount}`
}

export function formatSalaryRange(min?: number, max?: number, hidden?: boolean) {
  if (hidden) return 'Not disclosed'
  if (min && max) return `${formatINR(min)} – ${formatINR(max)} per year`
  if (min) return `From ${formatINR(min)} per year`
  if (max) return `Up to ${formatINR(max)} per year`
  return 'Not disclosed'
}

export function timeAgo(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}
