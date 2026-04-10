import { MessageCircle, ExternalLink } from 'lucide-react'
import { useNiwaTweets } from '@/hooks/useNiwaForecast'

function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function linkify(text: string): { text: string; urls: string[] } {
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = text.match(urlRegex) ?? []
  const clean = text.replace(urlRegex, '').replace(/\s+/g, ' ').trim()
  return { text: clean, urls }
}

export function NiwaTweets() {
  const { data: tweets, isLoading } = useNiwaTweets(10)

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 border border-sky-500/30">
            <MessageCircle className="h-4 w-4 text-sky-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              @NiwaWeather
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Official updates
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {isLoading && !tweets && (
          <div className="p-4 space-y-3">
            <div className="h-20 bg-white/5 rounded animate-pulse" />
            <div className="h-20 bg-white/5 rounded animate-pulse" />
            <div className="h-20 bg-white/5 rounded animate-pulse" />
          </div>
        )}
        {tweets?.map((t) => {
          const parsed = linkify(t.full_text)
          return (
            <article key={t.tweet_id} className="p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-3">
                {t.media_url && (
                  <img
                    src={t.media_url}
                    alt=""
                    loading="lazy"
                    className="w-16 h-16 rounded object-cover shrink-0 border border-white/10"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] text-white/85 leading-relaxed whitespace-pre-line">
                    {parsed.text}
                  </div>
                  {parsed.urls.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {parsed.urls.slice(0, 2).map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-sky-300 hover:text-sky-200 truncate max-w-[160px]"
                        >
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          {u.replace(/^https?:\/\//, '').slice(0, 24)}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-1.5 text-[9px] font-mono uppercase tracking-wider text-white/40">
                    {timeAgo(t.created_at)}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
        {tweets && tweets.length === 0 && (
          <div className="text-sm text-white/50 italic text-center py-6">
            No tweets yet.
          </div>
        )}
      </div>
    </div>
  )
}
