import { useRegionWeather } from '@/hooks/useWeather'
import { REGIONS, WARNING_COLORS } from '@/lib/cyclone'
import { ArrowUp } from 'lucide-react'

export function RegionalWeather() {
  const { data, isLoading, dataUpdatedAt } = useRegionWeather()

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
          Live Regional Weather
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
          {isLoading
            ? 'syncing…'
            : dataUpdatedAt
            ? `updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-NZ', { hour12: false })}`
            : ''}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {REGIONS.map((region) => {
          const w = data?.find((r) => r.regionId === region.id)
          const color = WARNING_COLORS[region.warning]
          return (
            <div
              key={region.id}
              className="relative bg-white/[0.03] border border-white/5 rounded-md p-3 hover:border-white/10 transition-colors"
            >
              <div
                className={`absolute top-0 right-0 ${color.bg} text-[9px] font-bold px-1.5 rounded-bl rounded-tr text-white uppercase`}
              >
                {color.label}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">
                {region.short}
              </div>
              <div className="text-sm font-semibold mt-0.5">{region.name}</div>
              {w ? (
                <div className="mt-2 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono tabular-nums text-2xl font-bold">
                      {w.gustKmh}
                    </span>
                    <span className="text-[10px] text-white/50">km/h gust</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/60 font-mono">
                    <ArrowUp
                      className="h-3 w-3"
                      style={{ transform: `rotate(${w.windDirection}deg)` }}
                    />
                    <span>{w.windKmh} sust</span>
                    <span className="text-white/30">·</span>
                    <span>{w.pressureHpa}hPa</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/50 font-mono">
                    <span>{w.temperatureC}°C</span>
                    <span className="text-white/20">·</span>
                    <span>{w.precipitationMm}mm</span>
                    <span className="text-white/20">·</span>
                    <span>{w.humidity}%</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 h-14 bg-white/5 rounded animate-pulse" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
