import type { SVGProps } from 'react'
import { Activity, Bike, Disc, Dumbbell, Feather, Footprints, Volleyball, type LucideIcon } from 'lucide-react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/* Authored in lucide's grid (24px, 2px stroke, round caps) where lucide only has brand logos. */
const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

function FootballIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="m12 7 4 3-1.5 4.5h-5L8 10z" />
      <path d="M12 7V2.5M16 10l4.5-1.5M14.5 14.5l2.8 3.8M9.5 14.5l-2.8 3.8M8 10 3.5 8.5" />
    </svg>
  )
}

function BasketballIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2v20" />
      <path d="M5 4.9a10 10 0 0 1 0 14.2M19 4.9a10 10 0 0 0 0 14.2" />
    </svg>
  )
}

function TennisIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M6 3.9a10 10 0 0 1 0 16.2M18 3.9a10 10 0 0 0 0 16.2" />
    </svg>
  )
}

function TableTennisIcon({ size, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M14.5 14.5 20 20" />
      <path d="M15.6 4.4a6 6 0 0 1 0 8.5l-1.4 1.4a6 6 0 0 1-8.5-8.5l1.4-1.4a6 6 0 0 1 8.5 0z" />
      <circle cx="19" cy="6" r="2" />
    </svg>
  )
}

const LUCIDE: Record<string, LucideIcon> = {
  volleyball: Volleyball,
  beach_volleyball: Volleyball,
  running: Footprints,
  cycling: Bike,
  badminton: Feather,
  frisbee: Disc,
  fitness: Dumbbell,
}

const CUSTOM: Record<string, (p: IconProps) => JSX.Element> = {
  football: FootballIcon,
  basketball: BasketballIcon,
  tennis: TennisIcon,
  table_tennis: TableTennisIcon,
}

/** Decorative sport glyph; the sport name is always rendered as text next to it. */
export default function SportIcon({ sport, size = 18, className }: { sport: string; size?: number; className?: string }) {
  const Custom = CUSTOM[sport]
  if (Custom) return <Custom size={size} className={className} aria-hidden="true" focusable="false" />
  const Icon = LUCIDE[sport] || Activity
  return <Icon size={size} className={className} aria-hidden="true" focusable="false" />
}

/** Same icons as an SVG string, for MapLibre DOM markers (no React root per marker). */
export const SPORT_ICON_PATHS: Record<string, string> = {
  football:
    '<circle cx="12" cy="12" r="10"/><path d="m12 7 4 3-1.5 4.5h-5L8 10z"/><path d="M12 7V2.5M16 10l4.5-1.5M14.5 14.5l2.8 3.8M9.5 14.5l-2.8 3.8M8 10 3.5 8.5"/>',
  basketball:
    '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2v20"/><path d="M5 4.9a10 10 0 0 1 0 14.2M19 4.9a10 10 0 0 0 0 14.2"/>',
  tennis: '<circle cx="12" cy="12" r="10"/><path d="M6 3.9a10 10 0 0 1 0 16.2M18 3.9a10 10 0 0 0 0 16.2"/>',
  table_tennis:
    '<path d="M14.5 14.5 20 20"/><path d="M15.6 4.4a6 6 0 0 1 0 8.5l-1.4 1.4a6 6 0 0 1-8.5-8.5l1.4-1.4a6 6 0 0 1 8.5 0z"/><circle cx="19" cy="6" r="2"/>',
}
