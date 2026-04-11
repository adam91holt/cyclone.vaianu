import {
  Wind,
  CloudRain,
  Zap,
  Construction,
  Navigation,
  AlertTriangle,
} from 'lucide-react'
import {
  REGIONS,
  TOWN_TO_REGION,
  WARNING_COLORS,
  haversineKm,
  type Region,
} from '@/lib/cyclone'
import { useCyclonePosition } from '@/hooks/useCyclonePosition'
import { useRegionWeather } from '@/hooks/useWeather'
import { useMetServiceObservations } from '@/hooks/useMetServiceObservations'
import { usePowerOutagesSummary } from '@/hooks/usePowerOutages'
import { useNztaRoads } from '@/hooks/useNztaRoads'
import { useLiveRegionWarnings } from '@/hooks/useLiveRegionWarnings'
import { useSelectedRegion } from '@/context/RegionContext'

// Compass cardinal for a forward bearing in degrees.
function bearingCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(((deg % 360) / 45)) % 8]
}

interface RegionMetrics {
  region: Region
  distanceKm: number
  bearingDeg: number
  bearingLabel: string
  warningLevel: keyof typeof WARNING_COLORS
  warningEvents: string[]
  windKmh: number
  gustKmh: number
  rainfall3h: number | null
  rainfallRegionWide: number
  outagesCustomers: number
  outagesIncidents: number
  roadClosures: number
}

