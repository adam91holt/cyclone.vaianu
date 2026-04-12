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
  POWER_PROVIDERS,
  CELL_PROVIDERS,
  type PowerOutage,
  type OutageProvider,
} from '@/hooks/usePowerOutages'
import { AlertTriangle, Zap, Users, Clock, Signal } from 'lucide-react'

// Provider visual identity. We pick distinctive, readable colours —
// red for Northpower (matches their brand), blue for WEL, amber for
// Top Energy. Status layers on top: unplanned = solid fill, planned =
// dashed stroke with lighter fill.
const PROVIDER_COLOURS: Record<OutageProvider, string> = {
  northpower: '#ef4444', // red-500
  wel: '#3b82f6', // blue-500
  topenergy: '#f59e0b', // amber-500
  counties: '#a855f7', // purple-500
  vector: '#14b8a6', // teal-500
  powerco: '#ec4899', // pink-500
  horizon: '#84cc16', // lime-500
  firstlight: '#f97316', // orange-500
  unison: '#06b6d4', // cyan-500
  // Cell carriers — brand-adjacent colours distinct from the electricity
  // palette above so mobile markers read as a separate layer at a glance.
  onenz: '#dc2626', // One NZ red (deeper than Northpower to keep them apart)
  '2degrees': '#fbbf24', // 2degrees amber-yellow
}

const PROVIDER_LABELS: Record<OutageProvider, string> = {
  northpower: 'Northpower',
  wel: 'WEL Networks',
  topenergy: 'Top Energy',
  counties: 'Counties Energy',
  vector: 'Vector',
  powerco: 'Powerco',
  horizon: 'Horizon Networks',
  firstlight: 'Firstlight',
  unison: 'Unison Networks',
  onenz: 'One NZ',
  '2degrees': '2degrees',
}

const PROVIDER_COUNT = 11

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
type ServiceFilter = 'all' | 'power' | 'cell'

const POWER_SET = new Set<OutageProvider>(POWER_PROVIDERS)
const CELL_SET = new Set<OutageProvider>(CELL_PROVIDERS)

