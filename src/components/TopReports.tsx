import { Camera, Flame, MapPin, ArrowRight, ArrowUp } from 'lucide-react'
import { useCrowdReports } from '@/hooks/useCrowdReports'

interface TopReportsProps {
  onOpenReports: () => void
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function TopReports({ onOpenReports }: TopReportsProps) {
  const { data, isLoading } = useCrowdReports('top')
  // Only show the strip if we have at least one positively-voted report.
  // No point taking up space for three score=0 cards.
  const top = (data ?? []).filter((r) => r.vote_score > 0).slice(0, 3)

  if (isLoading || top.length === 0) return null

  return (
    <section className="rounded-lg border border-white/10 bg-[#0f1729]/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
            <Flame className="h-3 w-3 text-red-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
              Top voted
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/45 font-mono truncate">
            From the ground · most useful right now
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenReports}
          className="group shrink-0 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-white/55 hover:text-white transition-colors"
        >
          See all
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.06]">
        {top.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={onOpenReports}
            className="group text-left bg-[#0f1729]/80 hover:bg-[#142036] transition-colors p-2.5 flex gap-2.5 items-start"
          >
            {/* Thumb or icon block */}
            <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-white/[0.04] border border-white/10">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Camera className="h-4 w-4 text-white/25" />
                </div>
              )}
              {/* Score badge */}
              <div className="absolute -top-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 text-emerald-950 px-1.5 py-px text-[9px] font-mono font-extrabold tabular-nums shadow-md shadow-emerald-500/30">
                <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
                {r.vote_score}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-red-400 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-300 truncate">
                  {r.location_text}
                </span>
                <span className="text-[8px] uppercase tracking-wider font-mono text-white/30 tabular-nums shrink-0">
                  · {timeAgo(r.created_at)}
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-snug line-clamp-2 break-words">
                {r.report_text}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
