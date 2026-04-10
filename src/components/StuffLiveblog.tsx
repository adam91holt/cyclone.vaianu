import { Radio, Clock, ExternalLink, User } from 'lucide-react'
import { useStuffLiveblog } from '@/hooks/useStuffLiveblog'

function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatNztTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Paragraph-split with sentence chunking as fallback. */
function splitBody(body: string): string[] {
  const byBlank = body
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (byBlank.length > 1) return byBlank
  // Fall back to sentence-split for long single blobs
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z])/g).filter(Boolean)
  if (sentences.length <= 2) return [body]
  const out: string[] = []
  let buf = ''
  for (const s of sentences) {
    if ((buf + ' ' + s).length > 240 && buf) {
      out.push(buf.trim())
      buf = s
    } else {
      buf = buf ? `${buf} ${s}` : s
    }
  }
  if (buf) out.push(buf.trim())
  return out
}

export function StuffLiveblog() {
  const { data: posts, isLoading } = useStuffLiveblog(15)

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#111a30]/90 via-[#0f1729]/90 to-[#0a1020]/90 border border-white/10 backdrop-blur-sm">
      {/* Header bar */}
      <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/40">
            <Radio className="h-4 w-4 text-red-300" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.22em] text-red-300 font-bold">
                Live Blog
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-red-200/70 bg-red-500/10 border border-red-500/30 rounded-sm px-1.5 py-0.5">
                <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
                Live
              </div>
            </div>
            <div className="text-sm font-bold text-white leading-tight mt-0.5">
              Cyclone Vaianu rolling coverage
            </div>
          </div>
        </div>
        <a
          href="https://www.stuff.co.nz/"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono text-white/50 hover:text-white transition-colors"
        >
          <span>Source</span>
          <span className="font-bold text-white/80 group-hover:text-white">
            Stuff.co.nz
          </span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Timeline body */}
      <div className="relative max-h-[720px] overflow-y-auto">
        {isLoading && !posts && (
          <div className="p-5 space-y-4">
            <div className="h-24 bg-white/5 rounded animate-pulse" />
            <div className="h-24 bg-white/5 rounded animate-pulse" />
            <div className="h-24 bg-white/5 rounded animate-pulse" />
          </div>
        )}

        {posts && posts.length === 0 && (
          <div className="py-10 text-center text-sm text-white/50 italic">
            No live blog posts yet.
          </div>
        )}

        {posts && posts.length > 0 && (
          <ol className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[34px] top-6 bottom-6 w-px bg-gradient-to-b from-red-500/40 via-white/10 to-transparent" />

            {posts.map((post, idx) => {
              const paragraphs = post.body ? splitBody(post.body) : []
              const isLatest = idx === 0
              return (
                <li
                  key={post.post_id}
                  className="relative pl-16 pr-5 py-5 hover:bg-white/[0.015] transition-colors border-b border-white/5 last:border-b-0"
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-[28px] top-[26px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                      isLatest
                        ? 'border-red-400 bg-red-500/80'
                        : 'border-white/30 bg-[#0a1020]'
                    }`}
                  >
                    {isLatest && (
                      <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {isLatest && (
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-sm bg-red-500/20 text-red-300 border border-red-500/40">
                        Latest
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/45">
                      <Clock className="h-2.5 w-2.5" />
                      {timeAgo(post.published_at)}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 tabular-nums">
                      {formatNztTime(post.published_at)}
                    </span>
                    {post.author && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-white/45">
                        <User className="h-2.5 w-2.5" />
                        {post.author}
                      </span>
                    )}
                  </div>

                  <h3 className="text-[15px] sm:text-base font-bold text-white leading-snug mb-2">
                    {post.headline}
                  </h3>

                  {paragraphs.length > 0 && (
                    <div className="space-y-1.5">
                      {paragraphs.map((p, i) => (
                        <p
                          key={i}
                          className="text-[12px] text-white/70 leading-relaxed"
                        >
                          {p}
                        </p>
                      ))}
                    </div>
                  )}

                  {post.shared_links && post.shared_links.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {post.shared_links.slice(0, 3).map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group flex items-start gap-2 rounded border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition-colors px-3 py-2"
                        >
                          <ExternalLink className="h-3 w-3 text-sky-300/80 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            {link.headline && (
                              <div className="text-[11px] font-bold text-white/85 group-hover:text-white truncate">
                                {link.headline}
                              </div>
                            )}
                            {link.description && (
                              <div className="text-[10px] text-white/45 line-clamp-1">
                                {link.description}
                              </div>
                            )}
                            {!link.headline && (
                              <div className="text-[10px] font-mono text-sky-300/80 truncate">
                                {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                              </div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Footer attribution */}
      <div className="px-5 py-2.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-white/40">
        <span>
          Rolling coverage curated by{' '}
          <a
            href="https://www.stuff.co.nz/"
            target="_blank"
            rel="noreferrer"
            className="text-white/70 hover:text-white underline underline-offset-2"
          >
            Stuff.co.nz
          </a>{' '}
          newsroom
        </span>
        <span>Auto-refreshes · 5 min</span>
      </div>
    </div>
  )
}
