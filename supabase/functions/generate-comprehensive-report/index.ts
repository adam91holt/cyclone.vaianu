// Generate a comprehensive hourly situation report using Claude Opus 4.6
// and a manual agentic loop (tool use). Runs via pg_cron every hour.
//
// Design
// ------
// This is the "agents SDK" pattern adapted for Deno Edge Functions. The real
// @anthropic-ai/claude-agent-sdk is Node-only (fs, child_process), so we use
// the Anthropic SDK's manual tool-use loop, which achieves the same thing:
//
//   1. We declare a set of tools — each one queries a Supabase table.
//   2. Claude Opus 4.6 decides which tools to call, in what order, and how
//      many times.
//   3. We execute each tool call against the DB and feed the result back.
//   4. When Claude is ready to publish the report, it calls submit_report,
//      which is how we structure the final output instead of parsing JSON
//      out of prose.
//
// Adaptive thinking (`thinking: {type: "adaptive"}`) is on — Claude decides
// how deeply to reason about each step. Prompt caching is applied to the
// system prompt + tool definitions so repeated hourly runs don't pay for
// the same ~4k tokens of schema each time.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

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

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
})

const MODEL = 'claude-opus-4-6'
const MAX_ITERATIONS = 20

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------
// Each helper returns a JSON-serializable object. Keep payloads tight —
// Claude doesn't need every column, and bigger results cost more tokens.

async function getActiveWarnings(input: { level?: 'red' | 'orange' | 'all' }) {
  let query = supabase
    .from('metservice_warnings_national')
    .select(
      'warn_level, event_type, display_regions, threat_start_time, threat_end_time, situation_headline, situation_statement, impact, instruction',
    )
    .eq('is_active', true)
    .order('threat_start_time', { ascending: true, nullsFirst: false })

  if (input.level === 'red') query = query.eq('warn_level', 'red')
  else if (input.level === 'orange') query = query.in('warn_level', ['red', 'orange'])

  const { data } = await query.limit(20)
  return (data ?? []).map((w) => ({
    level: w.warn_level,
    type: w.event_type,
    regions: w.display_regions,
    start: w.threat_start_time,
    end: w.threat_end_time,
    headline: w.situation_headline,
    statement: (w.situation_statement ?? '').slice(0, 500),
    impact: (w.impact ?? '').slice(0, 300),
    instruction: (w.instruction ?? '').slice(0, 300),
  }))
}

