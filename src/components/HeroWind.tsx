import { Wind, Compass, Droplets, Thermometer } from 'lucide-react'
import { useMetServiceObservations } from '@/hooks/useMetServiceObservations'
import { useRegionWeather } from '@/hooks/useWeather'
import { REGIONS } from '@/lib/cyclone'

export function HeroWind() {
  const { data: towns, isLoading: loadingTowns } = useMetServiceObservations()
  const { data: regions } = useRegionWeather()

  // MetService — authoritative sustained wind. Find the town with the highest
  // current wind speed.
  const peak = (towns ?? [])
    .filter((t) => t.wind_speed_kmh !== null)
    .reduce<NonNullable<typeof towns>[number] | null>(
      (max, t) =>
        max === null || (t.wind_speed_kmh ?? 0) > (max.wind_speed_kmh ?? 0)
          ? t
          : max,
      null,
    )

  // Open-Meteo — gust (MetService's localObs feed doesn't include gust, so we
  // cross-source the peak gust from the modelled regional weather).
  const regionList = regions ?? []
  type RegionRow = (typeof regionList)[number]
  const peakGust = regionList.reduce<RegionRow | null>(
    (max, r) => (max === null || r.gustKmh > max.gustKmh ? r : max),
    null,
  )
  const peakGustName = peakGust
    ? (REGIONS.find((reg) => reg.id === peakGust.regionId)?.short ??
      peakGust.regionId.toUpperCase())
    : '—'

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-5 sm:p-6 border border-red-500/30 flex flex-col">
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <Wind className="h-3 w-3 text-white/80" />
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/80 font-semibold">
            Peak Wind · {peak?.town_name ?? '—'}
          </div>
        </div>

        {loadingTowns || !peak ? (
          <div className="h-20 w-40 bg-white/10 rounded animate-pulse" />
        ) : (
          <>
            {/* Primary + gust stats side by side */}
            <div className="flex items-end gap-5 sm:gap-6">
              <div>
                <div className="flex items-baseline font-mono">
                  <span className="text-5xl sm:text-6xl font-bold leading-none tabular-nums">
                    {peak.wind_speed_kmh}
                  </span>
                  <span className="text-base sm:text-lg ml-1.5 text-white/80">
                    km/h
                  </span>
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-white/60 font-mono">
                  Sustained · MetService
                </div>
              </div>
              <div className="border-l border-white/25 pl-5 sm:pl-6 pb-0.5">
                <div className="flex items-baseline font-mono">
                  <span className="text-4xl sm:text-5xl font-bold leading-none tabular-nums text-amber-200">
                    {peakGust ? peakGust.gustKmh : '—'}
                  </span>
                  <span className="text-sm ml-1.5 text-amber-200/80">km/h</span>
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-amber-200/70 font-mono">
                  Gust · {peakGustName}
                </div>
              </div>
            </div>

            {/* Secondary metrics grid */}
            <div className="mt-auto pt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-white/85">
                <Compass className="h-3 w-3 text-white/55 shrink-0" />
                <span className="text-white/55">Bearing</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {peak.wind_direction ?? '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-white/85">
                <Thermometer className="h-3 w-3 text-white/55 shrink-0" />
                <span className="text-white/55">Temp</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {peak.temp_c !== null ? `${peak.temp_c}°` : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-white/85">
                <svg
                  className="h-3 w-3 text-white/55 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2 L12 22 M2 12 L22 12" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span className="text-white/55">Pressure</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {peak.pressure_hpa ?? '—'}
                  {peak.pressure_trend === 'falling' && (
                    <span className="text-amber-200 ml-0.5">↓</span>
                  )}
                  {peak.pressure_trend === 'rising' && (
                    <span className="text-emerald-200 ml-0.5">↑</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-white/85">
                <Droplets className="h-3 w-3 text-white/55 shrink-0" />
                <span className="text-white/55">Humidity</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {peak.humidity !== null ? `${peak.humidity}%` : '—'}
                </span>
              </div>
            </div>

            <div className="mt-3 text-[9px] uppercase tracking-wider text-white/45 font-mono truncate">
              {peak.station ?? peak.town_name} · MetService obs + Open-Meteo
              gust
            </div>
          </>
        )}
      </div>

      {/* Decorative spiral */}
      <svg
        className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none"
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
