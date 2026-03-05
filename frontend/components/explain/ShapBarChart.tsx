'use client'
import type { ShapFeature } from '../../lib/types'
import { Skeleton } from '../common'

interface Props {
  features: ShapFeature[]
  isLoading: boolean
}

export default function ShapBarChart({ features, isLoading }: Props) {
  if (isLoading) return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <Skeleton className="h-4 w-40 rounded mb-4" />
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 rounded mb-2" />)}
    </div>
  )

  const sorted = [...features].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value)).slice(0, 8)
  const maxAbs = Math.max(...sorted.map(f => Math.abs(f.shap_value)), 0.01)

  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Feature Impact</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">SHAP Values</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff4060]" />Raises risk</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00d4ff]" />Lowers risk</span>
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((f, i) => {
          const isPos = f.shap_value > 0
          const color = isPos ? '#ff4060' : '#00d4ff'
          const pct = (Math.abs(f.shap_value) / maxAbs) * 100

          return (
            <div key={f.feature} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="w-32 text-xs text-[var(--text-secondary)] truncate text-right shrink-0">{f.display_name}</div>
              <div className="flex-1 h-7 bg-[rgba(255,255,255,0.04)] rounded-md overflow-hidden relative">
                <div className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-700"
                  style={{ width: `${pct}%`, background: `${color}22`, border: `1px solid ${color}30`, boxShadow: `inset 0 0 8px ${color}15` }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color }}>
                    {f.shap_value > 0 ? '+' : ''}{f.shap_value.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="w-16 text-right shrink-0">
                <span className="font-mono text-xs text-[var(--text-muted)]">{typeof f.feature_value === 'number' ? f.feature_value.toFixed(1) : f.feature_value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
