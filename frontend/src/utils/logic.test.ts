import { describe, it, expect } from 'vitest'
import { rangeFor, parseArea } from '@/hooks/useEventDiscovery'
import { toQueryParams } from '@/api/eventApi'
import { validateForm, suggestedMin, isoWeekdayOf } from '@/pages/events/EventFormPage'
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
    weekly: false,
    weekday: 4,
    minPlayers: '6',
    deadlineHours: '3',
    openDaysBefore: '5',
    rsvpMode: 'ask' as const,
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

  it('a weekly game needs no date but a sensible minimum and duration', () => {
    expect(validateForm({ ...base, weekly: true, date: '2000-01-01' })).toEqual({})
    expect(Object.keys(validateForm({ ...base, weekly: true, minPlayers: '12' }))).toEqual(['minPlayers'])
    expect(Object.keys(validateForm({ ...base, weekly: true, startTime: '18:00', endTime: '18:10' }))).toEqual(['endAt'])
  })

  it('suggests a minimum of about 60 % and finds the weekday of a date', () => {
    expect(suggestedMin(10)).toBe(6)
    expect(suggestedMin(2)).toBe(2)
    expect(isoWeekdayOf('2026-11-22')).toBe(7)
    expect(isoWeekdayOf('2026-11-19')).toBe(4)
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

import { distanceKm, formatDistance, loadPlace, savePlace } from '@/utils/geo'

describe('geo helpers', () => {
  it('measures distance between two points', () => {
    // Berlin Alexanderplatz → Brandenburger Tor is roughly 2.2 km
    const d = distanceKm({ lat: 52.5219, lng: 13.4132 }, { lat: 52.5163, lng: 13.3777 })
    expect(d).toBeGreaterThan(2)
    expect(d).toBeLessThan(2.6)
  })

  it('formats distances the way people say them', () => {
    expect(formatDistance(0.3)).toBe('ca. 1 km')
    expect(formatDistance(2.44)).toBe('2,4 km')
    expect(formatDistance(12.6)).toBe('13 km')
  })

  it('remembers the last place coarsely and ignores broken storage', () => {
    localStorage.clear()
    expect(loadPlace()).toBeNull()
    savePlace({ near: { lat: 52.520008, lng: 13.404954 } })
    expect(loadPlace()).toEqual({ near: { lat: 52.52, lng: 13.4 } })
    savePlace({ city: 'Köln' })
    expect(loadPlace()).toEqual({ city: 'Köln' })
    localStorage.setItem('hobbook_place', '{broken')
    expect(loadPlace()).toBeNull()
    savePlace(null)
    expect(localStorage.getItem('hobbook_place')).toBeNull()
  })
})
