import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MetServiceNationalWarning {
  cap_id: string
  warn_level: string | null
  event_type: string | null
  warning_type: string | null
  base_name: string | null
  name: string | null
  area_description: string | null
  regions: string[] | null
  display_regions: string[] | null
  threat_start_time: string | null
  threat_end_time: string | null
  threat_period: string | null
  threat_period_short: string | null
  issued_at: string | null
  expires_at: string | null
  next_issue_at: string | null
  icon: string | null
  warn_icon: string | null
  text: string | null
  impact: string | null
  instruction: string | null
  situation_headline: string | null
  situation_statement: string | null
  preview_markdown: string | null
  change_notes: string | null
  is_active: boolean | null
  fetched_at: string
}

export interface MetServiceNationalSummary {
  summary: Array<{
    icon?: string
    label?: string
    warnLevel?: string
    url?: string
  }>
  warning_count: number
  highest_level: string | null
  fetched_at: string
}

export function useMetServiceNationalWarnings() {
  return useQuery({
    queryKey: ['metservice-national', 'warnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metservice_warnings_national')
        .select(
          'cap_id, warn_level, event_type, warning_type, base_name, name, area_description, regions, display_regions, threat_start_time, threat_end_time, threat_period, threat_period_short, issued_at, expires_at, next_issue_at, icon, warn_icon, text, impact, instruction, situation_headline, situation_statement, preview_markdown, change_notes, is_active, fetched_at',
        )
        .order('warn_level', { ascending: true })
        .order('threat_start_time', { ascending: true })
      if (error) throw error
      // Sort by level priority (red > orange > yellow > blue > null)
      const rank: Record<string, number> = { red: 4, orange: 3, yellow: 2, blue: 1 }
      const sorted = (data ?? []).sort((a, b) => {
        const ra = rank[(a.warn_level ?? '').toLowerCase()] ?? 0
        const rb = rank[(b.warn_level ?? '').toLowerCase()] ?? 0
        if (ra !== rb) return rb - ra
        return (a.threat_start_time ?? '').localeCompare(b.threat_start_time ?? '')
      })
      return sorted as MetServiceNationalWarning[]
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}

export function useMetServiceNationalSummary() {
  return useQuery({
    queryKey: ['metservice-national', 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metservice_warnings_summary')
        .select('summary, warning_count, highest_level, fetched_at')
        .eq('id', 1)
        .maybeSingle()
      if (error) throw error
      return data as MetServiceNationalSummary | null
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}
