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
  usePowerOutages,
  usePowerOutagesSummary,
  type PowerOutage,
  type OutageProvider,
} from '@/hooks/usePowerOutages'
import { AlertTriangle, Zap, Users, Clock } from 'lucide-react'

// Provider visual identity. We pick distinctive, readable colours —
// red for Northpower (matches their brand), blue for WEL, amber for
// Top Energy. Status layers on top: unplanned = solid fill, planned =
// dashed stroke with lighter fill.
const PROVIDER_COLOURS: Record<OutageProvider, string> = {
  northpower: '#ef4444', // red-500
  wel: '#3b82f6', // blue-500
  topenergy: '#f59e0b', // amber-500
  counties: '#a855f7', // purple-500
}

const PROVIDER_LABELS: Record<OutageProvider, string> = {
  northpower: 'Northpower',
  wel: 'WEL Networks',
  topenergy: 'Top Energy',
  counties: 'Counties Energy',
}

const PROVIDER_COUNT = 4

function formatTime(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

function styleForOutage(o: PowerOutage): PathOptions {
  const base = PROVIDER_COLOURS[o.provider]
  return {
    color: base,
    weight: 2,
    opacity: 0.95,
    fillColor: base,
    fillOpacity: 0.35,
  }
}

interface OutagePopupProps {
  outage: PowerOutage
}

function OutagePopup({ outage }: OutagePopupProps) {
  const start = formatTime(outage.start_time)
  const end = formatTime(outage.end_time)
  const hint = outage.restoration_hint
  return (
    <div className="text-[11px] leading-relaxed font-sans min-w-[220px]">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: PROVIDER_COLOURS[outage.provider] }}
        />
        <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
          {PROVIDER_LABELS[outage.provider]} · {outage.status}
        </span>
      </div>
      <div className="font-semibold text-neutral-900 text-[12px] mb-1">
        {outage.title ?? outage.incident_id}
      </div>
      {outage.localities.length > 0 && (
        <div className="text-neutral-700 mb-1">
          {outage.localities.slice(0, 5).join(', ')}
          {outage.localities.length > 5 ? '…' : ''}
        </div>
      )}
      {outage.cause && (
        <div className="text-neutral-600 italic mb-1">Cause: {outage.cause}</div>
      )}
      {outage.customer_count != null && (
        <div className="text-neutral-700">
          <Users className="inline h-3 w-3 mr-1 -mt-0.5" />
          {outage.customer_count.toLocaleString()} customer
          {outage.customer_count === 1 ? '' : 's'}
        </div>
      )}
      {start && (
        <div className="text-neutral-700">
          <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
          Started {start}
        </div>
      )}
      {end && <div className="text-neutral-700">Ends {end}</div>}
      {!end && hint && <div className="text-neutral-700">ETR: {hint}</div>}
      {outage.equipment && (
        <div className="text-neutral-500 text-[10px] mt-1 font-mono">
          {outage.equipment}
        </div>
      )}
      <div className="text-neutral-400 text-[9px] mt-1 font-mono uppercase tracking-wider">
        {outage.region} · {outage.service}
      </div>
    </div>
  )
}

type ProviderFilter = 'all' | OutageProvider

