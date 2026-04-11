// Orchestrator for power outage ingestion. Calls each provider's adapter
// function in parallel, upserts the results into `power_outages`, marks
// any incident_id not in the latest feed as cleared (so we can still show
// "recently cleared" state on the map), and updates the summary table.
//
// Provider adapters each return `{ ok, count, outages[] }`. If a provider
// fails (ok: false), we DO NOT mark its rows as cleared — that would erase
// live state on a transient upstream blip. We only clear when the adapter
// reports ok:true AND an existing incident is missing from the new set.
//
// Counties Energy and Vector are routed through a thecolab.ai proxy —
// their direct endpoints block Deno edge runtime (AWS WAF TLS fingerprint
// and rejected public API key respectively).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const FUNCTIONS_BASE = `${Deno.env.get('SUPABASE_URL')!}/functions/v1`
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface IngestedOutage {
  provider: string
  incident_id: string
  service: string
  status: string
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

interface AdapterResponse {
  ok: boolean
  provider: string
  count: number
  error?: string
  outages?: IngestedOutage[]
}

const ADAPTERS = [
  'ingest-outages-northpower',
  'ingest-outages-wel',
  'ingest-outages-topenergy',
  'ingest-outages-counties',
  'ingest-outages-vector',
] as const

async function callAdapter(slug: string): Promise<AdapterResponse> {
  try {
    const res = await fetch(`${FUNCTIONS_BASE}/${slug}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    const json = (await res.json()) as AdapterResponse
    return json
  } catch (e) {
    console.error(`adapter ${slug} threw`, e)
    return {
      ok: false,
      provider: slug.replace('ingest-outages-', ''),
      count: 0,
      error: (e as Error).message,
    }
  }
}

async function upsertProvider(
  provider: string,
  outages: IngestedOutage[],
): Promise<{ upserted: number; cleared: number }> {
  const now = new Date().toISOString()

  // 1. Upsert rows. We use the natural key (provider, incident_id).
  const rows = outages.map((o) => ({
    provider: o.provider,
    incident_id: o.incident_id,
    service: o.service,
    status: o.status,
    title: o.title,
    cause: o.cause,
    start_time: o.start_time,
    end_time: o.end_time,
    restoration_hint: o.restoration_hint,
    notes: o.notes,
    customer_count: o.customer_count,
    localities: o.localities,
    equipment: o.equipment,
    region: o.region,
    geometry: o.geometry,
    centroid_lat: o.centroid_lat,
    centroid_lon: o.centroid_lon,
    last_seen_at: now,
    cleared_at: null,
  }))

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from('power_outages')
      .upsert(rows, {
        onConflict: 'provider,incident_id',
        ignoreDuplicates: false,
      })
    if (upsertError) {
      console.error(`upsert ${provider} error`, upsertError)
      throw upsertError
    }
  }

  // 2. Mark any row for this provider that wasn't in the latest feed as
  // cleared. We do this by finding ids in the DB whose last_seen_at < now
  // (i.e. didn't get updated above) and which aren't already cleared.
  const activeIds = rows.map((r) => r.incident_id)
  const { data: stale, error: staleError } = await supabase
    .from('power_outages')
    .select('incident_id')
    .eq('provider', provider)
    .is('cleared_at', null)
    .lt('last_seen_at', now)

  if (staleError) {
    console.error(`stale lookup ${provider} error`, staleError)
    throw staleError
  }

  const toClear = (stale ?? [])
    .map((r) => r.incident_id)
    .filter((id) => !activeIds.includes(id))

  if (toClear.length > 0) {
    const { error: clearError } = await supabase
      .from('power_outages')
      .update({ cleared_at: now })
      .eq('provider', provider)
      .in('incident_id', toClear)
    if (clearError) {
      console.error(`clear ${provider} error`, clearError)
      throw clearError
    }
  }

  return { upserted: rows.length, cleared: toClear.length }
}

async function refreshSummary(providersFailed: string[]) {
  const { data, error } = await supabase
    .from('power_outages')
    .select('provider, region, customer_count, status')
    .is('cleared_at', null)

  if (error) {
    console.error('summary query error', error)
    return
  }

  const rows = data ?? []
  const totalIncidents = rows.length
  const totalCustomers = rows.reduce(
    (sum, r) => sum + (r.customer_count ?? 0),
    0,
  )
  const byProvider: Record<
    string,
    { incidents: number; customers: number; unplanned: number }
  > = {}
  const byRegion: Record<
    string,
    { incidents: number; customers: number }
  > = {}
  for (const r of rows) {
    const p = r.provider as string
    byProvider[p] ??= { incidents: 0, customers: 0, unplanned: 0 }
    byProvider[p].incidents += 1
    byProvider[p].customers += r.customer_count ?? 0
    if (r.status === 'unplanned') byProvider[p].unplanned += 1

    const region = (r.region as string) ?? 'Unknown'
    byRegion[region] ??= { incidents: 0, customers: 0 }
    byRegion[region].incidents += 1
    byRegion[region].customers += r.customer_count ?? 0
  }

  const { error: summaryError } = await supabase
    .from('power_outages_summary')
    .upsert({
      id: 1,
      total_incidents: totalIncidents,
      total_customers: totalCustomers,
      by_provider: byProvider,
      by_region: byRegion,
      providers_failed: providersFailed,
      updated_at: new Date().toISOString(),
    })
  if (summaryError) {
    console.error('summary upsert error', summaryError)
  }
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

  const results = await Promise.all(ADAPTERS.map((slug) => callAdapter(slug)))

  const perProvider: Array<{
    provider: string
    ok: boolean
    count: number
    upserted: number
    cleared: number
    error?: string
  }> = []
  const providersFailed: string[] = []

  for (const result of results) {
    if (!result.ok) {
      perProvider.push({
        provider: result.provider,
        ok: false,
        count: 0,
        upserted: 0,
        cleared: 0,
        error: result.error,
      })
      providersFailed.push(result.provider)
      continue
    }
    try {
      const { upserted, cleared } = await upsertProvider(
        result.provider,
        result.outages ?? [],
      )
      perProvider.push({
        provider: result.provider,
        ok: true,
        count: result.count,
        upserted,
        cleared,
      })
    } catch (e) {
      perProvider.push({
        provider: result.provider,
        ok: false,
        count: result.count,
        upserted: 0,
        cleared: 0,
        error: (e as Error).message,
      })
      providersFailed.push(result.provider)
    }
  }

  await refreshSummary(providersFailed)

  return jsonResponse({
    ok: providersFailed.length === 0,
    providers: perProvider,
    providers_failed: providersFailed,
    ran_at: new Date().toISOString(),
  })
})
