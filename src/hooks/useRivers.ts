import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RiverSiteSummary {
  council: string
  council_name: string | null
  name: string
  latitude: number
  longitude: number
  unit: string | null
  latest_value: number | null
  latest_ts: string | null
  baseline_value: number | null
  baseline_ts: string | null
  change: number | null
  change_pct: number | null
  reading_count: number
}

export function useRivers() {
  return useQuery({
    queryKey: ['rivers-summary'],
    queryFn: async (): Promise<RiverSiteSummary[]> => {
      const { data, error } = await supabase.rpc('get_river_summary')
      if (error) throw error
      return (data ?? []) as RiverSiteSummary[]
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
