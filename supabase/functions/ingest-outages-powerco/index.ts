// Powerco outage ingester.
//
// Powerco's network covers Coromandel / Hauraki, western Bay of Plenty,
// parts of Waikato, Taranaki and the Wairarapa — so unlike the other
// single-region adapters, we map the region per-feature from the `town`
// property rather than using a single REGION constant.
//
// Feed is proxied through thecolab.ai (same pattern as Counties and Vector):
//   GET https://cyclone-api.thecolab.ai/outages?provider=powerco
//
// Response is a GeoJSON FeatureCollection. Each feature is either a Polygon
// (outage coverage area) or a Point, with properties:
//   planned_outage                0 = unplanned, 1 = planned
//   town                          e.g. "Tauranga"
//   suburb                        e.g. "Riversdale Beach"
//   distributor_event_number      natural id, e.g. "JE26010191"
//   interruption_reason           e.g. "Site Investigation Underway"
//   number_of_detail_records      customer count
//   interruption_start_date       ms epoch
//   interruption_restore_date     ms epoch (or null)
//   feeder                        e.g. "BLAIRLOGIE"
//   crew_status                   human-readable crew progress
//
// Coordinates are already in GeoJSON [lon, lat] order, so Polygon geometry
// passes through unmodified.

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/outages?provider=powerco'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'powerco'
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

interface PowercoProperties {
  planned_outage?: number | null
  town?: string | null
  suburb?: string | null
  feeder?: string | null
  distributor_event_number?: string | null
  interruption_reason?: string | null
  number_of_detail_records?: number | null
  interruption_start_date?: number | null
  interruption_restore_date?: number | null
  crew_status?: string | null
}

interface PowercoFeature {
  type?: string
  id?: number
  geometry?:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'Point'; coordinates: number[] }
    | null
  properties?: PowercoProperties | null
}

interface PowercoEnvelope {
  type?: string
  provider?: string
  features?: PowercoFeature[]
}

// Map Powerco towns to the region label the rest of the app uses. Unknown
// towns fall back to 'Powerco'. These strings match the freeform region
// labels used by other adapters (see counties/vector/wel/topenergy).
const TOWN_REGION: Record<string, string> = {
  // Coromandel / Hauraki
  Thames: 'Coromandel',
  Whitianga: 'Coromandel',
  Pauanui: 'Coromandel',
  Hikuai: 'Coromandel',
  Coromandel: 'Coromandel',
  Tahawai: 'Coromandel',
  Waihi: 'Coromandel',
  Paeroa: 'Coromandel',
  // Western Bay of Plenty
  Tauranga: 'Bay of Plenty',
  'Mount Maunganui': 'Bay of Plenty',
  Papamoa: 'Bay of Plenty',
  'Te Puke': 'Bay of Plenty',
  'Te Puna': 'Bay of Plenty',
  Whakamārama: 'Bay of Plenty',
  Minden: 'Bay of Plenty',
  Omanawa: 'Bay of Plenty',
  Oropi: 'Bay of Plenty',
  Paengaroa: 'Bay of Plenty',
  Pongakawa: 'Bay of Plenty',
  Pukehina: 'Bay of Plenty',
  Waitao: 'Bay of Plenty',
  'Matakana Island': 'Bay of Plenty',
  'Lower Kaimai': 'Bay of Plenty',
  // Waikato
  Matamata: 'Waikato',
  'Te Aroha': 'Waikato',
  Cambridge: 'Waikato',
  Tokoroa: 'Waikato',
  Manawaru: 'Waikato',
  Waitoa: 'Waikato',
  Springdale: 'Waikato',
  // Taranaki
  Kaimiro: 'Taranaki',
  // Manawatū / Wairarapa
  Marton: 'Manawatū',
  Masterton: 'Wairarapa',
  Mauriceville: 'Wairarapa',
  Eketāhuna: 'Wairarapa',
}

function regionForTown(town: string | null | undefined): string {
  if (!town) return 'Powerco'
  return TOWN_REGION[town] ?? 'Powerco'
}

