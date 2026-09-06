# Team ACE — OD Tracker

On-Duty request tracker for Team ACE, VIT Vellore.

- **Members** enter a shared **team passcode**, then submit OD entries
  (name, reg number, date, from/to time, reason). Entries can't be
  edited once submitted. Each device sees its own submission history
  and their approve/reject status.
- **Admin** (management head) enters the **admin passcode** → sees every
  entry, filters by week, approves/rejects each, and prints the
  approved list to submit.

Stack: Next.js (App Router) · Supabase Postgres · deployed on Vercel.
No email, no user accounts — access is by passcode, all DB access is
server-side with the Supabase secret key.

## Setup

### 1. Database

Supabase dashboard → **SQL Editor → New query** → paste
`supabase/schema.sql` → **Run**. (Safe to re-run; it drops and
recreates the table.)

### 2. Environment variables

Copy `.env.example` to `.env.local`:

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret** key (`sb_secret_...`) |
| `TEAM_PASSCODE` | any string — share with the team |
| `ADMIN_PASSCODE` | any string — keep private |

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000, enter a passcode.

## Deploy (Vercel)

1. Push to GitHub, import at [vercel.com/new](https://vercel.com/new).
2. Add the four env vars in **Settings → Environment Variables**.
3. Deploy.

To change a passcode later: edit the env var in Vercel and redeploy.
Everyone stays signed in until they clear the cookie or you rotate the
passcode.
