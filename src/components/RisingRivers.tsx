import { useMemo } from 'react'
import { Waves, TrendingUp, ArrowRight } from 'lucide-react'
import { useRivers, type RiverSiteSummary } from '@/hooks/useRivers'
import { useAllRiverHistories, type RiverSparklineData } from '@/hooks/useAllRiverHistories'

interface RisingRiversProps {
  /** Called when a user taps a card or the header CTA — should switch to
   *  the Rivers tab. */
  onOpenRivers?: () => void
}

const MAX_SITES = 10

function riverKey(s: Pick<RiverSiteSummary, 'council' | 'name'>): string {
  return `${s.council}::${s.name}`
}

/**
 * Generate an SVG polyline path fitting the spark values into the given
 * viewBox. Returns null if the data is too flat or empty.
 */
function sparklinePath(data: RiverSparklineData, width: number, height: number): string | null {
  const vals = data.values.filter((v) => !Number.isNaN(v))
  if (vals.length < 2) return null
  const { min, max } = data
  const range = max - min || 1
  const stepX = width / (data.values.length - 1 || 1)
  const pts: string[] = []
  for (let i = 0; i < data.values.length; i++) {
    const v = data.values[i]
    if (Number.isNaN(v)) continue
    const x = i * stepX
    // invert y so higher readings plot towards the top of the viewBox
    const y = height - ((v - min) / range) * height
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
}

interface CardProps {
  site: RiverSiteSummary
  spark: RiverSparklineData | undefined
  onClick?: () => void
}

function Card({ site, spark, onClick }: CardProps) {
  const width = 120
  const height = 32
  const path = spark ? sparklinePath(spark, width, height) : null
  const pct = site.change_pct ?? 0
  const changeLabel = `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
  const severity: 'danger' | 'warn' | 'neutral' =
    pct >= 50 ? 'danger' : pct >= 15 ? 'warn' : 'neutral'

  const severityStyles = {
    danger: 'border-red-500/40 bg-red-500/5 text-red-300',
    warn: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
    neutral: 'border-sky-500/30 bg-sky-500/5 text-sky-300',
  }[severity]

  const lineColour = {
    danger: '#f87171', // red-400
    warn: '#fbbf24', // amber-400
    neutral: '#38bdf8', // sky-400
  }[severity]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex-shrink-0 w-[220px] sm:w-auto text-left rounded-lg border ${severityStyles} p-3 transition-all hover:border-white/30 hover:bg-white/[0.04] active:scale-[0.98]`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-white/90 truncate leading-tight">
            {site.name}
          </div>
          <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider truncate mt-0.5">
            {site.council_name ?? site.council}
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-0.5 rounded-sm border px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums ${severityStyles}`}
        >
          <TrendingUp className="h-2.5 w-2.5" />
          {changeLabel}
        </span>
      </div>

      {/* Sparkline */}
      <div className="relative h-[32px] w-full overflow-hidden rounded-sm bg-black/20">
        {path ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            <polyline
              points={path}
              fill="none"
              stroke={lineColour}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[9px] text-white/30 font-mono uppercase tracking-wider">
            No history
          </div>
        )}
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="font-mono text-[11px] text-white/70 tabular-nums">
          {site.latest_value != null ? site.latest_value.toFixed(2) : '—'}
          {site.unit && (
            <span className="ml-0.5 text-white/40 text-[9px]">{site.unit}</span>
          )}
        </div>
        {site.baseline_value != null && (
          <div className="text-[9px] text-white/35 font-mono tabular-nums">
            from {site.baseline_value.toFixed(2)}
          </div>
        )}
      </div>
    </button>
  )
}

export function RisingRivers({ onOpenRivers }: RisingRiversProps) {
  const { data: rivers, isLoading } = useRivers()
  const { data: histories } = useAllRiverHistories()

  const rising = useMemo(() => {
    if (!rivers) return []
    return rivers
      .filter(
        (r) =>
          r.change != null &&
          r.change > 0 &&
          r.change_pct != null &&
          r.change_pct > 0 &&
          r.latest_value != null &&
          Number.isFinite(r.change_pct),
      )
      .sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
      .slice(0, MAX_SITES)
  }, [rivers])

  if (isLoading && !rivers) {
    return null
  }
  if (rising.length === 0) {
    return null
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <Waves className="h-3.5 w-3.5 text-sky-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              Top Rising Rivers
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              {rising.length} of 1,700+ gauges · last 24 h
            </div>
          </div>
        </div>
        {onOpenRivers && (
          <button
            type="button"
            onClick={onOpenRivers}
            className="group flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
          >
            All gauges
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Mobile: horizontal scroll row. Desktop: grid. */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 sm:grid sm:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:gap-2 sm:pb-0 sm:mx-0 sm:px-0">
        {rising.map((site) => (
          <div key={riverKey(site)} className="snap-start">
            <Card site={site} spark={histories?.get(riverKey(site))} onClick={onOpenRivers} />
          </div>
        ))}
      </div>
    </div>
  )
}
