import { useState } from 'react'
import {
  ShieldAlert,
  Wind,
  CloudRain,
  Waves,
  Snowflake,
  Zap,
  ChevronDown,
  Clock,
  MapPin,
  AlertTriangle,
  ExternalLink,
  Megaphone,
} from 'lucide-react'
import {
  useMetServiceNationalWarnings,
  useMetServiceNationalSummary,
  type MetServiceNationalWarning,
} from '@/hooks/useMetServiceNational'

type LevelKey = 'red' | 'orange' | 'yellow' | 'blue' | 'none'

function levelKey(level: string | null | undefined): LevelKey {
  const l = (level ?? '').toLowerCase()
  if (l === 'red' || l === 'orange' || l === 'yellow' || l === 'blue') return l
  return 'none'
}

const LEVEL_STYLES: Record<
  LevelKey,
  { wrap: string; chip: string; bar: string; label: string }
> = {
  red: {
    wrap: 'from-red-600/20 to-red-950/20 border-red-500/40',
    chip: 'bg-red-500/25 text-red-200 border-red-500/60',
    bar: 'bg-red-500',
    label: 'RED',
  },
  orange: {
    wrap: 'from-amber-500/15 to-amber-950/15 border-amber-500/35',
    chip: 'bg-amber-500/20 text-amber-200 border-amber-500/50',
    bar: 'bg-amber-500',
    label: 'ORANGE',
  },
  yellow: {
    wrap: 'from-yellow-500/10 to-yellow-950/10 border-yellow-500/30',
    chip: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/40',
    bar: 'bg-yellow-400',
    label: 'YELLOW',
  },
  blue: {
    wrap: 'from-sky-500/10 to-sky-950/10 border-sky-500/25',
    chip: 'bg-sky-500/15 text-sky-200 border-sky-500/40',
    bar: 'bg-sky-400',
    label: 'OUTLOOK',
  },
  none: {
    wrap: 'from-white/5 to-white/0 border-white/10',
    chip: 'bg-white/10 text-white/70 border-white/20',
    bar: 'bg-white/30',
    label: 'ADVISORY',
  },
}

function eventIcon(eventType: string | null | undefined) {
  switch ((eventType ?? '').toLowerCase()) {
    case 'wind':
      return Wind
    case 'rain':
      return CloudRain
    case 'swell':
      return Waves
    case 'snow':
    case 'snowfall':
      return Snowflake
    case 'thunderstorm':
      return Zap
    default:
      return AlertTriangle
  }
}

function formatNztTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const URL_REGEX = /https?:\/\/[^\s)]+/g

interface Segment {
  type: 'text' | 'link'
  value: string
}

/** Split text into paragraphs and inline segments (text + links). */
function parseStatement(raw: string): {
  lead: Segment[] | null
  paragraphs: Segment[][]
  links: string[]
} {
  const paragraphs = raw
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)

  const links: string[] = []
  const segmented: Segment[][] = paragraphs.map((p) => {
    const segs: Segment[] = []
    let lastIndex = 0
    for (const match of p.matchAll(URL_REGEX)) {
      const start = match.index ?? 0
      const url = match[0].replace(/[.,;:)]+$/, '')
      if (start > lastIndex) {
        segs.push({ type: 'text', value: p.slice(lastIndex, start) })
      }
      segs.push({ type: 'link', value: url })
      links.push(url)
      lastIndex = start + match[0].length
    }
    if (lastIndex < p.length) {
      segs.push({ type: 'text', value: p.slice(lastIndex) })
    }
    return segs
  })

  return {
    lead: segmented[0] ?? null,
    paragraphs: segmented.slice(1),
    links,
  }
}

