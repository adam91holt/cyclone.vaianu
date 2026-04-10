// Public read-only API endpoint for the latest AI cyclone summary.
//
// GET  /functions/v1/api-summary          — latest summary
// GET  /functions/v1/api-summary?limit=5  — most recent N
//
// Returns JSON with headline, summary, severity, key_points, generated_at,
// regional_snapshot. No auth required (this is intentionally public — the
// summary is cached pre-generated data, not on-demand LLM calls).

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') ?? '1', 10) || 1, 1),
      20,
    )

    const { data, error } = await supabase
      .from('cyclone_summaries')
      .select(
        'id, generated_at, headline, summary, severity, key_points, regional_snapshot, model',
      )
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const body =
      limit === 1
        ? {
            ok: true,
            summary: data?.[0] ?? null,
            message:
              data && data.length > 0
                ? undefined
                : 'No summaries yet. Will be generated on the next 15-minute tick.',
          }
        : {
            ok: true,
            summaries: data ?? [],
            count: data?.length ?? 0,
          }

    return new Response(JSON.stringify(body), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        // 30-second edge cache — this is pre-generated data, cheap to re-read
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    })
  } catch (err) {
    console.error('api-summary error', err)
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
