import { Droplets, Gauge, Waves } from 'lucide-react'
import { useRegionWeather } from '@/hooks/useWeather'
import { useMarine } from '@/hooks/useMarine'
import { useMetServiceObservations } from '@/hooks/useMetServiceObservations'

function StatRow({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  loading,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  icon: typeof Gauge
  loading?: boolean
}) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">
          {label}
        </div>
        <Icon className="h-3.5 w-3.5 text-white/30" />
      </div>
      {loading ? (
        <div className="h-7 w-20 rounded bg-white/5 animate-pulse" />
      ) : (
        <>
          <div className="font-mono tabular-nums text-2xl font-bold leading-none">
            {value}
            {unit && <span className="text-xs text-white/60 ml-1">{unit}</span>}
          </div>
          {sub && (
            <div className="text-[10px] text-white/50 mt-1 font-mono">{sub}</div>
          )}
        </>
      )}
    </div>
  )
}

function RainfallPanel() {
  const { data, isLoading } = useMetServiceObservations()

  const towns = data ?? []
  const withData = towns.filter((t) => t.rainfall_3h_mm !== null)
  const peakMm = withData.reduce(
    (max, t) => ((t.rainfall_3h_mm ?? 0) > max ? (t.rainfall_3h_mm ?? 0) : max),
    0,
  )
  const peakTown = withData.find((t) => (t.rainfall_3h_mm ?? -1) === peakMm)

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 relative backdrop-blur-sm sm:col-span-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">
          Rainfall · Last 3 h · MetService
        </div>
        <Droplets className="h-3.5 w-3.5 text-white/30" />
      </div>

      {isLoading ? (
        <div className="h-8 w-24 rounded bg-white/5 animate-pulse" />
      ) : (
        <div className="flex items-baseline gap-3">
          <div className="font-mono tabular-nums text-3xl font-bold">
            {peakMm.toFixed(1)}
            <span className="text-sm text-white/60 ml-1">mm</span>
          </div>
          <div className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
            {peakTown
              ? `Peak · ${peakTown.town_name}`
              : withData.length === 0
                ? 'No data'
                : 'Peak'}
          </div>
        </div>
      )}

      {/* Town grid */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1.5 pt-3 border-t border-white/5">
        {towns.map((t) => {
          const mm = t.rainfall_3h_mm
          const hasData = mm !== null
          const isPeak = hasData && mm === peakMm && peakMm > 0
          const isWet = hasData && (mm ?? 0) > 0

          return (
            <div
              key={t.town_slug}
              className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
            >
              <span
                className={`truncate ${
                  isPeak
                    ? 'text-sky-200 font-bold'
                    : isWet
                      ? 'text-white/80'
                      : 'text-white/45'
                }`}
              >
                {t.town_name}
              </span>
              <span
                className={`shrink-0 ${
                  !hasData
                    ? 'text-white/25'
                    : isPeak
                      ? 'text-sky-300 font-bold'
                      : isWet
                        ? 'text-sky-200/80'
                        : 'text-white/35'
                }`}
              >
                {hasData ? `${mm!.toFixed(1)}` : '—'}
              </span>
            </div>
          )
        })}
        {towns.length === 0 && !isLoading && (
          <div className="col-span-full text-[10px] text-white/40 font-mono">
            No observations available.
          </div>
        )}
      </div>
    </div>
  )
}

export function StatCards() {
  const weather = useRegionWeather()
  const marine = useMarine()

  // Lowest pressure across regions — the cyclone's pressure trough.
  const lowestPressure = weather.data?.reduce(
    (min, r) => (r.pressureHpa < min ? r.pressureHpa : min),
    Infinity,
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
      {/* Combined Pressure + Wave stacked */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 backdrop-blur-sm flex flex-col justify-around gap-4">
        <StatRow
          label="Min Pressure"
          value={
            lowestPressure && lowestPressure !== Infinity ? lowestPressure : '—'
          }
          unit="hPa"
          sub="Lowest across regions"
          icon={Gauge}
          loading={weather.isLoading}
        />
        <div className="border-t border-white/5" />
        <StatRow
          label="Significant Wave"
          value={marine.data?.waveHeight ?? '—'}
          unit="m"
          sub={
            marine.data
              ? `Swell ${marine.data.swellHeight}m · ${marine.data.swellPeriod}s`
              : ''
          }
          icon={Waves}
          loading={marine.isLoading}
        />
      </div>
      <RainfallPanel />
    </div>
  )
}
