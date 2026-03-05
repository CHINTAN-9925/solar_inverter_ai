import type { Metadata } from 'next'
import '../styles/globals.css'
import Sidebar from '../components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'SolarAI — Inverter Monitoring',
  description: 'AI-powered solar inverter failure prediction and monitoring dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="md:ml-[60px] lg:ml-[220px] pb-16 md:pb-0 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
