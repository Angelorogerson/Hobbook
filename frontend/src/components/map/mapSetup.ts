import maplibregl, { Map as MlMap } from 'maplibre-gl'
import type { BBox } from '@/api/eventApi'

/**
 * OpenFreeMap "liberty" style (keyless, OpenStreetMap data).
 * Verified 2026-11-16: the style contains a `building-3d` fill-extrusion layer
 * (source-layer "building", minzoom 14). MapLibre supports pitch + fill-extrusion,
 * so the 3D toggle only switches pitch and that layer's visibility.
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
export const BUILDING_3D_LAYER = 'building-3d'
export const BUILDINGS_MIN_ZOOM = 14

/** Neutral world view; the map fits to results as soon as there are any. */
export const DEFAULT_VIEW = { center: [10.45, 51.16] as [number, number], zoom: 4.5 }

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function createMap(container: HTMLElement, opts: Partial<maplibregl.MapOptions> = {}): MlMap {
  const map = new maplibregl.Map({
    container,
    style: MAP_STYLE_URL,
    center: DEFAULT_VIEW.center,
    zoom: DEFAULT_VIEW.zoom,
    attributionControl: { compact: true },
    maxPitch: 70,
    dragRotate: true,
    cooperativeGestures: false,
    ...opts,
  })
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
  return map
}

export function has3dBuildings(map: MlMap): boolean {
  return !!map.getLayer(BUILDING_3D_LAYER)
}

export function set3d(map: MlMap, on: boolean) {
  if (has3dBuildings(map)) {
    map.setLayoutProperty(BUILDING_3D_LAYER, 'visibility', on ? 'visible' : 'none')
  }
  map.easeTo({ pitch: on ? 60 : 0, bearing: on ? map.getBearing() : 0, duration: 600 })
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
