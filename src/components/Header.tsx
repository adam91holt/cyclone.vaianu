import { Wind } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { LANDFALL_TIME_ISO } from '@/lib/cyclone'
import { LiveViewers } from '@/components/LiveViewers'
import { ShareButton } from '@/components/ShareButton'

export function Header() {
  const countdown = useCountdown(LANDFALL_TIME_ISO)

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/10">
      <div className="flex items-end justify-between gap-4 max-w-[1500px] mx-auto">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-sm bg-red-600/20 border border-red-600/40 px-2 py-0.5">
              <Wind className="h-3 w-3 text-red-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Tropical Cyclone · Cat 2
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">
              Sub-tropical · Intensifying
            </span>
            <LiveViewers />
            <ShareButton />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter leading-[0.85]">
            VAIANU<span className="text-red-500">.</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/60 max-w-xl">
            A live dashboard tracking impact across the North Island. Weather, marine,
            airports, warnings & AI situation reports — all auto-updating.
          </p>
        </div>

        <div className="text-right shrink-0 flex flex-col items-end">
          <a
            href="https://thecolab.ai/"
            target="_blank"
            rel="noreferrer"
            className="group relative flex items-center gap-3.5 rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent hover:border-white/30 hover:from-white/[0.10] transition-all px-4 py-3 mb-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src="/thecolab-logo.jpg"
              alt="The Colab"
              className="relative h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/20 group-hover:ring-white/40 transition-all"
              loading="lazy"
            />
            <div className="relative text-left leading-tight">
              <div className="text-[9px] uppercase tracking-[0.22em] font-mono text-white/45 group-hover:text-white/60 transition-colors mb-0.5">
                Built by
              </div>
              <div className="font-display text-lg font-bold text-white tracking-tight leading-none">
                thecolab<span className="text-red-400">.</span>ai
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.14em] font-mono text-white/50 group-hover:text-white/70 transition-colors">
                Supporting the cyclone response
              </div>
            </div>
          </a>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
            {countdown.isPast ? 'Landfall passed' : 'Landfall in'}
          </div>
          <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-white">
            {countdown.formatted}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
            Sun 12 Apr · 06:00 NZST
          </div>
        </div>
      </div>
    </div>
  )
}
