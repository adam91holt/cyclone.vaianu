import { useState, useRef } from 'react'
import {
  X,
  Camera,
  MapPin,
  Loader2,
  Check,
  Crosshair,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

interface SubmitReportModalProps {
  open: boolean
  onClose: () => void
}

export function SubmitReportModal({ open, onClose }: SubmitReportModalProps) {
  const [reportText, setReportText] = useState('')
  const [locationText, setLocationText] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [geoBusy, setGeoBusy] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setReportText('')
    setLocationText('')
    setSubmitterName('')
    setCoords(null)
    setImageFile(null)
    setImagePreview(null)
    setStatus('idle')
    setErrorMsg(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMsg('Image must be under 5 MB')
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setErrorMsg(null)
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Geolocation not supported on this device')
      return
    }
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lon: Number(pos.coords.longitude.toFixed(5)),
        })
        setGeoBusy(false)
      },
      (err) => {
        setGeoBusy(false)
        setErrorMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied'
            : 'Could not get your location',
        )
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedText = reportText.trim()
    const trimmedLocation = locationText.trim()
    const trimmedName = submitterName.trim()

    if (trimmedText.length < 3) {
      setStatus('error')
      setErrorMsg('Tell us what you saw (at least a few words)')
      return
    }
    if (trimmedLocation.length < 2) {
      setStatus('error')
      setErrorMsg('Where is this? Add a place name')
      return
    }

    setStatus('submitting')

    try {
      let imageUrl: string | null = null
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('crowd-reports')
          .upload(path, imageFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: imageFile.type,
          })
        if (upErr) throw upErr
        const { data: pub } = supabase.storage.from('crowd-reports').getPublicUrl(path)
        imageUrl = pub.publicUrl
      }

      const { error: insertErr } = await supabase.from('crowd_reports').insert({
        report_text: trimmedText,
        location_text: trimmedLocation,
        latitude: coords?.lat ?? null,
        longitude: coords?.lon ?? null,
        image_url: imageUrl,
        submitter_name: trimmedName || null,
        user_agent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent.slice(0, 500)
            : null,
      })

      if (insertErr) throw insertErr

      setStatus('success')
    } catch (err) {
      console.error('crowd report submit failed:', err)
      setStatus('error')
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not submit — try again',
      )
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-white/15 bg-gradient-to-br from-[#0f1729] via-[#0a1020] to-[#070b16] shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.16),transparent_60%)]" />

        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-white/40 hover:text-white/90 hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-5 pt-6 pb-5 sm:px-7 sm:pt-7 sm:pb-6">
          {status === 'success' ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/40">
                <Check className="h-7 w-7 text-emerald-300" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-white mb-1">
                  Thanks — sent for review
                </h2>
                <p className="text-sm text-white/60 max-w-sm mx-auto">
                  A moderator will check your report and approve it shortly.
                  Approved reports show up on the live map and feed.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-[11px] uppercase tracking-[0.2em] font-mono text-white/50 hover:text-white/90 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-3">
                <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
                  <Camera className="h-3 w-3 text-red-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
                    Ground report
                  </span>
                </div>
              </div>

              <h2 className="font-display text-2xl sm:text-[26px] font-bold tracking-tight leading-[1.05] text-white mb-1">
                What are you seeing<span className="text-red-500">?</span>
              </h2>
              <p className="text-xs text-white/55 leading-relaxed mb-4">
                Trees down, flooding, power out, anything. Reports are reviewed
                before going live. Don't put yourself in danger to file one.
              </p>

              <form onSubmit={submit} className="space-y-3">
                {/* Report text */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-mono text-white/45 mb-1.5">
                    What's happening
                  </label>
                  <textarea
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="e.g. Tree across SH35 just south of Tolaga Bay, blocking both lanes"
                    rows={3}
                    maxLength={1000}
                    disabled={status === 'submitting'}
                    className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors resize-none disabled:opacity-60"
                  />
                  <div className="mt-1 text-right text-[9px] text-white/30 font-mono tabular-nums">
                    {reportText.length}/1000
                  </div>
                </div>

                {/* Location text + GPS */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-mono text-white/45 mb-1.5">
                    Where
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="Suburb, town, road"
                      maxLength={200}
                      disabled={status === 'submitting'}
                      className="flex-1 min-w-0 rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={useMyLocation}
                      disabled={status === 'submitting' || geoBusy}
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md border px-3 text-[10px] uppercase tracking-wider font-mono transition-colors ${
                        coords
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-white/20 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                      } disabled:opacity-60`}
                      aria-label="Use my location"
                    >
                      {geoBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : coords ? (
                        <MapPin className="h-3 w-3" />
                      ) : (
                        <Crosshair className="h-3 w-3" />
                      )}
                      <span className="hidden sm:inline">
                        {coords ? 'Pinned' : 'GPS'}
                      </span>
                    </button>
                  </div>
                  {coords && (
                    <div className="mt-1 text-[9px] text-emerald-300/70 font-mono tabular-nums">
                      {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)}
                    </div>
                  )}
                </div>

                {/* Photo */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-mono text-white/45 mb-1.5">
                    Photo <span className="text-white/25">(optional)</span>
                  </label>
                  {imagePreview ? (
                    <div className="relative rounded-md overflow-hidden border border-white/15">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full max-h-48 object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 rounded-full bg-black/70 hover:bg-black/90 p-1.5 text-white/80 hover:text-white transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/30 cursor-pointer px-4 py-5 transition-colors">
                      <Camera className="h-4 w-4 text-white/40" />
                      <span className="text-[11px] uppercase tracking-wider font-mono text-white/50">
                        Add a photo
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPT}
                        onChange={handleFile}
                        className="hidden"
                        disabled={status === 'submitting'}
                      />
                    </label>
                  )}
                </div>

                {/* Name (optional) */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] font-mono text-white/45 mb-1.5">
                    Your name <span className="text-white/25">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={submitterName}
                    onChange={(e) => setSubmitterName(e.target.value)}
                    placeholder="Anonymous"
                    maxLength={60}
                    disabled={status === 'submitting'}
                    className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/60 focus:bg-white/[0.06] transition-colors disabled:opacity-60"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-300 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-200 leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-500 disabled:bg-red-700/60 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-colors"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending
                    </>
                  ) : (
                    'Submit report'
                  )}
                </button>

                <p className="text-[9px] uppercase tracking-[0.15em] text-white/30 font-mono text-center pt-1">
                  Reviewed before going live · No personal data stored
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
