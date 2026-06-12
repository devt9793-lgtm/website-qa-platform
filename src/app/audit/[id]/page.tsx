'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Shield, CheckCircle2, XCircle, Loader2, ArrowRight, Globe } from 'lucide-react'
import Link from 'next/link'

interface AuditPollData {
  id: string
  url: string
  status: 'PENDING' | 'CRAWLING' | 'ANALYZING' | 'COMPLETE' | 'FAILED'
  crawledPages: number
  score?: number
}

function AuditProgressContent() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [data, setData] = useState<AuditPollData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [crawledPages, setCrawledPages] = useState(0)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [sitemapCount, setSitemapCount] = useState<number | null>(null)
  const [stage, setStage] = useState<'idle' | 'crawling' | 'analyzing' | 'complete' | 'failed'>('idle')
  const [statusMsg, setStatusMsg] = useState('Starting...')

  const crawlingRef = useRef(false)
  const keyRef = useRef('')

  const runBatchCrawl = useCallback(async (auditKey: string) => {
    if (crawlingRef.current) return
    crawlingRef.current = true
    keyRef.current = auditKey

    setStage('crawling')
    setStatusMsg('Initializing crawl...')

    let done = false

    while (!done) {
      try {
        const res = await fetch(`/api/audit/${id}/crawl`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        // if (!res.ok) {
        //   setStage('failed')
        //   setStatusMsg('Crawl failed')
        //   return
        // }
        if (!res.ok) {
          if (res.status === 504) {
            // Timeout — just try again, don't fail
            await new Promise(r => setTimeout(r, 2000))
            continue
          }
          setStage('failed')
          setStatusMsg('Crawl failed')
          return
        }

        const result = await res.json()
        done = result.done
        setCrawledPages(result.crawledPages)
        setRemaining(result.remaining)

        if (result.isFirstBatch && result.sitemapCount) {
          setSitemapCount(result.sitemapCount)
          setStatusMsg(`Found ${result.sitemapCount} URLs in sitemap. Crawling...`)
        } else {
          setStatusMsg(`Crawled ${result.crawledPages} pages, ${result.remaining} remaining...`)
        }

        if (!done) await new Promise(r => setTimeout(r, 500))

      } catch {
        setStage('failed')
        setStatusMsg('Crawl failed - network error')
        return
      }
    }

    setStage('analyzing')
    setStatusMsg('Running AI analysis...')

    try {
      const res = await fetch(`/api/audit/${id}/analyse`, {
        method: 'POST',
        headers: { 'x-anthropic-key': auditKey },
      })

      if (!res.ok) {
        const err = await res.json()
        setStage('failed')
        setStatusMsg(err.error || 'Analysis failed')
        return
      }

      setStage('complete')
      setStatusMsg('Audit complete!')
      setTimeout(() => router.push(`/report/result/${id}`), 1500)

    } catch {
      setStage('failed')
      setStatusMsg('Analysis failed')
    }
  }, [id, router])

  useEffect(() => {
    const key = searchParams.get('key')
    if (!key || !id) return
    runBatchCrawl(key)
  }, [id, searchParams, runBatchCrawl])

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit/${id}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch {}
  }, [id])

  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [pollStatus])

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const displayStages = [
    { key: 'crawling',  label: 'Crawling website', pct: 45 },
    { key: 'analyzing', label: 'AI analysis',      pct: 80 },
    { key: 'complete',  label: 'Audit complete',   pct: 100 },
  ]

  const pct = stage === 'idle'      ? 5 :
              stage === 'crawling'  ? Math.min(44, 5 + (crawledPages * 2)) :
              stage === 'analyzing' ? 80 :
              stage === 'complete'  ? 100 : 0

  const fmtElapsed = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-[#0a0d14] grid-bg flex flex-col">
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
          <div className="bg-[#111520] border border-white/[0.07] rounded-2xl p-8">

            <div className="flex justify-center mb-6">
              {stage === 'complete' ? (
                <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
              ) : stage === 'failed' ? (
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
              {stage === 'complete' ? 'Audit complete!' :
               stage === 'failed'   ? 'Audit failed' : 'Running audit...'}
            </h1>
            <p className="text-sm text-white/40 text-center mb-2 truncate">{data?.url ?? ''}</p>
            <p className="text-xs text-white/30 text-center mb-6">{statusMsg}</p>

            <div className="mb-6">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>{statusMsg}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stage === 'failed'   ? 'bg-red-500' :
                    stage === 'complete' ? 'bg-green-500' : 'progress-animated'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {displayStages.map((s) => {
                const done   = (stage === 'complete') ||
                               (s.key === 'crawling' && ['analyzing', 'complete'].includes(stage))
                const active = s.key === stage
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done   ? 'bg-green-500/20' :
                      active ? 'bg-brand-500/20' : 'bg-white/[0.04]'
                    }`}>
                      {done   ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> :
                       active ? <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" /> :
                                <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                    </div>
                    <span className={`text-sm ${done || active ? 'text-white/70' : 'text-white/25'}`}>
                      {s.label}
                    </span>
                    {s.key === 'crawling' && active && (
                      <span className="ml-auto text-xs text-white/30">
                        {crawledPages} crawled{remaining !== null ? `, ${remaining} queued` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {sitemapCount !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-500/[0.06] border border-brand-500/15 mb-4">
                <Globe className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                <p className="text-xs text-white/50">
                  Found <span className="text-brand-500 font-medium">{sitemapCount} URLs</span> in sitemap — crawling all pages in batches
                </p>
              </div>
            )}

            <div className="flex justify-between text-xs text-white/25 pt-4 border-t border-white/[0.06]">
              <span>Elapsed: {fmtElapsed}</span>
              <span>{crawledPages} pages crawled</span>
            </div>

            {stage === 'complete' && (
              <Link href={`/report/result/${id}`}
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors text-sm">
                View Full Report <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {stage === 'failed' && (
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

export default function AuditProgressPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500/30 border-t-brand-500 animate-spin" />
      </div>
    }>
      <AuditProgressContent />
    </Suspense>
  )
}
