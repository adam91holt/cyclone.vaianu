// 2degrees mobile / cell outage ingester.
//
// Feed routed through thecolab.ai:
//   GET https://cyclone-api.thecolab.ai/cell-outages?provider=2degrees
//
// Shape:
//   {
//     provider: '2degrees',
//     outages: [
//       {
//         type: 'Planned' | 'Unplanned',
//         status: 'Scheduled' | 'In Progress' | 'Resolved',
//         startTime: '2026-04-12T04:21:00',      // NZ local, no tz
//         endTime:   '2026-04-12T05:01:00' | null,
//         description: 'Mobile coverage may be degraded.',
//         location:    'Bay of Plenty, Matua',   // "region, suburb"
//         categories:  ['Mobile'] | ['Broadband'] | ['Mobile','Broadband'],
//         priority:    '3 - Moderate' | '4 - Low' | null
//       }
//     ]
//   }
//
// 2degrees does NOT provide:
//   - stable incident IDs (we synthesise one from location+startTime)
//   - lat/lon coordinates (we use NZ region centroids to place the marker)
//   - customer counts
//
// We surface only Unplanned + In Progress + Mobile. Resolved rows are the
// historical archive; planned is maintenance and belongs elsewhere.

const SOURCE_URL =
  'https://cyclone-api.thecolab.ai/cell-outages?provider=2degrees'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Rough centroids for the NZ regions 2degrees reports against. Used only
// when the outage has no explicit geometry — enough to place the pin in
// the right part of the country. Keys are lowercased to normalise.
const NZ_REGION_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  'northland': { lat: -35.5, lon: 174.0 },
  'auckland': { lat: -36.85, lon: 174.76 },
  'waikato': { lat: -37.78, lon: 175.28 },
  'bay of plenty': { lat: -37.69, lon: 176.17 },
  'gisborne': { lat: -38.66, lon: 178.02 },
  "hawke's bay": { lat: -39.49, lon: 176.91 },
  'hawkes bay': { lat: -39.49, lon: 176.91 },
  'taranaki': { lat: -39.27, lon: 174.28 },
  'manawatu-whanganui': { lat: -40.35, lon: 175.61 },
  'manawatu': { lat: -40.35, lon: 175.61 },
  'whanganui': { lat: -39.93, lon: 175.05 },
  'wellington': { lat: -41.29, lon: 174.78 },
  'wairarapa': { lat: -41.12, lon: 175.72 },
  'tasman': { lat: -41.27, lon: 172.83 },
  'nelson': { lat: -41.27, lon: 173.28 },
  'marlborough': { lat: -41.52, lon: 173.95 },
  'west coast': { lat: -42.45, lon: 171.21 },
  'canterbury': { lat: -43.53, lon: 172.64 },
  'otago': { lat: -45.87, lon: 170.5 },
  'southland': { lat: -46.42, lon: 168.35 },
  'chatham islands': { lat: -43.95, lon: -176.56 },
}

interface NormalisedOutage {
  provider: '2degrees'
  incident_id: string
  service: 'mobile'
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

interface TwoDegreesRow {
  type?: string | null
  status?: string | null
  startTime?: string | null
  endTime?: string | null
  description?: string | null
  location?: string | null
  categories?: string[] | null
  priority?: string | null
}

interface TwoDegreesEnvelope {
  provider?: string
  outages?: TwoDegreesRow[]
}

// "2026-04-12T04:21:00" with no timezone → treat as NZ local (+12:00).
// The UI renders in Pacific/Auckland so UTC round-trip is the safe shape.
function parseLocalAsNZT(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const iso = `${trimmed}+12:00`
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// "Bay of Plenty, Matua" → { region: "Bay of Plenty", suburb: "Matua" }.
// "Wairarapa" → { region: "Wairarapa", suburb: null }.
function splitLocation(
  raw: string | null | undefined,
): { region: string; suburb: string | null } {
  const trimmed = (raw || '').trim()
  if (!trimmed) return { region: 'Unknown', suburb: null }
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx === -1) return { region: trimmed, suburb: null }
  const region = trimmed.slice(0, commaIdx).trim()
  const suburb = trimmed.slice(commaIdx + 1).trim() || null
  return { region, suburb }
}

// Synthesise a stable id from the fields 2degrees gives us. location +
// startTime is unique enough in practice — and stable across pulls as
// long as neither field is edited upstream.
function synthesiseId(row: TwoDegreesRow): string {
  const key = `${row.location ?? ''}::${row.startTime ?? ''}`
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i)
    h |= 0
  }
  // base36 is shorter than hex and still URL-safe.
  return Math.abs(h).toString(36)
}

function normalise(row: TwoDegreesRow): NormalisedOutage | null {
  // Unplanned, live, mobile only.
  if ((row.type || '').toLowerCase() !== 'unplanned') return null
  if ((row.status || '').toLowerCase() !== 'in progress') return null
  const categories = (row.categories ?? []).map((c) => c.toLowerCase())
  if (!categories.includes('mobile')) return null

  const { region, suburb } = splitLocation(row.location)
  const centroid = NZ_REGION_CENTROIDS[region.toLowerCase()]
  // Synthetic id — 2degrees doesn't give us one.
  const incident_id = `2degrees-${synthesiseId(row)}`

  const title = suburb ? `${suburb}, ${region}` : region
  const description = (row.description || '').trim() || null

  return {
    provider: '2degrees',
    incident_id,
    service: 'mobile',
    status: 'unplanned',
    title,
    cause: description,
    start_time: parseLocalAsNZT(row.startTime),
    end_time: parseLocalAsNZT(row.endTime),
    restoration_hint: (row.status || '').trim() || null,
    notes: row.priority ? `Priority: ${row.priority}` : null,
    customer_count: null,
    localities: suburb ? [suburb] : [],
    equipment: null,
    region,
    geometry: null,
    centroid_lat: centroid?.lat ?? null,
    centroid_lon: centroid?.lon ?? null,
  }
}

async function fetch2degreesOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`2degrees proxy HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as TwoDegreesEnvelope
  const rows = json.outages ?? []
  const out: NormalisedOutage[] = []
  const seen = new Set<string>()
  for (const r of rows) {
    const n = normalise(r)
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
    const outages = await fetch2degreesOutages()
    return jsonResponse({
      ok: true,
      provider: '2degrees',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('2degrees ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: '2degrees',
      count: 0,
      error: (e as Error).message,
    })
  }
})
