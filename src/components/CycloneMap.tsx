import { useState } from 'react'

type WindyOverlay = 'wind' | 'rain' | 'pressure' | 'waves' | 'radar'

const OVERLAYS: Array<{ key: WindyOverlay; label: string }> = [
  { key: 'wind', label: 'Wind' },
  { key: 'rain', label: 'Rain' },
  { key: 'pressure', label: 'Pressure' },
  { key: 'waves', label: 'Waves' },
  { key: 'radar', label: 'Radar' },
]

// Centered on the North Island cyclone impact zone, tight enough to show
// the cyclone approaching from the north and the whole impact coastline.
function buildSrc(overlay: WindyOverlay) {
  const params = new URLSearchParams({
    lat: '-37.2',
    lon: '175.5',
    detailLat: '-36.85',
    detailLon: '174.76',
    zoom: '6',
    level: 'surface',
    overlay: overlay === 'radar' ? 'radar' : overlay,
    product: 'ecmwf',
    menu: '',
    message: 'true',
    marker: 'true',
    calendar: 'now',
    pressure: overlay === 'pressure' ? 'true' : '',
    type: 'map',
    location: 'coordinates',
    detail: 'true',
    metricWind: 'km/h',
    metricTemp: '°C',
    radarRange: '-1',
  })
  return `https://embed.windy.com/embed2.html?${params.toString()}`
}

export function CycloneMap() {
  const [overlay, setOverlay] = useState<WindyOverlay>('wind')

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Live Weather Map
          </div>
          <div className="text-[9px] uppercase tracking-wider text-white/30 font-mono">
            · ECMWF · Windy.com
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider">
          {OVERLAYS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setOverlay(key)}
              className={`px-2.5 py-1 rounded transition-colors ${
                overlay === key
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-md border border-white/5 min-h-[540px] h-[60vh]">
        <iframe
          key={overlay}
          title={`Windy ${overlay}`}
          src={buildSrc(overlay)}
          className="absolute inset-0 w-full h-full border-0 bg-[#0a0f1c]"
          allow="fullscreen"
        />
        <div className="absolute bottom-2 left-2 bg-black/75 border border-white/10 rounded px-2 py-1 text-[9px] font-mono text-white/60 uppercase tracking-wider pointer-events-none">
          Live · {overlay}
        </div>
      </div>
    </div>
  )
}
