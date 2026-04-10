// Fetches combined forecast for impact-zone locations and @NiwaWeather tweets
// from api.niwa.co.nz and upserts them into niwa_forecast / niwa_tweets.
//
// Called by pg_cron every 15 minutes. Also callable manually.

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

// Impact zone locations — NIWA location IDs from /weather/location
const LOCATIONS: Array<{ id: number; name: string }> = [
  { id: 229675319, name: 'Auckland' },
  { id: 221149755, name: 'Whitianga' }, // Coromandel
  { id: 55858484, name: 'Tauranga' }, // Bay of Plenty
  { id: 42910667, name: 'Hamilton' }, // Waikato
  { id: 42910471, name: 'Gisborne' },
  { id: 42910532, name: 'Kerikeri' }, // Northland
]

interface CombinedPayload {
  forecast?: unknown[]
  summary?: unknown[]
  location?: {
    name?: string
    latitude?: number
    longitude?: number
  }
}

const NIWA_HEADERS = {
  'Referer': 'https://weather.niwa.co.nz/',
  'Origin': 'https://weather.niwa.co.nz',
  'Accept': 'application/json',
}

async function fetchCombined(
  id: number,
): Promise<CombinedPayload | null> {
  try {
    const res = await fetch(
      `https://api.niwa.co.nz/weather/location/${id}/combined`,
      { headers: NIWA_HEADERS },
    )
    if (!res.ok) {
      console.warn(`niwa combined ${id} failed: ${res.status}`)
      return null
    }
    return (await res.json()) as CombinedPayload
  } catch (err) {
    console.warn(`niwa combined ${id} error`, err)
    return null
  }
}

interface NiwaTweet {
  id_str: string
  created_at: string
  full_text: string
  entities?: unknown
  extended_entities?: {
    media?: Array<{
      media_url_https?: string
      media_url?: string
      type?: string
    }>
  }
}

async function fetchTweets(): Promise<NiwaTweet[]> {
  try {
    const res = await fetch('https://api.niwa.co.nz/weather/tweets', {
      headers: NIWA_HEADERS,
    })
    if (!res.ok) {
      console.warn(`niwa tweets failed: ${res.status}`)
      return []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.warn('niwa tweets error', err)
    return []
  }
}

function parseTwitterDate(raw: string): string {
  // Twitter format: "Fri Apr 10 08:30:00 +0000 2026"
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString()
  return new Date().toISOString()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // --- Forecasts ---
    const forecastResults = await Promise.all(
      LOCATIONS.map(async (loc) => {
        const data = await fetchCombined(loc.id)
        if (!data) return null
        return {
          location_id: loc.id,
          location_name: loc.name,
          latitude: data.location?.latitude ?? null,
          longitude: data.location?.longitude ?? null,
          forecast: data.forecast ?? [],
          summary: data.summary ?? [],
          location: data.location ?? null,
          updated_at: new Date().toISOString(),
        }
      }),
    )

    const validForecasts = forecastResults.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    )

    if (validForecasts.length > 0) {
      const { error: forecastErr } = await supabase
        .from('niwa_forecast')
        .upsert(validForecasts, { onConflict: 'location_id' })
      if (forecastErr) {
        console.error('niwa_forecast upsert error', forecastErr)
        throw forecastErr
      }
    }

    // --- Tweets ---
    const tweets = await fetchTweets()
    const tweetRows = tweets
      .filter((t) => t.id_str && t.full_text && t.created_at)
      .map((t) => {
        const media = t.extended_entities?.media?.[0]
        return {
          tweet_id: t.id_str,
          created_at: parseTwitterDate(t.created_at),
          full_text: t.full_text,
          media_url: media?.media_url_https ?? media?.media_url ?? null,
          media_type: media?.type ?? null,
          entities: t.entities ?? null,
          last_seen_at: new Date().toISOString(),
        }
      })

    if (tweetRows.length > 0) {
      const { error: tweetErr } = await supabase
        .from('niwa_tweets')
        .upsert(tweetRows, { onConflict: 'tweet_id' })
      if (tweetErr) {
        console.error('niwa_tweets upsert error', tweetErr)
        throw tweetErr
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        forecasts: validForecasts.length,
        tweets: tweetRows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('niwa-feed error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
