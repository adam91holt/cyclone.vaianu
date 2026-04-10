import { useEffect, useState } from 'react'
import { Camera, AlertCircle } from 'lucide-react'

interface StillWebcamProps {
  src: string
  name: string
  sub: string
  /** Refresh interval in seconds (default: 60) */
  refreshSec?: number
}

/**
 * Refreshing still-image webcam. Use this for sources that publish a
 * `latest.jpg` style URL instead of a live HLS stream. No CORS required
 * because the browser loads the image directly via `<img src>`.
 *
 * A cache-busting query param is appended on every refresh so Cloudflare
 * / origin cache can't serve a stale copy.
 */
export function StillWebcam({ src, name, sub, refreshSec = 60 }: StillWebcamProps) {
  const [tick, setTick] = useState(0)
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [lastLoad, setLastLoad] = useState<Date | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), refreshSec * 1000)
    return () => clearInterval(id)
  }, [refreshSec])

  // Cache-buster: rounded to the refresh window to avoid double-fetching
  const cacheBuster = Math.floor(Date.now() / (refreshSec * 1000))
  const fullSrc = `${src}${src.includes('?') ? '&' : '?'}t=${cacheBuster}`
  void tick // re-render trigger

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black">
      <div className="aspect-video relative bg-black">
        <img
          src={fullSrc}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={() => {
            setError(false)
            setLoaded(true)
            setLastLoad(new Date())
          }}
          onError={() => {
            setError(true)
            setLoaded(false)
          }}
        />
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-none">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/60 font-mono">
              <div className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Loading…
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/80 text-white/70 p-3 text-center">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="text-[10px] uppercase tracking-wider font-mono">Image unavailable</div>
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
        <div className="flex items-center gap-1 shrink-0" title={lastLoad ? `Last loaded ${lastLoad.toLocaleTimeString('en-NZ')}` : ''}>
          <Camera className="h-3 w-3 text-sky-400" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300">
            {refreshSec < 60 ? `${refreshSec}s` : `${Math.round(refreshSec / 60)}m`}
          </span>
        </div>
      </div>
    </div>
  )
}
