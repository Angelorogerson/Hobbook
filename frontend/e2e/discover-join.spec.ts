import { test, expect } from '@playwright/test'
import { PLAYER, login } from './helpers'

test('Discover → Detail → Join (sign in only when joining)', async ({ page }) => {
  await page.goto('/entdecken')
  // Public discovery without login
  await expect(page.getByRole('heading', { name: /Sport-Events/ })).toBeVisible()
  const cards = page.getByTestId('event-card')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThanOrEqual(3)

  // Filter by city: only Berlin events remain
  await page.getByLabel('Stadt oder Gebiet').fill('Berlin')
  await page.getByRole('button', { name: 'Stadt suchen' }).click()
  await expect(page).toHaveURL(/stadt=Berlin/)
  await expect(page.getByText('Lauftreff am Main')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Feierabend-Kick im Park' })).toBeVisible()

  // Detail
  await page.getByRole('link', { name: 'Feierabend-Kick im Park' }).click()
  await expect(page.getByRole('heading', { name: 'Feierabend-Kick im Park' })).toBeVisible()
  await expect(page.getByText('Bolzplatz Volkspark')).toBeVisible()
  await expect(page.getByText('1 von 10')).toBeVisible()

  // Join requires login, then returns to the event
  await page.getByRole('button', { name: 'Anmelden & mitmachen' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Melde dich an, um bei diesem Event mitzumachen.')).toBeVisible()
  await login(page, PLAYER)
  await expect(page.getByRole('heading', { name: 'Feierabend-Kick im Park' })).toBeVisible()

  await page.getByRole('button', { name: 'Mitmachen' }).click()
  await expect(page.getByText('Du bist dabei!')).toBeVisible()
  await expect(page.getByText('2 von 10')).toBeVisible()

  // Appears in My Events, then leave again
  await page.getByRole('link', { name: 'Meine Events' }).first().click()
  await page.getByRole('tab', { name: /Dabei/ }).click()
  await expect(page.getByRole('link', { name: 'Feierabend-Kick im Park' })).toBeVisible()
  await page.getByRole('listitem').filter({ hasText: 'Feierabend-Kick im Park' }).getByRole('button', { name: 'Austreten' }).click()
  await expect(page.getByText(/ausgetreten/)).toBeVisible()
})

test('full events cannot be joined', async ({ page }) => {
  await page.goto('/entdecken?stadt=M%C3%BCnchen')
  await page.getByRole('link', { name: 'Volleyball am Isarstrand' }).click()
  await expect(page.getByRole('button', { name: 'Event ist voll' })).toBeDisabled()
})
