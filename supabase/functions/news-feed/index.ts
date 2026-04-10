// Aggregate RSS feeds from major NZ news sources, filter for cyclone coverage,
// cache in news_items table, return latest. Called on a schedule and on-demand.
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

interface Feed {
  source: string
  url: string
}

// Full NZ news feed roster — aggregated from thecolab-ai/.skills/nz-news.
// These are the mainline RSS/Atom feeds from the major NZ newsrooms.
const FEEDS: Feed[] = [
  { source: 'RNZ', url: 'https://www.rnz.co.nz/rss/news.xml' },
  { source: 'RNZ', url: 'https://www.rnz.co.nz/rss/national.xml' },
  { source: 'RNZ POLITICS', url: 'https://www.rnz.co.nz/rss/political.xml' },
  { source: 'RNZ WORLD', url: 'https://www.rnz.co.nz/rss/world.xml' },
  { source: 'STUFF', url: 'https://www.stuff.co.nz/rss' },
  { source: 'NZ HERALD', url: 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/nz/?outputType=xml&_website=nzh' },
  { source: 'NEWSROOM', url: 'https://newsroom.co.nz/rss' },
  { source: 'SPINOFF', url: 'https://thespinoff.co.nz/feed' },
  { source: 'INTEREST', url: 'https://www.interest.co.nz/rss' },
]

// Keywords for cyclone / severe-weather coverage. Only strong, unambiguous
// weather terms — no bare location names, no generic words like "warning"
// or "watch" that match unrelated stories. A headline must contain at least
// one of these phrases to be included. Match is case-insensitive substring.
const KEYWORDS = [
  // the cyclone itself
  'cyclone',
  'vaianu',
  'tropical storm',
  'tropical cyclone',
  // severe-weather nouns
  'storm',
  'gale',
  'gust',
  'gusts',
  'gusty',
  'hail',
  'hailstorm',
  'thunderstorm',
  'tornado',
  'waterspout',
  // rain / flood
  'heavy rain',
  'torrential',
  'downpour',
  'deluge',
  'flood',
  'flooding',
  'flooded',
  'flash flood',
  'inundation',
  // wind
  'high wind',
  'strong wind',
  'damaging wind',
  'destructive wind',
  // sea
  'storm surge',
  'big swell',
  'huge swell',
  'massive swell',
  'rough seas',
  'high seas',
  'king tide',
  // slips
  'landslide',
  'landslip',
  'mudslide',
  // warning language (specific phrases only)
  'severe weather',
  'weather warning',
  'weather watch',
  'red warning',
  'orange warning',
  'heavy rain warning',
  'strong wind warning',
  'metservice',
  'niwa',
  'civil defence',
  'state of emergency',
  'evacuation',
  'evacuate',
  'evacuated',
  // impact (weather-specific phrases)
  'power cut',
  'power outage',
  'power out',
  'trees down',
  'roof torn',
  'flights cancelled',
  'flights grounded',
  'airport closed',
  'wild weather',
  'battered',
  'lashed',
  'severe gale',
]

// Pre-compile a single word-boundary regex from the keyword list.
// Escapes regex metacharacters and uses \b on each side so "gust" won't
// match "Augusta" and "slip" won't match "slippage" mid-word.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
const KEYWORD_REGEX = new RegExp(
  `\\b(?:${KEYWORDS.map((k) => escapeRegex(k.trim())).join('|')})\\b`,
  'i',
)
function matchesAnyKeyword(text: string): boolean {
  return KEYWORD_REGEX.test(text)
}

interface NewsItem {
  source: string
  title: string
  url: string
  published_at: string | null
  summary: string | null
  image_url: string | null
}

function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = []
  // Match both <item>...</item> RSS and <entry>...</entry> Atom
  const itemRegex = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi
  const matches = xml.match(itemRegex) ?? []

  for (const block of matches) {
    const title = extract(block, 'title')
    const link = extractLink(block)
    const pubDate =
      extract(block, 'pubDate') ||
      extract(block, 'published') ||
      extract(block, 'updated')
    const description =
      extract(block, 'description') ||
      extract(block, 'summary') ||
      extract(block, 'content:encoded') ||
      extract(block, 'content')

    if (!title || !link) continue

    // Match against the TITLE only (descriptions are noisy — Spinoff-style
    // feeds put unrelated boilerplate in the summary). Use word-boundary
    // matching so "Augusta" doesn't hit on "gust", etc.
    const cleanTitle = cleanText(title).toLowerCase()
    if (!matchesAnyKeyword(cleanTitle)) continue

    items.push({
      source,
      title: cleanText(title),
      url: link,
      published_at: pubDate ? new Date(pubDate).toISOString() : null,
      summary: description ? cleanText(description).slice(0, 280) : null,
      image_url: extractImage(block, description),
    })
  }
  return items
}

