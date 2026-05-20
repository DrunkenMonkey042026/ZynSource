# ZynSource — Deployment Guide

Production deployment on a **two-machine** stack:

- **Backend → AWS EC2** (your preference; Render is also documented below as a one-click alternative)
- **Frontend → Vercel** (free hobby tier)
- **Database → MongoDB Atlas** (already in use)
- **Resume storage → AWS S3** (already in use)
- **Email → Brevo SMTP** (300/day free) or **Gmail SMTP** (App Password)
- **Observability** (optional) → Sentry + PostHog

Total cost on free tiers: **₹0/month** for low traffic. EC2 `t3.micro` is free for 12 months (AWS Free Tier) then ~$8/month if you don't downsize. Add a custom domain (~₹800/yr) and you're public.

---

## 0. Push the repo to GitHub

```bash
git init
git add .
git commit -m "Production-ready commit"
gh repo create zynsource --public --source=. --remote=origin --push
```

If `gh` isn't installed, create the repo at https://github.com/new and push manually.

---

## 1. Backend — AWS EC2 (recommended)

### 1a. Launch the instance

1. AWS Console → **EC2** → Launch Instance.
2. **Name**: `zynsource-api`.
3. **AMI**: Ubuntu Server 22.04 LTS (HVM) — the free-tier-eligible option.
4. **Instance type**: `t3.micro` (free tier) or `t3.small` for headroom.
5. **Key pair**: Create a new one called `zynsource` → download the `.pem` → keep it safe.
6. **Network settings → Edit**:
   - Allow SSH (port 22) from **My IP** (not anywhere).
   - Allow HTTP (port 80) from **Anywhere**.
   - Allow HTTPS (port 443) from **Anywhere**.
7. **Storage**: 20 GB gp3.
8. **Advanced → IAM instance profile**: leave for now; we'll add S3 permissions next step.
9. Launch. Wait for "Running" + status check passed.

### 1b. Attach an IAM role for S3 (security win — replaces baked-in keys)

1. IAM Console → **Roles** → Create role.
2. Trusted entity: **AWS service** → **EC2**.
3. Permissions → attach **AmazonS3FullAccess** (you can tighten this later to a custom policy that allows only `s3:GetObject`/`PutObject`/`DeleteObject` on `arn:aws:s3:::zynsource-s3-bucket/*`).
4. Role name: `zynsource-ec2-role`.
5. EC2 Console → select your instance → **Actions** → **Security** → **Modify IAM role** → pick `zynsource-ec2-role`.

After this, you can **remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from `.env`** on the instance. The AWS SDK auto-discovers credentials from the EC2 metadata service. Less secret material on disk → smaller blast radius if the box is compromised.

### 1c. (Recommended) Allocate an Elastic IP

EC2 instances get a new public IP on stop/start by default. To avoid your domain pointing nowhere after a reboot:

1. EC2 → **Elastic IPs** → Allocate.
2. Actions → Associate → pick your instance.
3. Note the IP (e.g. `13.232.45.67`).

Elastic IPs are free *while attached* to a running instance; AWS charges if you allocate and don't attach.

### 1d. SSH in and install Node.js + PM2

From your local Windows machine, in PowerShell:

```powershell
# Make sure the .pem isn't world-readable:
icacls .\zynsource.pem /inheritance:r /grant:r "$($env:USERNAME):(R)"

# SSH in:
ssh -i .\zynsource.pem ubuntu@<your-elastic-ip>
```

On the EC2 box:

```bash
# System update
sudo apt-get update && sudo apt-get upgrade -y

# Install Node 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Verify
node --version  # should print v20.x
npm --version

# Install pm2 globally
sudo npm install -g pm2
```

### 1e. Clone the repo and build

```bash
cd ~
git clone https://github.com/<your-username>/zynsource.git
cd zynsource/server
npm install
npm run build
```

### 1f. Write the production `.env`

```bash
cd ~/zynsource/server
nano .env
```

Paste (replace `<...>` placeholders):

