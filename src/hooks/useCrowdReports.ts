import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CrowdReport {
  id: string
  created_at: string
  report_text: string
  location_text: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
  submitter_name: string | null
}

export function useCrowdReports() {
  return useQuery({
    queryKey: ['crowd_reports', 'approved'],
    queryFn: async (): Promise<CrowdReport[]> => {
      const { data, error } = await supabase
        .from('crowd_reports')
        .select(
          'id, created_at, report_text, location_text, latitude, longitude, image_url, submitter_name',
        )
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data ?? []
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
