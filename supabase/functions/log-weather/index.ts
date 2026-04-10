// Append a single row of current weather per impact region to
// weather_history. Designed to be invoked by pg_cron every 10 minutes.
// Uses Open-Meteo (free, no key, fast, reliable).

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

interface Region {
  name: string
  lat: number
  lon: number
}

const REGIONS: Region[] = [
  { name: 'Northland', lat: -35.73, lon: 174.32 },
  { name: 'Auckland', lat: -36.85, lon: 174.76 },
  { name: 'Coromandel', lat: -36.83, lon: 175.5 },
  { name: 'Bay of Plenty', lat: -37.69, lon: 176.16 },
  { name: 'Waikato', lat: -37.78, lon: 175.28 },
  { name: 'Gisborne', lat: -38.66, lon: 178.02 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const lats = REGIONS.map((r) => r.lat).join(',')
    const lons = REGIONS.map((r) => r.lon).join(',')
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl&wind_speed_unit=kmh&timezone=Pacific%2FAuckland`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
    const payload = await res.json()
    const rows = Array.isArray(payload) ? payload : [payload]

    const now = new Date().toISOString()
    const inserts = REGIONS.map((r, i) => {
      const c = rows[i].current
      return {
        region: r.name,
        recorded_at: now,
        wind_kmh: Number(c.wind_speed_10m),
        gust_kmh: Number(c.wind_gusts_10m),
        pressure_hpa: Number(c.pressure_msl),
        temp_c: Number(c.temperature_2m),
        humidity: Math.round(Number(c.relative_humidity_2m)),
        precip_mm: Number(c.precipitation),
      }
    })

    const { error } = await supabase.from('weather_history').insert(inserts)
    if (error) throw error

    // Keep the table bounded. Failures here are non-fatal.
    try {
      await supabase.rpc('prune_weather_history')
    } catch (_err) {
      // ignore
    }

    return new Response(
      JSON.stringify({ ok: true, inserted: inserts.length, at: now }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('log-weather error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
