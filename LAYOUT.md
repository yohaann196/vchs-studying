# VCHS Studying — Layout & Design Conventions

This file documents the visual and structural rules for the VCHS Studying app.
Follow these conventions precisely when adding new courses, pages, or components
so that the UI stays uniform across the whole site.

---

## 1. Theme

**Grey Liquid Glass + Gold Accents.**

- Background: dark radial-gradient (`#1a1a2e → #13131c → #0d0d18`, fixed attachment).
- All panels, cards, and modals use a frosted-glass surface:
  `background: rgba(255,255,255,0.07)` + `backdrop-filter: blur(16px)` + inset edge highlight.
- Primary accent colour is **gold** (`#d4a843`). Use it for headings, interactive links, active
  states, and button borders — never for background fills on large areas.
- Never use a light/white background. All surfaces must remain in the dark glass family.

---

## 2. CSS Custom Properties

All colours, shadows, radii, and transitions are defined as CSS variables in `:root`.
**Always use these tokens** — never hard-code raw values in component-level rules.

| Token | Value | Usage |
|-------|-------|-------|
| `--gold-main` | `#d4a843` | Buttons (primary), active nav, accents |
| `--gold-light` | `rgba(212,168,67,0.15)` | Subtle gold tints |
| `--navy` | `#0d0d15` | Darkest background (footer, toast bg) |
| `--navy-light` | `#171728` | Select option backgrounds |
| `--text-dark` | `#e8e8f2` | Body text, headings |
| `--text-muted` | `#8a8aa4` | Secondary/helper text, labels |
| `--glass-bg` | `rgba(255,255,255,0.07)` | Default glass card fill |
| `--glass-bg-2` | `rgba(255,255,255,0.11)` | Hover/active glass fill |
| `--glass-border` | `rgba(255,255,255,0.14)` | Card/panel borders |
| `--glass-inset` | `inset 0 1px 0 rgba(255,255,255,0.08)` | Top-edge highlight on cards |
| `--shadow-sm` | `0 2px 12px rgba(0,0,0,.40)` | Card resting shadow |
| `--shadow-md` | `0 4px 24px rgba(0,0,0,.50)` | Elevated panels |
| `--shadow-lg` | `0 8px 48px rgba(0,0,0,.60)` | Modals / full overlays |
| `--radius-sm` | `6px` | Buttons, tags |
| `--radius-md` | `12px` | Cards, mode cards |
| `--radius-lg` | `20px` | Large cards |
| `--radius-xl` | `32px` | Hero blobs / decorative shapes |
| `--transition` | `0.25s ease` | All hover/active transitions |

---

## 3. Typography

Four font families are loaded via Google Fonts. Use the CSS variables, not the font names directly.

| Variable | Family | Use for |
|----------|--------|---------|
| `--font-display` | Space Grotesk | Headings, nav labels, button text, card titles |
| `--font-body` | Inter | Body paragraphs, descriptions, lists |
| `--font-hand` | Nunito | Accent/username display, decorative text |
| `--font-classic` | Lora (serif, italic available) | Section subtitles, filter dropdowns |

Rules:
- Section titles (`.section-title`) → `--font-display`, bold.
- Section subtitles (`.section-subtitle`) → `--font-classic`, italic.
- Navbar brand + links → `--font-display`, small-caps letter-spacing.
- Filter/select inputs → `--font-classic`.
- All buttons → `--font-display`, `font-weight: 700`, `letter-spacing: 0.05em`.

---

## 4. Buttons

Four variants exist. Pick the right one for context:

| Class | Appearance | Use for |
|-------|-----------|---------|
| `.btn-primary` | Gold gradient fill + glow | Primary CTA (start quiz, submit, create account) |
| `.btn-secondary` | Glass fill + gold border | Secondary actions (back, view all, links to tabs) |
| `.btn-dark` | Neutral glass fill | Tertiary / destructive-adjacent (back to home, retry) |
| `.btn-danger` | Red-tinted glass | Destructive actions (quit quiz) |

All buttons get `transform: translateY(-2px)` on hover and a matching glow/shadow increase.
Focus ring: `3px solid var(--gold-main)` (via `:focus-visible`).

---

## 5. Navbar

- Sticky, `z-index: 1000`, height **64px**.
- Background: `rgba(13,13,21,0.82)` + `backdrop-filter: blur(24px) saturate(1.6)`.
- Brand (`VCHS Studying`) → gold, `--font-display`.
- Links: Home · Classes · Leaderboard (in that order). Any new top-level section gets a link here.
- Active/hover state: gold text + 2px gold bottom border.
- Right side: username display (`.nav-auth`) + Sign In / Sign Out button.

---

## 6. Views (Pages)

The app is a single-page application. Each "page" is a `<div class="view">` toggled with the `.hidden` class by `showView()`.

