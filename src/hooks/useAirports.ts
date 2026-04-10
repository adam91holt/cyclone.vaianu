import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AirportActivity {
  callsign: string
  registration: string | null
  type: string | null
  direction: 'arrival' | 'departure' | 'overhead' | 'ground'
  alt_ft: number | null
  speed_kts: number | null
  distance_nm: number | null
  vertical_rate: number | null
}

export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  recentArrivals: number
  recentDepartures: number
  overhead: number
  onGround: number
  activity: AirportActivity[]
  status: 'normal' | 'reduced' | 'suspended' | 'limited'
}

interface AirportsResponse {
  airports: Airport[]
  count: number
  fetchedAt: string
  source: 'cache' | 'upstream' | 'cache-stale'
}

export function useAirports() {
  return useQuery({
    queryKey: ['airports'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('airports-live', {
        body: {},
      })
      if (error) throw error
      return data as AirportsResponse
    },
    refetchInterval: 60 * 1000, // 1 min — matches server-side TTL
    staleTime: 30 * 1000,
  })
}
