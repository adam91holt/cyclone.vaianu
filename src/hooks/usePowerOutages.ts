import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type OutageProvider = 'northpower' | 'wel' | 'topenergy' | 'counties'
export type OutageService = 'electricity' | 'fibre'
export type OutageStatus = 'unplanned' | 'planned'

export interface PowerOutage {
  provider: OutageProvider
  incident_id: string
  service: OutageService
  status: OutageStatus
  title: string | null
  cause: string | null
  start_time: string | null
  end_time: string | null
  restoration_hint: string | null
  notes: string | null
  customer_count: number | null
  localities: string[]
  equipment: string | null
  region: string
  geometry: GeoJSON.Geometry | null
  centroid_lat: number | null
  centroid_lon: number | null
  first_seen_at: string
  last_seen_at: string
  cleared_at: string | null
}

export interface PowerOutagesSummary {
  total_incidents: number
  total_customers: number
  by_provider: Record<
    string,
    { incidents: number; customers: number; unplanned: number }
  >
  by_region: Record<string, { incidents: number; customers: number }>
  providers_failed: string[]
  updated_at: string
}

export function usePowerOutages() {
  return useQuery({
    queryKey: ['power-outages'],
    queryFn: async (): Promise<PowerOutage[]> => {
      const { data, error } = await supabase
        .from('power_outages')
        .select('*')
        .is('cleared_at', null)
        .eq('status', 'unplanned')
        .order('customer_count', { ascending: false, nullsFirst: false })
      if (error) throw error
      return (data ?? []).map((r) => ({
        ...r,
        geometry: r.geometry as GeoJSON.Geometry | null,
        centroid_lat: r.centroid_lat === null ? null : Number(r.centroid_lat),
        centroid_lon: r.centroid_lon === null ? null : Number(r.centroid_lon),
      })) as PowerOutage[]
    },
    refetchInterval: 60 * 1000,
    staleTime: 45 * 1000,
  })
}

export function usePowerOutagesSummary() {
  return useQuery({
    queryKey: ['power-outages-summary'],
    queryFn: async (): Promise<PowerOutagesSummary | null> => {
      const { data, error } = await supabase
        .from('power_outages_summary')
        .select(
          'total_incidents, total_customers, by_provider, by_region, providers_failed, updated_at',
        )
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        total_incidents: data.total_incidents,
        total_customers: data.total_customers,
        by_provider: (data.by_provider ?? {}) as PowerOutagesSummary['by_provider'],
        by_region: (data.by_region ?? {}) as PowerOutagesSummary['by_region'],
        providers_failed: (data.providers_failed ?? []) as string[],
        updated_at: data.updated_at,
      }
    },
    refetchInterval: 60 * 1000,
    staleTime: 45 * 1000,
  })
}
