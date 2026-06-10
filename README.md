# SiteAudit — Website QA & Audit Platform

A production-ready AI-powered website quality assurance platform built with Next.js 14, PostgreSQL, Prisma, and the Anthropic API.

## Features

- **Deep website crawling** — Crawls up to 20 pages, following internal links
- **9 audit categories** — Site health, SEO, accessibility, performance, security, content, navigation, URL validation, forms
- **AI-powered analysis** — Anthropic Claude enriches findings with business impact and actionable fix guides
- **Real-time progress** — Live polling shows crawl progress and current analysis stage
- **Shareable reports** — Generate public links that expire in 30 days
- **Audit dashboard** — Full history, filtering, and management
- **Export** — CSV and JSON export for all findings
- **Auth** — Google OAuth via NextAuth v5
---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd website-qa-platform
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth App client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth App client secret |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (e.g. `https://yourapp.vercel.app`) |

### 3. Set up database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option B: GitHub integration

1. Push to GitHub
2. Import repo in [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in Vercel project settings
4. Deploy

### Database options for Vercel

**Recommended: Vercel Postgres (Neon)**
1. In your Vercel project → Storage → Connect Database → Postgres
2. Copy the `DATABASE_URL` to your environment variables
3. Run `npm run db:push` locally pointing at the Vercel Postgres URL

**Alternative: Supabase, PlanetScale, Railway**
All work with the standard PostgreSQL connection string.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URI: `https://yourapp.vercel.app/api/auth/callback/google`
5. Add `http://localhost:3000/api/auth/callback/google` for local development

---

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── audit/          # Start audit, get audit status
│   │   ├── audits/         # List user's audits
│   │   ├── share/          # Create / resolve share links
│   │   ├── export/[id]/    # CSV + JSON export
│   │   └── auth/           # NextAuth handler
│   ├── audit/[id]/         # Live progress page (polls every 2.5s)
│   ├── report/
│   │   ├── result/[id]/    # Full report by audit ID
│   │   └── [slug]/         # Public shared report
│   ├── dashboard/          # Authenticated audit history
│   └── auth/signin/        # Google sign-in page
├── lib/
│   ├── crawler.ts          # Website crawler (cheerio + fetch)
│   ├── checks.ts           # Static audit checks (50+ rules)
│   ├── ai-analyzer.ts      # Anthropic API integration
│   ├── audit-runner.ts     # Orchestrates full audit pipeline
│   ├── auth.ts             # NextAuth v5 config
│   └── prisma.ts           # Prisma client singleton
├── components/
│   └── reports/
│       └── ReportView.tsx  # Full report UI with filters
└── types/
    └── index.ts            # Shared TypeScript types
```

## Audit Pipeline

1. **POST /api/audit** — Creates `Audit` record, fires background `runAudit()`
2. **Crawl** — `crawler.ts` fetches pages with cheerio, extracts links/images/meta
3. **Static checks** — `checks.ts` runs 50+ deterministic rules across all pages
4. **AI analysis** — `ai-analyzer.ts` sends crawl digest + static findings to Claude
5. **Persist** — Findings saved to PostgreSQL, audit marked COMPLETE
6. **Poll** — Frontend polls `/api/audit/[id]` every 2.5s, redirects on complete

---

## Extending

### Add a new check category

In `src/lib/checks.ts`, add a new block inside the `runStaticChecks` function using the `finding()` helper:

```ts
findings.push(finding(
  'Your Category',   // AuditCategory
  'HIGH',            // Severity
  'Issue title',
  'Description',
  page.url,
  'Evidence text',
  'How to fix it',
  'Medium',          // Complexity
  'Business impact'
))
```

### Adjust crawl depth

In `src/lib/audit-runner.ts`, change the `maxPages` argument to `crawlWebsite()`.

### Change AI model

In `src/lib/ai-analyzer.ts`, update the `model` field in the API call.

---

## License

MIT
