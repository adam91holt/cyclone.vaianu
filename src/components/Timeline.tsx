import { useMemo, useState } from 'react'
import {
  Clock,
  Siren,
  CloudRain,
  Zap,
  Construction,
  Waves,
  Newspaper,
  Radio,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Heart,
  Repeat2,
  Eye,
} from 'lucide-react'
import { useTimeline, type TimelineEvent, type TimelineKind } from '@/hooks/useTimeline'

type FilterKey = 'all' | 'urgent' | TimelineKind

const KIND_META: Record<
  TimelineKind,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  nema_alert: { label: 'NEMA', icon: Siren },
  warning: { label: 'Warning', icon: CloudRain },
  road_closure: { label: 'Road', icon: Construction },
  outage: { label: 'Outage', icon: Zap },
  river_rise: { label: 'River', icon: Waves },
  news: { label: 'News', icon: Newspaper },
  liveblog: { label: 'Liveblog', icon: Radio },
  tweet: { label: 'X / Tweet', icon: MessageCircle },
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

interface TweetMediaItem {
  type?: string
  thumbnail?: string
  url?: string
}

interface TweetMeta {
  author_name?: string
  author_category?: string
  engagement?: {
    views?: number
    likes?: number
    retweets?: number
  }
  media?: TweetMediaItem[] | null
}

const SEV_BORDER: Record<string, string> = {
  red: 'border-red-500/60',
  orange: 'border-orange-500/50',
  yellow: 'border-yellow-500/50',
  info: 'border-white/15',
}
const SEV_DOT: Record<string, string> = {
  red: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
  orange: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]',
  yellow: 'bg-yellow-400',
  info: 'bg-sky-400',
}

// Chip colour is per-kind (not per-severity) so the eye can pick types apart
// at a glance in the mixed "All" feed. Urgent severities get an override to
// red/orange so a red NEMA alert still screams even though its kind colour is
// crimson-ish anyway.
const KIND_CHIP: Record<TimelineKind, string> = {
  nema_alert: 'bg-red-500/15 border-red-500/40 text-red-200',
  warning: 'bg-orange-500/15 border-orange-500/40 text-orange-200',
  road_closure: 'bg-amber-500/15 border-amber-500/40 text-amber-200',
  outage: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200',
  river_rise: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200',
  tweet: 'bg-sky-500/15 border-sky-500/40 text-sky-200',
  liveblog: 'bg-pink-500/15 border-pink-500/40 text-pink-200',
  news: 'bg-violet-500/15 border-violet-500/40 text-violet-200',
}
const SEV_CHIP_OVERRIDE: Record<string, string | undefined> = {
  red: 'bg-red-500/25 border-red-500/50 text-red-100',
  orange: 'bg-orange-500/25 border-orange-500/50 text-orange-100',
}

