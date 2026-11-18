// Cloudflare Worker in front of the static frontend (see wrangler.jsonc).
// Its only job: give shared links a rich preview. When /s/:code (Stammspiel
// invite), /stammspiel/:id or /events/:id is opened, it fetches public summary
// fields from the API and writes Open Graph tags into index.html, so a link
// pasted into WhatsApp shows "Basketball am Uni-Platz – jeden Do., 19:00" instead
// of a bare URL. Everything else is served as-is. If the API is slow (free
// hosting may be asleep), the page is served without the extra tags.
import sports from '../frontend/src/constants/sports.json'

const SPORT = Object.fromEntries(sports.map((s) => [s.key, s.label]))
const WEEKDAYS_SHORT = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const API_TIMEOUT_MS = 2500

const ROUTES = [
  { re: /^\/s\/([A-Za-z0-9]{6,12})\/?$/, api: (k) => `/groups/${k}`, kind: 'group' },
  { re: /^\/stammspiel\/([a-f0-9]{24})\/?$/i, api: (k) => `/groups/${k}`, kind: 'group' },
  { re: /^\/events\/([a-f0-9]{24})\/?$/i, api: (k) => `/events/${k}`, kind: 'event' },
]

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const when = (iso, tz) => {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: tz }).format(d)
  const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d)
  return `${day}, ${time} Uhr`
}

export function previewFor(kind, data) {
  if (kind === 'group') {
    const g = data.group
    const place = [g.location?.placeName, g.location?.city].filter(Boolean).join(', ')
    const next = g.upcoming
    const count = next ? ` · nächster Termin ${when(next.startAt, next.timezone)}: ${next.counts?.in ?? next.participantCount} von ${next.maxParticipants} dabei` : ''
    return {
      title: `${g.name} – jeden ${WEEKDAYS_SHORT[g.weekday]}., ${g.startTime} Uhr`,
      description: `${SPORT[g.sport] || 'Sport'} · ${place}${count}. Kostenlos mitspielen auf Hobbook.`,
    }
  }
  const e = data.event
  const place = [e.location?.placeName, e.location?.city].filter(Boolean).join(', ')
  return {
    title: e.title,
    description: `${SPORT[e.sport] || 'Sport'} · ${when(e.startAt, e.timezone)} · ${place} · ${e.participantCount} von ${e.maxParticipants} dabei. Kostenlos auf Hobbook.`,
  }
}

async function fetchSummary(env, path) {
  if (!env.API_URL) return null
  try {
    const res = await fetch(`${env.API_URL.replace(/\/$/, '')}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      cf: { cacheTtl: 300, cacheEverything: true },
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const page = await env.ASSETS.fetch(request)
    const route = ROUTES.map((r) => ({ ...r, m: url.pathname.match(r.re) })).find((r) => r.m)
    const isHtml = (page.headers.get('content-type') || '').includes('text/html')
    if (!route || !isHtml || request.method !== 'GET') return page

    const data = await fetchSummary(env, route.api(route.m[1]))
    if (!data) return page
    const { title, description } = previewFor(route.kind, data)
    const tags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="Hobbook" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:url" content="${esc(url.href)}" />`,
      `<meta property="og:locale" content="de_DE" />`,
      `<meta name="twitter:card" content="summary" />`,
    ].join('')

    return new HTMLRewriter()
      .on('title', { element: (el) => el.setInnerContent(`${title} · Hobbook`) })
      .on('meta[name="description"]', { element: (el) => el.setAttribute('content', description) })
      .on('head', { element: (el) => el.append(tags, { html: true }) })
      .transform(page)
  },
}
