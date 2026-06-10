'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface AuditPollData {
  id: string
  url: string
  status: 'PENDING' | 'CRAWLING' | 'ANALYZING' | 'COMPLETE' | 'FAILED'
  crawledPages: number
  score?: number
  totalIssues?: number
  criticalCount?: number
}

const STAGES = [
  { key: 'PENDING',   label: 'Initializing',       pct: 5  },
  { key: 'CRAWLING',  label: 'Crawling website',    pct: 45 },
  { key: 'ANALYZING', label: 'AI analysis',         pct: 80 },
  { key: 'COMPLETE',  label: 'Audit complete',      pct: 100 },
  { key: 'FAILED',    label: 'Audit failed',        pct: 0  },
]

export default function AuditProgressPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<AuditPollData | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${id}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
      if (json.status === 'COMPLETE') {
        setTimeout(() => router.push(`/report/result/${id}`), 1200)
      }
    } catch {}
  }, [id, router])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 2500)
    return () => clearInterval(interval)
  }, [poll])

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentStage = STAGES.find(s => s.key === data?.status) ?? STAGES[0]
  const pct = currentStage.pct

  const fmtElapsed = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-[#0a0d14] grid-bg flex flex-col">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-brand-500 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">SiteAudit</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Card */}
          <div className="bg-[#111520] border border-white/[0.07] rounded-2xl p-8">
            {/* Status icon */}
            <div className="flex justify-center mb-6">
              {data?.status === 'COMPLETE' ? (
                <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              ) : data?.status === 'FAILED' ? (
                <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                </div>
              )}
            </div>

            <h1 className="text-xl font-semibold text-white text-center mb-1">
              {data?.status === 'COMPLETE' ? 'Audit complete!' :
               data?.status === 'FAILED' ? 'Audit failed' :
               'Running audit...'}
            </h1>
            <p className="text-sm text-white/40 text-center mb-8 truncate">
              {data?.url ?? ''}
            </p>

            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>{currentStage.label}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    data?.status === 'FAILED' ? 'bg-red-500' :
                    data?.status === 'COMPLETE' ? 'bg-green-500' : 'progress-animated'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Stages list */}
            <div className="space-y-3 mb-8">
              {STAGES.filter(s => s.key !== 'FAILED').map((stage, i) => {
                const stageIdx = STAGES.findIndex(s => s.key === data?.status)
                const thisIdx = STAGES.findIndex(s => s.key === stage.key)
                const done = stageIdx > thisIdx
                const active = stageIdx === thisIdx

                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-green-500/20' :
                      active ? 'bg-brand-500/20' : 'bg-white/[0.04]'
                    }`}>
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      ) : active ? (
                        <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      )}
                    </div>
                    <span className={`text-sm ${done || active ? 'text-white/70' : 'text-white/25'}`}>
                      {stage.label}
                    </span>
                    {stage.key === 'CRAWLING' && active && data?.crawledPages != null && (
                      <span className="ml-auto text-xs text-white/30">{data.crawledPages} pages</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Stats footer */}
            <div className="flex justify-between text-xs text-white/25 pt-5 border-t border-white/[0.06]">
              <span>Elapsed: {fmtElapsed}</span>
              {data?.crawledPages != null && <span>{data.crawledPages} pages crawled</span>}
            </div>

            {/* CTA when complete */}
            {data?.status === 'COMPLETE' && (
              <Link href={`/report/result/${id}`}
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors text-sm">
                View Full Report <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {data?.status === 'FAILED' && (
              <Link href="/"
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg font-medium transition-colors text-sm">
                Try Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
