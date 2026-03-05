'use client'
import { getRiskConfig } from '../../lib/utils'

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="10" stroke="rgba(0,212,255,0.2)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function RiskBadge({ score }: { score: number }) {
  const c = getRiskConfig(score)
  return <span className={c.tagClass}>{c.label}</span>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(255,64,96,0.3)] bg-[rgba(255,64,96,0.08)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#ff4060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm text-[#ff4060]">{message}</span>
    </div>
  )
}

export function RiskMeter({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const c = getRiskConfig(score)
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: c.barColor, boxShadow: `0 0 6px ${c.hex}` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs" style={{ color: c.hex }}>{pct}%</span>
      )}
    </div>
  )
}
