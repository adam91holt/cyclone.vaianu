import { useMemo, useState } from 'react'
import {
  Shield,
  Search,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Phone,
  Utensils,
  Accessibility,
  Zap,
  Droplets,
  PawPrint,
  Car,
  Building2,
  Home,
  School,
  Dumbbell,
  X,
} from 'lucide-react'
import {
  EVACUATION_CENTRES,
  CDEM_GROUPS,
  type EvacuationCentre,
  type FacilityTag,
  type CentreType,
} from '@/lib/evacuationCentres'
import { REGION_OPTIONS } from '@/lib/cyclone'
import { useSelectedRegion } from '@/context/RegionContext'

const FACILITY_META: Record<
  FacilityTag,
  { icon: typeof Phone; label: string }
> = {
  toilets: { icon: Droplets, label: 'Toilets' },
  kitchen: { icon: Utensils, label: 'Kitchen' },
  wheelchair: { icon: Accessibility, label: 'Accessible' },
  generator: { icon: Zap, label: 'Generator' },
  shower: { icon: Droplets, label: 'Showers' },
  pet_friendly: { icon: PawPrint, label: 'Pet friendly' },
  parking: { icon: Car, label: 'Parking' },
}

const TYPE_META: Record<
  CentreType,
  { icon: typeof Building2; label: string; classes: string }
