import { useMetServiceWarning } from '@/hooks/useMetService'
import { ShieldAlert } from 'lucide-react'

/** Parse MetService's HTML payload into clean prose blocks: a headline
 *  (from the first <b>), paragraphs for the body, and any embedded URLs
 *  turned into anchor-ready plain text. Drops SVG/style/script wholesale. */
interface ParsedWarning {
  heading: string | null
  paragraphs: string[]
  links: Array<{ href: string; text: string }>
}

function parseMetServiceHtml(html: string): ParsedWarning {
  // Strip noise.
  const cleaned = html
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
    .replace(/\sclass="[^"]*"/gi, '')

  // Pull the first <b>...</b> as heading.
  const headingMatch = cleaned.match(/<b>([\s\S]*?)<\/b>/i)
  const heading = headingMatch ? stripTags(headingMatch[1]).trim() : null

  // Split into paragraphs.
  const paragraphs: string[] = []
  const pRegex = /<p>([\s\S]*?)<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = pRegex.exec(cleaned))) {
    const text = stripTags(m[1]).replace(/\s+/g, ' ').trim()
    if (!text) continue
    // Skip the heading paragraph if we already captured it as heading.
    if (heading && text === heading) continue
    paragraphs.push(text)
  }

  // Extract URLs for separate display.
  const links: Array<{ href: string; text: string }> = []
  const urlRegex = /https?:\/\/[^\s<>"'()]+/g
  for (const p of paragraphs) {
    const matches = p.match(urlRegex)
    if (matches) {
      for (const href of matches) {
        if (!links.find((l) => l.href === href)) {
          links.push({ href, text: href.replace(/^https?:\/\//, '').replace(/\/$/, '') })
        }
      }
    }
  }

  // Remove raw URLs from the paragraphs (we display them separately).
  const cleanParagraphs = paragraphs.map((p) => p.replace(urlRegex, '').replace(/\s+/g, ' ').trim()).filter(Boolean)

  return { heading, paragraphs: cleanParagraphs, links }
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '')
}

function levelStyles(level: string) {
  switch ((level ?? '').toLowerCase()) {
    case 'red':
      return {
        wrap: 'from-red-600/25 to-red-900/10 border-red-500/40',
        chip: 'bg-red-500/25 text-red-300 border-red-500/50',
        label: 'RED WARNING',
      }
    case 'orange':
      return {
        wrap: 'from-amber-500/25 to-amber-900/10 border-amber-500/40',
        chip: 'bg-amber-500/25 text-amber-300 border-amber-500/50',
        label: 'ORANGE WARNING',
      }
    case 'yellow':
      return {
        wrap: 'from-yellow-500/20 to-yellow-800/10 border-yellow-500/30',
        chip: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        label: 'YELLOW WATCH',
      }
    default:
      return {
        wrap: 'from-sky-500/15 to-sky-900/10 border-sky-500/30',
        chip: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        label: 'ADVISORY',
      }
  }
}

function timeAgo(iso: string) {
  const delta = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.floor(delta / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
}

export function MetServiceWarning() {
  const { data: envelope, isLoading, error } = useMetServiceWarning()
  const warning = envelope?.data
  const level = warning?.highestWarnLevel ?? 'none'
  const styles = levelStyles(level)

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${styles.wrap} border backdrop-blur-sm p-5`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
            <ShieldAlert className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 font-bold">
              MetService Severe Weather
            </div>
            <div className="text-[9px] text-white/40 font-mono uppercase tracking-wider">
              Official NZ forecaster · metservice.com
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border rounded ${styles.chip}`}
          >
            {styles.label}
          </span>
        </div>
      </div>

      {isLoading && !warning && (
        <div className="space-y-2">
          <div className="h-4 w-5/6 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-white/5 rounded animate-pulse" />
        </div>
      )}

      {error && (
        <div className="text-xs text-red-300 py-2">
          Couldn't reach MetService — retrying on next cycle.
        </div>
      )}

      {warning && warning.hasWarning && warning.mainText && (() => {
        const parsed = parseMetServiceHtml(warning.mainText)
        return (
          <div className="space-y-3">
            {parsed.heading && (
              <h2 className="font-display text-lg sm:text-xl font-bold leading-tight text-white">
                {parsed.heading}
              </h2>
            )}
            <div className="space-y-2">
              {parsed.paragraphs.map((p, i) => (
                <p key={i} className="text-[13px] text-white/80 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            {parsed.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {parsed.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-amber-300 hover:text-amber-200 underline underline-offset-2 bg-black/30 px-2 py-1 rounded border border-amber-500/20"
                  >
                    {l.text}
                  </a>
                ))}
              </div>
            )}
            {envelope?.fetchedAt && (
              <div className="pt-2 mt-2 border-t border-white/5 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                Issued {timeAgo(envelope.fetchedAt)} · source: {envelope.source}
              </div>
            )}
          </div>
        )
      })()}

      {warning && !warning.hasWarning && (
        <div className="text-sm text-white/70">
          No active severe weather warnings from MetService.
        </div>
      )}
    </div>
  )
}
