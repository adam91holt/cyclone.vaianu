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

async function fetchRecentNews(): Promise<
  Array<{ source: string; title: string; summary: string | null; published_at: string | null }>
> {
  const { data } = await supabase
    .from('news_items')
    .select('source, title, summary, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(20)
  return data ?? []
}

async function fetchMetServiceWarnings(): Promise<
  Array<{
    warn_level: string | null
    event_type: string | null
    display_regions: string[] | null
    threat_start_time: string | null
    threat_end_time: string | null
    situation_headline: string | null
    situation_statement: string | null
    impact: string | null
  }>
> {
  const { data } = await supabase
    .from('metservice_warnings_national')
    .select(
      'warn_level, event_type, display_regions, threat_start_time, threat_end_time, situation_headline, situation_statement, impact',
    )
    .eq('is_active', true)
    .order('threat_start_time', { ascending: true, nullsFirst: false })
    .limit(10)
  return data ?? []
}

async function fetchLiveblog(): Promise<
  Array<{ headline: string | null; body: string | null; published_at: string | null }>
> {
  const { data } = await supabase
    .from('stuff_liveblog_posts')
    .select('headline, body, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(8)
  return data ?? []
}

// Reads social posts (X tweets + Facebook posts) that harvest-timeline has
// already pulled into timeline_events. These come from NZ official accounts —
// civil defence, police, transport, MetService, councils — via
// cyclone-api.thecolab.ai. Ground-truth, high-signal, and time-sensitive.
async function fetchRecentSocial(): Promise<
  Array<{
    platform: 'x' | 'facebook'
    handle: string | null
    author: string | null
    category: string | null
    text: string | null
    published_at: string
  }>
> {
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('timeline_events')
    .select('kind, title, source, occurred_at, metadata')
    .in('kind', ['tweet', 'fb_post'])
    .gte('occurred_at', cutoff)
    .order('occurred_at', { ascending: false })
    .limit(30)
  return (data ?? []).map((r) => {
    const meta = (r.metadata ?? {}) as {
      author_name?: string
      author_handle?: string
      author_category?: string
    }
    return {
      platform: r.kind === 'fb_post' ? ('facebook' as const) : ('x' as const),
      handle: meta.author_handle ?? r.source,
      author: meta.author_name ?? null,
      category: meta.author_category ?? null,
      text: r.title,
      published_at: r.occurred_at,
    }
  })
}

async function fetchNiwaForecast(): Promise<
  Array<{ date: string; forecast: string; wind: string | null; issued: string | null }>
> {
  const { data } = await supabase
    .from('niwa_forecast')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
  if (!data || data.length === 0) return []
  // Extract first few forecast days from the jsonb blob
  const row = data[0] as { forecast?: unknown; updated_at?: string }
  const fc = row.forecast
  if (!Array.isArray(fc)) return []
  return (fc as Array<Record<string, unknown>>).slice(0, 4).map((d) => ({
    date: String(d.date ?? d.day ?? ''),
    forecast: String(d.forecast ?? d.summary ?? d.description ?? ''),
    wind: d.wind ? String(d.wind) : null,
    issued: row.updated_at ?? null,
  }))
}

interface Ratings {
  seriousness: number
  weather_extremity: number
  public_safety_risk: number
  infrastructure_risk: number
  trajectory: 'intensifying' | 'steady' | 'weakening'
  rationale: string
}

interface LandfallEstimate {
  landfall_iso: string
  confidence: 'low' | 'medium' | 'high'
  region: string
  rationale: string
}

interface SummaryShape {
  headline: string
  summary: string
  severity: 'red' | 'orange' | 'yellow' | 'advisory'
  key_points: string[]
  ratings: Ratings
  landfall: LandfallEstimate
}

/** Server-side deterministic cyclone-centre estimate based on an MSL
 *  pressure minimum over a 6×6 grid covering the NZ tropical-cyclone
 *  zone. Updates every 15 minutes as Open-Meteo refreshes. */
interface CyclonePositionFix {
  lat: number
  lon: number
  pressure_hpa: number
  rationale: string
}

async function fetchCyclonePositionFromPressure(): Promise<CyclonePositionFix | null> {
  // Cartesian grid across the zone where Vaianu could plausibly sit —
  // north of NZ down through the North Island and just off the east
  // coast. 6×6 = 36 points, ~300km spacing, well under Open-Meteo's
  // per-request location limit.
  const lats = [-25, -28, -31, -34, -37, -40]
  const lons = [170, 172, 174, 176, 178, 180]
  const pairs: Array<[number, number]> = []
  for (const la of lats) for (const lo of lons) pairs.push([la, lo])
  const latStr = pairs.map((p) => p[0]).join(',')
  const lonStr = pairs.map((p) => p[1]).join(',')
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latStr}&longitude=${lonStr}&current=pressure_msl&timezone=UTC`

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`open-meteo pressure grid: http ${res.status}`)
    const payload = await res.json()
    const rows = Array.isArray(payload) ? payload : [payload]
    type Row = {
      latitude: number
      longitude: number
      current?: { pressure_msl?: number }
    }
    const typed = rows as Row[]
    let best: { lat: number; lon: number; p: number } | null = null
    for (const r of typed) {
      const p = r.current?.pressure_msl
      if (typeof p !== 'number' || !Number.isFinite(p)) continue
      if (!best || p < best.p) best = { lat: r.latitude, lon: r.longitude, p }
    }
    if (!best) return null

    // Centroid refinement: weighted average of the 4 lowest-pressure grid
    // points, using (1015 - pressure) as the weight. Pulls the fix toward
    // the true centre between grid nodes without overselling the precision.
    const sorted = typed
      .filter((r) => typeof r.current?.pressure_msl === 'number')
      .sort(
        (a, b) =>
          (a.current!.pressure_msl as number) - (b.current!.pressure_msl as number),
      )
      .slice(0, 4)
    let wLat = 0
    let wLon = 0
    let wSum = 0
    for (const r of sorted) {
      const p = r.current!.pressure_msl as number
      const w = Math.max(0, 1015 - p)
      wLat += r.latitude * w
      wLon += r.longitude * w
      wSum += w
    }
    const refinedLat = wSum > 0 ? wLat / wSum : best.lat
    const refinedLon = wSum > 0 ? wLon / wSum : best.lon

    return {
      lat: Number(refinedLat.toFixed(3)),
      lon: Number(refinedLon.toFixed(3)),
      pressure_hpa: Number(best.p.toFixed(1)),
      rationale: `Pressure minimum ${best.p.toFixed(1)} hPa at (${best.lat.toFixed(1)}, ${best.lon.toFixed(1)}) — Open-Meteo GFS grid, refined from 4 nearest nodes.`,
    }
  } catch (err) {
    console.warn('cyclone position fix failed', err)
    return null
  }
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
    const [regional, recentNews, warnings, liveblog, niwa, tweets, positionFix] =
      await Promise.all([
        fetchRegionalWeather(),
        fetchRecentNews(),
        fetchMetServiceWarnings(),
        fetchLiveblog(),
        fetchNiwaForecast(),
        fetchRecentSocial(),
        fetchCyclonePositionFromPressure(),
      ])

    const nowNzt = new Date().toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      dateStyle: 'full',
      timeStyle: 'short',
    })
    const nowIso = new Date().toISOString()

    const newsBlock =
      recentNews
        .map((n) => {
          const when = n.published_at
            ? new Date(n.published_at).toLocaleString('en-NZ', {
                timeZone: 'Pacific/Auckland',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'recent'
          const snippet = n.summary ? ` — ${n.summary.slice(0, 200)}` : ''
          return `- [${n.source} · ${when}] ${n.title}${snippet}`
        })
        .join('\n') || '(no recent items)'

    const warningsBlock =
      warnings
        .map((w) => {
          const period =
            w.threat_start_time && w.threat_end_time
              ? `${new Date(w.threat_start_time).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: '2-digit', minute: '2-digit' })} → ${new Date(w.threat_end_time).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', hour: '2-digit', minute: '2-digit' })}`
              : 'ongoing'
          const isoStart = w.threat_start_time
            ? new Date(w.threat_start_time).toISOString()
            : 'unknown'
          const regions = (w.display_regions ?? []).join(', ') || '—'
          const stmt = (w.situation_statement ?? '').slice(0, 400)
          return `- [${w.warn_level?.toUpperCase() ?? '—'} · ${w.event_type ?? '—'}] ${regions} (${period}) start_iso=${isoStart}${stmt ? `\n  ${stmt}` : ''}`
        })
        .join('\n') || '(no active warnings)'

    const liveblogBlock =
      liveblog
        .map((p) => {
          const when = p.published_at
            ? new Date(p.published_at).toLocaleString('en-NZ', {
                timeZone: 'Pacific/Auckland',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'recent'
          const body = (p.body ?? '').slice(0, 300)
          return `- [${when}] ${p.headline ?? ''}\n  ${body}`
        })
        .join('\n') || '(no liveblog posts)'

    const niwaBlock =
      niwa
        .map((d) => `- ${d.date}: ${d.forecast}${d.wind ? ` · wind ${d.wind}` : ''}`)
        .join('\n') || '(no NIWA forecast)'

    const tweetsBlock =
      tweets
        .map((t) => {
          const when = t.published_at
            ? new Date(t.published_at).toLocaleString('en-NZ', {
                timeZone: 'Pacific/Auckland',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'recent'
          const cat = t.category ? ` · ${t.category}` : ''
          const platform = t.platform === 'facebook' ? 'FB' : 'X'
          return `- [${when} · ${platform}${cat}] ${t.handle ?? ''}: ${t.text ?? ''}`
        })
        .join('\n') || '(no recent official social posts)'

    const prompt = `You are a concise, factual weather briefing writer for a public emergency dashboard covering Tropical Cyclone Vaianu — a Category 2 sub-tropical cyclone approaching the northeast coast of New Zealand's North Island.

Current time (NZST): ${nowNzt}
Current time (UTC ISO): ${nowIso}

LIVE REGIONAL WEATHER (Open-Meteo):
${regional.map((r) => `- ${r.name} [${r.warning}]: wind ${r.wind_kmh}km/h, gusts ${r.gust_kmh}km/h, pressure ${r.pressure_hpa}hPa, rain ${r.precip_mm}mm/hr, ${r.temp_c}°C, ${r.humidity}% RH`).join('\n')}

ACTIVE METSERVICE WARNINGS (official NZ forecaster — these are the most authoritative source for landfall timing):
${warningsBlock}

NIWA MULTI-DAY FORECAST (government agency):
${niwaBlock}

STUFF LIVE BLOG (rolling coverage, most recent first):
${liveblogBlock}

SOCIAL — NZ OFFICIAL ACCOUNTS on X and Facebook (civil defence, police, transport, MetService, councils):
${tweetsBlock}

RECENT NEWS (RNZ, Stuff, NZH):
${newsBlock}

Your task: produce a situation report AND a best-guess landfall time estimate based on ALL the evidence above.

Respond with JSON in this exact shape:
{
  "headline": "12-word punchy headline, present tense",
  "summary": "2-3 sentence paragraph with the most important developments in the last 15 minutes. Name specific regions and numbers. Be factual, no speculation.",
  "severity": "red" | "orange" | "yellow" | "advisory",
  "key_points": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "ratings": {
    "seriousness": 1-10,
    "weather_extremity": 1-10,
    "public_safety_risk": 1-10,
    "infrastructure_risk": 1-10,
    "trajectory": "intensifying" | "steady" | "weakening",
    "rationale": "one sentence, <25 words, explaining the scores"
  },
  "landfall": {
    "landfall_iso": "ISO8601 UTC timestamp — your best estimate of when the cyclone's eye (or centre of damaging winds) reaches the NZ coast",
    "confidence": "low" | "medium" | "high",
    "region": "short label, e.g. 'Northland', 'Auckland / Coromandel'",
    "rationale": "one sentence explaining how you arrived at this — what source drove it"
  }
}

Rules for the briefing:
- key_points: exactly 4 short bullets, each under 15 words, covering: worst-hit region, wind/gust peaks, notable trend, immediate public advice.
- Use real numbers from the data above, not generic phrases.
- severity reflects the highest active warning level across regions.

Rules for the landfall estimate (CRITICAL — this drives a live countdown on the dashboard):
- "Landfall" for this dashboard means: when damaging cyclone conditions BEGIN at the coast — not the middle or peak of the warning, not the calm eye passing. The moment the red warning start_iso fires, landfall has effectively begun.
- DEFAULT RULE: find the earliest active RED warning (any event_type — wind, rain, swell) and COPY its start_iso value VERBATIM into landfall_iso. Do NOT round, shift, or "average" it with other warnings. Confidence: "high".
- If NO red warning is active, fall back to the earliest active ORANGE warning's start_iso. Confidence: "medium".
- Only deviate from the earliest red/orange start_iso if NIWA or news explicitly give an earlier landfall time — in that case use the earlier one and drop confidence to "medium".
- NEVER pick a landfall time LATER than the earliest active red warning's start_iso. The warning onset is your ceiling.
- The landfall_iso MUST be a real ISO8601 UTC timestamp (e.g. 2026-04-11T10:00:00Z). It MUST be in the future relative to "Current time (UTC ISO)" above unless landfall has already passed, in which case it may be in the past by at most 12 hours.
- "region" should name the primary impact zone (the place where the eye crosses the coast) — use the display_regions of the red warning you anchored to.
- In "rationale", name the specific warning you anchored to and its start_iso, e.g. "Anchored to RED wind warning upper-north start_iso=2026-04-11T10:00:00Z".

Rules for ratings (be calibrated, not inflated):
- 1-3 = normal weather, no meaningful risk
- 4-5 = heightened conditions, advisories in place
- 6-7 = significant cyclone impact, warnings active, disruption likely
- 8-9 = major emergency, widespread damage/evacuations expected
- 10 = catastrophic, unprecedented
- Ground every score in the numbers above. If gusts are under 60km/h region-wide, do NOT score weather_extremity above 5.

Return ONLY valid JSON, no markdown fences, no preamble.`

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

    // Normalize landfall estimate
    const rawLandfall = (parsed.landfall ?? {}) as Partial<LandfallEstimate>
    const landfallIsoRaw = typeof rawLandfall.landfall_iso === 'string' ? rawLandfall.landfall_iso : ''
    const landfallDate = landfallIsoRaw ? new Date(landfallIsoRaw) : null
    const landfallValid = landfallDate && !Number.isNaN(landfallDate.getTime())
    const landfallConfidence: LandfallEstimate['confidence'] =
      rawLandfall.confidence === 'high' || rawLandfall.confidence === 'low'
        ? rawLandfall.confidence
        : 'medium'
    const landfallEstimateIso = landfallValid ? landfallDate!.toISOString() : null
    const landfallRegion =
      typeof rawLandfall.region === 'string' && rawLandfall.region.trim()
        ? rawLandfall.region.trim().slice(0, 120)
        : null
    const landfallRationale =
      typeof rawLandfall.rationale === 'string' && rawLandfall.rationale.trim()
        ? rawLandfall.rationale.trim().slice(0, 400)
        : null

    // Save to DB
    const { data: saved, error: insertError } = await supabase
      .from('cyclone_summaries')
      .insert({
        headline: parsed.headline,
        summary: parsed.summary,
        severity: parsed.severity,
        key_points: parsed.key_points,
        regional_snapshot: {
          regions: regional,
          news_count: recentNews.length,
          warnings_count: warnings.length,
          liveblog_count: liveblog.length,
          niwa_days: niwa.length,
          tweets_count: tweets.length,
        },
        ratings,
        seriousness: ratings.seriousness,
        model: MODEL,
        landfall_estimate_iso: landfallEstimateIso,
        landfall_confidence: landfallEstimateIso ? landfallConfidence : null,
        landfall_region: landfallRegion,
        landfall_rationale: landfallRationale,
        cyclone_lat: positionFix?.lat ?? null,
        cyclone_lon: positionFix?.lon ?? null,
        cyclone_position_confidence: positionFix ? 'high' : null,
        cyclone_position_rationale: positionFix?.rationale ?? null,
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
