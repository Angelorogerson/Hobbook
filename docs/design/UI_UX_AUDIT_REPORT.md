# Hobbook UI/UX Audit & Redesign — Report (2026-11-16)

Branch `feature/free-sports-events`, not committed. System documentation: [../DESIGN.md](../DESIGN.md). Screenshots: `before-*.jpg` and `after-*.jpg` in this folder.

## 1. Executive summary
The app was functionally solid but visually generic and inconsistent. The main problems:
- **No design system:** 22 font sizes, about 40 raw hex colours, no spacing, motion or layer tokens.
- **Duplicate and dead components:** three chip implementations, four empty-state patterns, unused Bootstrap-era Button/Input/ErrorMessage/EmptyState.
- **No hierarchy and no sporty identity:** identical white cards, data (date, spots, status) shown as plain text.
- **No dark mode.**
- **Accessibility gaps:** sub-44px touch targets, sub-3:1 input borders, error messages not linked to fields.

The redesign introduces a token-based system with light and dark themes, a new identity ("athletic, calm, data-forward": ink navy + signal orange, Barlow Condensed display type, date tile, capacity meter, sport glyphs) and one component vocabulary. No business logic, API, routing or auth changes.

## 2. Audit findings
| Prio | Finding | Status |
|---|---|---|
| P1 | No tokens beyond colour; 22 font sizes; raw hex | Fixed: `styles/tokens.css` |
| P1 | Unused legacy components; triple chips; four empty states | Fixed: deleted / consolidated |
| P1 | Flat hierarchy; data shown as text; CSS-hack logo; 4px coloured border-left | Fixed: date tile, capacity meter, SVG mark, sport glyphs |
| P1 | Light only | Fixed: dark theme, system preference + toggle, themed map |
| P2 | Touch targets 26–36px (buttons, chips, markers, map controls, title links, skip link) | Fixed: 44px under `pointer: coarse` |
| P2 | Input borders 1.8:1 (WCAG 1.4.11) | Fixed: 3.5:1 both themes |
| P2 | Only spinners for loading | Fixed: skeleton cards with real geometry |
| P2 | Single 860px breakpoint; cramped tablet; unconstrained large desktop | Fixed: 640/860/1024/1440 rules |
| P2 | Errors only inline, focus not moved | Fixed: linked error summary + focus on first invalid field |
| P2 | Admin table scrolls sideways on phones | Fixed: labelled card rows under 640px |
| P3 | Unthemed browser surfaces, plain footer/legal, unstyled popups and geocode results | Fixed |

## 3. Skill usage
| Skill | Where | Why | Problem solved |
|---|---|---|---|
| **UI UX Pro Max** | Design-system search (`sports community events app map`, typography `sports athletic condensed`), priority checklist, dark-mode/contrast and focus rules | Data-backed candidates plus a UX priority order | Chose orange + blue roles and the Barlow Condensed pairing; 44px targets, labelled forms, ≤5-item bottom nav. **Rejected** its Hero-Centric pattern, Righteous/Poppins and scroll animations |
| **Taste** | Consistency checklist (one button pair, one card, one radius scale, one link look), hover lift 2px / press, copy rule "button = verb + object", no violet, no invented figures | Strongest anti-generic, one-system guidance | Consolidated the component vocabulary; subtle card and button feedback. **Rejected** its marketing-site rules (one section per screen, hero entrance, photo-led sections, gate scripts, "no coordinates") |
| **Impeccable** | Operate-mode rules (fixed rem scale, restrained accent, full state set, skeletons, 150–250ms motion), craft-floor bans, browser-surface theming, `document` → DESIGN.md, audit/polish pass | Best fit for app UI; primary authority on conflicts | Removed the border-left accent, avoided eyebrows, hero metrics and gradients; themed selection, caret, scrollbar and accent-color; wrote DESIGN.md. Its CLI binary wasn't used; the references were read directly |
| **Modern Web Design** | Skeleton pattern, motion and easing tokens, performance (transform/opacity only, no CLS), reduced-motion, atomic component structure | Implementation patterns | Skeleton loading, motion tokens. **Rejected** fluid type, 1.05/0.95 hover scales, glass, cursor effects, scrollytelling and animation libraries |
| **Sporty UI/UX (brief)** | Date tile, capacity meter, sport glyphs in cards and markers, condensed display type, signal-orange accent | Hobbook's identity | A sporty look from data and type, not neon or effects |

## 4. Implemented changes (frontend only)
- **New:**
  - `src/styles/{tokens,base,components}.css`
  - `src/store/ThemeContext.tsx`
  - `src/components/ui/{Brand,DataPieces,SportIcon}.tsx` + `DataPieces.css`
  - `src/components/events/FilterBar.css`
  - `src/pages/legal/legal.css`
  - `src/components/ui/ui.test.tsx`
  - `scripts/check-contrast.mjs`
  - `docs/DESIGN.md`, this report
