import type { Ratings } from '@/hooks/useSummary'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

function TrajectoryBadge({ trajectory }: { trajectory: Ratings['trajectory'] }) {
  const config = {
    intensifying: {
      icon: TrendingUp,
      label: 'Intensifying',
      className: 'text-red-300 bg-red-500/15 border-red-500/30',
    },
    steady: {
      icon: Minus,
      label: 'Holding Steady',
      className: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
    },
    weakening: {
      icon: TrendingDown,
      label: 'Weakening',
      className: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
    },
  }[trajectory]
  const Icon = config.icon
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 border rounded ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

interface RatingsBarProps {
  ratings: Ratings
  compact?: boolean
  showRationale?: boolean
}

export function RatingsBar({ ratings, showRationale = true }: RatingsBarProps) {
  if (!showRationale) return null
  if (!ratings.rationale && !ratings.trajectory) return null

  return (
    <div className="flex items-start gap-2 flex-wrap">
      {ratings.trajectory && <TrajectoryBadge trajectory={ratings.trajectory} />}
      {ratings.rationale && (
        <p className="text-[11px] text-white/60 leading-relaxed flex-1 min-w-[200px]">
          {ratings.rationale}
        </p>
      )}
    </div>
  )
}
