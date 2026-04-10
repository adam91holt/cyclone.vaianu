// Pull MetService localObs for all main North Island towns/cities and upsert
// to public.metservice_observations. Run by pg_cron every 10 minutes.
//
// MetService's publicData/localObs_{slug} endpoint returns a 3-hour rolling
// observation for each station — temperature, wind, pressure, and rainfall
// over the preceding 3 hours. Accurate, official, and free.

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

// Main North Island towns, ordered roughly north → south then across the
// impact band for the cyclone. Slugs match MetService's publicData naming
// (lowercase, hyphens for spaces).
// Only towns with an actual MetService localObs station.
// Dargaville and Thames return "No localObs station is defined for town" —
// dropped to keep the UI clean.
const TOWNS: Array<{ slug: string; name: string; order: number }> = [
  { slug: 'kerikeri', name: 'Kerikeri', order: 1 },
  { slug: 'whangarei', name: 'Whangārei', order: 2 },
  { slug: 'auckland', name: 'Auckland', order: 3 },
  { slug: 'hamilton', name: 'Hamilton', order: 4 },
  { slug: 'tauranga', name: 'Tauranga', order: 5 },
  { slug: 'whakatane', name: 'Whakatāne', order: 6 },
  { slug: 'rotorua', name: 'Rotorua', order: 7 },
  { slug: 'taupo', name: 'Taupō', order: 8 },
  { slug: 'gisborne', name: 'Gisborne', order: 9 },
  { slug: 'napier', name: 'Napier', order: 10 },
  { slug: 'hastings', name: 'Hastings', order: 11 },
  { slug: 'new-plymouth', name: 'New Plymouth', order: 12 },
  { slug: 'palmerston-north', name: 'Palmerston North', order: 13 },
  { slug: 'wellington', name: 'Wellington', order: 14 },
]

const UA = {
  'User-Agent': 'CycloneVaianuDashboard/1.0 (+dashboard)',
  Accept: 'application/json',
}

interface LocalObs {
  location?: string
  threeHour?: {
    dateTimeISO?: string
    rainfall?: string
    temp?: string | number
    windSpeed?: string | number
    windDirection?: string
    pressure?: number
    pressureTrend?: string
    humidity?: string | number
  }
  twentyFourHour?: {
    rainfall?: string
  }
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

async function fetchTown(
  slug: string,
): Promise<{ ok: true; data: LocalObs } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://www.metservice.com/publicData/localObs_${slug}`,
      { headers: UA },
    )
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const data = (await res.json()) as LocalObs
    return { ok: true, data }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const results = await Promise.all(
      TOWNS.map(async (town) => {
        const r = await fetchTown(town.slug)
        if (!r.ok) {
          console.warn(`metservice-obs: ${town.slug} failed: ${r.error}`)
          return { town, ok: false as const, error: r.error }
        }
        return { town, ok: true as const, data: r.data }
      }),
    )

    const rows = results
      .filter(
        (r): r is { town: (typeof TOWNS)[number]; ok: true; data: LocalObs } =>
          r.ok,
      )
      .map((r) => {
        const th = r.data.threeHour ?? {}
        const tf = r.data.twentyFourHour ?? {}
        return {
          town_slug: r.town.slug,
          town_name: r.town.name,
          display_order: r.town.order,
          station: r.data.location ?? null,
          obs_time: th.dateTimeISO ?? null,
          rainfall_3h_mm: toNumber(th.rainfall),
          rainfall_24h_mm: toNumber(tf.rainfall),
          temp_c: toNumber(th.temp),
          wind_speed_kmh: toNumber(th.windSpeed),
          wind_direction: th.windDirection ?? null,
          pressure_hpa: toNumber(th.pressure),
          pressure_trend: th.pressureTrend ?? null,
          humidity: toNumber(th.humidity),
          fetched_at: new Date().toISOString(),
        }
      })

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No towns returned data' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { error } = await supabase
      .from('metservice_observations')
      .upsert(rows, { onConflict: 'town_slug' })

    if (error) {
      console.error('metservice-obs upsert error', error)
      throw error
    }

    return new Response(
      JSON.stringify({
        ok: true,
        stored: rows.length,
        failed: results.filter((r) => !r.ok).length,
        failures: results
          .filter((r) => !r.ok)
          .map((r) => ({ town: r.town.slug, error: (r as { error: string }).error })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('metservice-obs error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
