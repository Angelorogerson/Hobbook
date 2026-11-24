# Hobbook Design System

> Direction: **"Spielfeld bei Tag" — bright, warm, social.** People come to find something to do with others, so the interface should feel inviting and make the next tap obvious. Energy comes from one vivid action colour (court blue), one highlight (volt lime, always behind ink text) and the sport palette; neutrals stay warm.
> Source of truth: `frontend/src/styles/tokens.css` → `base.css` → `components.css`. Components use **semantic tokens only**; raw colours live in `tokens.css` (exceptions: the brand mark, MapLibre paint values and the `<meta name="theme-color">` literals).

## 1. Principles
1. **One obvious next tap.** Every screen has one primary action in court blue; on phones it sits within thumb reach (tab bar, sticky join bar, sticky publish button).
2. **Real things first.** The landing page, the home page and Discover all open on real events, not on explanations.
3. **Data as design.** Date, spots, distance and status are visual elements (date tile, capacity meter, badges), always with words, never colour alone.
4. **Colour means something.** Blue = what you can do. Lime = you did it / it is selected ("Du bist dabei", active tab, step numbers). Sport colours = which sport.
5. **One vocabulary.** One button family, one field family, one chip, one card, one badge, one notice, one toast, one confirm dialog, one empty state.
6. **Motion is directed, not decorative.** One motion language for the whole product (section 9). The app is calm and fast; the landing page tells the story. Every animation guides attention, explains a change, keeps spatial context, gives feedback or carries the story — otherwise it is removed. With `prefers-reduced-motion` movement becomes a fade and nothing is lost.
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
**Motion:** see section 9.

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
- **Story order:** promise (hero) → the real product (live rail) → how it works (pinned scene) → variety (sports) → the other side (organising) → trust → action (closing search).
- **The thread is the ball:** it rolls into the headline, travels down the step line to the current step, and drops onto the closing search, whose button nods once on arrival.
- **Truthfulness:**
  - Every event shown is real data from `GET /api/events?limit=6`.
  - With no events the page says so; when loading fails it says that instead.
  - The phone in the scroll scene is an illustration (`aria-hidden`) built from the first real event; the three steps beside it carry the meaning.
  - The trust section only states what the product really does (free, "Vorname N.", report button, rules). No counts, testimonials or ratings.
- **Motion** (story tier, section 9):
  - Hero: kicker, headline, sentence, search and actions arrive in sequence (`--stagger`); the ball rolls in (`--dur-7`); the highlight follows it over "Spiel.".
  - The word roller names three sports and settles on "Sport" after about four seconds (no endless loop, WCAG 2.2.2).
  - Live rail: real cards arrive with the subtle zoom; the "live" dot pulses three times; the rail nudges once, cancelled by any touch, hover, focus or scroll.
  - Sections reveal once as they enter (`data-reveal`); the phone mock settles with a scroll-linked zoom where the browser supports it.
  - Pinned scene: found → "Du bist dabei" → route drawn; the step line fills and the ball follows.
  - On phones each step's text sits low in its slot, so the active step is never under the pinned scene.
- **Performance:** markup and inline SVG only; map pages are code-split and the Discover chunk is prefetched two seconds after load.
- **Responsive:** actions are full width on phones; E2E checks the section order and no horizontal overflow at 390, 768, 1024, 1440 and 1920.

## 9. Motion

One motion language, written as tokens (`styles/tokens.css`), primitives (`styles/motion.css`) and three hooks (`hooks/usePresence.ts`, `hooks/useReveal.ts`, `utils/motion.ts`). Nothing outside `tokens.css` uses a raw duration, delay or curve.

**Principles** (from Material 3, IBM Carbon, Atlassian, Apple HIG, Nielsen Norman Group, WCAG and web.dev):
1. **Purpose first.** Guide attention, explain a change, keep spatial context, give feedback, or carry the story. If removing it loses nothing, it goes.
2. **Frequency sets the budget.** What people see often is short and quiet; expressive motion is for one-off moments (landing, joined, saved, published).
3. **Never block.** Content and controls work from the first frame; nothing loops endlessly; scrolling is never hijacked.
4. **Cheap.** Only `transform` and `opacity` move. Colours and borders may fade.
5. **Exits are faster than enters** and leave the way they came.
6. **Reduced motion keeps the feedback.** Travel, zoom and stagger become zero; fades remain; nothing waits on a delay.

