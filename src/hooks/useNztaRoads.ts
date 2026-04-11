import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type RoadSeverity = 'closed' | 'delay' | 'hazard' | 'caution'

export type RoadGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }

export interface RoadEvent {
  id: string
  event_type: string | null
  description: string | null
  comments: string | null
  impact: string | null
  severity: RoadSeverity
  planned: boolean
  status: string | null
  island: string | null
  region: string | null
  highway: string | null
  location: string | null
  alternative_route: string | null
  start_date: string | null
  end_date: string | null
  expected_resolution: string | null
  geometry: RoadGeometry | null
  centroid: [number, number] | null
}

export interface RoadEventsResponse {
  ok: boolean
  count: number
  events: RoadEvent[]
  fetched_at: string
}

// Reads from the nzta_road_events table, populated every 5 min by the
// `ingest-nzta-roads` Edge Function (cron: vaianu-nzta-roads-every-5).
// The RLS policy filters to rows seen in the last 30 min so cleared
// events drop off automatically.
export function useNztaRoads() {
  return useQuery({
    queryKey: ['nzta-roads'],
    queryFn: async (): Promise<RoadEventsResponse> => {
      const { data, error } = await supabase
        .from('nzta_road_events')
        .select(
          'id, event_type, description, comments, impact, severity, planned, status, island, region, highway, location, alternative_route, start_date, end_date, expected_resolution, geometry, centroid_lon, centroid_lat, last_seen_at',
        )

      if (error) throw error

      const sevOrder: Record<RoadSeverity, number> = {
        closed: 0,
        delay: 1,
        hazard: 2,
        caution: 3,
      }

      const events: RoadEvent[] = (data ?? []).map((r) => ({
        id: r.id,
        event_type: r.event_type,
        description: r.description,
        comments: r.comments,
        impact: r.impact,
        severity: (r.severity as RoadSeverity) ?? 'caution',
        planned: r.planned,
        status: r.status,
        island: r.island,
        region: r.region,
        highway: r.highway,
        location: r.location,
        alternative_route: r.alternative_route,
        start_date: r.start_date,
        end_date: r.end_date,
        expected_resolution: r.expected_resolution,
        geometry: (r.geometry as RoadGeometry | null) ?? null,
        centroid:
          r.centroid_lon !== null && r.centroid_lat !== null
            ? [Number(r.centroid_lon), Number(r.centroid_lat)]
            : null,
      }))

      // Unplanned before planned, then by severity (closed first).
      events.sort((a, b) => {
        const ap = a.planned ? 1 : 0
        const bp = b.planned ? 1 : 0
        if (ap !== bp) return ap - bp
        return sevOrder[a.severity] - sevOrder[b.severity]
      })

      const latest = (data ?? []).reduce<string | null>((max, r) => {
        if (!r.last_seen_at) return max
        if (!max || r.last_seen_at > max) return r.last_seen_at
        return max
      }, null)

      return {
        ok: true,
        count: events.length,
        events,
        fetched_at: latest ?? new Date().toISOString(),
      }
    },
    refetchInterval: 3 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
