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

export const WARNING_COLORS: Record<WarningLevel, { bg: string; text: string; label: string }> = {
  red: { bg: 'bg-red-600', text: 'text-red-400', label: 'RED' },
  orange: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'ORANGE' },
  yellow: { bg: 'bg-yellow-400', text: 'text-yellow-400', label: 'YELLOW' },
  advisory: { bg: 'bg-sky-500', text: 'text-sky-400', label: 'ADVISORY' },
}
