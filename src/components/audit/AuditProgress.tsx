'use client'

import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

type AuditStatus = 'PENDING' | 'CRAWLING' | 'ANALYZING' | 'COMPLETE' | 'FAILED'

interface AuditProgressProps {
  status: AuditStatus
  crawledPages: number
  elapsed: number
}

const STAGES: { key: AuditStatus | 'PENDING'; label: string; pct: number }[] = [
  { key: 'PENDING',   label: 'Initializing',    pct: 5  },
  { key: 'CRAWLING',  label: 'Crawling website', pct: 45 },
  { key: 'ANALYZING', label: 'AI analysis',      pct: 80 },
  { key: 'COMPLETE',  label: 'Audit complete',   pct: 100 },
]

export function AuditProgress({ status, crawledPages, elapsed }: AuditProgressProps) {
  const currentIdx = STAGES.findIndex(s => s.key === status)
  const pct = status === 'FAILED' ? 0 : (STAGES[currentIdx]?.pct ?? 5)
  const label = status === 'FAILED' ? 'Audit failed' : (STAGES[currentIdx]?.label ?? 'Initializing')

  const fmtElapsed = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-white/40 mb-2">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              status === 'FAILED' ? 'bg-red-500' :
              status === 'COMPLETE' ? 'bg-green-500' : 'progress-animated'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {STAGES.map((stage, i) => {
          const done = currentIdx > i
          const active = currentIdx === i && status !== 'FAILED'

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                done   ? 'bg-green-500/20' :
                active ? 'bg-brand-500/20' : 'bg-white/[0.04]'
              }`}>
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                ) : active ? (
                  <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                ) : status === 'FAILED' && i === currentIdx ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>
              <span className={`text-sm ${done || active ? 'text-white/70' : 'text-white/25'}`}>
                {stage.label}
              </span>
              {stage.key === 'CRAWLING' && active && crawledPages > 0 && (
                <span className="ml-auto text-xs text-white/30">{crawledPages} pages</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between text-xs text-white/25 pt-4 border-t border-white/[0.06]">
        <span>Elapsed: {fmtElapsed}</span>
        {crawledPages > 0 && <span>{crawledPages} pages crawled</span>}
      </div>
    </div>
  )
}
