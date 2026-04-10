import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface WeatherHistoryPoint {
  recorded_at: string
  region: string
  wind_kmh: number
  gust_kmh: number
  pressure_hpa: number
  temp_c: number
  humidity: number
  precip_mm: number
}

/** Returns the last `hours` worth of weather samples across all regions. */
export function useWeatherHistory(hours = 6) {
  return useQuery({
    queryKey: ['weather-history', hours],
    queryFn: async (): Promise<WeatherHistoryPoint[]> => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('weather_history')
        .select('recorded_at, region, wind_kmh, gust_kmh, pressure_hpa, temp_c, humidity, precip_mm')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as WeatherHistoryPoint[]
    },
    refetchInterval: 60_000, // reload every minute
    staleTime: 30_000,
  })
}
