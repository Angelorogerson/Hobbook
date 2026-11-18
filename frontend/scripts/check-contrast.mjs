/**
 * WCAG contrast check for Hobbook's colour tokens in both themes.
 *   node scripts/check-contrast.mjs            # prints a Markdown table, exits 1 on failure
 * Reads src/styles/tokens.css; only solid hex tokens are checked (alpha "soft"
 * backgrounds are composited over the theme surface first).
 */
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

function block(selector) {
  const i = css.indexOf(selector)
  const start = css.indexOf('{', i) + 1
  let depth = 1
  let j = start
  while (depth && j < css.length) {
    if (css[j] === '{') depth++
    if (css[j] === '}') depth--
    j++
  }
  return css.slice(start, j - 1)
}

function vars(text) {
  const out = {}
  for (const m of text.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const light = vars(block(':root {'))
const dark = { ...light, ...vars(block(":root[data-theme='dark']")) }

function parse(c) {
  c = c.trim()
  let m = c.match(/^#([0-9a-f]{6})$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1)
  m = c.match(/^rgba?\(([^)]+)\)$/i)
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x))
    return [p[0], p[1], p[2], p[3] ?? 1]
  }
  return null
}

const over = (fg, bg) => (fg[3] >= 1 ? fg : [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1))
const lum = ([r, g, b]) =>
  [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// [foreground, background, minimum, purpose]
const PAIRS = [
  ['c-text', 'c-bg', 4.5, 'body text on page'],
  ['c-text', 'c-surface', 4.5, 'body text on card'],
  ['c-text-muted', 'c-surface', 4.5, 'secondary text'],
  ['c-text-subtle', 'c-surface', 4.5, 'meta/hint text'],
  ['c-text-subtle', 'c-surface-2', 4.5, 'hint on panel'],
  ['c-on-accent', 'c-accent', 4.5, 'primary button label'],
  ['c-on-hl', 'c-hl', 4.5, 'highlight fill label'],
  ['c-on-hl', 'c-hl-hover', 4.5, 'highlight fill hover'],
  ['c-on-ink', 'c-ink', 4.5, 'ink button / selected chip'],
  ['c-text-muted', 'c-bg', 4.5, 'secondary text on page'],
  ['c-text-subtle', 'c-bg', 4.5, 'meta text on page'],
  ['c-on-accent', 'c-accent-hover', 4.5, 'primary button hover'],
  ['c-accent-text', 'c-surface', 4.5, 'accent text'],
  ['c-accent-text', 'c-accent-soft', 4.5, 'selected chip'],
  ['c-link', 'c-surface', 4.5, 'links'],
  ['c-success', 'c-success-soft', 4.5, 'badge open'],
  ['c-warning', 'c-warning-soft', 4.5, 'badge full'],
  ['c-danger', 'c-danger-soft', 4.5, 'badge cancelled / error'],
  ['c-danger', 'c-surface', 4.5, 'inline field error'],
  ['c-info', 'c-info-soft', 4.5, 'info badge'],
  ['c-text-muted', 'c-neutral-soft', 4.5, 'badge completed'],
  ['c-focus', 'c-surface', 3, 'focus ring (non-text)'],
  ['c-border-strong', 'c-surface', 3, 'input border (non-text)'],
  ['c-accent', 'c-surface', 3, 'accent UI (non-text)'],
  ['c-on-stage', 'c-stage', 4.5, 'landing stage text'],
  ['c-on-stage-muted', 'c-stage', 4.5, 'landing stage secondary text'],
  ['c-on-stage-muted', 'c-stage-2', 4.5, 'stage panel text'],
  ['c-on-stage-accent', 'c-stage-accent', 4.5, 'stage primary button'],
  ['c-stage-accent', 'c-stage', 3, 'stage accent UI (non-text)'],
  ['c-stage-field-border', 'c-stage', 3, 'stage field border (non-text)'],
]
const SPORTS = Object.keys(light).filter((k) => k.startsWith('sport-'))

let failed = 0
const rows = []
for (const [name, t] of [
  ['light', light],
  ['dark', dark],
]) {
  const check = (fgK, bgK, min, why) => {
    const bgBase = parse(t['c-surface'])
    const bg = over(parse(t[bgK]), bgBase)
    const fg = over(parse(t[fgK]), bg)
    const r = ratio(fg, bg)
    const ok = r >= min
    if (!ok) failed++
    rows.push(`| ${name} | \`--${fgK}\` on \`--${bgK}\` | ${why} | ${r.toFixed(2)} | ${min} | ${ok ? '✅' : '❌'} |`)
  }
  for (const [fg, bg, min, why] of PAIRS) check(fg, bg, min, why)
  for (const s of SPORTS) check(s, 'c-surface', 4.5, 'sport label text')
}

console.log('| Theme | Pair | Used for | Ratio | Min | |\n|---|---|---|---:|---:|---|')
console.log(rows.join('\n'))
console.log(failed ? `\n${failed} pair(s) below minimum.` : '\nAll pairs pass.')
process.exit(failed ? 1 : 0)