**Tokens**

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 100 ms | press, hover |
| `--dur-2` | 150 ms | fades, toggles, colour, list/map and tab switches |
| `--dur-3` | 200 ms | toasts, notices, popovers, small enters |
| `--dur-4` | 250 ms | dialogs, sheets, page fade |
| `--dur-5` / `--dur-6` / `--dur-7` | 400 / 600 / 900 ms | story only: reveals and scene changes / hero sequence / one-off draws |
| `--dur-3-out` / `--dur-4-out` | 140 / 180 ms | exits |
| `--ease-enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | arriving |
| `--ease-exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | leaving |
| `--ease-move` | `cubic-bezier(0.2, 0, 0, 1)` | changing in place |
| `--ease-spring` | `linear()` spring (cubic fallback) | confirmations only: join, save, toast, selected pin |
| `--move-1…4` | 4 / 8 / 16 / 24 px (24 → 16 on phones) | travel; app uses 1–2, story 3–4 |
| `--scale-press` / `--scale-enter` / `--scale-pop` | 0.97 / 0.96 / 1.04 | press, subtle zoom-in, one-off emphasis |
| `--stagger` | 50 ms (max six steps) | sequences |

`utils/motion.ts` mirrors the numbers for JavaScript (map camera 400/600 ms, toast lifetimes 3.5/6 s) and provides `useReducedMotion()` and `scrollBehavior()`.

**Three levels**

| Level | Where | What moves |
|---|---|---|
| Micro | every control | Press: `--scale-press` in `--dur-1` on buttons, chips, tabs, nav items, map tools, sport tiles, cards (touch). Hover only under `@media (hover: hover)`: card and pin lift by 2px, arrows lean `--move-1`. Selected markers grow in (`::after` scaleX on tabs and top nav). Focus rings never animate. |
| Component | app | Dialogs fade + zoom in, leave faster (`Presence`); on phones the sheet rises from the bottom and goes back down. Toasts spring in and drop out. Map preview enters, leaves and crossfades between pins. Live notices rise 4px. Join turns into "Du bist angemeldet" with a spring, saving pops the bookmark — both only right after the tap. New result sets, tab panels, list ↔ map and the page itself fade in (`--dur-2`/`--dur-4`; pages use opacity only so fixed bars are not captured). |
| Story | landing page, success moments | See section 8. |

**Reduced motion**
- `tokens.css` zeroes `--move-*`, sets `--scale-*` to 1 and `--stagger` to 0, and turns `--dur-5…7` into `--dur-2`.
- `base.css` removes every animation and transition delay and smooth scrolling.
- Story entrances only exist under `html.reveal-ready`, which is never set with reduced motion; everything is visible from the first frame.
- Loaders breathe (opacity) instead of spinning or shimmering. The map camera jumps (MapLibre honours the setting).
- The preference is read live (`useReducedMotion`), so changing it while the page is open takes effect.

**Celebrations (the ball as signature).** The lime dot of the logo is the ball. Big moments use it; everyday moments stay short.
- Building blocks: `useOnChange` (fires on a change, never on first render), `RollingNumber` (scoreboard roll; one text node, the old value is a CSS pseudo-element), `celebrate()` (8–10 small balls + a ring burst out of an element, removed afterwards), `DrawnCheck` ("Erledigt": check draws, shockwave), `SwapIcon` (icon turns into a check after copying). Tokens: `--dur-8` 1200 ms, `--move-5`, `--scale-burst`, `--ring`, `--ease-up` / `--ease-fall` (a ball in flight).
- Rules: only on the event itself (never on reload; landing and Discover kick-off once per visit), only transform/opacity (clip-path for the save fill and QR build), at most 10 particles, nothing blocks input, everything decorative is `aria-hidden`, reduced motion shows the end state without particles or travel. No vibration.

