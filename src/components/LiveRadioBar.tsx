import { useRef, useState } from 'react'
import { Play, Pause, Radio, Volume2 } from 'lucide-react'

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/rnz-stream`

export function LiveRadioBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Force a fresh connection — live streams don't like resuming
      audio.src = STREAM_URL
      audio.load()
      await audio.play()
      setPlaying(true)
    } catch (err) {
      console.error('RNZ stream play failed', err)
      setError('Could not start stream')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a1325] border-b border-white/5">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 py-2 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={loading}
          className="group flex items-center gap-2 shrink-0 rounded-md bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 hover:border-red-500/50 px-2.5 py-1.5 transition-all disabled:opacity-60"
          aria-label={playing ? 'Pause RNZ National' : 'Play RNZ National'}
        >
          {loading ? (
            <div className="h-3.5 w-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5 text-red-300 fill-red-300" />
          ) : (
            <Play className="h-3.5 w-3.5 text-red-300 fill-red-300" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-200">
            {playing ? 'Pause' : 'Listen Live'}
          </span>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Radio className={`h-3.5 w-3.5 shrink-0 ${playing ? 'text-red-400 animate-pulse' : 'text-white/40'}`} />
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/80 truncate">
              RNZ National
              <span className="ml-2 text-[9px] font-mono text-white/40 normal-case tracking-normal">
                Radio New Zealand · Live
              </span>
            </div>
          </div>
        </div>

        {playing && !error && (
          <div className="hidden sm:flex items-center gap-1 shrink-0 text-white/50">
            <Volume2 className="h-3 w-3" />
            <span className="text-[9px] font-mono uppercase tracking-wider">On Air</span>
          </div>
        )}

        {error && (
          <span className="text-[9px] font-mono uppercase tracking-wider text-red-300/80 shrink-0">
            {error}
          </span>
        )}

        <audio
          ref={audioRef}
          preload="none"
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false)
            setLoading(false)
            setError('Stream unavailable')
          }}
        />
      </div>
    </div>
  )
}
