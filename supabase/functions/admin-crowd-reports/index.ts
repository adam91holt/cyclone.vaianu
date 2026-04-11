// Admin moderation endpoint for crowd reports.
// Auth: x-admin-password header must match CROWD_REPORTS_ADMIN_PASSWORD secret.
// Uses service-role key to bypass RLS for read/update across all statuses.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-admin-password',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function withCors(body: BodyInit | null, init: ResponseInit = {}) {
  return new Response(body, {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

const ADMIN_PASSWORD = Deno.env.get('CROWD_REPORTS_ADMIN_PASSWORD') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Constant-time string compare so timing attacks can't leak the password
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

function checkAuth(req: Request): boolean {
  if (!ADMIN_PASSWORD) return false
  const supplied = req.headers.get('x-admin-password') ?? ''
  return safeEqual(supplied, ADMIN_PASSWORD)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (!checkAuth(req)) {
    return withCors(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') ?? 'list'

    if (req.method === 'GET' && action === 'list') {
      const status = url.searchParams.get('status') // optional filter
      let q = admin
        .from('crowd_reports')
        .select(
          'id, created_at, status, report_text, location_text, latitude, longitude, image_url, submitter_name, reviewed_at, reviewer_note',
        )
        .order('created_at', { ascending: false })
        .limit(200)
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        q = q.eq('status', status)
      }
      const { data, error } = await q
      if (error) throw error

      // Counts by status for the queue badge
      const { data: counts, error: countErr } = await admin
        .from('crowd_reports')
        .select('status', { count: 'exact', head: false })
      if (countErr) throw countErr
      const tally = { pending: 0, approved: 0, rejected: 0 }
      for (const r of counts ?? []) {
        const s = (r as { status: string }).status as keyof typeof tally
        if (s in tally) tally[s]++
      }

      return withCors(JSON.stringify({ reports: data ?? [], counts: tally }))
    }

    if (req.method === 'POST' && action === 'moderate') {
      const body = await req.json().catch(() => ({}))
      const id = String(body?.id ?? '')
      const decision = body?.decision as 'approve' | 'reject' | undefined
      const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null

      if (!id || (decision !== 'approve' && decision !== 'reject')) {
        return withCors(JSON.stringify({ error: 'bad_request' }), { status: 400 })
      }

      const { data, error } = await admin
        .from('crowd_reports')
        .update({
          status: decision === 'approve' ? 'approved' : 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewer_note: note,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return withCors(JSON.stringify({ ok: true, report: data }))
    }

    if (req.method === 'POST' && action === 'delete') {
      const body = await req.json().catch(() => ({}))
      const id = String(body?.id ?? '')
      if (!id) {
        return withCors(JSON.stringify({ error: 'bad_request' }), { status: 400 })
      }
      // Best-effort: also remove the image from storage if present
      const { data: row } = await admin
        .from('crowd_reports')
        .select('image_url')
        .eq('id', id)
        .single()
      if (row?.image_url) {
        const m = row.image_url.match(/\/crowd-reports\/(.+)$/)
        if (m) {
          await admin.storage.from('crowd-reports').remove([m[1]])
        }
      }
      const { error } = await admin.from('crowd_reports').delete().eq('id', id)
      if (error) throw error
      return withCors(JSON.stringify({ ok: true }))
    }

    return withCors(JSON.stringify({ error: 'unknown_action' }), { status: 400 })
  } catch (err) {
    console.error('admin-crowd-reports error:', err)
    return withCors(
      JSON.stringify({ error: err instanceof Error ? err.message : 'server_error' }),
      { status: 500 },
    )
  }
})
