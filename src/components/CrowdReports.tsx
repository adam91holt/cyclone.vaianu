import { useState } from 'react'
import { Camera, MapPin, Plus, Loader2, Inbox } from 'lucide-react'
import { useCrowdReports, type CrowdReport } from '@/hooks/useCrowdReports'
import { SubmitReportModal } from '@/components/SubmitReportModal'

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

function ReportCard({ report }: { report: CrowdReport }) {
  return (
    <article className="group relative rounded-lg border border-white/10 bg-[#0f1729]/60 overflow-hidden hover:border-white/20 transition-colors">
      {report.image_url && (
        <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
          <img
            src={report.image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-300">
            {report.location_text}
          </span>
        </div>
        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words">
          {report.report_text}
        </p>
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.06]">
          <span className="text-[9px] uppercase tracking-wider font-mono text-white/40">
            {report.submitter_name || 'Anonymous'}
          </span>
          <span className="text-[9px] uppercase tracking-wider font-mono text-white/30 tabular-nums">
            {timeAgo(report.created_at)}
          </span>
        </div>
      </div>
    </article>
  )
}

export function CrowdReports() {
  const [modalOpen, setModalOpen] = useState(false)
  const { data, isLoading } = useCrowdReports()
  const reports = data ?? []

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5 rounded-sm bg-red-600/15 border border-red-600/30 px-2 py-0.5">
              <Camera className="h-3 w-3 text-red-400" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">
                Ground reports
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.15em] text-white/35 font-mono">
              {reports.length} approved
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            From the ground<span className="text-red-500">.</span>
          </h2>
          <p className="mt-1 text-xs text-white/55 max-w-xl">
            Photos and reports submitted by people on the ground. All
            reviewed before going live — don't put yourself in danger to
            file one.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/20 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Submit a report
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-white/25 mx-auto mb-3" />
          <p className="text-sm text-white/60 font-medium mb-1">
            No approved reports yet
          </p>
          <p className="text-[11px] text-white/35 max-w-sm mx-auto leading-relaxed">
            Be the first to share what you're seeing. Reports show up here
            once a moderator approves them.
          </p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono text-red-300 hover:text-red-200 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Submit the first report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}

      <SubmitReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
