# Hobbook Design System

> Direction: **"Spielfeld bei Tag" — bright, warm, social.** People come to find something to do with others, so the interface should feel inviting and make the next tap obvious. Energy comes from one vivid action colour (court blue), one highlight (volt lime, always behind ink text) and the sport palette; neutrals stay warm.
> Source of truth: `frontend/src/styles/tokens.css` → `base.css` → `components.css`. Components use **semantic tokens only**; raw colours live in `tokens.css` (exceptions: the brand mark, MapLibre paint values and the `<meta name="theme-color">` literals).

## 1. Principles
1. **One obvious next tap.** Every screen has one primary action in court blue; on phones it sits within thumb reach (tab bar, sticky join bar, sticky publish button).
2. **Real things first.** The landing page, the home page and Discover all open on real events, not on explanations.
3. **Data as design.** Date, spots, distance and status are visual elements (date tile, capacity meter, badges), always with words, never colour alone.
4. **Colour means something.** Blue = what you can do. Lime = you did it / it is selected ("Du bist dabei", active tab, step numbers). Sport colours = which sport.
5. **One vocabulary.** One button family, one field family, one chip, one card, one badge, one notice, one toast, one confirm dialog, one empty state.
6. **Motion explains.** In the app, motion only marks a state change (150–250 ms). The landing page may tell a story with motion, but stays fully readable without it. `prefers-reduced-motion` turns it all off.
7. **Light and dark are equal.** The theme follows the system with a manual override (profile, footer) and is resolved before first paint.

## 2. Tokens

**Type**
- `--font-ui`: Inter Variable — UI text, labels and data, with tabular numerals (`.num`).
- `--font-display`: Bricolage Grotesque Variable (self-hosted) — page titles, event titles, section titles, the date-tile number and the brand name, with `--tracking-display` (-0.02em).
- Scale, fixed rem with a ratio of about 1.2: `--text-xs` 12 · `sm` 14 · `md` 16 (body) · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 30 · `4xl` 36. Only the landing page scales display type with the viewport.

**Space:** 4px grid, `--space-1` 4 → `--space-16` 64.
**Radius:** `--radius-sm` 10 (inputs) · `--radius-md` 16 (cards) · `--radius-lg` 24 (sheets) · `--radius-pill` (buttons, chips, badges).
**Elevation:** `--shadow-1` (raised card) and `--shadow-2` (popovers, sheets, floating controls).
**Size:** `--control-h` 44px (every touch target), `--control-h-sm` 36px (fine pointers only; 44 under `pointer: coarse`), `--control-h-lg` 52px (hero and publish buttons).
**Layers:** `--z-map-ui` 5 · `--z-sticky` 40 · `--z-nav` 50 · `--z-overlay` 100 · `--z-toast` 110.
**Motion:** `--dur-fast` 150 · `--dur-base` 200 · `--dur-slow` 250 · `--ease-out`, `--ease-expo`, `--ease-spring` (small confirmations: save, join, toast).

### Colour roles (light / dark)
| Role | Light | Dark | Use |
|---|---|---|---|
| `--c-bg` | #faf8f4 | #0d0f14 | page |
| `--c-surface` | #ffffff | #161920 | cards, header |
| `--c-surface-2` | #f2efe9 | #1e222b | panels, date tile, skeleton |
| `--c-text` / `-muted` / `-subtle` | #14161c / #4b5160 / #5c6373 | #f1f2f5 / #b0b5c2 / #939aaa | text hierarchy |
| `--c-border` / `-strong` | #e6e1d8 / #8a8578 | #2a2f3a / #6b7386 | dividers / control boundaries (≥3:1) |
| `--c-ink` / `--c-on-ink` | #14161c / #fff | #f1f2f5 / #14161c | selected chips, ink button, toasts, view toggle |
| `--c-accent` (+ `-hover`, `-soft`, `-text`, `on-`) | #2f4bff | #8c9cff | primary action, links, focus |
| `--c-hl` (+ `-hover`, `--c-on-hl`) | #d4ff3a | #d4ff3a | highlight fill behind ink text only |
| success / warning / danger | #15803d / #8a5300 / #b91c1c | #4ade80 / #facc15 / #f87171 | status |
| `--sport-*` | 12 data colours per theme | | sport label, marker fill |
| `--c-stage*` | dark brand surface, same in both themes | | landing closing band |

The map uses OpenFreeMap "liberty" in light mode and "fiord" in dark mode.

