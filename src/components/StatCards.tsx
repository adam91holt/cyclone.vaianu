import { Droplets, Gauge, Waves } from 'lucide-react'
import { useRegionWeather } from '@/hooks/useWeather'
import { useMarine } from '@/hooks/useMarine'

function Card({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  loading,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  icon: typeof Gauge
  loading?: boolean
}) {
  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 relative backdrop-blur-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">
          {label}
        </div>
        <Icon className="h-3.5 w-3.5 text-white/30" />
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded bg-white/5 animate-pulse" />
      ) : (
        <>
          <div className="font-mono tabular-nums text-3xl font-bold">
            {value}
            {unit && <span className="text-sm text-white/60 ml-1">{unit}</span>}
          </div>
          {sub && <div className="text-[10px] text-white/50 mt-0.5 font-mono">{sub}</div>}
        </>
      )}
    </div>
  )
}

export function StatCards() {
  const weather = useRegionWeather()
  const marine = useMarine()

  // Lowest pressure across regions — the cyclone's pressure trough.
  const lowestPressure = weather.data?.reduce(
    (min, r) => (r.pressureHpa < min ? r.pressureHpa : min),
    Infinity,
  )
  const maxRain = weather.data?.reduce(
    (max, r) => (r.precipitationMm > max ? r.precipitationMm : max),
    0,
  )
  const maxRainRegion = weather.data?.find((r) => r.precipitationMm === maxRain)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card
        label="Min Pressure"
        value={lowestPressure && lowestPressure !== Infinity ? lowestPressure : '—'}
        unit="hPa"
        sub="Lowest across regions"
        icon={Gauge}
        loading={weather.isLoading}
      />
      <Card
        label="Rain (1h max)"
        value={maxRain?.toFixed(1) ?? '—'}
        unit="mm"
        sub={maxRainRegion?.regionId.replace('_', ' ').toUpperCase() ?? ''}
        icon={Droplets}
        loading={weather.isLoading}
      />
      <Card
        label="Significant Wave"
        value={marine.data?.waveHeight ?? '—'}
        unit="m"
        sub={
          marine.data
            ? `Swell ${marine.data.swellHeight}m · ${marine.data.swellPeriod}s period`
            : ''
        }
        icon={Waves}
        loading={marine.isLoading}
      />
    </div>
  )
}
