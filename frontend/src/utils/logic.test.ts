import { describe, it, expect } from 'vitest'
import { rangeFor, parseArea } from '@/hooks/useEventDiscovery'
import { toQueryParams } from '@/api/eventApi'
import { validateForm } from '@/pages/events/EventFormPage'
import { validateRegistration } from '@/pages/auth/RegisterPage'
import { buildIcs, formatEventDate } from '@/utils/format'
import { makeEvent } from '@/test/fixtures'

describe('discovery helpers', () => {
  it('weekend range on a Wednesday spans Saturday 00:00 to Sunday 23:59', () => {
    const wed = new Date(2026, 10, 18, 12, 0) // Wed 18 Nov 2026
    const r = rangeFor('weekend', wed)
    expect(new Date(r.from!).getDate()).toBe(21)
    expect(new Date(r.from!).getHours()).toBe(0)
    expect(new Date(r.to!).getDate()).toBe(22)
  })

  it('weekend range on a Sunday starts now', () => {
    const sun = new Date(2026, 10, 22, 15, 0)
    expect(rangeFor('weekend', sun).from).toBe(sun.toISOString())
  })

  it('parses only well-formed areas', () => {
    expect(parseArea('1,2,3,4')).toEqual({ minLng: 1, minLat: 2, maxLng: 3, maxLat: 4 })
    expect(parseArea('1,2,x,4')).toBeNull()
  })

  it('builds API params', () => {
    expect(toQueryParams({ city: ' Köln ', sport: 'running', bbox: { minLng: 1, minLat: 2, maxLng: 3, maxLat: 4 }, limit: 200 })).toEqual({
      city: 'Köln',
      sport: 'running',
      bbox: '1.00000,2.00000,3.00000,4.00000',
      limit: '200',
    })
  })

  it('sends a coarse position for near-me searches, and a map area wins over it', () => {
    expect(toQueryParams({ near: { lat: 49.44321, lng: 7.76899 }, radiusKm: 25 })).toEqual({
      near: '7.77,49.44',
      radiusKm: '25',
    })
    const withArea = toQueryParams({ near: { lat: 49.4, lng: 7.7 }, radiusKm: 25, bbox: { minLng: 1, minLat: 2, maxLng: 3, maxLat: 4 } })
    expect(withArea.near).toBeUndefined()
    expect(withArea.radiusKm).toBeUndefined()
  })
})

describe('event form validation', () => {
  const base = {
    sport: 'football',
    title: 'Kick',
    date: '2099-06-01',
    startTime: '18:00',
    endTime: '20:00',
    maxParticipants: '10',
    level: 'all' as const,
    description: '',
    visibility: 'public' as const,
    location: { placeName: 'P', address: 'A', city: 'C', lat: 1, lng: 2 },
  }

  it('accepts a complete form', () => {
    expect(validateForm(base)).toEqual({})
  })

  it('requires a pin and location fields', () => {
    const e = validateForm({ ...base, location: { placeName: '', address: '', city: '', lat: null, lng: null } })
    expect(Object.keys(e).sort()).toEqual(['location.address', 'location.city', 'location.lat', 'location.placeName'])
  })

  it('rejects past starts and invalid capacity', () => {
    const e = validateForm({ ...base, date: '2000-01-01', maxParticipants: '1' })
    expect(e.startAt).toBeTruthy()
    expect(e.maxParticipants).toBeTruthy()
  })

  it('treats an end before the start as next day', () => {
    expect(validateForm({ ...base, startTime: '22:00', endTime: '01:00' })).toEqual({})
  })
})

describe('registration validation', () => {
  it('flags all problems', () => {
    expect(Object.keys(validateRegistration({ name: 'A', email: 'x', password: 'short', confirm: 'other', age: false })).sort()).toEqual([
      'age',
      'confirm',
      'email',
      'name',
      'password',
    ])
  })
})

describe('formatting', () => {
  it('formats in the event time zone', () => {
    const { time } = formatEventDate('2026-07-01T16:00:00.000Z', '2026-07-01T18:00:00.000Z', 'Europe/Berlin')
    expect(time).toMatch(/^18:00–20:00 Uhr/)
  })

  it('builds a valid calendar entry with escaped text', () => {
    const ics = buildIcs(makeEvent({ title: 'Kick; im Park, abends' }), 'https://x/events/e1')
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('SUMMARY:Kick\\; im Park\\, abends')
    expect(ics).toContain('GEO:52.5;13.4')
  })
})
