# Supabase Deployment Guide

Everything you need to do **inside Supabase** to make the app (including rate-limited account registration) work.

---

## Overview of required steps

| # | What | Where |
|---|------|-------|
| 1 | Run the database schema SQL | Supabase Dashboard → SQL Editor |
| 2 | Deploy the `register` Edge Function | Supabase CLI **or** Dashboard |
| 3 | Set the `IP_HASH_SALT` secret | Supabase Dashboard → Edge Functions → Secrets |
| 4 | (Optional) Harden Auth settings | Supabase Dashboard → Authentication |

---

## Step 1 — Run the database schema

1. Open your Supabase project at [app.supabase.com](https://app.supabase.com).
2. Go to **SQL Editor** (left sidebar).
3. Click **New query**, paste the entire contents of [`schema.sql`](schema.sql), then click **Run**.

This creates:

- **`registration_attempts`** — stores hashed IPs for rate-limiting (RLS on, no public access)
- **`leaderboard`** — stores quiz scores (RLS on, with per-user policies)
- **`count_distinct_users()`** — helper RPC used by the homepage stats counter

> If you already ran an older version of `schema.sql` that only had the `leaderboard` table,
> run **only the top portion** (the `registration_attempts` block) to avoid re-creating tables:
>
> ```sql
> CREATE TABLE public.registration_attempts (
>   id         BIGSERIAL    PRIMARY KEY,
>   ip_hash    TEXT         NOT NULL,
>   created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
> );
>
> CREATE INDEX idx_reg_attempts_ip_time
>   ON public.registration_attempts(ip_hash, created_at DESC);
>
> ALTER TABLE public.registration_attempts ENABLE ROW LEVEL SECURITY;
> ```

---

## Step 2 — Deploy the `register` Edge Function

The Edge Function lives at `supabase/functions/register/index.ts`.  
You can deploy it two ways — pick whichever is easier:

---

### Option A — Supabase CLI (recommended)

1. **Install the CLI** (if you haven't already):
   ```bash
   npm install -g supabase
   # or: brew install supabase/tap/supabase
   ```

2. **Log in and link your project**:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   # project-ref is the string in your project URL: https://app.supabase.com/project/<ref>
   ```

3. **Deploy**:
   ```bash
   supabase functions deploy register
   ```

   That's it. The function is now live at:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/register
   ```

---

### Option B — Supabase Dashboard (no CLI)

1. In the Dashboard, go to **Edge Functions** (left sidebar).
2. Click **New Function**, name it exactly `register`, click **Create**.
3. In the editor that opens, **delete** all placeholder code and **paste** the full contents of [`functions/register/index.ts`](functions/register/index.ts).
4. Click **Deploy**.

---

## Step 3 — Set the `IP_HASH_SALT` secret

The Edge Function hashes client IPs with SHA-256 **plus a secret salt** so that raw IPs are never stored.  
You must provide this salt; otherwise the function falls back to a generic default (which still works but is less private).

### Via the Dashboard

1. Go to **Edge Functions** → select the `register` function → **Secrets** tab.
2. Click **Add secret**.
3. Name: `IP_HASH_SALT`  
   Value: any long random string — e.g., generate one with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Click **Save**.

### Via the CLI

```bash
supabase secrets set IP_HASH_SALT=<your-random-value>
```

> **`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically** by Supabase into every Edge Function — you do **not** need to set those manually.

---

## Step 4 — (Optional) Harden Auth settings

The app uses fake `@vchs-study.local` email addresses.  
These settings are already compatible with the defaults, but you can tighten them:

| Setting | Recommended value | Where |
|---------|------------------|-------|
| **Enable Email Signups** | Disabled (the Edge Function uses the Admin API, not client-side signup) | Dashboard → Auth → Providers → Email → toggle off "Enable Email Signups" |
| **Confirm Email** | Not required (the Edge Function sets `email_confirm: true` automatically) | no change needed |
| **Minimum Password Length** | 8 characters | Dashboard → Auth → Password → min length |

Disabling client-side email signups means the **only** way to create an account is through the `register` Edge Function, which enforces rate limiting and profanity checks — nobody can bypass it by calling the API directly.

---

## Verification checklist

After completing all steps, run through this quick sanity-check:

- [ ] SQL Editor → Tables shows `registration_attempts` and `leaderboard`
- [ ] Edge Functions list shows `register` with a green "Active" badge
- [ ] Edge Functions → `register` → Secrets shows `IP_HASH_SALT`
- [ ] Open the live site, register a new account — it should succeed
- [ ] Try registering a second account from the same browser within 5 minutes — you should see a rate-limit error
- [ ] Try a username like `fucktest` — you should see the profanity error immediately (client-side), before any network call
