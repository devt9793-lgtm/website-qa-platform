'use client'

import { useState, useMemo } from 'react'
import {
  Shield, Share2, Download, ChevronDown, ChevronUp,
  ExternalLink, Copy, CheckCheck, Search, Filter
} from 'lucide-react'
import Link from 'next/link'
import type { Severity } from '@/types'

interface Finding {
  id: string
  category: string
  severity: Severity
  title: string
  description: string
  url?: string | null
  evidence?: string | null
  fixGuide?: string | null
  complexity?: string | null
  businessImpact?: string | null
}

interface ShareLink {
  slug: string
  expiresAt: string
}

interface ReportData {
  id: string
  url: string
  score: number
  status: string
  summary?: string | null
  crawledPages: number
  totalIssues: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  startedAt: string
  completedAt?: string | null
  findings: Finding[]
  shareLinks?: ShareLink[]
  expiresAt?: string  // set on shared reports
}

const SEV_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function ScoreRing({ score }: { score: number }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112" viewBox="0 0 112 112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white">{score}</div>
        <div className="text-xs text-white/40 -mt-0.5">/ 100</div>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const classes = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${classes[severity]}`}>
      {severity}
    </span>
  )
}

function FindingCard({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <SeverityBadge severity={finding.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{finding.title}</span>
            <span className="text-xs text-white/30 px-2 py-0.5 rounded-full border border-white/10">{finding.category}</span>
          </div>
          {finding.url && (
            <p className="text-xs text-white/30 mt-1 truncate">{finding.url}</p>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" /> :
                <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
          <div className="pt-3">
            <p className="text-sm text-white/60 leading-relaxed">{finding.description}</p>
          </div>

          {finding.evidence && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1 font-medium">Evidence</p>
              <p className="text-xs text-white/55 font-mono leading-relaxed">{finding.evidence}</p>
            </div>
          )}

          {finding.businessImpact && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1 font-medium">Business Impact</p>
              <p className="text-sm text-white/55 leading-relaxed">{finding.businessImpact}</p>
            </div>
          )}

          {finding.fixGuide && (
            <div className="bg-brand-500/[0.06] rounded-lg p-3 border border-brand-500/15">
              <p className="text-xs text-brand-500/70 uppercase tracking-wide mb-1 font-medium">Recommended Fix</p>
              <p className="text-sm text-white/65 leading-relaxed">{finding.fixGuide}</p>
              {finding.complexity && (
                <p className="text-xs text-white/30 mt-2">Complexity: {finding.complexity}</p>
              )}
            </div>
          )}

          {finding.url && (
            <a href={finding.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-500/80 transition-colors">
              View page <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReportView({ data, isShared = false }: { data: ReportData; isShared?: boolean }) {
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState<Severity | 'ALL'>('ALL')
  const [filterCat, setFilterCat] = useState<string>('ALL')

  const categories = useMemo(() =>
    ['ALL', ...Array.from(new Set(data.findings.map(f => f.category))).sort()],
    [data.findings]
  )

  const filtered = useMemo(() =>
    data.findings
      .filter(f =>
        (filterSev === 'ALL' || f.severity === filterSev) &&
        (filterCat === 'ALL' || f.category === filterCat) &&
        (!search || f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
    [data.findings, filterSev, filterCat, search]
  )

  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditId: data.id }),
      })
      const json = await res.json()
      setShareUrl(json.url)
    } finally {
      setSharing(false)
    }
  }

  function copyShare() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportCSV() {
    window.open(`/api/export/${data.id}?format=csv`, '_blank')
  }
  function exportJSON() {
    window.open(`/api/export/${data.id}?format=json`, '_blank')
  }

  const scoreLabel = data.score >= 80 ? 'Good' : data.score >= 60 ? 'Fair' : data.score >= 40 ? 'Poor' : 'Critical'

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-[#0a0d14]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white text-sm">SiteAudit</span>
          </Link>

          {!isShared && (
            <div className="flex items-center gap-2">
              <button onClick={handleShare} disabled={sharing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
                {sharing ? 'Generating...' : 'Share'}
              </button>
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-[#161c2d] border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors">
                    Export CSV
                  </button>
                  <button onClick={exportJSON} className="w-full text-left px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors border-t border-white/[0.06]">
                    Export JSON
                  </button>
                </div>
              </div>
              <Link href="/dashboard"
                className="px-3 py-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors">
                Dashboard
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Share URL banner */}
        {shareUrl && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <CheckCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm text-white/60 truncate flex-1">{shareUrl}</span>
            <button onClick={copyShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors whitespace-nowrap">
              {copied ? <><CheckCheck className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy link</>}
            </button>
          </div>
        )}

        {isShared && data.expiresAt && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400/80">
            This shared report expires on {new Date(data.expiresAt).toLocaleDateString()}
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Score card */}
          <div className="bg-[#111520] border border-white/[0.07] rounded-2xl p-6 flex items-center gap-6">
            <ScoreRing score={data.score ?? 0} />
            <div>
              <div className="text-2xl font-bold text-white">{scoreLabel}</div>
              <div className="text-sm text-white/40 mt-0.5">Overall score</div>
              <div className="text-xs text-white/30 mt-2">{data.crawledPages} pages crawled</div>
            </div>
          </div>

          {/* Issue counts */}
          <div className="flex-1 bg-[#111520] border border-white/[0.07] rounded-2xl p-6">
            <div className="text-sm text-white/40 mb-4">Issues by severity</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Critical', count: data.criticalCount, cls: 'text-red-400 bg-red-500/10' },
                { label: 'High', count: data.highCount, cls: 'text-orange-400 bg-orange-500/10' },
                { label: 'Medium', count: data.mediumCount, cls: 'text-yellow-400 bg-yellow-500/10' },
                { label: 'Low', count: data.lowCount, cls: 'text-blue-400 bg-blue-500/10' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 ${s.cls.split(' ')[1]}`}>
                  <div className={`text-2xl font-bold ${s.cls.split(' ')[0]}`}>{s.count}</div>
                  <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* URL & meta */}
        <div className="bg-[#111520] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/30 uppercase tracking-wide mb-1">Audited URL</div>
            <a href={data.url} target="_blank" rel="noopener noreferrer"
              className="text-brand-500 text-sm hover:underline truncate block">{data.url}</a>
          </div>
          <div className="text-right text-xs text-white/25">
            {data.completedAt && <div>{new Date(data.completedAt).toLocaleString()}</div>}
            <div>{data.totalIssues} total issues</div>
          </div>
        </div>

        {/* Executive summary */}
        {data.summary && (
          <div className="bg-[#111520] border border-white/[0.07] rounded-2xl p-6">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-wide mb-3">Executive Summary</h2>
            <p className="text-white/65 text-sm leading-relaxed whitespace-pre-line">{data.summary}</p>
          </div>
        )}

        {/* Findings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Findings <span className="text-white/30 font-normal text-base">({filtered.length})</span>
            </h2>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search findings..."
                className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/25 outline-none focus:border-brand-500/50"
              />
            </div>

            <select value={filterSev} onChange={e => setFilterSev(e.target.value as Severity | 'ALL')}
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/60 outline-none">
              <option value="ALL">All severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/60 outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/25">No findings match your filters.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(f => <FindingCard key={f.id} finding={f} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
