// Fetches the Stuff.co.nz Cyclone Vaianu live blog from Tickaroo's embed
// prefetch API and upserts posts into stuff_liveblog_posts. Runs on a cron
// every 5 minutes. Source: stuff.co.nz

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

const LIVEBLOG_URL =
  'https://cdn.tickaroo.com/api/embed/v4/prefetch/liveblog.json' +
  '?client_id=63c9a9f25d2a2a96383bc60d' +
  '&liveblogId=69d7f6b873c197e4f2ecfc0a'

const FETCH_HEADERS = {
  Accept: '*/*',
  Referer: 'https://www.stuff.co.nz/',
  'User-Agent':
    'CycloneVaianu-Dashboard/1.0 (+https://thecolab.ai) volunteer cyclone response',
}

/** HTML entity decode for JSON-embedded-in-HTML-attribute.
 *  Handles named entities, decimal numeric (&#39;) and hex numeric (&#x27;)
 *  — Stuff's feed emits the hex form for apostrophes, which slipped past the
 *  original named-only decoder.
 */
function decodeHtmlEntities(s: string): string {
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

interface SharedLink {
  url: string
  headline?: string
  description?: string
}

interface LiveBlogUpdate {
  headline?: string
  articleBody?: string
  datePublished?: string
  dateModified?: string
  author?: { name?: string } | { name?: string }[]
  sharedContent?: Array<{
    url?: string
    headline?: string
    description?: string
  }>
}

function authorName(author: LiveBlogUpdate['author']): string | null {
  if (!author) return null
  if (Array.isArray(author)) return author[0]?.name ?? null
  return author.name ?? null
}

function cleanLinks(shared: LiveBlogUpdate['sharedContent']): SharedLink[] {
  if (!shared) return []
  return shared
    .filter((s) => s.url && !s.url.startsWith('<iframe'))
    .map((s) => ({
      url: s.url!,
      headline: s.headline,
      description: s.description,
    }))
}

/** Tickaroo post IDs aren't in schemaOrg; derive stable id from publish time. */
function deriveId(update: LiveBlogUpdate): string {
  const published = update.datePublished ?? ''
  const headline = update.headline ?? ''
  // Stable fingerprint
  const s = `${published}::${headline}`
  // Simple hash
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return `stuff_${Math.abs(h).toString(36)}_${Date.parse(published) || 0}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const res = await fetch(LIVEBLOG_URL, { headers: FETCH_HEADERS })
    if (!res.ok) {
      throw new Error(`tickaroo ${res.status}`)
    }
    const wrapper = (await res.json()) as { html?: string }
    const htmlStr = wrapper.html ?? ''

    // Extract initialData="..." attribute content (html-entity encoded JSON)
    const match = htmlStr.match(/initialData="([^"]*)"/)
    if (!match) throw new Error('no initialData in liveblog html')
    const decoded = decodeHtmlEntities(match[1])
    const parsed = JSON.parse(decoded) as {
      schemaOrg?: string
    }

    const schemaStr = parsed.schemaOrg ?? '{}'
    const schema = JSON.parse(schemaStr) as {
      liveBlogUpdate?: LiveBlogUpdate[]
    }
    const updates = schema.liveBlogUpdate ?? []

    const rows = updates
      .filter((u) => u.headline && u.datePublished)
      .map((u) => {
        const body = (u.articleBody ?? '').trim()
        // Often articleBody starts with a duplicate of the headline
        const headline = (u.headline ?? '').trim()
        const dedupedBody =
          body.startsWith(headline) && body.length > headline.length
            ? body.slice(headline.length).trim()
            : body
        return {
          post_id: deriveId(u),
          headline,
          body: dedupedBody || null,
          author: authorName(u.author),
          published_at: u.datePublished!,
          source_updated_at: u.dateModified ?? u.datePublished!,
          shared_links: cleanLinks(u.sharedContent),
          fetched_at: new Date().toISOString(),
        }
      })

    if (rows.length > 0) {
      const { error } = await supabase
        .from('stuff_liveblog_posts')
        .upsert(rows, { onConflict: 'post_id' })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({ ok: true, posts: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('stuff-liveblog error', err)
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
