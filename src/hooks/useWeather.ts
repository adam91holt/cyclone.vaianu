import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { REGIONS } from '@/lib/cyclone'

export interface RegionWeather {
  regionId: string
  windKmh: number
  gustKmh: number
  windDirection: number
  pressureHpa: number
  precipitationMm: number
  temperatureC: number
  humidity: number
}

// weather_history is written by the log-weather Edge Function every 10 min
// (pg_cron: vaianu-log-weather-every-10) using Open-Meteo. The logger keys
// rows by the region's display name ("Bay of Plenty"), not our canonical
// id ("bay_of_plenty") — this map reconciles the two.
const NAME_TO_ID: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [r.name, r.id]),
)

interface LatestRow {
  region: string
  wind_kmh: number | null
  gust_kmh: number | null
  wind_direction_deg: number | null
  pressure_hpa: number | null
  precip_mm: number | null
  temp_c: number | null
  humidity: number | null
}

async function fetchRegionWeather(): Promise<RegionWeather[]> {
  const { data, error } = await supabase.rpc('get_latest_region_weather')
  if (error) throw error

  const byId = new Map<string, LatestRow>()
  for (const row of (data ?? []) as LatestRow[]) {
    const id = NAME_TO_ID[row.region]
    if (id) byId.set(id, row)
  }

  return REGIONS.map((region) => {
    const row = byId.get(region.id)
    return {
      regionId: region.id,
      windKmh: Math.round(row?.wind_kmh ?? 0),
      gustKmh: Math.round(row?.gust_kmh ?? 0),
      windDirection: Math.round(row?.wind_direction_deg ?? 0),
      pressureHpa: Math.round(row?.pressure_hpa ?? 0),
      precipitationMm: Number((row?.precip_mm ?? 0).toFixed(1)),
      temperatureC: Math.round(row?.temp_c ?? 0),
      humidity: Math.round(row?.humidity ?? 0),
    }
  })
}

export function useRegionWeather() {
  return useQuery({
    queryKey: ['weather', 'regions'],
    queryFn: fetchRegionWeather,
    // Cron writes every 10 min, so polling faster than ~2 min is pointless.
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  })
}
