# ExamPrep — Current UI Design Principles & System

This document is the authoritative reference for the current frontend design.
Use it as the source of truth when redesigning the UI. Preserve the system,
improve the craft. When in doubt, default to Vercel.com's visual language.

---

## 1. North Star Aesthetic

- **Monochrome-first, color-as-news.** The interface is black / white / gray.
  Color is permissioned ONLY for status and feedback on small details
  (correct/wrong, pass/fail, live log levels). Never use color for decoration,
  brand, or emphasis on large surfaces.
- **Banned hues:** indigo, violet, purple (and any `#6366f1`, `#4338ca`,
  `#6d28d9`, `#8b5cf6` family). These must never return.
- **Allowed hues (subtle, used sparingly):**
  - Success → green `#16a34a`
  - Danger / error → red `#dc2626`
  - Warning → amber `#d97706`
  - Info / live-stream → sky blue `#0284c7`
- **Reference style:** Vercel — quiet, confident, high contrast, generous
  whitespace, thin hairline borders, near-invisible shadows, one bold moment
  per view.

---

## 2. Color System (Design Tokens)

All colors are CSS variables in `src/index.css` (`:root`). Components reference
Tailwind semantic utilities (`bg-primary`, `text-muted-foreground`, `border-border`)
— NEVER raw hex in components.

| Token | Value | Usage |
| --- | --- | --- |
| `--background` | `#fafafa` | Main workspace canvas |
| `--foreground` | `#0a0a0a` | Primary text |
| `--card` / `--card-foreground` | `#ffffff` / `#0a0a0a` | Card surfaces |
| `--popover` / `--popover-foreground` | `#ffffff` / `#0a0a0a` | Modals, dropdowns |
| `--primary` | `#000000` | Primary buttons, selected state |
| `--primary-foreground` | `#ffffff` | Text on primary |
| `--secondary` | `#f5f5f5` | Quiet buttons/pills |
| `--accent` | `#f5f5f5` | Hover/tint fills |
| `--muted` | `#f5f5f5` | Subtle fills (badges, inputs) |
| `--muted-foreground` | `#757575` | Secondary text (max gray allowed) |
| `--border` | `#e5e5e5` | Hairlines between surfaces |
| `--input` | `#e5e5e5` | Input borders |
| `--ring` | `#000000` | Focus rings |
| `--success` | `#16a34a` | Copied feedback, success logs |
| `--danger` | `#dc2626` | Error logs, destructive hover |
| `--warning` | `#d97706` | Warning logs |
| `--info` | `#0284c7` | Info logs |
| `--sidebar` | `#000000` | Sidebar canvas |
| `--sidebar-foreground` | `#ffffff` | Text on sidebar |
| `--sidebar-primary` | `#ffffff` | Primary button inside sidebar |
| `--sidebar-primary-foreground` | `#000000` | Text on that button |
| `--sidebar-accent` | `#171717` | Active/hover row |
| `--sidebar-border` | `#1f1f1f` | Hairlines on sidebar |

### Color rules
- Grays: backgrounds `#ffffff→#fafafa→#f5f5f5`, hairlines `#e5e5e5`,
  disabled/captions `#a3a3a3` max, body `#0a0a0a`. Two contrast bands cap all gray text.
- Hairlines (`1px border`) separate surfaces — no heavy borders, no huge shadows.
- Shadows: `shadow-sm` on cards; `shadow-md`→`shadow-lg` only on primary buttons
  (black, ex. `shadow-black/40` on the sidebar button). Keep shadows nearly invisible.

---

## 3. Typography

- **Font:** Geist Variable (self-hosted via `@fontsource-variable/geist`).
  Loaded in `index.css`; `--font-sans` / `--font-heading` both point to it.
- **Terminal / logs:** `font-mono` (Tailwind mono stack); show timecodes + status
  glyphs in tiny caps.
- **Scale (Tailwind defaults, no overrides):**
  - Page title `text-xl font-bold tracking-tight`
  - Card titles `text-base`–`text-sm font-semibold`
  - Section headings `text-sm font-medium`, labels `text-xs uppercase tracking-widest`
  - Captions `text-xs`–`text-sm text-muted-foreground`
- **Do not** introduce a second display font. **Do not** bold everything — one
  bold moment per block. Keep `leading-relaxed` for question copy.

---

## 4. Layout & Spacing

- **App shell:** fixed full-height split. Left `sidebar` (288px, `w-72`,
  black, `flex h-full`) + right `main` (white, `flex-1 overflow-y-auto`).
- **Topbar:** sticky `top-0`, `bg-background`, `px-6 py-4`, hairline bottom border.
- **Content rail:** `max-w-5xl mx-auto px-6 py-6`, sections stacked with
  `space-y-8`. Cards body padding `CardContent`.
- **Section rhythm:** numbered sections `01 · Upload`, `02 · Agent Terminal`,
  `03 · Syllabus & Action Plan` — each inside a white Card with a 40px black
  square icon chip on the left (via `SectionHeader`).
