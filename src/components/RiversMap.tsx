import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Waves,
  AlertTriangle,
  TrendingUp,
  Search,
  BarChart3,
} from 'lucide-react'
import { useRivers, type RiverSiteSummary } from '@/hooks/useRivers'
import { RiverDetailDialog } from '@/components/RiverDetailDialog'
import { RiverHistoryList } from '@/components/RiverHistoryList'
import {
  useAllRiverHistories,
  type RiverSparklineData,
} from '@/hooks/useAllRiverHistories'

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

type SidePanel = 'rising' | 'all'
type SortKey = 'change_pct' | 'change_pct_asc' | 'name' | 'council'

export function RiversMap() {
  const { data, isLoading, error } = useRivers()
  const { data: histories } = useAllRiverHistories()
  const [scope, setScope] = useState<ScopeFilter>('upper-ni')
  const [panel, setPanel] = useState<SidePanel>('rising')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('change_pct')
  const [selected, setSelected] = useState<{
    council: string
    name: string
  } | null>(null)

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

  // "All sites" view — searchable + sortable list of every site in scope,
  // regardless of whether they're currently rising. Skip sites without any
  // reading so the list only shows rivers that actually have a trace.
  const allSitesFiltered = useMemo(() => {
    const withData = scoped.filter((s) => s.latest_value !== null)
    const q = search.trim().toLowerCase()
    const base = q
      ? withData.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (COUNCIL_LABEL[s.council] ?? s.council).toLowerCase().includes(q),
        )
      : withData
    const sorted = [...base]
    if (sortKey === 'change_pct') {
      // Rising first, then steady, then falling, then no-data at the bottom.
      sorted.sort((a, b) => {
        const av = a.change_pct === null ? -Infinity : a.change_pct
        const bv = b.change_pct === null ? -Infinity : b.change_pct
        return bv - av
      })
    } else if (sortKey === 'change_pct_asc') {
      sorted.sort((a, b) => {
        const av = a.change_pct === null ? Infinity : a.change_pct
        const bv = b.change_pct === null ? Infinity : b.change_pct
        return av - bv
      })
    } else if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      sorted.sort(
        (a, b) =>
          (COUNCIL_LABEL[a.council] ?? a.council).localeCompare(
            COUNCIL_LABEL[b.council] ?? b.council,
          ) || a.name.localeCompare(b.name),
      )
    }
    return sorted
  }, [scoped, search, sortKey])

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
                      eventHandlers={{
                        click: () =>
                          setSelected({ council: s.council, name: s.name }),
                      }}
                    />
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

        {/* Side panel — tabs between Fastest rising and All sites */}
        <div className="lg:col-span-4 bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 flex flex-col max-h-[560px]">
          <div className="flex items-center gap-1 mb-3 shrink-0">
            <button
              type="button"
              onClick={() => setPanel('rising')}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded border transition-colors ${
                panel === 'rising'
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              <TrendingUp className="h-3 w-3" />
              Fastest rising
            </button>
            <button
              type="button"
              onClick={() => setPanel('all')}
              className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded border transition-colors ${
                panel === 'all'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                  : 'bg-transparent border-white/10 text-white/50 hover:text-white/80'
              }`}
            >
              <BarChart3 className="h-3 w-3" />
              All sites
              <span className="text-[9px] tabular-nums text-white/40 ml-0.5">
                {scoped.length}
              </span>
            </button>
          </div>

          {panel === 'rising' && (
            <>
              <div className="text-[9px] uppercase tracking-[0.18em] font-mono text-white/40 mb-2">
                Top rises over the last 2 hours
              </div>
              {!isLoading && !error && rising.length === 0 && (
                <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-6 text-center">
                  No rising rivers in scope
                </div>
              )}
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 -mr-1">
                {rising.map((s) => (
                  <SiteRow
                    key={`${s.council}::${s.name}`}
                    site={s}
                    history={histories?.get(`${s.council}::${s.name}`)}
                    onClick={() =>
                      setSelected({ council: s.council, name: s.name })
                    }
                  />
                ))}
              </div>
            </>
          )}

          {panel === 'all' && (
            <>
              <div className="relative mb-2 shrink-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sites or council…"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-md pl-7 pr-2 py-1.5 text-[11px] text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-cyan-500/40"
                />
              </div>
              <div className="flex items-center gap-1 mb-2 flex-wrap shrink-0">
                <span className="text-[9px] uppercase tracking-wider font-mono text-white/35">
                  Sort
                </span>
                {(
                  [
                    { key: 'change_pct', label: 'Rising' },
                    { key: 'change_pct_asc', label: 'Falling' },
                    { key: 'name', label: 'Name' },
                    { key: 'council', label: 'Council' },
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => {
                  const active = sortKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortKey(key)}
                      className={`text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border transition-colors ${
                        active
                          ? 'bg-white/10 border-white/25 text-white'
                          : 'bg-transparent border-white/5 text-white/40 hover:text-white/70'
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {allSitesFiltered.length === 0 && (
                <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-6 text-center">
                  No matches
                </div>
              )}
              <div className="space-y-1 flex-1 overflow-y-auto pr-1 -mr-1">
                {allSitesFiltered.map((s) => (
                  <SiteRow
                    key={`${s.council}::${s.name}`}
                    site={s}
                    history={histories?.get(`${s.council}::${s.name}`)}
                    compact
                    onClick={() =>
                      setSelected({ council: s.council, name: s.name })
                    }
                  />
                ))}
              </div>
            </>
          )}
          <div className="text-[9px] uppercase tracking-wider font-mono text-white/30 pt-2 mt-2 border-t border-white/5 shrink-0">
            Tap a site for 24 h history
          </div>
        </div>
      </div>

      {/* Full-width list: every river in scope with its own 24 h sparkline */}
      <RiverHistoryList sites={scoped} onSelect={setSelected} />

      <RiverDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        council={selected?.council ?? null}
        site={selected?.name ?? null}
      />
    </div>
  )
}

