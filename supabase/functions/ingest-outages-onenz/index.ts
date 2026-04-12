// One NZ mobile / cell outage ingester.
//
// Feed routed through thecolab.ai:
//   GET https://cyclone-api.thecolab.ai/cell-outages?provider=onenz
//
// Shape:
//   {
//     provider: 'onenz',
//     categories: [
//       {
//         category: 'mobile' | 'broadband',
//         items: [
//           {
//             description: "Degraded 4G and 5G Mobile Coverage",
//             location: "INC1027771 - Patea, Taranaki",
//             locations: "Taranaki|Patea|-39.75|174.47|5:52 PM 11/04/26|\r\n...",
//             status: "Under Investigation" | "Planned"
//           }
//         ]
//       }
//     ]
//   }
//
// `locations` is pipe-delimited: region|suburb|lat|lon|start|end. When an
// incident affects multiple cell sites the field carries one line per site
// separated by \r\n — we emit one outage per site so each shows as its own
// marker on the map. Incident IDs are composed as
// `onenz-<INC|CRQ|CHG code>-<site idx>` so the orchestrator's clearing logic
// works per-site.
//
// We surface mobile category only (the ask is cell towers). Broadband is a
// different service and would need its own pipeline if we ever want it.

const SOURCE_URL =
  'https://cyclone-api.thecolab.ai/cell-outages?provider=onenz'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface NormalisedOutage {
  provider: 'onenz'
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

interface OneNzItem {
  description?: string | null
  location?: string | null
  locations?: string | null
  status?: string | null
}

interface OneNzCategory {
  category?: string | null
  items?: OneNzItem[]
}

interface OneNzEnvelope {
  provider?: string
  categories?: OneNzCategory[]
}

// "5:52 PM 11/04/26" (NZ local) → ISO UTC string.
// One NZ only gives us two-digit year + 12h time. NZST = UTC+12.
function parseOneNzTime(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = trimmed.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/i,
  )
  if (!match) return null
  const [, hh, mi, ap, dd, mm, yyRaw] = match
  let hour = parseInt(hh, 10)
  const isPm = ap.toUpperCase() === 'PM'
  if (isPm && hour < 12) hour += 12
  if (!isPm && hour === 12) hour = 0
  const yyyy = yyRaw.length === 2 ? `20${yyRaw}` : yyRaw
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${String(hour).padStart(2, '0')}:${mi}:00+12:00`
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// The `location` field wraps the incident ticket ID and a free-text area.
// Example: "INC1027771 - Patea, Taranaki" → { code: "INC1027771", title: "Patea, Taranaki" }
function splitIncidentHeader(
  raw: string | null | undefined,
): { code: string | null; title: string | null } {
  if (!raw) return { code: null, title: null }
  const trimmed = raw.trim()
  const match = trimmed.match(/^(INC\d+|CRQ\d+|CHG\d+)\s*[-–]\s*(.+)$/i)
  if (!match) return { code: null, title: trimmed || null }
  return { code: match[1], title: match[2].trim() || null }
}

// "Taranaki|Patea|-39.75|174.47|5:52 PM 11/04/26|" → one sub-site.
// Lines are separated by \r\n; some feeds use bare \n. Fields are '|' but
// there can be trailing '|' (empty end-time column).
interface OneNzSite {
  region: string | null
  suburb: string | null
  lat: number | null
  lon: number | null
  start: string | null
  end: string | null
}

function parseLocationsField(raw: string | null | undefined): OneNzSite[] {
  if (!raw) return []
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const out: OneNzSite[] = []
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim())
    if (parts.length < 4) continue
    const [region, suburb, latRaw, lonRaw, startRaw, endRaw] = [
      parts[0] ?? '',
      parts[1] ?? '',
      parts[2] ?? '',
      parts[3] ?? '',
      parts[4] ?? '',
      parts[5] ?? '',
    ]
    const lat = latRaw ? Number(latRaw) : NaN
    const lon = lonRaw ? Number(lonRaw) : NaN
    out.push({
      region: region || null,
      suburb: suburb || null,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      start: parseOneNzTime(startRaw),
      end: parseOneNzTime(endRaw),
    })
  }
  return out
}

function normaliseItem(item: OneNzItem): NormalisedOutage[] {
  // Only surface live (not planned) mobile outages on the map.
  const statusRaw = (item.status || '').trim().toLowerCase()
  if (!statusRaw || statusRaw === 'planned' || statusRaw === 'resolved') {
    return []
  }

  const { code, title: headerTitle } = splitIncidentHeader(item.location)
  const sites = parseLocationsField(item.locations)

  // No parsable sites → drop. We need coordinates for the map; one NZ
  // always ships them on live incidents.
  if (sites.length === 0) return []

  const description = (item.description || '').trim() || null
  // Lift a rough cause from the description when we can — "weather",
  // "power", "fibre cut". Falls back to the full description otherwise.
  const cause = description

  const results: NormalisedOutage[] = []
  sites.forEach((site, idx) => {
    if (site.lat === null || site.lon === null) return
    const base = code ?? `unknown-${Math.abs(hashString(item.locations || ''))}`
    const incident_id = `onenz-${base}${sites.length > 1 ? `-${idx}` : ''}`
    const region = site.region || headerTitle || 'Unknown'
    const suburb = site.suburb || headerTitle || 'Unknown'
    results.push({
      provider: 'onenz',
      incident_id,
      service: 'mobile',
      status: 'unplanned',
      title: `${suburb}${site.region ? `, ${site.region}` : ''}`,
      cause,
      start_time: site.start,
      end_time: site.end,
      restoration_hint: (item.status || '').trim() || null,
      notes: description,
      customer_count: null, // One NZ doesn't report customer counts
      localities: site.suburb ? [site.suburb] : [],
      equipment: code, // park the incident ticket code here for support lookup
      region,
      geometry: null,
      centroid_lat: site.lat,
      centroid_lon: site.lon,
    })
  })
  return results
}

// Tiny deterministic string hash for synthetic ids. Not cryptographic — just
// needs to be stable across runs so clearing logic works.
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}

async function fetchOneNzOutages(): Promise<NormalisedOutage[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`One NZ proxy HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as OneNzEnvelope
  const categories = json.categories ?? []
  const out: NormalisedOutage[] = []
  const seen = new Set<string>()
  for (const cat of categories) {
    if ((cat.category || '').toLowerCase() !== 'mobile') continue
    for (const item of cat.items ?? []) {
      for (const n of normaliseItem(item)) {
        if (seen.has(n.incident_id)) continue
        seen.add(n.incident_id)
        out.push(n)
      }
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
    const outages = await fetchOneNzOutages()
    return jsonResponse({
      ok: true,
      provider: 'onenz',
      count: outages.length,
      outages,
    })
  } catch (e) {
    console.error('onenz ingest failed', e)
    return jsonResponse({
      ok: false,
      provider: 'onenz',
      count: 0,
      error: (e as Error).message,
    })
  }
})
