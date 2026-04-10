import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MetServiceObservation {
  town_slug: string
  town_name: string
  display_order: number
  station: string | null
  obs_time: string | null
  rainfall_3h_mm: number | null
  rainfall_24h_mm: number | null
  temp_c: number | null
  wind_speed_kmh: number | null
  wind_direction: string | null
  pressure_hpa: number | null
  pressure_trend: string | null
  humidity: number | null
  fetched_at: string
}

export function useMetServiceObservations() {
  return useQuery({
    queryKey: ['metservice-observations'],
    queryFn: async (): Promise<MetServiceObservation[]> => {
      const { data, error } = await supabase
        .from('metservice_observations')
        .select(
          'town_slug, town_name, display_order, station, obs_time, rainfall_3h_mm, rainfall_24h_mm, temp_c, wind_speed_kmh, wind_direction, pressure_hpa, pressure_trend, humidity, fetched_at',
        )
        .order('display_order', { ascending: true })
      if (error) throw error
      // Postgres numeric columns come back as strings — coerce to numbers.
      return (data ?? []).map((r) => ({
        ...r,
        rainfall_3h_mm: r.rainfall_3h_mm === null ? null : Number(r.rainfall_3h_mm),
        rainfall_24h_mm:
          r.rainfall_24h_mm === null ? null : Number(r.rainfall_24h_mm),
        temp_c: r.temp_c === null ? null : Number(r.temp_c),
        wind_speed_kmh:
          r.wind_speed_kmh === null ? null : Number(r.wind_speed_kmh),
        pressure_hpa: r.pressure_hpa === null ? null : Number(r.pressure_hpa),
        humidity: r.humidity === null ? null : Number(r.humidity),
      })) as MetServiceObservation[]
    },
    refetchInterval: 60 * 1000,
    staleTime: 45 * 1000,
  })
}
