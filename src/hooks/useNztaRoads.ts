import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type RoadSeverity = 'closed' | 'delay' | 'hazard' | 'caution'

export type RoadGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }

export interface RoadEvent {
  id: string
  event_type: string | null
  description: string | null
  comments: string | null
  impact: string | null
  severity: RoadSeverity
  planned: boolean
  status: string | null
  island: string | null
  region: string | null
  highway: string | null
  location: string | null
  alternative_route: string | null
  start_date: string | null
  end_date: string | null
  expected_resolution: string | null
  geometry: RoadGeometry | null
  centroid: [number, number] | null
}

export interface RoadEventsResponse {
  ok: boolean
  count: number
  events: RoadEvent[]
  fetched_at: string
}

export function useNztaRoads() {
  return useQuery({
    queryKey: ['nzta-roads'],
    queryFn: async (): Promise<RoadEventsResponse> => {
      const { data, error } = await supabase.functions.invoke('nzta-roads', {
        method: 'GET',
      })
      if (error) throw error
      return data as RoadEventsResponse
    },
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