Current views and their IDs:

| ID | Description |
|----|-------------|
| `home-view` | Hero + class grid + leaderboard preview |
| `class-view` | Class detail (tab bar: Quiz / Study Guides / Question Bank) |
| `classes-view` | Full class listing with search + subject filter |
| `leaderboard-view` | Full global leaderboard |

When adding a new view:
1. Add the `<div id="…-view" class="view hidden">` in `index.html`.
2. Register it in `showView()` in `app.js` (`views` array).
3. Add a navbar link if it is a top-level destination.

---

## 7. Class Detail View

Every class opens in `#class-view` with three fixed tabs:

| Tab | Panel ID | Content |
|-----|----------|---------|
| 📝 Quiz | `panel-quiz` | Mode selector (Timed / Methodical) + active quiz + results screen |
| 📚 Study Guides | `panel-guides` | Accordion cards, one per unit |
| 🗃️ Question Bank | `panel-qbank` | All Q&A with unit filter; correct answers highlighted |

Rules:
- Always default to the **Quiz** tab when opening a class.
- The Quiz mode selector includes a **"Filter by Unit"** dropdown above the mode cards, and
  **quick-link buttons** (Study Guides, Question Bank) below the mode cards so users can jump
  directly to those resources without hunting through the tabs.
- Study guides: **exactly one accordion card per unit**, titled `Unit N — <Topic>`.
- Question bank: all questions listed with unit tags; correct answers shown in gold.

---

## 8. Class Cards (Homepage & Classes View)

Each class card shows: icon emoji · class name · subject badge · description excerpt · "Start Studying →" button.

Subject badge colours:

| Subject | Badge class |
|---------|------------|
| Science | `.badge-science` (teal-tinted glass) |
| Math | `.badge-math` (purple-tinted glass) |
| English | `.badge-english` (gold-tinted glass) |
| History | `.badge-history` (red-tinted glass) |

Grid: responsive CSS Grid, 3 columns on desktop → 2 → 1 on mobile.

---

## 9. Homepage Restrictions

- **Class grid is capped at 10 entries** on the homepage. When more than 10 classes exist,
  a banner appears below:
  > *"Showing 10 of X classes — there are more classes waiting for you!"*
  with a "View All Classes →" button.
- The **Leaderboard preview** shows the top **5** users only, with a footer indicating how many
  more users are on the full leaderboard.
- The hero stats row shows: **Questions** count · **Classes** count · **Total Users** count.

---

## 10. Dropdowns & Form Inputs

All `<select>` and `<input>` elements must receive the dark-glass treatment — never the browser's white default:

```css
background: var(--glass-bg-2);
color: var(--text-dark);
border: 1px solid var(--glass-border);
border-radius: var(--radius-sm);
backdrop-filter: blur(10px);
font-family: var(--font-classic);  /* for selects */
font-family: var(--font-body);     /* for text inputs */
```

`option` elements inside `<select>` get `background: var(--navy-light)`.
Focus ring: `border-color: var(--gold-main)` (no `outline`).

---

## 11. Responsive / Mobile

A single `@media (max-width: 640px)` breakpoint handles small screens:

- Class grid: single column.
- Quiz mode selector: stacks vertically (`flex-direction: column`).
- Mode cards: full width (`max-width: 100%`).
- Tab panels: reduced padding (`1rem 0.85rem`).
- Leaderboard table: smaller font + tighter cell padding.
- Auth modal: reduced padding.

---

## 12. Accessibility

- Every interactive element has an `aria-label` or visible label.
- Tab panels use `role="tabpanel"` + `aria-labelledby` pointing to their tab button.
- Tab buttons use `role="tab"` + `aria-selected`.
- Dynamic content regions use `aria-live="polite"`.
- Focus management: modal traps focus; pressing Escape closes it.
- Focus ring: `3px solid var(--gold-main)` via `:focus-visible` — never remove outline for
  keyboard users.
- Decorative elements get `aria-hidden="true"`.

---

## 13. Adding a New Course

Checklist for adding a new course to `data.js`:

1. Add a new object to the `CLASSES` array with:
   - `id` — kebab-case slug (e.g. `'ap-chemistry'`)
   - `name` — Display name
   - `description` — 1–2 sentence summary
   - `unit` — Subject category: `'Science'` | `'Math'` | `'English'` | `'History'`
   - `icon` — Single emoji
   - `studyGuides` — Array of guide objects (`{ title, content[] }`); **one per unit**
   - `qbank` — Array of question objects (`{ unit, q, choices[], answer }`)
2. The class will automatically appear in the class grid on the homepage and Classes view.
3. No changes to `index.html` or `app.js` are needed for data-only additions.
4. Update the `stat-classes` count in `index.html` if it is hard-coded.
