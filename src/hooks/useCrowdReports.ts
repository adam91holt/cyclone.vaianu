import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type SortMode = 'newest' | 'top'

export interface CrowdReport {
  id: string
  created_at: string
  report_text: string
  location_text: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
  submitter_name: string | null
  vote_score: number
}

const VOTER_ID_KEY = 'vaianu_voter_id_v1'

// Stable per-browser anonymous voter id. Persists across reloads via
// localStorage. Falls back to a session-scoped id when storage is blocked.
export function getVoterId(): string {
  if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000'
  try {
    let id = window.localStorage.getItem(VOTER_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.localStorage.setItem(VOTER_ID_KEY, id)
    }
    return id
  } catch {
    // Storage blocked — use a per-load id so the user can still vote in this session
    return crypto.randomUUID()
  }
}

export function useCrowdReports(sort: SortMode = 'newest') {
  return useQuery({
    queryKey: ['crowd_reports', 'approved', sort],
    queryFn: async (): Promise<CrowdReport[]> => {
      let q = supabase
        .from('crowd_reports')
        .select(
          'id, created_at, report_text, location_text, latitude, longitude, image_url, submitter_name, vote_score',
        )
        .eq('status', 'approved')
        .limit(100)

      if (sort === 'top') {
        q = q
          .order('vote_score', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      } else {
        q = q
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as CrowdReport[]
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

// Returns a map of report_id → 1 | -1 for votes cast by THIS voter.
export function useMyVotes() {
  const voterId = getVoterId()
  return useQuery({
    queryKey: ['crowd_report_votes', 'mine', voterId],
    queryFn: async (): Promise<Record<string, 1 | -1>> => {
      const { data, error } = await supabase
        .from('crowd_report_votes')
        .select('report_id, vote')
        .eq('voter_id', voterId)
      if (error) throw error
      const map: Record<string, 1 | -1> = {}
      for (const row of data ?? []) {
        map[row.report_id] = row.vote as 1 | -1
      }
      return map
    },
    staleTime: 30_000,
  })
}

interface VoteArgs {
  reportId: string
  vote: 1 | -1
  current: 1 | -1 | undefined
}

export function useVoteOnReport() {
  const queryClient = useQueryClient()
  const voterId = getVoterId()

  return useMutation({
    mutationFn: async ({ reportId, vote, current }: VoteArgs) => {
      // Clicking the same arrow you've already voted with → undo
      if (current === vote) {
        const { error } = await supabase
          .from('crowd_report_votes')
          .delete()
          .eq('report_id', reportId)
          .eq('voter_id', voterId)
        if (error) throw error
        return { action: 'cleared' as const }
      }

      // Otherwise upsert (insert or switch)
      const { error } = await supabase
        .from('crowd_report_votes')
        .upsert(
          {
            report_id: reportId,
            voter_id: voterId,
            vote,
          },
          { onConflict: 'report_id,voter_id' },
        )
      if (error) throw error
      return { action: 'set' as const }
    },
    // Optimistic update so the UI feels instant
    onMutate: async ({ reportId, vote, current }) => {
      await queryClient.cancelQueries({ queryKey: ['crowd_report_votes', 'mine', voterId] })
      await queryClient.cancelQueries({ queryKey: ['crowd_reports'] })

      const prevVotes = queryClient.getQueryData<Record<string, 1 | -1>>([
        'crowd_report_votes',
        'mine',
        voterId,
      ])
      const isUndo = current === vote
      const delta = isUndo ? -current : vote - (current ?? 0)

      queryClient.setQueryData<Record<string, 1 | -1>>(
        ['crowd_report_votes', 'mine', voterId],
        (old) => {
          const next = { ...(old ?? {}) }
          if (isUndo) delete next[reportId]
          else next[reportId] = vote
          return next
        },
      )

      // Update score in any cached crowd_reports query
      queryClient.setQueriesData<CrowdReport[]>(
        { queryKey: ['crowd_reports', 'approved'] },
        (old) => {
          if (!old) return old
          return old.map((r) =>
            r.id === reportId ? { ...r, vote_score: r.vote_score + delta } : r,
          )
        },
      )

      return { prevVotes }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevVotes) {
        queryClient.setQueryData(
          ['crowd_report_votes', 'mine', voterId],
          ctx.prevVotes,
        )
      }
      // Re-fetch to recover correct scores
      queryClient.invalidateQueries({ queryKey: ['crowd_reports'] })
    },
    onSettled: () => {
      // Trust the trigger-maintained score over our optimistic delta
      queryClient.invalidateQueries({ queryKey: ['crowd_reports'] })
      queryClient.invalidateQueries({
        queryKey: ['crowd_report_votes', 'mine', voterId],
      })
    },
  })
}
