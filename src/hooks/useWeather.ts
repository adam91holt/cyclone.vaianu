import { useQuery } from '@tanstack/react-query'
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

interface OpenMeteoResponse {
  current: {
    time: string
    temperature_2m: number
    wind_speed_10m: number
    wind_direction_10m: number
    wind_gusts_10m: number
    pressure_msl: number
    precipitation: number
    relative_humidity_2m: number
  }
}

async function fetchRegionWeather(): Promise<RegionWeather[]> {
  const lats = REGIONS.map((r) => r.lat).join(',')
  const lons = REGIONS.map((r) => r.lon).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl&wind_speed_unit=kmh&timezone=Pacific%2FAuckland`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`)
  const payload = (await res.json()) as OpenMeteoResponse | OpenMeteoResponse[]
  const rows = Array.isArray(payload) ? payload : [payload]

  return REGIONS.map((region, i) => {
    const c = rows[i].current
    return {
      regionId: region.id,
      windKmh: Math.round(c.wind_speed_10m),
      gustKmh: Math.round(c.wind_gusts_10m),
      windDirection: Math.round(c.wind_direction_10m),
      pressureHpa: Math.round(c.pressure_msl),
      precipitationMm: Number(c.precipitation.toFixed(1)),
      temperatureC: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m),
    }
  })
}

export function useRegionWeather() {
  return useQuery({
    queryKey: ['weather', 'regions'],
    queryFn: fetchRegionWeather,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
