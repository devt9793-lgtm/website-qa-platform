'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, TrendingUp, LogOut } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Audits', icon: TrendingUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-60 min-h-screen border-r border-white/[0.06] bg-[#0a0d14] sticky top-0 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">SiteAudit</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs text-white/25 uppercase tracking-wider px-3 mb-3">Menu</p>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-brand-500/10 text-brand-500'
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/[0.06]">
        {session?.user && (
          <div className="flex items-center gap-3 mb-3">
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.user.name}</p>
              <p className="text-xs text-white/30 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
