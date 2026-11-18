import { test, expect, type Page } from '@playwright/test'
import { PLAYER, login } from './helpers'

const noHorizontalOverflow = async (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

test.describe('public landing page', () => {
  test('guests see the story with real events and clear actions', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Finde dein nächstes Spiel/i)
    // Real seeded events, rendered with the real event cards
    const live = page.getByRole('list', { name: 'Aktuelle Events' })
    await expect(live.getByTestId('event-card').first()).toBeVisible()
    await expect(live.getByRole('link', { name: 'Feierabend-Kick im Park' })).toBeVisible()
    // Every story section is present
    for (const name of [/Liste und Karte/i, /Alles Wichtige/i, /Mitmachen/i, /Starte deins/i, /Wo spielst du als Nächstes/i]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached()
    }
    expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0)
  })

  test('hero city search opens Discover filtered by that city', async ({ page }) => {
    await page.goto('/')
    const hero = page.getByRole('search').first()
    await hero.getByLabel('Wo willst du spielen?').fill('Berlin')
    await hero.getByRole('button', { name: 'Events in dieser Stadt suchen' }).click()
    await expect(page).toHaveURL(/\/entdecken\?stadt=Berlin/)
    // Discover is code-split: wait for it to replace the landing page
    await expect(page.getByRole('heading', { level: 1, name: /Sport-Events in Berlin/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Feierabend-Kick im Park' })).toBeVisible()
    await expect(page.getByText('Lauftreff am Main')).toHaveCount(0)
  })

  test('primary CTA and sport chips lead into the app', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('list', { name: 'Direkt zur Sportart' }).getByRole('link', { name: 'Laufen' }).click()
    await expect(page).toHaveURL(/\/entdecken\?sport=running/)
    await expect(page.getByRole('heading', { level: 1, name: /Laufen/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lauftreff am Main' })).toBeVisible()

    await page.goto('/')
    await page.getByRole('link', { name: 'Events entdecken' }).first().click()
    await expect(page).toHaveURL(/\/entdecken$/)
  })

  test('signed-in users get their personal start page instead of the landing page', async ({ page }) => {
    await page.goto('/login')
    await login(page, PLAYER)
    await expect(page.getByRole('heading', { name: 'Deine nächsten Events' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Events entdecken' }).first()).toBeVisible()
  })

  test('content is fully visible with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/')
    const h2 = page.getByRole('heading', { level: 2, name: /Starte deins/i })
    await h2.scrollIntoViewIfNeeded()
    await expect(h2).toBeVisible()
    const opacity = await h2.evaluate((el) => getComputedStyle(el).opacity)
    expect(opacity).toBe('1')
    await context.close()
  })

  for (const width of [390, 768, 1024, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await noHorizontalOverflow(page)).toBeLessThanOrEqual(0)
    })
  }
})
