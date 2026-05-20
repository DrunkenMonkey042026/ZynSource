import nodemailer, { type Transporter } from 'nodemailer'
import { env, features } from './env.js'

let transporter: Transporter | null = null
if (features.email) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  })
  transporter.verify().then(
    () => console.log('[mail] SMTP transport ready'),
    (err) => console.warn('[mail] SMTP verify failed:', err?.message ?? err),
  )
}

export interface SendMailInput {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(input: SendMailInput): Promise<{ sent: boolean; messageId?: string }> {
  if (!transporter) {
    // No-op fallback when SMTP isn't configured — log to console so devs see what would have been sent.
    console.log(`[mail:noop] To: ${input.to}\n  Subject: ${input.subject}`)
    return { sent: false }
  }
  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error('[mail] send failed:', err)
    return { sent: false }
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Shared chrome for all our emails — brand gradient header + container + footer.
 * Keep CSS inline; many clients strip <style>.
 */
export function renderChrome(opts: { headline: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }) {
  const { headline, bodyHtml, ctaLabel, ctaUrl } = opts
  return `<!doctype html>
<html>
<body style="margin:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(90deg,#4f46e5,#d946ef,#fb923c);padding:24px;border-radius:16px 16px 0 0;color:#fff;">
      <div style="font-size:14px;opacity:.9;font-weight:500;">ZynSource</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(headline)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px;padding:24px;font-size:15px;line-height:1.6;">
      ${bodyHtml}
      ${
        ctaLabel && ctaUrl
          ? `<div style="text-align:center;margin-top:24px;"><a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">${escapeHtml(ctaLabel)}</a></div>`
          : ''
      }
    </div>
    <div style="text-align:center;color:#64748b;font-size:12px;margin-top:16px;">
      You're receiving this because you have an account on ZynSource.
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string) {
  return s.replace(/"/g, '&quot;')
}
