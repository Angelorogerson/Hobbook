import { test, expect } from '@playwright/test'
import { ORGANIZER, PLAYER, loginFromStart } from './helpers'

// The seeded demo Stammspiel (backend/scripts/seed.js): invite code "uniplatz",
// organized by ORGANIZER, PLAYER is a member.

test('a newcomer signs up from an invite link, answers two quick questions and is in', async ({ page }) => {
  await page.goto('/s/uniplatz')
  await expect(page.getByRole('heading', { name: 'Basketball am Uni-Platz' })).toBeVisible()
  await page.getByRole('button', { name: 'Anmelden & mitmachen' }).click()
  await page.getByRole('link', { name: 'Kostenlos registrieren' }).click()

  // Throwaway test account in the in-memory E2E database.
  const email = `neu-${Date.now()}@hobbook.test`
  await page.getByLabel('Name', { exact: true }).fill('Nora Neu')
  await page.getByLabel('E-Mail').fill(email)
  await page.getByLabel('Passwort', { exact: true }).fill('test-password-9')
  await page.getByLabel('Passwort wiederholen').fill('test-password-9')
  await page.getByLabel(/mindestens 16 Jahre/).check()
  await page.getByRole('button', { name: 'Registrieren' }).click()

  // Welcome step, prefilled from the Stammspiel
  await expect(page.getByRole('heading', { name: 'Willkommen, Nora!' })).toBeVisible()
  await expect(page.getByLabel('Wo spielst du?')).toHaveValue('Kaiserslautern')
  await expect(page.getByRole('checkbox', { name: /Basketball/ })).toBeChecked()
  await page.getByRole('button', { name: /Weiter/ }).click()

  // Back on the Stammspiel, and the join finished by itself
  await expect(page.getByRole('heading', { name: 'Basketball am Uni-Platz' })).toBeVisible()
  await expect(page.getByText('Willkommen! Du bist jetzt beim Stammspiel.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ich bin dabei' })).toBeVisible()
})

test('a host removes and blocks a member, who then cannot rejoin', async ({ page, browser }) => {
  await loginFromStart(page, ORGANIZER)
  await page.goto('/s/uniplatz')
  await page.getByRole('button', { name: 'Paul S. entfernen' }).click()
  await page.getByLabel(/Auch sperren/).check()
  await page.getByRole('button', { name: 'Entfernen und sperren' }).click()
  await expect(page.getByText('Entfernt und gesperrt')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Gesperrt/ })).toBeVisible()

  const ctx = await browser.newContext()
  const player = await ctx.newPage()
  await loginFromStart(player, PLAYER)
  await player.goto('/s/uniplatz')
  await expect(player.getByText('Du kannst diesem Stammspiel nicht beitreten.')).toBeVisible()
  await expect(player.getByRole('button', { name: /mitmachen/i })).toHaveCount(0)
  await ctx.close()

  // Lifting the block works too.
  await page.getByRole('button', { name: 'Sperre aufheben' }).click()
  await expect(page.getByText('Sperre aufgehoben')).toBeVisible()
})
