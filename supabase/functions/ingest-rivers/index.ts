// Ingest river levels (Stage measurement) from the cyclone-api rivers feed.
// Runs every 10 minutes via pg_cron. For each of the 10 regional councils:
//   1. Fetch the site catalog and filter to named sites with coordinates
//      (the upstream returns a lot of raw sensor IDs like "100042" that
//      have no meaningful location — skip them).
//   2. Fetch the last PT2H of readings for every site in parallel with a
//      bounded concurrency pool (upstream + edge function tolerate this).
//   3. Upsert readings into river_readings (dedupe on composite key).
//   4. Upsert the latest value / unit / coords onto river_sites.
//
// Timestamps come back as Pacific/Auckland wall time without a timezone
// suffix (e.g. "2026-04-11T13:40:00"). We attach +12:00 before converting
// to UTC — NZ is on NZST from early April to late September and the
// dashboard only cares about cyclone-season data, so this is good enough.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SOURCE = 'https://cyclone-api.thecolab.ai'

const COUNCILS = [
  'northland',
  'taranaki',
  'horizons',
  'gisborne',
  'hawkesbay',
  'wellington',
  'marlborough',
  'tasman',
  'nelson',
  'westcoast',
] as const

// How many concurrent /rivers/data requests per council. Each request is
// ~0.8s upstream; 25 keeps the whole ingest under ~2 minutes even for
// Wellington (656 sites) which is the biggest by far.
const CONCURRENCY = 25

// Any site whose name is purely numeric (e.g. "100042", "1146644") is a
// raw sensor with no location context — drop it.
const NUMERIC_NAME = /^[\d.]+$/

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface RawSite {
  name: string
  latitude: number | null
  longitude: number | null
}

interface RawReading {
  timestamp: string
  value: number | null
}

interface RawSiteData {
  council: string
  councilName: string
  site: string
  measurement: string
  unit: string | null
  count: number
  readings: RawReading[]
}

interface ReadingRow {
  council: string
  site: string
  measurement: string
  ts: string
  value: number | null
}

interface SiteUpsert {
  council: string
  name: string
  measurement: string
  council_name: string | null
  latitude: number | null
  longitude: number | null
  unit: string | null
  latest_value: number | null
  latest_ts: string | null
  last_fetched_at: string
}

// Treat upstream wall-clock time as NZST (UTC+12). Good enough for April
// cyclone season; would drift by an hour around DST transitions but those
// don't fall in the cyclone window.
function nzLocalToUtc(localIso: string): string | null {
  try {
    const d = new Date(localIso + '+12:00')
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

async function fetchCatalog(
  council: string,
): Promise<{ councilName: string; sites: RawSite[] } | null> {
  try {
    const res = await fetch(
      `${SOURCE}/rivers?council=${council}&measurement=Stage`,
      { signal: AbortSignal.timeout(15_000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const sites = (data.sites ?? []).filter(
      (s: RawSite) =>
        s.latitude !== null &&
        s.longitude !== null &&
        typeof s.name === 'string' &&
        s.name.trim().length > 0 &&
        !NUMERIC_NAME.test(s.name.trim()),
    )
    return { councilName: data.councilName ?? council, sites }
  } catch {
    return null
  }
}

async function fetchSiteData(
  council: string,
  site: string,
): Promise<RawSiteData | null> {
  try {
    const url = `${SOURCE}/rivers/data?council=${council}&site=${encodeURIComponent(site)}&measurement=Stage&interval=PT2H/now`
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) return null
    return (await res.json()) as RawSiteData
  } catch {
    return null
  }
}

// Simple concurrency pool — runs `fn` over `items` with at most `limit`
// outstanding promises at a time.
async function pool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const executing = new Set<Promise<void>>()
  for (const item of items) {
    const p = fn(item).finally(() => {
      executing.delete(p)
    })
    executing.add(p)
    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }
  await Promise.all(executing)
}

async function ingestCouncil(council: string): Promise<{
  council: string
  sites: number
  readings: number
  ok: boolean
  ms: number
}> {
  const started = Date.now()
  const catalog = await fetchCatalog(council)
  if (!catalog) {
    return { council, sites: 0, readings: 0, ok: false, ms: Date.now() - started }
  }

  const readings: ReadingRow[] = []
  const siteUpserts: SiteUpsert[] = []
  const now = new Date().toISOString()

  await pool(catalog.sites, CONCURRENCY, async (site) => {
    const data = await fetchSiteData(council, site.name)
    if (!data || !Array.isArray(data.readings)) return

    for (const r of data.readings) {
      const utc = nzLocalToUtc(r.timestamp)
      if (!utc) continue
      readings.push({
        council,
        site: site.name,
        measurement: 'Stage',
        ts: utc,
        value: r.value,
      })
    }

    const last = data.readings
      .filter((r) => r.value !== null)
      .at(-1) ?? data.readings.at(-1)

    siteUpserts.push({
      council,
      name: site.name,
      measurement: 'Stage',
      council_name: data.councilName ?? catalog.councilName,
      latitude: site.latitude,
      longitude: site.longitude,
      unit: data.unit ?? null,
      latest_value: last?.value ?? null,
      latest_ts: last ? nzLocalToUtc(last.timestamp) : null,
      last_fetched_at: now,
    })
  })

  // Batch insert readings. Supabase has a payload limit — chunk to be safe.
  const CHUNK = 1000
  for (let i = 0; i < readings.length; i += CHUNK) {
    const { error } = await supabase
      .from('river_readings')
      .upsert(readings.slice(i, i + CHUNK), {
        onConflict: 'council,site,measurement,ts',
      })
    if (error) {
      console.error(`[${council}] readings upsert error:`, error.message)
    }
  }

  for (let i = 0; i < siteUpserts.length; i += CHUNK) {
    const { error } = await supabase
      .from('river_sites')
      .upsert(siteUpserts.slice(i, i + CHUNK), {
        onConflict: 'council,name,measurement',
      })
    if (error) {
      console.error(`[${council}] sites upsert error:`, error.message)
    }
  }

  return {
    council,
    sites: siteUpserts.length,
    readings: readings.length,
    ok: true,
    ms: Date.now() - started,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const started = Date.now()
  const results: Awaited<ReturnType<typeof ingestCouncil>>[] = []

  // Run councils sequentially so we don't blow the concurrency budget;
  // each council already parallelises its own sites internally.
  for (const c of COUNCILS) {
    try {
      results.push(await ingestCouncil(c))
    } catch (err) {
      console.error(`[${c}] unhandled error:`, err)
      results.push({ council: c, sites: 0, readings: 0, ok: false, ms: 0 })
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      councils_ok: acc.councils_ok + (r.ok ? 1 : 0),
      sites: acc.sites + r.sites,
      readings: acc.readings + r.readings,
    }),
    { councils_ok: 0, sites: 0, readings: 0 },
  )

  return new Response(
    JSON.stringify({
      ok: true,
      ...totals,
      duration_ms: Date.now() - started,
      by_council: results,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
