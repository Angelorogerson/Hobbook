import { test, expect } from '@playwright/test'

test('mobile: list/map toggle and visible create button', async ({ page }) => {
  await page.goto('/entdecken')
  await expect(page.getByTestId('event-card').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Event erstellen' }).last()).toBeVisible()

  await page.getByRole('group', { name: 'Ansicht wählen' }).getByRole('button', { name: 'Karte' }).click()
  await expect(page.getByTestId('event-card').first()).toBeHidden()
  // Either the WebGL map or the honest fallback is shown — never a blank area.
  await expect(page.getByRole('region', { name: /Karte/ }).last()).toBeVisible()

  await page.getByRole('group', { name: 'Ansicht wählen' }).getByRole('button', { name: 'Liste' }).click()
  await expect(page.getByTestId('event-card').first()).toBeVisible()

  // No horizontal scrolling at phone width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
