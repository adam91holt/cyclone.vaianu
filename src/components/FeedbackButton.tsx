import { useState } from 'react'
import {
  MessageSquarePlus,
  Lightbulb,
  AlertTriangle,
  MessageCircle,
  Loader2,
  Send,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useFeedback, useSubmitFeedback, type FeedbackKind } from '@/hooks/useFeedback'

const KIND_META: Record<
  FeedbackKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  suggestion: {
    label: 'Suggestion',
    icon: Lightbulb,
    color: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
  },
  data_issue: {
    label: 'Data issue',
    icon: AlertTriangle,
    color: 'text-red-300 bg-red-500/15 border-red-500/30',
  },
  other: {
    label: 'Other',
    icon: MessageCircle,
    color: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
  },
}

function timeAgo(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind>('suggestion')
  const [message, setMessage] = useState('')
  const [justSent, setJustSent] = useState(false)
  const { data: items } = useFeedback(50)
  const submit = useSubmitFeedback()

  const canSubmit = message.trim().length >= 3 && !submit.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await submit.mutateAsync({ kind, message })
      setMessage('')
      setJustSent(true)
      setTimeout(() => setJustSent(false), 2500)
    } catch (err) {
      console.error('Failed to submit feedback', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative flex items-center gap-1.5 rounded-md bg-gradient-to-br from-amber-400/25 to-amber-600/15 border border-amber-400/50 hover:from-amber-400/35 hover:to-amber-500/25 hover:border-amber-300/70 transition-all px-2.5 py-1 shadow-[0_0_20px_-4px_rgba(251,191,36,0.5)] hover:shadow-[0_0_24px_-2px_rgba(251,191,36,0.7)]"
          aria-label="Send feedback"
        >
          <span className="absolute inset-0 rounded-md ring-1 ring-amber-300/40 animate-feedback-pulse pointer-events-none" />
          <MessageSquarePlus className="relative h-3 w-3 text-amber-200" />
          <span className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">
            Tell us what to add
          </span>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-hidden flex flex-col bg-[#0a0f1e] border-white/10 text-white p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="font-display text-xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-white/60" />
            Feedback & suggestions
          </DialogTitle>
          <div className="text-[11px] text-white/55 leading-relaxed mt-1">
            Tell us what to add, or flag bad data. Everything here is public —
            you can see what others are asking for too.
          </div>
        </DialogHeader>

        {/* Submit form */}
        <form onSubmit={handleSubmit} className="px-5 pt-4 pb-4 border-b border-white/10 space-y-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-2">
              Type
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(Object.keys(KIND_META) as FeedbackKind[]).map((k) => {
                const meta = KIND_META[k]
                const Icon = meta.icon
                const active = kind === k
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded border transition-colors ${
                      active
                        ? meta.color
                        : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-2">
              Message
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              placeholder={
                kind === 'suggestion'
                  ? 'What would you like us to add? A new data source, a feature, a region…'
                  : kind === 'data_issue'
                  ? 'What looks wrong? Which panel, what region, what did you see?'
                  : 'What would you like to tell us?'
              }
              rows={3}
              className="w-full text-[13px] bg-white/[0.04] border border-white/10 rounded-md px-3 py-2 text-white/90 placeholder:text-white/30 resize-none focus:outline-none focus:border-white/30 focus:bg-white/[0.06] transition-colors"
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[9px] font-mono text-white/30">
                {message.length}/2000 · public
              </div>
              {submit.isError && (
                <div className="text-[10px] text-red-400">Failed — try again</div>
              )}
              {justSent && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <Check className="h-3 w-3" /> Posted
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider px-3 py-1.5 rounded border bg-white/10 border-white/20 text-white hover:bg-white/15 hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submit.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
              Post feedback
            </button>
          </div>
        </form>

        {/* Public feed */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono mb-3">
            What others are saying ({items?.length ?? 0})
          </div>
          {!items && (
            <div className="text-[11px] text-white/40 italic py-8 text-center">
              Loading…
            </div>
          )}
          {items && items.length === 0 && (
            <div className="text-[11px] text-white/40 italic py-8 text-center">
              No feedback yet — be the first.
            </div>
          )}
          <div className="space-y-2">
            {items?.map((item) => {
              const meta = KIND_META[item.kind]
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className="border border-white/5 bg-white/[0.02] rounded-md px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${meta.color}`}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {meta.label}
                    </span>
                    <span className="text-[9px] font-mono text-white/35 tabular-nums">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  <div className="text-[12px] text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                    {item.message}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
