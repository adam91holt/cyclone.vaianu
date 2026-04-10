import { useState } from 'react'
import { useSummaryHistory, type CycloneSummary } from '@/hooks/useSummary'
import { RatingsBar, scoreColor } from '@/components/RatingsBar'
import { History, ChevronDown, ChevronRight } from 'lucide-react'

function formatNzt(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour12: false,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function severityDot(severity: string | null): string {
  switch (severity) {
    case 'red':
      return 'bg-red-500'
    case 'orange':
      return 'bg-amber-500'
    case 'yellow':
      return 'bg-yellow-400'
    default:
      return 'bg-sky-400'
  }
}

function Row({ summary, defaultOpen }: { summary: CycloneSummary; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const ratings = summary.ratings
  const seriousness = ratings?.seriousness ?? summary.seriousness ?? null

  return (
    <div className="border border-white/5 rounded-md bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="shrink-0">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2 w-2 rounded-full ${severityDot(summary.severity)}`} />
          <span className="font-mono text-[10px] text-white/50 tabular-nums uppercase tracking-wider">
            {formatNzt(summary.generated_at)}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-white/85 font-semibold truncate">
            {summary.headline}
          </div>
        </div>

        {seriousness != null && (
          <span
            className={`shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 border rounded ${scoreColor(seriousness)} tabular-nums`}
          >
            {seriousness}/10
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-white/5 bg-black/20">
          <p className="text-[12px] text-white/75 leading-relaxed">{summary.summary}</p>

          {ratings && <RatingsBar ratings={ratings} compact showRationale />}

          {summary.key_points.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {summary.key_points.map((p, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[10px] text-white/70 bg-white/[0.03] border border-white/5 rounded px-2 py-1"
                >
                  <span className="font-mono text-white/30 font-bold shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="text-[9px] font-mono text-white/30 uppercase tracking-wider">
            {summary.model ?? 'unknown model'}
          </div>
        </div>
      )}
    </div>
  )
}

export function SummaryHistory() {
  const { data, isLoading, error } = useSummaryHistory(50)

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-white/50" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Situation Report Archive
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
          {data ? `${data.length} reports` : '—'}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 py-4 text-center">
          Couldn't load history.
        </div>
      )}

      {isLoading && !data && (
        <div className="space-y-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="text-xs text-white/50 py-6 text-center italic">
          No reports generated yet. The first rollup lands within 15 minutes.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {data.map((s, i) => (
            <Row key={s.id} summary={s} defaultOpen={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
