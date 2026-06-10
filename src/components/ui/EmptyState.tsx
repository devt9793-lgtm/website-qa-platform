import { clsx } from 'clsx'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-20 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 text-white/20">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-white/40 mb-1">{title}</h3>
      {description && <p className="text-xs text-white/25 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
