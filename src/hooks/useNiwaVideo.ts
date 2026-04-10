import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface NiwaVideo {
  id: string
  tag: string
  vimeo_id: string
  vimeo_uri: string
  name: string
  release_time: string
  thumbnail_url: string | null
  first_seen_at: string
  last_seen_at: string
}

/** Latest "Latest Weather Update" video (the primary NIWA daily), with the
 *  last N prior releases alongside it for update-history tracking. */
export function useNiwaVideo() {
  return useQuery({
    queryKey: ['niwa-video', 'latest-with-history'],
    queryFn: async (): Promise<{
      latest: NiwaVideo | null
      history: NiwaVideo[]
    }> => {
      // Pull the most recent niwa_weather_public videos (the main daily
      // update). Fall back to any tag if that's empty.
      const { data: primary, error: e1 } = await supabase
        .from('niwa_videos')
        .select('*')
        .eq('tag', 'niwa_weather_public')
        .order('release_time', { ascending: false })
        .limit(8)
      if (e1) throw e1

      if (primary && primary.length > 0) {
        const [latest, ...history] = primary as NiwaVideo[]
        return { latest, history }
      }

      const { data: any, error: e2 } = await supabase
        .from('niwa_videos')
        .select('*')
        .order('release_time', { ascending: false })
        .limit(8)
      if (e2) throw e2
      const all = (any ?? []) as NiwaVideo[]
      return { latest: all[0] ?? null, history: all.slice(1) }
    },
    refetchInterval: 60_000,
  })
}