async function getCivilDefenceAlerts() {
  const { data } = await supabase
    .from('nema_alerts')
    .select('title, severity, summary, body, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(15)
  return (data ?? []).map((a) => ({
    title: a.title,
    severity: a.severity,
    summary: a.summary,
    body: (a.body ?? '').slice(0, 600),
    published_at: a.published_at,
  }))
}

async function getRegionalWeather() {
  const { data } = await supabase
    .from('metservice_observations')
    .select('*')
    .order('observed_at', { ascending: false, nullsFirst: false })
    .limit(30)
  return (data ?? []).slice(0, 30)
}

async function getRoadClosures() {
  const { data } = await supabase
    .from('nzta_road_events')
    .select('highway, location, region, island, event_type, impact, description, planned, start_date')
    .eq('severity', 'closed')
    .order('planned', { ascending: true })
    .limit(30)
  return data ?? []
}

async function getPowerOutages(input: { min_customers?: number }) {
  const min = input.min_customers ?? 100
  const { data } = await supabase
    .from('power_outages')
    .select('provider, region, localities, customer_count, cause, status, start_time')
    .is('cleared_at', null)
    .gte('customer_count', min)
    .order('customer_count', { ascending: false })
    .limit(30)
  return data ?? []
}

async function getRiverStatus() {
  // Use the river_sites summary for freshness + latest_value.
  const { data } = await supabase
    .from('river_sites')
    .select('name, council_name, measurement, unit, latest_value, latest_ts')
    .not('latest_value', 'is', null)
    .order('latest_ts', { ascending: false, nullsFirst: false })
    .limit(40)
  return data ?? []
}

async function getRecentNews(input: { hours?: number }) {
  const hours = input.hours ?? 6
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('news_items')
    .select('source, title, summary, published_at, url')
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(25)
  return (data ?? []).map((n) => ({
    source: n.source,
    title: n.title,
    summary: (n.summary ?? '').slice(0, 300),
    published_at: n.published_at,
    url: n.url,
  }))
}

async function getLiveblog() {
  const { data } = await supabase
    .from('stuff_liveblog_posts')
    .select('headline, body, author, published_at')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(15)
  return (data ?? []).map((p) => ({
    headline: p.headline,
    body: (p.body ?? '').slice(0, 500),
    author: p.author,
    published_at: p.published_at,
  }))
}

async function getNiwaForecast() {
  const { data } = await supabase
    .from('niwa_forecast')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
  return data?.[0] ?? null
}

async function getLatestCycloneReport() {
  const { data } = await supabase
    .from('cyclone_summaries')
    .select('headline, summary, severity, key_points, seriousness, ratings, landfall_estimate_iso, landfall_region, landfall_rationale, generated_at')
    .order('generated_at', { ascending: false })
    .limit(1)
  return data?.[0] ?? null
}

async function getTimelineEvents(input: { kinds?: string[]; severity?: string }) {
  let query = supabase
    .from('timeline_events')
    .select('kind, severity, title, body, source, region, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(40)
  if (input.kinds && input.kinds.length > 0) query = query.in('kind', input.kinds)
  if (input.severity) query = query.eq('severity', input.severity)
  const { data } = await query
  return data ?? []
}

// ---------------------------------------------------------------------------
// Tool definitions (sent to Claude)
// ---------------------------------------------------------------------------

const tools: Anthropic.Messages.Tool[] = [
  {
    name: 'get_active_warnings',
    description:
      'Fetch active MetService national weather warnings (official NZ forecaster). Returns level, regions, threat period, headline, statement, impact and instruction.',
    input_schema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['red', 'orange', 'all'],
          description: 'Filter by minimum level. "red" = red only, "orange" = red+orange, "all" = everything.',
        },
      },
    },
  },
  {
    name: 'get_civil_defence_alerts',
    description:
      'Fetch active NEMA civil defence Emergency Mobile Alerts. These are the SMS-broadcast alerts sent to phones during emergencies.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_regional_weather',
    description:
      'Fetch the latest live weather observations across NZ regions (temperature, wind, gusts, pressure, precipitation).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_road_closures',
    description:
      'Fetch active state highway closures from NZTA. Includes highway, location, region, event type, impact and whether it is a planned closure.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_power_outages',
    description:
      'Fetch current power outages nationwide, filtered by minimum customers affected.',
    input_schema: {
      type: 'object',
      properties: {
        min_customers: {
          type: 'integer',
          description: 'Minimum customer count to include (default 100).',
        },
      },
    },
  },
  {
    name: 'get_river_status',
    description:
      'Fetch the latest river gauge readings across the council hydrometric network.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recent_news',
    description:
      'Fetch recent news items from RNZ, Stuff and NZ Herald covering the cyclone / weather event.',
    input_schema: {
      type: 'object',
      properties: {
        hours: {
          type: 'integer',
          description: 'Look back this many hours (default 6).',
        },
      },
    },
  },
  {
    name: 'get_liveblog',
    description:
      'Fetch the latest posts from the Stuff rolling live blog — the most time-sensitive source.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_niwa_forecast',
    description:
      'Fetch the NIWA multi-day weather forecast (government agency — authoritative for trajectory).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_latest_cyclone_report',
    description:
      'Fetch the most recent AI-generated cyclone situation report for continuity / delta-analysis.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_timeline_events',
    description:
      'Fetch the cross-source notable-events timeline (NEMA + warnings + closures + outages + liveblog deduped).',
    input_schema: {
      type: 'object',
      properties: {
        kinds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by kind(s): nema_alert, warning, road_closure, outage, cyclone_report, liveblog',
        },
        severity: {
          type: 'string',
          enum: ['red', 'orange', 'yellow', 'info'],
          description: 'Filter by severity.',
        },
      },
    },
  },
  {
    name: 'submit_report',
    description:
      'Submit the final comprehensive report. CALL THIS ONCE you have gathered enough data from the other tools. This is how you publish — do not write the report as plain text.',
    input_schema: {
      type: 'object',
      required: ['headline', 'summary', 'severity', 'key_findings', 'markdown'],
      properties: {
        headline: {
          type: 'string',
          description: 'Punchy headline, <= 15 words, present tense.',
        },
        summary: {
          type: 'string',
          description: '2-3 sentence executive summary of the situation right now.',
        },
        severity: {
          type: 'string',
          enum: ['red', 'orange', 'yellow', 'advisory'],
          description: 'Overall severity based on highest active warning level.',
        },
        key_findings: {
          type: 'array',
          items: { type: 'string' },
          description: '5-8 standalone bullet points of the most critical takeaways. Each under 25 words.',
        },
        markdown: {
          type: 'string',
          description:
            'The full comprehensive report as Markdown. Use ## section headings, bullet lists, bold for emphasis. 600-1500 words. Cover: current situation, regional impacts, warnings, infrastructure (power/roads/rivers), public safety advice, outlook. Name specific regions and real numbers from the tool data — no generic prose.',
        },
      },
    },
  },
]

