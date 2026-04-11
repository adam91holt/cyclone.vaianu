// Scrape Northpower outages from their public page.
//
// Data flow: the page at https://northpower.nz/outages/ server-renders a JS
// variable `var outageGeometries = {...};` containing a GeoJSON-ish object
// with electricity + fibre outages (polygons + metadata). We extract it with
// a regex, parse the JSON, and normalise to our shared outage shape.
//
// Breakage surface: if Northpower changes the variable name or embeds the
// data differently (e.g. via fetch) this adapter returns ok:false and the
// orchestrator will mark existing Northpower rows as cleared. That's the
// least-bad fallback — the map will empty out, which is an obvious signal
// that ingestion is broken.

const SOURCE_URL = 'https://northpower.nz/outages/'
const REGION = 'Northland'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'northpower'
  incident_id: string
  service: 'electricity' | 'fibre'
  status: 'unplanned' | 'planned'
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

interface NpOutage {
  id?: string
  title?: string
  cause?: string
  startTime?: string
  editTime?: string
  restorationTime?: string
  notes?: string
  customerCount?: string | number
  localities?: string[]
  equipment?: string
}

interface NpFeature {
  type: 'Feature'
  properties?: { outages?: NpOutage[] }
  geometry?: { type: string; coordinates: unknown }
}

interface NpEnvelope {
  data?: {
    meta?: { electricityOutageCount?: number; fibreOutageCount?: number }
    geometries?: {
      electricity?: Record<string, NpFeature>
      fibre?: Record<string, NpFeature>
    }
  }
}

function centroidOfPolygon(
  coords: number[][][],
): { lat: number; lon: number } | null {
  const ring = coords?.[0]
  if (!ring?.length) return null
  let lat = 0
  let lon = 0
  let n = 0
  for (const [x, y] of ring) {
    if (typeof x === 'number' && typeof y === 'number') {
      lon += x
      lat += y
      n += 1
    }
  }
  return n > 0 ? { lat: lat / n, lon: lon / n } : null
}

function parseCustomerCount(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normaliseFeatures(
  features: Record<string, NpFeature> | undefined,
  service: 'electricity' | 'fibre',
): NormalisedOutage[] {
  if (!features) return []
  const out: NormalisedOutage[] = []
  for (const feat of Object.values(features)) {
    const outages = feat?.properties?.outages ?? []
    const geom = feat?.geometry
    const centroid =
      geom && geom.type === 'Polygon'
        ? centroidOfPolygon(geom.coordinates as number[][][])
        : null
    for (const o of outages) {
      if (!o.title) continue
      out.push({
        provider: 'northpower',
        incident_id: o.title,
        service,
        status: 'unplanned',
        title: o.title,
        cause: o.cause ?? null,
        start_time: o.startTime ?? null,
        end_time: null,
        restoration_hint: o.restorationTime ?? null,
        notes: o.notes ?? null,
        customer_count: parseCustomerCount(o.customerCount),
        localities: Array.isArray(o.localities) ? o.localities : [],
        equipment: o.equipment ?? null,
        region: REGION,
        geometry: geom ?? null,
        centroid_lat: centroid?.lat ?? null,
        centroid_lon: centroid?.lon ?? null,
      })
    }
  }
  return out
}

async function fetchNorthpowerOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; vaianu.live/1.0; +https://vaianu.live)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) {
    throw new Error(`Northpower HTTP ${res.status}`)
  }
  const html = await res.text()

  // Match `var outageGeometries = { ... };`. The value is a single JSON
  // object literal on one line terminated by `;`. We use non-greedy so we
  // stop at the first terminating `;`.
  const match = html.match(/var\s+outageGeometries\s*=\s*(\{.*?\});/s)
  if (!match) {
    throw new Error('outageGeometries variable not found in HTML')
  }
  let envelope: NpEnvelope
  try {
    envelope = JSON.parse(match[1])
  } catch (e) {
    throw new Error(`Failed to parse outageGeometries JSON: ${(e as Error).message}`)
  }

  const electricity = normaliseFeatures(
    envelope.data?.geometries?.electricity,
    'electricity',
  )
  const fibre = normaliseFeatures(envelope.data?.geometries?.fibre, 'fibre')
  return [...electricity, ...fibre]
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  try {
    const outages = await fetchNorthpowerOutages()
    return jsonResponse({
      ok: true,
      provider: 'northpower',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('northpower ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'northpower',
      count: 0,
      error: (e as Error).message,
    })
  }
})
