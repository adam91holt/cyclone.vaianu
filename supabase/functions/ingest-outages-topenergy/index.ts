// Top Energy (Far North) outage ingester.
//
// Top Energy's outage centre serves a JSON endpoint at
// https://outages.topenergy.co.nz/api/outages/regions that returns:
//   { customersCurrentlyOff, activeOutageCount, active: [...], planned: [...] }
//
// CRITICAL limitation: the response contains NO geometry — only a circuitName
// (e.g. "Totara North", "Herekino"). We can't draw polygons, but we can still
// surface the data as points anchored to a Far North centroid, with the
// circuit name in the popup. Users looking at the map will see "dots near
// the Far North = Top Energy planned work" and can click for detail.
//
// Times come as human strings like "14th April 09:30 am" — we parse them
// against the current NZ year + assume NZST.

const SOURCE_URL = 'https://outages.topenergy.co.nz/api/outages/regions'
const REGION = 'Far North'
const FAR_NORTH_CENTROID = { lat: -35.1, lon: 173.7 } // rough centre of Top Energy's patch

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'topenergy'
  incident_id: string
  service: 'electricity'
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

interface TeOutage {
  type?: 'planned' | 'unplanned'
  name?: string
  startTimestamp?: number
  endTimestamp?: number
  isActive?: boolean
  circuitName?: string
  customersCurrentlyOff?: string | number
  startDateTime?: string
  endDateTime?: string
  additionalInformation?: string
}

interface TeEnvelope {
  customersCurrentlyOff?: number
  activeOutageCount?: number
  active?: TeOutage[]
  planned?: TeOutage[]
}

function parseCustomerCount(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Deterministically jitter points around the region centroid so 10 outages
 * don't all stack on a single pixel. Uses a hash of the incident ID to keep
 * positions stable across ingestion runs.
 */
function jitteredCentroid(incidentId: string): {
  lat: number
  lon: number
} {
  let h = 0
  for (let i = 0; i < incidentId.length; i += 1) {
    h = (h * 31 + incidentId.charCodeAt(i)) | 0
  }
  // Spread across ~0.25° box (~20km) around the centroid
  const dx = ((h & 0xffff) / 0xffff - 0.5) * 0.25
  const dy = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.15
  return {
    lat: FAR_NORTH_CENTROID.lat + dy,
    lon: FAR_NORTH_CENTROID.lon + dx,
  }
}

function toGeoJsonPoint(lat: number, lon: number): unknown {
  return { type: 'Point', coordinates: [lon, lat] }
}

/**
 * Convert Top Energy's Unix timestamp (seconds) to ISO UTC. Their
 * startTimestamp appears to be already in seconds since epoch in UTC.
 */
function tsToIso(ts?: number | null): string | null {
  if (!ts) return null
  try {
    return new Date(ts * 1000).toISOString()
  } catch {
    return null
  }
}

function normaliseOutage(
  o: TeOutage,
  forcedStatus: 'unplanned' | 'planned',
): NormalisedOutage | null {
  const id = o.name
  if (!id) return null
  const { lat, lon } = jitteredCentroid(id)
  return {
    provider: 'topenergy',
    incident_id: id,
    service: 'electricity',
    status: forcedStatus,
    title: id,
    cause: o.additionalInformation || null,
    start_time: tsToIso(o.startTimestamp),
    end_time: tsToIso(o.endTimestamp),
    restoration_hint: o.endDateTime || null,
    notes: o.additionalInformation || null,
    customer_count: parseCustomerCount(o.customersCurrentlyOff),
    localities: o.circuitName ? [o.circuitName] : [],
    equipment: null,
    region: REGION,
    geometry: toGeoJsonPoint(lat, lon),
    centroid_lat: lat,
    centroid_lon: lon,
  }
}

async function fetchTopEnergyOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; vaianu.live/1.0; +https://vaianu.live)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error(`TopEnergy HTTP ${res.status}`)
  }
  const json = (await res.json()) as TeEnvelope
  const out: NormalisedOutage[] = []
  for (const o of json.active ?? []) {
    const n = normaliseOutage(o, 'unplanned')
    if (n) out.push(n)
  }
  for (const o of json.planned ?? []) {
    const n = normaliseOutage(o, 'planned')
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
    const outages = await fetchTopEnergyOutages()
    return jsonResponse({
      ok: true,
      provider: 'topenergy',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('topenergy ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'topenergy',
      count: 0,
      error: (e as Error).message,
    })
  }
})
