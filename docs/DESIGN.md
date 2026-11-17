# Hobbook Design System

> Direction: **athletic, calm, data-forward.** This is an *Operate* surface (people complete tasks: find, join, create), so precision and consistency come before expression. The brand shows in precise details: the date tile, the capacity meter, sport glyphs and one signal-orange accent.
> Source of truth: `frontend/src/styles/tokens.css` → `base.css` → `components.css`. Components use **semantic tokens only**; raw colours live in `tokens.css` (exceptions: MapLibre paint values and the `<meta name="theme-color">` literals, both documented in code).

## 1. Principles
1. **Task first.** No hero and no marketing sections. Discover opens straight into list and map.
2. **Data as design.** Date, spots and status are visual elements (date tile, capacity meter, badges), always with words, never colour alone.
3. **One accent, used for meaning.** Signal orange marks primary actions, the current selection and "few spots left". It is not decoration.
4. **One vocabulary.** One button family, one field family, one chip, one card, one badge, one notice, one empty state.
5. **Motion = state change.** 150–250 ms, ease-out; no entrance choreography, no scroll effects. `prefers-reduced-motion` turns it all off.
6. **Light and dark are equal.** The theme follows the system with a manual override (header toggle, profile). It is resolved before first paint.

## 2. Tokens

**Type**
- Fonts:
  - `--font-ui`: Inter Variable, used for UI text, labels and data, with tabular numerals (`.num`).
  - `--font-display`: Barlow Condensed 600/700, used only for page titles, event titles, form section titles, the date-tile number and the brand name.
- Scale, fixed rem with a ratio of about 1.2:
  - `--text-xs` 12
  - `--text-sm` 14
  - `--text-md` 16 (body)
  - `--text-lg` 18
  - `--text-xl` 20
  - `--text-2xl` 24
  - `--text-3xl` 30
  - `--text-4xl` 36

**Space:** 4px grid, `--space-1` 4 → `--space-16` 64.
**Radius:** `--radius-sm` 6 (controls) · `--radius-md` 10 (cards, tiles) · `--radius-lg` 16 (modals) · `--radius-pill`.
**Elevation:** `--shadow-1` (hover/raised card) and `--shadow-2` (popovers, modals, floating toggles). Both are offset, soft shadows.
**Size:** `--control-h` 44px (every touch target), `--control-h-sm` 36px (fine pointers only; it becomes 44 under `pointer: coarse`).
**Layers:** `--z-map-ui` 5 · `--z-sticky` 40 · `--z-nav` 50 · `--z-overlay` 100 · `--z-toast` 110.
**Motion:** `--dur-fast` 150 · `--dur-base` 200 · `--dur-slow` 250 · `--ease-out` cubic-bezier(0.22, 1, 0.36, 1).

### Colour roles (light / dark)
| Role | Light | Dark | Use |
|---|---|---|---|
| `--c-bg` | #f4f6f9 | #0a101a | page |
| `--c-surface` | #ffffff | #111a27 | cards, header |
| `--c-surface-2` | #eef2f6 | #172233 | panels, date tile, skeleton |
| `--c-text` / `-muted` / `-subtle` | #0e1726 / #485569 / #5f6d80 | #e7edf5 / #a9b6c6 / #8c9bb0 | text hierarchy |
| `--c-border` / `-strong` | #dce3eb / #7f8b9c | #253246 / #5f7090 | dividers / control boundaries (≥3:1) |
| `--c-ink` | #0e1726 | #e7edf5 | brand mark, mobile view toggle |
| `--c-accent` (+ `-hover`, `-soft`, `-text`, `on-`) | #c2410c | #fb923c | primary action, selection |
| `--c-link` = `--c-focus` = `--c-info` | #1d4ed8 | #93c5fd | links, focus ring, info |
| success / warning / danger | #15803d / #8a5300 / #b91c1c | #4ade80 / #facc15 / #f87171 | status |
| `--sport-*` | 12 data colours per theme | | sport label, marker fill |

The map uses OpenFreeMap "liberty" in light mode and "fiord" (navy) in dark mode. 3D buildings are available in both; the dark style gets an added extrusion layer.

