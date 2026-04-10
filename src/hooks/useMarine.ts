import { useQuery } from '@tanstack/react-query'

export interface MarineData {
  waveHeight: number
  wavePeriod: number
  waveDirection: number
  swellHeight: number
  swellPeriod: number
}

interface MarineResponse {
  current: {
    wave_height: number
    wave_direction: number
    wave_period: number
    swell_wave_height: number
    swell_wave_period: number
  }
}

// Point off the Coromandel coast — where the cyclone is tracking.
const LAT = -36.4
const LON = 175.8

async function fetchMarine(): Promise<MarineData> {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period&timezone=Pacific%2FAuckland`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Marine fetch failed: ${res.status}`)
  const data = (await res.json()) as MarineResponse
  const c = data.current
  return {
    waveHeight: Number(c.wave_height.toFixed(1)),
    wavePeriod: Number(c.wave_period.toFixed(1)),
    waveDirection: Math.round(c.wave_direction),
    swellHeight: Number(c.swell_wave_height.toFixed(1)),
    swellPeriod: Number(c.swell_wave_period.toFixed(1)),
  }
}

export function useMarine() {
  return useQuery({
    queryKey: ['marine'],
    queryFn: fetchMarine,
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  })
}
