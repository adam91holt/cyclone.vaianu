// Live airport activity via adsb.lol — a free, community-run ADS-B API with
// no auth and no rate limits to speak of. For each NZ airport we pull all
// aircraft currently within a ~40km radius, classify them into arrival/
// departure based on altitude + vertical rate, and return the tight list.
//
// NOTE: The Auckland Airport portal API (aucklandairport.co.nz/content/aial/
// api/v1/flights) is sealed behind Cloudflare bot management and cannot be
// fetched server-to-server. adsb.lol gives us live positions of aircraft
// actually in the air right now — a richer, more cyclone-relevant feed than
// scheduled data would be.
//
// Body: POST {}
// Returns: { airports: [{ icao, iata, city, status, recentArrivals,
//   recentDepartures, activity[] }], count, fetchedAt, source }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  lat: number
  lon: number
  radiusNm: number // search radius in nautical miles
}

const AIRPORTS: Airport[] = [
  { icao: 'NZAA', iata: 'AKL', name: 'Auckland Airport', city: 'Auckland', lat: -37.008, lon: 174.785, radiusNm: 30 },
  { icao: 'NZWN', iata: 'WLG', name: 'Wellington Airport', city: 'Wellington', lat: -41.327, lon: 174.805, radiusNm: 25 },
  { icao: 'NZCH', iata: 'CHC', name: 'Christchurch Airport', city: 'Christchurch', lat: -43.489, lon: 172.532, radiusNm: 30 },
  { icao: 'NZHN', iata: 'HLZ', name: 'Hamilton Airport', city: 'Hamilton', lat: -37.867, lon: 175.332, radiusNm: 20 },
  { icao: 'NZTG', iata: 'TRG', name: 'Tauranga Airport', city: 'Tauranga', lat: -37.672, lon: 176.196, radiusNm: 20 },
  { icao: 'NZGS', iata: 'GIS', name: 'Gisborne Airport', city: 'Gisborne', lat: -38.663, lon: 177.978, radiusNm: 20 },
]

interface AdsbAircraft {
  hex: string
  flight?: string
  r?: string // registration
  t?: string // type
  alt_baro?: number | 'ground'
  gs?: number // ground speed kts
  track?: number
  baro_rate?: number // ft/min
  lat?: number
  lon?: number
  dst?: number // distance in NM
  dir?: number
  category?: string
}

interface AdsbResponse {
  ac?: AdsbAircraft[]
  msg?: string
}

interface AirportActivity {
  callsign: string
  registration: string | null
  type: string | null
  direction: 'arrival' | 'departure' | 'overhead' | 'ground'
  alt_ft: number | null
  speed_kts: number | null
  distance_nm: number | null
  vertical_rate: number | null
}

interface AirportResult {
  icao: string
  iata: string
  name: string
  city: string
  recentArrivals: number
  recentDepartures: number
  overhead: number
  onGround: number
  activity: AirportActivity[]
  status: 'normal' | 'reduced' | 'suspended' | 'limited'
}

const CACHE_KEY = 'airports:adsb-lol'
const TTL_SECONDS = 60 // live data — short cache

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    return await p
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchAdsb(ap: Airport): Promise<AdsbAircraft[]> {
  const url = `https://api.adsb.lol/v2/lat/${ap.lat}/lon/${ap.lon}/dist/${ap.radiusNm}`
  const res = await withTimeout(
    fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CycloneVaianuDashboard/1.0',
      },
    }),
    6000,
  )
  if (!res || !res.ok) return []
  try {
    const payload = (await res.json()) as AdsbResponse
    return Array.isArray(payload.ac) ? payload.ac : []
  } catch {
    return []
  }
}

function classify(aircraft: AdsbAircraft): AirportActivity['direction'] {
  // Ground = on the airfield. Very low alt + slow = landing/taxi, high = cruise.
  if (aircraft.alt_baro === 'ground') return 'ground'
  const alt = typeof aircraft.alt_baro === 'number' ? aircraft.alt_baro : null
  const vs = aircraft.baro_rate ?? 0
  if (alt == null) return 'overhead'
  if (alt < 6000) {
    if (vs < -200) return 'arrival'
    if (vs > 200) return 'departure'
    return 'arrival' // low & level near the field — almost certainly final approach
  }
  return 'overhead'
}

