'use client'
import Link from 'next/link'
import Topbar from '../../../components/layout/Topbar'
import TrendChart from '../../../components/dashboard/TrendChart'
import ShapBarChart from '../../../components/explain/ShapBarChart'
import ShapWaterfall from '../../../components/explain/ShapWaterfall'
import InsightPanel from '../../../components/explain/InsightPanel'
import { RiskBadge, RiskMeter, Skeleton, ErrorAlert } from '../../../components/common'
import { useInverterDetail, useWaterfall } from '../../../hooks/useInverterDetail'
import { getRiskConfig, formatScore, fromNow } from '../../../lib/utils'

interface PageProps {
  params: { id: string }
}

export default function InverterDetailPage({ params }: PageProps) {
  const { id } = params
  const { summary, prediction, isLoading, isError } = useInverterDetail(id)
  const { entries: waterfall, isLoading: wfLoading } = useWaterfall(id)

  return (
    <div>
      <Topbar title={`Inverter ${id}`} />
      <main className="p-4 md:p-6 space-y-5">
        {/* Back */}
        <Link href="/inverters" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Fleet
        </Link>

        {isError && <ErrorAlert message="Failed to load inverter data. Please try again." />}

        {/* Header */}
        {isLoading ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : summary && prediction ? (
          <div className="rounded-2xl p-5 animate-fade-up" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: `1px solid ${getRiskConfig(summary.risk_score).hex}20` }}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-mono font-bold text-2xl text-[var(--text-primary)]">{summary.inverter_id}</span>
                  <RiskBadge score={summary.risk_score} />
                  <span className="font-mono font-bold text-xl" style={{ color: getRiskConfig(summary.risk_score).hex }}>
                    {formatScore(summary.risk_score)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-mono"
                    style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                    Block {summary.block}
                  </span>
                </div>
                <div className="text-sm text-[var(--text-secondary)] mb-3">
                  {summary.primary_cause !== 'None' ? (
                    <span>⚠ {summary.primary_cause}</span>
                  ) : (
                    <span className="text-[#00e5a0]">✓ No anomalies detected</span>
                  )}
                </div>
                <RiskMeter score={summary.risk_score} showLabel />
              </div>
              <div className="text-right">
                <div className="text-xs text-[var(--text-muted)]">Last updated</div>
                <div className="font-mono text-sm text-[var(--text-secondary)]">{fromNow(summary.last_updated)}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 2-col grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrendChart inverterId={id} />
          <ShapBarChart
            features={prediction?.top_features ?? []}
            isLoading={isLoading}
          />
          <ShapWaterfall entries={waterfall} isLoading={wfLoading} />
          <InsightPanel
            inverterId={id}
            riskScore={prediction?.risk_score ?? 0}
            shapFeatures={prediction?.top_features ?? []}
          />
        </div>
      </main>
    </div>
  )
}