// Vector (Auckland) outage ingester.
//
// Vector's direct API key (embedded in their public config.js) is rejected
// server-side. We route via cyclone-api.thecolab.ai which returns a
// standard GeoJSON FeatureCollection.
//
// Response shape:
//   {
//     provider: 'vector',
//     type: 'FeatureCollection',
//     features: Array<{
//       type: 'Feature',
//       geometry: { type: 'Polygon' | 'MultiPolygon', coordinates: ... },
//       properties: {
//         outageType: 'Unplanned' | 'Planned',
//         switchingProposalNumbers?: string,
//       },
//     }>
//   }
//
// Vector's feed is thin — no customer count, no start/end time, no cause,
// no address. We store what's there (geometry, outage type) and leave the
// missing fields null. Incident ID is derived from a SHA-1 of the geometry
// bounding box so it's stable as long as the affected area doesn't move.

const SOURCE_URL =
  'https://cyclone-api.thecolab.ai/outages?provider=vector'
const REGION = 'Auckland'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'vector'
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

interface VectorFeature {
  type: 'Feature'
  geometry: GeometryInput | null
  properties?: {
    outageType?: string
    switchingProposalNumbers?: string
  }
}

type GeometryInput =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

interface VectorEnvelope {
  provider?: string
  type?: string
  features?: VectorFeature[]
}

// Walk every [lon, lat] pair in a Polygon or MultiPolygon and call cb.
function forEachCoord(
  geom: GeometryInput,
  cb: (lon: number, lat: number) => void,
) {
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      for (const [lon, lat] of ring) cb(lon, lat)
    }
  } else {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        for (const [lon, lat] of ring) cb(lon, lat)
      }
    }
  }
}

interface Bbox {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

function bbox(geom: GeometryInput): Bbox | null {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  let any = false
  forEachCoord(geom, (lon, lat) => {
    any = true
    if (lon < minLon) minLon = lon
    if (lat < minLat) minLat = lat
    if (lon > maxLon) maxLon = lon
    if (lat > maxLat) maxLat = lat
  })
  if (!any) return null
  return { minLon, minLat, maxLon, maxLat }
}

// Cheap stable id from rounded bounding box — ~10m resolution at 4dp.
// Lon,lat rounding means a polygon that shifts by a metre stays the same
// id across pulls, which is what we want for upsert dedupe & clearing.
async function idFromGeometry(geom: GeometryInput): Promise<string> {
  const b = bbox(geom)
  if (!b) return ''
  const key = [
    geom.type,
    b.minLon.toFixed(4),
    b.minLat.toFixed(4),
    b.maxLon.toFixed(4),
    b.maxLat.toFixed(4),
  ].join('|')
  const buf = new TextEncoder().encode(key)
  const hash = await crypto.subtle.digest('SHA-1', buf)
  const hex = Array.from(new Uint8Array(hash))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `vector-${hex}`
}

async function normalise(
  f: VectorFeature,
): Promise<NormalisedOutage | null> {
  if (!f.geometry) return null
  if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') {
    return null
  }
  const type = (f.properties?.outageType || '').toLowerCase()
  // We only surface unplanned — matches the rest of the pipeline and the
  // frontend filter. Planned outages are dropped.
  if (type !== 'unplanned') return null

  const id = await idFromGeometry(f.geometry)
  if (!id) return null
  const b = bbox(f.geometry)
  const centroid_lat =
    b != null ? (b.minLat + b.maxLat) / 2 : null
  const centroid_lon =
    b != null ? (b.minLon + b.maxLon) / 2 : null

  return {
    provider: 'vector',
    incident_id: id,
    service: 'electricity',
    status: 'unplanned',
    title: 'Unplanned outage',
    cause: null,
    start_time: null,
    end_time: null,
    restoration_hint: null,
    notes: null,
    customer_count: null,
    localities: [],
    equipment: null,
    region: REGION,
    geometry: f.geometry,
    centroid_lat,
    centroid_lon,
  }
}

async function fetchVectorOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Vector proxy HTTP ${res.status}: ${body.slice(0, 200)}`,
    )
  }
  const json = (await res.json()) as VectorEnvelope
  const features = json.features ?? []
  const out: NormalisedOutage[] = []
  for (const f of features) {
    const n = await normalise(f)
    if (n) out.push(n)
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
    const outages = await fetchVectorOutages()
    return jsonResponse({
      ok: true,
      provider: 'vector',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('vector ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'vector',
      count: 0,
      error: (e as Error).message,
    })
  }
})
