// Unison Networks (Hawke's Bay / Taupo / Rotorua) outage ingester.
//
// Feed routed through thecolab.ai:
//   GET https://cyclone-api.thecolab.ai/outages?provider=unison
//
// Unison's upstream is notoriously flaky — the proxy often returns
// `{"provider":"unison","data":null}` (meaning "no active outages") or
// times out with a Cloudflare 524. We treat both as ok:true with count 0
// so a transient failure doesn't wipe in-flight incidents from the DB
// (the orchestrator only clears rows for providers that report ok:true
// AND a fresh row set).
//
// When data is non-null we accept a handful of shapes permissively:
//   - an array of outage objects
//   - an object with `outages` / `incidents` / `features` keys wrapping such
//   - a GeoJSON FeatureCollection
//
// Each incident is expected to expose at least an id and either a centroid
// (lat/lng) or a polygon geometry. Anything we can't interpret is dropped.

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/outages?provider=unison'
const REGION = "Hawke's Bay"

// Fallback centroid for the Unison service area (Napier) — used only when
// an incident lands without any usable coordinates so the marker still
// shows up on the map rather than being silently dropped.
const REGION_CENTROID = { lat: -39.4928, lon: 176.9120 }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'unison'
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

// Permissive record type — we walk it by hand.
type Loose = Record<string, unknown>

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

// Dig through the common keys an outage record might use for coordinates.
function readCentroid(
  o: Loose,
): { lat: number | null; lon: number | null } {
  const lat =
    asNumber(o.lat) ??
    asNumber(o.latitude) ??
    asNumber(o.centroid_lat) ??
    asNumber((o.location as Loose | undefined)?.lat) ??
    null
  const lon =
    asNumber(o.lng) ??
    asNumber(o.lon) ??
    asNumber(o.long) ??
    asNumber(o.longitude) ??
    asNumber(o.centroid_lon) ??
    asNumber((o.location as Loose | undefined)?.lng) ??
    asNumber((o.location as Loose | undefined)?.lon) ??
    null
  return { lat, lon }
}

function normalise(raw: Loose, idx: number): NormalisedOutage | null {
  const id =
    asString(raw.id) ??
    asString(raw.incident_id) ??
    asString(raw.incidentId) ??
    asString(raw.reference) ??
    asString(raw.number) ??
    `idx-${idx}`
  const incident_id = `unison-${id}`

  const title =
    asString(raw.title) ??
    asString(raw.name) ??
    asString(raw.suburb) ??
    asString(raw.area) ??
    'Unplanned outage'

  const cause = asString(raw.cause) ?? asString(raw.reason) ?? null
  const customer_count =
    asNumber(raw.customer_count) ??
    asNumber(raw.customersAffected) ??
    asNumber(raw.customers) ??
    asNumber(raw.affected) ??
    null

  const { lat, lon } = readCentroid(raw)

  const geometry =
    raw.geometry && typeof raw.geometry === 'object' ? raw.geometry : null

  // If we have neither geometry nor centroid, fall back to the Napier
  // region centroid so the marker shows up somewhere sensible.
  const centroid_lat = lat ?? (geometry ? null : REGION_CENTROID.lat)
  const centroid_lon = lon ?? (geometry ? null : REGION_CENTROID.lon)

  const start_time = asString(raw.start_time) ?? asString(raw.startTime) ?? null
  const end_time = asString(raw.end_time) ?? asString(raw.endTime) ?? null

  return {
    provider: 'unison',
    incident_id,
    service: 'electricity',
    status: 'unplanned',
    title,
    cause,
    start_time,
    end_time,
    restoration_hint: asString(raw.restoration_hint) ?? null,
    notes: asString(raw.notes) ?? asString(raw.description) ?? null,
    customer_count,
    localities: [],
    equipment: null,
    region: REGION,
    geometry,
    centroid_lat,
    centroid_lon,
  }
}

// Unwrap whatever the proxy ships into a flat array of outage records.
function extractOutageList(data: unknown): Loose[] {
  if (data === null || data === undefined) return []
  if (Array.isArray(data)) return data as Loose[]
  if (typeof data === 'object') {
    const obj = data as Loose
    // GeoJSON FeatureCollection
    if (Array.isArray(obj.features)) {
      return (obj.features as Loose[]).map((f) => {
        const props = (f.properties as Loose | undefined) ?? {}
        return { ...props, geometry: f.geometry }
      })
    }
    if (Array.isArray(obj.outages)) return obj.outages as Loose[]
    if (Array.isArray(obj.incidents)) return obj.incidents as Loose[]
    if (Array.isArray(obj.items)) return obj.items as Loose[]
  }
  return []
}

async function fetchUnisonOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
    // Unison's upstream is slow; cap the wait so we don't hold the whole
    // orchestrator up on a 30s timeout.
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Unison proxy HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json().catch(() => ({}))) as {
    provider?: string
    data?: unknown
  }
  const items = extractOutageList(json.data)
  const seen = new Set<string>()
  const out: NormalisedOutage[] = []
  items.forEach((item, idx) => {
    const n = normalise(item, idx)
    if (!n) return
    if (seen.has(n.incident_id)) return
    seen.add(n.incident_id)
    out.push(n)
  })
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
    const outages = await fetchUnisonOutages()
    return jsonResponse({
      ok: true,
      provider: 'unison',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('unison ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'unison',
      count: 0,
      error: (e as Error).message,
    })
  }
})
