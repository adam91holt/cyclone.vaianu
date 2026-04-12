import { useMemo, useState } from 'react'
import { Search, BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { RiverSiteSummary } from '@/hooks/useRivers'
import {
  useAllRiverHistories,
  type RiverSparklineData,
} from '@/hooks/useAllRiverHistories'

interface RiverHistoryListProps {
  sites: RiverSiteSummary[]
  onSelect: (site: { council: string; name: string }) => void
}

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

type SortKey = 'change_desc' | 'change_asc' | 'name' | 'council'

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return '—'
  if (unit === 'm') return `${value.toFixed(2)} m`
  if (unit === 'mm') return `${Math.round(value).toLocaleString()} mm`
  return `${value.toFixed(2)}${unit ? ' ' + unit : ''}`
}

// Build an SVG path `d` attribute from the dense bucket array. Normalises the
// y-axis so each row uses its full vertical range — a flat river and a
// rising river both look distinct.
function buildPath(
  values: number[],
  min: number,
  max: number,
  width: number,
  height: number,
  padding = 2,
): string {
  if (values.length === 0) return ''
  const usableW = width - padding * 2
  const usableH = height - padding * 2
  const range = max - min
  const xStep = usableW / Math.max(1, values.length - 1)
  const parts: string[] = []
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (Number.isNaN(v)) continue
    const x = padding + i * xStep
    const y =
      range > 0
        ? padding + usableH - ((v - min) / range) * usableH
        : padding + usableH / 2
    parts.push(`${parts.length === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return parts.join(' ')
}

function trendColour(changePct: number | null): string {
  if (changePct === null) return '#6b7280'
  if (changePct >= 15) return '#ef4444'
  if (changePct >= 5) return '#f59e0b'
  if (changePct >= 2) return '#fbbf24'
  if (changePct <= -2) return '#60a5fa'
  return '#22d3ee'
}

export function RiverHistoryList({ sites, onSelect }: RiverHistoryListProps) {
  const { data: histories, isLoading: historiesLoading } = useAllRiverHistories()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('change_desc')
  const [limit, setLimit] = useState(60)

  const filtered = useMemo(() => {
    // Exclude sites that have never reported — they can't have a sparkline
    // and pollute the list with empty rows.
    const withData = sites.filter((s) => s.latest_value !== null)
    const q = search.trim().toLowerCase()
    const base = q
      ? withData.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (COUNCIL_LABEL[s.council] ?? s.council).toLowerCase().includes(q),
        )
      : withData
    const sorted = [...base]
    if (sortKey === 'change_desc') {
      sorted.sort((a, b) => {
        const av = a.change_pct === null ? -Infinity : a.change_pct
        const bv = b.change_pct === null ? -Infinity : b.change_pct
        return bv - av
      })
    } else if (sortKey === 'change_asc') {
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
  }, [sites, search, sortKey])

  const visible = filtered.slice(0, limit)
  const hidden = Math.max(0, filtered.length - visible.length)

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            24 h sparklines · {filtered.length.toLocaleString()} sites
          </div>
          {historiesLoading && (
            <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-300/60 animate-pulse">
              loading histories…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setLimit(60)
              }}
              placeholder="Search site or council…"
              className="w-56 bg-white/[0.03] border border-white/10 rounded-md pl-7 pr-2 py-1 text-[11px] text-white placeholder:text-white/30 font-mono focus:outline-none focus:border-cyan-500/40"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase tracking-wider font-mono text-white/35">
              Sort
            </span>
            {(
              [
                { key: 'change_desc', label: 'Rising' },
                { key: 'change_asc', label: 'Falling' },
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
        </div>
      </div>

      {/* Column header */}
      <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 px-2 pb-2 text-[9px] uppercase tracking-[0.18em] font-mono text-white/30 border-b border-white/5">
        <span>Site</span>
        <span>24 h trace</span>
        <span className="text-right">Latest · 2 h change</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-wider py-10 text-center">
          No matches
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {visible.map((site) => (
            <HistoryRow
              key={`${site.council}::${site.name}`}
              site={site}
              history={histories?.get(`${site.council}::${site.name}`)}
              onClick={() => onSelect({ council: site.council, name: site.name })}
            />
          ))}
        </div>
      )}

      {hidden > 0 && (
        <div className="pt-3 mt-1 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + 60)}
            className="text-[10px] uppercase tracking-wider font-mono px-3 py-1.5 rounded border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
          >
            Show {Math.min(60, hidden)} more · {hidden.toLocaleString()} hidden
          </button>
        </div>
      )}
    </div>
  )
}

interface HistoryRowProps {
  site: RiverSiteSummary
  history: RiverSparklineData | undefined
  onClick: () => void
}

function HistoryRow({ site, history, onClick }: HistoryRowProps) {
  const colour = trendColour(site.change_pct)
  const changeLabel =
    site.change_pct !== null
      ? `${site.change_pct > 0 ? '+' : ''}${site.change_pct.toFixed(1)}%`
      : '—'
  const Icon =
    site.change_pct !== null && site.change_pct > 1
      ? TrendingUp
      : site.change_pct !== null && site.change_pct < -1
        ? TrendingDown
        : Minus

  const W = 320
  const H = 44
  const path = history
    ? buildPath(history.values, history.min, history.max, W, H)
    : ''
  // Fill path — mirror the line down to baseline for a subtle area wash.
  const areaPath = history
    ? `${path} L${W - 2},${H - 2} L2,${H - 2} Z`
    : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left grid grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)_minmax(0,1fr)] gap-3 items-center px-2 py-2 hover:bg-white/[0.03] transition-colors group"
    >
      {/* Name + council */}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-white leading-tight truncate group-hover:text-cyan-200 transition-colors">
          {site.name}
        </div>
        <div className="text-[9px] uppercase tracking-wider font-mono text-white/35 truncate mt-0.5">
          {COUNCIL_LABEL[site.council] ?? site.council}
        </div>
      </div>

      {/* Sparkline */}
      <div className="relative h-11">
        {history ? (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient
                id={`grad-${site.council}-${site.name.replace(/[^a-z0-9]/gi, '')}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colour} stopOpacity="0.35" />
                <stop offset="100%" stopColor={colour} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={areaPath}
              fill={`url(#grad-${site.council}-${site.name.replace(/[^a-z0-9]/gi, '')})`}
            />
            <path
              d={path}
              fill="none"
              stroke={colour}
              strokeWidth={1.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div className="h-full flex items-center">
            <div className="h-px w-full bg-white/5" />
          </div>
        )}
      </div>

      {/* Latest + change */}
      <div className="text-right">
        <div className="text-[11px] font-mono font-bold tabular-nums text-white">
          {formatValue(site.latest_value, site.unit)}
        </div>
        <div
          className="flex items-center justify-end gap-1 text-[10px] font-mono font-bold tabular-nums mt-0.5"
          style={{ color: colour }}
        >
          <Icon className="h-2.5 w-2.5" />
          {changeLabel}
        </div>
      </div>
    </button>
  )
}
