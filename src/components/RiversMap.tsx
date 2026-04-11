import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Waves,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { useRivers, type RiverSiteSummary } from '@/hooks/useRivers'

// Sites whose names clearly describe tidal / coastal locations rather than
// a freshwater river. We still show them on the map (they're real sensors)
// but exclude them from the "fastest rising" list — a harbour swinging
// 30% on a tide isn't useful signal for cyclone flood watch.
const TIDAL_RE =
  /(harbour|lagoon|estuary|wharf|port|bay|coast|causeway|open sea|inlet|sound|tide|sea level)/i

// Council metadata for the header chip.
const COUNCIL_LABEL: Record<string, string> = {
  northland: 'Northland',
  taranaki: 'Taranaki',
  horizons: 'Horizons',
  gisborne: 'Gisborne',
  hawkesbay: "Hawke's Bay",
  wellington: 'Wellington',
  marlborough: 'Marlborough',
  tasman: 'Tasman',
  nelson: 'Nelson',
  westcoast: 'West Coast',
}

type TrendLevel = 'severe' | 'high' | 'moderate' | 'steady' | 'falling' | 'none'

interface TrendStyle {
  colour: string
  radius: number
  weight: number
  opacity: number
  label: string
}

// Percentage + absolute thresholds. Absolute matters because some stage
// sensors report in millimetres of water depth (Northland) while others
// report metres (Taranaki) — a 50mm rise in mm is different signal from a
// 50mm rise in metres.
function classify(site: RiverSiteSummary): TrendLevel {
  if (site.latest_value === null) return 'none'
  if (site.change === null || site.change_pct === null) return 'steady'
  const pct = site.change_pct
  if (pct >= 15) return 'severe'
  if (pct >= 5) return 'high'
  if (pct >= 2) return 'moderate'
  if (pct <= -2) return 'falling'
  return 'steady'
}

const TREND_STYLES: Record<TrendLevel, TrendStyle> = {
  severe: {
    colour: '#ef4444',
    radius: 7,
    weight: 1.5,
    opacity: 1,
    label: 'Rising sharply',
  },
  high: {
    colour: '#f59e0b',
    radius: 5.5,
    weight: 1.2,
    opacity: 0.95,
    label: 'Rising',
  },
  moderate: {
    colour: '#fbbf24',
    radius: 4.5,
    weight: 1,
    opacity: 0.85,
    label: 'Rising slowly',
  },
  steady: {
    colour: '#22d3ee',
    radius: 3,
    weight: 0.8,
    opacity: 0.7,
    label: 'Steady',
  },
  falling: {
    colour: '#60a5fa',
    radius: 3.5,
    weight: 0.8,
    opacity: 0.7,
    label: 'Falling',
  },
  none: {
    colour: '#6b7280',
    radius: 2.5,
    weight: 0.5,
    opacity: 0.4,
    label: 'No recent data',
  },
}

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return '—'
  const u = unit ?? ''
  // Metres round to 2dp, millimetres to 0dp, everything else 2dp.
  if (u === 'm') return `${value.toFixed(2)} m`
  if (u === 'mm') return `${Math.round(value)} mm`
  return `${value.toFixed(2)}${u ? ' ' + u : ''}`
}

function formatChange(
  change: number | null,
  pct: number | null,
  unit: string | null,
): string {
  if (change === null || pct === null) return '—'
  const sign = change > 0 ? '+' : ''
  const abs =
    unit === 'm'
      ? `${sign}${change.toFixed(2)} m`
      : unit === 'mm'
        ? `${sign}${Math.round(change)} mm`
        : `${sign}${change.toFixed(2)}`
  return `${abs} (${sign}${pct.toFixed(1)}%)`
}

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return null
  }
}

function TrendIcon({ level }: { level: TrendLevel }) {
  if (level === 'falling')
    return <TrendingDown className="h-3 w-3 text-blue-300" />
  if (level === 'severe')
    return <TrendingUp className="h-3 w-3 text-red-300" />
  if (level === 'high' || level === 'moderate')
    return <TrendingUp className="h-3 w-3 text-amber-300" />
  return <Minus className="h-3 w-3 text-cyan-300" />
}

type ScopeFilter = 'all' | 'upper-ni' | 'north'

