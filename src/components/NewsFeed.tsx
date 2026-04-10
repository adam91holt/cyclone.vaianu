import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Newspaper, ExternalLink, ImageOff } from 'lucide-react'
import { useState } from 'react'

interface NewsItem {
  id: string
  source: string
  title: string
  url: string
  summary: string | null
  published_at: string | null
  image_url: string | null
}

function useNewsFeed() {
  return useQuery({
    queryKey: ['news', 'feed'],
    queryFn: async (): Promise<NewsItem[]> => {
      const { data, error } = await supabase
        .from('news_items')
        .select('id, source, title, url, summary, published_at, image_url')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(40)
      if (error) throw error
      return (data ?? []) as NewsItem[]
    },
    refetchInterval: 120_000,
  })
}

function timeAgo(iso: string | null) {
  if (!iso) return ''
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function sourceBadge(source: string) {
  const s = source.toUpperCase()
  const map: Record<string, string> = {
    RNZ: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'RNZ POLITICS': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'RNZ WORLD': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    STUFF: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    'NZ HERALD': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    NEWSROOM: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    SPINOFF: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    INTEREST: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  }
  return map[s] ?? 'bg-white/10 text-white/60 border-white/20'
}

function NewsThumb({ src, alt }: { src: string | null; alt: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="w-28 h-20 sm:w-32 sm:h-20 shrink-0 rounded-md bg-white/[0.03] border border-white/5 flex items-center justify-center">
        <ImageOff className="h-4 w-4 text-white/20" />
      </div>
    )
  }
  return (
    <div className="w-28 h-20 sm:w-32 sm:h-20 shrink-0 rounded-md overflow-hidden bg-black/40 border border-white/5">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>
  )
}

export function NewsFeed() {
  const { data, isLoading, error } = useNewsFeed()

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-white/50" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Live News Feed
          </div>
        </div>
        <div className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
          RNZ · Stuff · NZH · Newsroom · Spinoff · Interest · filtered for weather
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 py-4 text-center">
          Couldn't load news feed.
        </div>
      )}

      {isLoading && !data && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      )}

      {data && data.length === 0 && (
        <div className="text-xs text-white/50 py-6 text-center italic">
          No cyclone headlines in the feed yet.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="group flex gap-3 bg-white/[0.02] border border-white/5 rounded-md p-2.5 hover:bg-white/[0.05] hover:border-white/15 transition-colors"
            >
              <NewsThumb src={item.image_url} alt={item.title} />
              <div className="min-w-0 flex-1 flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border rounded shrink-0 ${sourceBadge(item.source)}`}
                  >
                    {item.source}
                  </span>
                  <span className="text-[9px] font-mono text-white/40 uppercase shrink-0">
                    {timeAgo(item.published_at)}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] text-white/90 font-semibold leading-snug group-hover:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  <ExternalLink className="h-3 w-3 text-white/30 group-hover:text-white/70 shrink-0 mt-0.5" />
                </div>
                {item.summary && (
                  <p className="text-[11px] text-white/55 leading-snug mt-1 line-clamp-2">
                    {item.summary}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
