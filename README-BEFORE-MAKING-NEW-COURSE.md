# Before You Make a New Course

Read this entire file before touching `data.js`. Every course added to this repo must meet
all of the requirements below. Consistency keeps the app looking and working great for everyone.

---

## 1. Question Bank Requirements

### Quantity — 30 to 130 questions per unit

The number of questions per unit must match the difficulty and depth of the material:

| Difficulty | Questions per unit | Examples |
|------------|--------------------|---------|
| Easy / introductory | 30 – 60 | General electives, freshman-level courses |
| Medium | 60 – 100 | Standard honors courses |
| Hard / AP / advanced | 100 – 130 | AP courses, rigorous upper-level classes |

**Minimum is 30 per unit — do not add a unit with fewer questions.**
**Maximum is 130 per unit — split into two units if a topic runs longer.**

### Question format

Every question in the `qbank` array must follow this exact object shape:

```js
{ unit: 1, q: 'Question text here?', choices: ['Option A', 'Option B', 'Option C', 'Option D'], answer: 0 }
```

| Field | Type | Rules |
|-------|------|-------|
| `unit` | `number` | Integer starting at `1`; matches the unit number of the corresponding study guide |
| `q` | `string` | Full question text; end with `?` or `:` as appropriate; no trailing spaces |
| `choices` | `string[]` | Exactly **4** options; order them so the correct answer is not always index 0 |
| `answer` | `number` | **0-indexed** position of the correct choice in the `choices` array (0 – 3) |

### Quality rules

- All four choices must be plausible (avoid obviously wrong distractors).
- Questions must be factually accurate and sourced from class content.
- No duplicate questions — check the existing `qbank` before adding.
- Write questions in plain English; avoid ambiguous or double-negative phrasing.
- Each unit's questions must be grouped together and preceded by a comment:
  ```js
  // ── UNIT 1 — <Topic Name> ──
  ```

---

## 2. Study Guide Requirements

Every course must include **one study guide per unit** in the `studyGuides` array.

```js
{
  title: 'Unit 1 — Introduction to [Subject]',
  content: [
    'First key concept or fact...',
    'Second key concept or fact...',
    // ...at least 8 bullet points
  ]
}
```

- `title` format: `'Unit N — <Topic Name>'` (capital U, em-dash, topic in title case).
- `content` is an array of strings; each string is one bullet point displayed in the accordion.
- Include **at least 8 bullet points** per unit; aim for 10–12 for thorough coverage.
- Bullet text should be concise summary sentences, not full paragraphs.
- Order `studyGuides` by unit number (Unit 1 first).

---

## 3. Course Object Structure

Add a new object to the `CLASSES` array in `data.js`. No changes to `index.html` or `app.js`
are needed for a data-only course addition.

```js
{
  id: 'kebab-case-slug',       // e.g. 'ap-chemistry'
  name: 'Display Name',        // e.g. 'AP Chemistry'
  description: 'One or two sentences describing the course and who it is for.',
  unit: 'Science',             // Subject category — see Section 4
  icon: '⚗️',                  // Single emoji; pick something relevant
  studyGuides: [ /* ... */ ],
  qbank: [ /* ... */ ]
}
```

### Field rules

| Field | Rules |
|-------|-------|
| `id` | Lowercase, hyphen-separated. Must be unique across all courses. |
| `name` | Title case. Match the official course name used at VCHS. |
| `description` | 1–2 sentences max. Written for a student deciding whether to study here. |
| `unit` | Must be one of the four allowed subject values — see Section 4. |
| `icon` | One emoji only. No text, no multi-emoji combos. |
| `studyGuides` | Array; order by unit number ascending. |
| `qbank` | Array; group by unit, ascending. |

---

## 4. Subject Categories & Badge Colours

The `unit` field on a course object must be **exactly** one of these four strings:

| Value | Badge class | Badge appearance |
|-------|-------------|-----------------|
| `'Science'` | `.badge-science` | Teal-tinted glass |
| `'Math'` | `.badge-math` | Purple-tinted glass |
| `'English'` | `.badge-english` | Gold-tinted glass |
| `'History'` | `.badge-history` | Red-tinted glass |

Do not invent new subject strings. If a course does not fit neatly (e.g. Economics, Computer
Science), pick the closest category and open an issue to discuss adding a new badge.

---

## 5. Styling & CSS Conventions

This app uses **no external CSS framework**. All styling is hand-written in `styles.css`.
When adding HTML for a new view or component, follow the rules below.

### Theme — Dark Glass

- **Never** use a white or light-coloured background surface.
- All cards, panels, and modals use the frosted-glass pattern:
  ```css
  background: var(--glass-bg);          /* rgba(255,255,255,0.07) */
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-inset), var(--shadow-sm);
  ```
- The page background is a fixed dark radial gradient (`#1a1a2e → #13131c → #0d0d18`).

### CSS Custom Properties — always use tokens, never raw values

```
--gold-main   #d4a843     Primary accent (buttons, active states, headings)
--gold-light  rgba(212,168,67,0.15)   Subtle gold tints
--navy        #0d0d15     Darkest background (footer, toast)
--navy-light  #171728     Select option backgrounds
--text-dark   #e8e8f2     Body text, headings
--text-muted  #8a8aa4     Secondary/helper text, labels
--glass-bg    rgba(255,255,255,0.07)   Default glass card fill
--glass-bg-2  rgba(255,255,255,0.11)   Hover/active glass fill
--glass-border rgba(255,255,255,0.14)  Card/panel borders
--glass-inset  inset 0 1px 0 rgba(255,255,255,0.08)   Top-edge highlight
--shadow-sm   0 2px 12px rgba(0,0,0,.40)
--shadow-md   0 4px 24px rgba(0,0,0,.50)
--shadow-lg   0 8px 48px rgba(0,0,0,.60)
--radius-sm   6px     Buttons, tags
--radius-md   12px    Cards, mode cards
--radius-lg   20px    Large cards
--radius-xl   32px    Hero blobs / decorative shapes
--transition  0.25s ease   All hover/active transitions
```

