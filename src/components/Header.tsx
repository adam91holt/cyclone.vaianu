import { Wind, Sparkles, Globe, Navigation } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { useLandfall, formatLandfallLabel } from '@/hooks/useLandfall'
import { useCyclonePosition } from '@/hooks/useCyclonePosition'
import { LiveViewers } from '@/components/LiveViewers'
import { ShareButton } from '@/components/ShareButton'
import { FeedbackButton } from '@/components/FeedbackButton'
import { useSelectedRegion } from '@/context/RegionContext'
import { cycloneDistanceToMainland } from '@/lib/cyclone'

const CONFIDENCE_STYLES = {
  high: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  medium: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  low: 'text-white/60 border-white/20 bg-white/5',
} as const

interface HeaderProps {
  hideShareMobileFab?: boolean
}

export function Header({ hideShareMobileFab }: HeaderProps = {}) {
  const landfall = useLandfall()
  const countdown = useCountdown(landfall.iso)
  const { label: regionLabel, isFiltered } = useSelectedRegion()
  const position = useCyclonePosition()
  const distance = cycloneDistanceToMainland(
    position.isAi ? { lat: position.lat, lon: position.lon } : null,
  )

  return (
    <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-white/10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 max-w-[1500px] mx-auto">
        <div className="min-w-0">
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
            <ShareButton hideMobileFab={hideShareMobileFab} />
            <FeedbackButton />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter leading-[0.85]">
            VAIANU<span className="text-red-500">.</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-white/60 max-w-xl">
            A live dashboard tracking impact across the North Island. Weather, marine,
            airports, warnings & AI situation reports — all auto-updating.
          </p>
        </div>

        <div className="text-left sm:text-right sm:shrink-0 flex flex-col items-start sm:items-end">
          <div
            className="group relative flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-mono text-amber-300/90 mb-1 cursor-help"
            title={position.rationale ?? ''}
          >
            <Navigation className="h-2.5 w-2.5" />
            <span>
              {distance.km.toLocaleString()} km to {distance.region.short}
            </span>
            {position.isAi ? (
              <span className="flex items-center gap-1 text-emerald-300/80">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[8px]">Live</span>
              </span>
            ) : (
              <span className="text-white/35 text-[8px]">Ref</span>
            )}
            {position.isAi && position.rationale && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-white/15 bg-[#0a0f1e] p-3 text-[10px] text-white/70 leading-relaxed shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 text-left normal-case tracking-normal font-sans">
                <div className="text-[9px] uppercase tracking-wider font-mono text-white/40 mb-1">
                  How the AI got here
                </div>
                {position.rationale}
              </div>
            )}
          </div>
          {countdown.isPast ? (
            <>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-amber-300/90 mb-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                Time since landfall
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-amber-200">
                {countdown.formatted}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                Landfall {formatLandfallLabel(landfall.iso)} · {landfall.region}
              </div>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-sm border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.15em] text-red-300">
                <Wind className="h-2.5 w-2.5" />
                Post-landfall · tracking inland
              </div>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/50 mb-1">
                Landfall in
              </div>
              <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-white">
                {countdown.formatted}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40 mt-0.5">
                {formatLandfallLabel(landfall.iso)} · {landfall.region}
              </div>
              {landfall.isAi && landfall.confidence && (
                <div
                  className="group relative mt-1.5 cursor-help"
                  title={landfall.rationale ?? ''}
                >
                  <div
                    className={`flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.15em] ${CONFIDENCE_STYLES[landfall.confidence]}`}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    AI estimate · {landfall.confidence} confidence
                  </div>
                  {landfall.rationale && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-white/15 bg-[#0a0f1e] p-3 text-[10px] text-white/70 leading-relaxed shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 text-left normal-case tracking-normal font-sans">
                      <div className="text-[9px] uppercase tracking-wider font-mono text-white/40 mb-1">
                        How the AI got here
                      </div>
                      {landfall.rationale}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {isFiltered && (
            <div className="mt-1 flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.15em] text-white/35">
              <Globe className="h-2.5 w-2.5" />
              National figure · impact in {regionLabel} varies
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
