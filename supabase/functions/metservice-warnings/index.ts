// Fetches MetService national land warnings and upserts structured rows.
//
// Source: https://www.metservice.com/publicData/webdata/warnings-service/land/national
// Called by pg_cron every 10 minutes. Also callable manually.

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

const SOURCE_URL =
  'https://www.metservice.com/publicData/webdata/warnings-service/land/national'

interface RawWarning {
  capId: string
  warnLevel?: string
  eventType?: string
  warningType?: string
  baseName?: string
  name?: string
  areaDescription?: string
  regions?: string[]
  displayRegions?: string[]
  threatStartTime?: string
  threatEndTime?: string
  threatPeriod?: string
  threatPeriodShort?: string
  issuedAt?: string
  expiresAt?: string
  nextIssueAt?: string
  icon?: string
  warnIcon?: string
  text?: string
  impact?: string
  instruction?: string
  situation?: { headline?: string; statement?: string }
  preview?: { markdown?: string }
  changeNotes?: string
  isActive?: boolean
  polygons?: unknown
}

interface RawPayload {
  summary?: Array<{ icon?: string; label?: string; warnLevel?: string; url?: string }>
  warnings?: RawWarning[]
}

const LEVEL_RANK: Record<string, number> = {
  red: 4,
  orange: 3,
  yellow: 2,
  blue: 1,
}

function highestLevel(warnings: RawWarning[]): string | null {
  let top: string | null = null
  let topRank = 0
  for (const w of warnings) {
    const lvl = (w.warnLevel ?? '').toLowerCase()
    const rank = LEVEL_RANK[lvl] ?? 0
    if (rank > topRank) {
      topRank = rank
      top = lvl
    }
  }
  return top
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const res = await fetch(SOURCE_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent':
          'CycloneVaianu-Dashboard/1.0 (+https://thecolab.ai) volunteer cyclone response',
      },
    })
    if (!res.ok) throw new Error(`MetService upstream ${res.status}`)
    const payload = (await res.json()) as RawPayload

    const warnings = Array.isArray(payload.warnings) ? payload.warnings : []
    const summary = Array.isArray(payload.summary) ? payload.summary : []

    const now = new Date().toISOString()

    const rows = warnings
      .filter((w) => w.capId)
      .map((w) => ({
        cap_id: w.capId,
        warn_level: (w.warnLevel ?? null)?.toLowerCase() ?? null,
        event_type: w.eventType ?? null,
        warning_type: w.warningType ?? null,
        base_name: w.baseName ?? null,
        name: w.name ?? null,
        area_description: w.areaDescription ?? null,
        regions: w.regions ?? [],
        display_regions: w.displayRegions ?? [],
        threat_start_time: w.threatStartTime ?? null,
        threat_end_time: w.threatEndTime ?? null,
        threat_period: w.threatPeriod ?? null,
        threat_period_short: w.threatPeriodShort ?? null,
        issued_at: w.issuedAt ?? null,
        expires_at: w.expiresAt ?? null,
        next_issue_at: w.nextIssueAt ?? null,
        icon: w.icon ?? null,
        warn_icon: w.warnIcon ?? null,
        text: w.text ?? null,
        impact: w.impact ?? null,
        instruction: w.instruction ?? null,
        situation_headline: w.situation?.headline ?? null,
        situation_statement: w.situation?.statement ?? null,
        preview_markdown: w.preview?.markdown ?? null,
        change_notes: w.changeNotes ?? null,
        is_active: w.isActive ?? true,
        polygons: w.polygons ?? null,
        raw: w as unknown as Record<string, unknown>,
        fetched_at: now,
      }))

    // Upsert current warnings
    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('metservice_warnings_national')
        .upsert(rows, { onConflict: 'cap_id' })
      if (upsertErr) throw upsertErr
    }

    // Delete any warnings that are no longer in the current feed
    const currentIds = rows.map((r) => r.cap_id)
    if (currentIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('metservice_warnings_national')
        .delete()
        .not('cap_id', 'in', `(${currentIds.map((id) => `"${id}"`).join(',')})`)
      if (deleteErr) console.warn('stale warning cleanup failed', deleteErr)
    }

    // Update summary snapshot
    const { error: summaryErr } = await supabase
      .from('metservice_warnings_summary')
      .upsert({
        id: 1,
        summary: summary as unknown as Record<string, unknown>[],
        warning_count: warnings.length,
        highest_level: highestLevel(warnings),
        fetched_at: now,
      })
    if (summaryErr) throw summaryErr

    return new Response(
      JSON.stringify({
        ok: true,
        warnings: rows.length,
        summary_items: summary.length,
        highest_level: highestLevel(warnings),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('metservice-warnings error', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
