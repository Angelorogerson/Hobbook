import { test, expect, type APIRequestContext } from '@playwright/test'
import { ORGANIZER, PLAYER, login, loginFromStart, stubGeocoding } from './helpers'

const API = `http://127.0.0.1:${process.env.E2E_API_PORT || 5055}`
const JOB_SECRET = 'e2e-job-secret' // test-only value set in backend/scripts/e2e-server.js
const WEEKDAYS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

const runJobs = (request: APIRequestContext, now?: string) =>
  request.post(`${API}/api/jobs/run`, { headers: { 'x-job-secret': JOB_SECRET }, data: now ? { now } : {} })

test('Stammspiel: create once → invite link → answer (app and email) → decided by itself', async ({ page, browser, request }) => {
  // ── Organizer creates the weekly game with the same form ──
  await stubGeocoding(page)
  await loginFromStart(page, ORGANIZER)
  await page.goto('/events/neu?woche=1')
  await expect(page.getByRole('heading', { name: 'Stammspiel anlegen' })).toBeVisible()

  const inTwoDays = new Date(Date.now() + 2 * 24 * 3600 * 1000)
  const wd = new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: 'Europe/Berlin' }).format(inTwoDays)
  expect(WEEKDAYS).toContain(wd)

  await page.getByRole('radio', { name: 'Basketball' }).check({ force: true })
  await page.getByRole('button', { name: `${wd.slice(0, 2)}, ${wd}`, exact: true }).click()
  await page.getByLabel('Beginn *', { exact: true }).fill('19:00')
  await page.getByLabel('Ende *', { exact: true }).fill('21:00')
  await page.getByLabel('Ort suchen').fill('Tempelhofer Feld')
  await page.getByRole('button', { name: 'Suchen' }).click()
  await page.getByRole('list', { name: 'Suchergebnisse' }).getByRole('button').first().click()
  await page.getByLabel('Name des Stammspiels *', { exact: true }).fill('Korb am Feld')
  await page.getByLabel('Maximale Teilnehmende *', { exact: true }).fill('4')
  await page.getByLabel('Findet statt ab *', { exact: true }).fill('2')
  await expect(page.getByText(`Jeden ${wd}, 19:00–21:00 Uhr · ab 2 Zusagen findet's statt`)).toBeVisible()
  await page.getByRole('button', { name: 'Stammspiel starten' }).click()

  // ── Invite step: one link for the WhatsApp group ──
  await expect(page.getByRole('heading', { name: /Dein Stammspiel läuft/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'In WhatsApp teilen' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
  const invite = (await page.locator('.invite-link').textContent())!.trim()
  expect(invite).toMatch(/\/s\/[A-Za-z0-9]{8}$/)
  await expect(page.getByText('Offen', { exact: true })).toBeVisible()

  // ── A player opens the link, signs in, joins and answers ──
  const playerCtx = await browser.newContext()
  const player = await playerCtx.newPage()
  await player.goto(new URL(invite).pathname)
  await expect(player.getByRole('heading', { name: 'Korb am Feld' })).toBeVisible()
  await player.getByRole('button', { name: 'Anmelden & mitmachen' }).click()
  await expect(player.getByText(/um beim Stammspiel mitzumachen/)).toBeVisible()
  await login(player, PLAYER)
  await expect(player.getByRole('heading', { name: 'Korb am Feld' })).toBeVisible()
  await expect(player.getByText('Willkommen! Du bist jetzt beim Stammspiel.')).toBeVisible()
  await player.getByRole('button', { name: 'Ich bin dabei' }).click()
  await expect(player.getByRole('button', { name: 'Ich bin dabei' })).toHaveAttribute('aria-pressed', 'true')
  await expect(player.getByText(/Minimum erreicht/)).toBeVisible()
  await expect(player.getByRole('region', { name: /^Dabei: 2/ })).toContainText('Du')

  // ── Jobs: invites go out by email with one-tap links ──
  expect((await runJobs(request)).ok()).toBe(true)
  const outbox = await (await request.get(`${API}/__e2e/outbox`)).json()
  const mail = outbox.messages.find((m: { to: string; subject: string }) => m.to === PLAYER.email && m.subject.includes('Korb am Feld'))
  expect(mail).toBeTruthy()
  const outLink = mail.text.match(/Diesmal nicht: (\S+)/)[1]

  // The email link works without signing in, and can be undone.
  const anon = await browser.newContext()
  const tap = await anon.newPage()
  await tap.goto(new URL(outLink).pathname)
  // Opening the link changes nothing (email scanners open links too) …
  await expect(tap.getByRole('heading', { name: /bist du dabei\?/ })).toBeVisible()
  await expect(tap.getByText(/bisher: Du bist dabei/)).toBeVisible()
  // … only a tap answers.
  await tap.getByRole('button', { name: 'Diesmal nicht' }).click()
  await expect(tap.getByRole('heading', { name: 'Alles klar, diesmal nicht.' })).toBeVisible()
  await tap.getByRole('button', { name: 'Doch dabei' }).click()
  await expect(tap.getByRole('heading', { name: 'Du bist dabei!' })).toBeVisible()

  // ── At the deadline Hobbook decides by itself; everyone sees it ──
  const code = new URL(invite).pathname.split('/').pop()
  const group = await (await request.get(`${API}/api/groups/${code}`)).json()
  const deadline = new Date(group.group.upcoming.deadlineAt).getTime()
  const decided = await (await runJobs(request, new Date(deadline + 60_000).toISOString())).json()
  // (The seeded demo Stammspiel may be decided in the same run.)
  expect(decided.decided).toBeGreaterThanOrEqual(1)

  await player.reload()
  await expect(player.getByText('Findet statt', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Findet statt', { exact: true })).toBeVisible()

  // The bell shows the decision for the player.
  await player.goto('/benachrichtigungen')
  await expect(player.getByText('Korb am Feld findet statt ✓')).toBeVisible()

  await playerCtx.close()
  await anon.close()
})
