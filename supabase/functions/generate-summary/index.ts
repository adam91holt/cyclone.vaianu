// Generate an AI situation report for Cyclone Vaianu.
// Fetches live weather for impact regions from Open-Meteo, passes everything
// to Claude Sonnet 4.6, and writes the structured result to cyclone_summaries.
//
// Designed to be called by pg_cron every 15 minutes. Also callable manually.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

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

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

interface Region {
  id: string
  name: string
  lat: number
  lon: number
  warning: string
}

const REGIONS: Region[] = [
  { id: 'northland', name: 'Northland', lat: -35.73, lon: 174.32, warning: 'RED' },
  { id: 'auckland', name: 'Auckland', lat: -36.85, lon: 174.76, warning: 'RED' },
  { id: 'coromandel', name: 'Coromandel', lat: -36.83, lon: 175.5, warning: 'RED' },
  { id: 'bay_of_plenty', name: 'Bay of Plenty', lat: -37.69, lon: 176.16, warning: 'ORANGE' },
  { id: 'waikato', name: 'Waikato', lat: -37.78, lon: 175.28, warning: 'ORANGE' },
  { id: 'gisborne', name: 'Gisborne', lat: -38.66, lon: 178.02, warning: 'YELLOW' },
]

interface RegionSnapshot {
  name: string
  warning: string
  wind_kmh: number
  gust_kmh: number
  pressure_hpa: number
  precip_mm: number
  temp_c: number
  humidity: number
}

async function fetchRegionalWeather(): Promise<RegionSnapshot[]> {
  const lats = REGIONS.map((r) => r.lat).join(',')
  const lons = REGIONS.map((r) => r.lon).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl&wind_speed_unit=kmh&timezone=Pacific%2FAuckland`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo fetch failed: ${res.status}`)
  const payload = await res.json()
  const rows = Array.isArray(payload) ? payload : [payload]

  return REGIONS.map((r, i) => {
    const c = rows[i].current
    return {
      name: r.name,
      warning: r.warning,
      wind_kmh: Math.round(c.wind_speed_10m),
      gust_kmh: Math.round(c.wind_gusts_10m),
      pressure_hpa: Math.round(c.pressure_msl),
      precip_mm: Number(c.precipitation.toFixed(1)),
      temp_c: Math.round(c.temperature_2m),
      humidity: Math.round(c.relative_humidity_2m),
    }
  })
}

async function fetchRecentNews(): Promise<Array<{ source: string; title: string }>> {
  const { data } = await supabase
    .from('news_items')
    .select('source, title')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(10)
  return data ?? []
}

interface Ratings {
  seriousness: number
  weather_extremity: number
  public_safety_risk: number
  infrastructure_risk: number
  trajectory: 'intensifying' | 'steady' | 'weakening'
  rationale: string
}

interface SummaryShape {
  headline: string
  summary: string
  severity: 'red' | 'orange' | 'yellow' | 'advisory'
  key_points: string[]
  ratings: Ratings
}

const MODEL = 'claude-sonnet-4-6'

function clamp(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(10, Math.round(v)))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const regional = await fetchRegionalWeather()
    const recentNews = await fetchRecentNews()

    const nowNzt = new Date().toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      dateStyle: 'full',
      timeStyle: 'short',
    })

    const prompt = `You are a concise, factual weather briefing writer for a public emergency dashboard covering Cyclone Vaianu.

Cyclone Vaianu is a Category 2 sub-tropical cyclone approaching the northeast coast of New Zealand. Landfall is forecast between Auckland and Coromandel at around 06:00 NZST on Sunday 12 April 2026.

Current time: ${nowNzt}

LIVE WEATHER (per region, from Open-Meteo):
${regional.map((r) => `- ${r.name} [${r.warning}]: wind ${r.wind_kmh}km/h, gusts ${r.gust_kmh}km/h, pressure ${r.pressure_hpa}hPa, rain ${r.precip_mm}mm/hr, ${r.temp_c}°C, ${r.humidity}% RH`).join('\n')}

RECENT NEWS HEADLINES:
${recentNews.map((n) => `- ${n.source}: ${n.title}`).join('\n') || '(no recent items)'}

Write a situation report as JSON with this exact shape:
{
  "headline": "12-word punchy headline, present tense",
  "summary": "2-3 sentence paragraph with the most important developments in the last 15 minutes. Name specific regions and numbers. Be factual, no speculation.",
  "severity": "red" | "orange" | "yellow" | "advisory",
  "key_points": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "ratings": {
    "seriousness": 1-10,          // overall gravity of the emergency right now
    "weather_extremity": 1-10,    // raw meteorological intensity (winds, rain, pressure)
    "public_safety_risk": 1-10,   // risk to people: evacuations, injury, stranded
    "infrastructure_risk": 1-10,  // risk to roads, power, buildings, ports
    "trajectory": "intensifying" | "steady" | "weakening",
    "rationale": "one sentence, <25 words, explaining the scores"
  }
}

Rules for the briefing:
- key_points: exactly 4 short bullets, each under 15 words, covering: worst-hit region, wind/gust peaks, notable trend, immediate public advice.
- Use real numbers from the data above, not generic phrases.
- severity reflects the highest active warning level across regions.

Rules for the ratings (CRITICAL — be calibrated, not inflated):
- 1-3 = normal weather, no meaningful risk
- 4-5 = heightened conditions, advisories in place
- 6-7 = significant cyclone impact, warnings active, disruption likely
- 8-9 = major emergency, widespread damage/evacuations expected
- 10 = catastrophic, unprecedented
- Ground every score in the numbers above. If gusts are under 60km/h region-wide, do NOT score weather_extremity above 5.
- Return ONLY valid JSON, no markdown fences, no preamble.`

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1536,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('')

    // Parse JSON out of the response, tolerating code fences.
    let jsonText = text.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '')
    }

    let parsed: SummaryShape
    try {
      parsed = JSON.parse(jsonText)
    } catch (err) {
      console.error('failed to parse summary JSON', text)
      throw new Error(`Claude returned non-JSON: ${err instanceof Error ? err.message : err}`)
    }

    // Normalize ratings — clamp to 1-10, ensure trajectory is valid.
    const rawRatings = (parsed.ratings ?? {}) as Partial<Ratings>
    const trajectory: Ratings['trajectory'] =
      rawRatings.trajectory === 'intensifying' ||
      rawRatings.trajectory === 'weakening' ||
      rawRatings.trajectory === 'steady'
        ? rawRatings.trajectory
        : 'steady'

    const ratings: Ratings = {
      seriousness: clamp(rawRatings.seriousness),
      weather_extremity: clamp(rawRatings.weather_extremity),
      public_safety_risk: clamp(rawRatings.public_safety_risk),
      infrastructure_risk: clamp(rawRatings.infrastructure_risk),
      trajectory,
      rationale:
        typeof rawRatings.rationale === 'string' && rawRatings.rationale.trim()
          ? rawRatings.rationale.trim().slice(0, 240)
          : '',
    }

    // Save to DB
    const { data: saved, error: insertError } = await supabase
      .from('cyclone_summaries')
      .insert({
        headline: parsed.headline,
        summary: parsed.summary,
        severity: parsed.severity,
        key_points: parsed.key_points,
        regional_snapshot: { regions: regional, news_count: recentNews.length },
        ratings,
        seriousness: ratings.seriousness,
        model: MODEL,
      })
      .select()
      .single()

    if (insertError) {
      console.error('insert error', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ ok: true, summary: saved }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate-summary error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
