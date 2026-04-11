import { Video, ExternalLink } from 'lucide-react'
import { LiveWebcam } from '@/components/LiveWebcam'
import { StillWebcam } from '@/components/StillWebcam'
import { YouTubeWebcam } from '@/components/YouTubeWebcam'

type CamType = 'hls' | 'youtube' | 'still'

interface Cam {
  key: string
  name: string
  sub: string
  type: CamType
  /** HLS m3u8 URL, YouTube channel ID, or image URL depending on type */
  src: string
  href: string
  /** Refresh seconds for still cams */
  refreshSec?: number
}

interface Group {
  title: string
  sub: string
  cams: Cam[]
  credit: { label: string; href: string }
}

const GROUPS: Group[] = [
  {
    title: 'Coromandel',
    sub: 'Direct landfall zone · RED warning',
    credit: { label: 'CoroLive', href: 'https://corolive.nz/' },
    cams: [
      {
        key: 'whitianga',
        name: 'Whitianga',
        sub: 'Buffalo Beach · live HLS',
        type: 'hls',
        src: 'https://api.corolive.nz/hls/whitianga_high.m3u8',
        href: 'https://corolive.nz/whitianga',
      },
      {
        key: 'whangamata',
        name: 'Whangamata',
        sub: 'East coast · live HLS',
        type: 'hls',
        src: 'https://api.corolive.nz/hls/whangamata_high.m3u8',
        href: 'https://corolive.nz/whangamata',
      },
      {
        key: 'thames',
        name: 'Thames',
        sub: 'Firth of Thames · live HLS',
        type: 'hls',
        src: 'https://api.corolive.nz/hls/thames_high.m3u8',
        href: 'https://corolive.nz/thames',
      },
    ],
  },
  {
    title: 'East Coast',
    sub: 'Wairarapa · Tararua · Hawke\u2019s Bay',
    credit: { label: 'Mixed sources', href: 'https://www.youtube.com/channel/UCGjGRtsWqkviebAvQlcC5Cg' },
    cams: [
      {
        key: 'castlepoint',
        name: 'Castlepoint Lighthouse',
        sub: 'Wairarapa · 24/7 live stream',
        type: 'youtube',
        src: 'UCGjGRtsWqkviebAvQlcC5Cg',
        href: 'https://www.youtube.com/@CastlepointLighthouse',
      },
      {
        key: 'akitio',
        name: 'Akitio Beach',
        sub: 'Tararua · Horizons RC',
        type: 'still',
        src: 'https://www.horizons.govt.nz/HRC/media/Data/WebCam/Akitio_latest_photo.jpg',
        href: 'https://www.horizons.govt.nz/',
        refreshSec: 60,
      },
      {
        key: 'napier',
        name: 'Napier',
        sub: 'Hawke\u2019s Bay',
        type: 'still',
        src: 'https://webcam.axford.org/napier.jpg',
        href: 'https://webcam.axford.org/',
        refreshSec: 30,
      },
    ],
  },
  {
    title: 'Central Plateau',
    sub: 'High-altitude weather proxy',
    credit: { label: 'NZTA / Waka Kotahi', href: 'https://www.journeys.nzta.govt.nz/' },
    cams: [
      {
        key: 'desertroad',
        name: 'Desert Road',
        sub: 'SH1 · Tongariro · cam 608',
        type: 'still',
        src: 'https://www.trafficnz.info/camera/608.jpg',
        href: 'https://www.journeys.nzta.govt.nz/',
        refreshSec: 30,
      },
    ],
  },
  {
    title: 'Wellington',
    sub: 'Southern North Island',
    credit: { label: 'Meteobridge', href: 'https://www.meteobridge.com/' },
    cams: [
      {
        key: 'riverstone',
        name: 'Riverstone',
        sub: 'Upper Hutt · fast refresh',
        type: 'still',
        src: 'https://content.meteobridge.com/cam/6f2277dda5e1cd6dd8c2b7f64eb2bb50/camplus.jpg',
        href: 'https://www.meteobridge.com/',
        refreshSec: 30,
      },
    ],
  },
]

function CamCard({ cam }: { cam: Cam }) {
  return (
    <div className="flex flex-col">
      {cam.type === 'hls' && (
        <LiveWebcam src={cam.src} name={cam.name} sub={cam.sub} />
      )}
      {cam.type === 'youtube' && (
        <YouTubeWebcam channelId={cam.src} name={cam.name} sub={cam.sub} />
      )}
      {cam.type === 'still' && (
        <StillWebcam
          src={cam.src}
          name={cam.name}
          sub={cam.sub}
          refreshSec={cam.refreshSec}
        />
      )}
      <a
        href={cam.href}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 text-[9px] font-mono uppercase tracking-wider text-white/35 hover:text-white/60 transition-colors self-end flex items-center gap-1"
      >
        Source
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    </div>
  )
}

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
              Live Webcams · Cyclone Track
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              8 cameras · Coromandel → East Coast → Central Plateau → Wellington
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-bold">
                  {group.title}
                </div>
                <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
                  {group.sub}
                </div>
              </div>
              <a
                href={group.credit.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-white/35 hover:text-white/70 transition-colors shrink-0"
              >
                {group.credit.label}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.cams.map((cam) => (
                <CamCard key={cam.key} cam={cam} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-5 pt-4 border-t border-white/5 text-[10px] text-white/40 leading-relaxed">
        Live video streams where available (CoroLive HLS, Castlepoint YouTube)
        and refreshing station snapshots everywhere else. Still cameras update
        every 30–60 seconds; if one stops advancing the operator may have
        paused the feed. All streams stop when you leave this tab.
      </p>
    </div>
  )
}