> = {
  hall: {
    icon: Home,
    label: 'Hall',
    classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  sports: {
    icon: Dumbbell,
    label: 'Sports centre',
    classes: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  school: {
    icon: School,
    label: 'School',
    classes: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  marae: {
    icon: Home,
    label: 'Marae',
    classes: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  civic: {
    icon: Building2,
    label: 'Civic',
    classes: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
}

function CentreCard({ centre }: { centre: EvacuationCentre }) {
  const typeMeta = TYPE_META[centre.type]
  const TypeIcon = typeMeta.icon
  return (
    <article className="group relative rounded-lg border border-white/10 bg-[#0f1729]/60 hover:border-white/20 transition-colors overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="h-2.5 w-2.5 text-red-400 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-red-300 truncate">
                {centre.town}
              </span>
            </div>
            <h3 className="font-display text-base font-bold tracking-tight text-white leading-tight">
              {centre.name}
            </h3>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold ${typeMeta.classes}`}
          >
            <TypeIcon className="h-2.5 w-2.5" />
            {typeMeta.label}
          </span>
        </div>

        {/* Address */}
        <p className="text-[11px] text-white/60 leading-relaxed break-words">
          {centre.address}
        </p>

        {/* Notes */}
        {centre.notes && (
          <div className="flex items-start gap-1.5 rounded-md bg-amber-500/[0.06] border border-amber-500/20 px-2.5 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-300 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-100/85 leading-snug">
              {centre.notes}
            </p>
          </div>
        )}

        {/* Facilities */}
        <div className="flex flex-wrap gap-1">
          {centre.facilities.map((f) => {
            const m = FACILITY_META[f]
            const Icon = m.icon
            return (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-sm bg-white/[0.04] border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-mono text-white/55"
                title={m.label}
              >
                <Icon className="h-2.5 w-2.5" />
                {m.label}
              </span>
            )
          })}
        </div>

        {/* Directions CTA */}
        <a
          href={centre.mapsQuery}
          target="_blank"
          rel="noreferrer"
          className="group/btn flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 px-3 py-2 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-mono text-white/70 group-hover/btn:text-white">
            <MapPin className="h-3 w-3" />
            Directions
          </span>
          <ExternalLink className="h-3 w-3 text-white/40 group-hover/btn:text-white/80" />
        </a>
      </div>
    </article>
  )
}

export function EvacuationCentres() {
  const { regionId, setRegionId } = useSelectedRegion()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EVACUATION_CENTRES.filter((c) => {
      if (regionId !== 'all' && c.regionId !== regionId) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.town.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        c.regionId.replace('_', ' ').toLowerCase().includes(q)
      )
    })
  }, [regionId, query])

  // Group by region when showing all, otherwise flat list
  const grouped = useMemo(() => {
    if (regionId !== 'all') return null
    const map = new Map<string, EvacuationCentre[]>()
    for (const c of filtered) {
      const arr = map.get(c.regionId) ?? []
      arr.push(c)
      map.set(c.regionId, arr)
    }
    // Preserve REGION_OPTIONS order
    return REGION_OPTIONS.filter((r) => r.id !== 'all' && map.has(r.id)).map(
      (r) => ({
        regionId: r.id,
        label: r.label,
        centres: map.get(r.id) ?? [],
      }),
    )
  }, [regionId, filtered])

  const activeCdem = CDEM_GROUPS.find((g) => g.regionId === regionId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
            <Shield className="h-3 w-3 text-red-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
              Evacuation & welfare
            </span>
          </div>
          <span className="text-[9px] uppercase tracking-[0.15em] text-white/35 font-mono tabular-nums">
            {filtered.length} centre{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-white">
          Where to go<span className="text-red-500">.</span>
        </h2>
        <p className="mt-1 text-xs text-white/55 max-w-2xl">
          Well-known civic halls, sports centres, and community hubs that
          regional Civil Defence groups regularly use as welfare centres
          during emergencies. <span className="text-amber-300">Only the
          centres your regional CDEM lists as active are open</span> — always
          check their live status before heading out.
        </p>
      </div>

      {/* Live CDEM link for the selected region */}
      {activeCdem && (
        <a
          href={activeCdem.url}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between gap-3 rounded-lg border border-red-500/40 bg-gradient-to-r from-red-950/60 via-red-900/40 to-red-950/60 hover:border-red-500/60 px-4 py-3 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-600/20 border border-red-500/40">
              <AlertTriangle className="h-4 w-4 text-red-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-red-300/80 mb-0.5">
                Live status · authoritative source
              </div>
              <div className="text-sm font-bold text-white truncate">
                {activeCdem.name}
              </div>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-red-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </a>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/35 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by town, name, or address"
            className="w-full rounded-md border border-white/15 bg-white/[0.04] pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Region pills */}
        <div className="flex flex-wrap gap-1.5">
          {REGION_OPTIONS.map((r) => {
            const active = regionId === r.id
            const count =
              r.id === 'all'
                ? EVACUATION_CENTRES.length
                : EVACUATION_CENTRES.filter((c) => c.regionId === r.id).length
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setRegionId(r.id)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono transition-colors ${
                  active
                    ? 'bg-red-500/15 text-white border-red-500/40'
                    : 'border-white/10 bg-white/[0.02] text-white/55 hover:border-white/20 hover:text-white/85'
                }`}
              >
                {r.label}
                <span className="tabular-nums text-white/40">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
          <Search className="h-8 w-8 text-white/25 mx-auto mb-3" />
          <p className="text-sm text-white/60 font-medium mb-1">
            No centres match your search
          </p>
          <p className="text-[11px] text-white/35 max-w-sm mx-auto leading-relaxed">
            Try a different region or clear the search to see everything.
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-5">
          {grouped.map((g) => {
            const cdem = CDEM_GROUPS.find((c) => c.regionId === g.regionId)
            return (
              <div key={g.regionId}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold tracking-tight text-white">
                      {g.label}
                    </h3>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-white/35 tabular-nums">
                      {g.centres.length} centre{g.centres.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {cdem && (
                    <a
                      href={cdem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-mono text-white/45 hover:text-white transition-colors"
                    >
                      Live status
                      <ExternalLink className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {g.centres.map((c) => (
                    <CentreCard key={c.id} centre={c} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => (
            <CentreCard key={c.id} centre={c} />
          ))}
        </div>
      )}

      {/* Footer disclaimer */}
      <div className="pt-2 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/35 leading-relaxed max-w-3xl">
          This list is curated from publicly-known civic facilities commonly
          used as welfare centres. Activation is decided by regional Civil
          Defence Emergency Management at the time of an event. Always
          confirm with your regional CDEM group before travelling. In
          immediate danger call <span className="text-white font-mono">111</span>.
        </p>
      </div>
    </div>
  )
}
