import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RiverHistoryPoint {
  ts: string
  value: number
}

export interface RiverHistory {
  council: string
  name: string
  council_name: string | null
  unit: string | null
  latitude: number | null
  longitude: number | null
  points: RiverHistoryPoint[]
}

export function useRiverHistory(
  council: string | null,
  site: string | null,
  hours = 24,
) {
  return useQuery({
    queryKey: ['river-history', council, site, hours],
    enabled: !!council && !!site,
    queryFn: async (): Promise<RiverHistory | null> => {
      if (!council || !site) return null
      const { data, error } = await supabase.rpc('get_river_history', {
        p_council: council,
        p_site: site,
        p_hours: hours,
      })
      if (error) throw error
      const rows = (data ?? []) as Array<{
        ts: string
        value: number | string | null
        unit: string | null
        name: string
        council_name: string | null
        latitude: number | string | null
        longitude: number | string | null
      }>
      if (rows.length === 0) return null
      const first = rows[0]
      return {
        council,
        name: first.name,
        council_name: first.council_name,
        unit: first.unit,
        latitude:
          first.latitude === null ? null : Number(first.latitude),
        longitude:
          first.longitude === null ? null : Number(first.longitude),
        points: rows
          .filter((r) => r.value !== null)
          .map((r) => ({ ts: r.ts, value: Number(r.value) })),
      }
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}
