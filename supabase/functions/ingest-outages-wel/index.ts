// WEL Networks outage ingester.
//
// Data flow: WEL's outage map (outages.wel.co.nz) POSTs to
// https://server.ourpower.co.nz/api/?FETCH_GROUPED_FAULTS with a tiny JSON
// body. Response is a rich structure with "groupedFaults": each has a closed
// polygon ring (geometry: [{lat, lng}, ...]) and one or more "incidents"
// (reference, reason, start/end, propertiesAffected).
//
// faultType 1 seems to be planned and 0 unplanned, but WEL don't document
// this. We infer status from whether `powerOff` is set: `powerOff != null`
// means customers are currently off (unplanned fault in progress).

const SOURCE_URL = 'https://server.ourpower.co.nz/api/?FETCH_GROUPED_FAULTS'
const REGION = 'Waikato'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'wel'
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

interface WelIncident {
  incidentReference?: string
  start?: string
  end?: string
  reason?: string
  powerOff?: string | null
  street?: string
  suburb?: string
  status?: number
  faultType?: number
  propertiesAffected?: number
}

interface WelGroupedFault {
  geometry?: Array<{ lat: number; lng: number }>
  lat?: number
  lng?: number
  incidents?: WelIncident[]
}

interface WelEnvelope {
  payload?: {
    groupedFaults?: WelGroupedFault[]
  }
}

// NZST is UTC+12 or UTC+13 (DST). WEL timestamps come without timezone; we
// assume they're already in NZ local time. April 11 2026 is within NZDT
// (+13:00, ended 5 April) → actually NZST (+12:00) kicks in first Sunday of
// April. April 5 2026 is the first Sunday, so by April 11 we're on NZST.
// We add +12:00 to the naive string to make it a valid ISO UTC.
function toIsoNzst(naive?: string | null): string | null {
  if (!naive) return null
  // "2026-04-15T09:00:00" → "2026-04-15T09:00:00+12:00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(naive)) {
    return `${naive}+12:00`
  }
  // Already has a tz offset — trust it.
  return naive
}

function centroidOfPoints(
  points: Array<{ lat: number; lng: number }>,
): { lat: number; lon: number } | null {
  if (!points?.length) return null
  let lat = 0
  let lon = 0
  for (const p of points) {
    lat += p.lat
    lon += p.lng
  }
  return { lat: lat / points.length, lon: lon / points.length }
}

function toGeoJsonPolygon(
  points: Array<{ lat: number; lng: number }>,
): unknown | null {
  if (!points?.length || points.length < 3) return null
  // GeoJSON: [lon, lat] order, outer ring must be closed.
  const ring = points.map((p) => [p.lng, p.lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first)
  }
  return { type: 'Polygon', coordinates: [ring] }
}

function inferStatus(inc: WelIncident): 'unplanned' | 'planned' {
  // If customers are currently off, treat as unplanned (live fault).
  // Otherwise if faultType is 1 (our observation: planned/maintenance) → planned.
  if (inc.powerOff) return 'unplanned'
  if (inc.faultType === 1) return 'planned'
  return 'unplanned'
}

async function fetchWelOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (compatible; vaianu.live/1.0; +https://vaianu.live)',
    },
    body: JSON.stringify({
      application: 'outages',
      emit: true,
      type: 'FETCH_GROUPED_FAULTS',
    }),
  })
  if (!res.ok) {
    throw new Error(`WEL HTTP ${res.status}`)
  }
  const json = (await res.json()) as WelEnvelope
  const groups = json?.payload?.groupedFaults ?? []

  const out: NormalisedOutage[] = []
  for (const g of groups) {
    const geometry = toGeoJsonPolygon(g.geometry ?? [])
    const centroid =
      g.lat != null && g.lng != null
        ? { lat: g.lat, lon: g.lng }
        : centroidOfPoints(g.geometry ?? [])
    const incidents = g.incidents ?? []
    for (const inc of incidents) {
      if (!inc.incidentReference) continue
      const localities = [inc.suburb, inc.street]
        .filter((s): s is string => !!s && s.trim().length > 0)
      out.push({
        provider: 'wel',
        incident_id: inc.incidentReference,
        service: 'electricity',
        status: inferStatus(inc),
        title: inc.incidentReference,
        cause: inc.reason ?? null,
        start_time: toIsoNzst(inc.start ?? null),
        end_time: toIsoNzst(inc.end ?? null),
        restoration_hint: inc.end ? `Planned end ${inc.end}` : null,
        notes: null,
        customer_count: inc.propertiesAffected ?? null,
        localities,
        equipment: null,
        region: REGION,
        geometry,
        centroid_lat: centroid?.lat ?? null,
        centroid_lon: centroid?.lon ?? null,
      })
    }
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
    const outages = await fetchWelOutages()
    return jsonResponse({
      ok: true,
      provider: 'wel',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('wel ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'wel',
      count: 0,
      error: (e as Error).message,
    })
  }
})
