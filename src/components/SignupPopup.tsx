import { useEffect, useState } from 'react'
import { X, Sparkles, Loader2, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'vaianu_signup_dismissed_v1'
const DELAY_MS = 30_000

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface SignupPopupProps {
  /** Suppress the popup entirely (e.g. on the Ground Reports tab where we
   *  don't want to interrupt photo submission). */
  disabled?: boolean
}

export function SignupPopup({ disabled }: SignupPopupProps = {}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (disabled) {
      setOpen(false)
      return
    }
    if (typeof window === 'undefined') return
    if (window.localStorage.getItem(STORAGE_KEY)) return
    const t = window.setTimeout(() => setOpen(true), DELAY_MS)
    return () => window.clearTimeout(t)
  }, [disabled])

  if (disabled) return null

  function dismiss() {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('error')
      setErrorMsg('Enter a valid email address')
      return
    }
    setStatus('submitting')
    setErrorMsg(null)
    const { error } = await supabase.from('email_signups').insert({
      email: trimmed,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      referrer:
        typeof document !== 'undefined' ? document.referrer.slice(0, 500) || null : null,
    })
    if (error) {
      // Unique violation = already signed up — treat as success
      if (error.code === '23505') {
        setStatus('success')
        try {
          window.localStorage.setItem(STORAGE_KEY, '1')
        } catch {
          /* ignore */
        }
        return
      }
      setStatus('error')
      setErrorMsg('Could not save — please try again')
      return
    }
    setStatus('success')
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#0f1729] via-[#0a1020] to-[#070b16] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accents */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.18),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_55%)]" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-white/40 hover:text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-7">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
              <Sparkles className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
                Behind the build
              </span>
            </div>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-[1.05] text-white mb-2">
            Want to know how we built this<span className="text-red-500">.</span>
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-5">
            We pulled together this live cyclone dashboard — feeds, AI briefings, the
            lot — in <span className="text-white/90 font-semibold">hours</span>. Drop
            your email and we'll send a write-up of how it came together.
          </p>

          {status === 'success' ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <Check className="h-3.5 w-3.5 text-emerald-300" />
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-200">You're on the list</div>
                <div className="text-[11px] text-emerald-300/70">
                  We'll be in touch with the write-up soon.
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (status === 'error') {
                      setStatus('idle')
                      setErrorMsg(null)
                    }
                  }}
                  placeholder="you@example.com"
                  autoFocus
                  disabled={status === 'submitting'}
                  className="flex-1 min-w-0 rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-red-700/60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-colors"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending
                    </>
                  ) : (
                    'Notify me'
                  )}
                </button>
              </div>
              {errorMsg && (
                <p className="text-[11px] text-red-300/90 font-mono uppercase tracking-wider pl-0.5">
                  {errorMsg}
                </p>
              )}
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-mono pt-1">
                One email · no spam · unsubscribe anytime
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
