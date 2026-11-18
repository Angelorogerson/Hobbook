import maplibregl, { Map as MlMap } from 'maplibre-gl'
import type { BBox } from '@/api/eventApi'
import type { ResolvedTheme } from '@/store/ThemeContext'
import { SPORT_ICON_PATHS } from '@/components/ui/SportIcon'
import { MOTION } from '@/utils/motion'

/**
 * OpenFreeMap styles (keyless, OpenStreetMap data), verified 2026-11-16:
 * - "liberty" (light) contains a `building-3d` fill-extrusion layer (minzoom 14)
 * - "fiord" (dark, navy — matches Hobbook's ink palette and keeps land/water
 *   readable at country zoom, unlike the near-black "dark" style) has the same
 *   `openmaptiles` source with a flat `building` layer but no extrusion, so we add
 *   one with the same height expressions.
 */
export const MAP_STYLES: Record<ResolvedTheme, string> = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/fiord',
}
export const BUILDING_3D_LAYER = 'building-3d'
export const BUILDINGS_MIN_ZOOM = 14

/** Neutral view over Central Europe; the map fits to results as soon as there are any. */
export const DEFAULT_VIEW = { center: [10.45, 51.16] as [number, number], zoom: 4.5 }

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function createMap(
  container: HTMLElement,
  theme: ResolvedTheme,
  opts: Partial<maplibregl.MapOptions> = {}
): MlMap {
  const map = new maplibregl.Map({
    container,
    style: MAP_STYLES[theme],
    center: DEFAULT_VIEW.center,
    zoom: DEFAULT_VIEW.zoom,
    attributionControl: { compact: true },
    maxPitch: 70,
    ...opts,
  })
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
  // Themed 3D buildings; added on every style load (dark style lacks them).
  map.on('style.load', () => ensure3dLayer(map, theme))
  return map
}

/** Adds the extrusion layer to styles that only have flat buildings; hidden until 3D is on. */
export function ensure3dLayer(map: MlMap, theme: ResolvedTheme) {
  if (map.getLayer(BUILDING_3D_LAYER)) {
    if (theme === 'dark') map.setPaintProperty(BUILDING_3D_LAYER, 'fill-extrusion-color', '#3b4766')
    map.setLayoutProperty(BUILDING_3D_LAYER, 'visibility', 'none')
    return
  }
  if (!map.getSource('openmaptiles')) return
  map.addLayer({
    id: BUILDING_3D_LAYER,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: BUILDINGS_MIN_ZOOM,
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': theme === 'dark' ? '#3b4766' : 'hsl(35,8%,85%)',
      'fill-extrusion-height': ['get', 'render_height'],
      'fill-extrusion-base': ['get', 'render_min_height'],
      'fill-extrusion-opacity': 0.85,
    },
  })
}

export function has3dBuildings(map: MlMap): boolean {
  return !!map.getLayer(BUILDING_3D_LAYER)
}

export function set3d(map: MlMap, on: boolean) {
  if (has3dBuildings(map)) {
    map.setLayoutProperty(BUILDING_3D_LAYER, 'visibility', on ? 'visible' : 'none')
  }
  map.easeTo({ pitch: on ? 60 : 0, bearing: on ? map.getBearing() : 0, duration: MOTION.cameraLarge })
}

export function boundsToBBox(map: MlMap): BBox {
  const b = map.getBounds()
  const clamp = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v))
  return {
    minLng: clamp(b.getWest(), 180),
    minLat: clamp(b.getSouth(), 90),
    maxLng: clamp(b.getEast(), 180),
    maxLat: clamp(b.getNorth(), 90),
  }
}

const LUCIDE_FALLBACK: Record<string, string> = {
  // Simplified lucide paths for the remaining sports (marker size: 16px)
  volleyball:
    '<path d="M11.1 7.1a16.55 16.55 0 0 1 10.9 4"/><path d="M12 12a12.6 12.6 0 0 1-8.7 5"/><path d="M16.8 13.6a16.55 16.55 0 0 1-9 7.5"/><path d="M20.7 17a12.8 12.8 0 0 0-8.7-5 13.3 13.3 0 0 1 0-10"/><path d="M6.3 3.8a16.55 16.55 0 0 0 1.9 11.5"/><circle cx="12" cy="12" r="10"/>',
  running: '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/>',
  cycling: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  badminton: '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
  frisbee: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/>',
  fitness: '<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>',
  other: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
}

/** Inline SVG markup of a sport glyph for DOM markers (16px, currentColor). */
export function sportIconSvg(sport: string): string {
  const key = sport === 'beach_volleyball' ? 'volleyball' : sport
  const paths = SPORT_ICON_PATHS[key] || LUCIDE_FALLBACK[key] || LUCIDE_FALLBACK.other
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}
