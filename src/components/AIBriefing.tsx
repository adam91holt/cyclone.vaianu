import { useEffect, useState } from 'react'
import { useLatestSummary } from '@/hooks/useSummary'
import { useComprehensiveReports } from '@/hooks/useComprehensiveReports'
import { Sparkles, ArrowRight, BookOpen, Globe } from 'lucide-react'
import { useSelectedRegion } from '@/context/RegionContext'

function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m ago`
}

function useNextTick(intervalMin: number, lastIso: string | null) {
  // Return "countdown to next 15-min rollup" based on the last summary time.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  if (!lastIso) return null
  const last = new Date(lastIso).getTime()
  const next = last + intervalMin * 60_000
  const remaining = Math.max(0, next - now)
  const mins = Math.floor(remaining / 60_000)
  const secs = Math.floor((remaining % 60_000) / 1000)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

interface AIBriefingProps {
  onOpenReport?: () => void
}

export function AIBriefing({ onOpenReport }: AIBriefingProps) {
  const { data: summary, isLoading } = useLatestSummary()
  const { data: reports } = useComprehensiveReports(1)
  const latestReport = reports?.[0]
  const nextIn = useNextTick(15, summary?.generated_at ?? null)
  const { label: regionLabel, isFiltered } = useSelectedRegion()

  const severityStyles: Record<string, string> = {
    red: 'from-red-600/20 to-red-900/10 border-red-500/30',
    orange: 'from-amber-500/20 to-amber-800/10 border-amber-500/30',
    yellow: 'from-yellow-500/20 to-yellow-800/10 border-yellow-500/30',
    advisory: 'from-sky-500/20 to-sky-800/10 border-sky-500/30',
  }
  const severity = summary?.severity ?? 'red'

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${severityStyles[severity]} border backdrop-blur-sm p-5`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              AI Situation Report
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Claude Sonnet 4.6 · 15-min rollups
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          {summary && (
            <>
              <div className="text-[10px] text-white/50 uppercase tracking-wider">
                Generated {timeAgo(summary.generated_at)}
              </div>
              {nextIn && (
                <div className="text-[10px] font-mono text-white/70 tabular-nums">
                  Next in {nextIn}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading && !summary && (
        <div className="space-y-2">
          <div className="h-5 w-3/4 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-white/5 rounded animate-pulse" />
        </div>
      )}

      {summary && (
        <>
          <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight mb-2 text-white">
            {summary.headline}
          </h2>
          <p className="text-sm text-white/80 leading-relaxed mb-3">{summary.summary}</p>
          {isFiltered && (
            <div className="mb-3 flex items-center gap-1.5 text-[10px] text-white/50 font-mono uppercase tracking-wider">
              <Globe className="h-3 w-3" />
              Nationwide briefing · you're viewing {regionLabel}
            </div>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {summary.key_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[11px] text-white/75 bg-white/[0.04] border border-white/5 rounded-md px-2.5 py-1.5"
              >
                <span className="font-mono text-white/40 font-bold shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {latestReport && onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="mt-4 w-full group flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-colors px-3.5 py-2.5 text-left"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 group-hover:bg-white/15 transition-colors">
                <BookOpen className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/50 font-mono font-bold">
                    Deep Dive · Opus 4.6
                  </span>
                  <span className="text-[9px] font-mono text-white/35 tabular-nums">
                    {timeAgo(latestReport.generated_at)}
                  </span>
                </div>
                <div className="text-[12px] text-white/90 font-semibold leading-snug line-clamp-1">
                  {latestReport.headline}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/40 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          )}
        </>
      )}

      {!isLoading && !summary && (
        <div className="text-sm text-white/60">
          Preparing first briefing — new rollup every 15 minutes.
        </div>
      )}
    </div>
  )
}