```
MONGO_URI=mongodb+srv://<user>:<pwd>@zynsource.4mwwccb.mongodb.net/zynsource?appName=ZynSource
JWT_SECRET=<a long random string — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
PORT=4000
CLIENT_URL=https://your-app.vercel.app
SERVER_PUBLIC_URL=https://api.yourdomain.com

OPENAI_API_KEY=<your openai key>

# AWS S3 — leave these UNSET if you attached the IAM role per step 1b.
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET=zynsource-s3-bucket

ADMIN_EMAILS=jaivenkataphanimachiraju@gmail.com

# Email (Brevo) — see section 4
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<brevo SMTP login>
SMTP_PASS=<brevo SMTP key>
EMAIL_FROM=ZynSource <noreply@yourdomain.com>
```

Save (Ctrl+O, Enter, Ctrl+X).

### 1g. Start the server with PM2

```bash
cd ~/zynsource/server
pm2 start dist/index.js --name zynsource-api --time
pm2 save
pm2 startup systemd            # paste the command it prints back to enable boot-time startup
```

Verify:

```bash
pm2 status
pm2 logs zynsource-api
curl http://localhost:4000/api/health
# → {"ok":true,"name":"zynsource-api"}
```

### 1h. Open port 4000 in the security group (optional, dev only)

For a quick test before nginx/SSL is set up, allow inbound on port 4000:

1. EC2 → instance → Security tab → click the security group.
2. Edit inbound rules → Add: TCP 4000 from Anywhere.

Visit `http://<your-elastic-ip>:4000/api/health` from your browser. Should return JSON.

Once nginx is set up (next step), **remove this rule** — public traffic flows through 443.

### 1i. nginx reverse proxy + HTTPS with Let's Encrypt

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Point a subdomain (e.g. api.yourdomain.com) at the Elastic IP via your DNS provider.
# Then:
sudo nano /etc/nginx/sites-available/zynsource
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/zynsource /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Get SSL:

```bash
sudo certbot --nginx -d api.yourdomain.com
# Follow prompts, agree to TOS, pick "redirect HTTP to HTTPS" when asked.
```

Certbot auto-renews via systemd timer; no further action needed for 90-day renewals.

Verify: `https://api.yourdomain.com/api/health` → JSON.

### 1j. Deploy updates later

```bash
ssh -i zynsource.pem ubuntu@<your-elastic-ip>
cd ~/zynsource
git pull
cd server && npm install && npm run build
pm2 restart zynsource-api
```

You can wrap this in a one-liner deploy script.

---

## 1 (alternative). Backend — Render (simplest one-click)

If you don't want to manage EC2, use Render:

1. https://render.com → New → **Web Service** → connect GitHub → pick repo.
2. **Root Directory**: `server`. **Build**: `npm install && npm run build`. **Start**: `npm start`. **Instance**: Free.
3. Paste all env vars from your local `.env` into Render's env panel.
4. Deploy. Note the URL.
5. Free tier sleeps after 15 min idle; first request after wakes it (~30s cold start).

---

## 2. Frontend — Vercel

1. https://vercel.com → New Project → import the `zynsource` repo.
2. **Root Directory**: `client`. Vercel auto-detects Vite.
3. Edit `client/vercel.json` and replace the placeholder URL with your backend's URL (`https://api.yourdomain.com` if you set up the subdomain, or your raw Render URL).
4. Deploy.
5. After it's live, go back to EC2/Render and set `CLIENT_URL=https://<your-vercel-url>`. Restart the server (`pm2 restart zynsource-api` on EC2, or trigger a redeploy on Render).

---

## 3. MongoDB Atlas (already configured)

1. Atlas → Network Access. Free tier doesn't support static IP allowlisting, so keep `0.0.0.0/0`.
2. If you locked down Network Access to specific IPs, add your Elastic IP from step 1c.

---

## 4. Email — Brevo (recommended free SMTP)

1. https://app.brevo.com → sign up.
2. Settings → **SMTP & API** → SMTP tab. Copy:
   - SMTP server: `smtp-relay.brevo.com`, Port: `587`
   - Login (SMTP_USER): the email shown
   - Password (SMTP_PASS): the SMTP key shown
