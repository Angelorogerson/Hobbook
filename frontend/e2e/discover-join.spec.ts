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

  // Join requires login, then returns to the event and finishes the join
  await page.getByRole('button', { name: 'Anmelden & mitmachen' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText('Melde dich an, um bei diesem Event mitzumachen.')).toBeVisible()
  await login(page, PLAYER)
  await expect(page.getByRole('heading', { name: 'Feierabend-Kick im Park' })).toBeVisible()

  // The join the visitor asked for completes by itself after signing in
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

test('save an event and find it under "Gemerkt"', async ({ page }) => {
  await page.goto('/entdecken?stadt=Berlin')
  // Guests are asked to sign in, then land back on the list
  await page.getByRole('button', { name: 'Merken: Streetball 3 gegen 3' }).click()
  await expect(page.getByText('Melde dich an, um Events zu merken.')).toBeVisible()
  await login(page, PLAYER)
  await expect(page).toHaveURL(/stadt=Berlin/)

  const save = page.getByRole('button', { name: 'Merken: Streetball 3 gegen 3' })
  await save.click()
  await expect(save).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Gemerkt – du findest es/)).toBeVisible()

  await page.goto('/meine-events')
  await page.getByRole('tab', { name: /Gemerkt \(1\)/ }).click()
  await expect(page.getByRole('link', { name: 'Streetball 3 gegen 3' })).toBeVisible()

  // Removing the bookmark empties the tab again
  await page.getByRole('button', { name: 'Merken: Streetball 3 gegen 3' }).click()
  await expect(page.getByText('Du hast dir noch nichts gemerkt.')).toBeVisible()
})
