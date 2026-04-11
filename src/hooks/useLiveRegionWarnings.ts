import { useMemo } from 'react'
import { REGIONS, type WarningLevel } from '@/lib/cyclone'
import { useMetServiceNationalWarnings } from './useMetServiceNational'

const LEVEL_RANK: Record<WarningLevel, number> = {
  red: 4,
  orange: 3,
  yellow: 2,
  advisory: 1,
}

interface RegionLiveWarning {
  level: WarningLevel
  events: string[]
}

/**
 * Computes the highest-severity active MetService warning for each region on
 * the Live Map, by matching region.aliases against metservice_warnings_national.regions.
 * Returns a map keyed by region.id. Regions with no live warning fall back to
 * the hand-curated `region.warning` in cyclone.ts.
 */
export function useLiveRegionWarnings(): Record<string, RegionLiveWarning> {
  const { data } = useMetServiceNationalWarnings()

  return useMemo(() => {
    const result: Record<string, RegionLiveWarning> = {}

    for (const region of REGIONS) {
      result[region.id] = { level: region.warning, events: [] }
    }

    if (!data) return result

    for (const w of data) {
      const level = (w.warn_level ?? '').toLowerCase() as WarningLevel
      if (!LEVEL_RANK[level]) continue
      const regions = w.regions ?? []
      if (regions.length === 0) continue

      for (const region of REGIONS) {
        const matches = region.aliases.some((alias) => regions.includes(alias))
        if (!matches) continue
        const cur = result[region.id]
        if (LEVEL_RANK[level] > LEVEL_RANK[cur.level]) {
          cur.level = level
        }
        if (w.event_type && !cur.events.includes(w.event_type)) {
          cur.events.push(w.event_type)
        }
      }
    }

    return result
  }, [data])
}
