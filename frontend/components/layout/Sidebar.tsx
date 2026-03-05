'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cx } from '../../lib/utils'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    href: '/inverters',
    label: 'Fleet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/chat',
    label: 'AI Chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[60px] lg:w-[220px] flex-col bg-[var(--deep)] border-r border-[rgba(255,255,255,0.06)] z-40 py-5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 lg:px-4 mb-8">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(255,176,32,0.2))', border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 0 16px rgba(0,212,255,0.15)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="#ffb020" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="#ffb020" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="hidden lg:block font-bold text-sm tracking-widest text-[var(--text-primary)] uppercase">SolarAI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1 px-2">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  active
                    ? 'bg-[rgba(0,212,255,0.1)] text-[#00d4ff]'
                    : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]'
                )}
                style={active ? { boxShadow: 'inset 0 0 12px rgba(0,212,255,0.08)' } : {}}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                {active && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-[#00d4ff]" style={{ boxShadow: '0 0 6px #00d4ff' }} />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-2 hidden lg:flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs text-[var(--text-muted)]">LIVE · 30s refresh</span>
        </div>
        <div className="px-3 md:px-4 hidden md:flex lg:hidden justify-center">
          <span className="live-dot" />
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-[rgba(255,255,255,0.08)]"
        style={{ background: 'rgba(6,13,26,0.95)', backdropFilter: 'blur(20px)' }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                active ? 'text-[#00d4ff]' : 'text-[var(--text-muted)]'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
