import { clsx } from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'blue'
  className?: string
}

const colorMap = {
  default: 'text-white',
  red:     'text-red-400',
  orange:  'text-orange-400',
  yellow:  'text-yellow-400',
  green:   'text-green-400',
  blue:    'text-blue-400',
}

const bgMap = {
  default: 'bg-white/[0.03]',
  red:     'bg-red-500/10',
  orange:  'bg-orange-500/10',
  yellow:  'bg-yellow-500/10',
  green:   'bg-green-500/10',
  blue:    'bg-blue-500/10',
}

export function StatCard({ label, value, sub, color = 'default', className }: StatCardProps) {
  return (
    <div className={clsx('rounded-xl p-4', bgMap[color], className)}>
      <div className={clsx('text-2xl font-bold', colorMap[color])}>{value}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </div>
  )
}
