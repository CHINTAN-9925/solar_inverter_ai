'use client'
import { useKpi } from '../../hooks/useInverters'
import { useInverters } from '../../hooks/useInverters'
import { formatPercent, getRiskConfig } from '../../lib/utils'
import { Skeleton } from '../common'

export default function Topbar({ title }: { title: string }) {
  const { kpi, isLoading: kpiLoading } = useKpi()
  const { inverters } = useInverters()

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.06)]"
      style={{ background: 'rgba(3,7,15,0.85)', backdropFilter: 'blur(20px)' }}>
      {/* Ticker */}
      <div className="hidden md:block border-b border-[rgba(255,255,255,0.04)] overflow-hidden h-7">
        <div className="ticker-track h-full flex items-center" style={{ '--ticker-count': inverters.length * 2 } as React.CSSProperties}>
          {[...inverters, ...inverters].map((inv, i) => {
            const c = getRiskConfig(inv.risk_score)
            return (
              <span key={i} className="flex items-center gap-1.5 mr-6 whitespace-nowrap text-xs">
                <span className="font-mono text-[var(--text-muted)]">{inv.inverter_id}</span>
                <span className="font-mono font-bold" style={{ color: c.hex }}>{inv.risk_score.toFixed(2)}</span>
                <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background: c.hex }} />
              </span>
            )
          })}
        </div>
      </div>

      {/* Main bar */}
      <div className="flex items-center gap-4 px-4 md:px-6 h-14">
        <h1 className="hidden md:block text-sm font-semibold text-[var(--text-primary)] tracking-wide">{title}</h1>

        {/* KPI pills */}
        <div className="flex items-center gap-2 flex-1 md:flex-none md:ml-auto flex-wrap">
          {kpiLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="w-20 h-7 rounded-lg" />)
          ) : kpi ? (
            <>
              <KpiPill label="Total" value={kpi.total_inverters.toString()} color="#00d4ff" />
              <KpiPill label="At Risk" value={kpi.high_risk_count.toString()} color="#ff4060" />
              <KpiPill label="Avg Eff" value={formatPercent(kpi.avg_efficiency, 0)} color="#00e5a0" />
              <KpiPill label="Alarms" value={kpi.active_alarms.toString()} color="#ffb020" />
            </>
          ) : null}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="live-dot" />
          <span className="hidden sm:block text-xs text-[var(--text-muted)]">LIVE</span>
        </div>
      </div>
    </header>
  )
}

function KpiPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
      style={{ background: `${color}12`, border: `1px solid ${color}28` }}>
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-mono font-bold" style={{ color }}>{value}</span>
    </div>
  )
}