- **Grids:** syllabus stats = 3-up (`sm:grid-cols-3`); module cards = 2-up
  (`md:grid-cols-2`). Whitespace beats density: never cram 3+ dense cards on mobile.
- **Corner radius:** cards `--radius: 0.625rem`; buttons `rounded-lg`; dropzone
  `rounded-xl`; chips/badges `rounded-md`; pills `rounded-full`. Keep radii small
  and consistent.

---

## 5. Component Patterns (current)

| Component | Current behavior |
| --- | --- |
| `Sidebar` | Black `#000`, white text, white "New Session" button, search field (dark `#0a0a0a` inset), session list rows with hover `#171717`; delete appears on hover and turns red. |
| `Topbar` | Page title left; right = model badge (`openrouter/free`, neutral-100 pill w/ pulsing dot) + user chip (black avatar circle "EP"). |
| `Dropzone` | Dashed `2px` `#e5e5e5` border, `rounded-xl`, centered icon (turns solid black on hover/drag), `scale-[1.01]` + gray tint on drag. Keyboard accessible (Enter/Space). |
| `File preview` | Small white card: black-ish icon chip, filename + size, `×` remove button (red on hover). |
| `Primary button` | Solid black `#000`, white text, `shadow-md`, disabled = muted/opacity. Labelled with an action icon. |
| `Terminal` | `#0a0a0a` panel, `border-neutral-800`, mac dots (red/amber/green at 50% opacity), timecodes `[HH:MM:SS]`, colored status glyph per log level, mono font, auto-scroll. |
| `Syllabus cards` | Left = black number chip; meta = duration + date range + timezone; topic chips as gray `Badge` pills; per-module "Copy Prompt" (copies a detailed study prompt for that module via `buildStudyPrompt`, flips to a green `Check` + "Copied" for ~1.8s) + "Add to Calendar" = neutral-100 gray link buttons. Top accent bar on stat cards is black. |

---

## 6. Interaction & Feedback Principles

- **Copy study prompt:** every syllabus module exposes a "Copy Prompt" button
  that copies a self-contained study prompt (module title, planned time, topics,
  source excerpts with `[[Page N]]` markers) to the clipboard — paste it into any
  LLM to run a focused study session.
- **Live status:** the agent pipeline streams logs via SSE (`/api/events`);
  terminal order = [1/3 parse] → [2/3 planner] → [3/3 calendar].
  Keep a graceful "fallback" staged-log mode when SSE is offline.
- **Zero reload persistence:** sessions auto-save to `localStorage`
  (`exam_prep_sessions`); selecting a past session re-renders without server calls.
- **Every action has a clear disabled/loading state** (e.g. "Run Agentic
  Pipeline" disabled until a file exists, label swaps to "Running — agents at
  work...").
- **Micro-motion budget:** only transitions (`transition-all`, 150–200ms),
  dropzone drag scale, score-ring animation, ping dot. No bounce, no parallax,
  no infinite rotation. Respect `prefers-reduced-motion`.

---

## 7. Accessibility (non-negotiable)

- Semantic landmarks: `<aside>` sidebar, `<header>` topbar, `<main>` workspace.
- Keyboard: dropzone triggers file picker on Enter/Space; all options and rows
  are real `<button>`s; icon buttons carry `aria-label`.
- `aria-live="polite"` on the terminal; `aria-labels` for icon-only controls.
- Focus rings: `ring` token (black), never removed without a replacement.
- Contrast: body text on white ≥ 7:1 (`#0a0a0a`); captions `#757575` is the lightest
  gray allowed for meaningful text.

---

## 8. Tech Constraints (must all hold)

- Stack: React 19 + Vite + TypeScript + Tailwind v4 + **shadcn/ui** (radix base).
- shadcn components live in `src/components/ui/`; do not hand-roll replacements.
- All palette/typography tokens stay in `src/index.css` `:root` (Tailwind v4
  `@theme inline` mapping). Components use semantic utilities only.
- Icons: `lucide-react` only, 1.25rem-ish, `stroke` from `currentColor`. Keep a
  single icon language — no emoji, no rainbow fills, no duotone.
- Dark mode: token structure exists (`.dark`) but the app ships light-only.
  Keep tokens colocated if dark mode ever returns.

## 9. Redesign Non-Negotiables

1. No purple / indigo / violet, ever.
2. Color reserved for status feedback on small details only.
3. Monochrome + Geist + hairline borders = the identity. Preserve it.
4. Keep the token architecture and shadcn/ui contract intact.
5. Keep all component names, props, data flow, and localStorage schema
   (`exam_prep_sessions`) unchanged so backend/agent integration still works.
6. Keep the sidebar black, the workspace white, and the primary button black.
7. The terminal stays monospace and dark.

---

## 10. Files That Define This System

- `client/src/index.css` — tokens, fonts, base layer (source of truth)
- `client/src/components/ui/*` — shadcn primitives
- `client/src/components/` — `Sidebar`, `Topbar`, `UploadSection` (file + pages +
  prompt inputs), `Terminal`, `SyllabusSection` (module cards + copy prompt +
  calendar)
- `client/src/App.tsx` — composition, section layout, session state