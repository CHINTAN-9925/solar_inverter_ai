'use client'
import Topbar from '../../components/layout/Topbar'
import InverterTable from '../../components/dashboard/InverterTable'
import { useInverters } from '../../hooks/useInverters'

export default function InvertersPage() {
  const { inverters, isLoading } = useInverters()

  return (
    <div>
      <Topbar title="Inverter Fleet" />
      <main className="p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gradient-cyan">Inverter Fleet</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{inverters.length} inverters across blocks A, B, C</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
          <InverterTable inverters={inverters} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
