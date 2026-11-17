import { expect, type Page } from '@playwright/test'

// Throwaway test accounts seeded into the in-memory E2E database (backend/scripts/seed.js).
export const ORGANIZER = { email: 'organizer@hobbook.test', password: 'test-password-1' }
export const PLAYER = { email: 'player@hobbook.test', password: 'test-password-2' }

export async function login(page: Page, who: { email: string; password: string }) {
  await page.getByLabel('E-Mail').fill(who.email)
  await page.getByLabel('Passwort').fill(who.password)
  await page.getByRole('button', { name: 'Anmelden' }).click()
}

export async function loginFromStart(page: Page, who: { email: string; password: string }) {
  await page.goto('/login')
  await login(page, who)
  // '/' sends signed-in users straight into the app
  await expect(page).toHaveURL(/\/entdecken$/)
}

/** Stub the backend geocoding proxy so tests never call Nominatim. */
export async function stubGeocoding(page: Page) {
  await page.route('**/api/geocode/search**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            placeName: 'Tempelhofer Feld',
            address: 'Tempelhofer Damm 1, 12101 Berlin',
            city: 'Berlin',
            countryCode: 'DE',
            lat: 52.4731,
            lng: 13.4039,
            displayName: 'Tempelhofer Feld, Berlin, Deutschland',
          },
        ],
      },
    })
  )
  await page.route('**/api/geocode/reverse**', (route) => route.fulfill({ json: { result: null } }))
}
