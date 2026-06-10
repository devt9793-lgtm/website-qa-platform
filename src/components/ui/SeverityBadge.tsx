import { clsx } from 'clsx'
import type { Severity } from '@/types'

interface BadgeProps {
  severity: Severity
  className?: string
}

const config: Record<Severity, { label: string; classes: string }> = {
  CRITICAL: { label: 'Critical', classes: 'bg-red-500/15 text-red-400 border-red-500/25' },
  HIGH:     { label: 'High',     classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  MEDIUM:   { label: 'Medium',  classes: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25' },
  LOW:      { label: 'Low',     classes: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
}

export function SeverityBadge({ severity, className }: BadgeProps) {
  const { label, classes } = config[severity]
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', classes, className)}>
      {label}
    </span>
  )
}
