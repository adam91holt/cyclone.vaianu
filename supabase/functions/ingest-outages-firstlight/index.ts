// Firstlight Network (Gisborne / East Coast / Wairoa) outage ingester.
//
// Feed routed through thecolab.ai:
//   GET https://cyclone-api.thecolab.ai/outages?provider=firstlight
//
// Firstlight's upstream is an HTML table that the proxy scrapes into:
//   {
//     provider: 'firstlight',
//     outages: Array<{
//       id: string        DOM row id e.g. "OutageTableRow3226"
//       region: string    "Gisborne" | "East Coast" | "Wairoa" | ""
//       status: 'unplanned' | 'planned'
//       cells: string[]   9 cells from the table row, in order:
//         [0] type        "Unplanned" | "Planned"
//         [1] incident #  "1263"
//         [2] date        "Sun, 12 Apr 2026"
//         [3] time range  "3:43 AM - 11:00 AM"
//         [4] localities  "Tauwhareparae Rd Hokoroa Rd Tutamoe Rd Matanui Rd"
//         [5] customers   "50"
//         [6] cause/notes "Power off. Line patrol to commence"
//         [7] status      "Dispatched" | "Scheduled" | "Unplanned"
//         [8] spare       "-"
//     }>
//   }
//
// No geometry, no coordinates — we anchor each outage at the centroid of
// its declared region so the map still shows something meaningful.

const SOURCE_URL =
  'https://cyclone-api.thecolab.ai/outages?provider=firstlight'

// Rough centroids for each region Firstlight ships outages for, so the map
// markers cluster in the right area. These aren't precise enough for any
// kind of routing — they just place the pin in the right town.
const REGION_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  gisborne: { lat: -38.6628, lon: 178.0176 },
  'east coast': { lat: -37.9, lon: 178.35 },
  wairoa: { lat: -39.0356, lon: 177.4197 },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'firstlight'
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

interface FirstlightRow {
  id?: string
  region?: string
  status?: string
  cells?: string[]
}

interface FirstlightEnvelope {
  provider?: string
  outages?: FirstlightRow[]
}

// Parse "Sun, 12 Apr 2026" + "3:43 AM - 11:00 AM" → [startISO, endISO] in UTC.
// Firstlight reports in NZ local time; April 12 2026 is NZST (UTC+12).
function parseFirstlightTime(
  dateCell: string | undefined,
  rangeCell: string | undefined,
): { start: string | null; end: string | null } {
  if (!dateCell || !rangeCell) return { start: null, end: null }
  // "Sun, 12 Apr 2026" → 2026-04-12
  const dateMatch = dateCell.match(
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
  )
  if (!dateMatch) return { start: null, end: null }
  const [, dd, monthName, yyyy] = dateMatch
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  }
  const mm = months[monthName.toLowerCase()]
  if (!mm) return { start: null, end: null }
  const datePart = `${yyyy}-${mm}-${dd.padStart(2, '0')}`

  // "3:43 AM - 11:00 AM" or "10:00 AM - 12:00 AM"
  const rangeMatch = rangeCell.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  )
  if (!rangeMatch) return { start: null, end: null }
  const [, sh, sm, sap, eh, em, eap] = rangeMatch
  const to24h = (h: string, ap: string) => {
    let hh = parseInt(h, 10)
    const isPm = ap.toUpperCase() === 'PM'
    if (isPm && hh < 12) hh += 12
    if (!isPm && hh === 12) hh = 0
    return String(hh).padStart(2, '0')
  }
  const startISO = `${datePart}T${to24h(sh, sap)}:${sm}:00+12:00`
  const endISO = `${datePart}T${to24h(eh, eap)}:${em}:00+12:00`
  const sd = new Date(startISO)
  const ed = new Date(endISO)
  return {
    start: Number.isNaN(sd.getTime()) ? null : sd.toISOString(),
    end: Number.isNaN(ed.getTime()) ? null : ed.toISOString(),
  }
}

function normalise(row: FirstlightRow): NormalisedOutage | null {
  if ((row.status || '').toLowerCase() !== 'unplanned') return null
  const cells = row.cells ?? []
  if (cells.length < 7) return null

  // Incident number is cell[1] (e.g., "1263") — stable across pulls.
  const incidentNum = (cells[1] || '').trim()
  if (!incidentNum) return null
  const incident_id = `firstlight-${incidentNum}`

  const dateCell = cells[2]
  const rangeCell = cells[3]
  const { start: start_time, end: end_time } = parseFirstlightTime(
    dateCell,
    rangeCell,
  )

  const localitiesRaw = (cells[4] || '').trim()
  // The "localities" cell is a space-separated word soup — we split on
  // multiple spaces to get individual street names but keep "Rd"-style
  // suffixes attached. If there's no useful separator, fall back to a
  // single-element array.
  const localities = localitiesRaw
    ? localitiesRaw
        .split(/\s{2,}|(?<=Rd|Road|St|Street|Ave|Drive|Dr|Vly|Valley|Pl|Place)\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const customersRaw = (cells[5] || '').trim()
  const customer_count = /^\d+$/.test(customersRaw)
    ? parseInt(customersRaw, 10)
    : null

  const cause = (cells[6] || '').trim() || null
  const crewStatus = (cells[7] || '').trim()

  const title = localitiesRaw || 'Unplanned outage'

  // Region: Firstlight sometimes ships a blank region — bin to Gisborne
  // since that's their home patch.
  const regionRaw = (row.region || '').trim() || 'Gisborne'
  const centroid = REGION_CENTROIDS[regionRaw.toLowerCase()]

  return {
    provider: 'firstlight',
    incident_id,
    service: 'electricity',
    status: 'unplanned',
    title,
    cause,
    start_time,
    end_time,
    restoration_hint: crewStatus || null,
    notes: null,
    customer_count,
    localities,
    equipment: null,
    region: regionRaw,
    geometry: null,
    centroid_lat: centroid?.lat ?? null,
    centroid_lon: centroid?.lon ?? null,
  }
}

async function fetchFirstlightOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `Firstlight proxy HTTP ${res.status}: ${body.slice(0, 200)}`,
    )
  }
  const json = (await res.json()) as FirstlightEnvelope
  const rows = json.outages ?? []
  const seen = new Set<string>()
  const out: NormalisedOutage[] = []
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
    const outages = await fetchFirstlightOutages()
    return jsonResponse({
      ok: true,
      provider: 'firstlight',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('firstlight ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'firstlight',
      count: 0,
      error: (e as Error).message,
    })
  }
})
