// Ingest NEMA civil defence / Emergency Mobile Alerts into nema_alerts.
// Runs every 5 minutes via pg_cron. The upstream RSS only returns
// currently active alerts, so we upsert with last_seen_at — the read
// policy on nema_alerts filters by that to hide expired alerts.
//
// Normalisation is kept in sync with the `nema-alerts` proxy function;
// if you change the cleaning rules, update both.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/alerts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface RawAlert {
  title?: string
  link?: string
  description?: string
  pubDate?: string
  guid?: string
}

interface RawEnvelope {
  alerts?: RawAlert[]
}

interface NormalisedAlert {
  id: string
  title: string
  severity: 'red' | 'orange' | 'info'
  summary: string
  body: string
  link: string | null
  published_at: string | null
}

function cleanText(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function stripBoilerplate(body: string): string {
  const markers = [
    /FOR MORE INFORMATION[\s\S]*/i,
    /For further updates[\s\S]*/i,
    /STAY INFORMED[\s\S]*/i,
    /Listen to your local[\s\S]*/i,
    /Check on your neighbours[\s\S]*/i,
  ]
  let out = body
  for (const m of markers) out = out.replace(m, '')
  return out.trim()
}

function severityFor(title: string, body: string): 'red' | 'orange' | 'info' {
  const t = title.toUpperCase()
  const b = body.toUpperCase()
  if (
    t.includes('RED') ||
    t.includes('EVACUATION') ||
    t.includes('SEVERE WEATHER ALERT') ||
    t.includes('SEVERE WIND WARNING') ||
    b.includes('EVACUATE NOW')
  ) {
    return 'red'
  }
  if (t.includes('ORANGE') || t.includes('WARNING')) return 'orange'
  return 'info'
}

function normalise(a: RawAlert): NormalisedAlert | null {
  const title = cleanText(a.title || '')
  if (!title) return null
  const body = stripBoilerplate(cleanText(a.description || ''))
  const firstLine = body.split('\n').find((l) => l.trim().length > 0) || ''
  const summary = firstLine.length > 200 ? firstLine.slice(0, 200) + '…' : firstLine
  return {
    id: a.guid || a.link || title,
    title,
    severity: severityFor(title, body),
    summary,
    body,
    link: a.link || null,
    published_at: a.pubDate ? new Date(a.pubDate).toISOString() : null,
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
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`)
    const raw = (await res.json()) as RawEnvelope

    const alerts: NormalisedAlert[] = []
    for (const a of raw.alerts ?? []) {
      const n = normalise(a)
      if (n) alerts.push(n)
    }

    const now = new Date().toISOString()
    const rows = alerts.map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      summary: a.summary,
      body: a.body,
      link: a.link,
      published_at: a.published_at,
      last_seen_at: now,
    }))

    if (rows.length > 0) {
      const { error } = await supabase
        .from('nema_alerts')
        .upsert(rows, { onConflict: 'id' })
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
    console.error('ingest-nema-alerts failed', err)
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
