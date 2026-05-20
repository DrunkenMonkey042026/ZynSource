# ZynSource FAQ

## What is ZynSource?

ZynSource is a recruitment platform built India-first. Job seekers can build a profile, upload a resume, get AI-matched to roles, and apply. Recruiters can post jobs, run an ATS Kanban pipeline (Applied → Screening → Interview → Offer → Hired/Rejected), and get AI-screened candidates.

## For job seekers

**How do I create a profile?**
Sign up as a seeker. After registering, you land on `/me/profile`. Required fields: headline, city, years of experience, skills (≥1), expected salary. Upload your resume (PDF/DOC/DOCX up to 5MB) and our AI will extract skills, work history, and education for you to review.

**How does AI matching work?**
We turn your profile (headline, skills, work history, education) into an embedding (a 1536-dim vector) using OpenAI's `text-embedding-3-small`. We do the same for every open job. Cosine similarity between your profile and each job becomes a 0–100% match score. You'll see it on every job card while signed in.

**How do I apply to a job?**
Open the job, click "Apply now". You'll be prompted for a cover letter (optional). If the job has AI screening questions enabled, you'll answer 3 short questions; the AI scores each answer 0–10.

**Why can't I apply?**
You need a complete profile (the 5 required fields) and a resume. The Apply dialog will tell you exactly what's missing.

**Can I save searches?**
Yes — on `/jobs`, apply your filters and click "Save this search" (signed-in seekers only). You'll get an email digest daily or weekly.

## For recruiters

**How do I post a job?**
Sign up as a recruiter. Go to `/recruiter/jobs/new`. Fill in title, company, city, salary range, skills, description, etc. Optionally toggle "AI screening questions" — we'll generate 3 role-specific questions for applicants.

**What is "Improve with AI" on the job form?**
It rewrites your rough description into clearer, more structured markdown — sections like "About the role", "What you'll do", "What we're looking for". You review and accept before posting.

**How do I review applicants?**
Open the job from "My jobs", then click "Applicants". You'll see a Kanban with six columns. Drag cards between columns to update status, or use the dropdown in the detail dialog. Sort by AI match (or screening score) at the top right.

**What is the verified employer badge?**
A green check on your jobs. Currently it's flipped manually by ZynSource staff after a light vetting call.

## Privacy & security

- Resumes are stored privately in AWS S3 and served via short-lived presigned URLs.
- We never share applicant data with anyone except the recruiter for the specific job they applied to.
- You can delete your account by emailing support@zynsource.app (until we ship a self-serve delete in the next release).