- **Rewritten styles and markup:**
  - Layout: `index.css`, `App.css`, `App.tsx` (ThemeProvider, 404 empty state), `components/layout/{Navbar,Footer}`.
  - Events: `components/events/{EventCard,FilterBar}`.
  - Map: `components/map/{mapSetup,EventMap,LocationPicker}` (+ CSS).
  - Common: `components/common/{Modal,LoadingSpinner}`.
  - Pages: `pages/events/*` (Discover, Detail, Form, My Events), `pages/main/ProfilePage` (appearance section), `pages/auth/*`, `pages/admin/*`, `pages/legal/LegalPages`.
- **Other changes:**
  - `index.html`: theme resolved before first paint; `color-scheme`; `theme-color`.
  - `public/favicon.svg`: new mark.
  - `main.tsx`: Barlow Condensed via @fontsource.
- **Deleted:** `components/common/{Button,Input,ErrorMessage,EmptyState}` (+ CSS), which were unused.
- **Tooling:**
  - `playwright.config.ts`: E2E web port 5190.
  - `.claude/launch.json` + `frontend/.env.demo`: demo on 5055/5180, because your own backend already uses port 5000.
  - `backend/scripts/e2e-server.js`: added the demo origin to CORS.

## 5. Design system
See [DESIGN.md](../DESIGN.md):
- Semantic colour roles for light and dark, plus 12 sport data colours per theme.
- Fixed type scale with a UI and a display face.
- 4px spacing grid; radius, elevation, layer and motion tokens.
- 44px control height.
- One component vocabulary with full states.
- Breakpoint rules and a list of rejected patterns.

## 6. Responsive improvements
- **375:** bottom nav with an orange create button, list/map toggle above it, bottom-sheet modals, full-width form actions above the nav, admin rows as cards.
- **768–1024:** proper tablet split (340px list), filter selects stacked, detail side column 320px.
- **1440+:** 480px list column; content max width 1200 and forms 760.
- Verified no horizontal overflow (`scrollWidth == innerWidth`) at 375, 768 and 1920 on Discover, Form and Profile.

## 7. Accessibility improvements
- AA contrast for every text pair and ≥3:1 for control boundaries, focus ring and accent UI in **both** themes: 50 pairs, generated table in DESIGN.md, `npm run check:contrast`.
- 44px touch targets under coarse pointers, measured: no remaining interactive element below 44px on Discover; radios have 44px label rows.
- One visible focus style; skip link enlarged.
- Linked error summary, and focus moves to the first invalid field.
- `role=meter` with value text for capacity; status always written out; decorative icons `aria-hidden`.
- Spinner and loading states announced (`role=status`); theme toggle labelled with current and next state; theme choice exposed as a radiogroup.

## 8. Remaining issues
- **JS bundle 1.1 MB (318 kB gzip), mostly MapLibre:** lazy-load the map chunk on Discover and Detail.
- **Map style fetches** come from OpenFreeMap at runtime. Self-hosting styles and tiles would remove the dependency.
- **Screen readers:** not tested with a real screen reader (NVDA/VoiceOver); keyboard paths were checked only via roles and labels.
- **Browser screenshots** in this environment were unreliable when the app window was hidden. The visual review relied on DOM measurements plus the captured shots; a final human look at both themes is advised.
- **Native date/time pickers** stay native (correct for mobile); their popups follow the OS theme.
- **Legacy files** in `src/legacy/` still need deleting (see LEGACY_CLEANUP.md).

## 9. Regression check
| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 errors |
| `npm run lint` | 0 errors, 0 warnings |
| `npm test` (frontend) | 27/27 (21 existing + 6 new: meter, date tile, theme) |
| `npm run build` | OK |
| `npm run check:contrast` | all pairs pass |
| Backend `npm test` | 45/45 (unchanged) |
| `PW_CHANNEL=msedge npm run e2e` | 5/5: Discover → Detail → Join (login return), full event, Create → Edit → Cancel, ownership guard, mobile list/map |
| Manual (built-in browser) | Light/dark switch and persistence, dark map (fiord) with 3D, list↔map selection, login redirect, form validation and focus, profile theme radios, tap-target measurement |

## 10. Final assessment (before → after, 1–5)
| Dimension | Before | After | Note |
|---|---:|---:|---|
| UI | 2.5 | 4 | Clear hierarchy; data shown visually |
| UX | 3 | 4 | Skeletons, error summary, focus management, bottom sheets |
| Consistency | 2 | 4.5 | One token set and one vocabulary |
| Modernity | 2.5 | 4 | Restrained and current, no trend gimmicks |
| Responsiveness | 3 | 4 | Tablet and large-desktop layouts added |
| Accessibility | 2.5 | 4 | Measured contrast and targets; screen-reader test pending |
| Professionalism | 2.5 | 4 | Brand mark, themed details |
| Sporty identity | 1.5 | 4 | Condensed type, date tile, capacity meter, sport glyphs, signal accent |

These ratings are my own judgement, not user-tested. The next step should be a short usability test with 3–5 players on phones, outdoors, in both themes.
