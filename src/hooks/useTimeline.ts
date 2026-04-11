import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type TimelineSeverity = 'red' | 'orange' | 'yellow' | 'info'

export type TimelineKind =
  | 'nema_alert'
  | 'warning'
  | 'road_closure'
  | 'outage'
  | 'river_rise'
  | 'news'
  | 'liveblog'
  | 'tweet'

export interface TimelineEvent {
  id: string
  event_key: string
  kind: TimelineKind
  severity: TimelineSeverity
  title: string
  body: string | null
  link: string | null
  source: string | null
  region: string | null
  occurred_at: string
  metadata: Record<string, unknown> | null
  first_seen_at: string
  last_seen_at: string
}

// Reads from the timeline_events table, populated every 5 min by the
// `harvest-timeline` Edge Function. The read policy filters to events
// that either occurred in the last 12h or have been seen in the last 30m.
export function useTimeline() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: async (): Promise<TimelineEvent[]> => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select(
          'id, event_key, kind, severity, title, body, link, source, region, occurred_at, metadata, first_seen_at, last_seen_at',
        )
        .order('occurred_at', { ascending: false })
        .limit(200)

      if (error) throw error

      return (data ?? []).map((r) => ({
        id: r.id,
        event_key: r.event_key,
        kind: r.kind as TimelineKind,
        severity: (r.severity as TimelineSeverity) ?? 'info',
        title: r.title,
        body: r.body,
        link: r.link,
        source: r.source,
        region: r.region,
        occurred_at: r.occurred_at,
        metadata: r.metadata as Record<string, unknown> | null,
        first_seen_at: r.first_seen_at,
        last_seen_at: r.last_seen_at,
      }))
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  })
}
