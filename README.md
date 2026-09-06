# Team ACE — OD Tracker

On-Duty request tracker for Team ACE, VIT Vellore.

- **Members** log in with their **registration number + a personal PIN**
  (set on first login). Identity is fixed by the login, so nobody can
  file OD for anyone else. Entries can't be edited once submitted; each
  member sees their own history and its approve/reject status.
- **Admin** (management head) logs in with the **admin passcode** → sees
  every entry, filters by week, approves/rejects each, prints the
  approved list to submit, and can reset a member's PIN if they forget it.

Stack: Next.js (App Router) · Supabase Postgres · deployed on Vercel.
No email, no Supabase Auth. Sessions are signed cookies; all DB access
is server-side with the Supabase secret key.

## Setup

### 1. Database

Supabase → **SQL Editor → New query** → paste `supabase/schema.sql` →
**Run**. (Safe to re-run; drops and recreates `od_entries` and
`member_pins`.)

### 2. Environment variables

Copy `.env.example` to `.env.local`:

| Var | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → **Secret** key (`sb_secret_...`) |
| `SESSION_SECRET` | `openssl rand -hex 32` — keep private |
| `ADMIN_PASSCODE` | any string — keep private |

### 3. Run

```bash
npm install
npm run dev
```

## Deploy (Vercel)

1. Push to GitHub, import at [vercel.com/new](https://vercel.com/new).
2. Add the four env vars in **Settings → Environment Variables**.
3. Deploy.

## Day-to-day

- **Add / remove a member:** edit `lib/members.ts`, commit, push
  (auto-deploys). A removed member's session stops working immediately.
- **Member forgot their PIN:** admin view → *Manage member PINs* →
  **Reset PIN**. They set a new one on next login.
- **Change the admin passcode / session secret:** edit the env var in
  Vercel and redeploy. Changing `SESSION_SECRET` signs everyone out.
