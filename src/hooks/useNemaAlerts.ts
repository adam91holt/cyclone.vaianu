import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type NemaSeverity = 'red' | 'orange' | 'info'

export interface NemaAlert {
  id: string
  title: string
  severity: NemaSeverity
  summary: string
  body: string
  link: string | null
  published_at: string | null
}

export interface NemaAlertsResponse {
  ok: boolean
  channel: string
  last_build_date: string | null
  count: number
  alerts: NemaAlert[]
}

export function useNemaAlerts() {
  return useQuery({
    queryKey: ['nema-alerts'],
    queryFn: async (): Promise<NemaAlertsResponse> => {
      const { data, error } = await supabase.functions.invoke('nema-alerts', {
        method: 'GET',
      })
      if (error) throw error
      return data as NemaAlertsResponse
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  })
}
