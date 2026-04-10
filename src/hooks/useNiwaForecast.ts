import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface NiwaDailySummary {
  start: string
  end: string
  label: string
  icon: string
  emoji: string
  text: string
  duration: number
  coverage_label?: string
  temperature: {
    max: number
    min: number
    max_time?: string
    min_time?: string
    relative_humidity_at_max_temperature?: number
  }
  wind: {
    speed: number
    max: number
    direction: string
    description: string
    max_description: string
    max_time?: string
  }
  wind_gust: {
    max: number
    max_description: string
    max_time?: string
  }
  precipitation: {
    precipitation_amount: number
    precipitation_label: string
    rain_classification: string
    snow_amount: number
  }
}

export interface NiwaHourly {
  datetime: string
  air_temperature: number
  relative_humidity: number
  cloud_coverage: number
  wind_speed: number
  wind_direction: number
  wind_gust: number
  wind_gust_description?: string
  wind_speed_description?: string
  precipitation_amount?: number
  precipitation_label?: string
  coverage_label?: string
  emoji?: string
}

export interface NiwaForecastRow {
  location_id: number
  location_name: string
  latitude: number | null
  longitude: number | null
  forecast: NiwaHourly[]
  summary: NiwaDailySummary[]
  updated_at: string
}

export function useNiwaForecast() {
  return useQuery({
    queryKey: ['niwa-forecast', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niwa_forecast')
        .select('location_id, location_name, latitude, longitude, forecast, summary, updated_at')
        .order('location_name')
      if (error) throw error
      return (data ?? []) as unknown as NiwaForecastRow[]
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

export interface NiwaTweet {
  tweet_id: string
  created_at: string
  full_text: string
  media_url: string | null
  media_type: string | null
  entities: unknown
}

export function useNiwaTweets(limit = 12) {
  return useQuery({
    queryKey: ['niwa-tweets', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niwa_tweets')
        .select('tweet_id, created_at, full_text, media_url, media_type, entities')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as NiwaTweet[]
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}