const toolRunners: Record<string, (input: unknown) => Promise<unknown>> = {
  get_active_warnings: (i) => getActiveWarnings(i as { level?: 'red' | 'orange' | 'all' }),
  get_civil_defence_alerts: () => getCivilDefenceAlerts(),
  get_regional_weather: () => getRegionalWeather(),
  get_road_closures: () => getRoadClosures(),
  get_power_outages: (i) => getPowerOutages(i as { min_customers?: number }),
  get_river_status: () => getRiverStatus(),
  get_recent_news: (i) => getRecentNews(i as { hours?: number }),
  get_liveblog: () => getLiveblog(),
  get_niwa_forecast: () => getNiwaForecast(),
  get_latest_cyclone_report: () => getLatestCycloneReport(),
  get_timeline_events: (i) =>
    getTimelineEvents(i as { kinds?: string[]; severity?: string }),
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a senior situation analyst for a live NZ emergency-management dashboard covering Tropical Cyclone Vaianu — a sub-tropical cyclone affecting the upper North Island.

Your job is to produce a COMPREHENSIVE hourly situation report that synthesizes every available data source: MetService warnings, NEMA civil defence alerts, live weather observations, NIWA forecasts, road closures, power outages, river gauges, news coverage, and the rolling Stuff liveblog.

## Methodology

1. **Gather broadly first.** Start by calling several tools in parallel (or in quick succession) to survey the situation: active warnings, NEMA alerts, the timeline, and one or two most recent news/liveblog items.
2. **Drill down.** Based on what you see, pull more targeted data — e.g. if a region has red warnings, check road closures and power outages in that region.
3. **Cross-reference.** Look for corroboration between independent sources (MetService vs NIWA, news vs liveblog, etc.).
4. **Synthesise.** Write the report in clear, confident prose grounded in real numbers and specific regions. No generic phrases.
5. **Publish.** Call submit_report ONCE when you have enough context. This is your final action.

## Report requirements

- **Audience**: the general public, plus emergency planners who want a quick single-pane briefing.
- **Tone**: factual, calm, authoritative. No speculation. No editorialising.
- **Specificity**: every paragraph must name actual regions, roads, towns, customer counts, wind speeds, river levels, etc. — taken from tool results.
- **Coverage**: current situation → regional impacts → active warnings → infrastructure status (roads, power, rivers) → public safety advice → outlook.
- **Length**: 600-1500 words of markdown. Use section headings (##) and bullet lists freely.
- **Severity**: match the highest active warning level across regions.
- **Key findings**: 5-8 standalone bullets. Must be comprehensible on their own without reading the full markdown.

## Rules

- Do NOT write the report as plain text in the assistant turn. ALWAYS use submit_report.
- Do NOT call submit_report without first fetching data from at least 4 distinct tools.
- Do NOT invent numbers or regions not present in the tool data.
- If a source is empty, say so — don't paper over gaps.
- Keep calling tools until you have enough information, up to 15 tool calls.`

// ---------------------------------------------------------------------------
// Manual agentic loop
// ---------------------------------------------------------------------------

interface FinalReport {
  headline: string
  summary: string
  severity: string
  key_findings: string[]
  markdown: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const started = Date.now()

  try {
    const nowNzt = new Date().toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      dateStyle: 'full',
      timeStyle: 'short',
    })
    const nowIso = new Date().toISOString()

    const userPrompt = `Current time (NZST): ${nowNzt}
Current time (UTC ISO): ${nowIso}

Produce the hourly comprehensive situation report for Tropical Cyclone Vaianu covering all of New Zealand. Start by pulling the most important sources, cross-reference them, and publish via submit_report.`

    const messages: Anthropic.Messages.MessageParam[] = [
      { role: 'user', content: userPrompt },
    ]

    let finalReport: FinalReport | null = null
    const toolCallLog: Array<{ name: string; input: unknown; result_preview: string }> = []
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCacheReadTokens = 0
    let totalCacheCreationTokens = 0

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 16384,
        // Adaptive thinking — Claude decides how deep to go each step.
        // No budget_tokens; that parameter is deprecated on Opus 4.6.
        thinking: { type: 'adaptive' } as unknown as Anthropic.Messages.ThinkingConfigParam,
        // Cache the system prompt + tool definitions. On the hourly cron
        // run the prefix stays identical, so cache_read_input_tokens > 0
        // after the first run.
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools,
        messages,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens
      totalCacheReadTokens += response.usage.cache_read_input_tokens ?? 0
      totalCacheCreationTokens += response.usage.cache_creation_input_tokens ?? 0

      // Append the full assistant content (including any thinking blocks)
      // — required by the API when thinking + tool use are combined.
      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason === 'end_turn') {
        // Claude ran out of ideas without calling submit_report. Bail.
        console.warn('end_turn without submit_report on iteration', iter)
        break
      }

      if (response.stop_reason !== 'tool_use') {
        console.warn('unexpected stop_reason', response.stop_reason)
        break
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
      )

      if (toolUses.length === 0) {
        console.warn('tool_use stop with no tool_use blocks')
        break
      }

      // Execute each tool call. If it's submit_report, we're done.
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []
      for (const tu of toolUses) {
        if (tu.name === 'submit_report') {
          const input = tu.input as FinalReport
          finalReport = {
            headline: String(input.headline ?? '').slice(0, 400),
            summary: String(input.summary ?? '').slice(0, 2000),
            severity: String(input.severity ?? 'advisory'),
            key_findings: Array.isArray(input.key_findings)
              ? input.key_findings.map((k) => String(k).slice(0, 400)).slice(0, 12)
              : [],
            markdown: String(input.markdown ?? ''),
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: 'Report submitted successfully.',
          })
          break
        }

        const runner = toolRunners[tu.name]
        if (!runner) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: `Error: unknown tool ${tu.name}`,
            is_error: true,
          })
          continue
        }

        try {
          const result = await runner(tu.input)
          const serialized = JSON.stringify(result)
          // Log a preview so we can see what was fetched.
          toolCallLog.push({
            name: tu.name,
            input: tu.input,
            result_preview: serialized.slice(0, 200),
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: serialized.slice(0, 40000), // hard cap
          })
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
            is_error: true,
          })
        }
      }

      messages.push({ role: 'user', content: toolResults })

      if (finalReport) break
    }

    if (!finalReport) {
      throw new Error('Claude did not call submit_report within the iteration budget')
    }

    const durationMs = Date.now() - started

    const { data: saved, error: insertError } = await supabase
      .from('comprehensive_reports')
      .insert({
        headline: finalReport.headline,
        summary: finalReport.summary,
        severity: finalReport.severity,
        key_findings: finalReport.key_findings,
        markdown: finalReport.markdown,
        model: MODEL,
        tool_calls: toolCallLog,
        duration_ms: durationMs,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cache_read_tokens: totalCacheReadTokens,
        cache_creation_tokens: totalCacheCreationTokens,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({
        ok: true,
        report: saved,
        tool_calls: toolCallLog.length,
        duration_ms: durationMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate-comprehensive-report failed', err)
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
