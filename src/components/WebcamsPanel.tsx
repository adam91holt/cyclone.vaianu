import { Video, ExternalLink } from 'lucide-react'
import { LiveWebcam } from '@/components/LiveWebcam'

interface Cam {
  key: string
  name: string
  sub: string
  src: string
  href: string
}

const CAMS: Cam[] = [
  {
    key: 'whitianga',
    name: 'Whitianga',
    sub: 'Buffalo Beach · Coromandel · RED zone',
    src: 'https://api.corolive.nz/hls/whitianga_high.m3u8',
    href: 'https://corolive.nz/whitianga',
  },
  {
    key: 'whangamata',
    name: 'Whangamata',
    sub: 'East coast Coromandel · RED zone',
    src: 'https://api.corolive.nz/hls/whangamata_high.m3u8',
    href: 'https://corolive.nz/whangamata',
  },
  {
    key: 'thames',
    name: 'Thames',
    sub: 'Firth of Thames · RED zone',
    src: 'https://api.corolive.nz/hls/thames_high.m3u8',
    href: 'https://corolive.nz/thames',
  },
]

export function WebcamsPanel() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1729]/80 border border-white/10 backdrop-blur-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <Video className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              Live Webcams · Landfall Zone
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Coromandel Peninsula · RED warning area
            </div>
          </div>
        </div>
        <a
          href="https://corolive.nz/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors shrink-0"
        >
          CoroLive
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {CAMS.map((cam) => (
          <div key={cam.key} className="flex flex-col">
            <LiveWebcam src={cam.src} name={cam.name} sub={cam.sub} />
            <a
              href={cam.href}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 text-[9px] font-mono uppercase tracking-wider text-white/35 hover:text-white/60 transition-colors self-end flex items-center gap-1"
            >
              Open on CoroLive
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-white/40 leading-relaxed">
        Live HLS streams from CoroLive's Coromandel webcam network. Feeds auto-play
        muted. If a stream is temporarily down, check back — conditions may have
        disrupted the camera uplink.
      </p>
    </div>
  )
}
