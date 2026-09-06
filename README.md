# Team ACE — OD Tracker

On-Duty request tracker for Team ACE, VIT Vellore.

- **Members** sign in with an email magic link, submit OD entries
  (name, reg number, date, from/to time, reason). Entries can't be
  edited once submitted.
- **Admin** (management head) sees every entry, filters by week,
  approves/rejects each, and prints the approved list to submit.

Stack: Next.js (App Router) · Supabase (Postgres + Auth) · deployed on Vercel.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. **Authentication → Providers → Email**: keep enabled. Turn *Confirm
   email* on; "Enable email OTP / magic link" should be on by default.
4. **Authentication → URL Configuration**: set **Site URL** to your
   Vercel URL, and add these to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
5. **Project Settings → API**: copy the **Project URL**, the **anon
   public** key, and the **service_role** key.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Var | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role (**server only**) |
| `ADMIN_EMAILS` | comma-separated admin emails |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your domain in prod |

### 3. Run

```bash
npm install
npm run dev
```

## Deploy (Vercel)

1. Push to GitHub, import the repo at [vercel.com/new](https://vercel.com/new).
2. Add all five env vars in **Project Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to the production domain).
3. Deploy, then add the production `/auth/callback` URL to Supabase
   redirect URLs (step 1.4).

## Admin access

Anyone whose signed-in email is in `ADMIN_EMAILS` lands on `/admin`;
everyone else lands on `/dashboard`. Change the list in the env var and
redeploy to add or remove admins.
