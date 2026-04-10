import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface FeedHealth {
  jobname: string
  schedule: string
  active: boolean
  last_run_at: string | null
  last_status: string | null
  last_message: string | null
  last_success_at: string | null
}

export function useFeedHealth() {
  return useQuery({
    queryKey: ['feed-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_feed_health')
      if (error) throw error
      return (data ?? []) as FeedHealth[]
    },
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
  })
}
