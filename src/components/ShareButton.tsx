import { useMemo, useRef, useState } from 'react'
import {
  Share2,
  Download,
  Copy,
  Check,
  X,
  Loader2,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { useCountdown } from '@/hooks/useCountdown'
import { useLandfall, formatLandfallLabel } from '@/hooks/useLandfall'
import { REGIONS } from '@/lib/cyclone'
import { useMetServiceNationalWarnings } from '@/hooks/useMetServiceNational'
import { useRegionWeather } from '@/hooks/useWeather'
import { ShareCard, type ShareCardData } from '@/components/ShareCard'

const SITE_URL =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://vaianu.netlify.app'

interface ShareContent {
  card: ShareCardData
  /** Short headline-style message for X / WhatsApp / LinkedIn summary */
  short: string
  /** Longer body used for email / Reddit */
  long: string
  /** Email subject */
  subject: string
}

function useShareContent(): ShareContent {
  const landfall = useLandfall()
  const cd = useCountdown(landfall.iso)
  const { data: warnings } = useMetServiceNationalWarnings()
  const { data: regions } = useRegionWeather()

  return useMemo(() => {
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

    const card: ShareCardData = {
      landfallText,
      landfallTime: `${formatLandfallLabel(landfall.iso)} · ${landfall.region}`,
      red: counts.red,
      orange: counts.orange,
      yellow: counts.yellow,
      peakGust,
      peakGustLocation,
    }

    const warnBits: string[] = []
    if (counts.red) warnBits.push(`${counts.red} RED`)
    if (counts.orange) warnBits.push(`${counts.orange} ORANGE`)
    if (counts.yellow) warnBits.push(`${counts.yellow} YELLOW`)
    const warnStr = warnBits.length ? warnBits.join(' · ') : 'No active warnings'

    const gustStr =
      peakGust && peakGustLocation
        ? ` · Peak gust ${peakGust} km/h ${peakGustLocation}`
        : ''

    const short = cd.isPast
      ? `🌀 Cyclone Vaianu has made landfall. ${warnStr}${gustStr}. Live NZ tracker →`
      : `🌀 Cyclone Vaianu — Landfall in ${landfallText} (${landfall.region}). ${warnStr}${gustStr}. Live NZ tracker →`

    const long = [
      `Cyclone Vaianu — live NZ impact tracker`,
      ``,
      cd.isPast
        ? `Status: Landfall has passed.`
        : `Landfall in ${landfallText}`,
      `Target area: ${landfall.region}`,
      `Warnings: ${warnStr}`,
      peakGust && peakGustLocation
        ? `Peak gust: ${peakGust} km/h at ${peakGustLocation}`
        : '',
      ``,
      `Weather, flights, power outages, road closures, river levels, AI briefings — all live:`,
      SITE_URL,
    ]
      .filter(Boolean)
      .join('\n')

    const subject = cd.isPast
      ? `Cyclone Vaianu — landfall update`
      : `Cyclone Vaianu — landfall in ${landfallText}`

    return { card, short, long, subject }
  }, [
    landfall.iso,
    landfall.region,
    cd.hours,
    cd.minutes,
    cd.isPast,
    warnings,
    regions,
  ])
}

interface PlatformDef {
  key: string
  label: string
  className: string
  build: (content: ShareContent) => string
  icon: React.ReactNode
}

// Most platforms accept the body text and URL as separate params.
const PLATFORMS: PlatformDef[] = [
  {
    key: 'x',
    label: 'X / Twitter',
    className: 'bg-black hover:bg-neutral-800 border-white/15 text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    build: (c) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(c.short)}&url=${encodeURIComponent(SITE_URL)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    className: 'bg-[#1877f2] hover:bg-[#166fe5] border-[#1877f2] text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    build: () =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    className: 'bg-[#0a66c2] hover:bg-[#0957a8] border-[#0a66c2] text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    build: () =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    className: 'bg-[#25d366] hover:bg-[#20bd5a] border-[#25d366] text-white',
    icon: <MessageCircle className="h-4 w-4" />,
    build: (c) => `https://wa.me/?text=${encodeURIComponent(`${c.short} ${SITE_URL}`)}`,
  },
  {
    key: 'reddit',
    label: 'Reddit',
    className: 'bg-[#ff4500] hover:bg-[#e63d00] border-[#ff4500] text-white',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.67 10.46c.02.15.03.3.03.46 0 3.1-3.6 5.6-8.04 5.6s-8.04-2.5-8.04-5.6c0-.16.01-.31.03-.46a1.63 1.63 0 112.28-2.31 10.6 10.6 0 015.3-1.44l.81-3.8a.31.31 0 01.38-.24l2.64.56a1.13 1.13 0 11-.13.62l-2.37-.5-.72 3.36a10.62 10.62 0 015.23 1.44 1.63 1.63 0 112.6 2.31zm-10.93 1.3a1.16 1.16 0 11-2.32 0 1.16 1.16 0 012.32 0zm6.52 0a1.16 1.16 0 11-2.32 0 1.16 1.16 0 012.32 0zm-.7 3.36a.35.35 0 00-.5 0 3.26 3.26 0 01-2.38.93 3.26 3.26 0 01-2.38-.93.35.35 0 10-.5.5 3.97 3.97 0 002.88 1.13c1.1 0 2.14-.4 2.88-1.13a.35.35 0 000-.5z" />
      </svg>
    ),
    build: (c) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(SITE_URL)}&title=${encodeURIComponent(c.subject)}`,
  },
  {
    key: 'email',
    label: 'Email',
    className:
      'bg-white/[0.06] hover:bg-white/[0.12] border-white/20 text-white',
    icon: <Mail className="h-4 w-4" />,
    build: (c) =>
      `mailto:?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(c.long)}`,
  },
]

interface ShareButtonProps {
  /** Hide the mobile floating action button (still shows the desktop chip). */
  hideMobileFab?: boolean
}

export function ShareButton({ hideMobileFab }: ShareButtonProps = {}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const content = useShareContent()

  function openPlatform(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=620,height=720')
  }

  async function nativeShare() {
    if (typeof navigator === 'undefined' || !navigator.share) return
    try {
      await navigator.share({
        title: 'Cyclone Vaianu · Live NZ Tracker',
        text: content.short,
        url: SITE_URL,
      })
    } catch (err) {
      // user cancelled or not supported — silent
      console.warn('[share] native share cancelled', err)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${content.short} ${SITE_URL}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      console.error('[share] copy failed', err)
    }
  }

  async function generatePng() {
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
      console.error('[share] card render failed', err)
    } finally {
      setRendering(false)
    }
  }

  function openCard() {
    setCardOpen(true)
    setPngUrl(null)
    setTimeout(() => generatePng(), 50)
  }

  function closeCard() {
    setCardOpen(false)
    setPngUrl(null)
  }

  function downloadPng() {
    if (!pngUrl) return
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `vaianu-${new Date().toISOString().slice(0, 10)}.png`
    a.click()
  }

  async function copyPng() {
    if (!pngUrl) return
    try {
      const blob = await (await fetch(pngUrl)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
    } catch (err) {
      console.error('[share] image copy failed', err)
    }
  }

  const hasNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <>
      {/* Desktop / tablet: inline chip in the header badge row */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex group items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.10] hover:border-white/30 transition-colors px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-[0.15em] text-white/60 hover:text-white"
      >
        <Share2 className="h-3 w-3" />
        Share
      </button>

      {/* Mobile: compact floating button anchored bottom-right, safe-area
          aware. Offset upwards so it sits above the fixed bottom tab bar.
          Can be suppressed on specific tabs via hideMobileFab. */}
      {!hideMobileFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Share"
          className="sm:hidden fixed z-[90] h-10 w-10 rounded-full border border-red-500/30 bg-[#0a0f1e]/85 backdrop-blur-md text-red-300 hover:text-red-200 hover:border-red-500/50 active:scale-95 active:bg-[#0a0f1e] shadow-md shadow-black/40 transition-all flex items-center justify-center"
          style={{
            right: 'max(0.75rem, env(safe-area-inset-right))',
            bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
          }}
        >
          <Share2 className="h-4 w-4" strokeWidth={2} />
        </button>
      )}

      {/* Offscreen render target for the PNG card — always mounted so ref
          is available when the user opts into downloading it. */}
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
        <ShareCard ref={cardRef} data={content.card} />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0a0f1e] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Share2 className="h-3.5 w-3.5 text-red-300" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white/70">
                  Share this dashboard
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

            <div className="p-5 space-y-4">
              {/* Preview of the short message */}
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[12px] text-white/80 leading-relaxed">
                {content.short}{' '}
                <span className="text-white/40">{SITE_URL}</span>
              </div>

              {/* Native share sheet on mobile if available */}
              {hasNativeShare && (
                <button
                  type="button"
                  onClick={nativeShare}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-600 hover:bg-red-500 transition-colors px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-white font-bold"
                >
                  <Share2 className="h-4 w-4" />
                  Use device share sheet
                </button>
              )}

              {/* Platform grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => openPlatform(p.build(content))}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${p.className}`}
                  >
                    {p.icon}
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Copy link */}
              <button
                type="button"
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.10] transition-colors px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider text-white/80"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copied to clipboard
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3.5 w-3.5" />
                    Copy link + message
                  </>
                )}
              </button>

              {/* Image card — collapsed by default, secondary action */}
              <div className="border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={openCard}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-colors px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-white/50 hover:text-white/80"
                >
                  <ImageIcon className="h-3 w-3" />
                  Generate share image (1200 × 630)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary modal: the image card generator */}
      {cardOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeCard}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl rounded-2xl border border-white/15 bg-[#0a0f1e] shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-red-300" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white/70">
                  Share image preview
                </span>
              </div>
              <button
                type="button"
                onClick={closeCard}
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
                Attach this to a post for a richer card
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyPng}
                  disabled={!pngUrl || rendering}
                  className="flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.05] hover:bg-white/[0.10] disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white/80"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={downloadPng}
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
