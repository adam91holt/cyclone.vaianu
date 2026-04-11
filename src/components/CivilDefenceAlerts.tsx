import { useState } from 'react'
import {
  Siren,
  ChevronDown,
  ExternalLink,
  AlertTriangle,
  Megaphone,
} from 'lucide-react'
import { useNemaAlerts, type NemaAlert } from '@/hooks/useNemaAlerts'

type SevKey = 'red' | 'orange' | 'info'

const SEV_STYLES: Record<
  SevKey,
  { wrap: string; chip: string; bar: string; label: string }
> = {
  red: {
    wrap: 'from-red-600/20 to-red-950/30 border-red-500/50',
    chip: 'bg-red-500/25 text-red-200 border-red-500/60',
    bar: 'bg-red-500',
    label: 'RED',
  },
  orange: {
    wrap: 'from-orange-500/20 to-orange-950/20 border-orange-500/40',
    chip: 'bg-orange-500/25 text-orange-200 border-orange-500/60',
    bar: 'bg-orange-500',
    label: 'ORANGE',
  },
  info: {
    wrap: 'from-white/5 to-white/[0.02] border-white/15',
    chip: 'bg-white/10 text-white/70 border-white/20',
    bar: 'bg-white/30',
    label: 'INFO',
  },
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return null
  }
}

// NEMA titles are SHOUTY ALL CAPS by convention. We keep them shouty
// because that's how the official alerts appear on phones — it reads
// as emergency, not as a bug.
function cleanTitle(raw: string): string {
  return raw.replace(/^CIVIL DEFENCE\s*/i, '').trim() || raw
}

interface AlertCardProps {
  alert: NemaAlert
  defaultOpen?: boolean
}

function AlertCard({ alert, defaultOpen = false }: AlertCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const sev = SEV_STYLES[alert.severity]
  const cleanedTitle = cleanTitle(alert.title)
  const published = formatTime(alert.published_at)

  return (
    <div
      className={`relative rounded-lg border overflow-hidden bg-gradient-to-br ${sev.wrap}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${sev.bar}`} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 pl-5"
      >
        <div className="flex items-start gap-3">
          <Siren className="h-4 w-4 shrink-0 mt-0.5 text-white/80" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${sev.chip}`}
              >
                {sev.label}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
                NEMA · Civil Defence
              </span>
              {published && (
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono ml-auto">
                  {published}
                </span>
              )}
            </div>
            <div className="text-[13px] font-semibold text-white leading-snug">
              {cleanedTitle}
            </div>
            {!open && alert.summary && (
              <div className="text-[11px] text-white/60 mt-1 line-clamp-2 leading-relaxed">
                {alert.summary}
              </div>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 pt-0">
          <div className="text-[11px] text-white/75 leading-relaxed whitespace-pre-wrap border-t border-white/10 pt-3">
            {alert.body}
          </div>
          {alert.link && (
            <a
              href={alert.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[10px] uppercase tracking-wider font-mono text-white/50 hover:text-white/90 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Open on AlertHub
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function CivilDefenceAlerts() {
  const { data, isLoading, error } = useNemaAlerts()
  const [showAll, setShowAll] = useState(false)

  const alerts = data?.alerts ?? []
  const visibleCount = showAll ? alerts.length : Math.min(3, alerts.length)
  const visible = alerts.slice(0, visibleCount)
  const hidden = alerts.length - visibleCount
  const redCount = alerts.filter((a) => a.severity === 'red').length

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-red-400" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            NEMA Civil Defence · Live Alerts
          </div>
        </div>
        {!isLoading && !error && (
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
            {redCount > 0 && (
              <div className="flex items-center gap-1.5 text-red-300">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                {redCount} red
              </div>
            )}
            <div className="text-white/40">
              {alerts.length} active
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-4">
          Loading civil defence alerts…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-[11px] text-red-300 font-mono uppercase tracking-wider py-4">
          <AlertTriangle className="h-3 w-3" />
          Could not load alerts
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-4">
          No active civil defence alerts
        </div>
      )}

      {!isLoading && !error && alerts.length > 0 && (
        <div className="space-y-2">
          {visible.map((a, i) => (
            <AlertCard
              key={a.id}
              alert={a}
              defaultOpen={i === 0 && a.severity === 'red'}
            />
          ))}
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="w-full text-[10px] uppercase tracking-wider font-mono text-white/50 hover:text-white/90 transition-colors py-2 border border-white/10 rounded-md hover:border-white/20"
            >
              Show {hidden} more
            </button>
          )}
          {showAll && alerts.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="w-full text-[10px] uppercase tracking-wider font-mono text-white/40 hover:text-white/80 transition-colors py-2"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
