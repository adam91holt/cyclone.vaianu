// Cyclone Vaianu — static reference data.
// Live numbers come from Open-Meteo; warning levels & track positions are
// hand-curated from current MetService advisories (10 April 2026).

export type WarningLevel = 'red' | 'orange' | 'yellow' | 'advisory'

export interface Region {
  id: string
  name: string
  short: string
  lat: number
  lon: number
  /** Fallback severity if no live MetService warning matches — hand-curated. */
  warning: WarningLevel
  impact: string
  /** SVG space coordinates for the NZ map (see CycloneMap.tsx viewBox) */
  mapX: number
  mapY: number
  /** MetService fine-grained region names that roll up into this region. Used to
   * compute the live warning level from metservice_warnings_national.regions[]. */
  aliases: string[]
}

export const REGIONS: Region[] = [
  {
    id: 'northland',
    name: 'Northland',
    short: 'NTL',
    lat: -35.73,
    lon: 174.32,
    warning: 'red',
    impact: 'State of emergency declared. Life-threatening winds & flooding.',
    mapX: 185,
    mapY: 60,
    aliases: ['Northland'],
  },
  {
    id: 'auckland',
    name: 'Auckland',
    short: 'AKL',
    lat: -36.85,
    lon: 174.76,
    warning: 'red',
    impact: 'Harbour Bridge closure likely. Severe gales, 130km/h gusts.',
    mapX: 200,
    mapY: 105,
    aliases: ['Auckland', 'Great Barrier Island'],
  },
  {
    id: 'coromandel',
    name: 'Coromandel',
    short: 'CRM',
    lat: -36.83,
    lon: 175.5,
    warning: 'red',
    impact: 'Direct impact zone. Gusts to 140km/h, heavy rain, storm surge.',
    mapX: 228,
    mapY: 112,
    aliases: ['Coromandel Peninsula'],
  },
  {
    id: 'bay_of_plenty',
    name: 'Bay of Plenty',
    short: 'BOP',
    lat: -37.69,
    lon: 176.16,
    warning: 'orange',
    impact: 'Damaging winds, coastal inundation risk for Tauranga.',
    mapX: 245,
    mapY: 140,
    aliases: ['Bay Of Plenty', 'Rotorua'],
  },
  {
    id: 'waikato',
    name: 'Waikato',
    short: 'WKO',
    lat: -37.78,
    lon: 175.28,
    warning: 'orange',
    impact: 'Severe gales. River & surface flooding possible.',
    mapX: 210,
    mapY: 150,
    aliases: ['Waikato', 'Waitomo', 'Taumarunui', 'Taupo'],
  },
  {
    id: 'gisborne',
    name: 'Gisborne',
    short: 'GIS',
    lat: -38.66,
    lon: 178.02,
    warning: 'yellow',
    impact: 'Strong southeasterlies, possible slips on SH35.',
    mapX: 270,
    mapY: 175,
    aliases: ['Gisborne'],
  },
]

// Landfall: Sunday 12 April 2026, 06:00 NZST.
export const LANDFALL_TIME_ISO = '2026-04-11T18:00:00Z' // 06:00 NZST 12 Apr (UTC+12)

// Current cyclone position — approximately halfway between Fiji and NZ.
// Moving south towards the northeast NZ coast. Category 2 sub-tropical.
export interface CyclonePoint {
  lat: number
  lon: number
  /** SVG map X coordinate */
  mapX: number
  /** SVG map Y coordinate */
  mapY: number
  /** Label for the track point */
  label: string
  /** Timestamp (ISO) */
  time: string
  /** Category label */
  cat?: string
}