function timeAgo(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.round((now - t) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function formatNzt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

// Group events by day bucket: "TODAY · 11 Apr", "YESTERDAY · 10 Apr".
function groupByDay(events: TimelineEvent[]): Array<{ label: string; items: TimelineEvent[] }> {
  const fmt = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const today = fmt.format(new Date())
  const yesterday = fmt.format(new Date(Date.now() - 24 * 60 * 60 * 1000))

  const groups = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const day = fmt.format(new Date(e.occurred_at))
    const arr = groups.get(day) ?? []
    arr.push(e)
    groups.set(day, arr)
  }

  return [...groups.entries()].map(([day, items]) => {
    const label = day === today ? `TODAY · ${day}` : day === yesterday ? `YESTERDAY · ${day}` : day
    return { label, items }
  })
}

function EventRow({ event }: { event: TimelineEvent }) {
  const [open, setOpen] = useState(false)
  const meta = KIND_META[event.kind] ?? { label: event.kind, icon: Clock }
  const Icon = meta.icon
  const hasBody = !!event.body
  const isTweet = event.kind === 'tweet'
  const tweetMeta = isTweet ? ((event.metadata ?? {}) as TweetMeta) : null
  const engagement = tweetMeta?.engagement
  const media = tweetMeta?.media?.filter((m) => m.thumbnail) ?? []
  const chipClass =
    SEV_CHIP_OVERRIDE[event.severity] ??
    KIND_CHIP[event.kind] ??
    'bg-white/5 border-white/15 text-white/60'

  return (
    <div
      className={`relative border-l-2 pl-4 py-2.5 ${SEV_BORDER[event.severity] ?? SEV_BORDER.info}`}
    >
      {/* Severity dot on the rail */}
      <div
        className={`absolute -left-[5px] top-4 h-2 w-2 rounded-full ${SEV_DOT[event.severity] ?? SEV_DOT.info}`}
      />

      <button
        type="button"
        onClick={() => hasBody && setOpen((o) => !o)}
        className={`w-full text-left group ${hasBody ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!hasBody}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${chipClass}`}
              >
                <Icon className="h-2.5 w-2.5" />
                {meta.label}
              </span>
              {isTweet && tweetMeta?.author_name && (
                <span className="text-[10px] text-white/85 font-semibold truncate max-w-[200px]">
                  {tweetMeta.author_name}
                </span>
              )}
              {isTweet && event.source && (
                <span className="text-[9px] font-mono text-sky-400/80">{event.source}</span>
              )}
              {event.region && !isTweet && (
                <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider">
                  {event.region}
                </span>
              )}
              <span className="text-[9px] font-mono text-white/40 tabular-nums">
                {timeAgo(event.occurred_at)}
              </span>
              <span className="text-[9px] font-mono text-white/25 tabular-nums">
                {formatNzt(event.occurred_at)}
              </span>
            </div>
            <div
              className={`text-[13px] leading-snug transition-colors ${
                isTweet
                  ? 'text-white/85 font-normal group-hover:text-white/95'
                  : 'text-white/90 font-semibold group-hover:text-white'
              }`}
            >
              {event.title}
            </div>
            {isTweet && media.length > 0 && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {media.slice(0, 4).map((m, i) => (
                  <a
                    key={i}
                    href={event.link ?? m.url ?? m.thumbnail}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="relative block h-20 w-28 overflow-hidden rounded border border-white/10 bg-white/5 hover:border-sky-400/50 transition-colors"
                  >
                    <img
                      src={m.thumbnail}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        ;(e.currentTarget.parentElement as HTMLElement).style.display = 'none'
                      }}
                    />
                    {m.type && m.type !== 'photo' && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono uppercase bg-black/70 text-white/90 px-1 rounded">
                        {m.type === 'animated_gif' ? 'gif' : m.type}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
            {isTweet && engagement && (
              <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono text-white/35 tabular-nums">
                {typeof engagement.views === 'number' && engagement.views > 0 && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-2.5 w-2.5" /> {formatCount(engagement.views)}
                  </span>
                )}
                {typeof engagement.likes === 'number' && engagement.likes > 0 && (
                  <span className="flex items-center gap-1">
                    <Heart className="h-2.5 w-2.5" /> {formatCount(engagement.likes)}
                  </span>
                )}
                {typeof engagement.retweets === 'number' && engagement.retweets > 0 && (
                  <span className="flex items-center gap-1">
                    <Repeat2 className="h-2.5 w-2.5" /> {formatCount(engagement.retweets)}
                  </span>
                )}
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-sky-400/70 hover:text-sky-300"
                  >
                    View on X <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
            {!isTweet && event.source && (
              <div className="text-[9px] font-mono text-white/35 uppercase tracking-wider mt-0.5">
                {event.source}
              </div>
            )}
          </div>
          {hasBody && (
            <div className="shrink-0 pt-1 text-white/30">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          )}
        </div>
      </button>

      {open && hasBody && (
        <div className="mt-2 pl-0 text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap">
          {event.body}
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-sky-400 hover:text-sky-300"
            >
              Source <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

const FILTER_BUTTONS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'nema_alert', label: 'NEMA' },
  { key: 'warning', label: 'Warnings' },
  { key: 'road_closure', label: 'Roads' },
  { key: 'outage', label: 'Outages' },
  { key: 'tweet', label: 'X / Tweets' },
  { key: 'news', label: 'News' },
  { key: 'liveblog', label: 'Liveblog' },
]

export function Timeline() {
  const { data, isLoading, error } = useTimeline()
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data
    if (filter === 'urgent')
      return data.filter((e) => e.severity === 'red' || e.severity === 'orange')
    return data.filter((e) => e.kind === filter)
  }, [data, filter])

  const groups = useMemo(() => groupByDay(filtered), [filtered])

  const counts = useMemo(() => {
    if (!data) return { total: 0, red: 0, orange: 0 }
    return {
      total: data.length,
      red: data.filter((e) => e.severity === 'red').length,
      orange: data.filter((e) => e.severity === 'orange').length,
    }
  }, [data])

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-white/50" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Notable Events · Live Timeline
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider">
          {counts.red > 0 && (
            <span className="px-1.5 py-0.5 rounded border bg-red-500/20 border-red-500/40 text-red-200">
              {counts.red} red
            </span>
          )}
          {counts.orange > 0 && (
            <span className="px-1.5 py-0.5 rounded border bg-orange-500/20 border-orange-500/40 text-orange-200">
              {counts.orange} orange
            </span>
          )}
          <span className="text-white/40">{counts.total} events</span>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-4">
        {FILTER_BUTTONS.map((b) => {
          const active = filter === b.key
          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setFilter(b.key)}
              className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border transition-colors ${
                active
                  ? 'bg-red-500/20 border-red-500/50 text-red-200'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {b.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="text-xs text-red-400 py-4 text-center">Couldn't load timeline.</div>
      )}

      {isLoading && !data && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {data && filtered.length === 0 && (
        <div className="text-xs text-white/50 py-10 text-center italic">
          No events match this filter.
        </div>
      )}

      {groups.length > 0 && (
        <div className="max-h-[780px] overflow-y-auto pr-2 -mr-2 space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 z-10 bg-[#0f1729]/95 backdrop-blur py-1 mb-2">
                <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/40">
                  {group.label}
                </div>
              </div>
              <div className="space-y-1 pl-1">
                {group.items.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
