'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useChat } from '../../hooks/useChat'
import { getRiskConfig, formatScore } from '../../lib/utils'
import { Spinner } from '../common'

const SUGGESTED = [
  'Which inverters are at risk today?',
  'What is the average efficiency across all blocks?',
  'Show me inverters with high alarm counts',
  'Which block has the most issues?',
]

export default function ChatWindow() {
  const { messages, isLoading, sendMessage, clearChat } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input.trim())
    setInput('')
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--void)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]"
        style={{ background: 'var(--deep)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 0 16px rgba(167,139,250,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#a78bfa" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">SolarAI Assistant</div>
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
              <span className="live-dot" style={{ '--dot-size': '6px' } as React.CSSProperties} />
              RAG-powered · Real-time fleet data
            </div>
          </div>
        </div>
        <button onClick={clearChat}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-all">
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex animate-fade-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2 flex-shrink-0 mt-1"
                style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#a78bfa" />
                </svg>
              </div>
            )}
            <div className={`max-w-[80%] space-y-2`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-tr-sm text-[var(--text-primary)]'
                  : 'rounded-tl-sm text-[var(--text-secondary)]'
              }`}
                style={msg.role === 'user'
                  ? { background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.2)' }
                  : { background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)' }
                }>
                {msg.content}
              </div>

              {/* Supporting inverter chips */}
              {msg.supporting_inverters && msg.supporting_inverters.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.supporting_inverters.map(inv => {
                    const c = getRiskConfig(inv.risk_score)
                    return (
                      <Link key={inv.inverter_id} href={`/inverters/${inv.inverter_id}`}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all hover:scale-105"
                        style={{ background: `${c.hex}12`, border: `1px solid ${c.hex}25`, color: c.hex }}>
                        <span className="font-mono">{inv.inverter_id}</span>
                        <span className="font-mono opacity-70">{formatScore(inv.risk_score)}</span>
                        <span className="text-[var(--text-muted)]">·</span>
                        <span className="opacity-70">Blk {inv.block}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <Spinner size={13} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggested questions */}
        {showSuggestions && (
          <div className="pt-2">
            <div className="text-xs text-[var(--text-muted)] mb-2 text-center">Suggested questions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-left px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                  style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 border-t border-[rgba(255,255,255,0.06)]" style={{ background: 'var(--deep)' }}>
        <div className="flex gap-2">
          <input
            className="input-solar flex-1"
            placeholder="Ask about your solar plant…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading}
            className="btn-primary flex items-center justify-center w-10 h-10 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