interface SiteRowProps {
  site: RiverSiteSummary
  history?: RiverSparklineData
  compact?: boolean
  onClick: () => void
}

// Compact sparkline path builder — normalises Y to the row's min/max range.
function sparkPath(
  values: number[],
  min: number,
  max: number,
  width: number,
  height: number,
): string {
  if (values.length === 0) return ''
  const range = max - min
  const xStep = width / Math.max(1, values.length - 1)
  const parts: string[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (Number.isNaN(v)) continue
    const x = i * xStep
    const y = range > 0 ? height - ((v - min) / range) * height : height / 2
    parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return parts.join(' ')
}

function SiteRow({ site, history, compact = false, onClick }: SiteRowProps) {
  const level = classify(site)
  const style = TREND_STYLES[level]
  const W = 200
  const H = compact ? 16 : 20
  const path = history ? sparkPath(history.values, history.min, history.max, W, H) : ''
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full relative text-left rounded bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/15 transition-colors overflow-hidden"
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: style.colour }}
      />
      <div className={`pl-2 pr-2.5 ${compact ? 'py-1' : 'py-1.5'}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold text-white leading-tight truncate">
            {site.name}
          </span>
          <span
            className="text-[10px] font-mono font-bold tabular-nums shrink-0"
            style={{ color: style.colour }}
          >
            {site.change_pct !== null
              ? `${site.change_pct > 0 ? '+' : ''}${site.change_pct.toFixed(1)}%`
              : '—'}
          </span>
        </div>
        {/* Inline sparkline — full row width */}
        <div className="mt-1 h-4 relative" style={{ height: H }}>
          {path ? (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <path
                d={path}
                fill="none"
                stroke={style.colour}
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity={0.95}
              />
            </svg>
          ) : (
            <div className="h-full flex items-center">
              <div className="h-px w-full bg-white/5" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-[9px] uppercase tracking-wider font-mono text-white/35 truncate">
            {COUNCIL_LABEL[site.council] ?? site.council}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-white/45 shrink-0">
            {formatValue(site.latest_value, site.unit)}
          </span>
        </div>
      </div>
    </button>
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
