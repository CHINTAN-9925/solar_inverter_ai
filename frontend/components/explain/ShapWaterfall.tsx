'use client'
import type { WaterfallEntry } from '../../lib/types'
import { Skeleton } from '../common'

interface Props {
  entries: WaterfallEntry[]
  isLoading: boolean
}

export default function ShapWaterfall({ entries, isLoading }: Props) {
  if (isLoading) return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Skeleton className="h-4 w-40 rounded mb-4" />
      <Skeleton className="h-48 rounded" />
    </div>
  )

  if (!entries.length) return null

  const W = 500, H = 200
  const pad = { t: 20, b: 50, l: 15, r: 15 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b

  const minCum = Math.min(0, ...entries.map(e => e.cumulative - (e.value < 0 ? 0 : e.value)))
  const maxCum = Math.max(...entries.map(e => e.cumulative))
  const range = maxCum - minCum || 1
  const toY = (v: number) => pad.t + iH - ((v - minCum) / range) * iH
  const barW = iW / entries.length - 4
  const toX = (i: number) => pad.l + i * (iW / entries.length) + 2

  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-4">
        <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Risk Decomposition</div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">SHAP Waterfall</div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        <defs>
          {entries.map((_, i) => (
            <filter key={i} id={`wf-glow-${i}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          ))}
        </defs>

        {/* Zero line */}
        <line x1={pad.l} y1={toY(0)} x2={W - pad.r} y2={toY(0)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,3" />

        {entries.map((entry, i) => {
          const color = i === 0 ? '#8b96ff' : entry.isPositive ? '#ff4060' : '#00d4ff'
          const barTop = toY(Math.max(entry.cumulative, entry.cumulative - entry.value))
          const barBottom = toY(Math.min(entry.cumulative, entry.cumulative - entry.value))
          const barH = Math.max(barBottom - barTop, 2)
          const x = toX(i)
          const centerX = x + barW / 2

          // Connector to next bar
          const nextEntry = entries[i + 1]
          const connY = toY(entry.cumulative)

          return (
            <g key={i}>
              {/* Connector */}
              {nextEntry && (
                <line
                  x1={x + barW} y1={connY}
                  x2={toX(i + 1)} y2={connY}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,2"
                />
              )}

              {/* Bar */}
              <rect x={x} y={barTop} width={barW} height={barH} rx="3"
                fill={`${color}28`} stroke={color} strokeWidth="1"
                filter={`url(#wf-glow-${i})`}
                style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
              />

              {/* Value label */}
              <text x={centerX} y={barTop - 5} textAnchor="middle" fontSize="8" fill={color} fontFamily="JetBrains Mono">
                {entry.value > 0 ? '+' : ''}{entry.value.toFixed(2)}
              </text>

              {/* Feature label */}
              <text
                x={centerX} y={H - 4}
                textAnchor="end"
                fontSize="7"
                fill="rgba(138,163,196,0.6)"
                fontFamily="JetBrains Mono"
                transform={`rotate(-20, ${centerX}, ${H - 4})`}
              >
                {entry.display_name.slice(0, 10)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