export function OutagesMap() {
  const { data: outages, isLoading, error } = usePowerOutages()
  const { data: summary } = usePowerOutagesSummary()
  const [filter, setFilter] = useState<ProviderFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all')

  // Apply service filter first, then provider filter. The provider filter
  // chips only show providers that match the current service, so it's
  // impossible to pick an invalid combination.
  const scoped = useMemo(() => {
    if (!outages) return []
    if (serviceFilter === 'power') {
      return outages.filter((o) => POWER_SET.has(o.provider))
    }
    if (serviceFilter === 'cell') {
      return outages.filter((o) => CELL_SET.has(o.provider))
    }
    return outages
  }, [outages, serviceFilter])

  const filtered = useMemo(() => {
    if (filter === 'all') return scoped
    return scoped.filter((o) => o.provider === filter)
  }, [scoped, filter])

  const polygonOutages = filtered.filter(
    (o) =>
      o.geometry &&
      (o.geometry.type === 'Polygon' || o.geometry.type === 'MultiPolygon'),
  )
  const pointOutages = filtered.filter(
    (o) =>
      o.centroid_lat != null &&
      o.centroid_lon != null &&
      (!o.geometry ||
        (o.geometry.type !== 'Polygon' &&
          o.geometry.type !== 'MultiPolygon')),
  )

  // Counts reflect the current service scope so the stats line up with
  // what's on the map — if you toggle to Cell the "customers off" number
  // stops counting power customers, etc.
  const totalCustomers = scoped.reduce(
    (sum, o) => sum + (o.customer_count ?? 0),
    0,
  )
  const totalIncidents = scoped.length
  const providerCounts = scoped.reduce<
    Record<string, { incidents: number; customers: number }>
  >((acc, o) => {
    const p = o.provider
    acc[p] ??= { incidents: 0, customers: 0 }
    acc[p].incidents += 1
    acc[p].customers += o.customer_count ?? 0
    return acc
  }, {})
  const providersFailed = summary?.providers_failed ?? []

  // Cell towers dominate the display when their incident count is high
  // but their customer count is null — surface site count instead when
  // the current scope is cell-only.
  const cellSiteCount = (outages ?? []).filter((o) =>
    CELL_SET.has(o.provider),
  ).length
  const powerCustomers = (outages ?? [])
    .filter((o) => POWER_SET.has(o.provider))
    .reduce((sum, o) => sum + (o.customer_count ?? 0), 0)

  // Which provider chips appear depends on the service scope.
  const visibleProviders: OutageProvider[] =
    serviceFilter === 'cell'
      ? CELL_PROVIDERS
      : serviceFilter === 'power'
        ? POWER_PROVIDERS
        : [...POWER_PROVIDERS, ...CELL_PROVIDERS]

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              Live Power &amp; Cell Outages · Nationwide
            </div>
            {summary?.updated_at && (
              <div className="text-[9px] uppercase tracking-wider text-white/30 font-mono">
                Updated {formatTime(summary.updated_at)}
              </div>
            )}
          </div>
          {/* Service scope — Power / Cell / All */}
          <div className="flex gap-1">
            {(
              [
                { key: 'all', label: 'All', icon: null },
                { key: 'power', label: 'Power', icon: Zap },
                { key: 'cell', label: 'Cell', icon: Signal },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const active = serviceFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setServiceFilter(key)
                    setFilter('all')
                  }}
                  className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-200'
                      : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Provider chips scoped to current service */}
        <div className="flex gap-1 flex-wrap mb-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border transition-colors ${
              filter === 'all'
                ? 'bg-white/15 border-white/30 text-white'
                : 'bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
            }`}
          >
            All providers
          </button>
          {visibleProviders.map((key) => {
            const active = filter === key
            const colour = PROVIDER_COLOURS[key]
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
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle"
                  style={{ backgroundColor: colour }}
                />
                {PROVIDER_LABELS[key]}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {serviceFilter === 'cell' ? (
            <Stat
              label="Cell sites down"
              value={totalIncidents.toLocaleString()}
              accent="text-amber-300"
            />
          ) : (
            <Stat
              label="Customers off"
              value={totalCustomers.toLocaleString()}
              accent="text-amber-300"
            />
          )}
          <Stat
            label={serviceFilter === 'cell' ? 'Live faults' : 'Live faults'}
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

        {/* Quick glance: power vs cell split when both are in scope */}
        {serviceFilter === 'all' && (outages?.length ?? 0) > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/60">
              <Zap className="h-3 w-3 text-amber-400" />
              Power:{' '}
              <span className="text-amber-300 font-bold">
                {powerCustomers.toLocaleString()}
              </span>{' '}
              customers off across{' '}
              <span className="text-white font-bold">
                {(outages ?? []).filter((o) => POWER_SET.has(o.provider)).length}
              </span>{' '}
              faults
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/60">
              <Signal className="h-3 w-3 text-cyan-400" />
              Cell:{' '}
              <span className="text-cyan-300 font-bold">{cellSiteCount}</span>{' '}
              sites affected
            </div>
          </div>
        )}

        {providersFailed.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[10px] text-red-300 font-mono uppercase tracking-wider">
            <AlertTriangle className="h-3 w-3" />
            Feed failing: {providersFailed.join(', ')}
          </div>
        )}

        <div className="mt-3 text-[10px] text-white/40 font-mono uppercase tracking-wider border-t border-white/5 pt-2">
          Power: 9 lines companies (North Island) &nbsp;·&nbsp; Cell: One NZ + 2degrees (nationwide)
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
              center={[-39.0, 174.8]}
              zoom={6}
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
            <div className="absolute bottom-3 left-3 z-[400] bg-[#0f1729]/95 border border-white/10 rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-white/70 space-y-1 pointer-events-none max-h-[400px] overflow-auto">
              <div className="text-white/40 mb-1">Legend</div>
              {(serviceFilter === 'all' || serviceFilter === 'power') && (
                <>
                  <div className="text-white/30 pt-1 border-t border-white/10 mt-1 flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5" /> Power
                  </div>
                  {POWER_PROVIDERS.map((p) => (
                    <LegendRow
                      key={p}
                      colour={PROVIDER_COLOURS[p]}
                      label={PROVIDER_LABELS[p]}
                    />
                  ))}
                </>
              )}
              {(serviceFilter === 'all' || serviceFilter === 'cell') && (
                <>
                  <div className="text-white/30 pt-1 border-t border-white/10 mt-1 flex items-center gap-1">
                    <Signal className="h-2.5 w-2.5" /> Cell
                  </div>
                  {CELL_PROVIDERS.map((p) => (
                    <LegendRow
                      key={p}
                      colour={PROVIDER_COLOURS[p]}
                      label={PROVIDER_LABELS[p]}
                    />
                  ))}
                </>
              )}
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
