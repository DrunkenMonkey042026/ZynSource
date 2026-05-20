import { renderChrome, sendMail } from '../lib/mail.js'
import { env } from '../lib/env.js'

const APP = env.CLIENT_URL.replace(/\/+$/, '')

export async function sendWelcomeEmail(input: { to: string; name: string; role: 'seeker' | 'recruiter' }) {
  const body = `
    <p>Hi ${escape(input.name)},</p>
    <p>Welcome to <b>ZynSource</b> — India's modern hiring platform.</p>
    ${
      input.role === 'seeker'
        ? `<p>Get started by completing your profile and uploading your resume. Our AI will match you to roles that fit.</p>`
        : `<p>Get started by posting your first job. Our ATS Kanban + AI matching makes hiring feel half the work.</p>`
    }`
  return sendMail({
    to: input.to,
    subject: 'Welcome to ZynSource',
    html: renderChrome({
      headline: 'Welcome aboard',
      bodyHtml: body,
      ctaLabel: input.role === 'seeker' ? 'Complete your profile' : 'Post a job',
      ctaUrl: input.role === 'seeker' ? `${APP}/me/profile` : `${APP}/recruiter/jobs/new`,
    }),
  })
}

export async function sendApplicationSubmittedEmail(input: { to: string; name: string; jobTitle: string; company: string; jobId: string }) {
  const body = `
    <p>Hi ${escape(input.name)},</p>
    <p>Your application for <b>${escape(input.jobTitle)}</b> at <b>${escape(input.company)}</b> has been received.</p>
    <p>You'll get an update here when the recruiter moves it forward.</p>`
  return sendMail({
    to: input.to,
    subject: `Application sent — ${input.jobTitle}`,
    html: renderChrome({
      headline: 'Application received',
      bodyHtml: body,
      ctaLabel: 'Track applications',
      ctaUrl: `${APP}/me/applications`,
    }),
  })
}

const STATUS_COPY: Record<string, { headline: string; body: string }> = {
  screening: { headline: "You're being screened", body: "The recruiter is reviewing your profile in detail." },
  interview: { headline: 'Interview stage', body: "You've moved to the interview stage. Expect to hear soon!" },
  offer: { headline: 'Offer stage', body: 'The recruiter has flagged you for an offer. Congrats!' },
  hired: { headline: '🎉 Hired!', body: 'You got the role. ZynSource is rooting for you.' },
  rejected: { headline: 'Update on your application', body: 'The recruiter has closed this application. Many more matches await — keep going.' },
}

export async function sendApplicationStatusChangedEmail(input: {
  to: string
  name: string
  jobTitle: string
  company: string
  status: string
}) {
  const c = STATUS_COPY[input.status] ?? { headline: 'Application updated', body: `Your status is now: ${input.status}` }
  const body = `
    <p>Hi ${escape(input.name)},</p>
    <p>Update on your application for <b>${escape(input.jobTitle)}</b> at <b>${escape(input.company)}</b>:</p>
    <p>${c.body}</p>`
  return sendMail({
    to: input.to,
    subject: `${c.headline} — ${input.jobTitle}`,
    html: renderChrome({
      headline: c.headline,
      bodyHtml: body,
      ctaLabel: 'View applications',
      ctaUrl: `${APP}/me/applications`,
    }),
  })
}

export async function sendNewApplicantEmail(input: {
  to: string
  recruiterName: string
  applicantName: string
  jobTitle: string
  jobId: string
}) {
  const body = `
    <p>Hi ${escape(input.recruiterName)},</p>
    <p><b>${escape(input.applicantName)}</b> just applied to <b>${escape(input.jobTitle)}</b>.</p>
    <p>Open the ATS to review their profile, AI match score, and screening answers.</p>`
  return sendMail({
    to: input.to,
    subject: `New applicant — ${input.jobTitle}`,
    html: renderChrome({
      headline: 'New applicant',
      bodyHtml: body,
      ctaLabel: 'Review in ATS',
      ctaUrl: `${APP}/recruiter/jobs/${input.jobId}/applicants`,
    }),
  })
}

export async function sendDigestEmail(input: {
  to: string
  name: string
  searchName: string
  jobs: { _id: string; title: string; company: string; city: string }[]
}) {
  const list = input.jobs
    .slice(0, 10)
    .map(
      (j) =>
        `<li style="margin-bottom:8px;"><a href="${APP}/jobs/${j._id}" style="color:#4f46e5;text-decoration:none;font-weight:500;">${escape(j.title)}</a> · ${escape(j.company)} · ${escape(j.city)}</li>`,
    )
    .join('')
  const body = `
    <p>Hi ${escape(input.name)},</p>
    <p>Here are the latest jobs matching <b>${escape(input.searchName)}</b>:</p>
    <ul style="padding-left:20px;">${list || '<li>No new matches this period.</li>'}</ul>`
  return sendMail({
    to: input.to,
    subject: `${input.jobs.length} new matches for "${input.searchName}"`,
    html: renderChrome({
      headline: `${input.jobs.length} new matches`,
      bodyHtml: body,
      ctaLabel: 'Browse all',
      ctaUrl: `${APP}/jobs`,
    }),
  })
}

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
