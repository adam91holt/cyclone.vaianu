// Fetches the NZ Herald Cyclone Vaianu live blog from LiveCenter (NcPosts,
// tenant nzme, channel 6133) and upserts posts into nzh_liveblog_posts.
// Runs on a cron every 5 minutes. Source: nzherald.co.nz

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

const FEED_BASE =
  'https://livecenter-aus-hpc9audwdke2c0fm.z01.azurefd.net/BulletinFeed/nzme/6133'

const FETCH_HEADERS = {
  Accept: '*/*',
  Referer: 'https://www.nzherald.co.nz/',
  'User-Agent':
    'CycloneVaianu-Dashboard/1.0 (+https://thecolab.ai) volunteer cyclone response',
}

interface NzhPost {
  id: number
  authorName?: string
  /** Unix seconds */
  created: number
  /** Optional unix seconds */
  updated?: number
  title: string
  content?: { html?: string }
  importance?: number
}

interface InitialEnvelope {
  success?: boolean
  result?: {
    addedOrChanged?: NzhPost[]
    hasMore?: boolean
    lastChangesId?: number
  }
}

/** LiveCenter payloads come down as UTF-8 with a BOM — strip it before parse. */
async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: FETCH_HEADERS })
  if (!res.ok) throw new Error(`nzh ${url}: http ${res.status}`)
  const text = (await res.text()).replace(/^\uFEFF/, '')
  return JSON.parse(text)
}

/** Named + numeric HTML entity decoder (covers &#x27;, &#39;, &nbsp; etc). */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
}

/** Turn LiveCenter's rich HTML post body into a plain-text body with paragraph
 *  breaks preserved as \n\n, plus a flat list of unique outbound links. */
function parseContent(html: string | undefined): {
  body: string | null
  links: Array<{ url: string; headline?: string }>
} {
  if (!html) return { body: null, links: [] }

  // Collect <a href="..."> targets before stripping tags, pairing each with
  // its anchor text for the shared_links list.
  const linkMap = new Map<string, { url: string; headline?: string }>()
  const linkRe = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1].trim()
    if (!url || url.startsWith('#') || url.startsWith('mailto:')) continue
    const anchor = decodeEntities(m[2].replace(/<[^>]+>/g, '').trim())
    if (!linkMap.has(url)) {
      linkMap.set(url, anchor ? { url, headline: anchor } : { url })
    }
  }

  // Replace paragraph-ish block breaks with newlines before stripping, so
  // paragraph splitting on the client still works.
  const withBreaks = html
    .replace(/<\/(p|div|li|h[1-6])>/gi, '$&\n\n')
    .replace(/<br\s*\/?>/gi, '\n')

  // Strip remaining tags, collapse whitespace.
  const stripped = withBreaks
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const body = decodeEntities(stripped) || null
  return { body, links: [...linkMap.values()] }
}

function normalizePost(p: NzhPost): {
  post_id: string
  headline: string
  body: string | null
  author: string | null
  published_at: string
  source_updated_at: string
  shared_links: Array<{ url: string; headline?: string }>
  fetched_at: string
} | null {
  if (!p.id || !p.title || !p.created) return null
  const publishedMs = p.created * 1000
  const updatedMs = p.updated ? p.updated * 1000 : publishedMs
  const { body, links } = parseContent(p.content?.html)
  const headline = decodeEntities(p.title).trim()
  if (!headline) return null
  return {
    post_id: `nzh_${p.id}`,
    headline,
    body,
    author: p.authorName ? decodeEntities(p.authorName) : null,
    published_at: new Date(publishedMs).toISOString(),
    source_updated_at: new Date(updatedMs).toISOString(),
    shared_links: links,
    fetched_at: new Date().toISOString(),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Initial — the newest ~10 posts.
    const initial = (await fetchJson(`${FEED_BASE}/Initial/`)) as InitialEnvelope
    const initialPosts = initial.result?.addedOrChanged ?? []
    const hasMore = initial.result?.hasMore ?? false

    // 2. Earlier — if the initial feed says there are older posts, pull one
    //    page of them keyed off the oldest Initial post id. Fetching one
    //    page keeps latency bounded while giving the display component a
    //    reasonable scroll depth (~30 posts).
    let earlierPosts: NzhPost[] = []
    if (hasMore && initialPosts.length > 0) {
      const cutoff = initialPosts[initialPosts.length - 1].id
      try {
        const earlier = (await fetchJson(
          `${FEED_BASE}/Earlier/${cutoff}/`,
        )) as NzhPost[]
        if (Array.isArray(earlier)) earlierPosts = earlier
      } catch (err) {
        console.warn('nzh Earlier fetch failed (non-fatal)', err)
      }
    }

    const rows = [...initialPosts, ...earlierPosts]
      .map(normalizePost)
      .filter((r): r is NonNullable<typeof r> => r !== null)

    if (rows.length > 0) {
      const { error } = await supabase
        .from('nzh_liveblog_posts')
        .upsert(rows, { onConflict: 'post_id' })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({
        ok: true,
        posts: rows.length,
        initial: initialPosts.length,
        earlier: earlierPosts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('nzh-liveblog error', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'unknown',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