export const CYCLONE_TRACK: CyclonePoint[] = [
  // Past positions (timestamps are UTC; labels are NZST local)
  { lat: -17.8, lon: 178.0, mapX: 320, mapY: -15, label: 'Thu 12', time: '2026-04-09T00:00:00Z', cat: 'C3' },
  { lat: -22.0, lon: 176.5, mapX: 300, mapY: 20, label: 'Thu 18', time: '2026-04-09T06:00:00Z', cat: 'C3' },
  { lat: -26.5, lon: 175.8, mapX: 285, mapY: 50, label: 'Fri 06', time: '2026-04-09T18:00:00Z', cat: 'C2' },
  // Current — Friday 18:00 NZST
  { lat: -30.5, lon: 175.5, mapX: 275, mapY: 75, label: 'NOW', time: '2026-04-10T06:00:00Z', cat: 'C2' },
  // Forecast — landfall ~06:00 Sunday NZST
  { lat: -32.3, lon: 175.5, mapX: 268, mapY: 82, label: 'Sat 00', time: '2026-04-10T12:00:00Z', cat: 'C2' },
  { lat: -34.0, lon: 175.5, mapX: 258, mapY: 92, label: 'Sat 12', time: '2026-04-11T00:00:00Z', cat: 'C2' },
  { lat: -35.8, lon: 175.4, mapX: 232, mapY: 108, label: 'Sat 18', time: '2026-04-11T06:00:00Z', cat: 'C2' },
  // Landfall — between Auckland & Coromandel, ~06:00 Sunday NZST
  { lat: -36.9, lon: 175.4, mapX: 215, mapY: 120, label: 'LANDFALL', time: LANDFALL_TIME_ISO, cat: 'C1' },
  { lat: -39.0, lon: 176.5, mapX: 240, mapY: 160, label: 'Sun 18', time: '2026-04-12T06:00:00Z', cat: 'TS' },
]

export const CURRENT_INDEX = 3 // index of "NOW" in CYCLONE_TRACK

/** Haversine great-circle distance between two lat/lon points, in kilometres. */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const R = 6371 // Earth radius (km)
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Straight-line distance from a cyclone centre to the nearest canonical
 *  region's coastal town — a reasonable proxy for "distance to the NZ
 *  mainland". Returns `{ km, region, bearing }` with the closest canonical
 *  region. Pass a live `{lat, lon}` from `useCyclonePosition()` when
 *  available; falls back to the static "NOW" point in CYCLONE_TRACK. */
export function cycloneDistanceToMainland(
  override?: { lat: number; lon: number } | null,
): {
  km: number
  region: Region
  bearing: number
} {
  const pos = override ?? CYCLONE_TRACK[CURRENT_INDEX]
  let best: { km: number; region: Region } | null = null
  for (const r of REGIONS) {
    const km = haversineKm(pos.lat, pos.lon, r.lat, r.lon)
    if (!best || km < best.km) best = { km, region: r }
  }
  const target = best!
  // Forward bearing (degrees from true north) from cyclone → nearest region
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const φ1 = toRad(pos.lat)
  const φ2 = toRad(target.region.lat)
  const Δλ = toRad(target.region.lon - pos.lon)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const bearing = (toDeg(Math.atan2(y, x)) + 360) % 360
  return { km: Math.round(target.km), region: target.region, bearing }
}

/** MetService town slug → canonical cyclone region id. Towns outside the
 *  6 canonical cyclone impact regions (Wellington, Napier, etc.) are omitted —
 *  they're only visible in the nationwide "All NZ" view. */
export const TOWN_TO_REGION: Record<string, string> = {
  whangarei: 'northland',
  kerikeri: 'northland',
  auckland: 'auckland',
  // No dedicated Coromandel MetService town — rolls up via Open-Meteo only.
  tauranga: 'bay_of_plenty',
  whakatane: 'bay_of_plenty',
  rotorua: 'bay_of_plenty',
  hamilton: 'waikato',
  taupo: 'waikato',
  gisborne: 'gisborne',
}

/** Options for the region selector. `'all'` is the nationwide default. */
export interface RegionOption {
  id: string
  label: string
  short: string
}

export const REGION_OPTIONS: RegionOption[] = [
  { id: 'all', label: 'All NZ', short: 'ALL' },
  ...REGIONS.map((r) => ({ id: r.id, label: r.name, short: r.short })),
]

export const WARNING_COLORS: Record<WarningLevel, { bg: string; text: string; label: string }> = {
  red: { bg: 'bg-red-600', text: 'text-red-400', label: 'RED' },
  orange: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'ORANGE' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-400', label: 'YELLOW' },
  advisory: { bg: 'bg-sky-500', text: 'text-sky-400', label: 'ADVISORY' },
}
