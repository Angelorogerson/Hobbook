import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ORGANIZER, loginFromStart } from './helpers'

/**
 * Automated WCAG 2.1 A/AA checks on the main pages. Automated tools find only
 * part of all accessibility problems; keyboard and screen-reader checks stay manual.
 * The WebGL map canvas is third-party and has a list alternative, so it is excluded.
 */
async function seriousViolations(page: Page) {
  // Measure the settled page: wait until every finite animation (page fade,
  // entrances) has finished. Endless loaders are ignored.
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getTiming().iterations !== Infinity)
      .every((a) => a.playState !== 'running')
  )
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.maplibregl-map')
    .analyze()
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(' ')} — ${n.any[0]?.message || v.help}`))
}

test.describe('accessibility', () => {
  // Audit the reduced-motion experience (it must be complete on its own).
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('discover', async ({ page }) => {
    await page.goto('/entdecken')
    await expect(page.getByTestId('event-card').first()).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('event detail', async ({ page }) => {
    await page.goto('/entdecken')
    await page.getByRole('link', { name: 'Feierabend-Kick im Park' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Feierabend-Kick im Park' })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('sign-up and login forms', async ({ page }) => {
    await page.goto('/registrieren')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Include the error state: submit the empty form first.
    await page.getByRole('button', { name: 'Registrieren' }).click()
    await expect(page.getByText(/mindestens 16 Jahre alt bist/)).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
    await page.goto('/login')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })

  test('create event form', async ({ page }) => {
    await loginFromStart(page, ORGANIZER)
    await page.goto('/events/neu')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await seriousViolations(page)).toEqual([])
  })
})