## 3. Components
| Component | Where | Notes |
|---|---|---|
| `.btn` + `-primary/-secondary/-outline/-danger/-ghost`, `-sm`, `-block`, `-icon` | everywhere | 44px tall, 0.98 press, disabled at 55% opacity |
| `.field`, `.input/.select/.textarea`, `.radio-row/.check-row`, `.hint`, `.error` | forms | Visible labels, error under the field, `aria-invalid` + `aria-describedby`, 3px focus halo |
| Error summary | `EventFormPage` | Lists invalid fields as links; focus moves to the first invalid field |
| `.chip` (`.is-on` / `aria-pressed`) | filters, sports, theme, moderation status | One chip pattern (previously three) |
| `.badge-{open,full,cancelled,completed,neutral}` | status | Always text plus colour |
| `.card` | sections | Flat border; `shadow-1` only on hover/raised; never nested |
| `.notice-{info,success,warning,danger}` | inline feedback | Leading icon, `role=status/alert` |
| `.tabs/.tab` | My Events, moderation | Accent underline for the selected tab |
| `EmptyState` | empty and not-found | Icon, heading, what to do next, one action |
| `EventCardSkeleton` / `Skeleton` | loading lists | Same geometry as real cards (no layout shift); shimmer stops under reduced motion |
| `DateTile` | cards, detail, preview | Weekday / day / month in the event's time zone, `aria-hidden` (the date is also in text) |
| `CapacityMeter` | cards, detail | `role=meter` with value text; segments ≤16, bar above; "x Plätze frei", "Voll", "Abgesagt" |
| `SportIcon` | cards, detail, markers | lucide icons plus four authored glyphs (football, basketball, tennis, table tennis) in lucide's grid |
| `Modal` | confirmations, report | Labelled, Esc closes, focus in and back; bottom sheet under 640px |
| `Logo`, `ThemeToggle`, `ThemeChoice` | header, auth, footer, profile | Mark: lowercase "h" with a ball |
| `.table` (+ mobile card layout in admin) | moderation | Rows become labelled cards under 640px |

## 4. Layout and breakpoints
- **< 640:** single column, modal as bottom sheet, admin table as cards.
- **< 860:** bottom tab bar (5 items, centered orange "Erstellen"), list/map toggle, 56px header.
- **861–1024:** tablet split (list 340px).
- **≥ 1440:** list column 480px.
- Content pages: max width 1200; forms, profile and legal at 760.

## 5. Accessibility rules
- Every text pair is AA and every control boundary is ≥3:1 in both themes (table below; run `node scripts/check-contrast.mjs`).
- One focus style everywhere: a 2px `--c-focus` outline with a 2px offset.
- Touch targets are ≥44px under `pointer: coarse`, including the map controls, card title links (padded hit area) and the skip link.
- Status is never shown by colour alone.
- Decorative icons are `aria-hidden`.
- Map markers aren't focusable; the list is the keyboard and screen-reader path, and the map region says so.
- Theme is applied before first paint; `color-scheme` is set so form controls and scrollbars match.

## 6. Rejected patterns (and why)
- **Hero sections and one-section-per-screen layouts** (Taste, UI UX Pro Max "Hero-Centric"): Hobbook is a tool, and the first screen must be the task.
- **Fluid `clamp()` type** (Modern Web Design): product UI needs a stable scale (Impeccable Operate).
- **Hover scale 1.05 and press 0.95** (Modern Web Design): too much for dense lists; a 2px lift and 0.98 press are used instead.
- **Glassmorphism, custom cursors, scrollytelling, parallax, GSAP/Framer Motion:** decoration without a task benefit, plus bundle cost. The header's light blur is the only blur, and it exists to keep content readable under a sticky bar.
- **Righteous/Poppins** (database suggestion for "events"): a festival/music tone, wrong for sport.
- **Coloured `border-left` accent on cards** (previous design): Impeccable craft-floor ban; sport colour now lives in the label and icon.
- **Eyebrow labels, gradient text, hero-metric blocks, emoji icons:** craft-floor bans.
- **"No coordinates in addresses"** (Taste rule 9): contradicts a map product.

