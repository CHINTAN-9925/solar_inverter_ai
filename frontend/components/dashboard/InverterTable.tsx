'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { InverterSummary } from '../../lib/types'
import { getRiskConfig, formatScore, fromNow, cx } from '../../lib/utils'
import { RiskBadge, RiskMeter, Skeleton } from '../common'

type SortKey = 'inverter_id' | 'block' | 'risk_score'

interface Props {
  inverters: InverterSummary[]
  isLoading: boolean
}

export default function InverterTable({ inverters, isLoading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('risk_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState('')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'risk_score' ? 'desc' : 'asc') }
  }
  const setDir = setSortDir

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    return [...inverters]
      .filter(i => !q || i.inverter_id.toLowerCase().includes(q) || i.block.toLowerCase().includes(q) || i.primary_cause.toLowerCase().includes(q))
      .sort((a, b) => {
        let av: string | number = a[sortKey], bv: string | number = b[sortKey]
        if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
        return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
      })
  }, [inverters, filter, sortKey, sortDir])

  if (isLoading) return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
    </div>
  )

  return (
    <div>
      {/* Filter */}
      <div className="mb-4">
        <input
          className="input-solar w-full sm:w-64"
          placeholder="Search inverters..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <Th label="ID" sortKey="inverter_id" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Block" sortKey="block" current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Risk Score" sortKey="risk_score" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="text-left py-3 px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden sm:table-cell">Meter</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Cause</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Updated</th>
              <th className="py-3 px-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv, idx) => {
              const c = getRiskConfig(inv.risk_score)
              return (
                <tr key={inv.inverter_id}
                  className={cx('border-b border-[rgba(255,255,255,0.04)] transition-colors cursor-pointer group animate-fade-up')}
                  style={{ animationDelay: `${idx * 30}ms`, '--hover-bg': `${c.hex}06` } as React.CSSProperties}>
                  <td className="py-3 px-3">
                    <Link href={`/inverters/${inv.inverter_id}`} className="font-mono font-bold text-[var(--text-primary)] hover:text-[#00d4ff] transition-colors">
                      {inv.inverter_id}
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}>
                      {inv.block}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold" style={{ color: c.hex }}>{formatScore(inv.risk_score)}</span>
                      <RiskBadge score={inv.risk_score} />
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell w-28">
                    <RiskMeter score={inv.risk_score} showLabel />
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell max-w-[180px]">
                    <span className="text-[var(--text-secondary)] truncate block text-xs">{inv.primary_cause}</span>
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <span className="font-mono text-xs text-[var(--text-muted)]">{fromNow(inv.last_updated)}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Link href={`/inverters/${inv.inverter_id}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[var(--text-ghost)] group-hover:text-[#00d4ff] transition-colors">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[var(--text-muted)] text-sm">No inverters found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th className="text-left py-3 px-3 cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <span className={cx('flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors', active ? 'text-[#00d4ff]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]')}>
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className={cx('transition-transform', active && dir === 'asc' ? 'rotate-180' : '')}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </span>
    </th>
  )
}
