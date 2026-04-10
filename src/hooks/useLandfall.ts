import { useLatestSummary } from '@/hooks/useSummary'
import { LANDFALL_TIME_ISO } from '@/lib/cyclone'

export type LandfallConfidence = 'low' | 'medium' | 'high'

export interface LandfallEstimate {
  /** ISO timestamp of estimated landfall (always defined — falls back to the static reference). */
  iso: string
  /** AI-estimated confidence, or null if this is the static fallback. */
  confidence: LandfallConfidence | null
  /** Region name ('Northland', 'Auckland / Coromandel', etc.) */
  region: string
  /** One-sentence explanation of how the AI arrived at this estimate. */
  rationale: string | null
  /** True when the estimate comes from the live AI briefing, false when it's the static fallback. */
  isAi: boolean
  /** When the AI wrote this estimate, if AI-sourced. */
  generatedAt: string | null
}

const FALLBACK: LandfallEstimate = {
  iso: LANDFALL_TIME_ISO,
  confidence: null,
  region: 'Auckland / Coromandel',
  rationale: null,
  isAi: false,
  generatedAt: null,
}

export function useLandfall(): LandfallEstimate {
  const { data } = useLatestSummary()
  if (!data?.landfall_estimate_iso) return FALLBACK

  const conf = data.landfall_confidence
  const confidence: LandfallConfidence | null =
    conf === 'low' || conf === 'medium' || conf === 'high' ? conf : null

  return {
    iso: data.landfall_estimate_iso,
    confidence,
    region: data.landfall_region ?? FALLBACK.region,
    rationale: data.landfall_rationale ?? null,
    isAi: true,
    generatedAt: data.generated_at ?? null,
  }
}

/** Format an ISO timestamp as 'Sun 12 Apr · 06:00 NZST'. */
export function formatLandfallLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const wd = get('weekday')
  const day = get('day')
  const mo = get('month')
  const hr = get('hour')
  const mn = get('minute')
  // Use NZST year-round label — good enough for the dashboard.
  return `${wd} ${day} ${mo} · ${hr}:${mn} NZST`
}
