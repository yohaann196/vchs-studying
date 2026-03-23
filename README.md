# VCHS Studying

A **static, single-page web application** — a centralized academic resource platform for Valley Christian High School students.

## Live App

Deployed via GitHub Pages: [https://yohaann196.github.io/vchs-studying](https://yohaann196.github.io/vchs-studying)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (no frameworks) |
| Database / Auth | Supabase (PostgreSQL + Supabase Auth) |
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

---

## File Structure

```
index.html           ← HTML shell (single-page app)
app.js               ← All application logic
data.js              ← Course/question data (Biology Honors, 92 questions)
styles.css           ← All styling (~1,800 lines)
config.js            ← Supabase credentials
package.json         ← Dev dependencies (jsdom)
supabase/
  schema.sql         ← Leaderboard table DDL + RLS policies
.github/
  workflows/
    deploy.yml       ← GitHub Pages deployment workflow
README.md            ← This file
```

---

## Setup

### 1. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the Supabase SQL Editor
3. Enable **Email Auth** (users sign up with a fake `@vchs-study.local` address)
4. Update `config.js` with your project URL and anon key:
   ```js
   window.SUPABASE_URL      = 'https://your-project-id.supabase.co';
   window.SUPABASE_ANON_KEY = 'your-anon-key';
   ```

### 2. Deploy to GitHub Pages

Push to `main` — the GitHub Actions workflow deploys automatically.

---

## Course Data

**Biology Honors** — 619 multiple-choice questions across 10 units with detailed study guides.

**AP Human Geography** *(questions coming soon — awaiting study guide content)*
- Unit 1: Geography: Its Nature and Perspective
- Unit 2: Population Growth
- Unit 3: Cultural Patterns and Processes
- Unit 4: Political Organization of Space
- Unit 5: Agricultural and Rural Land Use
- Unit 6: Industrialization and Urban Development
- Unit 7: Cities and Urban Land Use

---

## Design Theme

Warm parchment (`#f5f0e4`) + dark navy (`#0f1f3d`) with gold accents (`#c9820a`).
Fonts: Cinzel, IM Fell English SC, Caveat (Google Fonts).

---

## License

ISC