### Typography — use font variables, not font names

| Variable | Font family | Use for |
|----------|-------------|---------|
| `--font-display` | Space Grotesk | Headings, nav labels, button text, card titles |
| `--font-body` | Inter | Body paragraphs, descriptions, lists |
| `--font-hand` | Nunito | Accent/username display, decorative text |
| `--font-classic` | Lora | Section subtitles, filter dropdowns |

Rules:
- Section titles → `--font-display`, bold.
- Section subtitles → `--font-classic`, italic.
- All buttons → `--font-display`, `font-weight: 700`, `letter-spacing: 0.05em`.

### Buttons — use existing variants

| Class | Appearance | Use for |
|-------|-----------|---------|
| `.btn-primary` | Gold gradient fill + glow | Primary CTA (start quiz, submit) |
| `.btn-secondary` | Glass fill + gold border | Secondary actions (back, view all) |
| `.btn-dark` | Neutral glass fill | Tertiary / back-to-home |
| `.btn-danger` | Red-tinted glass | Destructive actions (quit quiz) |

All buttons get `transform: translateY(-2px)` on hover.
Focus ring: `3px solid var(--gold-main)` via `:focus-visible`.

### Dropdowns & form inputs

```css
background: var(--glass-bg-2);
color: var(--text-dark);
border: 1px solid var(--glass-border);
border-radius: var(--radius-sm);
backdrop-filter: blur(10px);
font-family: var(--font-classic);   /* selects */
font-family: var(--font-body);      /* text inputs */
```

`<option>` elements inside `<select>` → `background: var(--navy-light)`.
Focus: `border-color: var(--gold-main)` (no `outline`).

---

## 6. Responsive Design

A **single breakpoint** at `max-width: 640px` handles mobile. When adding a new view:

- Class/card grids go from multi-column to single column.
- Flex rows stack vertically (`flex-direction: column`).
- Reduce padding on panels (`1rem 0.85rem`).
- Keep tap targets at least 44 × 44 px.

---

## 7. Accessibility Requirements

Every element in new HTML must meet these rules:

- Every interactive element has an `aria-label` or a visible text label.
- Tab panels: `role="tabpanel"` + `aria-labelledby` pointing to the matching tab button.
- Tab buttons: `role="tab"` + `aria-selected`.
- Dynamic content: `aria-live="polite"`.
- Modals trap focus; pressing Escape closes them.
- Decorative images/icons: `aria-hidden="true"`.
- Never remove the focus ring for keyboard users.

---

## 8. Step-by-Step Checklist

Use this checklist every time you add a course. Check each box before opening a PR.

### Data

- [ ] Added a new object to the `CLASSES` array in `data.js`.
- [ ] `id` is a unique kebab-case slug.
- [ ] `unit` (subject) is one of: `'Science'` | `'Math'` | `'English'` | `'History'`.
- [ ] `icon` is a single relevant emoji.
- [ ] `description` is 1–2 sentences.
- [ ] `studyGuides` has one entry per unit, ordered Unit 1 → last unit.
  - [ ] Each guide has at least 8 bullet points in `content`.
  - [ ] Each `title` follows the `'Unit N — Topic Name'` format.
- [ ] `qbank` questions are grouped by unit with a `// ── UNIT N — Topic ──` comment.
- [ ] Every unit has **30–130 questions** (matching the difficulty table in Section 1).
- [ ] Every question has exactly **4 choices** and a valid `answer` index (0–3).
- [ ] No duplicate questions (checked against existing entries).

### Styling (if any new HTML was added)

- [ ] No light/white backgrounds — all surfaces use dark glass tokens.
- [ ] All colours use CSS custom property tokens (no raw hex values).
- [ ] All fonts use `--font-*` variables (no raw font names).
- [ ] Buttons use one of the four `.btn-*` classes.
- [ ] Dropdowns/inputs use the dark-glass styles.
- [ ] New elements are responsive at the 640 px breakpoint.
- [ ] All interactive elements have `aria-label` or visible labels.
- [ ] Focus rings are intact (`3px solid var(--gold-main)`).

### Final checks

- [ ] Opened the live app locally (or on GitHub Pages) and verified the new course appears.
- [ ] Confirmed the Quiz, Study Guides, and Question Bank tabs all work for the new course.
- [ ] If `index.html` displays a total course count (`.stat-classes`), verify it has been updated to include the new course.

---

## 9. Quick Reference — Minimal Course Template

```js
// In data.js — add to the CLASSES array

{
  id: 'your-course-id',
  name: 'Your Course Name',
  description: 'One to two sentences describing this course.',
  unit: 'Science',   // 'Science' | 'Math' | 'English' | 'History'
  icon: '📘',
  studyGuides: [
    {
      title: 'Unit 1 — Topic Name',
      content: [
        'Key fact or concept one.',
        'Key fact or concept two.',
        // ...at least 8 items
      ]
    },
    // one object per unit...
  ],
  qbank: [
    // ── UNIT 1 — Topic Name ──
    { unit: 1, q: 'Sample question?', choices: ['A', 'B', 'C', 'D'], answer: 0 },
    // ...30–130 questions per unit
  ]
}
```
