import { useState } from 'react'

function hashHue(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h % 360
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="brand-mark">
      <rect width="64" height="64" rx="16" fill="#2f6f5e" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeWidth="4" />
      <path d="M32 20v12h10" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <rect x="42" y="40" width="4" height="10" rx="1" fill="#dceee7" />
      <rect x="48" y="36" width="4" height="14" rx="1" fill="#dceee7" />
      <rect x="54" y="30" width="4" height="20" rx="1" fill="#dceee7" />
    </svg>
  )
}

export function AppIcon({
  src,
  name,
  size = 36,
}: {
  src?: string
  name: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const letter = (name || '?').replace(/^[^A-Za-z0-9\u3040-\u30ff\u4e00-\u9faf]+/, '').slice(0, 1).toUpperCase() || '?'
  const hue = hashHue(name || '?')
  if (!src || failed) {
    return (
      <span
        className="app-icon fallback"
        style={{
          width: size,
          height: size,
          background: `hsl(${hue} 38% 42%)`,
          fontSize: Math.max(12, Math.round(size * 0.42)),
        }}
        aria-hidden
      >
        {letter}
      </span>
    )
  }
  return (
    <img
      className="app-icon"
      src={src}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
    />
  )
}

export function UsageRing({
  activeMs,
  idleMs,
  label,
}: {
  activeMs: number
  idleMs: number
  label: string
}) {
  const total = Math.max(activeMs + idleMs, 1)
  const r = 42
  const c = 2 * Math.PI * r
  const activePct = activeMs / total
  return (
    <div className="ring-wrap" aria-hidden>
      <svg viewBox="0 0 108 108" width="120" height="120">
        <circle cx="54" cy="54" r={r} fill="none" stroke="#e6e0d4" strokeWidth="12" />
        <circle
          cx="54"
          cy="54"
          r={r}
          fill="none"
          stroke="#2f6f5e"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * activePct} ${c}`}
          transform="rotate(-90 54 54)"
        />
      </svg>
      <div className="ring-label">{label}</div>
    </div>
  )
}
