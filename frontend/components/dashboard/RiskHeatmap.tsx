'use client'
import Link from 'next/link'
import type { InverterSummary } from '../../lib/types'
import { getRiskConfig, formatScore } from '../../lib/utils'
import { Skeleton } from '../common'

interface Props {
  inverters: InverterSummary[]
  isLoading: boolean
}

const BLOCKS = ['A', 'B', 'C']

export default function RiskHeatmap({ inverters, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BLOCKS.map(b => <Skeleton key={b} className="h-48 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {BLOCKS.map(block => {
        const blockInverters = inverters.filter(i => i.block === block)
        const avgRisk = blockInverters.length > 0
          ? blockInverters.reduce((s, i) => s + i.risk_score, 0) / blockInverters.length
          : 0
        const critCount = blockInverters.filter(i => i.status === 'critical').length
        const warnCount = blockInverters.filter(i => i.status === 'warning').length
        const c = getRiskConfig(avgRisk)

        return (
          <div key={block} className="rounded-2xl p-5 transition-all duration-200 animate-fade-up"
            style={{
              background: 'linear-gradient(145deg, var(--card), var(--deep))',
              border: `1px solid ${c.hex}22`,
              boxShadow: `0 0 24px ${c.hex}10`,
            }}>
            {/* Block header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm"
                  style={{ background: `${c.hex}18`, color: c.hex, border: `1px solid ${c.hex}30` }}>
                  {block}
                </div>
                <span className="text-[var(--text-secondary)] text-sm">Block {block}</span>
              </div>
              <span className="font-mono font-bold text-lg" style={{ color: c.hex }}>{Math.round(avgRisk * 100)}%</span>
            </div>

            {/* Risk bar */}
            <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full mb-4 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${avgRisk * 100}%`, background: c.barColor, boxShadow: `0 0 8px ${c.hex}` }} />
            </div>

            {/* Inverter cells */}
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {blockInverters.map(inv => {
                const ic = getRiskConfig(inv.risk_score)
                return (
                  <Link key={inv.inverter_id} href={`/inverters/${inv.inverter_id}`}
                    className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-mono font-bold transition-all duration-150 hover:scale-105"
                    style={{
                      background: `${ic.hex}18`,
                      border: `1px solid ${ic.hex}35`,
                      color: ic.hex,
                      boxShadow: inv.status === 'critical' ? `0 0 8px ${ic.hex}40` : 'none',
                    }}
                    title={`${inv.inverter_id}: ${formatScore(inv.risk_score)}`}>
                    {inv.inverter_id.replace('INV-', '')}
                  </Link>
                )
              })}
              {blockInverters.length === 0 && (
                <div className="col-span-4 text-xs text-[var(--text-muted)] text-center py-2">No inverters</div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-3 text-xs">
              {critCount > 0 && (
                <span className="flex items-center gap-1 text-[#ff4060]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff4060]" />
                  {critCount} critical
                </span>
              )}
              {warnCount > 0 && (
                <span className="flex items-center gap-1 text-[#ffb020]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffb020]" />
                  {warnCount} warning
                </span>
              )}
              {critCount === 0 && warnCount === 0 && (
                <span className="flex items-center gap-1 text-[#00e5a0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a0]" />
                  All normal
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
