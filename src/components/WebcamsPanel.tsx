import { Video, ExternalLink } from 'lucide-react'
import { LiveWebcam } from '@/components/LiveWebcam'
import { StillWebcam } from '@/components/StillWebcam'

type CamType = 'hls' | 'still'

interface Cam {
  key: string
  name: string
  sub: string
  type: CamType
  src: string
  href: string
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
    title: 'NIWA Cam-Era',
    sub: 'Coastal monitoring · refreshing stills',
    credit: { label: 'NIWA / Earth Sciences NZ', href: 'https://niwa.co.nz/our-services/online-services/cam-era' },
    cams: [
      {
        key: 'pauanui_n',
        name: 'Pauanui North',
        sub: 'Coromandel east coast',
        type: 'still',
        src: 'https://camerastorageoflalbwn.blob.core.windows.net/$web/PauanuiNorth/latest.jpg',
        href: 'https://niwa.co.nz/our-services/online-services/cam-era/pauanui',
        refreshSec: 120,
      },
      {
        key: 'pauanui_s',
        name: 'Pauanui South',
        sub: 'Coromandel east coast',
        type: 'still',
        src: 'https://camerastorageoflalbwn.blob.core.windows.net/$web/PauanuiSouth/latest.jpg',
        href: 'https://niwa.co.nz/our-services/online-services/cam-era/pauanui',
        refreshSec: 120,
      },
      {
        key: 'tairua',
        name: 'Tairua',
        sub: 'Coromandel east coast',
        type: 'still',
        src: 'https://camerastorageoflalbwn.blob.core.windows.net/$web/TairuaWeb/latest.jpg',
        href: 'https://niwa.co.nz/our-services/online-services/cam-era/tairua',
        refreshSec: 120,
      },
      {
        key: 'raglan_a',
        name: 'Raglan A',
        sub: 'Waikato west coast',
        type: 'still',
        src: 'https://camerastorageoflalbwn.blob.core.windows.net/$web/RaglanWebA/latest.jpg',
        href: 'https://niwa.co.nz/our-services/online-services/cam-era/raglan',
        refreshSec: 120,
      },
      {
        key: 'raglan_b',
        name: 'Raglan B',
        sub: 'Waikato west coast',
        type: 'still',
        src: 'https://camerastorageoflalbwn.blob.core.windows.net/$web/RaglanWebB/latest.jpg',
        href: 'https://niwa.co.nz/our-services/online-services/cam-era/raglan',
        refreshSec: 120,
      },
    ],
  },
  {
    title: 'Northland',
    sub: 'Bream Bay · RED warning',
    credit: { label: 'surf.co.nz', href: 'https://surf.co.nz/' },
    cams: [
      {
        key: 'ruakaka',
        name: 'Ruakaka',
        sub: 'Bream Bay · surf cam',
        type: 'still',
        src: 'https://surf.co.nz/cams/ruakaka/current.jpg',
        href: 'https://surf.co.nz/webcams/northland/ruakaka/',
        refreshSec: 60,
      },
    ],
  },
]

function CamCard({ cam }: { cam: Cam }) {
  return (
    <div className="flex flex-col">
      {cam.type === 'hls' ? (
        <LiveWebcam src={cam.src} name={cam.name} sub={cam.sub} />
      ) : (
        <StillWebcam src={cam.src} name={cam.name} sub={cam.sub} refreshSec={cam.refreshSec} />
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
              Live Webcams · Cyclone Impact Zone
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Live HLS streams + refreshing still images
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
        HLS streams play live via hls.js. NIWA and surf.co.nz still images refresh
        every 1-2 minutes; if a camera shows a stale timestamp the operator may be
        paused. Public webcam coverage in Northland is limited — most flood cams
        there are gated behind third-party players.
      </p>
    </div>
  )
}
