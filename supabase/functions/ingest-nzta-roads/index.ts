// Ingest NZTA state highway road events into nzta_road_events.
// Runs every 5 minutes via pg_cron. Events disappear from the upstream
// feed when resolved, so the read policy filters by last_seen_at.
//
// WKT parsing is kept in sync with the `nzta-roads` proxy function; if
// you add geometry types there, add them here too.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/roads'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface RawEvent {
  id: number | string
  eventType?: string
  eventDescription?: string
  eventComments?: string
  eventIsland?: string
  impact?: string
  locationArea?: string
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
}

interface RawEnvelope {
  events?: RawEvent[]
}

type Geom =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }

type Severity = 'closed' | 'delay' | 'hazard' | 'caution'

interface NormalisedEvent {
  id: string
  event_type: string | null
  description: string | null
  comments: string | null
  impact: string | null
  severity: Severity
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
    const lines: [number, number][][] = []
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
    let longest: [number, number][] = []
    for (const line of g.coordinates) {
      if (line.length > longest.length) longest = line
    }
    if (longest.length === 0) return null
    return longest[Math.floor(longest.length / 2)]
  }
  return null
}

function severityFor(impact: string | null | undefined): Severity {
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
    alternative_route: e.alternativeRoute
      ? e.alternativeRoute.trim().slice(0, 500)
      : null,
    start_date: toIso(e.startDate),
    end_date: toIso(e.endDate),
    expected_resolution: e.expectedResolution ?? null,
    geometry: geom,
    centroid,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const started = Date.now()
  try {
    const res = await fetch(SOURCE_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`)
    const raw = (await res.json()) as RawEnvelope

    const events: NormalisedEvent[] = []
    for (const e of raw.events ?? []) {
      const n = normalise(e)
      if (n) events.push(n)
    }

    const now = new Date().toISOString()
    const rows = events.map((e) => ({
      id: e.id,
      event_type: e.event_type,
      description: e.description,
      comments: e.comments,
      impact: e.impact,
      severity: e.severity,
      planned: e.planned,
      status: e.status,
      island: e.island,
      region: e.region,
      highway: e.highway,
      location: e.location,
      alternative_route: e.alternative_route,
      start_date: e.start_date,
      end_date: e.end_date,
      expected_resolution: e.expected_resolution,
      geometry: e.geometry,
      centroid_lon: e.centroid?.[0] ?? null,
      centroid_lat: e.centroid?.[1] ?? null,
      last_seen_at: now,
    }))

    // Chunk upserts — NZTA typically returns a few hundred events but
    // can spike during a weather event.
    const CHUNK = 500
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase
        .from('nzta_road_events')
        .upsert(rows.slice(i, i + CHUNK), { onConflict: 'id' })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({
        ok: true,
        upserted: rows.length,
        duration_ms: Date.now() - started,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('ingest-nzta-roads failed', err)
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
