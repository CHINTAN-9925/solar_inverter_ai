'use client'
import { useState, useMemo } from 'react'
import type { TrendMetric } from '../../lib/types'
import { useInverterTrend } from '../../hooks/useInverterDetail'
import { formatTemp, formatWatt, cx } from '../../lib/utils'
import { Skeleton } from '../common'

interface Props { inverterId: string }

const METRICS: { key: TrendMetric; label: string; color: string; format: (v: number) => string }[] = [
  { key: 'temperature', label: 'Temperature', color: '#ff4060', format: formatTemp },
  { key: 'power_output', label: 'Power', color: '#ffb020', format: formatWatt },
  { key: 'ac_voltage', label: 'Voltage', color: '#00d4ff', format: (v: number) => `${v.toFixed(1)}V` },
]

export default function TrendChart({ inverterId }: Props) {
  const [metric, setMetric] = useState<TrendMetric>('temperature')
  const { points, isLoading } = useInverterTrend(inverterId, metric)
  const m = METRICS.find(x => x.key === metric)!

  const chart = useMemo(() => {
    if (!points.length) return null
    const W = 400, H = 120, pad = { t: 10, b: 24, l: 10, r: 10 }
    const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b
    const vals = points.map(p => p.value)
    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max - min || 1
    const toX = (i: number) => pad.l + (i / (points.length - 1)) * iW
    const toY = (v: number) => pad.t + iH - ((v - min) / range) * iH

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ')
    const areaPath = `${linePath} L${toX(points.length - 1).toFixed(1)},${(pad.t + iH).toFixed(1)} L${pad.l},${(pad.t + iH).toFixed(1)} Z`

    const lastX = toX(points.length - 1), lastY = toY(points[points.length - 1].value)
    const prevVal = points[points.length - 2]?.value ?? points[points.length - 1].value
    const lastVal = points[points.length - 1].value
    const delta = prevVal !== 0 ? ((lastVal - prevVal) / Math.abs(prevVal)) * 100 : 0

    // Time labels every 6 hours
    const timeLabels = points.filter((_, i) => i % 6 === 0).map((p, j) => ({
      x: toX(j * 6), label: new Date(p.timestamp).getHours() + 'h'
    }))

    return { W, H, linePath, areaPath, lastX, lastY, lastVal, delta, timeLabels, color: m.color }
  }, [points, m.color])

  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">24h Trend</div>
          {chart && (
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-xl text-[var(--text-primary)]">{m.format(chart.lastVal)}</span>
              <span className={cx('font-mono text-xs', chart.delta >= 0 ? 'text-[#ff4060]' : 'text-[#00e5a0]')}>
                {chart.delta >= 0 ? '▲' : '▼'} {Math.abs(chart.delta).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {METRICS.map(x => (
            <button key={x.key} onClick={() => setMetric(x.key)}
              className={cx('px-2.5 py-1 rounded-lg text-xs font-medium transition-all', metric === x.key ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}
              style={metric === x.key ? { background: `${x.color}18`, border: `1px solid ${x.color}30`, color: x.color } : { background: 'transparent', border: '1px solid transparent' }}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {isLoading ? <Skeleton className="h-28 rounded-xl" /> : chart ? (
        <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={chart.color} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow-line">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Area */}
          <path d={chart.areaPath} fill={`url(#grad-${metric})`} />

          {/* Glow line */}
          <path d={chart.linePath} fill="none" stroke={chart.color} strokeWidth="3" strokeOpacity="0.3" filter="url(#glow-line)" />

          {/* Main line */}
          <path d={chart.linePath} fill="none" stroke={chart.color} strokeWidth="1.5" strokeLinecap="round" />

          {/* Pulsing dot */}
          <circle cx={chart.lastX} cy={chart.lastY} r="6" fill={chart.color} opacity="0.2">
            <animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={chart.lastX} cy={chart.lastY} r="3" fill={chart.color} />

          {/* Time labels */}
          {chart.timeLabels.map((tl, i) => (
            <text key={i} x={tl.x} y={chart.H - 4} textAnchor="middle" fontSize="8" fill="rgba(138,163,196,0.5)" fontFamily="JetBrains Mono">{tl.label}</text>
          ))}
        </svg>
      ) : null}
    </div>
  )
}
