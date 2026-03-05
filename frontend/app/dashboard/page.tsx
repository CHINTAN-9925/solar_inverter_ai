'use client'
import Topbar from '../../components/layout/Topbar'
import RiskHeatmap from '../../components/dashboard/RiskHeatmap'
import InverterTable from '../../components/dashboard/InverterTable'
import { useInverters } from '../../hooks/useInverters'

export default function DashboardPage() {
  const { inverters, isLoading } = useInverters()

  return (
    <div>
      <Topbar title="Operations Dashboard" />
      <main className="p-4 md:p-6 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gradient-mixed">Operations Dashboard</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Real-time fleet monitoring · HACKaMINeD 2026</p>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5a0]" style={{ boxShadow: '0 0 6px #00e5a0' }} />
            <span className="text-[#00e5a0]">All systems nominal</span>
          </div>
        </div>

        {/* Block Risk Heatmap */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Block Risk Overview</h3>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>
          <RiskHeatmap inverters={inverters} isLoading={isLoading} />
        </section>

        {/* Fleet table */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Inverter Fleet</h3>
            <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
          </div>
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(145deg, var(--card), var(--deep))', border: '1px solid rgba(255,255,255,0.07)' }}>
            <InverterTable inverters={inverters} isLoading={isLoading} />
          </div>
        </section>
      </main>
    </div>
  )
}
