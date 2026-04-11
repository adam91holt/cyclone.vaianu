// NZTA state highway road events proxy.
//
// Pulls https://cyclone-api.thecolab.ai/roads (wrapper around NZTA's live
// event feed) and normalises for the frontend. Key job: parse the WKT
// geometry strings into GeoJSON, because Leaflet wants GeoJSON and the
// browser shouldn't have to parse "MULTILINESTRING ((...))" itself.
//
// Geometry types we've seen: POINT, MULTILINESTRING. We handle both plus
// LINESTRING defensively.

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/roads'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface RawEvent {
  id: number | string
  eventType?: string
  eventDescription?: string
  eventComments?: string
  eventIsland?: string
  impact?: string
  locationArea?: string
  locations?: string
  alternativeRoute?: string
  planned?: boolean
  status?: string
  startDate?: string
  endDate?: string
  expectedResolution?: string
  geometry?: string | null
  region?: { id?: number; name?: string } | null
  journey?: { name?: string } | null
  way?: { name?: string } | null
  informationSource?: string
  supplier?: string
}

interface RawEnvelope {
  source?: string
  count?: number
  events?: RawEvent[]
}

type Geom =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }

interface NormalisedEvent {
  id: string
  event_type: string | null
  description: string | null
  comments: string | null
  impact: string | null
  severity: 'closed' | 'delay' | 'hazard' | 'caution'
  planned: boolean
  status: string | null
  island: string | null
  region: string | null
  highway: string | null
  location: string | null
  alternative_route: string | null
  start_date: string | null
  end_date: string | null
  expected_resolution: string | null
  geometry: Geom | null
  centroid: [number, number] | null
}

// --- WKT parsing --------------------------------------------------------
// WKT from NZTA looks like:
//   POINT (174.76 -36.84)
//   LINESTRING (174.76 -36.84, 174.77 -36.85)
//   MULTILINESTRING ((174.76 -36.84, ...), (174.80 -36.85, ...))
//
// Coordinates are space-separated (lng lat), pairs comma-separated.
// We scan manually so we don't pull in a full WKT parser for ~4 types.

function parseCoordList(text: string): [number, number][] {
  const coords: [number, number][] = []
  for (const pair of text.split(',')) {
    const parts = pair.trim().split(/\s+/)
    if (parts.length < 2) continue
    const lng = Number(parts[0])
    const lat = Number(parts[1])
    if (Number.isFinite(lng) && Number.isFinite(lat)) coords.push([lng, lat])
  }
  return coords
}

function parseWkt(wkt: string | null | undefined): Geom | null {
  if (!wkt) return null
  const trimmed = wkt.trim()
  const m = /^(\w+)\s*\((.*)\)\s*$/s.exec(trimmed)
  if (!m) return null
  const type = m[1].toUpperCase()
  const inner = m[2]

  if (type === 'POINT') {
    const coords = parseCoordList(inner)
    if (coords.length === 0) return null
    return { type: 'Point', coordinates: coords[0] }
  }
  if (type === 'LINESTRING') {
    const coords = parseCoordList(inner)
    if (coords.length < 2) return null
    return { type: 'LineString', coordinates: coords }
  }
  if (type === 'MULTILINESTRING') {
    // inner looks like: (x y, x y), (x y, x y)
    const lines: [number, number][][] = []
    // Match each parenthesised group
    const re = /\(([^()]*)\)/g
    let g: RegExpExecArray | null
    while ((g = re.exec(inner)) !== null) {
      const coords = parseCoordList(g[1])
      if (coords.length >= 2) lines.push(coords)
    }
    if (lines.length === 0) return null
    return { type: 'MultiLineString', coordinates: lines }
  }
  return null
}

function centroidOf(g: Geom): [number, number] | null {
  if (g.type === 'Point') return g.coordinates
  if (g.type === 'LineString') {
    const mid = g.coordinates[Math.floor(g.coordinates.length / 2)]
    return mid ?? null
  }
  if (g.type === 'MultiLineString') {
    // midpoint of the longest line
    let longest: [number, number][] = []
    for (const line of g.coordinates) {
      if (line.length > longest.length) longest = line
    }
    if (longest.length === 0) return null
    return longest[Math.floor(longest.length / 2)]
  }
  return null
}

function severityFor(impact: string | null | undefined): NormalisedEvent['severity'] {
  const i = (impact || '').toLowerCase()
  if (i.includes('closed')) return 'closed'
  if (i.includes('delay')) return 'delay'
  if (i.includes('restriction')) return 'hazard'
  return 'caution'
}

function toIso(d: string | null | undefined): string | null {
  if (!d) return null
  const t = Date.parse(d)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function normalise(e: RawEvent): NormalisedEvent | null {
  const id = String(e.id ?? '')
  if (!id) return null
  const geom = parseWkt(e.geometry)
  const centroid = geom ? centroidOf(geom) : null
  return {
    id,
    event_type: e.eventType ?? null,
    description: e.eventDescription ?? null,
    comments: e.eventComments ? e.eventComments.trim().slice(0, 800) : null,
    impact: e.impact ?? null,
    severity: severityFor(e.impact),
    planned: !!e.planned,
    status: e.status ?? null,
    island: e.eventIsland ?? null,
    region: e.region?.name ?? null,
    highway: e.way?.name
      ? `SH ${e.way.name.replace(/^0+/, '')}`
      : e.journey?.name ?? null,
    location: e.locationArea ?? null,
    alternative_route: e.alternativeRoute ? e.alternativeRoute.trim().slice(0, 500) : null,
    start_date: toIso(e.startDate),
    end_date: toIso(e.endDate),
    expected_resolution: e.expectedResolution ?? null,
    geometry: geom,
    centroid,
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60',
      ...(init.headers ?? {}),
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const res = await fetch(SOURCE_URL, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`)
    const raw = (await res.json()) as RawEnvelope
    const events: NormalisedEvent[] = []
    for (const e of raw.events ?? []) {
      const n = normalise(e)
      if (n) events.push(n)
    }
    // Upper-NI first, then rest. Unplanned ahead of planned within groups.
    // Closed ahead of delay ahead of caution.
    const sevOrder: Record<NormalisedEvent['severity'], number> = {
      closed: 0,
      delay: 1,
      hazard: 2,
      caution: 3,
    }
    events.sort((a, b) => {
      const ap = a.planned ? 1 : 0
      const bp = b.planned ? 1 : 0
      if (ap !== bp) return ap - bp
      return sevOrder[a.severity] - sevOrder[b.severity]
    })

    return jsonResponse({
      ok: true,
      count: events.length,
      events,
      fetched_at: new Date().toISOString(),
    })
  } catch (e) {
    console.error('nzta-roads failed', e)
    return jsonResponse(
      {
        ok: false,
        error: (e as Error).message,
        events: [],
        count: 0,
      },
      { status: 200 },
    )
  }
})
