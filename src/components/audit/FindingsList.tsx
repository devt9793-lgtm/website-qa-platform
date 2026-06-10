'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { FindingCard } from './FindingCard'
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

const SEV_ORDER: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

interface FindingsListProps {
  findings: Finding[]
}

export function FindingsList({ findings }: FindingsListProps) {
  const [search, setSearch] = useState('')
  const [filterSev, setFilterSev] = useState<Severity | 'ALL'>('ALL')
  const [filterCat, setFilterCat] = useState('ALL')

  const categories = useMemo(() =>
    ['ALL', ...Array.from(new Set(findings.map(f => f.category))).sort()],
    [findings]
  )

  const filtered = useMemo(() =>
    findings
      .filter(f =>
        (filterSev === 'ALL' || f.severity === filterSev) &&
        (filterCat === 'ALL' || f.category === filterCat) &&
        (!search || f.title.toLowerCase().includes(search.toLowerCase()) ||
          f.description.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]),
    [findings, filterSev, filterCat, search]
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          Findings{' '}
          <span className="text-white/30 font-normal text-base">({filtered.length})</span>
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search findings..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-white/25 outline-none focus:border-brand-500/50"
          />
        </div>

        <select
          value={filterSev}
          onChange={e => setFilterSev(e.target.value as Severity | 'ALL')}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/60 outline-none"
        >
          <option value="ALL">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/60 outline-none"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm">
          No findings match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(f => <FindingCard key={f.id} {...f} />)}
        </div>
      )}
    </div>
  )
}
