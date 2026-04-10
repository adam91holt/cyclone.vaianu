import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface MetServiceEnvelope<T> {
  data: T | null
  fetchedAt: string
  expiresAt: string
  source: 'cache' | 'upstream' | 'cache-stale' | 'fallback'
  upstreamStatus?: number
}

async function fetchResource<T>(resource: string): Promise<MetServiceEnvelope<T>> {
  const { data, error } = await supabase.functions.invoke('metservice', {
    body: { resource },
  })
  if (error) throw error
  return data as MetServiceEnvelope<T>
}

export interface MetServiceWarning {
  hasWarning: boolean
  highestWarnLevel: string
  mainText: string
  [k: string]: unknown
}

export interface MetServiceTownDay {
  date: string
  dateISO: string
  dow: string
  dowTLA: string
  forecast: string
  forecastWord: string
  issuedAt: string
  issuedAtISO: string
  max: string
  min: string
  partDayData?: Record<string, { forecastWord: string; iconType: string }>
}

export interface MetServiceTown {
  slug: string
  name: string
  issuedAt: string | null
  days: MetServiceTownDay[]
  error?: string | number
}

export function useMetServiceWarning() {
  return useQuery({
    queryKey: ['metservice', 'warnings'],
    queryFn: () => fetchResource<MetServiceWarning>('warnings'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}

export function useMetServiceForecast() {
  return useQuery({
    queryKey: ['metservice', 'forecast-north'],
    queryFn: () => fetchResource<{ towns: MetServiceTown[] }>('forecast-north'),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 8 * 60 * 1000,
  })
}

// Back-compat alias
export const useMetServiceWarnings = useMetServiceWarning