export function OutagesMap() {
  const { data: outages, isLoading, error } = usePowerOutages()
  const { data: summary } = usePowerOutagesSummary()
  const [filter, setFilter] = useState<ProviderFilter>('all')

  const filtered = useMemo(() => {
    if (!outages) return []
    if (filter === 'all') return outages
    return outages.filter((o) => o.provider === filter)
  }, [outages, filter])

  const polygonOutages = filtered.filter(
    (o) => o.geometry && o.geometry.type === 'Polygon',
  )
  const pointOutages = filtered.filter(
    (o) =>
      o.centroid_lat != null &&
      o.centroid_lon != null &&
      (!o.geometry || o.geometry.type !== 'Polygon'),
  )

  // Counts are computed from the live (unplanned-only) list so the header
  // stays consistent with what's on the map, regardless of which provider
  // filter is active.
  const totalCustomers = (outages ?? []).reduce(
    (sum, o) => sum + (o.customer_count ?? 0),
    0,
  )
  const totalIncidents = outages?.length ?? 0
  const providerCounts = (outages ?? []).reduce<
    Record<string, { incidents: number; customers: number }>
  >((acc, o) => {
    const p = o.provider
    acc[p] ??= { incidents: 0, customers: 0 }
    acc[p].incidents += 1
    acc[p].customers += o.customer_count ?? 0
    return acc
  }, {})
  const providersFailed = summary?.providers_failed ?? []

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              Live Power Outages · Upper North Island
            </div>
            {summary?.updated_at && (
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-mono">
                Updated {formatTime(summary.updated_at)}
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'northpower', 'wel', 'topenergy', 'counties'] as ProviderFilter[]).map(
              (key) => {
                const active = filter === key
                const label =
                  key === 'all' ? 'All' : PROVIDER_LABELS[key as OutageProvider]
                const colour =
                  key === 'all' ? '#ffffff' : PROVIDER_COLOURS[key as OutageProvider]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border transition-colors ${
                      active
                        ? 'bg-white/15 border-white/30 text-white'
                        : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                    }`}
                  >
                    {key !== 'all' && (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle"
                        style={{ backgroundColor: colour }}
                      />
                    )}
                    {label}
                  </button>
                )
              },
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Customers off"
            value={totalCustomers.toLocaleString()}
            accent="text-amber-300"
          />
          <Stat
            label="Live faults"
            value={totalIncidents.toString()}
            accent="text-red-300"
          />
          <Stat
            label="Worst hit"
            value={
              Object.entries(providerCounts).sort(
                (a, b) => b[1].customers - a[1].customers,
              )[0]?.[0]
                ? PROVIDER_LABELS[
                    Object.entries(providerCounts).sort(
                      (a, b) => b[1].customers - a[1].customers,
                    )[0][0] as OutageProvider
                  ]
                : '—'
            }
            accent="text-white"
          />
          <Stat
            label="Providers live"
            value={`${PROVIDER_COUNT - providersFailed.length} / ${PROVIDER_COUNT}`}
            accent={
              providersFailed.length === 0 ? 'text-emerald-300' : 'text-red-300'
            }
          />
        </div>

        {providersFailed.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-red-300 font-mono uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" />
            Feed failing: {providersFailed.join(', ')}
          </div>
        )}

        <div className="mt-3 text-[10px] text-white/40 font-mono uppercase tracking-wider border-t border-white/5 pt-2">
          Not yet covered: Vector (Auckland) — upstream API key rejected
        </div>
      </div>

      {/* Map */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg overflow-hidden">
        {isLoading && (
          <div className="h-[520px] flex items-center justify-center text-white/50 text-xs font-mono uppercase tracking-wider">
            Loading outages…
          </div>
        )}
        {error && (
          <div className="h-[520px] flex items-center justify-center text-red-300 text-xs font-mono uppercase tracking-wider">
            Failed to load outages
          </div>
        )}
        {!isLoading && !error && (
          <div className="h-[520px] relative">
            <MapContainer
              center={[-37.0, 174.8]}
              zoom={7}
              style={{ height: '100%', width: '100%', background: '#0a1020' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {polygonOutages.map((o) => (
                <GeoJSON
                  key={`${o.provider}-${o.incident_id}`}
                  data={o.geometry as GeoJSON.Geometry}
                  style={() => styleForOutage(o)}
                >
                  <Popup>
                    <OutagePopup outage={o} />
                  </Popup>
                </GeoJSON>
              ))}

              {pointOutages.map((o) => (
                <CircleMarker
                  key={`${o.provider}-${o.incident_id}`}
                  center={[o.centroid_lat as number, o.centroid_lon as number]}
                  radius={7}
                  pathOptions={styleForOutage(o)}
                >
                  <Popup>
                    <OutagePopup outage={o} />
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 z-[400] bg-[#0f1729]/95 border border-white/10 rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/70 space-y-1 pointer-events-none">
              <div className="text-white/40 mb-1">Legend</div>
              <LegendRow colour={PROVIDER_COLOURS.northpower} label="Northpower" />
              <LegendRow colour={PROVIDER_COLOURS.wel} label="WEL Networks" />
              <LegendRow colour={PROVIDER_COLOURS.topenergy} label="Top Energy" />
              <LegendRow colour={PROVIDER_COLOURS.counties} label="Counties Energy" />
              <div className="text-white/40 pt-1 border-t border-white/10 mt-1">
                Unplanned faults only
              </div>
            </div>
          </div>
        )}
      </div>
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
