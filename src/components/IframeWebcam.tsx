import { Radio } from 'lucide-react'

interface IframeWebcamProps {
  /** Absolute iframe src — e.g. a rtsp.me embed URL. */
  src: string
  name: string
  sub: string
}

/**
 * Generic iframe-based webcam for third-party embed services that don't
 * give us a raw HLS manifest but do provide an iframe player (rtsp.me,
 * earthTV, etc.). When the parent unmounts on tab switch the iframe is
 * destroyed with it — no manual teardown needed.
 */
export function IframeWebcam({ src, name, sub }: IframeWebcamProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="aspect-video relative bg-black">
        <iframe
          src={src}
          title={name}
          className="absolute inset-0 h-full w-full"
          frameBorder={0}
          allow="autoplay; encrypted-media; fullscreen"
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
            Live
          </span>
        </div>
      </div>
    </div>
  )
}