## 3. Components
| Component | Where | Notes |
|---|---|---|
| `.btn` + `-primary/-secondary/-ink/-hl/-danger/-ghost`, `-sm/-lg`, `-block`, `-icon` | everywhere | Pill shape, 44px tall, 0.97 press, disabled at 55% opacity |
| `.field`, `.input/.select/.textarea`, `.radio-row/.check-row`, `.hint`, `.error` | forms | Visible labels, error under the field, `aria-invalid` + `aria-describedby`, 3px focus halo |
| `.chip` (`aria-pressed` / `.is-on`) | filters, sports, theme, day and duration shortcuts | Selected = ink fill |
| `FilterBar` | Discover | Search on top, one swipeable chip row: near me, Heute/Morgen/Wochenende/7 Tage, sport (native select styled as a chip), Plätze frei |
| `EventCard` | Discover, Home, My Events, landing rail | The whole card opens the event (stretched title link); bookmark and "Auf Karte" sit above it; distance when the position is known |
| `SaveButton` | cards, detail | Optimistic toggle with rollback, toast, sign-in hand-off for guests |
| `.badge-{open,full,cancelled,completed,neutral}` | status | Always text plus colour |
| `.notice-{info,success,warning,danger}` | inline feedback that must stay | Leading icon, `role=status/alert` |
| `ToastProvider` / `useToast` | short confirmations | One toast at a time, disappears on its own, above the tab bar on phones |
| `Modal` / `ConfirmDialog` | report, cancel, destructive confirmations | Labelled, Esc closes, focus trapped and returned; bottom sheet under 640px |
| `Avatar` / `AvatarStack` | organizer, participants | Initials on a soft tint; decorative |
| `.tabs/.tab` | My Events, moderation | Arrow keys move between tabs; 3px accent underline |
| `EmptyState` | empty and not-found | Lime icon disc, heading, what to do next, one action |
| `EventCardSkeleton` / `Skeleton` | loading lists | Same geometry as real cards (no layout shift) |
| `DateTile`, `CapacityMeter`, `SportIcon`, `StatusBadge` | cards, detail, previews | Date in the event's time zone; `role=meter` with value text |
| `EventMap` | Discover, detail | Clusters, own-position dot, loading shimmer, empty hint; popup on desktop, preview card on phones |
| `Logo`, `ThemeToggle`, `ThemeChoice` | header, footer, profile | Mark: white "h" on court blue with the volt ball |

## 4. Layout, navigation and breakpoints
- **Destinations:** Start (`/`: landing for guests, personal home when signed in) · Entdecken (`/entdecken`, list + map; `/karte` opens the same page in map view) · Meine Events (Erstellt / Dabei / Gemerkt) · Profil. "Event erstellen" is the one create action everywhere.
- **< 640:** single column, dialogs as bottom sheets, admin table as cards.
- **< 860:** bottom tab bar (Start · Entdecken · + · Meine · Profil), list/map toggle, sticky join bar on the event page, 56px header.
- **861–1024:** tablet split (list 340px).
- **≥ 1440:** list column 480px.
- Content pages: max width 1200; forms, profile and legal at 760.

## 5. Accessibility rules
- Every text pair is AA and every control boundary is ≥3:1 in both themes (table below; run `npm run check:contrast`).
- Nothing is dimmed with opacity to show "inactive"; inactive things are hidden or marked another way.
- One focus style everywhere: a 2px `--c-focus` outline with a 2px offset.
- Touch targets are ≥44px under `pointer: coarse`.
- Status and selection are never shown by colour alone (active tab = filled pill + bold label).
- Dialogs trap focus; tabs and the theme choice answer to arrow keys; every page has a `<main>` and an h1 → h2 → h3 order.
- Map markers aren't focusable; the list is the keyboard and screen-reader path, and the map region says so.
- E2E runs axe (WCAG 2.1 A/AA) on landing, Discover, detail, auth and the create form.

## 6. Rejected patterns (and why)
- **A wizard with "Weiter" buttons for creating events:** three numbered sections on one page with defaults need fewer taps than three screens.
- **A custom sport picker sheet in Discover:** the native select is the best picker on phones and needs no extra code; it is only styled as a chip.
- **Auto-playing carousels:** the landing rail nudges once and stops at the first touch.
- **Glassmorphism, custom cursors, parallax, animation libraries:** decoration without a task benefit, plus bundle cost.
- **Dimmed "inactive" text:** fails contrast; see section 5.
- **Emoji icons, gradient text, invented numbers or testimonials.**