| # | Big moment | What happens |
|---|---|---|
| 1 | Landing kick-off | The ball jumps out of the logo dot, hops twice over the headline and lands behind "Spiel.", which lights up |
| 2 | Landing live rail | Real events are dealt in like cards, tilted, then straight |
| 3 | Step line | The ball really rolls (rotation from distance) with a short lime trail |
| 4 | Landing finale | The ball drops, a lime shockwave runs out of the search field, the button nods |
| 5 | Joined | Ball hit from the join button, the spot pops into the meter, "Plätze frei" rolls down |
| 6 | Event is live | Lime light sweeps over the event head, date tile flips up, share button nods, ball hit |
| 7 | Game decided "on" | Floodlight glow, ribbon impact, the people who are in hop in turn, ball hit |
| 8 | Moved up from waiting list | The spot slides up like a handed-over ticket, the clock ring draws (first sighting only); ball hit on "Ich komme" |
| 9 | Welcome | Sports drop in like balls; a picked sport hops; ball hit on "Weiter" |
| 10 | Stammspiel created | Invite unfolds like a ticket with a tear-off line, copy button nods, a ball flies out after copying |
| 11 | Discover kick-off | First visit per session: cards cascade from further away, pins drop from higher |
| 12 | Done | Email confirmed, new password, email-link answer, feedback: check draws, shockwave, heading rises |

Fine details (13–30): rolling counts (spots, participants, results, tab counts, "x dabei"); bell swings and badge hops on new notifications, dot fades when read; unread dots shrink after reading; bookmark fills from the bottom; alert bell rings when switched on; capacity bar fills with a spring, "nur noch 2" lights up once; event date flips in; new pins drop, removed pins shrink; selected pin sends a ring; empty-state disc drops in; result cascade; new comment glides in with a lime glow, deleted one folds away; copy icon turns into a check; tab marker slides between tabs; a filter that turns on hops, "Zurücksetzen" slides in; answer buttons fill from the tap point; week cards in sequence; poster QR builds row by row with a scan line (screen only).

**Not used:** parallax, scroll-jacking, blur, cursor effects, endless decorative loops, animation libraries, vibration, and a shared-element morph from card to detail (needs React Router's data router; revisit later). 3D is limited to two one-off flips (date tile, invite ticket).

## 10. Stammspiel (weekly game) surfaces

The answer card (`components/series/AnswerCard.tsx`, `series.css`) is shared by the event page, the Stammspiel page (`/stammspiel/:id`, invite link `/s/:code`) and Home ("Deine Woche").

- **Status ribbon:** *Offen* (neutral, with deadline and countdown) → *Findet statt* (volt lime, ink text) or *Fällt aus* (danger soft, with the reason). One word decides; the reason follows.
- **Attendance meter:** a fill for "dabei" and a marker at the minimum. The fill turns green once the minimum is reached. Exposed as `role="meter"` with a full sentence as `aria-valuetext`.
- **Two answers, never three:** "Ich bin dabei" / "Diesmal nicht" side by side; the chosen one is filled (`aria-pressed`). No "vielleicht".
- **Roster** (members and hosts only): Dabei, Warteliste, Diesmal nicht, Noch keine Antwort. Your own chip is lime and reads "Du".
- **Waiting list everywhere:** a full single event offers "Auf die Warteliste" instead of a disabled button.
- **Weekday chips** show "Mo" and are named "Mo, Montag" (label in name, WCAG 2.5.3).

**Motion (state, never decoration)**

| Moment | Motion | Tokens |
|---|---|---|
| Answering | Your chip glides (FLIP) from its old row into the new one; the chosen button's icon pops | `--dur-4`, `--ease-spring`, `--scale-pop` |
| Minimum reached | The marker pops once | `m-pop`, `--dur-4` |
| Decided "on" | The lime ribbon sweeps in once from the left | `--dur-5`, `--ease-enter` |
| Decided "off" | The ribbon fades to the danger tone | `--dur-4`, `--ease-move` |
| Next week opens | The game card enters from the right (time runs left → right) | `--move-4`, `--dur-4` |
| Bell | The unread dot fades and scales in; it never shakes | `--dur-3`, `--ease-spring` |
| Email link answered | A check draws itself once | `--dur-5`/`--dur-6` stroke draw |

Under reduced motion the chip jumps, nothing travels or scales, and the ribbon and check just appear.

**More surfaces**
- **Pending spot** (`components/series/PendingSpot.tsx`): a warning-toned notice with a live countdown ("bitte bis 18:45 bestätigen") and two equal buttons, "Ich komme" / "Doch nicht". It enters with the spring once. While shown, the regular answer buttons are hidden, so there's one decision at a time.
- **Email link pages** never act on open: the game, the current answer and two buttons, with the email's choice as the primary one.
- **Welcome** (`/willkommen`): one card, two optional questions, "Weiter" plus a quiet "Überspringen".
- **Members list:** host actions are text buttons ("Co-Host", "Übergeben", red "Entfernen"), each behind a confirm dialog; blocked people are listed separately with "Sperre aufheben".