const UPPER_NI_COUNCILS = new Set([
  'northland',
  'gisborne',
  'hawkesbay',
  'horizons',
])
const NORTH_ISLAND_COUNCILS = new Set([
  'northland',
  'taranaki',
  'horizons',
  'gisborne',
  'hawkesbay',
  'wellington',
])

export function RiversMap() {
  const { data, isLoading, error } = useRivers()
  const [scope, setScope] = useState<ScopeFilter>('upper-ni')

  const all = data ?? []

  const scoped = useMemo(() => {
    if (scope === 'all') return all
    if (scope === 'upper-ni')
      return all.filter((s) => UPPER_NI_COUNCILS.has(s.council))
    return all.filter((s) => NORTH_ISLAND_COUNCILS.has(s.council))
  }, [all, scope])

  const counts = useMemo(() => {
    let severe = 0
    let high = 0
    let moderate = 0
    let steady = 0
    let falling = 0
    let none = 0
    for (const s of scoped) {
      const t = classify(s)
      if (t === 'severe') severe++
      else if (t === 'high') high++
      else if (t === 'moderate') moderate++
      else if (t === 'falling') falling++
      else if (t === 'none') none++
      else steady++
    }
    return { severe, high, moderate, steady, falling, none, total: scoped.length }
  }, [scoped])

  // Fastest rising, excluding tidal stations. Sort by change_pct descending,
  // cap at 10. Requires both a baseline and a positive change.
  const rising = useMemo(() => {
    return scoped
      .filter(
        (s) =>
          s.change !== null &&
          s.change > 0 &&
          s.change_pct !== null &&
          s.change_pct > 0 &&
          s.latest_value !== null &&
          s.latest_value > 0 &&
          s.baseline_value !== null &&
          s.baseline_value > 0 &&
          !TIDAL_RE.test(s.name),
      )
      .sort((a, b) => (b.change_pct ?? 0) - (a.change_pct ?? 0))
      .slice(0, 10)
  }, [scoped])

  const renderable = useMemo(
    () => scoped.filter((s) => s.latitude !== null && s.longitude !== null),
    [scoped],
  )

  const mapCentre: [number, number] =
    scope === 'all'
      ? [-41, 174]
      : scope === 'north'
        ? [-39, 175]
        : [-37.5, 176]
  const mapZoom = scope === 'all' ? 5 : scope === 'north' ? 6 : 7

  return (
    <div className="space-y-3">
      {/* Header + filters + stats */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-cyan-400" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              River Levels · Live · {counts.total.toLocaleString()} sites
            </div>
          </div>
          <div className="flex gap-1">
            {(
              [
                { key: 'upper-ni', label: 'Upper NI' },
                { key: 'north', label: 'North Is.' },
                { key: 'all', label: 'All NZ' },
              ] as { key: ScopeFilter; label: string }[]
            ).map(({ key, label }) => {
              const active = scope === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border transition-colors ${
                    active
                      ? 'bg-white/15 border-white/30 text-white'
                      : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat
            label="Rising sharply"
            value={counts.severe}
            accent="text-red-300"
          />
          <Stat label="Rising" value={counts.high} accent="text-amber-300" />
          <Stat
            label="Rising slow"
            value={counts.moderate}
            accent="text-yellow-200"
          />
          <Stat label="Steady" value={counts.steady} accent="text-cyan-300" />
          <Stat label="Falling" value={counts.falling} accent="text-blue-300" />
        </div>
      </div>

      {/* Map + rising panel side by side on wide, stacked on narrow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 bg-[#0f1729]/80 border border-white/10 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="h-[560px] flex items-center justify-center text-white/50 text-xs font-mono uppercase tracking-wider">
              Loading river levels…
            </div>
          )}
          {error && (
            <div className="h-[560px] flex items-center justify-center text-red-300 text-xs font-mono uppercase tracking-wider">
              <AlertTriangle className="h-3 w-3 mr-2" />
              Failed to load rivers
            </div>
          )}
          {!isLoading && !error && (
            <div className="h-[560px] relative">
              <MapContainer
                key={scope}
                center={mapCentre}
                zoom={mapZoom}
                preferCanvas
                style={{ height: '100%', width: '100%', background: '#0a1020' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {renderable.map((s) => {
                  const level = classify(s)
                  const style = TREND_STYLES[level]
                  return (
                    <CircleMarker
                      key={`${s.council}::${s.name}`}
                      center={[s.latitude, s.longitude]}
                      radius={style.radius}
                      pathOptions={{
                        color: style.colour,
                        weight: style.weight,
                        opacity: style.opacity,
                        fillColor: style.colour,
                        fillOpacity: level === 'severe' ? 0.85 : 0.55,
                      }}
                    >
                      <Popup>
                        <SitePopup site={s} level={level} />
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>

              {/* Legend */}
              <div className="absolute bottom-3 left-3 z-[400] bg-[#0f1729]/95 border border-white/10 rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/70 space-y-1 pointer-events-none">
                <div className="text-white/40 mb-1">vs 2h ago</div>
                <LegendRow colour={TREND_STYLES.severe.colour} label="+15% rising" />
                <LegendRow colour={TREND_STYLES.high.colour} label="+5% rising" />
                <LegendRow
                  colour={TREND_STYLES.moderate.colour}
                  label="+2% rising"
                />
                <LegendRow colour={TREND_STYLES.steady.colour} label="Steady" />
                <LegendRow colour={TREND_STYLES.falling.colour} label="Falling" />
              </div>
            </div>
          )}
        </div>

        {/* Fastest rising panel */}
        <div className="lg:col-span-4 bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-red-300" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              Fastest Rising · 2 hr
            </div>
          </div>
          {!isLoading && !error && rising.length === 0 && (
            <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-6 text-center">
              No rising rivers in scope
            </div>
          )}
          <div className="space-y-1.5 flex-1">
            {rising.map((s) => {
              const level = classify(s)
              const style = TREND_STYLES[level]
              return (
                <div
                  key={`${s.council}::${s.name}`}
                  className="relative rounded bg-white/[0.02] border border-white/5 px-2.5 py-1.5 overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: style.colour }}
                  />
                  <div className="pl-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-white leading-tight truncate">
                        {s.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-[9px] uppercase tracking-wider font-mono text-white/35">
                        {COUNCIL_LABEL[s.council] ?? s.council}
                      </span>
                      <span
                        className="text-[10px] font-mono font-bold tabular-nums"
                        style={{ color: style.colour }}
                      >
                        {formatChange(s.change, s.change_pct, s.unit)}
                      </span>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-mono text-white/40 mt-0.5">
                      Now {formatValue(s.latest_value, s.unit)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SitePopupProps {
  site: RiverSiteSummary
  level: TrendLevel
}

function SitePopup({ site, level }: SitePopupProps) {
  const style = TREND_STYLES[level]
  return (
    <div className="text-[11px] leading-relaxed font-sans min-w-[220px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: style.colour }}
        />
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
          {COUNCIL_LABEL[site.council] ?? site.council} · Stage
        </span>
      </div>
      <div className="font-semibold text-neutral-900 text-[12px] mb-1.5 leading-snug">
        {site.name}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-1">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">
            Now
          </div>
          <div className="text-[13px] font-bold tabular-nums text-neutral-900">
            {formatValue(site.latest_value, site.unit)}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-mono">
            2h ago
          </div>
          <div className="text-[13px] font-bold tabular-nums text-neutral-700">
            {formatValue(site.baseline_value, site.unit)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-neutral-200">
        <TrendIcon level={level} />
        <span
          className="text-[10px] font-mono font-bold"
          style={{ color: style.colour }}
        >
          {formatChange(site.change, site.change_pct, site.unit)}
        </span>
        <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-400 ml-auto">
          {style.label}
        </span>
      </div>
      {site.latest_ts && (
        <div className="text-[9px] uppercase tracking-wider font-mono text-neutral-400 mt-1">
          {formatTime(site.latest_ts)} NZ
        </div>
      )}
    </div>
  )
}

interface StatProps {
  label: string
  value: number
  accent: string
}

function Stat({ label, value, accent }: StatProps) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-md px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums ${accent}`}>{value}</div>
    </div>
  )
}

function LegendRow({ colour, label }: { colour: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: colour }}
      />
      {label}
    </div>
  )
}
