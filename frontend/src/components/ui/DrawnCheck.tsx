import './DrawnCheck.css'

/**
 * "Erledigt" hit: a check draws itself inside its ring, then a shockwave ring
 * goes out once. Shown statically with reduced motion.
 */
export default function DrawnCheck({ size = 64 }: { size?: number }) {
  return (
    <span className="drawn-check-wrap" style={{ width: size, height: size }} aria-hidden="true">
      <span className="drawn-check-wave" />
      <svg className="drawn-check" viewBox="0 0 52 52" width={size} height={size}>
        <circle cx="26" cy="26" r="24" />
        <path d="M15 27 l7 7 l15 -16" />
      </svg>
    </span>
  )
}
