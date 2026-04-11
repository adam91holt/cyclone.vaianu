import { useState, useEffect, useCallback } from 'react'
import {
  Lock,
  Loader2,
  Check,
  X as XIcon,
  Trash2,
  MapPin,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Terminal,
  Copy,
  ChevronDown,
  ChevronRight,
  Bot,
} from 'lucide-react'
const STORAGE_KEY = 'vaianu_admin_pw'

interface AdminReport {
  id: string
  created_at: string
  status: 'pending' | 'approved' | 'rejected'
  report_text: string
  location_text: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
  submitter_name: string | null
  reviewed_at: string | null
  reviewer_note: string | null
}

interface AdminListResponse {
  reports: AdminReport[]
  counts: { pending: number; approved: number; rejected: number }
}

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

async function callAdmin<T>(
  password: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-crowd-reports${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
  })
  if (res.status === 401) {
    throw new Error('UNAUTHORIZED')
  }
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${res.status}: ${txt}`)
  }
  return res.json() as Promise<T>
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const STATUS_STYLE: Record<AdminReport['status'], string> = {
  pending: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
  approved: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  rejected: 'bg-red-500/15 border-red-500/40 text-red-300',
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-md border border-white/10 bg-black/50 p-3 text-[11px] font-mono text-white/80 leading-relaxed">
        {language && (
          <div className="text-[8px] uppercase tracking-wider text-white/30 mb-1.5">
            {language}
          </div>
        )}
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#0a0f1e]/90 hover:bg-white/[0.08] px-2 py-1 text-[9px] uppercase tracking-wider font-mono text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <>
            <Check className="h-2.5 w-2.5 text-emerald-300" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-2.5 w-2.5" />
            Copy
          </>
        )}
      </button>
    </div>
  )
}

function ApiDocsPanel({ password }: { password: string }) {
  const [open, setOpen] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-crowd-reports`
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  const pwDisplay = showPw ? password : '•'.repeat(Math.max(8, password.length))

  const listCurl = `curl -s "${baseUrl}?action=list&status=pending" \\
  -H "Authorization: Bearer ${anonKey}" \\
  -H "x-admin-password: ${pwDisplay}"`

  const approveCurl = `curl -s -X POST "${baseUrl}?action=moderate" \\
  -H "Authorization: Bearer ${anonKey}" \\
  -H "x-admin-password: ${pwDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"REPORT_UUID","decision":"approve"}'`

  const rejectCurl = `curl -s -X POST "${baseUrl}?action=moderate" \\
  -H "Authorization: Bearer ${anonKey}" \\
  -H "x-admin-password: ${pwDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"REPORT_UUID","decision":"reject","note":"off-topic"}'`

  const deleteCurl = `curl -s -X POST "${baseUrl}?action=delete" \\
  -H "Authorization: Bearer ${anonKey}" \\
  -H "x-admin-password: ${pwDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"REPORT_UUID"}'`

  const agentSnippet = `# Python — agent moderation loop
import os, requests
from anthropic import Anthropic

BASE = "${baseUrl}"
HEADERS = {
    "Authorization": f"Bearer {os.environ['SUPABASE_ANON_KEY']}",
    "x-admin-password": os.environ["VAIANU_ADMIN_PASSWORD"],
    "Content-Type": "application/json",
}

client = Anthropic()  # uses ANTHROPIC_API_KEY

# 1. Fetch pending reports
pending = requests.get(f"{BASE}?action=list&status=pending", headers=HEADERS).json()

for report in pending["reports"]:
    # 2. Build content blocks — text + image (Claude reads images natively)
    blocks = [{"type": "text", "text": (
        f"Cyclone Vaianu ground report.\\n\\n"
        f"Location: {report['location_text']}\\n"
        f"Submitter: {report['submitter_name'] or 'Anonymous'}\\n"
        f"Text: {report['report_text']}\\n\\n"
        "Decide: approve if it's a credible cyclone-related observation "
        "(damage, flooding, weather, road/power impact). Reject if it's "
        "spam, off-topic, harmful, or unverifiable. Reply with JSON only: "
        '{\"decision\": \"approve\"|\"reject\", \"reason\": \"...\"}'
    )}]
    if report.get("image_url"):
        blocks.append({
            "type": "image",
            "source": {"type": "url", "url": report["image_url"]},
        })

    # 3. Ask Claude
    msg = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=400,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": blocks}],
    )
    verdict = msg.content[-1].text  # last block is the JSON reply

    # 4. Parse and act
    import json
    parsed = json.loads(verdict)
    requests.post(
        f"{BASE}?action=moderate",
        headers=HEADERS,
        json={
            "id": report["id"],
            "decision": parsed["decision"],
            "note": parsed.get("reason"),
        },
    )
    print(f"{report['id'][:8]} → {parsed['decision']}: {parsed['reason']}")
`

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f1729]/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15 border border-blue-500/30">
            <Bot className="h-3.5 w-3.5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Agent API</span>
              <span className="text-[8px] uppercase tracking-wider font-mono text-blue-300/80 bg-blue-500/10 border border-blue-500/30 rounded-sm px-1.5 py-0.5">
                BETA
              </span>
            </div>
            <div className="text-[10px] text-white/45 font-mono uppercase tracking-wider mt-0.5">
              Programmatic moderation · let an LLM read photos and decide
            </div>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-white/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
          <div className="pt-4 space-y-2 text-[12px] text-white/70 leading-relaxed">
            <p>
              The same endpoints this page uses are exposed as a JSON API.
              Auth is a single header (<code className="text-[11px] text-blue-300 bg-black/40 px-1 rounded">x-admin-password</code>),
              so you can wire an agent — or just a cron — to do moderation
              for you. Image URLs are public, so any vision-capable model
              can fetch them directly.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-mono">
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-2 py-1 text-white/60 hover:text-white transition-colors"
            >
              <Lock className="h-2.5 w-2.5" />
              {showPw ? 'Hide password' : 'Reveal password in samples'}
            </button>
            {showPw && (
              <span className="text-[9px] text-amber-300/80">
                Don't share these snippets with the password visible
              </span>
            )}
          </div>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <Terminal className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/60 font-bold">
                GET · list pending reports
              </span>
            </div>
            <p className="text-[11px] text-white/50 mb-1.5 leading-relaxed">
              Returns up to 200 reports. Add{' '}
              <code className="text-[10px] text-blue-300 bg-black/40 px-1 rounded">
                ?status=approved
              </code>{' '}
              or <code className="text-[10px] text-blue-300 bg-black/40 px-1 rounded">rejected</code> to filter.
              Each row includes <code className="text-[10px] text-blue-300 bg-black/40 px-1 rounded">image_url</code>{' '}
              (publicly fetchable for vision models).
            </p>
            <CodeBlock code={listCurl} language="curl" />
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <Check className="h-3 w-3 text-emerald-300" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/60 font-bold">
                POST · approve
              </span>
            </div>
            <CodeBlock code={approveCurl} language="curl" />
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <XIcon className="h-3 w-3 text-red-300" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/60 font-bold">
                POST · reject (with optional note)
              </span>
            </div>
            <CodeBlock code={rejectCurl} language="curl" />
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <Trash2 className="h-3 w-3 text-red-300" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/60 font-bold">
                POST · delete (also removes the image from storage)
              </span>
            </div>
            <CodeBlock code={deleteCurl} language="curl" />
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <Bot className="h-3 w-3 text-blue-300" />
              <span className="text-[10px] uppercase tracking-wider font-mono text-white/60 font-bold">
                Example · Claude vision agent loop
              </span>
            </div>
            <p className="text-[11px] text-white/50 mb-1.5 leading-relaxed">
              Drop this into a cron, a worker, or run it locally. Claude
              reads each photo + text, returns a JSON verdict, and the
              script acts on it. Cost is roughly $0.005 per report.
            </p>
            <CodeBlock code={agentSnippet} language="python" />
          </section>

          <section className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200/85 leading-relaxed">
            <div className="flex items-start gap-2">
              <Lock className="h-3 w-3 mt-0.5 shrink-0 text-amber-300" />
              <div>
                <div className="font-bold uppercase tracking-wider text-[9px] text-amber-300 mb-1">
                  Security
                </div>
                Rotate the password if you suspect it leaked — it gates
                read, approve, reject, and delete on every report ever
                submitted. Image URLs in storage stay public after rotation.
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export function AdminReports() {
  const [password, setPassword] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return window.sessionStorage.getItem(STORAGE_KEY) ?? ''
  })
  const [authed, setAuthed] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reports, setReports] = useState<AdminReport[]>([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState<Filter>('pending')
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (pw: string, status: Filter) => {
      setBusy(true)
      setError(null)
      try {
        const qs =
          status === 'all' ? '?action=list' : `?action=list&status=${status}`
        const res = await callAdmin<AdminListResponse>(pw, qs)
        setReports(res.reports)
        setCounts(res.counts)
        setAuthed(true)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(STORAGE_KEY, pw)
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          setAuthed(false)
          setPwError('Wrong password')
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem(STORAGE_KEY)
          }
        } else {
          setError(err instanceof Error ? err.message : 'Load failed')
        }
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  // On mount, if we have a saved password, try it
  useEffect(() => {
    if (password) {
      void load(password, filter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (!pwInput.trim()) {
      setPwError('Enter the admin password')
      return
    }
    setPassword(pwInput.trim())
    void load(pwInput.trim(), filter)
  }

  function handleLogout() {
    setAuthed(false)
    setPassword('')
    setPwInput('')
    setReports([])
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
    if (typeof window !== 'undefined') {
      window.location.hash = ''
    }
  }

  function changeFilter(next: Filter) {
    setFilter(next)
    if (password) void load(password, next)
  }

  async function moderate(id: string, decision: 'approve' | 'reject') {
    setActingId(id)
    try {
      await callAdmin(password, '?action=moderate', {
        method: 'POST',
        body: JSON.stringify({ id, decision }),
      })
      // Optimistic: refresh list
      await load(password, filter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActingId(null)
    }
  }

  async function destroy(id: string) {
    if (!confirm('Delete this report permanently?')) return
    setActingId(id)
    try {
      await callAdmin(password, '?action=delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      })
      await load(password, filter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActingId(null)
    }
  }

  // Login screen
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#070b16] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5 mb-3">
              <ShieldCheck className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
                Admin · moderation
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              Sign in
            </h1>
            <p className="mt-1 text-xs text-white/50">
              Crowd report moderation queue
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#0f1729] via-[#0a1020] to-[#070b16] p-5 space-y-3"
          >
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] font-mono text-white/45 mb-1.5">
                Admin password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <input
                  type="password"
                  value={pwInput}
                  onChange={(e) => setPwInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full rounded-md border border-white/15 bg-white/[0.04] pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors"
                />
              </div>
            </div>
            {pwError && (
              <p className="text-[11px] text-red-300/90 font-mono uppercase tracking-wider">
                {pwError}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-red-700/60 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-colors"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.location.hash = ''
            }}
            className="mt-4 w-full text-center text-[10px] uppercase tracking-[0.15em] text-white/40 hover:text-white/70 font-mono transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  // Authed view
  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <header className="border-b border-white/10 bg-[#0a0f1e]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1300px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                Admin · authenticated
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Moderation queue
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(password, filter)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-2 text-[10px] uppercase tracking-wider font-mono text-white/70 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-red-500/15 hover:border-red-500/30 px-3 py-2 text-[10px] uppercase tracking-wider font-mono text-white/70 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1300px] mx-auto px-5 py-5 space-y-4">
        <ApiDocsPanel password={password} />

        {/* Filter tabs with counts */}
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { key: 'pending', label: 'Pending', count: counts.pending },
              { key: 'approved', label: 'Approved', count: counts.approved },
              { key: 'rejected', label: 'Rejected', count: counts.rejected },
              {
                key: 'all',
                label: 'All',
                count: counts.pending + counts.approved + counts.rejected,
              },
            ] as { key: Filter; label: string; count: number }[]
          ).map(({ key, label, count }) => {
            const active = filter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => changeFilter(key)}
                className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-wider font-mono transition-colors ${
                  active
                    ? 'border-red-500/50 bg-red-500/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:text-white/85 hover:bg-white/[0.06]'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`tabular-nums ${active ? 'text-red-300' : 'text-white/35'}`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {error}
          </div>
        )}

        {/* Reports list */}
        {busy && reports.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center text-white/50 text-sm">
            No {filter === 'all' ? '' : filter} reports
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <article
                key={r.id}
                className="rounded-lg border border-white/10 bg-[#0f1729]/60 overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-0">
                  {r.image_url && (
                    <a
                      href={r.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="sm:w-56 shrink-0 bg-black/40 group"
                    >
                      <img
                        src={r.image_url}
                        alt=""
                        loading="lazy"
                        className="w-full h-48 sm:h-full object-cover group-hover:opacity-90 transition-opacity"
                      />
                    </a>
                  )}
                  <div className="flex-1 min-w-0 p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider font-mono ${STATUS_STYLE[r.status]}`}
                        >
                          {r.status}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-300">
                          <MapPin className="h-3 w-3" />
                          {r.location_text}
                        </span>
                        {r.latitude != null && r.longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] uppercase tracking-wider font-mono text-blue-300 hover:text-blue-200"
                          >
                            {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)} ↗
                          </a>
                        )}
                      </div>
                      <span className="text-[9px] uppercase tracking-wider font-mono text-white/35 tabular-nums">
                        {timeAgo(r.created_at)}
                      </span>
                    </div>

                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                      {r.report_text}
                    </p>

                    <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider">
                      by {r.submitter_name || 'Anonymous'}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      {r.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => moderate(r.id, 'approve')}
                            disabled={actingId === r.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => moderate(r.id, 'reject')}
                            disabled={actingId === r.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80 transition-colors"
                          >
                            <XIcon className="h-3 w-3" />
                            Reject
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => moderate(r.id, 'reject')}
                          disabled={actingId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/80 transition-colors"
                        >
                          <XIcon className="h-3 w-3" />
                          Unapprove
                        </button>
                      )}
                      {r.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => moderate(r.id, 'approve')}
                          disabled={actingId === r.id}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => destroy(r.id)}
                        disabled={actingId === r.id}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 hover:border-red-500/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
