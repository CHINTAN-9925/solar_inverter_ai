'use client'
import { useState } from 'react'
import type { ShapFeature, ExplainResponse } from '../../lib/types'
import { postExplain } from '../../lib/api'
import { Spinner } from '../common'
import { fromNow } from '../../lib/utils'

interface Props {
  inverterId: string
  riskScore: number
  shapFeatures: ShapFeature[]
}

export default function InsightPanel({ inverterId, riskScore, shapFeatures }: Props) {
  const [insight, setInsight] = useState<ExplainResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await postExplain(inverterId, riskScore, shapFeatures)
      setInsight(result)
    } catch {
      setError('Failed to generate analysis. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#a78bfa" />
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">AI Insight</span>
          <span className="text-xs px-1.5 py-0.5 rounded text-[#a78bfa]" style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>Powered by Claude</span>
        </div>
        <button onClick={generate} disabled={isLoading} className="btn-amber flex items-center gap-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? <Spinner size={12} /> : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          )}
          {isLoading ? 'Analysing…' : 'Generate'}
        </button>
      </div>

      {/* Content */}
      {!insight && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.5" />
              <path d="M12 8v4M12 16h.01" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-sm text-[var(--text-secondary)] mb-1">No analysis generated yet</div>
          <div className="text-xs text-[var(--text-muted)]">Click Generate to get AI-powered root cause analysis</div>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-10">
          <Spinner size={32} />
          <div className="text-sm text-[var(--text-secondary)] mt-3">Analysing telemetry patterns…</div>
        </div>
      )}

      {error && (
        <div className="text-sm text-[#ff4060] text-center py-6">{error}</div>
      )}

      {insight && !isLoading && (
        <div className="space-y-4 animate-fade-up">
          {/* Narrative */}
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{insight.narrative}</p>

          {/* Key observations */}
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Key Observations</div>
            <ul className="space-y-1.5">
              {insight.key_observations.map((obs, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#a78bfa] flex-shrink-0" />
                  {obs}
                </li>
              ))}
            </ul>
          </div>

          {/* Root cause */}
          <div className="p-3 rounded-xl" style={{ background: 'rgba(255,64,96,0.06)', border: '1px solid rgba(255,64,96,0.2)' }}>
            <div className="text-xs text-[#ff4060] font-medium uppercase tracking-wider mb-1">Root Cause</div>
            <div className="text-xs text-[var(--text-secondary)]">{insight.root_cause}</div>
          </div>

          {/* Recommended action */}
          <div className="p-3 rounded-xl" style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <div className="text-xs text-[#00e5a0] font-medium uppercase tracking-wider mb-1">Recommended Action</div>
            <div className="text-xs text-[var(--text-secondary)]">{insight.recommended_action}</div>
          </div>

          {/* Timestamp */}
          <div className="text-right text-[10px] text-[var(--text-ghost)] font-mono">
            Generated {fromNow(insight.generated_at)}
          </div>
        </div>
      )}
    </div>
  )
}