3. Add a sender domain or verify your sending email under **Senders**.
4. Paste into `.env`:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<brevo login>
SMTP_PASS=<brevo SMTP key>
EMAIL_FROM=ZynSource <noreply@your-domain.com>
```

5. Restart the server. Register a fresh user — Brevo dashboard's "Statistics" should show the welcome email.

**Gmail SMTP alternative**: turn on 2-Step Verification on your Google account, generate an App Password at https://myaccount.google.com/apppasswords. Then `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<your gmail>`, `SMTP_PASS=<the 16-char app password>`. 500/day limit.

---

## 5. S3 CORS for production

S3 → bucket `zynsource-s3-bucket` → Permissions → Cross-origin resource sharing:

```json
[
  {
    "AllowedOrigins": ["https://<your-vercel-url>", "https://api.yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Add `http://localhost:5173` temporarily if you also want dev to work against prod S3.

---

## 6. Seed production data (optional)

From your local machine, point `MONGO_URI` at the production cluster:

```bash
MONGO_URI="<prod-uri>" npm --prefix server run seed
```

This creates 12 sample jobs + demo accounts. Re-set the env after.

---

## 7. (Optional) Translate to Hindi

```bash
OPENAI_API_KEY="<your-key>" npm --prefix client run translate
```

Walks every `t('...')` string, asks OpenAI to translate, merges into `client/src/locales/hi.json`. Commit and redeploy. Cost: <$0.05.

---

## 8. (Optional) Observability

### Sentry (errors, free tier 5k/month)

1. https://sentry.io → create 2 projects: `zynsource-server` (Node), `zynsource-client` (React).
2. Add to EC2 `.env`: `SENTRY_DSN=<server DSN>`. Restart.
3. Add to Vercel env: `VITE_SENTRY_DSN=<client DSN>`. Trigger redeploy.

### PostHog (product analytics, free tier 1M events/month)

1. https://posthog.com → get API key.
2. Add to Vercel env: `VITE_POSTHOG_KEY=<key>`.

Both are feature-flagged and no-op when env vars are missing.

---

## 9. Custom domain (optional but cheap)

Buy a domain (Namecheap / Cloudflare / GoDaddy):

- **Frontend**: Vercel project → Settings → Domains. Add `zynsource.com`. Follow the DNS instructions Vercel shows.
- **Backend**: in your DNS provider, add an `A` record for `api.zynsource.com` → your Elastic IP. Re-run `sudo certbot --nginx -d api.zynsource.com` on the EC2 box for SSL.
- After: update `CLIENT_URL` on EC2 to `https://zynsource.com`, and `VITE_API_URL` (or `vercel.json` rewrite target) on Vercel to `https://api.zynsource.com`.

---

## 10. Post-launch checklist

- [ ] **Rotate every credential** that was shared in chat: OpenAI key, AWS access keys (now that IAM role is in place, you can revoke them), MongoDB Atlas password.
- [ ] Verify CORS on S3 only allows your production frontend (drop `localhost` once stable).
- [ ] Set up MongoDB Atlas automated backups (free tier includes snapshots).
- [ ] Set hard usage caps in your OpenAI dashboard (Settings → Limits) — pick a monthly budget.
- [ ] AWS Billing → Budgets → set an alarm at ₹500/month so a misconfigured S3 bucket can't surprise you.
- [ ] Run the 17-step end-to-end smoke test from the plan file on the production site.
- [ ] Test the Brevo welcome email on a real fresh signup.

---

## Recap of what runs where

| Service | Hosted on | Free tier limit | Replaces |
|---|---|---|---|
| Backend Express API | EC2 t3.micro | 12 months free, then ~$8/mo | Render alt |
| Frontend Vite/React | Vercel hobby | Generous (100GB/mo egress) | — |
| Database (Mongo) | MongoDB Atlas M0 | 512 MB storage | — |
| Resume storage | AWS S3 | 5 GB / 12 months free | — |
| Email | Brevo SMTP | 300/day forever | Resend/SendGrid (paid) |
| Errors | Sentry | 5k/month | — |
| Analytics | PostHog | 1M events/month | — |
| AI parsing + matching | OpenAI (pay-as-you-go) | ~$2/month at MVP scale | Anthropic alt |

---

## Notes

- **PM2 vs systemd**: PM2 is friendlier (logs, restart, autostart). systemd is more "ops-correct". PM2 wraps systemd via `pm2 startup systemd` and that's the recommended path for a single-app VM.
- **Single-instance cron**: our in-process cron runs on the EC2 box every 6h. If you ever scale to 2+ EC2 instances, only one should run the cron — gate it with a `CRON_ENABLED=true` env var on a single instance, or migrate to a Render Cron Job / Atlas Trigger.
- **Resume storage cost**: 5 GB free for 12 months. After that, S3 standard storage in `ap-south-1` is ~₹2/GB/month — basically free at human scale.
