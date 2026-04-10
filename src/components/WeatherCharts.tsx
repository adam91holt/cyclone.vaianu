import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useWeatherHistory, type WeatherHistoryPoint } from '@/hooks/useWeatherHistory'
import { LineChart as LineChartIcon } from 'lucide-react'

const REGION_COLORS: Record<string, string> = {
  Northland: '#f87171',
  Auckland: '#fb923c',
  Coromandel: '#fbbf24',
  'Bay of Plenty': '#a3e635',
  Waikato: '#34d399',
  Gisborne: '#60a5fa',
}

type Metric = 'gust_kmh' | 'wind_kmh' | 'pressure_hpa' | 'precip_mm'

const METRICS: Array<{ key: Metric; label: string; unit: string }> = [
  { key: 'gust_kmh', label: 'Gust speed', unit: 'km/h' },
  { key: 'wind_kmh', label: 'Wind speed', unit: 'km/h' },
  { key: 'pressure_hpa', label: 'Pressure', unit: 'hPa' },
  { key: 'precip_mm', label: 'Precip', unit: 'mm' },
]

const WINDOWS: Array<{ hours: number; label: string }> = [
  { hours: 3, label: '3h' },
  { hours: 6, label: '6h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
]

interface PivotRow {
  t: number
  ts: string
  [region: string]: number | string
}

function pivot(points: WeatherHistoryPoint[], metric: Metric): PivotRow[] {
  const byTime = new Map<number, PivotRow>()
  for (const p of points) {
    const t = new Date(p.recorded_at).getTime()
    // Bucket into 5-minute slots so the six regions align on the x-axis.
    const bucket = Math.round(t / (5 * 60_000)) * (5 * 60_000)
    let row = byTime.get(bucket)
    if (!row) {
      row = { t: bucket, ts: new Date(bucket).toISOString() }
      byTime.set(bucket, row)
    }
    row[p.region] = p[metric]
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t)
}

function formatTick(ms: number) {
  return new Date(ms).toLocaleTimeString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WeatherCharts() {
  const [metric, setMetric] = useState<Metric>('gust_kmh')
  const [hours, setHours] = useState(6)
  const { data, isLoading, error } = useWeatherHistory(hours)

  const chartData = useMemo(() => pivot(data ?? [], metric), [data, metric])
  const regions = Array.from(new Set((data ?? []).map((p) => p.region)))

  const currentMetric = METRICS.find((m) => m.key === metric)!

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-white/50" />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              Historic Weather
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Open-Meteo · logged every 10 min
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex gap-0.5 bg-black/30 border border-white/10 rounded p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  metric === m.key
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-black/30 border border-white/10 rounded p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.hours}
                type="button"
                onClick={() => setHours(w.hours)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${
                  hours === w.hours
                    ? 'bg-red-500/20 text-red-300'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 py-6 text-center">
          Couldn't load weather history.
        </div>
      )}

      {isLoading && !data && (
        <div className="h-[300px] bg-white/5 rounded animate-pulse" />
      )}

      {data && data.length === 0 && (
        <div className="text-xs text-white/50 py-10 text-center italic">
          No samples yet — come back in 10 minutes.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={formatTick}
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}
                stroke="rgba(255,255,255,0.15)"
                tickCount={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}
                stroke="rgba(255,255,255,0.15)"
                unit={` ${currentMetric.unit}`}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(7, 11, 22, 0.95)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  fontSize: 11,
                }}
                labelFormatter={(v) => formatTick(Number(v))}
                formatter={(value: number) => [`${value.toFixed(1)} ${currentMetric.unit}`, '']}
              />
              <Legend
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                iconType="line"
              />
              {regions.map((region) => (
                <Line
                  key={region}
                  type="monotone"
                  dataKey={region}
                  stroke={REGION_COLORS[region] ?? '#a78bfa'}
                  strokeWidth={1.75}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
