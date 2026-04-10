import { useState } from 'react'
import { Play, Video, ExternalLink, History } from 'lucide-react'
import { useNiwaVideo, type NiwaVideo } from '@/hooks/useNiwaVideo'

function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${mins % 60}m ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function PlayerFrame({ video }: { video: NiwaVideo }) {
  const [playing, setPlaying] = useState(false)

  if (playing) {
    return (
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10">
        <iframe
          src={`https://player.vimeo.com/video/${video.vimeo_id}?autoplay=1&title=0&byline=0&portrait=0`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          title={video.name}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10 hover:border-red-500/50 transition-colors"
    >
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.name}
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900/40 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-red-500/90 border-2 border-white/80 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
          <Play className="h-6 w-6 text-white ml-0.5" fill="currentColor" />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
        <div className="text-[10px] font-mono uppercase tracking-wider text-white/60">
          NIWA · {formatTimestamp(video.release_time)} NZST
        </div>
        <div className="text-sm font-bold text-white line-clamp-1 mt-0.5">
          {video.name}
        </div>
      </div>
    </button>
  )
}

export function NiwaVideoCard() {
  const { data, isLoading, error } = useNiwaVideo()
  const latest = data?.latest
  const history = data?.history ?? []

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-500/10 via-[#0f1729]/80 to-[#0f1729]/80 border border-sky-500/20 backdrop-blur-sm p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/20 border border-sky-500/30">
            <Video className="h-4 w-4 text-sky-300" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              NIWA Video Forecast
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              weather.niwa.co.nz · polled every 15m
            </div>
          </div>
        </div>
        {latest && (
          <a
            href={latest.vimeo_uri}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[9px] uppercase tracking-wider font-mono text-sky-300/80 hover:text-sky-200 flex items-center gap-1"
          >
            Vimeo <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>

      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full aspect-video bg-white/5 rounded-md animate-pulse" />
        </div>
      )}

      {error && (
        <div className="text-xs text-red-300 py-2">
          Couldn't load NIWA videos.
        </div>
      )}

      {!isLoading && !latest && !error && (
        <div className="flex-1 flex items-center justify-center text-xs text-white/50 italic py-6">
          No NIWA video available yet.
        </div>
      )}

      {latest && (
        <>
          <PlayerFrame video={latest} />

          <div className="flex items-center justify-between gap-2 mt-2.5 text-[10px] font-mono uppercase tracking-wider">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Released {timeAgo(latest.release_time)}
            </div>
            <div className="text-white/40">
              {history.length + 1} tracked
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-1.5 mb-2 text-[9px] font-mono uppercase tracking-[0.2em] text-white/40">
                <History className="h-2.5 w-2.5" />
                Previous updates
              </div>
              <div className="space-y-1">
                {history.slice(0, 4).map((v) => (
                  <a
                    key={v.id}
                    href={v.vimeo_uri}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center justify-between gap-2 text-[10px] text-white/50 hover:text-white/80 transition-colors"
                  >
                    <span className="font-mono tabular-nums shrink-0 text-white/40 group-hover:text-sky-300">
                      {formatTimestamp(v.release_time)}
                    </span>
                    <span className="text-white/30 font-mono shrink-0">
                      {timeAgo(v.release_time)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