## 7. Contrast verification (generated)
| Theme | Pair | Used for | Ratio | Min | |
|---|---|---|---:|---:|---|
| light | `--c-text` on `--c-bg` | body text on page | 17.05 | 4.5 | ✅ |
| light | `--c-text` on `--c-surface` | body text on card | 18.08 | 4.5 | ✅ |
| light | `--c-text-muted` on `--c-surface` | secondary text | 7.94 | 4.5 | ✅ |
| light | `--c-text-subtle` on `--c-surface` | meta/hint text | 6.02 | 4.5 | ✅ |
| light | `--c-text-subtle` on `--c-surface-2` | hint on panel | 5.25 | 4.5 | ✅ |
| light | `--c-on-accent` on `--c-accent` | primary button label | 5.88 | 4.5 | ✅ |
| light | `--c-on-hl` on `--c-hl` | highlight fill label | 15.64 | 4.5 | ✅ |
| light | `--c-on-hl` on `--c-hl-hover` | highlight fill hover | 13.61 | 4.5 | ✅ |
| light | `--c-on-ink` on `--c-ink` | ink button / selected chip | 18.08 | 4.5 | ✅ |
| light | `--c-text-muted` on `--c-bg` | secondary text on page | 7.48 | 4.5 | ✅ |
| light | `--c-text-subtle` on `--c-bg` | meta text on page | 5.68 | 4.5 | ✅ |
| light | `--c-on-accent` on `--c-accent-hover` | primary button hover | 8.21 | 4.5 | ✅ |
| light | `--c-accent-text` on `--c-surface` | accent text | 8.21 | 4.5 | ✅ |
| light | `--c-accent-text` on `--c-accent-soft` | selected chip | 6.87 | 4.5 | ✅ |
| light | `--c-link` on `--c-surface` | links | 8.21 | 4.5 | ✅ |
| light | `--c-success` on `--c-success-soft` | badge open | 4.57 | 4.5 | ✅ |
| light | `--c-warning` on `--c-warning-soft` | badge full | 5.68 | 4.5 | ✅ |
| light | `--c-danger` on `--c-danger-soft` | badge cancelled / error | 5.30 | 4.5 | ✅ |
| light | `--c-danger` on `--c-surface` | inline field error | 6.47 | 4.5 | ✅ |
| light | `--c-info` on `--c-info-soft` | info badge | 6.87 | 4.5 | ✅ |
| light | `--c-text-muted` on `--c-neutral-soft` | badge completed | 6.50 | 4.5 | ✅ |
| light | `--c-focus` on `--c-surface` | focus ring (non-text) | 5.88 | 3 | ✅ |
| light | `--c-border-strong` on `--c-surface` | input border (non-text) | 3.68 | 3 | ✅ |
| light | `--c-accent` on `--c-surface` | accent UI (non-text) | 5.88 | 3 | ✅ |
| light | `--c-on-stage` on `--c-stage` | landing stage text | 17.28 | 4.5 | ✅ |
| light | `--c-on-stage-muted` on `--c-stage` | landing stage secondary text | 9.97 | 4.5 | ✅ |
| light | `--c-on-stage-muted` on `--c-stage-2` | stage panel text | 9.07 | 4.5 | ✅ |
| light | `--c-on-stage-accent` on `--c-stage-accent` | stage primary button | 15.64 | 4.5 | ✅ |
| light | `--c-stage-accent` on `--c-stage` | stage accent UI (non-text) | 16.19 | 3 | ✅ |
| light | `--c-stage-field-border` on `--c-stage` | stage field border (non-text) | 4.81 | 3 | ✅ |
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
| light | `--sport-fitness` on `--c-surface` | sport label text | 7.10 | 4.5 | ✅ |
| light | `--sport-other` on `--c-surface` | sport label text | 7.58 | 4.5 | ✅ |
| dark | `--c-text` on `--c-bg` | body text on page | 17.12 | 4.5 | ✅ |
| dark | `--c-text` on `--c-surface` | body text on card | 15.71 | 4.5 | ✅ |
| dark | `--c-text-muted` on `--c-surface` | secondary text | 8.57 | 4.5 | ✅ |
| dark | `--c-text-subtle` on `--c-surface` | meta/hint text | 6.23 | 4.5 | ✅ |
| dark | `--c-text-subtle` on `--c-surface-2` | hint on panel | 5.64 | 4.5 | ✅ |
| dark | `--c-on-accent` on `--c-accent` | primary button label | 7.41 | 4.5 | ✅ |
| dark | `--c-on-hl` on `--c-hl` | highlight fill label | 15.64 | 4.5 | ✅ |
| dark | `--c-on-hl` on `--c-hl-hover` | highlight fill hover | 16.09 | 4.5 | ✅ |
| dark | `--c-on-ink` on `--c-ink` | ink button / selected chip | 16.15 | 4.5 | ✅ |
| dark | `--c-text-muted` on `--c-bg` | secondary text on page | 9.34 | 4.5 | ✅ |
| dark | `--c-text-subtle` on `--c-bg` | meta text on page | 6.79 | 4.5 | ✅ |
| dark | `--c-on-accent` on `--c-accent-hover` | primary button hover | 9.57 | 4.5 | ✅ |
| dark | `--c-accent-text` on `--c-surface` | accent text | 9.75 | 4.5 | ✅ |
| dark | `--c-accent-text` on `--c-accent-soft` | selected chip | 7.14 | 4.5 | ✅ |
| dark | `--c-link` on `--c-surface` | links | 9.00 | 4.5 | ✅ |
| dark | `--c-success` on `--c-success-soft` | badge open | 7.56 | 4.5 | ✅ |
| dark | `--c-warning` on `--c-warning-soft` | badge full | 8.40 | 4.5 | ✅ |
| dark | `--c-danger` on `--c-danger-soft` | badge cancelled / error | 5.20 | 4.5 | ✅ |
| dark | `--c-danger` on `--c-surface` | inline field error | 6.36 | 4.5 | ✅ |
| dark | `--c-info` on `--c-info-soft` | info badge | 6.59 | 4.5 | ✅ |
| dark | `--c-text-muted` on `--c-neutral-soft` | badge completed | 7.10 | 4.5 | ✅ |
| dark | `--c-focus` on `--c-surface` | focus ring (non-text) | 9.00 | 3 | ✅ |
| dark | `--c-border-strong` on `--c-surface` | input border (non-text) | 3.70 | 3 | ✅ |
| dark | `--c-accent` on `--c-surface` | accent UI (non-text) | 6.96 | 3 | ✅ |
| dark | `--c-on-stage` on `--c-stage` | landing stage text | 17.28 | 4.5 | ✅ |
| dark | `--c-on-stage-muted` on `--c-stage` | landing stage secondary text | 9.97 | 4.5 | ✅ |
| dark | `--c-on-stage-muted` on `--c-stage-2` | stage panel text | 9.07 | 4.5 | ✅ |
| dark | `--c-on-stage-accent` on `--c-stage-accent` | stage primary button | 15.64 | 4.5 | ✅ |
| dark | `--c-stage-accent` on `--c-stage` | stage accent UI (non-text) | 16.19 | 3 | ✅ |
| dark | `--c-stage-field-border` on `--c-stage` | stage field border (non-text) | 4.81 | 3 | ✅ |
| dark | `--sport-football` on `--c-surface` | sport label text | 10.09 | 4.5 | ✅ |
| dark | `--sport-basketball` on `--c-surface` | sport label text | 7.77 | 4.5 | ✅ |
| dark | `--sport-volleyball` on `--c-surface` | sport label text | 11.48 | 4.5 | ✅ |
| dark | `--sport-beach_volleyball` on `--c-surface` | sport label text | 10.54 | 4.5 | ✅ |
| dark | `--sport-running` on `--c-surface` | sport label text | 9.45 | 4.5 | ✅ |
| dark | `--sport-cycling` on `--c-surface` | sport label text | 9.73 | 4.5 | ✅ |
| dark | `--sport-tennis` on `--c-surface` | sport label text | 11.66 | 4.5 | ✅ |
| dark | `--sport-table_tennis` on `--c-surface` | sport label text | 6.53 | 4.5 | ✅ |
| dark | `--sport-badminton` on `--c-surface` | sport label text | 8.21 | 4.5 | ✅ |
| dark | `--sport-frisbee` on `--c-surface` | sport label text | 6.64 | 4.5 | ✅ |
| dark | `--sport-fitness` on `--c-surface` | sport label text | 9.53 | 4.5 | ✅ |
| dark | `--sport-other` on `--c-surface` | sport label text | 6.86 | 4.5 | ✅ |

