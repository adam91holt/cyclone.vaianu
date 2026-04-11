import { useLatestSummary } from '@/hooks/useSummary'
import { CURRENT_INDEX, CYCLONE_TRACK } from '@/lib/cyclone'

export type PositionConfidence = 'low' | 'medium' | 'high'

export interface CyclonePosition {
  lat: number
  lon: number
  /** AI-estimated confidence, or null if this is the static fallback. */
  confidence: PositionConfidence | null
  /** One-sentence explanation of the source. */
  rationale: string | null
  /** True when the position comes from the live AI briefing, false when static. */
  isAi: boolean
  /** When the AI wrote this estimate, if AI-sourced. */
  generatedAt: string | null
}

const FALLBACK: CyclonePosition = {
  lat: CYCLONE_TRACK[CURRENT_INDEX].lat,
  lon: CYCLONE_TRACK[CURRENT_INDEX].lon,
  confidence: null,
  rationale: null,
  isAi: false,
  generatedAt: null,
}

/** Live cyclone centre position, extracted every 15 min by the AI briefing
 *  from MetService warnings, news, and official tweets. Falls back to the
 *  static reference point when the AI can't find one. */
export function useCyclonePosition(): CyclonePosition {
  const { data } = useLatestSummary()
  if (!data || data.cyclone_lat == null || data.cyclone_lon == null) {
    return FALLBACK
  }

  const conf = data.cyclone_position_confidence
  const confidence: PositionConfidence | null =
    conf === 'low' || conf === 'medium' || conf === 'high' ? conf : null

  return {
    lat: data.cyclone_lat,
    lon: data.cyclone_lon,
    confidence,
    rationale: data.cyclone_position_rationale ?? null,
    isAi: true,
    generatedAt: data.generated_at ?? null,
  }
}
