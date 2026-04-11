// NEMA civil defence / Emergency Mobile Alert feed.
//
// Proxies https://cyclone-api.thecolab.ai/alerts (which in turn pulls the
// NEMA alerthub RSS) so the browser can hit it without CORS headaches.
// We do light normalisation: strip the giant "Also listen to ZB / stay
// tuned to the radio" boilerplate, collapse whitespace, and keep only the
// fields the UI uses.

const SOURCE_URL = 'https://cyclone-api.thecolab.ai/alerts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface RawAlert {
  title?: string
  link?: string
  description?: string
  pubDate?: string
  guid?: string
}

interface RawEnvelope {
  source?: string
  channel?: string
  lastBuildDate?: string
  count?: number
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

// NEMA alerts end with a big boilerplate block about listening to ZB,
// checking neighbours, etc. That's fine on a phone alert but clutter here.
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
  // "RED SEVERE WIND WARNING", "EVACUATION", any severe weather alert
  // from NEMA is treated as red — these are Emergency Mobile Alert
  // level broadcasts, not informational updates.
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
  // Use the first sentence / first line as a short summary.
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

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=30',
      ...(init.headers ?? {}),
    },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const res = await fetch(SOURCE_URL, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`upstream HTTP ${res.status}`)
    }
    const raw = (await res.json()) as RawEnvelope
    const alerts: NormalisedAlert[] = []
    for (const a of raw.alerts ?? []) {
      const n = normalise(a)
      if (n) alerts.push(n)
    }
    // Sort newest first — NEMA already does this but be defensive.
    alerts.sort((a, b) => {
      const ta = a.published_at ? Date.parse(a.published_at) : 0
      const tb = b.published_at ? Date.parse(b.published_at) : 0
      return tb - ta
    })
    return jsonResponse({
      ok: true,
      channel: raw.channel ?? 'NZ Emergency Mobile Alert feed',
      last_build_date: raw.lastBuildDate ?? null,
      count: alerts.length,
      alerts,
    })
  } catch (e) {
    console.error('nema-alerts failed', e)
    return jsonResponse(
      {
        ok: false,
        error: (e as Error).message,
        alerts: [],
        count: 0,
      },
      { status: 200 },
    )
  }
})