/** Extract a hero image from an RSS/Atom entry. Checks:
 *  1. media:content / media:thumbnail urls
 *  2. enclosure tags with image mime types
 *  3. og:image-style JSON-LD (rare)
 *  4. the first <img src=".."> inside description/content
 */
function extractImage(block: string, description: string | null): string | null {
  // media:content url="..."
  const mediaContent = /<media:(?:content|thumbnail)\b[^>]*\burl="([^"]+)"/i.exec(block)
  if (mediaContent?.[1]) return mediaContent[1]

  // <enclosure url="..." type="image/..."/>
  const enclosure = /<enclosure\b[^>]*\burl="([^"]+)"[^>]*\btype="image\/[^"]*"/i.exec(block)
  if (enclosure?.[1]) return enclosure[1]
  const enclosureFlipped = /<enclosure\b[^>]*\btype="image\/[^"]*"[^>]*\burl="([^"]+)"/i.exec(block)
  if (enclosureFlipped?.[1]) return enclosureFlipped[1]

  // <img src="..."> inside description
  if (description) {
    const decoded = description.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    const imgMatch = /<img[^>]*\bsrc="([^"]+)"/i.exec(decoded)
    if (imgMatch?.[1]) return imgMatch[1]
  }

  return null
}

function extract(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*?>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const m = block.match(re)
  if (!m) return null
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
}

function extractLink(block: string): string | null {
  // <link>url</link>
  const simple = /<link[^>]*?>([^<]+)<\/link>/i.exec(block)
  if (simple?.[1]) return simple[1].trim()
  // <link href="url" />
  const attr = /<link[^>]*href="([^"]+)"[^>]*\/?>/i.exec(block)
  if (attr?.[1]) return attr[1].trim()
  return null
}

function cleanText(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CycloneVaianuDashboard/1.0; news aggregator)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.warn(`feed ${feed.source} status ${res.status}: ${feed.url}`)
      return []
    }
    const text = await res.text()
    return parseRss(text, feed.source)
  } catch (err) {
    console.error(`feed ${feed.source} failed`, err)
    return []
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed))
    const flat = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    // Dedupe by URL
    const seen = new Set<string>()
    const unique = flat.filter((i) => {
      if (seen.has(i.url)) return false
      seen.add(i.url)
      return true
    })

    // Upsert into DB (url is unique)
    if (unique.length > 0) {
      const { error } = await supabase
        .from('news_items')
        .upsert(unique, { onConflict: 'url' })
      if (error) console.error('news_items upsert error', error)
    }

    // Return most recent 25
    const sorted = unique
      .sort((a, b) => {
        const at = a.published_at ? new Date(a.published_at).getTime() : 0
        const bt = b.published_at ? new Date(b.published_at).getTime() : 0
        return bt - at
      })
      .slice(0, 25)

    return new Response(
      JSON.stringify({
        items: sorted,
        count: sorted.length,
        fetchedAt: new Date().toISOString(),
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (err) {
    console.error('news-feed error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
