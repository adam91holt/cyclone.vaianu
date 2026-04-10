import { useState } from 'react'
import { CloudSun, Wind, Droplets, Thermometer, MapPin } from 'lucide-react'
import {
  useNiwaForecast,
  type NiwaForecastRow,
  type NiwaDailySummary,
} from '@/hooks/useNiwaForecast'

function gustStyle(maxGust: number) {
  if (maxGust >= 120) return 'text-red-300 border-red-500/40 bg-red-500/15'
  if (maxGust >= 90) return 'text-amber-300 border-amber-500/40 bg-amber-500/15'
  if (maxGust >= 60) return 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'
  return 'text-white/70 border-white/10 bg-white/[0.03]'
}

function rainStyle(mm: number) {
  if (mm >= 30) return 'text-sky-200 font-bold'
  if (mm >= 10) return 'text-sky-300'
  if (mm >= 1) return 'text-sky-400/80'
  return 'text-white/40'
}

function shortLabel(label: string) {
  // "Friday" → "Fri"
  return label.slice(0, 3)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    day: 'numeric',
    month: 'short',
  })
}

function DayCard({ day }: { day: NiwaDailySummary }) {
  const maxGust = Math.round(day.wind_gust?.max ?? 0)
  const rain = Number((day.precipitation?.precipitation_amount ?? 0).toFixed(1))
  const tempMax = Math.round(day.temperature?.max ?? 0)
  const tempMin = Math.round(day.temperature?.min ?? 0)

  return (
    <div className="shrink-0 w-[150px] rounded-lg bg-white/[0.03] border border-white/10 p-3 hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">
          {shortLabel(day.label)}
        </div>
        <div className="text-[9px] font-mono text-white/40">
          {formatDate(day.start)}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-2xl leading-none">{day.emoji}</span>
        <div className="flex flex-col">
          <span className="text-sm font-mono font-bold text-white tabular-nums">
            {tempMax}°
          </span>
          <span className="text-[10px] font-mono text-white/40 tabular-nums">
            {tempMin}°
          </span>
        </div>
      </div>
      <div
        className={`flex items-center justify-between px-2 py-1 mb-1.5 text-[10px] font-mono tabular-nums rounded border ${gustStyle(maxGust)}`}
      >
        <Wind className="h-2.5 w-2.5" />
        <span className="font-bold">{maxGust}</span>
        <span className="opacity-60">km/h</span>
      </div>
      <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono tabular-nums">
        <Droplets className={`h-2.5 w-2.5 ${rainStyle(rain)}`} />
        <span className={rainStyle(rain)}>{rain}</span>
        <span className="text-white/30">mm</span>
      </div>
      <div className="mt-2 pt-2 border-t border-white/5">
        <p className="text-[10px] text-white/55 leading-snug line-clamp-3">
          {day.text}
        </p>
      </div>
    </div>
  )
}

function LocationForecast({ row }: { row: NiwaForecastRow }) {
  // Peak stats across all 8 days
  const days = row.summary ?? []
  const peakGust = Math.max(0, ...days.map((d) => d.wind_gust?.max ?? 0))
  const totalRain = days.reduce(
    (sum, d) => sum + (d.precipitation?.precipitation_amount ?? 0),
    0,
  )
  const peakTemp = Math.max(0, ...days.map((d) => d.temperature?.max ?? 0))

  return (
    <div className="rounded-lg bg-[#0a1020]/70 border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-sky-500/20 border border-sky-500/30">
            <MapPin className="h-3 w-3 text-sky-300" />
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">
              {row.location_name}
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              8-day NIWA forecast
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
          <div className="flex items-center gap-1 text-white/60">
            <Wind className="h-3 w-3 text-amber-400" />
            <span className="tabular-nums">peak {Math.round(peakGust)}km/h</span>
          </div>
          <div className="flex items-center gap-1 text-white/60">
            <Droplets className="h-3 w-3 text-sky-400" />
            <span className="tabular-nums">{Math.round(totalRain)}mm</span>
          </div>
          <div className="flex items-center gap-1 text-white/60">
            <Thermometer className="h-3 w-3 text-red-400" />
            <span className="tabular-nums">{Math.round(peakTemp)}°</span>
          </div>
        </div>
      </div>
      <div className="p-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {days.map((d) => (
            <DayCard key={d.start} day={d} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function NiwaForecast() {
  const { data: rows, isLoading } = useNiwaForecast()
  const [selected, setSelected] = useState<string | null>(null)

  const locationNames = rows?.map((r) => r.location_name) ?? []
  const filtered = selected
    ? rows?.filter((r) => r.location_name === selected)
    : rows

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/10 via-[#0f1729]/80 to-[#0f1729]/80 border border-sky-500/20 backdrop-blur-sm">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 border border-sky-500/30">
              <CloudSun className="h-4 w-4 text-sky-300" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
                NIWA 8-day Forecast
              </div>
              <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
                api.niwa.co.nz · 6 impact-zone locations
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className={`text-[9px] uppercase tracking-wider font-mono px-2 py-1 rounded border transition-colors ${
                selected === null
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              All
            </button>
            {locationNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                className={`text-[9px] uppercase tracking-wider font-mono px-2 py-1 rounded border transition-colors ${
                  selected === name
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                    : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading && !rows && (
          <>
            <div className="h-44 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-44 bg-white/5 rounded-lg animate-pulse" />
          </>
        )}
        {filtered?.map((row) => <LocationForecast key={row.location_id} row={row} />)}
        {rows && rows.length === 0 && (
          <div className="text-sm text-white/50 italic py-6 text-center">
            No NIWA forecast data yet.
          </div>
        )}
      </div>
    </div>
  )
}
