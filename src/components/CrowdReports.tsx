import { useState } from 'react'
import {
  Camera,
  MapPin,
  Plus,
  Loader2,
  Inbox,
  ArrowUp,
  ArrowDown,
  Clock,
  Flame,
} from 'lucide-react'
import {
  useCrowdReports,
  useMyVotes,
  useVoteOnReport,
  type CrowdReport,
  type SortMode,
} from '@/hooks/useCrowdReports'
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

interface ReportCardProps {
  report: CrowdReport
  myVote: 1 | -1 | undefined
  onVote: (vote: 1 | -1) => void
  voting: boolean
}

function VoteControl({ report, myVote, onVote, voting }: ReportCardProps) {
  const upActive = myVote === 1
  const downActive = myVote === -1
  const score = report.vote_score
  const scoreColor =
    score > 0 ? 'text-emerald-300' : score < 0 ? 'text-red-300' : 'text-white/60'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!voting) onVote(1)
        }}
        disabled={voting}
        aria-label="Upvote"
        aria-pressed={upActive}
        className={`group inline-flex items-center justify-center h-7 w-7 rounded-md border transition-all ${
          upActive
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
            : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300'
        } disabled:opacity-50`}
      >
        <ArrowUp
          className={`h-3.5 w-3.5 transition-transform ${
            upActive ? 'scale-110' : 'group-hover:scale-110'
          }`}
        />
      </button>
      <span
        className={`min-w-[1.6rem] text-center text-xs font-mono font-bold tabular-nums tracking-tight transition-colors ${scoreColor}`}
      >
        {score > 0 ? `+${score}` : score}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (!voting) onVote(-1)
        }}
        disabled={voting}
        aria-label="Downvote"
        aria-pressed={downActive}
        className={`group inline-flex items-center justify-center h-7 w-7 rounded-md border transition-all ${
          downActive
            ? 'border-red-500/50 bg-red-500/15 text-red-300'
            : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300'
        } disabled:opacity-50`}
      >
        <ArrowDown
          className={`h-3.5 w-3.5 transition-transform ${
            downActive ? 'scale-110' : 'group-hover:scale-110'
          }`}
        />
      </button>
    </div>
  )
}

function ReportCard({ report, myVote, onVote, voting }: ReportCardProps) {
  return (
    <article className="group relative rounded-lg border border-white/10 bg-[#0f1729]/60 overflow-hidden hover:border-white/20 transition-colors flex flex-col">
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
      <div className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-300">
            {report.location_text}
          </span>
        </div>
        <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words flex-1">
          {report.report_text}
        </p>
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-mono text-white/40 truncate">
              {report.submitter_name || 'Anonymous'}
            </span>
            <span className="text-[9px] uppercase tracking-wider font-mono text-white/30 tabular-nums">
              {timeAgo(report.created_at)}
            </span>
          </div>
          <VoteControl
            report={report}
            myVote={myVote}
            onVote={onVote}
            voting={voting}
          />
        </div>
      </div>
    </article>
  )
}

export function CrowdReports() {
  const [modalOpen, setModalOpen] = useState(false)
  const [sort, setSort] = useState<SortMode>('newest')
  const { data, isLoading } = useCrowdReports(sort)
  const { data: myVotes } = useMyVotes()
  const voteMutation = useVoteOnReport()
  const reports = data ?? []

  const handleVote = (reportId: string, vote: 1 | -1) => {
    const current = myVotes?.[reportId]
    voteMutation.mutate({ reportId, vote, current })
  }

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
            file one. Vote up the ones that helped you.
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

      {/* Sort toggle */}
      {reports.length > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-[#0f1729]/40 p-1 w-fit">
          {(
            [
              { key: 'newest', label: 'Newest', icon: Clock },
              { key: 'top', label: 'Top voted', icon: Flame },
            ] as { key: SortMode; label: string; icon: typeof Clock }[]
          ).map(({ key, label, icon: Icon }) => {
            const active = sort === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[10px] uppercase tracking-wider font-mono transition-colors ${
                  active
                    ? 'bg-red-500/15 text-white border border-red-500/40'
                    : 'border border-transparent text-white/50 hover:text-white/85 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            )
          })}
        </div>
      )}

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
            <ReportCard
              key={r.id}
              report={r}
              myVote={myVotes?.[r.id]}
              onVote={(v) => handleVote(r.id, v)}
              voting={
                voteMutation.isPending && voteMutation.variables?.reportId === r.id
              }
            />
          ))}
        </div>
      )}

      <SubmitReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
