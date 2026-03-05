export type RiskLevel = 'critical' | 'warning' | 'normal'

export interface RiskConfig {
  hex: string
  label: string
  tagClass: string
  textClass: string
  bgClass: string
  borderClass: string
  barColor: string
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.7) return 'critical'
  if (score >= 0.4) return 'warning'
  return 'normal'
}

export function getRiskConfig(score: number): RiskConfig {
  const level = getRiskLevel(score)
  switch (level) {
    case 'critical':
      return {
        hex: '#ff4060',
        label: 'CRITICAL',
        tagClass: 'tag tag-red',
        textClass: 'text-[#ff4060]',
        bgClass: 'bg-[rgba(255,64,96,0.1)]',
        borderClass: 'border-[rgba(255,64,96,0.3)]',
        barColor: '#ff4060',
      }
    case 'warning':
      return {
        hex: '#ffb020',
        label: 'WARNING',
        tagClass: 'tag tag-amber',
        textClass: 'text-[#ffb020]',
        bgClass: 'bg-[rgba(255,176,32,0.1)]',
        borderClass: 'border-[rgba(255,176,32,0.3)]',
        barColor: '#ffb020',
      }
    default:
      return {
        hex: '#00e5a0',
        label: 'NORMAL',
        tagClass: 'tag tag-green',
        textClass: 'text-[#00e5a0]',
        bgClass: 'bg-[rgba(0,229,160,0.1)]',
        borderClass: 'border-[rgba(0,229,160,0.3)]',
        barColor: '#00e5a0',
      }
  }
}

export function formatPercent(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

export function formatScore(v: number): string {
  return v.toFixed(2)
}

export function formatTemp(v: number): string {
  return `${v.toFixed(1)}°C`
}

export function formatWatt(v: number): string {
  return `${(v / 1000).toFixed(1)} kW`
}

export function fromNow(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
