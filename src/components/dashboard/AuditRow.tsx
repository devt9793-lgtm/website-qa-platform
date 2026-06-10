import Link from 'next/link'
import { Clock, ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface AuditRowProps {
  id: string
  url: string
  status: string
  score?: number | null
  totalIssues: number
  criticalCount: number
  highCount: number
  crawledPages: number
  createdAt: string
}

function scoreColor(score?: number | null) {
  if (!score) return 'text-white/30'
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

export function AuditRow({
  id, url, status, score, criticalCount, highCount, crawledPages, createdAt
}: AuditRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
      {/* Status dot */}
      <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
        'bg-green-500':              status === 'COMPLETE',
        'bg-red-500':                status === 'FAILED',
        'bg-yellow-500 animate-pulse': !['COMPLETE', 'FAILED'].includes(status),
      })} />

      {/* URL + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{url}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-white/25 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(createdAt).toLocaleDateString()}
          </span>
          {crawledPages > 0 && (
            <span className="text-xs text-white/25">{crawledPages} pages</span>
          )}
        </div>
      </div>

      {/* Score */}
      {status === 'COMPLETE' && score != null && (
        <div className={clsx('text-xl font-bold', scoreColor(score))}>{score}</div>
      )}

      {/* Issue badges */}
      {status === 'COMPLETE' && (
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/20">
              {highCount} high
            </span>
          )}
        </div>
      )}

      {status === 'FAILED' && (
        <span className="text-xs text-red-400/70 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Failed
        </span>
      )}

      {/* CTA */}
      {status === 'COMPLETE' ? (
        <Link href={`/report/result/${id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors whitespace-nowrap">
          View Report <ArrowRight className="w-3 h-3" />
        </Link>
      ) : status !== 'FAILED' ? (
        <Link href={`/audit/${id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/40 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors whitespace-nowrap">
          <Loader2 className="w-3 h-3 animate-spin" /> View progress
        </Link>
      ) : null}
    </div>
  )
}
