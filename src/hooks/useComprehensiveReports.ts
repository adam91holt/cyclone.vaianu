import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ComprehensiveReport {
  id: string
  generated_at: string
  headline: string
  summary: string | null
  markdown: string
  key_findings: string[]
  severity: string | null
  model: string
  duration_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_creation_tokens: number | null
  tool_calls: Array<{ name: string; input: unknown; result_preview?: string }> | null
}

// Reads from comprehensive_reports, populated every hour (at :03) by the
// generate-comprehensive-report Edge Function using Claude Opus 4.6 + tool use.
export function useComprehensiveReports(limit = 12) {
  return useQuery({
    queryKey: ['comprehensive-reports', limit],
    queryFn: async (): Promise<ComprehensiveReport[]> => {
      const { data, error } = await supabase
        .from('comprehensive_reports')
        .select(
          'id, generated_at, headline, summary, markdown, key_findings, severity, model, duration_ms, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, tool_calls',
        )
        .order('generated_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return (data ?? []).map((r) => ({
        id: r.id,
        generated_at: r.generated_at,
        headline: r.headline,
        summary: r.summary,
        markdown: r.markdown,
        key_findings: Array.isArray(r.key_findings) ? (r.key_findings as string[]) : [],
        severity: r.severity,
        model: r.model,
        duration_ms: r.duration_ms,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
        cache_read_tokens: r.cache_read_tokens,
        cache_creation_tokens: r.cache_creation_tokens,
        tool_calls: Array.isArray(r.tool_calls)
          ? (r.tool_calls as Array<{ name: string; input: unknown; result_preview?: string }>)
          : null,
      }))
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  })
}
