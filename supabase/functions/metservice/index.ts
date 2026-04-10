// MetService API proxy with Supabase-backed caching.
//
// The browser never hits MetService directly. All client weather queries go
// through this function, which serves cached results and only re-fetches
// upstream when the cached entry is stale.
//
// Resources exposed:
//   - warnings        public severe-weather warnings (no key needed)
//   - summary-north   summary for North Island (uses MetService API key)
//
// Body shape:  POST { resource: string }
// Returns:     { data, fetchedAt, expiresAt, source: 'cache'|'upstream'|'fallback' }

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function withCors(body: BodyInit | null, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const METSERVICE_KEY = Deno.env.get('METSERVICE_API_KEY') ?? ''

// Resource catalog. Each entry knows how to fetch itself, its TTL, and a
// fallback payload if the upstream is unavailable.
interface ResourceDef {
  ttlSeconds: number
  fetch: () => Promise<{ data: unknown; status: number }>
  fallback: unknown
}

// MetService town forecast endpoints use the pattern
//   https://www.metservice.com/publicData/localForecast{slug}
// where {slug} is the camelCase town name. This returns rich structured JSON
// with forecast days, part-day data, riseSet info, etc. No auth needed.
const TOWN_URL = (slug: string) =>
  `https://www.metservice.com/publicData/localForecast${slug}`

const UA = { 'User-Agent': 'CycloneVaianuDashboard/1.0 (+dashboard)' }

const RESOURCES: Record<string, ResourceDef> = {
  // MetService's public severe weather warning endpoint. Returns a rich
  // payload with highestWarnLevel, mainText (HTML), hasWarning, etc. This is
  // the actual data source behind metservice.com/warnings.
  warnings: {
    ttlSeconds: 300,
    fetch: async () => {
      const res = await fetch(
        'https://www.metservice.com/publicData/severeWeatherWarning',
        { headers: UA },
      )
      const data = res.ok ? await res.json() : null
      return { data, status: res.status }
    },
    fallback: null,
  },

  // Per-town local forecast for each cyclone-impact region. Each returns the
  // full "days" array plus issue time. We combine them into one payload.
  'forecast-north': {
    ttlSeconds: 600,
    fetch: async () => {
      const towns = [
        { slug: 'auckland', name: 'Auckland' },
        { slug: 'whangarei', name: 'Whangarei' },
        { slug: 'hamilton', name: 'Hamilton' },
        { slug: 'tauranga', name: 'Tauranga' },
        { slug: 'rotorua', name: 'Rotorua' },
        { slug: 'gisborne', name: 'Gisborne' },
        { slug: 'napier', name: 'Napier' },
        { slug: 'newPlymouth', name: 'New Plymouth' },
      ]
      const results = await Promise.all(
        towns.map(async (t) => {
          try {
            const res = await fetch(TOWN_URL(t.slug), { headers: UA })
            if (!res.ok) return { ...t, error: res.status, days: [] }
            const payload = (await res.json()) as {
              days?: unknown[]
              issuedAt?: string
            }
            return {
              slug: t.slug,
              name: t.name,
              issuedAt: payload.issuedAt ?? null,
              days: Array.isArray(payload.days) ? payload.days : [],
            }
          } catch (err) {
            return {
              ...t,
              error: err instanceof Error ? err.message : 'fetch failed',
              days: [],
            }
          }
        }),
      )
      return { data: { towns: results }, status: 200 }
    },
    fallback: { towns: [] },
  },

  // Authenticated endpoint — uses the MetService API key if present.
  // The exact URL depends on the user's MetService contract.
  'summary-north': {
    ttlSeconds: 600,
    fetch: async () => {
      if (!METSERVICE_KEY) {
        return { data: null, status: 401 }
      }
      const res = await fetch(
        'https://api.metservice.com/v1/observation/north-island',
        {
          headers: {
            ...UA,
            Authorization: `Bearer ${METSERVICE_KEY}`,
            Accept: 'application/json',
          },
        },
      )
      const data = res.ok ? await res.json() : null
      return { data, status: res.status }
    },
    fallback: null,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { resource } = (await req.json().catch(() => ({}))) as {
      resource?: string
    }
    if (!resource || !(resource in RESOURCES)) {
      return withCors(
        JSON.stringify({ error: 'Unknown resource', available: Object.keys(RESOURCES) }),
        { status: 400 },
      )
    }

    const def = RESOURCES[resource]
    const now = new Date()

    // 1. Try the cache.
    const { data: cached } = await supabase
      .from('metservice_cache')
      .select('*')
      .eq('resource', resource)
      .maybeSingle()

    if (cached && new Date(cached.expires_at) > now) {
      return withCors(
        JSON.stringify({
          data: cached.data,
          fetchedAt: cached.fetched_at,
          expiresAt: cached.expires_at,
          source: 'cache',
        }),
      )
    }

    // 2. Fetch fresh.
    let upstream: { data: unknown; status: number }
    try {
      upstream = await def.fetch()
    } catch (err) {
      console.error(`upstream fetch failed for ${resource}`, err)
      upstream = { data: null, status: 599 }
    }

    // 3. If upstream failed but we have stale cache, serve it. Otherwise
    //    serve the fallback.
    if (upstream.data === null) {
      if (cached) {
        return withCors(
          JSON.stringify({
            data: cached.data,
            fetchedAt: cached.fetched_at,
            expiresAt: cached.expires_at,
            source: 'cache-stale',
            upstreamStatus: upstream.status,
          }),
        )
      }
      return withCors(
        JSON.stringify({
          data: def.fallback,
          fetchedAt: now.toISOString(),
          expiresAt: now.toISOString(),
          source: 'fallback',
          upstreamStatus: upstream.status,
        }),
      )
    }

    // 4. Persist and return.
    const expiresAt = new Date(now.getTime() + def.ttlSeconds * 1000)
    await supabase.from('metservice_cache').upsert({
      resource,
      fetched_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      data: upstream.data,
      source_status: upstream.status,
    })

    return withCors(
      JSON.stringify({
        data: upstream.data,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        source: 'upstream',
      }),
    )
  } catch (err) {
    console.error('metservice handler error', err)
    return withCors(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      { status: 500 },
    )
  }
})
