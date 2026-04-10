import { useRegionWeather } from '@/hooks/useWeather'
import { TrendingUp } from 'lucide-react'

export function HeroWind() {
  const { data, isLoading } = useRegionWeather()

  // Find the region with the highest current gust.
  const peak = data?.reduce(
    (max, r) => (r.gustKmh > max.gustKmh ? r : max),
    data[0],
  )
  const peakName = peak
    ? { auckland: 'Auckland', coromandel: 'Coromandel', northland: 'Northland', bay_of_plenty: 'Bay of Plenty', waikato: 'Waikato', gisborne: 'Gisborne' }[peak.regionId] ?? peak.regionId
    : '—'

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-5 sm:p-6 border border-red-500/30">
      <div className="relative z-10">
        <div className="text-[10px] uppercase tracking-[0.25em] text-white/80 mb-1 font-semibold">
          Peak Wind · {peakName}
        </div>
        {isLoading || !peak ? (
          <div className="h-20 w-40 bg-white/10 rounded animate-pulse" />
        ) : (
          <>
            <div className="flex items-baseline font-mono">
              <span className="text-6xl sm:text-7xl font-bold leading-none tabular-nums">
                {peak.gustKmh}
              </span>
              <span className="text-lg sm:text-xl ml-2 text-white/80">km/h</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-white/90">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-medium">
                Sustained {peak.windKmh} · Bearing {peak.windDirection}°
              </span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-white/60 font-mono">
              Pressure {peak.pressureHpa} hPa · Live from Open-Meteo
            </div>
          </>
        )}
      </div>

      {/* Decorative spiral */}
      <svg
        className="absolute -right-4 -bottom-4 opacity-20"
        width="160"
        height="160"
        viewBox="0 0 100 100"
      >
        <g className="animate-[spin_40s_linear_infinite] origin-center">
          <path
            d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M50,50 m-22,0 a22,22 0 1,1 44,0 a22,22 0 1,1 -44,0"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="50" cy="50" r="8" fill="white" fillOpacity="0.8" />
        </g>
      </svg>
    </div>
  )
}
