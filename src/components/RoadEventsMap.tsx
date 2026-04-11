import { useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
} from 'react-leaflet'
import type { PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  useNztaRoads,
  type RoadEvent,
  type RoadSeverity,
} from '@/hooks/useNztaRoads'
import { AlertTriangle, Construction, Clock, MapPin } from 'lucide-react'

const SEVERITY_COLOURS: Record<RoadSeverity, string> = {
  closed: '#ef4444', // red-500
  delay: '#f59e0b', // amber-500
  hazard: '#a855f7', // purple-500
  caution: '#64748b', // slate-500
}

const SEVERITY_LABELS: Record<RoadSeverity, string> = {
  closed: 'Closed',
  delay: 'Delays',
  hazard: 'Hazard',
  caution: 'Caution',
}

// Upper North Island = the regions vaianu.live focuses on. We default to
// these but allow "All NZ" as a toggle so anyone outside the cyclone zone
// can still see their local events.
const UPPER_NI_REGIONS = new Set([
  'Auckland',
  'Northland',
  'Waikato',
  'Bay Of Plenty',
  'Gisborne',
  'Hawkes Bay',
])

type ScopeFilter = 'upper-ni' | 'north' | 'all'
type StatusFilter = 'unplanned' | 'all'

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

function styleForEvent(e: RoadEvent): PathOptions {
  const base = SEVERITY_COLOURS[e.severity]
  const isLine =
    e.geometry?.type === 'LineString' || e.geometry?.type === 'MultiLineString'
  return {
    color: base,
    weight: isLine ? (e.severity === 'closed' ? 5 : 4) : 2,
    opacity: e.severity === 'closed' ? 1 : 0.8,
    fillColor: base,
    fillOpacity: 0.35,
    dashArray: e.planned ? '6 4' : undefined,
  }
}

interface PopupContentProps {
  event: RoadEvent
}

function EventPopup({ event }: PopupContentProps) {
  const start = formatTime(event.start_date)
  const end = formatTime(event.end_date)
  return (
    <div className="text-[11px] leading-relaxed font-sans min-w-[240px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: SEVERITY_COLOURS[event.severity] }}
        />
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
          NZTA · {event.highway ?? 'State Highway'} ·{' '}
          {event.planned ? 'Planned' : 'Unplanned'}
        </span>
      </div>
      <div className="font-semibold text-neutral-900 text-[12px] mb-1">
        {event.impact ?? event.event_type ?? 'Road event'}
      </div>
      {event.location && (
        <div className="text-neutral-700 mb-1 flex gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{event.location}</span>
        </div>
      )}
      {event.comments && (
        <div className="text-neutral-600 italic mb-1 text-[10px] leading-snug">
          {event.comments.length > 260
            ? event.comments.slice(0, 260) + '…'
            : event.comments}
        </div>
      )}
      {start && (
        <div className="text-neutral-700">
          <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
          Started {start}
        </div>
      )}
      {end && <div className="text-neutral-700">Expected clear {end}</div>}
      {event.alternative_route && (
        <div className="text-neutral-600 text-[10px] mt-1 border-t border-neutral-200 pt-1">
          <span className="font-semibold">Alternative: </span>
          {event.alternative_route.length > 160
            ? event.alternative_route.slice(0, 160) + '…'
            : event.alternative_route}
        </div>
      )}
      <div className="text-neutral-400 text-[9px] mt-1 font-mono uppercase tracking-wider">
        {event.region ?? event.island ?? 'NZ'} · {event.status ?? 'Active'}
      </div>
    </div>
  )
}

