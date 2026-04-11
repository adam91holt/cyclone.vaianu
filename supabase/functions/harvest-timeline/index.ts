// Harvest a notable-event timeline from all cached source tables.
// Runs every 5 minutes via pg_cron. Upserts into timeline_events with a
// stable event_key so the same underlying event (same NEMA alert, same
// MetService warning, same outage incident) is one row — not a new one
// every harvest pass.
//
// What counts as "notable"?
//  - NEMA civil-defence alerts (all)
//  - MetService red / orange warnings
//  - NZTA road closures (unplanned only)
//  - Power outages affecting > 500 customers
//  - Stuff liveblog posts (rolling coverage)
//  - News items covering the cyclone (from rss_feeds)
//
// We intentionally do NOT include the hourly AI cyclone reports here —
// those appear in the AIBriefing card at the top of the page and would
// just spam the timeline with the same summary every 15 minutes.

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

interface TimelineRow {
  event_key: string
  kind: string
  severity: string
  title: string
  body: string | null
  link: string | null
  source: string | null
  region: string | null
  occurred_at: string
  metadata: Record<string, unknown> | null
  last_seen_at: string
}

function truncate(s: string | null | undefined, n: number): string | null {
  if (!s) return null
  const t = s.trim()
  if (!t) return null
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

// Some upstream sources (Stuff liveblog in particular) ship HTML-entity-
// encoded apostrophes and quotes through their JSON-LD, e.g.
//   "We&#x27;re so close to the ocean"
// Decode on our way in so the timeline reads cleanly.
function decodeEntities(s: string | null | undefined): string | null {
  if (!s) return s ?? null
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
}

// --- NEMA alerts -------------------------------------------------------
async function harvestNema(now: string): Promise<TimelineRow[]> {
  const { data, error } = await supabase
    .from('nema_alerts')
    .select('id, title, severity, summary, body, link, published_at, first_seen_at')
  if (error) throw new Error(`nema: ${error.message}`)
  return (data ?? []).map((r) => ({
    event_key: `nema:${r.id}`,
    kind: 'nema_alert',
    severity: r.severity === 'red' ? 'red' : r.severity === 'orange' ? 'orange' : 'info',
    title: r.title,
    body: truncate(r.body ?? r.summary, 600),
    link: r.link,
    source: 'NEMA Civil Defence',
    region: null,
    occurred_at: r.published_at ?? r.first_seen_at ?? now,
    metadata: { severity: r.severity },
    last_seen_at: now,
  }))
}

// --- MetService warnings (red + orange only) ---------------------------
// We use `issued_at` as the timeline timestamp — "when did the warning get
// published" — not `threat_start_time`, because the latter is often in the
// future (the forecast period) and the timeline is for things that already
// happened.
async function harvestWarnings(now: string): Promise<TimelineRow[]> {
  const { data, error } = await supabase
    .from('metservice_warnings_national')
    .select(
      'cap_id, warn_level, event_type, display_regions, situation_headline, situation_statement, issued_at, fetched_at, is_active',
    )
    .eq('is_active', true)
    .in('warn_level', ['red', 'orange'])
  if (error) throw new Error(`warnings: ${error.message}`)
  return (data ?? [])
    .filter((r) => r.cap_id)
    .map((r) => {
      const regions = (r.display_regions as string[] | null)?.join(', ') ?? null
      const level = (r.warn_level ?? 'orange').toLowerCase()
      const title =
        r.situation_headline ||
        `${r.event_type ?? 'Weather'} ${level.toUpperCase()}${regions ? ` — ${regions}` : ''}`
      return {
        event_key: `warn:${r.cap_id}`,
        kind: 'warning',
        severity: level === 'red' ? 'red' : 'orange',
        title,
        body: truncate(r.situation_statement, 600),
        link: null,
        source: 'MetService',
        region: regions,
        occurred_at: r.issued_at ?? r.fetched_at ?? now,
        metadata: { event_type: r.event_type, warn_level: r.warn_level },
        last_seen_at: now,
      }
    })
}

// --- NZTA road closures -------------------------------------------------
// Planned closures (roadworks etc.) are not news — they're scheduled. Skip
// them. For unplanned closures, the timeline moment is "when this became
// current" — first_seen_at is a safer proxy than start_date, which can
// sometimes drift into the future when NZTA re-issues an event.
async function harvestRoadClosures(now: string): Promise<TimelineRow[]> {
  const nowMs = Date.now()
  const { data, error } = await supabase
    .from('nzta_road_events')
    .select(
      'id, event_type, description, impact, highway, location, region, island, severity, planned, start_date, first_seen_at',
    )
    .eq('severity', 'closed')
    .eq('planned', false)
  if (error) throw new Error(`roads: ${error.message}`)
  return (data ?? []).map((r) => {
    const where = [r.highway, r.location].filter(Boolean).join(' · ') || 'State highway'
    const title = `${where} closed${r.event_type ? ` — ${r.event_type}` : ''}`
    const startMs = r.start_date ? Date.parse(r.start_date) : NaN
    // Prefer start_date only if it's in the past; otherwise first_seen_at.
    const occurredAt =
      Number.isFinite(startMs) && startMs <= nowMs
        ? r.start_date!
        : r.first_seen_at ?? now
    return {
      event_key: `road:${r.id}`,
      kind: 'road_closure',
      severity: 'red',
      title,
      body: truncate(r.description ?? r.impact, 500),
      link: null,
      source: 'NZTA',
      region: r.region ?? r.island ?? null,
      occurred_at: occurredAt,
      metadata: { impact: r.impact },
      last_seen_at: now,
    }
  })
}

// --- Large power outages ------------------------------------------------
// Same "is this in the past" clamp as road closures. Some providers report
// outages with a planned start_time in the future (scheduled maintenance).
// Those don't belong on a "what's happening now" timeline.
async function harvestOutages(now: string): Promise<TimelineRow[]> {
  const nowMs = Date.now()
  const { data, error } = await supabase
    .from('power_outages')
    .select(
      'incident_id, provider, title, cause, status, customer_count, localities, region, start_time, first_seen_at, cleared_at',
    )
    .is('cleared_at', null)
    .gte('customer_count', 500)
    .order('customer_count', { ascending: false })
  if (error) throw new Error(`outages: ${error.message}`)
  return (data ?? [])
    .map((r) => {
      const where =
        r.region ||
        (Array.isArray(r.localities) && r.localities.length > 0
          ? (r.localities as string[]).slice(0, 3).join(', ')
          : null) ||
        'NZ'
      const count = r.customer_count ?? 0
      const title = `${count.toLocaleString()} customers off power — ${where}`
      const startMs = r.start_time ? Date.parse(r.start_time) : NaN
      const occurredAt =
        Number.isFinite(startMs) && startMs <= nowMs
          ? r.start_time!
          : r.first_seen_at ?? now
      return {
        event_key: `outage:${r.provider}:${r.incident_id}`,
        kind: 'outage' as const,
        severity: count >= 5000 ? 'red' : count >= 2000 ? 'orange' : 'info',
        title,
        body: truncate(r.cause ?? r.title, 400),
        link: null,
        source: r.provider ?? 'Lines Co',
        region: r.region,
        occurred_at: occurredAt,
        metadata: { customer_count: count, status: r.status },
        last_seen_at: now,
      }
    })
}

// --- Recent news items (RNZ, Stuff, NZH) -------------------------------
async function harvestNews(now: string): Promise<TimelineRow[]> {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('news_items')
    .select('id, source, title, url, summary, published_at, image_url')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(30)
  if (error) throw new Error(`news: ${error.message}`)
  return (data ?? [])
    .filter((r) => r.title && r.published_at)
    .map((r) => ({
      event_key: `news:${r.id}`,
      kind: 'news' as const,
      severity: 'info',
      title: decodeEntities(r.title)!,
      body: truncate(decodeEntities(r.summary), 500),
      link: r.url,
      source: r.source ?? 'News',
      region: null,
      occurred_at: r.published_at!,
      metadata: r.image_url ? { image_url: r.image_url } : null,
      last_seen_at: now,
    }))
}

// --- X / Twitter feed from NZ official accounts ------------------------
// cyclone-api.thecolab.ai aggregates posts from ~13 NZ weather / emergency /
// transport / police accounts. We only include tweets from authoritative
// accounts (civil defence, police, transport, MetService). For tweets we
// don't bother storing body — the text is short enough to fit in title and
// the link goes to X for the full thread/media.
interface ColabTweetMedia {
  type?: string
  url?: string
  thumbnail?: string
}

interface ColabTweet {
  id: string
  author: {
    handle: string
    name: string
    category: string
  }
  created_at: string
  text: string
  url: string
  is_reply: boolean
  engagement?: { likes?: number; retweets?: number; views?: number }
  media?: ColabTweetMedia[]
}

const TWEET_SEVERITY: Record<string, string> = {
  civil_defence: 'yellow',
  regional_cdem: 'yellow',
  police: 'yellow',
  transport: 'info',
  weather: 'info',
}

async function harvestTweets(now: string): Promise<TimelineRow[]> {
  const res = await fetch('https://cyclone-api.thecolab.ai/timeline?hours=48', {
    headers: { 'User-Agent': 'vaianu-dashboard/1.0' },
  })
  if (!res.ok) throw new Error(`tweets: http ${res.status}`)
  const body = (await res.json()) as { items?: ColabTweet[] }
  const items = body.items ?? []
  const nowMs = Date.now()

  return items
    .filter((t) => !t.is_reply && t.text && t.created_at)
    .filter((t) => {
      const ms = Date.parse(t.created_at)
      return Number.isFinite(ms) && ms <= nowMs + 60_000
    })
    .map((t) => {
      const severity = TWEET_SEVERITY[t.author.category] ?? 'info'
      // Trim the X-style URL shorteners and pic.twitter links out of the title
      // so the feed looks clean — the full thread is one click away.
      const cleanText = t.text
        .replace(/https:\/\/t\.co\/\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      // Keep only media with a usable thumbnail we can render; videos/GIFs
      // from the API include a thumbnail frame, so this works for all types.
      const media =
        t.media
          ?.filter((m) => m.thumbnail)
          .map((m) => ({
            type: m.type ?? 'photo',
            thumbnail: m.thumbnail!,
            url: m.url ?? m.thumbnail!,
          })) ?? []
      return {
        event_key: `tweet:${t.id}`,
        kind: 'tweet',
        severity,
        title: cleanText || t.text,
        body: null,
        link: t.url,
        source: `@${t.author.handle}`,
        region: null,
        occurred_at: t.created_at,
        metadata: {
          author_name: t.author.name,
          author_category: t.author.category,
          engagement: t.engagement ?? null,
          media: media.length > 0 ? media : null,
        },
        last_seen_at: now,
      }
    })
}

// --- Stuff liveblog posts (recent rolling coverage) --------------------
async function harvestLiveblog(now: string): Promise<TimelineRow[]> {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('stuff_liveblog_posts')
    .select('post_id, headline, body, published_at, shared_links')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(25)
  if (error) throw new Error(`liveblog: ${error.message}`)
  return (data ?? [])
    .filter((r) => r.headline && r.published_at)
    .map((r) => {
      const links = Array.isArray(r.shared_links) ? (r.shared_links as Array<{ url?: string }>) : []
      const firstLink = links.find((l) => l?.url)?.url ?? null
      return {
        event_key: `liveblog:${r.post_id}`,
        kind: 'liveblog',
        severity: 'info',
        title: decodeEntities(r.headline)!,
        body: truncate(decodeEntities(r.body), 500),
        link: firstLink,
        source: 'Stuff liveblog',
        region: null,
        occurred_at: r.published_at!,
        metadata: null,
        last_seen_at: now,
      }
    })
}

// --- NZ Herald liveblog posts (LiveCenter feed) ------------------------
// Mirrors harvestLiveblog but reads from nzh_liveblog_posts. Uses a
// distinct event_key prefix so NZH and Stuff posts don't collide.
async function harvestNzhLiveblog(now: string): Promise<TimelineRow[]> {
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('nzh_liveblog_posts')
    .select('post_id, headline, body, published_at, shared_links')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
    .limit(25)
  if (error) throw new Error(`nzh_liveblog: ${error.message}`)
  return (data ?? [])
    .filter((r) => r.headline && r.published_at)
    .map((r) => {
      const links = Array.isArray(r.shared_links) ? (r.shared_links as Array<{ url?: string }>) : []
      const firstLink = links.find((l) => l?.url)?.url ?? null
      return {
        event_key: `nzh_liveblog:${r.post_id}`,
        kind: 'liveblog',
        severity: 'info',
        title: decodeEntities(r.headline)!,
        body: truncate(decodeEntities(r.body), 500),
        link: firstLink,
        source: 'NZH liveblog',
        region: null,
        occurred_at: r.published_at!,
        metadata: null,
        last_seen_at: now,
      }
    })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const started = Date.now()
  const now = new Date().toISOString()

  try {
    const results = await Promise.allSettled([
      harvestNema(now),
      harvestWarnings(now),
      harvestRoadClosures(now),
      harvestOutages(now),
      harvestNews(now),
      harvestLiveblog(now),
      harvestNzhLiveblog(now),
      harvestTweets(now),
    ])

    const rows: TimelineRow[] = []
    const errors: string[] = []
    const counts: Record<string, number> = {}
    const kinds = ['nema', 'warnings', 'roads', 'outages', 'news', 'liveblog', 'nzh_liveblog', 'tweets']
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        rows.push(...r.value)
        counts[kinds[i]] = r.value.length
      } else {
        errors.push(`${kinds[i]}: ${r.reason}`)
        counts[kinds[i]] = -1
      }
    })

    // Drop anything with a future occurred_at — the timeline is for things
    // that have already happened, not forecasts or scheduled work.
    const nowMs = Date.now()
    const pastOnly = rows.filter((r) => {
      const t = Date.parse(r.occurred_at)
      return !Number.isFinite(t) || t <= nowMs + 60_000 // 1 min grace
    })

    // Dedup by event_key in-memory in case two sources produced the same key.
    const deduped = new Map<string, TimelineRow>()
    for (const row of pastOnly) deduped.set(row.event_key, row)
    const unique = [...deduped.values()]

    // Chunked upsert.
    const CHUNK = 500
    for (let i = 0; i < unique.length; i += CHUNK) {
      const { error } = await supabase
        .from('timeline_events')
        .upsert(unique.slice(i, i + CHUNK), { onConflict: 'event_key' })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({
        ok: true,
        upserted: unique.length,
        counts,
        errors: errors.length ? errors : undefined,
        duration_ms: Date.now() - started,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('harvest-timeline failed', err)
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