## 7. Contrast verification (generated)
| Theme | Pair | Used for | Ratio | Min | |
|---|---|---|---:|---:|---|
| light | `--c-text` on `--c-bg` | body text on page | 16.59 | 4.5 | ✅ |
| light | `--c-text` on `--c-surface` | body text on card | 17.96 | 4.5 | ✅ |
| light | `--c-text-muted` on `--c-surface` | secondary text | 7.56 | 4.5 | ✅ |
| light | `--c-text-subtle` on `--c-surface` | meta/hint text | 5.27 | 4.5 | ✅ |
| light | `--c-text-subtle` on `--c-surface-2` | hint on panel | 4.68 | 4.5 | ✅ |
| light | `--c-on-accent` on `--c-accent` | primary button label | 5.18 | 4.5 | ✅ |
| light | `--c-on-accent` on `--c-accent-hover` | primary button hover | 7.31 | 4.5 | ✅ |
| light | `--c-accent-text` on `--c-surface` | accent text | 7.31 | 4.5 | ✅ |
| light | `--c-accent-text` on `--c-accent-soft` | selected chip | 6.38 | 4.5 | ✅ |
| light | `--c-link` on `--c-surface` | links | 6.70 | 4.5 | ✅ |
| light | `--c-success` on `--c-success-soft` | badge open | 4.57 | 4.5 | ✅ |
| light | `--c-warning` on `--c-warning-soft` | badge full | 5.68 | 4.5 | ✅ |
| light | `--c-danger` on `--c-danger-soft` | badge cancelled / error | 5.30 | 4.5 | ✅ |
| light | `--c-danger` on `--c-surface` | inline field error | 6.47 | 4.5 | ✅ |
| light | `--c-info` on `--c-info-soft` | info badge | 5.49 | 4.5 | ✅ |
| light | `--c-text-muted` on `--c-neutral-soft` | badge completed | 6.43 | 4.5 | ✅ |
| light | `--c-focus` on `--c-surface` | focus ring (non-text) | 6.70 | 3 | ✅ |
| light | `--c-border-strong` on `--c-surface` | input border (non-text) | 3.46 | 3 | ✅ |
| light | `--c-accent` on `--c-surface` | accent UI (non-text) | 5.18 | 3 | ✅ |
| light | `--sport-football` on `--c-surface` | sport label text | 5.02 | 4.5 | ✅ |
| light | `--sport-basketball` on `--c-surface` | sport label text | 5.18 | 4.5 | ✅ |
| light | `--sport-volleyball` on `--c-surface` | sport label text | 4.92 | 4.5 | ✅ |
| light | `--sport-beach_volleyball` on `--c-surface` | sport label text | 5.02 | 4.5 | ✅ |
| light | `--sport-running` on `--c-surface` | sport label text | 5.47 | 4.5 | ✅ |
| light | `--sport-cycling` on `--c-surface` | sport label text | 5.36 | 4.5 | ✅ |
| light | `--sport-tennis` on `--c-surface` | sport label text | 4.99 | 4.5 | ✅ |
| light | `--sport-table_tennis` on `--c-surface` | sport label text | 6.29 | 4.5 | ✅ |
| light | `--sport-badminton` on `--c-surface` | sport label text | 5.93 | 4.5 | ✅ |
| light | `--sport-frisbee` on `--c-surface` | sport label text | 7.88 | 4.5 | ✅ |
| light | `--sport-fitness` on `--c-surface` | sport label text | 10.35 | 4.5 | ✅ |
| light | `--sport-other` on `--c-surface` | sport label text | 7.58 | 4.5 | ✅ |
| dark | `--c-text` on `--c-bg` | body text on page | 16.18 | 4.5 | ✅ |
| dark | `--c-text` on `--c-surface` | body text on card | 14.85 | 4.5 | ✅ |
| dark | `--c-text-muted` on `--c-surface` | secondary text | 8.49 | 4.5 | ✅ |
| dark | `--c-text-subtle` on `--c-surface` | meta/hint text | 6.19 | 4.5 | ✅ |
| dark | `--c-text-subtle` on `--c-surface-2` | hint on panel | 5.66 | 4.5 | ✅ |
| dark | `--c-on-accent` on `--c-accent` | primary button label | 8.37 | 4.5 | ✅ |
| dark | `--c-on-accent` on `--c-accent-hover` | primary button hover | 11.23 | 4.5 | ✅ |
| dark | `--c-accent-text` on `--c-surface` | accent text | 10.37 | 4.5 | ✅ |
| dark | `--c-accent-text` on `--c-accent-soft` | selected chip | 7.92 | 4.5 | ✅ |
| dark | `--c-link` on `--c-surface` | links | 9.70 | 4.5 | ✅ |
| dark | `--c-success` on `--c-success-soft` | badge open | 7.50 | 4.5 | ✅ |
| dark | `--c-warning` on `--c-warning-soft` | badge full | 8.40 | 4.5 | ✅ |
| dark | `--c-danger` on `--c-danger-soft` | badge cancelled / error | 5.21 | 4.5 | ✅ |
| dark | `--c-danger` on `--c-surface` | inline field error | 6.32 | 4.5 | ✅ |
| dark | `--c-info` on `--c-info-soft` | info badge | 7.39 | 4.5 | ✅ |
| dark | `--c-text-muted` on `--c-neutral-soft` | badge completed | 7.03 | 4.5 | ✅ |
| dark | `--c-focus` on `--c-surface` | focus ring (non-text) | 9.70 | 3 | ✅ |
| dark | `--c-border-strong` on `--c-surface` | input border (non-text) | 3.50 | 3 | ✅ |
| dark | `--c-accent` on `--c-surface` | accent UI (non-text) | 7.73 | 3 | ✅ |
| dark | `--sport-football` on `--c-surface` | sport label text | 10.04 | 4.5 | ✅ |
| dark | `--sport-basketball` on `--c-surface` | sport label text | 7.73 | 4.5 | ✅ |
| dark | `--sport-volleyball` on `--c-surface` | sport label text | 11.42 | 4.5 | ✅ |
| dark | `--sport-beach_volleyball` on `--c-surface` | sport label text | 10.48 | 4.5 | ✅ |
| dark | `--sport-running` on `--c-surface` | sport label text | 9.39 | 4.5 | ✅ |
| dark | `--sport-cycling` on `--c-surface` | sport label text | 9.68 | 4.5 | ✅ |
| dark | `--sport-tennis` on `--c-surface` | sport label text | 11.60 | 4.5 | ✅ |
| dark | `--sport-table_tennis` on `--c-surface` | sport label text | 6.50 | 4.5 | ✅ |
| dark | `--sport-badminton` on `--c-surface` | sport label text | 8.16 | 4.5 | ✅ |
| dark | `--sport-frisbee` on `--c-surface` | sport label text | 6.60 | 4.5 | ✅ |
| dark | `--sport-fitness` on `--c-surface` | sport label text | 11.78 | 4.5 | ✅ |
| dark | `--sport-other` on `--c-surface` | sport label text | 6.82 | 4.5 | ✅ |