All pairs pass.

## 8. Landing page ("Der Ball rollt", `/`)
- **Role:** the public entry door for guests. Signed-in users see their personal home at `/` instead. Discover stays public, so guests can look around without an account.
- **Order:** hero (headline, city search, two actions) → live rail of real events → sport chips → pinned scene "In drei Schritten auf dem Platz" → organize → dark closing band with a second search.
- **Truthfulness:**
  - Every event shown is real data from `GET /api/events?limit=6`.
  - With no events the page says so; when loading fails it says that instead.
  - The phone in the scroll scene is an illustration (`aria-hidden`) built from the first real event; the three steps beside it carry the meaning.
  - No counts, testimonials, ratings or invented features.
- **Motion:**
  - Load: the ball rolls in, the highlight sweeps behind "Spiel.", hero content rises in sequence.
  - A scoreboard-style roller names sports (decorative; a static sentence is read to screen readers).
  - The live rail nudges once and returns; any touch, hover, focus or scroll cancels it.
  - Sport chips scatter in when they enter the viewport.
  - The pinned scene changes with the step in the middle of the screen: found → "Du bist dabei" → route drawn.
  - Hidden start states only apply under `.reveal-ready` (IntersectionObserver available and no reduced motion). CSS, IntersectionObserver and requestAnimationFrame only.
- **Performance:** markup and inline SVG only; map pages are code-split and the Discover chunk is prefetched two seconds after load.
- **Responsive:** on phones the scene's stage pins under the header while the steps scroll past; actions are full width; E2E checks no horizontal overflow at 390, 768, 1024, 1440 and 1920.
