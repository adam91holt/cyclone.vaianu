import { useRef, useState } from 'react'
import { Share2, Download, Copy, Check, X, Loader2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useCountdown } from '@/hooks/useCountdown'
import { useLandfall, formatLandfallLabel } from '@/hooks/useLandfall'
import { REGIONS } from '@/lib/cyclone'
import { useMetServiceNationalWarnings } from '@/hooks/useMetServiceNational'
import { useRegionWeather } from '@/hooks/useWeather'
import { ShareCard, type ShareCardData } from '@/components/ShareCard'

function useShareData(): ShareCardData {
  const landfall = useLandfall()
  const cd = useCountdown(landfall.iso)
  const { data: warnings } = useMetServiceNationalWarnings()
  const { data: regions } = useRegionWeather()

  const counts = { red: 0, orange: 0, yellow: 0 }
  for (const w of warnings ?? []) {
    const l = (w.warn_level ?? '').toLowerCase()
    if (l === 'red') counts.red++
    else if (l === 'orange') counts.orange++
    else if (l === 'yellow') counts.yellow++
  }

  let peakGust: number | null = null
  let peakGustLocation: string | null = null
  for (const r of regions ?? []) {
    const gust = r.gustKmh ?? r.windKmh ?? 0
    if (gust > (peakGust ?? 0)) {
      peakGust = gust
      peakGustLocation =
        REGIONS.find((reg) => reg.id === r.regionId)?.short ?? null
    }
  }

  const days = Math.floor(cd.hours / 24)
  const remHours = cd.hours % 24
  const landfallText = cd.isPast
    ? 'LANDFALL'
    : days > 0
      ? `${days}d ${remHours}h ${cd.minutes}m`
      : `${cd.hours}h ${cd.minutes}m`

  return {
    landfallText,
    landfallTime: `${formatLandfallLabel(landfall.iso)} · ${landfall.region}`,
    red: counts.red,
    orange: counts.orange,
    yellow: counts.yellow,
    peakGust,
    peakGustLocation,
  }
}

export function ShareButton() {
  const [open, setOpen] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const data = useShareData()

  async function generate() {
    if (!cardRef.current) return
    setRendering(true)
    try {
      const url = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#05080f',
      })
      setPngUrl(url)
    } catch (err) {
      console.error('share render failed', err)
    } finally {
      setRendering(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    setPngUrl(null)
    // Let the hidden card mount, then render
    setTimeout(() => generate(), 100)
  }

  function download() {
    if (!pngUrl) return
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `vaianu-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  async function copy() {
    if (!pngUrl) return
    try {
      const blob = await (await fetch(pngUrl)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('copy failed', err)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.10] hover:border-white/30 transition-colors px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-white/60 hover:text-white"
      >
        <Share2 className="h-3 w-3" />
        Share
      </button>

      {/* Offscreen render target — always mounted so ref is available */}
      <div
        style={{
          position: 'fixed',
          left: '-10000px',
          top: 0,
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden
      >
        <ShareCard ref={cardRef} data={data} />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0a0f1e] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-red-300" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white/70">
                  Share preview
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 bg-[radial-gradient(circle_at_center,#111a30_0%,#05080f_80%)] min-h-[360px] flex items-center justify-center">
              {rendering && (
                <div className="flex flex-col items-center gap-2 text-white/60">
                  <Loader2 className="h-6 w-6 animate-spin text-red-300" />
                  <span className="text-[10px] uppercase tracking-wider font-mono">
                    Rendering 1200×630…
                  </span>
                </div>
              )}
              {!rendering && pngUrl && (
                <img
                  src={pngUrl}
                  alt="Share preview"
                  className="w-full h-auto rounded-lg border border-white/10 shadow-lg"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/10 bg-white/[0.02] flex-wrap">
              <div className="text-[10px] text-white/45 font-mono uppercase tracking-wider">
                1200 × 630 · optimised for X, Facebook, LinkedIn
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copy}
                  disabled={!pngUrl || rendering}
                  className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white/80"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={download}
                  disabled={!pngUrl || rendering}
                  className="flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-red-200 font-bold"
                >
                  <Download className="h-3 w-3" />
                  Download PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
