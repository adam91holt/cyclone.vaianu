import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type FeedbackKind = 'suggestion' | 'data_issue' | 'other'

export interface FeedbackItem {
  id: string
  kind: FeedbackKind
  message: string
  created_at: string
}

// Read the public feedback board. Everyone sees everything.
export function useFeedback(limit = 50) {
  return useQuery({
    queryKey: ['feedback', limit],
    queryFn: async (): Promise<FeedbackItem[]> => {
      const { data, error } = await supabase
        .from('feedback')
        .select('id, kind, message, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind as FeedbackKind,
        message: r.message,
        created_at: r.created_at,
      }))
    },
    refetchInterval: 60 * 1000,
  })
}

export function useSubmitFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { kind: FeedbackKind; message: string }) => {
      const { error } = await supabase.from('feedback').insert({
        kind: input.kind,
        message: input.message.trim(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] })
    },
  })
}