function msToIso(ms: number | null | undefined): string | null {
  if (ms == null) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function stripQuotes(s: string | null | undefined): string | null {
  if (!s) return null
  // Some reasons come wrapped in literal quotes, e.g. '"Land Slip"'.
  return s.replace(/^"+|"+$/g, '').trim() || null
}

function centroidOfPolygon(
  rings: number[][][],
): { lat: number; lon: number } | null {
  const outer = rings?.[0]
  if (!outer || outer.length === 0) return null
  let lon = 0
  let lat = 0
  // GeoJSON rings repeat the first point at the end — skip the duplicate
  // so the centroid isn't biased.
  const n = outer.length > 1 &&
    outer[0][0] === outer[outer.length - 1][0] &&
    outer[0][1] === outer[outer.length - 1][1]
    ? outer.length - 1
    : outer.length
  for (let i = 0; i < n; i++) {
    lon += outer[i][0]
    lat += outer[i][1]
  }
  return { lat: lat / n, lon: lon / n }
}

async function fetchPowercoOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (compatible; vaianu.live/1.0; +https://vaianu.live)',
    },
  })
  if (!res.ok) {
    throw new Error(`Powerco HTTP ${res.status}`)
  }
  const json = (await res.json()) as PowercoEnvelope
  const features = json?.features ?? []

  // Powerco's feed emits each incident twice — once as a Polygon (coverage
  // area) and once as a Point (centroid). We prefer the Polygon because it
  // renders as a filled region on the map and gives a real extent; the
  // Point is redundant. Dedupe by distributor_event_number, Polygon wins.
  const byId = new Map<string, PowercoFeature>()
  for (const feat of features) {
    const id = feat.properties?.distributor_event_number
    if (!id) continue
    const existing = byId.get(id)
    if (!existing) {
      byId.set(id, feat)
      continue
    }
    const existingIsPoly = existing.geometry?.type === 'Polygon'
    const incomingIsPoly = feat.geometry?.type === 'Polygon'
    if (incomingIsPoly && !existingIsPoly) byId.set(id, feat)
  }

  const out: NormalisedOutage[] = []
  for (const feat of byId.values()) {
    const props = feat.properties ?? {}
    const id = props.distributor_event_number
    if (!id) continue

    const geom = feat.geometry ?? null
    let centroid: { lat: number; lon: number } | null = null
    let geometry: unknown = null
    if (geom?.type === 'Polygon') {
      geometry = geom
      centroid = centroidOfPolygon(geom.coordinates)
    } else if (geom?.type === 'Point') {
      geometry = geom
      const [lon, lat] = geom.coordinates
      if (typeof lat === 'number' && typeof lon === 'number') {
        centroid = { lat, lon }
      }
    }

    const suburb = (props.suburb ?? '').trim()
    const town = (props.town ?? '').trim()
    const localities = [suburb, town]
      .filter((s): s is string => !!s && s.length > 0)
      // De-dupe when suburb === town (common in smaller towns).
      .filter((v, i, arr) => arr.indexOf(v) === i)

    const cause = stripQuotes(props.interruption_reason)
    const crew = (props.crew_status ?? '').trim() || null
    const notes = crew && crew !== cause ? crew : null

    out.push({
      provider: 'powerco',
      incident_id: id,
      service: 'electricity',
      status: props.planned_outage === 1 ? 'planned' : 'unplanned',
      title: props.feeder ? `${props.feeder} feeder` : id,
      cause,
      start_time: msToIso(props.interruption_start_date),
      end_time: msToIso(props.interruption_restore_date),
      restoration_hint: props.interruption_restore_date
        ? `Estimated restore ${msToIso(props.interruption_restore_date)}`
        : null,
      notes,
      customer_count: props.number_of_detail_records ?? null,
      localities,
      equipment: props.feeder ?? null,
      region: regionForTown(town),
      geometry,
      centroid_lat: centroid?.lat ?? null,
      centroid_lon: centroid?.lon ?? null,
    })
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
    const outages = await fetchPowercoOutages()
    return jsonResponse({
      ok: true,
      provider: 'powerco',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('powerco ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'powerco',
      count: 0,
      error: (e as Error).message,
    })
  }
})
