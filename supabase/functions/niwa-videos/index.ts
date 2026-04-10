// Scrape NIWA's public video feed — the backing API for the videos carousel
// on https://weather.niwa.co.nz. Publishes "Latest Weather Update", "National
// Weather Overview", and per-park/river-flow outlooks, typically refreshed
// through the morning. We store one row per unique vimeo URI so we can track
// when new videos land and how often they're updated.
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

// Tags we care about for the cyclone dashboard — the national weather update
// and overview are the primary draw. River flow and seasonal outlook are
// useful context during a cyclone.
const KEEP_TAGS = new Set([
  'niwa_weather_public',
  'national_parks',
  'river_flow',
  'seasonal_outlook',
])

interface VimeoPicture {
  link: string
  width: number
  height: number
}

interface NiwaVideo {
  uri: string
  name: string
  release_time: string
  pictures: VimeoPicture[]
  tags?: string[]
}

interface NiwaGroup {
  tag: string
  data: NiwaVideo[]
}

function extractVimeoId(uri: string): string | null {
  // "https://vimeo.com/1181808471" → "1181808471"
  const m = uri.match(/vimeo\.com\/(\d+)/)
  return m?.[1] ?? null
}

function pickThumbnail(pictures: VimeoPicture[]): string | null {
  if (!pictures?.length) return null
  // Prefer 640x360 (the card-sized one) then fall back to the largest.
  const card = pictures.find((p) => Math.round(p.width) === 640)
  if (card) return card.link
  return pictures.reduce((best, p) => (p.width > best.width ? p : best)).link
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const res = await fetch('https://api.niwa.co.nz/weather/videos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CycloneVaianuDashboard/1.0)',
        Referer: 'https://weather.niwa.co.nz/',
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `NIWA returned ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const groups = (await res.json()) as NiwaGroup[]

    type Row = {
      tag: string
      vimeo_id: string
      vimeo_uri: string
      name: string
      release_time: string
      thumbnail_url: string | null
      last_seen_at: string
    }
    const now = new Date().toISOString()
    const rows: Row[] = []

    for (const group of groups) {
      if (!KEEP_TAGS.has(group.tag)) continue
      for (const video of group.data ?? []) {
        const vimeo_id = extractVimeoId(video.uri)
        if (!vimeo_id) continue
        rows.push({
          tag: group.tag,
          vimeo_id,
          vimeo_uri: video.uri,
          name: video.name,
          release_time: video.release_time,
          thumbnail_url: pickThumbnail(video.pictures),
          last_seen_at: now,
        })
      }
    }

    // Dedupe on vimeo_uri (the same video can appear under multiple tags).
    const byUri = new Map<string, Row>()
    for (const r of rows) {
      // If a duplicate has a more "primary" tag, prefer that.
      const existing = byUri.get(r.vimeo_uri)
      if (!existing) {
        byUri.set(r.vimeo_uri, r)
        continue
      }
      const priority = (tag: string) =>
        tag === 'niwa_weather_public' ? 3
          : tag === 'national_parks' ? 2
          : tag === 'river_flow' ? 1
          : 0
      if (priority(r.tag) > priority(existing.tag)) {
        byUri.set(r.vimeo_uri, r)
      }
    }
    const deduped = Array.from(byUri.values())

    let inserted = 0
    if (deduped.length > 0) {
      // Upsert — on conflict, bump last_seen_at but keep first_seen_at.
      const { data, error } = await supabase
        .from('niwa_videos')
        .upsert(deduped, { onConflict: 'vimeo_uri', ignoreDuplicates: false })
        .select('id')
      if (error) {
        console.error('niwa_videos upsert error', error)
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      inserted = data?.length ?? 0
    }

    return new Response(
      JSON.stringify({
        ok: true,
        groupsSeen: groups.length,
        videosStored: inserted,
        fetchedAt: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('niwa-videos error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
