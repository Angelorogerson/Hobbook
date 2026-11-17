import { test, expect } from '@playwright/test'
import { ORGANIZER, PLAYER, loginFromStart, stubGeocoding } from './helpers'

test('Create → visible in discovery → Edit → Cancel', async ({ page }) => {
  await stubGeocoding(page)
  await loginFromStart(page, ORGANIZER)

  await page.getByRole('link', { name: 'Event erstellen' }).first().click()
  await expect(page.getByRole('heading', { name: 'Event erstellen' })).toBeVisible()

  // Inline validation before anything is sent
  await page.getByRole('button', { name: 'Vorschau ansehen' }).click()
  await expect(page.getByText('Bitte prüfe die markierten Felder.')).toBeVisible()
  await expect(page.getByText('Bitte wähle eine Sportart')).toBeVisible()

  const date = new Date(Date.now() + 3 * 24 * 3600 * 1000)
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  await page.getByLabel('Sportart *', { exact: true }).selectOption('frisbee')
  await page.getByLabel('Titel *', { exact: true }).fill('Ultimate am Tempelhofer Feld')
  await page.getByLabel('Beschreibung').fill('Discs sind da.')
  await page.getByLabel('Datum *', { exact: true }).fill(ymd)
  await page.getByLabel('Beginn *', { exact: true }).fill('17:00')
  await page.getByLabel('Ende *', { exact: true }).fill('19:00')
  await page.getByLabel('Ort suchen').fill('Tempelhofer Feld')
  await page.getByRole('button', { name: 'Suchen' }).click()
  await page.getByRole('list', { name: 'Suchergebnisse' }).getByRole('button').first().click()
  await expect(page.getByText(/Pin gesetzt/)).toBeVisible()
  await expect(page.getByLabel('Stadt *', { exact: true })).toHaveValue('Berlin')
  await page.getByLabel('Maximale Teilnehmende *', { exact: true }).fill('14')

  await page.getByRole('button', { name: 'Vorschau ansehen' }).click()
  await expect(page.getByRole('heading', { name: 'Vorschau' })).toBeVisible()
  await page.getByRole('button', { name: 'Veröffentlichen' }).click()

  await expect(page.getByRole('heading', { name: 'Ultimate am Tempelhofer Feld' })).toBeVisible()
  await expect(page.getByText('1 von 14')).toBeVisible()
  const detailUrl = page.url()

  // Appears in discovery (one result set feeds list and map)
  await page.goto('/entdecken?stadt=Berlin&sport=frisbee')
  await expect(page.getByRole('link', { name: 'Ultimate am Tempelhofer Feld' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^1 Event$/ })).toBeVisible()

  // Edit
  await page.goto(detailUrl)
  await page.getByRole('link', { name: 'Bearbeiten' }).click()
  await expect(page.getByRole('heading', { name: 'Event bearbeiten' })).toBeVisible()
  await page.getByLabel('Titel *', { exact: true }).fill('Ultimate Frisbee am Feld')
  await page.getByRole('button', { name: 'Vorschau ansehen' }).click()
  await page.getByRole('button', { name: 'Änderungen speichern' }).click()
  await expect(page.getByRole('heading', { name: 'Ultimate Frisbee am Feld' })).toBeVisible()

  // Cancel with reason: stays visible as cancelled
  await page.getByRole('button', { name: 'Absagen' }).click()
  await page.getByLabel(/Grund/).fill('Sturmwarnung')
  await page.getByRole('button', { name: 'Event absagen' }).click()
  await expect(page.getByText('Dieses Event wurde abgesagt.')).toBeVisible()
  await expect(page.getByText('Grund: Sturmwarnung')).toBeVisible()

  // No longer in default discovery
  await page.goto('/entdecken?stadt=Berlin&sport=frisbee')
  await expect(page.getByText('Hier ist noch nichts los.')).toBeVisible()
})

test('other users cannot edit an event they do not organize', async ({ page }) => {
  await loginFromStart(page, PLAYER)
  await page.goto('/entdecken?stadt=Frankfurt')
  await page.getByRole('link', { name: 'Lauftreff am Main' }).click()
  await expect(page.getByRole('heading', { name: 'Lauftreff am Main' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bearbeiten' })).toHaveCount(0)
  await page.goto(page.url() + '/bearbeiten')
  await expect(page.getByText('Nur der Organisator darf dieses Event bearbeiten.')).toBeVisible()
})
