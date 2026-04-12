import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RiverSparklineData {
  // Dense array of `buckets` length; NaN where a bucket had no reading.
  values: number[]
  min: number
  max: number
  first: number
  last: number
}

const DEFAULT_HOURS = 24
const DEFAULT_BUCKETS = 48

/**
 * Batched 24-hour history for every river site in the database.
 *
 * Returns a Map keyed by `${council}::${site}` so callers can O(1) look
 * up the sparkline for any site alongside their other site data.
 *
 * The RPC returns one row per site with a JSONB array of [bucket_idx, value]
 * pairs — this keeps us comfortably under PostgREST's 1000-row response cap
 * even when we're pulling ~715 sites × 48 buckets.
 */
export function useAllRiverHistories(
  hours = DEFAULT_HOURS,
  buckets = DEFAULT_BUCKETS,
) {
  return useQuery({
    queryKey: ['all-river-histories', hours, buckets],
    queryFn: async (): Promise<Map<string, RiverSparklineData>> => {
      const { data, error } = await supabase.rpc('get_all_river_histories', {
        p_hours: hours,
        p_buckets: buckets,
      })
      if (error) throw error
      const rows = (data ?? []) as Array<{
        council: string
        site: string
        buckets: Array<[number, number | string]> | null
      }>

      const out = new Map<string, RiverSparklineData>()
      for (const r of rows) {
        if (!r.buckets || r.buckets.length === 0) continue
        // Build a dense array of `buckets` length with NaN placeholders.
        const values = new Array<number>(buckets).fill(NaN)
        for (const pair of r.buckets) {
          const idx = Math.max(0, Math.min(buckets - 1, Number(pair[0])))
          const v = Number(pair[1])
          if (!Number.isNaN(v)) values[idx] = v
        }
        // Forward-fill then backward-fill so the sparkline is continuous.
        let last: number | null = null
        for (let i = 0; i < values.length; i++) {
          if (Number.isNaN(values[i])) {
            if (last !== null) values[i] = last
          } else {
            last = values[i]
          }
        }
        let next: number | null = null
        for (let i = values.length - 1; i >= 0; i--) {
          if (Number.isNaN(values[i])) {
            if (next !== null) values[i] = next
          } else {
            next = values[i]
          }
        }
        const clean = values.filter((v) => !Number.isNaN(v))
        if (clean.length === 0) continue
        let min = clean[0]
        let max = clean[0]
        for (const v of clean) {
          if (v < min) min = v
          if (v > max) max = v
        }
        out.set(`${r.council}::${r.site}`, {
          values,
          min,
          max,
          first: clean[0],
          last: clean[clean.length - 1],
        })
      }
      return out
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  })
}
