import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Waves,
  Clock,
  Gauge,
} from 'lucide-react'
import { useRiverHistory } from '@/hooks/useRiverHistory'

interface RiverDetailDialogProps {
  open: boolean
  onClose: () => void
  council: string | null
  site: string | null
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

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return '—'
  if (unit === 'm') return `${value.toFixed(2)} m`
  if (unit === 'mm') return `${Math.round(value).toLocaleString()} mm`
  return `${value.toFixed(2)}${unit ? ' ' + unit : ''}`
}

function formatSignedValue(change: number, unit: string | null): string {
  const sign = change >= 0 ? '+' : ''
  if (unit === 'm') return `${sign}${change.toFixed(2)} m`
  if (unit === 'mm') return `${sign}${Math.round(change).toLocaleString()} mm`
  return `${sign}${change.toFixed(2)}`
}

function formatShortTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ''
  }
}

function formatLongTime(iso: string): string {
  try {
    const d = new Date(iso)
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

// Find the value at or immediately before a given timestamp.
function valueAt(
  points: Array<{ ts: string; value: number }>,
  targetMs: number,
): number | null {
  let best: { ts: number; value: number } | null = null
  for (const p of points) {
    const t = new Date(p.ts).getTime()
    if (t > targetMs) break
    best = { ts: t, value: p.value }
  }
  return best?.value ?? null
}

export function RiverDetailDialog({
  open,
  onClose,
  council,
  site,
}: RiverDetailDialogProps) {
  const { data, isLoading, error } = useRiverHistory(council, site, 24)

  const stats = useMemo(() => {
    if (!data || data.points.length === 0) return null
    const points = data.points
    const latest = points[points.length - 1]
    const latestMs = new Date(latest.ts).getTime()

    const val1h = valueAt(points, latestMs - 1 * 3600 * 1000)
    const val3h = valueAt(points, latestMs - 3 * 3600 * 1000)
    const val6h = valueAt(points, latestMs - 6 * 3600 * 1000)
    const val24h = valueAt(points, latestMs - 24 * 3600 * 1000)

    let min = points[0].value
    let max = points[0].value
    let minTs = points[0].ts
    let maxTs = points[0].ts
    for (const p of points) {
      if (p.value < min) {
        min = p.value
        minTs = p.ts
      }
      if (p.value > max) {
        max = p.value
        maxTs = p.ts
      }
    }

    return {
      latest: latest.value,
      latestTs: latest.ts,
      val1h,
      val3h,
      val6h,
      val24h,
      min,
      max,
      minTs,
      maxTs,
      count: points.length,
    }
  }, [data])

  // Downsample to keep chart readable — target ~180 points.
  const chartData = useMemo(() => {
    if (!data || data.points.length === 0) return []
    const target = 180
    const step = Math.max(1, Math.floor(data.points.length / target))
    const out: Array<{ ts: string; tsMs: number; value: number }> = []
    for (let i = 0; i < data.points.length; i += step) {
      const p = data.points[i]
      out.push({ ts: p.ts, tsMs: new Date(p.ts).getTime(), value: p.value })
    }
    // Always include the very last point
    const last = data.points[data.points.length - 1]
    const lastMs = new Date(last.ts).getTime()
    if (out.length === 0 || out[out.length - 1].tsMs !== lastMs) {
      out.push({ ts: last.ts, tsMs: lastMs, value: last.value })
    }
    return out
  }, [data])

  const unit = data?.unit ?? null
  const title = data?.name ?? site ?? ''

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl bg-[#0a0f1e] border-white/10 text-white p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] font-mono text-cyan-300/80">
            <Waves className="h-3 w-3" />
            River stage · 24 h history
            {data?.council && (
              <span className="text-white/40">
                · {COUNCIL_LABEL[data.council] ?? data.council}
              </span>
            )}
          </div>
          <DialogTitle className="font-display text-xl tracking-tight text-white pt-1">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          {isLoading && (
            <div className="h-64 flex items-center justify-center text-white/50 text-xs font-mono uppercase tracking-wider">
              Loading 24 h history…
            </div>
          )}
          {error && (
            <div className="h-64 flex items-center justify-center text-red-300 text-xs font-mono uppercase tracking-wider">
              Failed to load history
            </div>
          )}
          {!isLoading && !error && data && stats && (
            <>
              {/* Current reading + trend */}
              <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.22em] font-mono text-white/40 mb-1">
                    Latest reading
                  </div>
                  <div className="font-mono tabular-nums text-3xl font-bold text-white leading-none">
                    {formatValue(stats.latest, unit)}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/40 mt-1">
                    <Clock className="inline h-2.5 w-2.5 mr-1" />
                    {formatLongTime(stats.latestTs)} NZ
                  </div>
                </div>
                <ChangePill
                  label="1 h"
                  latest={stats.latest}
                  prev={stats.val1h}
                  unit={unit}
                />
                <ChangePill
                  label="3 h"
                  latest={stats.latest}
                  prev={stats.val3h}
                  unit={unit}
                />
                <ChangePill
                  label="6 h"
                  latest={stats.latest}
                  prev={stats.val6h}
                  unit={unit}
                />
                <ChangePill
                  label="24 h"
                  latest={stats.latest}
                  prev={stats.val24h}
                  unit={unit}
                />
              </div>

              {/* Chart */}
              <div className="h-60 bg-white/[0.015] border border-white/5 rounded-md px-2 py-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="#ffffff10"
                      strokeDasharray="2 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tsMs"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      scale="time"
                      tick={{
                        fill: '#ffffff60',
                        fontSize: 10,
                        fontFamily: 'monospace',
                      }}
                      tickFormatter={(v) => formatShortTime(new Date(v).toISOString())}
                      tickCount={6}
                      stroke="#ffffff15"
                    />
                    <YAxis
                      dataKey="value"
                      domain={['auto', 'auto']}
                      tick={{
                        fill: '#ffffff60',
                        fontSize: 10,
                        fontFamily: 'monospace',
                      }}
                      tickFormatter={(v) =>
                        unit === 'mm'
                          ? `${Math.round(v)}`
                          : v.toFixed(2)
                      }
                      width={48}
                      stroke="#ffffff15"
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0a0f1e',
                        border: '1px solid #ffffff20',
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: 'monospace',
                      }}
                      labelStyle={{ color: '#ffffff80' }}
                      itemStyle={{ color: '#67e8f9' }}
                      labelFormatter={(v) =>
                        formatLongTime(new Date(v as number).toISOString())
                      }
                      formatter={(v) => [formatValue(v as number, unit), 'Stage']}
                    />
                    <ReferenceLine
                      y={stats.min}
                      stroke="#3b82f680"
                      strokeDasharray="3 3"
                      label={{
                        value: `Min ${formatValue(stats.min, unit)}`,
                        fill: '#93c5fd',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        position: 'insideBottomLeft',
                      }}
                    />
                    <ReferenceLine
                      y={stats.max}
                      stroke="#ef444480"
                      strokeDasharray="3 3"
                      label={{
                        value: `Peak ${formatValue(stats.max, unit)}`,
                        fill: '#fca5a5',
                        fontSize: 9,
                        fontFamily: 'monospace',
                        position: 'insideTopLeft',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Peak / trough / rate row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat
                  icon={TrendingUp}
                  label="24 h peak"
                  value={formatValue(stats.max, unit)}
                  sub={formatLongTime(stats.maxTs)}
                  accent="text-red-300"
                />
                <MiniStat
                  icon={TrendingDown}
                  label="24 h trough"
                  value={formatValue(stats.min, unit)}
                  sub={formatLongTime(stats.minTs)}
                  accent="text-blue-300"
                />
                <MiniStat
                  icon={Gauge}
                  label="24 h range"
                  value={formatValue(stats.max - stats.min, unit)}
                  sub={`${stats.count} readings`}
                  accent="text-cyan-200"
                />
                <MiniStat
                  icon={Minus}
                  label="Rate · last 1 h"
                  value={
                    stats.val1h !== null
                      ? formatSignedValue(stats.latest - stats.val1h, unit) +
                        '/h'
                      : '—'
                  }
                  sub={
                    stats.val1h !== null && stats.latest - stats.val1h > 0
                      ? 'Rising'
                      : stats.val1h !== null && stats.latest - stats.val1h < 0
                        ? 'Falling'
                        : 'Steady'
                  }
                  accent="text-amber-200"
                />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ChangePillProps {
  label: string
  latest: number
  prev: number | null
  unit: string | null
}

function ChangePill({ label, latest, prev, unit }: ChangePillProps) {
  if (prev === null) {
    return (
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-white/40">
          {label}
        </div>
        <div className="text-sm font-mono tabular-nums text-white/30">—</div>
      </div>
    )
  }
  const change = latest - prev
  const pct = prev !== 0 ? (change / prev) * 100 : 0
  const rising = change > 0
  const falling = change < 0
  const colour = rising
    ? 'text-red-300'
    : falling
      ? 'text-blue-300'
      : 'text-white/50'
  const Icon = rising ? TrendingUp : falling ? TrendingDown : Minus
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-[0.2em] font-mono text-white/40">
        {label}
      </div>
      <div
        className={`flex items-center justify-end gap-1 text-sm font-mono tabular-nums font-bold ${colour}`}
      >
        <Icon className="h-3 w-3" />
        {formatSignedValue(change, unit)}
      </div>
      <div className={`text-[9px] font-mono tabular-nums ${colour} opacity-70`}>
        {rising ? '+' : ''}
        {pct.toFixed(1)}%
      </div>
    </div>
  )
}

interface MiniStatProps {
  icon: typeof TrendingUp
  label: string
  value: string
  sub: string
  accent: string
}

function MiniStat({ icon: Icon, label, value, sub, accent }: MiniStatProps) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-md px-3 py-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/40 font-mono">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className={`text-sm font-bold tabular-nums mt-0.5 ${accent}`}>
        {value}
      </div>
      <div className="text-[9px] font-mono text-white/30 mt-0.5 truncate">
        {sub}
      </div>
    </div>
  )
}
