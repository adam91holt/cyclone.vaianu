import { Radio } from 'lucide-react'

interface YouTubeWebcamProps {
  /** YouTube channel ID (UC...) for a channel that runs a 24/7 livestream. */
  channelId: string
  name: string
  sub: string
}

/**
 * Live webcam backed by a YouTube channel's current livestream. Uses
 * YouTube's built-in `/embed/live_stream?channel=UC...` endpoint, which
 * auto-resolves to whatever that channel is streaming right now.
 *
 * The iframe is muted + autoplays on mount so there's no user-interaction
 * barrier. When the parent (WebcamsPanel) unmounts on tab switch, the
 * iframe is destroyed with it — no manual teardown needed.
 */
export function YouTubeWebcam({ channelId, name, sub }: YouTubeWebcamProps) {
  const src = `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=1&mute=1&modestbranding=1&rel=0&playsinline=1`

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="aspect-video relative bg-black">
        <iframe
          src={src}
          title={name}
          className="absolute inset-0 h-full w-full"
          frameBorder={0}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-white/5 bg-[#0a0f1e]/60">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/90 truncate">
            {name}
          </div>
          <div className="text-[9px] font-mono text-white/45 truncate">{sub}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <Radio className="h-3 w-3 text-red-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">
            YouTube Live
          </span>
        </div>
      </div>
    </div>
  )
}
