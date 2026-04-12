import { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Sparkles,
  Clock,
  ChevronDown,
  ChevronRight,
  Wrench,
  Loader2,
  Cpu,
  Zap,
} from 'lucide-react'
import {
  useComprehensiveReports,
  type ComprehensiveReport as Report,
} from '@/hooks/useComprehensiveReports'

function timeAgo(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.round((now - t) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function formatNzt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

const SEV_BADGE: Record<string, string> = {
  red: 'bg-red-500/25 border-red-500/60 text-red-200',
  orange: 'bg-orange-500/25 border-orange-500/60 text-orange-200',
  yellow: 'bg-yellow-500/25 border-yellow-500/60 text-yellow-200',
  advisory: 'bg-sky-500/20 border-sky-500/40 text-sky-200',
}

function formatTokens(n: number | null): string {
  if (n === null || n === undefined) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatToolInput(input: unknown): string {
  if (!input || typeof input !== 'object') return ''
  const keys = Object.keys(input as Record<string, unknown>)
  if (keys.length === 0) return ''
  return ` (${JSON.stringify(input)})`
}

function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose-custom text-[13px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[18px] font-bold text-white mt-6 mb-3">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[15px] font-bold text-white mt-6 mb-2 border-b border-white/10 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13px] font-bold text-white/95 mt-4 mb-1.5 uppercase tracking-wider">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-white/80 mb-3 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-white/80">{children}</li>,
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-white/90 italic">{children}</em>,
          hr: () => <hr className="border-white/10 my-5" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full text-[12px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/[0.04] text-white/60 uppercase tracking-wider text-[10px]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-2 py-1.5 text-left border border-white/10 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1.5 border border-white/10 text-white/80 align-top">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/20 pl-3 italic text-white/60 my-3">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-white/10 rounded px-1 py-0.5 font-mono text-[11px] text-white/90">
              {children}
            </code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

function ReportCard({ report, defaultOpen }: { report: Report; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const sev = report.severity ?? 'advisory'
  const badge = SEV_BADGE[sev] ?? SEV_BADGE.advisory

  const totalTokens =
    (report.input_tokens ?? 0) +
    (report.output_tokens ?? 0) +
    (report.cache_read_tokens ?? 0) +
    (report.cache_creation_tokens ?? 0)

  return (
    <div className="border border-white/10 rounded-lg bg-gradient-to-br from-white/[0.03] to-transparent overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-1">
            {open ? (
              <ChevronDown className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${badge}`}
              >
                {sev}
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-white/40 uppercase tracking-wider">
                <Clock className="h-2.5 w-2.5" /> {timeAgo(report.generated_at)}
              </span>
              <span className="text-[9px] font-mono text-white/30 tabular-nums">
                {formatNzt(report.generated_at)}
              </span>
              <span className="flex items-center gap-1 text-[9px] font-mono text-white/30">
                <Cpu className="h-2.5 w-2.5" /> {report.model}
              </span>
            </div>
            <div className="text-[14px] text-white/95 font-bold leading-snug">
              {report.headline}
            </div>
            {report.summary && !open && (
              <div className="text-[12px] text-white/60 mt-1 leading-relaxed line-clamp-2">
                {report.summary}
              </div>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/5">
          {report.summary && (
            <div className="my-4 text-[13px] text-white/85 leading-relaxed italic border-l-2 border-white/20 pl-3">
              {report.summary}
            </div>
          )}

          {report.key_findings.length > 0 && (
            <div className="my-4">
              <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-2">
                Key Findings
              </div>
              <ul className="space-y-1.5">
                {report.key_findings.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[12px] text-white/80 bg-white/[0.03] border border-white/5 rounded px-2.5 py-1.5"
                  >
                    <span className="font-mono text-white/30 font-bold shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-white/10">
            <ReportMarkdown markdown={report.markdown} />
          </div>

          {/* Agent trace */}
          {report.tool_calls && report.tool_calls.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setToolsOpen((t) => !t)}
                className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 uppercase tracking-wider font-mono"
              >
                {toolsOpen ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Wrench className="h-3 w-3" />
                Agent trace — {report.tool_calls.length} tool calls
              </button>
              {toolsOpen && (
                <div className="mt-2 space-y-1">
                  {report.tool_calls.map((tc, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-mono text-white/50 bg-black/30 border border-white/5 rounded px-2 py-1.5"
                    >
                      <div className="text-sky-300">
                        {i + 1}. {tc.name}
                        <span className="text-white/40">{formatToolInput(tc.input)}</span>
                      </div>
                      {tc.result_preview && (
                        <div className="text-white/40 mt-0.5 truncate">
                          → {tc.result_preview}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metrics footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Zap className="h-2.5 w-2.5" />
              {report.duration_ms ? `${(report.duration_ms / 1000).toFixed(1)}s` : '—'}
            </span>
            <span>in {formatTokens(report.input_tokens)}</span>
            <span>out {formatTokens(report.output_tokens)}</span>
            {(report.cache_read_tokens ?? 0) > 0 && (
              <span className="text-emerald-400/60">
                cache {formatTokens(report.cache_read_tokens)}
              </span>
            )}
            <span>total {formatTokens(totalTokens)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ComprehensiveReport() {
  const { data, isLoading, error } = useComprehensiveReports(12)
  const latest = useMemo(() => data?.[0], [data])

  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white/50" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
            Comprehensive Report · Claude Opus 4.6
          </div>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">
          Every 6 hours · agentic tool use
        </div>
      </div>

      <div className="mb-4 text-[11px] text-white/50 leading-relaxed">
        A deep synthesis generated every 6 hours. Claude Opus 4.6 runs an agentic loop — it
        calls tools against MetService warnings, NEMA alerts, NIWA forecasts, roads, power
        outages, rivers, news feeds, and the live timeline — then writes the full report
        from the data it gathered.
      </div>

      {error && (
        <div className="text-xs text-red-400 py-4 text-center">
          Couldn't load reports.
        </div>
      )}

      {isLoading && !data && (
        <div className="flex items-center justify-center gap-2 py-12 text-white/50 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading reports…
        </div>
      )}

      {data && data.length === 0 && (
        <div className="text-xs text-white/50 py-10 text-center italic">
          No reports yet. The first report generates at the top of the next hour.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((r) => (
            <ReportCard key={r.id} report={r} defaultOpen={r.id === latest?.id} />
          ))}
        </div>
      )}
    </div>
  )
}