export function RoadEventsMap() {
  const { data, isLoading, error } = useNztaRoads()
  const [scope, setScope] = useState<ScopeFilter>('upper-ni')
  const [status, setStatus] = useState<StatusFilter>('unplanned')

  const filtered = useMemo(() => {
    const events = data?.events ?? []
    return events.filter((e) => {
      if (status === 'unplanned' && e.planned) return false
      if (scope === 'upper-ni' && !(e.region && UPPER_NI_REGIONS.has(e.region))) {
        return false
      }
      if (scope === 'north' && e.island !== 'North Island') return false
      return true
    })
  }, [data, scope, status])

  const counts = useMemo(() => {
    const closed = filtered.filter((e) => e.severity === 'closed').length
    const delay = filtered.filter((e) => e.severity === 'delay').length
    const hazard = filtered.filter((e) => e.severity === 'hazard').length
    const caution = filtered.filter((e) => e.severity === 'caution').length
    return { closed, delay, hazard, caution, total: filtered.length }
  }, [filtered])

  const lineEvents = filtered.filter(
    (e) =>
      e.geometry?.type === 'LineString' || e.geometry?.type === 'MultiLineString',
  )
  const pointEvents = filtered.filter(
    (e) => e.geometry?.type === 'Point' || (e.centroid && !e.geometry),
  )

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Construction className="h-4 w-4 text-amber-400" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              NZTA State Highway Events · Live
            </div>
            {data?.fetched_at && (
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-mono">
                Updated {formatTime(data.fetched_at)}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <ToggleGroup
              value={scope}
              onChange={(v) => setScope(v as ScopeFilter)}
              options={[
                { key: 'upper-ni', label: 'Upper NI' },
                { key: 'north', label: 'North Is.' },
                { key: 'all', label: 'All NZ' },
              ]}
            />
            <ToggleGroup
              value={status}
              onChange={(v) => setStatus(v as StatusFilter)}
              options={[
                { key: 'unplanned', label: 'Unplanned' },
                { key: 'all', label: 'All' },
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Roads closed"
            value={counts.closed.toString()}
            accent="text-red-300"
          />
          <Stat
            label="Delays"
            value={counts.delay.toString()}
            accent="text-amber-300"
          />
          <Stat
            label="Hazards"
            value={counts.hazard.toString()}
            accent="text-purple-300"
          />
          <Stat
            label="Total events"
            value={counts.total.toString()}
            accent="text-white"
          />
        </div>
      </div>

      {/* Map */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="h-[520px] flex items-center justify-center text-white/50 text-xs font-mono uppercase tracking-wider">
            Loading NZTA events…
          </div>
        )}
        {error && (
          <div className="h-[520px] flex items-center justify-center text-red-300 text-xs font-mono uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3 mr-2" />
            Failed to load road events
          </div>
        )}
        {!isLoading && !error && (
          <div className="h-[520px] relative">
            <MapContainer
              center={scope === 'all' ? [-41, 174] : [-37.0, 175.5]}
              zoom={scope === 'all' ? 5 : 7}
              style={{ height: '100%', width: '100%', background: '#0a1020' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {lineEvents.map((e) =>
                e.geometry ? (
                  <GeoJSON
                    key={`l-${e.id}`}
                    data={e.geometry as GeoJSON.Geometry}
                    style={() => styleForEvent(e)}
                  >
                    <Popup>
                      <EventPopup event={e} />
                    </Popup>
                  </GeoJSON>
                ) : null,
              )}

              {pointEvents.map((e) => {
                const pt =
                  e.geometry?.type === 'Point'
                    ? (e.geometry.coordinates as [number, number])
                    : e.centroid
                if (!pt) return null
                return (
                  <CircleMarker
                    key={`p-${e.id}`}
                    center={[pt[1], pt[0]]}
                    radius={e.severity === 'closed' ? 8 : 6}
                    pathOptions={styleForEvent(e)}
                  >
                    <Popup>
                      <EventPopup event={e} />
                    </Popup>
                  </CircleMarker>
                )
              })}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[400] bg-[#0f1729]/95 border border-white/10 rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/70 space-y-1 pointer-events-none">
              <div className="text-white/40 mb-1">Legend</div>
              <LegendRow colour={SEVERITY_COLOURS.closed} label="Road closed" />
              <LegendRow colour={SEVERITY_COLOURS.delay} label="Delays" />
              <LegendRow colour={SEVERITY_COLOURS.hazard} label="Hazard" />
              <LegendRow colour={SEVERITY_COLOURS.caution} label="Caution" />
              <div className="text-white/40 pt-1 border-t border-white/10 mt-1">
                Dashed = planned
              </div>
            </div>
          </div>
        )}
      </div>

      {/* List view — only the worst events, sorted by severity */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold mb-3">
            Priority Events
          </div>
          <div className="space-y-1.5">
            {filtered.slice(0, 10).map((e) => (
              <EventRow key={`row-${e.id}`} event={e} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface StatProps {
  label: string
  value: string
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

interface ToggleGroupProps {
  value: string
  onChange: (v: string) => void
  options: { key: string; label: string }[]
}

function ToggleGroup({ value, onChange, options }: ToggleGroupProps) {
  return (
    <div className="flex gap-1">
      {options.map(({ key, label }) => {
        const active = key === value
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
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

function EventRow({ event }: { event: RoadEvent }) {
  const sev = SEVERITY_COLOURS[event.severity]
  return (
    <div className="flex items-start gap-3 px-2 py-1.5 rounded bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
      <span
        className="inline-block h-2 w-2 rounded-full mt-1 shrink-0"
        style={{ backgroundColor: sev }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-white">
            {event.highway ?? 'SH'}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-mono text-white/50">
            {SEVERITY_LABELS[event.severity]}
            {event.planned ? ' · planned' : ''}
          </span>
          {event.region && (
            <span className="text-[9px] uppercase tracking-wider font-mono text-white/35 ml-auto">
              {event.region}
            </span>
          )}
        </div>
        <div className="text-[11px] text-white/70 leading-snug mt-0.5 truncate">
          {event.location ?? event.description ?? event.impact ?? '—'}
        </div>
      </div>
    </div>
  )
}
