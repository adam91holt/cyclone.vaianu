import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface NewsItem {
  id: string
  source: string
  title: string
  url: string
  published_at: string | null
}

function useNews() {
  return useQuery({
    queryKey: ['news'],
    queryFn: async (): Promise<NewsItem[]> => {
      // Prefer cached DB rows (populated by news-feed Edge Function). If
      // empty, fall back to invoking the function directly.
      const { data: dbRows } = await supabase
        .from('news_items')
        .select('id, source, title, url, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(20)

      if (dbRows && dbRows.length > 0) return dbRows as NewsItem[]

      const { data } = await supabase.functions.invoke('news-feed', {
        body: {},
      })
      return (data?.items ?? []) as NewsItem[]
    },
    refetchInterval: 60_000,
  })
}

export function NewsTicker() {
  const { data: items } = useNews()

  const display =
    items && items.length > 0
      ? items
      : [
          {
            id: 'placeholder',
            source: 'LIVE',
            title: 'Fetching latest headlines…',
            url: '#',
            published_at: null,
          },
        ]

  return (
    <div className="bg-amber-500 text-black py-2 overflow-hidden relative group">
      <div
        className="whitespace-nowrap text-xs font-semibold flex gap-12 px-6 animate-marquee group-hover:[animation-play-state:paused]"
      >
        {[...display, ...display].map((item, i) => (
          <a
            key={`${item.id}-${i}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-3 shrink-0 hover:underline"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-700 shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px]">
              {item.source}
            </span>
            <span>{item.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
