import { useMemo, useState } from 'react'
import {
  GitCommit,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useChangelog, type ChangelogEntry } from '@/hooks/useChangelog'

function nztDate(iso: string): { day: string; time: string } {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
  const time = d.toLocaleTimeString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return { day, time }
}

function groupByDay(entries: ChangelogEntry[]): Array<[string, ChangelogEntry[]]> {
  const groups: Record<string, ChangelogEntry[]> = {}
  const order: string[] = []
  for (const e of entries) {
    const { day } = nztDate(e.dateIso)
    if (!groups[day]) {
      groups[day] = []
      order.push(day)
    }
    groups[day].push(e)
  }
  return order.map((d) => [d, groups[d]])
}

function Row({ entry }: { entry: ChangelogEntry }) {
  const [open, setOpen] = useState(false)
  const { time } = nztDate(entry.dateIso)
  const hasBody = entry.body.trim().length > 0

  return (
    <div className="relative flex gap-3 pl-6">
      {/* Timeline dot */}
      <div className="absolute left-[9px] top-2 h-2 w-2 rounded-full bg-red-500/80 ring-2 ring-[#070b16]" />

      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-white/40 tabular-nums shrink-0 pt-0.5">
            {time}
          </span>
          <span className="font-mono text-[9px] text-white/30 px-1 py-0.5 rounded bg-white/[0.04] border border-white/5 shrink-0">
            {entry.shortSha}
          </span>
          <button
            type="button"
            onClick={() => hasBody && setOpen((v) => !v)}
            className={`flex-1 min-w-0 text-left text-[12px] text-white/85 leading-snug ${
              hasBody ? 'hover:text-white cursor-pointer' : ''
            }`}
            disabled={!hasBody}
          >
            <span className="flex items-start gap-1">
              {hasBody && (
                <span className="text-white/30 shrink-0 mt-0.5">
                  {open ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </span>
              )}
              <span>{entry.subject}</span>
            </span>
          </button>
          <a
            href={entry.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="text-white/30 hover:text-white/70 transition-colors shrink-0 pt-0.5"
            aria-label="View on GitHub"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {open && hasBody && (
          <div className="mt-2 ml-5 px-3 py-2 rounded-md bg-black/30 border border-white/5">
            <pre className="text-[11px] text-white/65 leading-relaxed whitespace-pre-wrap break-words font-sans">
              {entry.body}
            </pre>
            <div className="mt-2 text-[9px] font-mono uppercase tracking-wider text-white/30">
              by {entry.authorName}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Changelog() {
  const { data, isLoading, error, refetch, isFetching } = useChangelog()

  const grouped = useMemo(() => (data ? groupByDay(data) : []), [data])

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <GitCommit className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              Changelog
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Live from GitHub · every push to main
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors disabled:opacity-40"
            aria-label="Refresh changelog"
          >
            <RefreshCw
              className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
          <a
            href="https://github.com/adam91holt/cyclone.vaianu/commits/main"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
          >
            GitHub
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {isLoading && !data && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 w-full bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-300 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-200 leading-relaxed">
            Couldn't load the changelog from GitHub. The public API allows
            60 requests per hour per IP — try again in a few minutes, or
            visit the repo directly.
          </div>
        </div>
      )}

      {!isLoading && !error && grouped.length === 0 && (
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider">
          No commits found.
        </div>
      )}

      <div className="relative">
        {grouped.map(([day, entries]) => (
          <section key={day} className="mb-4 last:mb-0">
            <div className="sticky top-0 z-10 -mx-5 px-5 py-1.5 bg-gradient-to-b from-[#0f1729] via-[#0f1729]/95 to-[#0f1729]/0 backdrop-blur-sm">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold font-mono">
                {day}
              </h3>
            </div>
            <div className="relative mt-1">
              {/* Vertical timeline line */}
              <div className="absolute left-[10px] top-1 bottom-1 w-px bg-white/10" />
              {entries.map((e) => (
                <Row key={e.sha} entry={e} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
