import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ORGANIZER, PLAYER, login, loginFromStart } from './helpers'

/**
 * The ten features added together: account recovery, email confirmation,
 * calendar subscription, data export, questions on events, poster, search
 * alerts, Discover filters, hosting again and feedback.
 * Emails are read from the E2E server's in-memory outbox (test-only route).
 */
const API = 'http://localhost:5055'
const ADMIN = { email: 'admin@hobbook.test', password: 'test-password-3' }

async function mailTo(request: APIRequestContext, to: string, pattern: RegExp): Promise<string> {
  let found: string | undefined
  await expect
    .poll(async () => {
      const { messages } = await (await request.get(`${API}/__e2e/outbox`)).json()
      const hit = [...messages].reverse().find((m: { to: string; text: string }) => m.to === to && pattern.test(m.text))
      found = hit?.text.match(pattern)?.[1]
      return !!found
    })
    .toBe(true)
  return new URL(found!).pathname
}

async function register(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API}/api/auth/register`, {
    data: { name: 'Rita Reset', email, password, ageConfirmed: true },
  })
  expect(res.status()).toBe(201)
}

async function serious(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .every((a) => a.playState !== 'running')
  )
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} — ${n.any[0]?.message || v.help}`))
}

async function openEvent(page: Page, title: string) {
  await page.goto('/entdecken')
  await page.getByRole('link', { name: title }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('forgotten password: email link sets a new password and signs in', async ({ page, request }) => {
  const email = `reset-${Date.now()}@hobbook.test`
  await register(request, email, 'first-password-1')

  await page.goto('/login')
  await page.getByRole('link', { name: 'Passwort vergessen?' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Passwort vergessen?' })).toBeVisible()
  expect(await serious(page)).toEqual([])
  await page.getByLabel('E-Mail').fill(email)
  await page.getByRole('button', { name: 'Link senden' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Schau in dein Postfach' })).toBeVisible()

  await page.goto(await mailTo(request, email, /Neues Passwort festlegen: (\S+)/))
  await expect(page.getByRole('heading', { level: 1, name: 'Neues Passwort' })).toBeVisible()
  expect(await serious(page)).toEqual([])
  await page.getByLabel('Neues Passwort', { exact: true }).fill('second-password-2')
  await page.getByLabel('Passwort wiederholen').fill('second-password-2')
  await page.getByRole('button', { name: 'Passwort speichern' }).click()
  // Signed in and on the personal start page
  await expect(page.getByRole('heading', { name: 'Deine nächsten Events' })).toBeVisible()

  const oldLogin = await request.post(`${API}/api/auth/login`, { data: { email, password: 'first-password-1' } })
  expect(oldLogin.status()).toBe(401)
  const newLogin = await request.post(`${API}/api/auth/login`, { data: { email, password: 'second-password-2' } })
  expect(newLogin.status()).toBe(200)
})

test('email confirmation link from the sign-up email', async ({ page, request }) => {
  const email = `verify-${Date.now()}@hobbook.test`
  await register(request, email, 'verify-password-1')
  await page.goto(await mailTo(request, email, /E-Mail-Adresse bestätigen: (\S+)/))
  await expect(page.getByRole('heading', { level: 1, name: 'Bestätigt' })).toBeVisible()
  const me = await request.post(`${API}/api/auth/login`, { data: { email, password: 'verify-password-1' } })
  expect((await me.json()).user.emailVerified).toBe(true)
})

test('feedback from a guest reaches the admin inbox', async ({ page }) => {
  const text = `Die Karte lädt bei mir langsam (${Date.now()})`
  await page.goto('/ueber')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Feedback' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Feedback geben' })).toBeVisible()
  expect(await serious(page)).toEqual([])
  await page.getByText('Problem', { exact: true }).click()
  await page.getByLabel('Deine Nachricht').fill(text)
  await page.getByRole('button', { name: 'Senden' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Danke!' })).toBeVisible()

  await page.goto('/login')
  await login(page, ADMIN)
  await expect(page.getByRole('heading', { name: 'Deine nächsten Events' })).toBeVisible()
  await page.goto('/admin/feedback')
  const entry = page.getByText(text)
  await expect(entry).toBeVisible()
  // The page the person came from is recorded, and no email address is shown.
  await expect(page.getByText('/ueber').first()).toBeVisible()
  await expect(page.getByText('@hobbook.test')).toHaveCount(0)
  expect(await serious(page)).toEqual([])
})

test('question on an event, and the organizer answers everyone', async ({ page, browser }) => {
  const question = `Gibt es Leibchen? (${Date.now()})`
  await loginFromStart(page, PLAYER)
  await openEvent(page, 'Feierabend-Kick im Park')
  await expect(page.getByRole('heading', { name: 'Fragen & Infos' })).toBeVisible()
  await page.getByLabel('Deine Frage oder Nachricht').fill(question)
  await page.getByRole('button', { name: 'Senden' }).click()
  await expect(page.getByText(question)).toBeVisible()
  // Only hosts can write to everyone
  await expect(page.getByLabel('An alle Teilnehmenden senden')).toHaveCount(0)
  expect(await serious(page)).toEqual([])

  const hostContext = await browser.newContext()
  const host = await hostContext.newPage()
  await loginFromStart(host, ORGANIZER)
  await openEvent(host, 'Feierabend-Kick im Park')
  await expect(host.getByText(question)).toBeVisible()
  const answer = `Ja, bringe ich mit. (${Date.now()})`
  await host.getByLabel('Deine Nachricht').fill(answer)
  await host.getByLabel('An alle Teilnehmenden senden').check()
  await host.getByRole('button', { name: 'Senden' }).click()
  await expect(host.getByText(answer)).toBeVisible()
  await expect(host.getByText('Info vom Organisator').first()).toBeVisible()
  await hostContext.close()

  // The person who asked is told in the app.
  await page.goto('/benachrichtigungen')
  await expect(page.getByText(/Antwort zu „Feierabend-Kick im Park“/).first()).toBeVisible()
})

test('Discover: text search, level filter and the alert offer for an empty city', async ({ page }) => {
  await page.goto('/entdecken')
  await expect(page.getByTestId('event-card').first()).toBeVisible()
  await page.getByLabel('Titel oder Platz').fill('streetball')
  await page.getByLabel('Titel oder Platz').press('Enter')
  await expect(page).toHaveURL(/suche=streetball/)
  await expect(page.getByRole('link', { name: 'Streetball 3 gegen 3' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Feierabend-Kick im Park' })).toHaveCount(0)

  // Level: the seeded running event is for beginners; "advanced" keeps only events open to all levels or advanced.
  await page.goto('/entdecken?niveau=beginner')
  await expect(page.getByRole('link', { name: 'Lauftreff am Main' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Streetball 3 gegen 3' })).toHaveCount(0)

  await page.goto('/entdecken?stadt=Kaiserslautern')
  await expect(page.getByRole('button', { name: /Sag mir Bescheid bei neuen Events in Kaiserslautern/ }).first()).toBeVisible()
  expect(await serious(page)).toEqual([])
})

test('search alert: saved from an empty search, then a new event there notifies', async ({ page, request }) => {
  await loginFromStart(page, PLAYER)
  await page.goto('/entdecken?stadt=Saarbr%C3%BCcken')
  await page.getByRole('button', { name: /Sag mir Bescheid bei neuen Events in Saarbrücken/ }).first().click()
  await expect(page.getByRole('button', { name: /Alarm aktiv/ }).first()).toBeVisible()

  // Someone else publishes an event in that city.
  const session = await (await request.post(`${API}/api/auth/login`, { data: ORGANIZER })).json()
  const start = new Date(Date.now() + 3 * 24 * 3600 * 1000)
  const created = await request.post(`${API}/api/events`, {
    headers: { Authorization: `Bearer ${session.token}` },
    data: {
      title: 'Kick an der Saar',
      sport: 'football',
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 2 * 3600 * 1000).toISOString(),
      maxParticipants: 10,
      location: { placeName: 'Saarwiesen', address: 'Saarwiesen 1, 66111 Saarbrücken', city: 'Saarbrücken', countryCode: 'DE', lat: 49.234, lng: 6.996 },
    },
  })
  expect(created.status()).toBe(201)

  await expect(async () => {
    await page.goto('/benachrichtigungen')
    await expect(page.getByText('Neu in Saarbrücken: Kick an der Saar')).toBeVisible({ timeout: 2000 })
  }).toPass({ timeout: 15000 })

  // Managed in the profile
  await page.goto('/profil')
  await expect(page.getByRole('list', { name: 'Deine Such-Alarme' }).getByText(/Saarbrücken/)).toBeVisible()
})

test('poster with QR code for an event', async ({ page }) => {
  await loginFromStart(page, ORGANIZER)
  await openEvent(page, 'Feierabend-Kick im Park')
  const eventPath = new URL(page.url()).pathname
  await page.getByRole('link', { name: 'Aushang drucken' }).click()
  await expect(page).toHaveURL(new RegExp(`${eventPath}/aushang$`))
  await expect(page.getByRole('heading', { level: 1, name: 'Feierabend-Kick im Park' })).toBeVisible()
  await expect(page.getByText('Bolzplatz Volkspark').first()).toBeVisible()
  const qr = page.locator('svg.poster-qr')
  await expect(qr).toBeVisible()
  expect(await qr.locator('rect, path').count()).toBeGreaterThan(1)
  await expect(page.getByRole('button', { name: 'Drucken' })).toBeVisible()
  // No app navigation around the poster
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toHaveCount(0)
  expect(await serious(page)).toEqual([])
  // Fits a phone screen without sideways scrolling
  await page.setViewportSize({ width: 360, height: 760 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})

test('host again: the create form opens as a copy', async ({ page }) => {
  await loginFromStart(page, ORGANIZER)
  await openEvent(page, 'Streetball 3 gegen 3')
  await page.getByRole('link', { name: 'Nochmal veranstalten' }).click()
  await expect(page).toHaveURL(/\/events\/neu\?kopie=/)
  await expect(page.getByText('Kopie von „Streetball 3 gegen 3“')).toBeVisible()
  await expect(page.getByText('Zuletzt genutzt:')).toBeVisible()
})

test('profile: calendar subscription and data download', async ({ page, request }) => {
  await loginFromStart(page, PLAYER)
  await page.goto('/profil')
  await expect(page.getByRole('heading', { name: 'Kalender-Abo' })).toBeVisible()
  await page.getByRole('button', { name: 'Kalender-Link anzeigen' }).click()
  const field = page.getByLabel('Dein Kalender-Link')
  await expect(field).toHaveValue(/\/api\/calendar\/feed\/.+\.ics$/)
  const feed = await request.get(await field.inputValue())
  expect(feed.status()).toBe(200)
  expect(feed.headers()['content-type']).toContain('text/calendar')
  const ics = await feed.text()
  expect(ics).toContain('BEGIN:VCALENDAR')
  // The seeded player is in the Munich volleyball game.
  expect(ics).toContain('Volleyball am Isarstrand')

  // The export arrives as a file. A real browser download leaves this Edge channel unable to
  // close its context cleanly, so the file hand-over is recorded instead of written to disk.
  await page.evaluate(() => {
    HTMLAnchorElement.prototype.click = function recordDownload(this: HTMLAnchorElement) {
      ;(window as unknown as { __savedAs?: string }).__savedAs = this.download
    }
  })
  const [exported] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/users/me/export')),
    page.getByRole('button', { name: 'Daten herunterladen' }).click(),
  ])
  expect(exported.status()).toBe(200)
  const data = await exported.json()
  expect(data.account.email).toBe(PLAYER.email)
  expect(JSON.stringify(data)).not.toContain('organizer@hobbook.test')
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __savedAs?: string }).__savedAs))
    .toMatch(/^hobbook-daten-\d{4}-\d{2}-\d{2}\.json$/)
  expect(await serious(page)).toEqual([])
})
