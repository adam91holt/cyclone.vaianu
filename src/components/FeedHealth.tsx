import { Activity, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { useFeedHealth, type FeedHealth as Feed } from '@/hooks/useFeedHealth'

/** Pretty names + data source labels for the known jobs. */
const JOB_META: Record<string, { label: string; source: string }> = {
  'stuff-liveblog-every-5-min': {
    label: 'Stuff Live Blog',
    source: 'stuff.co.nz',
  },
  'metservice-warnings-every-10-min': {
    label: 'MetService Warnings',
    source: 'metservice.com',
  },
  'niwa-feed-every-15-min': {
    label: 'NIWA Forecast + Tweets',
    source: 'api.niwa.co.nz',
  },
  'vaianu-news-every-10': {
    label: 'News Feed',
    source: 'rnz · stuff · nzh',
  },
  'vaianu-summary-every-15': {
    label: 'AI Situation Report',
    source: 'claude sonnet 4.6',
  },
  'vaianu-log-weather-every-10': {
    label: 'Weather Snapshots',
    source: 'open-meteo',
  },
  'vaianu-niwa-videos-every-15': {
    label: 'NIWA Video Forecast',
    source: 'api.niwa.co.nz',
  },
}

function humanSchedule(cron: string): string {
  const m = cron.match(/^\*\/(\d+) \* \* \* \*$/)
  if (m) return `every ${m[1]}m`
  return cron
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface FeedState {
  severity: 'ok' | 'stale' | 'failed' | 'unknown'
  label: string
}

function classify(feed: Feed): FeedState {
  if (!feed.last_run_at) {
    return { severity: 'unknown', label: 'No recent runs' }
  }
  // Parse schedule interval to set "stale" threshold
  const m = feed.schedule.match(/^\*\/(\d+) \* \* \* \*$/)
  const intervalMin = m ? Number(m[1]) : 15
  const maxStaleMs = intervalMin * 60_000 * 3 // 3 intervals
  const ageMs = Date.now() - new Date(feed.last_run_at).getTime()

  if (feed.last_status === 'failed') {
    return { severity: 'failed', label: 'Last run failed' }
  }
  if (ageMs > maxStaleMs) {
    return { severity: 'stale', label: 'Stale' }
  }
  return { severity: 'ok', label: 'Healthy' }
}

const SEVERITY_STYLES: Record<
  FeedState['severity'],
  { dot: string; text: string; ring: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    ring: 'shadow-[0_0_0_3px_rgba(52,211,153,0.15)]',
    Icon: CheckCircle2,
  },
  stale: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    ring: 'shadow-[0_0_0_3px_rgba(251,191,36,0.15)]',
    Icon: AlertCircle,
  },
  failed: {
    dot: 'bg-red-500',
    text: 'text-red-300',
    ring: 'shadow-[0_0_0_3px_rgba(239,68,68,0.2)]',
    Icon: XCircle,
  },
  unknown: {
    dot: 'bg-white/30',
    text: 'text-white/50',
    ring: '',
    Icon: AlertCircle,
  },
}

export function FeedHealth() {
  const { data: feeds, isLoading } = useFeedHealth()

  const counts = { ok: 0, stale: 0, failed: 0, unknown: 0 }
  if (feeds) {
    for (const f of feeds) counts[classify(f).severity]++
  }

  const overall: FeedState['severity'] =
    counts.failed > 0 ? 'failed' : counts.stale > 0 ? 'stale' : 'ok'
  const overallStyle = SEVERITY_STYLES[overall]

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 border border-emerald-500/30">
            <Activity className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              Feed Health
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Data pipeline status · auto-refresh 60s
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border ${
            overall === 'ok'
              ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
              : overall === 'stale'
                ? 'text-amber-300 border-amber-500/30 bg-amber-500/5'
                : 'text-red-300 border-red-500/30 bg-red-500/5'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${overallStyle.dot} animate-pulse`}
          />
          {overall === 'ok'
            ? 'All systems go'
            : overall === 'stale'
              ? `${counts.stale} stale`
              : `${counts.failed} failing`}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {isLoading && !feeds && (
          <div className="p-5 space-y-2">
            <div className="h-12 bg-white/5 rounded animate-pulse" />
            <div className="h-12 bg-white/5 rounded animate-pulse" />
            <div className="h-12 bg-white/5 rounded animate-pulse" />
          </div>
        )}
        {feeds?.map((feed) => {
          const meta = JOB_META[feed.jobname] ?? {
            label: feed.jobname,
            source: '—',
          }
          const state = classify(feed)
          const s = SEVERITY_STYLES[state.severity]
          return (
            <div
              key={feed.jobname}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  <span
                    className={`block h-2 w-2 rounded-full ${s.dot} ${s.ring}`}
                  />
                  {state.severity === 'ok' && (
                    <span
                      className={`absolute inset-0 h-2 w-2 rounded-full ${s.dot} animate-ping opacity-60`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-white truncate">
                    {meta.label}
                  </div>
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider truncate">
                    {meta.source} · {humanSchedule(feed.schedule)}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] font-mono uppercase tracking-wider ${s.text}`}
                >
                  <s.Icon className="h-2.5 w-2.5" />
                  {state.label}
                </div>
                <div className="text-[10px] font-mono text-white/45 tabular-nums mt-0.5">
                  {timeAgo(feed.last_run_at)}
                </div>
              </div>
            </div>
          )
        })}
        {feeds && feeds.length === 0 && (
          <div className="py-6 text-center text-sm text-white/50 italic">
            No feed jobs configured.
          </div>
        )}
      </div>

      <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-white/40">
        <span>
          {feeds?.length ?? 0} job{feeds?.length === 1 ? '' : 's'} · running on
          pg_cron
        </span>
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {counts.ok}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {counts.stale}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {counts.failed}
          </span>
        </span>
      </div>
    </div>
  )
}
