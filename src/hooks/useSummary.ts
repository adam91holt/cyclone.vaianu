import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type SummaryRow = Database['public']['Tables']['cyclone_summaries']['Row']

export interface Ratings {
  seriousness: number
  weather_extremity: number
  public_safety_risk: number
  infrastructure_risk: number
  trajectory: 'intensifying' | 'steady' | 'weakening'
  rationale: string
}

export interface CycloneSummary extends Omit<SummaryRow, 'key_points' | 'ratings'> {
  key_points: string[]
  ratings: Ratings | null
}

function normalize(row: SummaryRow): CycloneSummary {
  return {
    ...row,
    key_points: Array.isArray(row.key_points) ? (row.key_points as string[]) : [],
    ratings: row.ratings && typeof row.ratings === 'object' ? (row.ratings as unknown as Ratings) : null,
  }
}

export function useLatestSummary() {
  return useQuery({
    queryKey: ['summary', 'latest'],
    queryFn: async (): Promise<CycloneSummary | null> => {
      const { data, error } = await supabase
        .from('cyclone_summaries')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return normalize(data)
    },
    refetchInterval: 60_000, // poll every minute; cron writes every 15
  })
}

export function useSummaryHistory(limit = 50) {
  return useQuery({
    queryKey: ['summary', 'history', limit],
    queryFn: async (): Promise<CycloneSummary[]> => {
      const { data, error } = await supabase
        .from('cyclone_summaries')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(normalize)
    },
    refetchInterval: 60_000,
  })
}
