// Counties Energy (South Auckland) outage ingester.
//
// Counties' direct API (api.integration.countiesenergy.co.nz) sits behind
// AWS WAF Bot Control that fingerprints the TLS ClientHello — Deno's rustls
// stack gets 403'd no matter which headers / residential proxy we route
// through. We now go via a thin proxy on cyclone-api.thecolab.ai that
// handles the bypass and returns the same envelope Counties' own SPA gets.
//
// Response shape (service_orders only — planned_outages is stripped):
//   {
//     service_orders: Array<{
//       no, lat, lng, address, description, customersAffected,
//       serviceOrderDateTime, etrDateTime: { start, end }, estimatedRestoration,
//       hull: Array<{lat,lng}>, isEntireFeeder, crewStatus, status, ...
//     }>
//   }

const SOURCE_URL =
  'https://cyclone-api.thecolab.ai/outages?provider=counties'
const REGION = 'South Auckland'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'counties'
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

interface HullPoint {
  lat?: number
  lng?: number
}

interface CeServiceOrder {
  no?: string | number
  lat?: number
  lng?: number
  address?: string
  description?: string
  serviceType?: string
  status?: string
  crewStatus?: string
  comments?: string
  customersAffected?: number
  serviceOrderDateTime?: string
  estimatedRestoration?: string
  etrTime?: string
  etrDateTime?: { start?: string; end?: string } | null
  hull?: HullPoint[]
  isEntireFeeder?: boolean
  feederCode?: string
  lastModified?: string
}

interface CeEnvelope {
  service_orders?: CeServiceOrder[]
}

function parseCount(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function parseIso(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// Convert a hull of {lat, lng} points into a GeoJSON Polygon ring.
// Counties' hull is not necessarily closed — we close it defensively.
function hullToPolygon(
  hull: HullPoint[] | undefined,
): GeoJSON.Polygon | null {
  if (!hull || hull.length < 3) return null
  const ring: [number, number][] = []
  for (const p of hull) {
    if (typeof p.lat === 'number' && typeof p.lng === 'number') {
      ring.push([p.lng, p.lat])
    }
  }
  if (ring.length < 3) return null
  const [fx, fy] = ring[0]
  const [lx, ly] = ring[ring.length - 1]
  if (fx !== lx || fy !== ly) ring.push([fx, fy])
  return { type: 'Polygon', coordinates: [ring] }
}

function normalise(o: CeServiceOrder): NormalisedOutage | null {
  const id = o.no != null ? String(o.no) : null
  if (!id) return null

  const lat = typeof o.lat === 'number' ? o.lat : null
  const lon = typeof o.lng === 'number' ? o.lng : null
  const polygon = hullToPolygon(o.hull)
  const geometry: unknown =
    polygon ?? (lat != null && lon != null
      ? { type: 'Point', coordinates: [lon, lat] }
      : null)

  const localities = o.address
    ? [o.address.trim()].filter((s) => s.length > 0)
    : []

  return {
    provider: 'counties',
    incident_id: id,
    service: 'electricity',
    status: 'unplanned',
    title: o.description || `Service order ${id}`,
    cause: o.description || null,
    start_time: parseIso(o.serviceOrderDateTime),
    end_time: parseIso(o.etrDateTime?.end) ?? parseIso(o.etrDateTime?.start),
    restoration_hint:
      o.etrTime || o.estimatedRestoration || o.crewStatus || null,
    notes: o.crewStatus || null,
    customer_count: parseCount(o.customersAffected),
    localities,
    equipment: o.feederCode || null,
    region: REGION,
    geometry,
    centroid_lat: lat,
    centroid_lon: lon,
  }
}

async function fetchCountiesOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `CountiesEnergy proxy HTTP ${res.status}: ${body.slice(0, 200)}`,
    )
  }
  const json = (await res.json()) as CeEnvelope
  const orders = json.service_orders ?? []
  const out: NormalisedOutage[] = []
  for (const o of orders) {
    const n = normalise(o)
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
    const outages = await fetchCountiesOutages()
    return jsonResponse({
      ok: true,
      provider: 'counties',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('counties ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'counties',
      count: 0,
      error: (e as Error).message,
    })
  }
})
