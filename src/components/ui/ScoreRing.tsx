interface ScoreRingProps {
  score: number
  size?: number
}

export function ScoreRing({ score, size = 112 }: ScoreRingProps) {
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const cx = size / 2
  const cy = size / 2
  const strokeWidth = size * 0.09

  const color =
    score >= 80 ? '#22c55e' :
    score >= 60 ? '#eab308' :
    score >= 40 ? '#f97316' : '#ef4444'

  const label =
    score >= 80 ? 'Good' :
    score >= 60 ? 'Fair' :
    score >= 40 ? 'Poor' : 'Critical'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white leading-none">{score}</div>
        <div className="text-xs text-white/40 mt-1">{label}</div>
      </div>
    </div>
  )
}
