'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import {
  Shield, Plus, LogOut, Globe, Clock, TrendingUp,
  AlertTriangle, Search, Loader2, ArrowRight
} from 'lucide-react'

interface AuditRow {
  id: string
  url: string
  status: string
  score?: number
  totalIssues: number
  criticalCount: number
  highCount: number
  crawledPages: number
  createdAt: string
  completedAt?: string
}

function scoreColor(score?: number) {
  if (!score) return 'text-white/30'
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [audits, setAudits] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [starting, setStarting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('google', { callbackUrl: '/dashboard' })
    }
  }, [status])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/audits')
      .then(r => r.json())
      .then(d => { setAudits(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status])

  async function startAudit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setStarting(true)
    try {
      let auditUrl = url.trim()
      if (!auditUrl.startsWith('http')) auditUrl = `https://${auditUrl}`
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: auditUrl }),
      })
      const data = await res.json()
      router.push(`/audit/${data.auditId}`)
    } finally {
      setStarting(false)
    }
  }

  const filtered = audits.filter(a =>
    !search || a.url.toLowerCase().includes(search.toLowerCase())
  )

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {/* Sidebar + main layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-60 min-h-screen border-r border-white/[0.06] bg-[#0a0d14] sticky top-0 h-screen flex flex-col">
          <div className="p-5 border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white text-sm">SiteAudit</span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <div className="text-xs text-white/25 uppercase tracking-wider px-3 mb-3">Menu</div>
            <Link href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-500/10 text-brand-500 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Audits
            </Link>
          </nav>

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
            <button onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Audit History</h1>
              <p className="text-sm text-white/35 mt-1">
                {audits.length} audit{audits.length !== 1 ? 's' : ''} total
              </p>
            </div>
          </div>

          {/* New audit form */}
          <form onSubmit={startAudit} className="mb-8">
            <div className="flex gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] focus-within:border-brand-500/40 transition-colors max-w-2xl">
              <div className="flex items-center pl-3">
                <Globe className="w-4 h-4 text-white/25" />
              </div>
              <input
                type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="Enter website URL to audit..."
                className="flex-1 bg-transparent text-white placeholder-white/20 outline-none text-sm py-2"
                disabled={starting}
              />
              <button type="submit" disabled={starting || !url.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                {starting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</> :
                  <><Plus className="w-3.5 h-3.5" /> New Audit</>}
              </button>
            </div>
          </form>

          {/* Search */}
          {audits.length > 0 && (
            <div className="relative mb-4 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter by URL..."
                className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 outline-none"
              />
            </div>
          )}

          {/* Audit table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Globe className="w-10 h-10 text-white/10 mx-auto mb-4" />
              <p className="text-white/30 text-sm">No audits yet. Enter a URL above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(audit => (
                <div key={audit.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors group">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    audit.status === 'COMPLETE' ? 'bg-green-500' :
                    audit.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
                  }`} />

                  {/* URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{audit.url}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/25 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(audit.createdAt).toLocaleDateString()}
                      </span>
                      {audit.crawledPages > 0 && (
                        <span className="text-xs text-white/25">{audit.crawledPages} pages</span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  {audit.status === 'COMPLETE' && audit.score != null && (
                    <div className={`text-xl font-bold ${scoreColor(audit.score)}`}>
                      {audit.score}
                    </div>
                  )}

                  {/* Issue counts */}
                  {audit.status === 'COMPLETE' && (
                    <div className="flex items-center gap-2">
                      {audit.criticalCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
                          {audit.criticalCount} critical
                        </span>
                      )}
                      {audit.highCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20">
                          {audit.highCount} high
                        </span>
                      )}
                    </div>
                  )}

                  {audit.status === 'FAILED' && (
                    <span className="text-xs text-red-400/70 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}

                  {/* CTA */}
                  {audit.status === 'COMPLETE' ? (
                    <Link href={`/report/result/${audit.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors whitespace-nowrap">
                      View Report <ArrowRight className="w-3 h-3" />
                    </Link>
                  ) : audit.status === 'FAILED' ? null : (
                    <Link href={`/audit/${audit.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors whitespace-nowrap">
                      <Loader2 className="w-3 h-3 animate-spin" /> View progress
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