All pairs pass.

## 8. Landing page ("Anpfiff", `/`)
- **Role:** the public entry door for guests. Signed-in users opening `/` go straight to `/entdecken`. Discover stays public, so guests can look around without an account.
- **Mode:** *Persuade*. Display type may scale with the viewport here (`clamp()`); app screens keep the fixed rem scale.
- **Story:**
  1. **Entdecken:** hero with headline, city search, two CTAs and live event cards.
  2. **Finden:** real list next to a schematic map; hovering or focusing a row lights up its pin.
  3. **Auswählen:** one real event as a "match ticket".
  4. **Mitmachen:** three steps on a drawn line.
  5. **Selbst starten:** composition of the real create flow.
  6. **Closing band:** city search again.
- **Truthfulness:**
  - Every event shown is real data from `GET /api/events?limit=6`.
  - With no events, the page says so and offers "Event erstellen".
  - No counts, testimonials, ratings or invented features.
- **Stage tokens:** `--c-stage`, `--c-stage-2`, `--c-on-stage(-muted)`, `--c-stage-line`, `--c-stage-field-border`, `--c-stage-accent`, `--ease-expo`. The stage is a "night pitch" that looks the same in both themes; all pairs are in the contrast check.
- **Motion budget:**
  - Hero only, once on load: pitch lines draw, headline words rise through masks, live cards settle, sport chips follow.
  - Sections: one reveal each via `useReveal`; the ticket's callout bars, the steps track and the pin drop are line or position animations.
  - Subtle hero depth through `animation-timeline: view()` (progressive enhancement).
  - Content is visible by default; hidden start states only apply under `.reveal-ready` (IntersectionObserver available and no reduced motion).
  - No scroll-jacking, no looping animation.
- **Performance:**
  - The landing page renders from markup and inline SVG (no images).
  - Map pages are code-split (`React.lazy`), so the landing bundle is 286 kB / 91 kB gzip instead of 1.1 MB.
  - The Discover chunk is prefetched two seconds after load.
- **Responsive:**
  - ≥1025: two-column hero with fanned cards.
  - ≤1024: single column; live cards become a swipeable rail.
  - ≤760: full-width CTAs, sport chips as a horizontal rail, icon-only search button.
  - Content max 1440 on full-bleed backgrounds (no empty side areas at 1920+). E2E checks no horizontal overflow at 390, 768, 1024, 1440 and 1920.
