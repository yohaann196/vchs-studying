# VCHS Studying

A **static, single-page web application** — a centralized academic resource platform for Valley Christian High School students.

## Live App

Deployed via GitHub Pages: [https://yohaann196.github.io/vchs-studying](https://yohaann196.github.io/vchs-studying)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (no frameworks) |
| Database / Auth | Supabase (PostgreSQL + Supabase Auth + Edge Functions) |
| Client SDK | `@supabase/supabase-js` v2 loaded via CDN (jsDelivr) |
| Hosting | GitHub Pages (static) |
| CI/CD | GitHub Actions (`deploy.yml`) — trigger on push to `main` |

---

## Features

- 📝 **Practice Quizzes** — Timed (15 min) and Methodical modes with Fisher-Yates shuffled questions
- 📚 **Study Guides** — Accordion-style guides with detailed bullet-point notes
- 🗃️ **Question Bank** — All questions with unit filter; correct answers revealed
- 🏆 **Global Leaderboard** — Powered by Supabase; falls back to localStorage offline
- 🔐 **Auth** — Username/password login and registration (no real email required)
- 🛡️ **Account protections** — Profanity filtering on usernames + IP-based progressive rate limiting via a Supabase Edge Function

---

## File Structure

```
index.html                        ← HTML shell (single-page app)
app.js                            ← All application logic
data.js                           ← Course/question data
styles.css                        ← All styling
config.js                         ← Supabase credentials (URL + anon key)
package.json                      ← Dev dependencies
supabase/
  schema.sql                      ← Full database DDL + RLS policies
  DEPLOY.md                       ← Step-by-step Supabase deployment guide
  functions/
    register/
      index.ts                    ← Edge Function: rate-limited account creation
.github/
  workflows/
    deploy.yml                    ← GitHub Pages deployment workflow
README.md                         ← This file
```

---

## Setup

> **For a complete, step-by-step guide see [`supabase/DEPLOY.md`](supabase/DEPLOY.md).**

### Quick summary

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Run `supabase/schema.sql`** in the Supabase SQL Editor (creates the `leaderboard` and `registration_attempts` tables)
3. **Deploy the `register` Edge Function** (handles rate-limited, profanity-filtered account creation)
4. **Set the `IP_HASH_SALT` secret** on the Edge Function so IPs are hashed securely
5. **Update `config.js`** with your project URL and anon key
6. Push to `main` — GitHub Actions deploys to GitHub Pages automatically

See [`supabase/DEPLOY.md`](supabase/DEPLOY.md) for the exact commands / dashboard clicks for each step.

---

## Design Theme

Grey liquid-glass + gold accents on a dark navy background.
Fonts: Space Grotesk, Inter, Nunito, Lora (Google Fonts).

---

## License

ISC