function renderSegments(segs: Segment[]) {
  return segs.map((s, i) => {
    if (s.type === 'link') {
      return (
        <a
          key={i}
          href={s.value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-sky-300 hover:text-sky-200 underline underline-offset-2 break-all"
        >
          {s.value.replace(/^https?:\/\//, '')}
        </a>
      )
    }
    return <span key={i}>{s.value}</span>
  })
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  return `${Math.floor(hours / 24)}d ago`
}

function WarningCard({ w }: { w: MetServiceNationalWarning }) {
  const [open, setOpen] = useState(false)
  const level = levelKey(w.warn_level)
  const styles = LEVEL_STYLES[level]
  const Icon = eventIcon(w.event_type)

  const name = w.name ?? w.base_name ?? 'Severe Weather Warning'

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${styles.wrap} border backdrop-blur-sm`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styles.bar}`} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-4 pl-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-md bg-white/10 border border-white/10">
              <Icon className="h-4.5 w-4.5 text-white/90" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 border rounded ${styles.chip}`}
                >
                  {styles.label}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-white/40">
                  {w.event_type ?? 'weather'}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-white leading-snug">
                {name}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                <MapPin className="h-3 w-3 shrink-0 text-white/40" />
                <span className="truncate">{w.area_description ?? '—'}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/55">
                <Clock className="h-3 w-3 shrink-0 text-white/40" />
                <span className="font-mono">
                  {w.threat_period ?? w.threat_period_short ?? '—'}
                </span>
              </div>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-white/40 shrink-0 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 space-y-3 border-t border-white/5">
          {w.text && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-1">
                Forecast
              </div>
              <p className="text-[12px] text-white/85 leading-relaxed">{w.text}</p>
            </div>
          )}
          {w.impact && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-1">
                Impact
              </div>
              <p className="text-[12px] text-white/85 leading-relaxed">
                {w.impact}
              </p>
            </div>
          )}
          {w.instruction && (
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-1">
                Action advice
              </div>
              <p
                className="text-[12px] text-white/85 leading-relaxed [&_a]:text-sky-300 [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{ __html: w.instruction }}
              />
            </div>
          )}
          {w.change_notes && (
            <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2 font-mono">
              Update: {w.change_notes}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[9px] font-mono uppercase tracking-wider text-white/40">
            <span>Issued {timeAgo(w.issued_at)}</span>
            {w.next_issue_at && (
              <span>Next update {formatNztTime(w.next_issue_at)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function MetServiceNationalWarnings() {
  const { data: warnings, isLoading } = useMetServiceNationalWarnings()
  const { data: summary } = useMetServiceNationalSummary()

  // Pull out the first situation headline/statement (all red warnings share one)
  const situation = warnings?.find(
    (w) => w.situation_headline || w.situation_statement,
  )

  const levelBreakdown: Record<LevelKey, number> = {
    red: 0,
    orange: 0,
    yellow: 0,
    blue: 0,
    none: 0,
  }
  for (const w of warnings ?? []) {
    levelBreakdown[levelKey(w.warn_level)]++
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/20 border border-red-500/30">
              <ShieldAlert className="h-4 w-4 text-red-300" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
                MetService National Warnings
              </div>
              <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
                metservice.com · refreshed {timeAgo(summary?.fetched_at ?? null) || 'just now'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {(['red', 'orange', 'yellow'] as const).map((k) => {
              const count = levelBreakdown[k]
              if (count === 0) return null
              const s = LEVEL_STYLES[k]
              return (
                <span
                  key={k}
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border rounded ${s.chip}`}
                >
                  {count} {s.label}
                </span>
              )
            })}
          </div>
        </div>

        {situation?.situation_headline && (
          <div className="mt-4 relative rounded-lg border border-red-500/25 bg-gradient-to-br from-red-950/40 via-[#0a0f1e]/60 to-[#0a0f1e]/40 p-4 pl-5 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-red-400 via-red-500 to-red-700" />
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-red-500/25 border border-red-500/40">
                <Megaphone className="h-3 w-3 text-red-200" />
              </div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-red-200/80 font-mono font-bold">
                Official Situation
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-white leading-snug mb-3">
              {situation.situation_headline}
            </div>
            {(() => {
              const parsed = parseStatement(situation.situation_statement ?? '')
              if (!parsed.lead && parsed.paragraphs.length === 0) return null
              return (
                <div className="space-y-2.5">
                  {parsed.lead && (
                    <p className="text-[13px] text-white/90 leading-relaxed font-medium">
                      {renderSegments(parsed.lead)}
                    </p>
                  )}
                  {parsed.paragraphs.map((segs, i) => (
                    <p
                      key={i}
                      className="text-[12px] text-white/65 leading-relaxed"
                    >
                      {renderSegments(segs)}
                    </p>
                  ))}
                  {parsed.links.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {[...new Set(parsed.links)].map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:border-red-500/50 transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {url
                            .replace(/^https?:\/\//, '')
                            .replace(/^www\./, '')
                            .split('/')[0]}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <div className="p-4 space-y-2.5 max-h-[720px] overflow-y-auto">
        {isLoading && !warnings && (
          <>
            <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-20 bg-white/5 rounded-lg animate-pulse" />
          </>
        )}
        {warnings && warnings.length === 0 && (
          <div className="text-sm text-white/60 italic text-center py-6">
            No active warnings from MetService.
          </div>
        )}
        {warnings?.map((w) => <WarningCard key={w.cap_id} w={w} />)}
      </div>
    </div>
  )
}
