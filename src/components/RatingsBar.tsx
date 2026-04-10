import type { Ratings } from '@/hooks/useSummary'
import { AlertTriangle, CloudLightning, HeartPulse, Building2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function scoreColor(score: number): string {
  if (score >= 9) return 'text-red-300 bg-red-500/25 border-red-500/40'
  if (score >= 7) return 'text-red-400 bg-red-500/15 border-red-500/30'
  if (score >= 5) return 'text-amber-300 bg-amber-500/15 border-amber-500/30'
  if (score >= 3) return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25'
  return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25'
}

function barColor(score: number): string {
  if (score >= 9) return 'bg-red-400'
  if (score >= 7) return 'bg-red-500'
  if (score >= 5) return 'bg-amber-400'
  if (score >= 3) return 'bg-yellow-400'
  return 'bg-emerald-400'
}

interface MetricProps {
  icon: LucideIcon
  label: string
  score: number
  compact?: boolean
}

function Metric({ icon: Icon, label, score, compact }: MetricProps) {
  const pct = (score / 10) * 100
  return (
    <div
      className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} bg-black/30 border border-white/5 rounded-md`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-white/50 shrink-0`} />
          <span
            className={`${compact ? 'text-[8px]' : 'text-[9px]'} uppercase tracking-wider text-white/60 font-semibold truncate`}
          >
            {label}
          </span>
        </div>
        <span
          className={`${compact ? 'text-[10px] px-1 py-0' : 'text-[11px] px-1.5 py-0.5'} font-mono font-bold border rounded ${scoreColor(score)} tabular-nums shrink-0`}
        >
          {score}/10
        </span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor(score)} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

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

export function RatingsBar({ ratings, compact = false, showRationale = true }: RatingsBarProps) {
  return (
    <div className="space-y-2">
      <div
        className={`grid grid-cols-2 ${compact ? 'sm:grid-cols-4' : 'md:grid-cols-4'} gap-1.5`}
      >
        <Metric icon={AlertTriangle} label="Seriousness" score={ratings.seriousness} compact={compact} />
        <Metric
          icon={CloudLightning}
          label="Weather"
          score={ratings.weather_extremity}
          compact={compact}
        />
        <Metric
          icon={HeartPulse}
          label="Public Risk"
          score={ratings.public_safety_risk}
          compact={compact}
        />
        <Metric
          icon={Building2}
          label="Infra Risk"
          score={ratings.infrastructure_risk}
          compact={compact}
        />
      </div>
      {showRationale && (ratings.rationale || ratings.trajectory) && (
        <div className="flex items-start gap-2 flex-wrap">
          <TrajectoryBadge trajectory={ratings.trajectory} />
          {ratings.rationale && (
            <p className="text-[11px] text-white/60 leading-relaxed flex-1 min-w-[200px]">
              {ratings.rationale}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export { scoreColor, barColor }
