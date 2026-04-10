import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StuffSharedLink {
  url: string
  headline?: string
  description?: string
}

export interface StuffLiveblogPost {
  post_id: string
  headline: string
  body: string | null
  author: string | null
  published_at: string
  source_updated_at: string | null
  shared_links: StuffSharedLink[]
}

export function useStuffLiveblog(limit = 15) {
  return useQuery({
    queryKey: ['stuff-liveblog', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stuff_liveblog_posts')
        .select(
          'post_id, headline, body, author, published_at, source_updated_at, shared_links',
        )
        .order('published_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as StuffLiveblogPost[]
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  })
}
