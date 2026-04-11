import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { REGION_OPTIONS, REGIONS, TOWN_TO_REGION } from '@/lib/cyclone'

const STORAGE_KEY = 'vaianu.selectedRegion'

interface RegionContextValue {
  /** Currently selected region id, or 'all' for nationwide. */
  regionId: string
  /** Display label for the current selection. */
  label: string
  /** True when a specific region is selected (not 'all'). */
  isFiltered: boolean
  setRegionId: (id: string) => void
}

const RegionContext = createContext<RegionContextValue | null>(null)

function loadInitial(): string {
  if (typeof window === 'undefined') return 'all'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && REGION_OPTIONS.some((r) => r.id === stored)) return stored
  } catch {
    /* ignore */
  }
  return 'all'
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [regionId, setRegionIdState] = useState<string>(loadInitial)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, regionId)
    } catch {
      /* ignore */
    }
  }, [regionId])

  const option = REGION_OPTIONS.find((r) => r.id === regionId) ?? REGION_OPTIONS[0]
  const value: RegionContextValue = {
    regionId,
    label: option.label,
    isFiltered: regionId !== 'all',
    setRegionId: setRegionIdState,
  }

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useSelectedRegion(): RegionContextValue {
  const ctx = useContext(RegionContext)
  if (!ctx) {
    // Hook used outside provider — fall back to nationwide.
    return {
      regionId: 'all',
      label: 'All NZ',
      isFiltered: false,
      setRegionId: () => {},
    }
  }
  return ctx
}

/** Filter a MetService-observation list by the selected region. Towns outside
 *  the canonical cyclone regions are dropped when a specific region is selected. */
export function filterTownsByRegion<T extends { town_slug: string }>(
  towns: T[] | undefined,
  regionId: string,
): T[] {
  if (!towns) return []
  if (regionId === 'all') return towns
  return towns.filter((t) => TOWN_TO_REGION[t.town_slug] === regionId)
}

/** Filter an Open-Meteo region-weather list by the selected region. */
export function filterRegionsByRegion<T extends { regionId: string }>(
  regions: T[] | undefined,
  regionId: string,
): T[] {
  if (!regions) return []
  if (regionId === 'all') return regions
  return regions.filter((r) => r.regionId === regionId)
}

/** Find the canonical region record by id, or null for 'all'. */
export function findRegion(regionId: string) {
  if (regionId === 'all') return null
  return REGIONS.find((r) => r.id === regionId) ?? null
}
