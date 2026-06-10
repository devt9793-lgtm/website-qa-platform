'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { SeverityBadge } from '@/components/ui'
import type { Severity } from '@/types'

interface FindingCardProps {
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

export function FindingCard({
  category, severity, title, description, url, evidence, fixGuide, complexity, businessImpact
}: FindingCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <SeverityBadge severity={severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{title}</span>
            <span className="text-xs text-white/30 px-2 py-0.5 rounded-full border border-white/10">
              {category}
            </span>
          </div>
          {url && <p className="text-xs text-white/30 mt-1 truncate">{url}</p>}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
          <p className="pt-3 text-sm text-white/60 leading-relaxed">{description}</p>

          {evidence && (
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05]">
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1 font-medium">Evidence</p>
              <p className="text-xs text-white/55 font-mono leading-relaxed">{evidence}</p>
            </div>
          )}

          {businessImpact && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-1 font-medium">Business Impact</p>
              <p className="text-sm text-white/55 leading-relaxed">{businessImpact}</p>
            </div>
          )}

          {fixGuide && (
            <div className="bg-brand-500/[0.06] rounded-lg p-3 border border-brand-500/15">
              <p className="text-xs text-brand-500/70 uppercase tracking-wide mb-1 font-medium">Recommended Fix</p>
              <p className="text-sm text-white/65 leading-relaxed">{fixGuide}</p>
              {complexity && (
                <p className="text-xs text-white/30 mt-2">Complexity: {complexity}</p>
              )}
            </div>
          )}

          {url && (
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-500/80 transition-colors"
            >
              View page <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