function buildAirportResult(ap: Airport, aircraft: AdsbAircraft[]): AirportResult {
  const activity: AirportActivity[] = aircraft
    .map((a) => {
      const dir = classify(a)
      return {
        callsign: (a.flight ?? '').trim() || a.hex.toUpperCase(),
        registration: a.r ?? null,
        type: a.t ?? null,
        direction: dir,
        alt_ft: typeof a.alt_baro === 'number' ? a.alt_baro : a.alt_baro === 'ground' ? 0 : null,
        speed_kts: a.gs ?? null,
        distance_nm: a.dst ?? null,
        vertical_rate: a.baro_rate ?? null,
      }
    })
    // Sort: active traffic first (arr/dep/ground), then overhead; within groups by distance.
    .sort((a, b) => {
      const rank = { arrival: 0, departure: 0, ground: 1, overhead: 2 } as const
      const ra = rank[a.direction]
      const rb = rank[b.direction]
      if (ra !== rb) return ra - rb
      return (a.distance_nm ?? 99) - (b.distance_nm ?? 99)
    })

  const arrivals = activity.filter((a) => a.direction === 'arrival').length
  const departures = activity.filter((a) => a.direction === 'departure').length
  const overhead = activity.filter((a) => a.direction === 'overhead').length
  const ground = activity.filter((a) => a.direction === 'ground').length
  const total = arrivals + departures + ground

  // Status heuristic, calibrated for adsb.lol (much better coverage than OpenSky):
  // - Main airports: 0 active = suspended, <3 = reduced, else normal
  // - Regionals: 0 = limited (could be coverage), <2 = reduced, else normal
  const isMajor = ap.icao === 'NZAA' || ap.icao === 'NZWN' || ap.icao === 'NZCH'
  let status: AirportResult['status']
  if (isMajor) {
    if (total === 0 && overhead === 0) status = 'suspended'
    else if (total === 0) status = 'reduced'
    else if (total < 3) status = 'reduced'
    else status = 'normal'
  } else {
    if (total === 0 && overhead === 0) status = 'limited'
    else if (total === 0) status = 'reduced'
    else status = 'normal'
  }

  return {
    icao: ap.icao,
    iata: ap.iata,
    name: ap.name,
    city: ap.city,
    recentArrivals: arrivals,
    recentDepartures: departures,
    overhead,
    onGround: ground,
    activity: activity.slice(0, 12),
    status,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const now = new Date()

    // Cache hit?
    const { data: cached } = await supabase
      .from('metservice_cache')
      .select('*')
      .eq('resource', CACHE_KEY)
      .maybeSingle()

    if (cached && new Date(cached.expires_at) > now) {
      return new Response(
        JSON.stringify({
          ...(cached.data as Record<string, unknown>),
          fetchedAt: cached.fetched_at,
          source: 'cache',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch all airports in parallel — allSettled so a single slow/bad
    // airport doesn't poison the whole payload.
    const results = await Promise.allSettled(
      AIRPORTS.map(async (ap) => buildAirportResult(ap, await fetchAdsb(ap))),
    )
    const airports: AirportResult[] = results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value
      const ap = AIRPORTS[i]
      return {
        icao: ap.icao,
        iata: ap.iata,
        name: ap.name,
        city: ap.city,
        recentArrivals: 0,
        recentDepartures: 0,
        overhead: 0,
        onGround: 0,
        activity: [],
        status: 'limited' as const,
      }
    })

    const payload = { airports, count: airports.length }
    const expiresAt = new Date(now.getTime() + TTL_SECONDS * 1000)
    await supabase.from('metservice_cache').upsert({
      resource: CACHE_KEY,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      data: payload,
      source_status: 200,
    })

    return new Response(
      JSON.stringify({ ...payload, fetchedAt: now.toISOString(), source: 'upstream' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('airports-live error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
