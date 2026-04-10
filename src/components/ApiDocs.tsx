import { useState } from 'react'
import { Check, Copy, Terminal } from 'lucide-react'

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-summary`
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

function CodeBlock({ label, children }: { label: string; children: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] uppercase tracking-widest text-white/40 font-mono">
          {label}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(children)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="bg-black/50 border border-white/10 rounded-md p-3 text-[11px] font-mono text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
        {children}
      </pre>
    </div>
  )
}

export function ApiDocs() {
  const curl = `curl -s "${API_URL}" \\
  -H "apikey: ${ANON_KEY}"`

  const js = `const res = await fetch(
  "${API_URL}",
  { headers: { apikey: "${ANON_KEY}" } }
);
const { summary } = await res.json();
console.log(summary.headline);`

  const exampleResponse = `{
  "ok": true,
  "summary": {
    "id": "...",
    "generated_at": "2026-04-10T11:34:06Z",
    "headline": "Cyclone Vaianu approaches northeast coast...",
    "summary": "Cyclone Vaianu remains on track...",
    "severity": "red",
    "key_points": ["...", "...", "...", "..."],
    "regional_snapshot": { "regions": [...] },
    "model": "claude-haiku-4-5-20251001"
  }
}`

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="h-4 w-4 text-white/50" />
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
          Public API · Summary Endpoint
        </div>
      </div>

      <p className="text-xs text-white/60 leading-relaxed mb-4 max-w-2xl">
        A new AI situation report is generated every 15 minutes from the same live
        weather + news feeds you see on this dashboard. The endpoint is public &
        read-only — hit it from anywhere, no auth beyond the Supabase publishable key.
        Pass <code className="text-white/80 bg-white/10 rounded px-1">?limit=N</code>{' '}
        (max 20) for the N most recent reports.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CodeBlock label="cURL">{curl}</CodeBlock>
        <CodeBlock label="JavaScript">{js}</CodeBlock>
      </div>

      <div className="mt-4">
        <CodeBlock label="Example response">{exampleResponse}</CodeBlock>
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-wider">
        <span>
          GET{' '}
          <span className="text-white/60">/functions/v1/api-summary</span>
        </span>
        <span>·</span>
        <span>30s edge cache</span>
        <span>·</span>
        <span>CORS open</span>
      </div>

      <a
        href="https://thecolab.ai/"
        target="_blank"
        rel="noreferrer"
        className="group relative mt-5 flex items-center gap-3.5 rounded-2xl border border-white/15 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent hover:border-white/30 hover:from-white/[0.10] transition-all px-4 py-3 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
        <img
          src="/thecolab-logo.jpg"
          alt="The Colab"
          className="relative h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-white/20 group-hover:ring-white/40 transition-all"
          loading="lazy"
        />
        <div className="relative text-left leading-tight">
          <div className="text-[9px] uppercase tracking-[0.22em] font-mono text-white/45 group-hover:text-white/60 transition-colors mb-0.5">
            Built by
          </div>
          <div className="font-display text-lg font-bold text-white tracking-tight leading-none">
            thecolab<span className="text-red-400">.</span>ai
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.14em] font-mono text-white/50 group-hover:text-white/70 transition-colors">
            Supporting the cyclone response
          </div>
        </div>
      </a>
    </div>
  )
}
