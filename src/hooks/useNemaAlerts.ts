import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type NemaSeverity = 'red' | 'orange' | 'info'

export interface NemaAlert {
  id: string
  title: string
  severity: NemaSeverity
  summary: string
  body: string
  link: string | null
  published_at: string | null
}

export interface NemaAlertsResponse {
  ok: boolean
  channel: string
  last_build_date: string | null
  count: number
  alerts: NemaAlert[]
}

// Reads from the nema_alerts table, populated every 5 min by the
// `ingest-nema-alerts` Edge Function (cron: vaianu-nema-every-5).
// The table's RLS policy only returns rows where last_seen_at is
// within the last 30 min, so expired alerts disappear automatically.
export function useNemaAlerts() {
  return useQuery({
    queryKey: ['nema-alerts'],
    queryFn: async (): Promise<NemaAlertsResponse> => {
      const { data, error } = await supabase
        .from('nema_alerts')
        .select('id, title, severity, summary, body, link, published_at, last_seen_at')
        .order('published_at', { ascending: false, nullsFirst: false })

      if (error) throw error

      const alerts: NemaAlert[] = (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        severity: (r.severity as NemaSeverity) ?? 'info',
        summary: r.summary ?? '',
        body: r.body ?? '',
        link: r.link,
        published_at: r.published_at,
      }))

      return {
        ok: true,
        channel: 'NZ Emergency Mobile Alert feed',
        last_build_date:
          (data ?? []).reduce<string | null>((max, r) => {
            if (!r.last_seen_at) return max
            if (!max || r.last_seen_at > max) return r.last_seen_at
            return max
          }, null),
        count: alerts.length,
        alerts,
      }
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
  })
}
