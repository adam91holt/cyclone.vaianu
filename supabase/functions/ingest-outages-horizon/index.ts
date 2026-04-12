// Horizon Networks (Bay of Plenty / Eastern BoP) outage ingester.
//
// Feed routed through thecolab.ai:
//   GET https://cyclone-api.thecolab.ai/outages?provider=horizon
//
// Response shape:
//   {
//     provider: 'horizon',
//     cases: Array<{
//       SERIAL: number                    stable id
//       DESC: string                      feeder name / title
//       PLANNED: 0 | 1                    0 = unplanned
//       CASESTAT / WORKSTAT / TYPE: int   status codes (unused)
//       AVGLAT / AVGLONG: string          centroid, stringified numeric
//       OUTTIME: string                   "DD-MM-YYYY H:MM am/pm" (Pacific/Auckland)
//       INITCUST / CURCUST: number        initial / current affected customers
//       RESTORETIM: string                ETA (usually empty)
//       DESC_CAUSE: string                "Weather Related Damage" etc
//       COORDCOUNT: number                count of lat,lon pairs in COORDLIST
//       COORDLIST: string                 "lat,lon,lat,lon,..." — a polygon ring
//       PUBLICMSG: string                 notes shown to customers
//     }>
//   }
//
// COORDLIST is (lat, lon) pairs, NOT GeoJSON's (lon, lat) — we flip when
// building the Polygon geometry. We only surface unplanned outages.

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/outages?provider=horizon'
const REGION = 'Bay of Plenty'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'horizon'
  incident_id: string
  service: 'electricity'
  status: 'unplanned'
  title: string | null
  cause: string | null
  start_time: string | null
  end_time: string | null
  restoration_hint: string | null
  notes: string | null
  customer_count: number | null
  localities: string[]
  equipment: string | null
  region: string
  geometry: unknown
  centroid_lat: number | null
  centroid_lon: number | null
}

interface HorizonCase {
  SERIAL?: number | string
  DESC?: string | null
  PLANNED?: number | null
  AVGLAT?: string | number | null
  AVGLONG?: string | number | null
  OUTTIME?: string | null
  INITCUST?: number | null
  CURCUST?: number | null
  RESTORETIM?: string | null
  DESC_CAUSE?: string | null
  COORDLIST?: string | null
  PUBLICMSG?: string | null
}

interface HorizonEnvelope {
  provider?: string
  cases?: HorizonCase[]
}

// Parse "DD-MM-YYYY H:MM am/pm" (Pacific/Auckland) → ISO UTC.
// Horizon reports in local time with no tz; we assume NZ and emit UTC so the
// rest of the pipeline can compare it cleanly.
function parseHorizonTime(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Example: "12-04-2026 12:06 pm"
  const match = trimmed.match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)?$/i,
  )
  if (!match) return null
  const [, dd, mm, yyyy, hh, mi, ampm] = match
  let hour = parseInt(hh, 10)
  const minute = parseInt(mi, 10)
  if (ampm) {
    const isPm = ampm.toLowerCase() === 'pm'
    if (isPm && hour < 12) hour += 12
    if (!isPm && hour === 12) hour = 0
  }
  // NZST is UTC+12, NZDT is UTC+13. April 12 2026 is NZST (winter, -12h UTC).
  // Good enough: use +12 — the UI renders in Pacific/Auckland anyway.
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+12:00`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// Parse "lat,lon,lat,lon,..." → GeoJSON Polygon coordinates (ring of [lon,lat]).
function parseCoordList(raw: string | null | undefined): number[][] | null {
  if (!raw) return null
  const parts = raw.split(',').map((p) => p.trim())
  if (parts.length < 6 || parts.length % 2 !== 0) return null
  const ring: number[][] = []
  for (let i = 0; i < parts.length; i += 2) {
    const lat = Number(parts[i])
    const lon = Number(parts[i + 1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    ring.push([lon, lat])
  }
  if (ring.length < 3) return null
  // Close the ring if needed (GeoJSON requires first === last).
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]])
  }
  return ring
}

function normalise(c: HorizonCase): NormalisedOutage | null {
  if (c.PLANNED !== 0) return null // unplanned only

  const serial = c.SERIAL
  if (serial === undefined || serial === null) return null
  const incident_id = `horizon-${serial}`

  const title = (c.DESC || '').trim() || 'Unplanned outage'
  const cause = (c.DESC_CAUSE || '').trim() || null
  const notes = (c.PUBLICMSG || '').trim() || null
  const customer_count =
    typeof c.CURCUST === 'number'
      ? c.CURCUST
      : typeof c.INITCUST === 'number'
        ? c.INITCUST
        : null

  const centroid_lat =
    c.AVGLAT !== undefined && c.AVGLAT !== null && c.AVGLAT !== ''
      ? Number(c.AVGLAT)
      : null
  const centroid_lon =
    c.AVGLONG !== undefined && c.AVGLONG !== null && c.AVGLONG !== ''
      ? Number(c.AVGLONG)
      : null

  const ring = parseCoordList(c.COORDLIST)
  const geometry = ring ? { type: 'Polygon', coordinates: [ring] } : null

  const start_time = parseHorizonTime(c.OUTTIME)
  const restoration_hint = (c.RESTORETIM || '').trim() || null

  return {
    provider: 'horizon',
    incident_id,
    service: 'electricity',
    status: 'unplanned',
    title,
    cause,
    start_time,
    end_time: null,
    restoration_hint,
    notes,
    customer_count,
    localities: [],
    equipment: null,
    region: REGION,
    geometry,
    centroid_lat:
      centroid_lat !== null && Number.isFinite(centroid_lat)
        ? centroid_lat
        : null,
    centroid_lon:
      centroid_lon !== null && Number.isFinite(centroid_lon)
        ? centroid_lon
        : null,
  }
}

async function fetchHorizonOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Horizon proxy HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as HorizonEnvelope
  const cases = json.cases ?? []
  // Horizon sometimes returns the same SERIAL twice (separate polygon rings
  // for the same incident). De-dupe by incident_id, keeping the first seen.
  const seen = new Set<string>()
  const out: NormalisedOutage[] = []
  for (const c of cases) {
    const n = normalise(c)
    if (!n) continue
    if (seen.has(n.incident_id)) continue
    seen.add(n.incident_id)
    out.push(n)
  }
  return out
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  try {
    const outages = await fetchHorizonOutages()
    return jsonResponse({
      ok: true,
      provider: 'horizon',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('horizon ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'horizon',
      count: 0,
      error: (e as Error).message,
    })
  }
})
