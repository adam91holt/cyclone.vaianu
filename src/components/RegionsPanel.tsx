import { REGIONS, WARNING_COLORS } from '@/lib/cyclone'
import { useRegionWeather } from '@/hooks/useWeather'
import { AlertTriangle } from 'lucide-react'

export function RegionsPanel() {
  const { data } = useRegionWeather()

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
          Regions · Warnings
        </div>
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <div className="space-y-2.5">
        {REGIONS.map((region) => {
          const w = data?.find((r) => r.regionId === region.id)
          const color = WARNING_COLORS[region.warning]
          return (
            <div
              key={region.id}
              className="group flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] p-2.5 hover:bg-white/[0.04] transition-colors"
            >
              <div
                className={`${color.bg} text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 w-14 text-center`}
              >
                {color.label}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold truncate">{region.name}</div>
                  {w && (
                    <div className="text-[10px] font-mono text-white/60 tabular-nums shrink-0">
                      {w.windKmh}/{w.gustKmh}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-white/50 line-clamp-1">
                  {region.impact}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 text-[9px] uppercase tracking-wider text-white/40 font-mono">
        Format: sustained / gust (km/h)
      </div>
    </div>
  )
}
