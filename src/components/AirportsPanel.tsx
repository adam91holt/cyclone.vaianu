import { useAirports, type Airport, type AirportActivity } from '@/hooks/useAirports'
import { Plane, PlaneLanding, PlaneTakeoff, Radar, Anchor } from 'lucide-react'

function StatusBadge({ status }: { status: Airport['status'] }) {
  const styles: Record<Airport['status'], string> = {
    normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    reduced: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
    limited: 'bg-white/10 text-white/50 border-white/20',
  }
  const labels: Record<Airport['status'], string> = {
    normal: 'Operational',
    reduced: 'Reduced',
    suspended: 'Suspended',
    limited: 'No data',
  }
  return (
    <span
      className={`${styles[status]} text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded`}
    >
      {labels[status]}
    </span>
  )
}

function DirectionIcon({ direction }: { direction: AirportActivity['direction'] }) {
  switch (direction) {
    case 'arrival':
      return <PlaneLanding className="h-2.5 w-2.5 text-emerald-400/80 shrink-0" />
    case 'departure':
      return <PlaneTakeoff className="h-2.5 w-2.5 text-sky-400/80 shrink-0" />
    case 'ground':
      return <Anchor className="h-2.5 w-2.5 text-white/50 shrink-0" />
    default:
      return <Radar className="h-2.5 w-2.5 text-amber-400/70 shrink-0" />
  }
}

function formatAlt(ft: number | null) {
  if (ft == null) return '—'
  if (ft === 0) return 'GND'
  return `${Math.round(ft / 100) * 100}ft`
}

function formatDist(nm: number | null) {
  if (nm == null) return ''
  return `${nm.toFixed(1)}NM`
}

export function AirportsPanel() {
  const { data, isLoading, error } = useAirports()

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plane className="h-3.5 w-3.5 text-white/50" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Airports · Live ADS-B Traffic
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
          adsb.lol · live positions
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 py-4 text-center">
          Airport data temporarily unavailable.
        </div>
      )}

      {isLoading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data.airports.map((ap) => (
            <div
              key={ap.icao}
              className="bg-white/[0.03] border border-white/5 rounded-md p-3 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold">{ap.iata}</span>
                    <span className="text-[10px] text-white/40 font-mono">{ap.icao}</span>
                  </div>
                  <div className="text-[11px] text-white/70 truncate">{ap.city}</div>
                </div>
                <StatusBadge status={ap.status} />
              </div>

              <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-white/60 mb-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-1" title="Arrivals">
                  <PlaneLanding className="h-2.5 w-2.5 text-emerald-400/70" />
                  {ap.recentArrivals}
                </div>
                <div className="flex items-center gap-1" title="Departures">
                  <PlaneTakeoff className="h-2.5 w-2.5 text-sky-400/70" />
                  {ap.recentDepartures}
                </div>
                <div className="flex items-center gap-1" title="Overhead">
                  <Radar className="h-2.5 w-2.5 text-amber-400/70" />
                  {ap.overhead}
                </div>
                <div className="flex items-center gap-1" title="On ground">
                  <Anchor className="h-2.5 w-2.5 text-white/50" />
                  {ap.onGround}
                </div>
              </div>

              <div className="space-y-0.5 max-h-24 overflow-hidden">
                {ap.activity.slice(0, 5).map((a, i) => (
                  <div
                    key={`${a.callsign}-${i}`}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-white/50"
                  >
                    <DirectionIcon direction={a.direction} />
                    <span className="font-semibold text-white/80 truncate min-w-[52px]">
                      {a.callsign}
                    </span>
                    {a.type && (
                      <span className="text-white/40 shrink-0 text-[9px]">{a.type}</span>
                    )}
                    <span className="ml-auto text-white/40 shrink-0 tabular-nums">
                      {formatAlt(a.alt_ft)}
                    </span>
                    <span className="text-white/30 shrink-0 tabular-nums text-[9px] min-w-[36px] text-right">
                      {formatDist(a.distance_nm)}
                    </span>
                  </div>
                ))}
                {ap.activity.length === 0 && (
                  <div className="text-[10px] text-white/30 italic">No traffic in range</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
