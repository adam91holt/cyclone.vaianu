import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Radio, AlertCircle } from 'lucide-react'

interface LiveWebcamProps {
  src: string
  name: string
  sub: string
}

export function LiveWebcam({ src, name, sub }: LiveWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    setError(null)
    setLoaded(false)

    // Safari / iOS play HLS natively.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      const onLoaded = () => setLoaded(true)
      video.addEventListener('loadeddata', onLoaded)
      return () => {
        video.removeEventListener('loadeddata', onLoaded)
        video.removeAttribute('src')
        video.load()
      }
    }

    // Everywhere else: hls.js.
    if (!Hls.isSupported()) {
      setError('HLS not supported in this browser')
      return
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
    })

    hls.loadSource(src)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, () => setLoaded(true))
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) {
        console.error('hls fatal error', data)
        setError(data.details || 'Stream error')
      }
    })

    return () => {
      hls.destroy()
    }
  }, [src])

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="aspect-video relative">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          controls
          className="absolute inset-0 h-full w-full object-cover"
        />
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/60 font-mono">
              <div className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Connecting…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/80 text-white/70">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="text-[10px] uppercase tracking-wider font-mono">Stream unavailable</div>
            <div className="text-[9px] font-mono text-white/40">{error}</div>
          </div>
        )}
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
          <span className="text-[9px] font-bold uppercase tracking-wider text-red-300">Live</span>
        </div>
      </div>
    </div>
  )
}