export function RegionalImpactBoard() {
  const cyclone = useCyclonePosition()
  const { data: regionWeather } = useRegionWeather()
  const { data: towns } = useMetServiceObservations()
  const { data: outagesSummary } = usePowerOutagesSummary()
  const { data: roadsData } = useNztaRoads()
  const liveWarnings = useLiveRegionWarnings()
  const { regionId, setRegionId } = useSelectedRegion()

  // Build a per-region metrics bundle.
  const metrics: RegionMetrics[] = REGIONS.map((region) => {
    // Distance + bearing from cyclone eye
    const distanceKm = Math.round(
      haversineKm(cyclone.lat, cyclone.lon, region.lat, region.lon),
    )
    // Forward bearing from cyclone to region (degrees from true north)
    const toRad = (d: number) => (d * Math.PI) / 180
    const toDeg = (r: number) => (r * 180) / Math.PI
    const φ1 = toRad(cyclone.lat)
    const φ2 = toRad(region.lat)
    const Δλ = toRad(region.lon - cyclone.lon)
    const y = Math.sin(Δλ) * Math.cos(φ2)
    const x =
      Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
    const bearingDeg = (toDeg(Math.atan2(y, x)) + 360) % 360
    const bearingLabel = bearingCardinal(bearingDeg)

    // Warning level — prefer live MetService, fall back to static.
    const warning = liveWarnings[region.id]
    const warningLevel = warning?.level ?? region.warning
    const warningEvents = warning?.events ?? []

    // Wind + gust — modelled region weather is the best per-region number.
    const rw = regionWeather?.find((r) => r.regionId === region.id)
    const windKmh = rw?.windKmh ?? 0
    const gustKmh = rw?.gustKmh ?? 0

    // Rainfall — peak 3h from MetService stations that roll up to this region.
    const regionTowns =
      towns?.filter((t) => TOWN_TO_REGION[t.town_slug] === region.id) ?? []
    const rainfall3h = regionTowns.reduce<number | null>((max, t) => {
      const mm = t.rainfall_3h_mm
      if (mm == null) return max
      if (max == null || mm > max) return mm
      return max
    }, null)
    // Fallback: the modelled region precip (current-hour) if no station data.
    const rainfallRegionWide = rw?.precipitationMm ?? 0

    // Power outages — by_region aggregation from the summary table. Keys are
    // free-form region strings matching what the adapters emit.
    const outagesRaw = outagesSummary?.by_region ?? {}
    const outagesForRegion = outagesRaw[region.name] ?? {
      customers: 0,
      incidents: 0,
    }
    const outagesCustomers = outagesForRegion.customers ?? 0
    const outagesIncidents = outagesForRegion.incidents ?? 0

    // Road closures — count unplanned closures whose `region` matches.
    const roadClosures =
      roadsData?.events.filter(
        (e) =>
          !e.planned && e.severity === 'closed' && e.region === region.name,
      ).length ?? 0

    return {
      region,
      distanceKm,
      bearingDeg,
      bearingLabel,
      warningLevel,
      warningEvents,
      windKmh,
      gustKmh,
      rainfall3h,
      rainfallRegionWide,
      outagesCustomers,
      outagesIncidents,
      roadClosures,
    }
  })

  // Sort by closest to cyclone eye — most urgent region at the top-left.
  metrics.sort((a, b) => a.distanceKm - b.distanceKm)

  // Impact totals (hero numbers above the grid).
  const totalCustomersOff = metrics.reduce(
    (sum, m) => sum + m.outagesCustomers,
    0,
  )
  const totalClosures = metrics.reduce((sum, m) => sum + m.roadClosures, 0)
  const peakGust = Math.max(...metrics.map((m) => m.gustKmh))
  const peakGustRegion = metrics.find((m) => m.gustKmh === peakGust)?.region
    .short
  const redCount = metrics.filter((m) => m.warningLevel === 'red').length
  const orangeCount = metrics.filter((m) => m.warningLevel === 'orange').length

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header band */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06] bg-gradient-to-r from-red-950/40 via-[#0f1729]/60 to-[#0f1729]/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
            <AlertTriangle className="h-3 w-3 text-red-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
              Regional impact board
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/45 font-mono truncate">
            Post-landfall · sorted by distance to cyclone eye
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0 text-[10px] font-mono uppercase tracking-wider">
          {redCount > 0 && (
            <span className="text-red-300">
              <span className="tabular-nums font-bold">{redCount}</span> red
            </span>
          )}
          {orangeCount > 0 && (
            <span className="text-amber-300">
              <span className="tabular-nums font-bold">{orangeCount}</span>{' '}
              orange
            </span>
          )}
        </div>
      </div>

      {/* Hero totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/[0.06] border-b border-white/[0.06]">
        <HeroStat
          label="Peak gust"
          value={peakGust > 0 ? peakGust.toLocaleString() : '—'}
          unit="km/h"
          sub={peakGustRegion ? `${peakGustRegion} · modelled` : 'No data'}
          accent="text-red-300"
          icon={Wind}
        />
        <HeroStat
          label="Customers off"
          value={totalCustomersOff.toLocaleString()}
          sub={
            outagesSummary
              ? `${outagesSummary.total_incidents} live faults`
              : 'Loading…'
          }
          accent="text-amber-300"
          icon={Zap}
        />
        <HeroStat
          label="Road closures"
          value={totalClosures.toString()}
          sub="NZTA · unplanned"
          accent="text-rose-300"
          icon={Construction}
        />
        <HeroStat
          label="Cyclone eye"
          value={
            cyclone
              ? `${Math.round(
                  haversineKm(
                    cyclone.lat,
                    cyclone.lon,
                    metrics[0].region.lat,
                    metrics[0].region.lon,
                  ),
                ).toLocaleString()} km`
              : '—'
          }
          sub={`Closest · ${metrics[0].region.short}`}
          accent="text-sky-300"
          icon={Navigation}
        />
      </div>

      {/* Region card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-px bg-white/[0.06]">
        {metrics.map((m) => {
          const active = regionId === m.region.id
          const warn = WARNING_COLORS[m.warningLevel]
          return (
            <button
              key={m.region.id}
              type="button"
              onClick={() =>
                setRegionId(active ? 'all' : m.region.id)
              }
              className={`group text-left bg-[#0f1729]/80 hover:bg-[#142036] transition-colors p-3 flex flex-col gap-2 ${
                active ? 'ring-1 ring-inset ring-red-500/60' : ''
              }`}
            >
              {/* Region header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono">
                    {m.region.short}
                  </div>
                  <div className="font-display text-sm font-bold tracking-tight text-white truncate">
                    {m.region.name}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold ${warn.bg} text-white border-white/20`}
                >
                  {warn.label}
                </span>
              </div>

              {/* Distance from cyclone eye */}
              <div className="flex items-baseline gap-1.5 font-mono">
                <Navigation
                  className="h-3 w-3 text-sky-400 shrink-0"
                  style={{
                    transform: `rotate(${m.bearingDeg - 45}deg)`,
                  }}
                />
                <span className="tabular-nums text-lg font-bold text-white leading-none">
                  {m.distanceKm.toLocaleString()}
                </span>
                <span className="text-[10px] text-white/50">km</span>
                <span className="ml-auto text-[9px] uppercase tracking-wider text-white/40">
                  from eye · {m.bearingLabel}
                </span>
              </div>

              {/* Metric rows */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono pt-1 border-t border-white/[0.06]">
                <MetricRow
                  icon={Wind}
                  label="Gust"
                  value={m.gustKmh > 0 ? `${m.gustKmh}` : '—'}
                  unit="km/h"
                  colour="text-amber-200"
                />
                <MetricRow
                  icon={CloudRain}
                  label="Rain 3h"
                  value={
                    m.rainfall3h != null
                      ? m.rainfall3h.toFixed(1)
                      : m.rainfallRegionWide > 0
                        ? m.rainfallRegionWide.toFixed(1)
                        : '—'
                  }
                  unit="mm"
                  colour="text-sky-200"
                />
                <MetricRow
                  icon={Zap}
                  label="Power off"
                  value={
                    m.outagesCustomers > 0
                      ? m.outagesCustomers.toLocaleString()
                      : '0'
                  }
                  unit=""
                  colour={
                    m.outagesCustomers > 500
                      ? 'text-red-300'
                      : m.outagesCustomers > 0
                        ? 'text-amber-200'
                        : 'text-white/40'
                  }
                />
                <MetricRow
                  icon={Construction}
                  label="Closures"
                  value={m.roadClosures.toString()}
                  unit=""
                  colour={
                    m.roadClosures > 0 ? 'text-rose-300' : 'text-white/40'
                  }
                />
              </div>

              {/* Warning event chip */}
              {m.warningEvents.length > 0 && (
                <div className="text-[9px] uppercase tracking-wider font-mono text-white/50 line-clamp-1">
                  {m.warningEvents.slice(0, 2).join(' · ')}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-white/[0.06]">
        <div className="text-[9px] uppercase tracking-wider font-mono text-white/35">
          Tap a region to filter the dashboard
        </div>
        {cyclone.isAi && (
          <div className="text-[9px] uppercase tracking-wider font-mono text-sky-400/60">
            Eye position · AI live
          </div>
        )}
      </div>
    </div>
  )
}

function HeroStat({
  label,
  value,
  unit,
  sub,
  accent,
  icon: Icon,
}: {
  label: string
  value: string
  unit?: string
  sub?: string
  accent: string
  icon: typeof Wind
}) {
  return (
    <div className="bg-[#0f1729]/90 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-[0.2em] text-white/45 font-mono font-semibold">
          {label}
        </div>
        <Icon className="h-3.5 w-3.5 text-white/25" />
      </div>
      <div className="font-mono tabular-nums">
        <span className={`text-2xl font-bold leading-none ${accent}`}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-white/50 ml-1">{unit}</span>
        )}
      </div>
      {sub && (
        <div className="text-[9px] uppercase tracking-wider font-mono text-white/40">
          {sub}
        </div>
      )}
    </div>
  )
}

function MetricRow({
  icon: Icon,
  label,
  value,
  unit,
  colour,
}: {
  icon: typeof Wind
  label: string
  value: string
  unit: string
  colour: string
}) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <Icon className="h-2.5 w-2.5 text-white/35 shrink-0" />
      <span className="text-white/45 shrink-0">{label}</span>
      <span className={`ml-auto tabular-nums font-bold ${colour} truncate`}>
        {value}
        {unit && <span className="text-white/40 font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}
