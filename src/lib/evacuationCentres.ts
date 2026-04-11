// Curated list of publicly-known welfare / emergency-assembly facilities
// across cyclone-exposed NZ regions. These are well-established civic
// halls, sports centres, and community hubs that regional CDEM groups
// regularly use as welfare centres during emergencies.
//
// IMPORTANT: during an actual event, only centres listed as ACTIVE by
// the regional CDEM group are open. Always defer to the regional CDEM
// link for the authoritative live list.

export type FacilityTag =
  | 'toilets'
  | 'kitchen'
  | 'wheelchair'
  | 'generator'
  | 'shower'
  | 'pet_friendly'
  | 'parking'

export type CentreType = 'hall' | 'sports' | 'school' | 'marae' | 'civic'

export interface EvacuationCentre {
  id: string
  name: string
  regionId: string
  town: string
  address: string
  type: CentreType
  facilities: FacilityTag[]
  notes?: string
  /** Direct Google Maps query for one-tap directions. */
  mapsQuery: string
}

export interface RegionalCdem {
  regionId: string
  name: string
  url: string
  phone?: string
}

/** Per-region Civil Defence Emergency Management group — the authoritative
 *  source for live welfare-centre status during an event. */
export const CDEM_GROUPS: RegionalCdem[] = [
  {
    regionId: 'northland',
    name: 'Civil Defence Northland',
    url: 'https://www.civildefencenorthland.govt.nz/',
  },
  {
    regionId: 'auckland',
    name: 'Auckland Emergency Management',
    url: 'https://www.aucklandemergencymanagement.org.nz/',
  },
  {
    regionId: 'coromandel',
    name: 'Thames-Coromandel Emergency Management',
    url: 'https://www.tcdc.govt.nz/Our-Council/Civil-Defence/',
  },
  {
    regionId: 'waikato',
    name: 'Waikato Civil Defence Emergency Management',
    url: 'https://www.waikatocdemg.govt.nz/',
  },
  {
    regionId: 'bay_of_plenty',
    name: 'Bay of Plenty Civil Defence',
    url: 'https://www.bopcivildefence.govt.nz/',
  },
  {
    regionId: 'gisborne',
    name: 'Tairāwhiti Civil Defence',
    url: 'https://www.tairawhiticdem.govt.nz/',
  },
]

function maps(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export const EVACUATION_CENTRES: EvacuationCentre[] = [
  // ============ NORTHLAND ============
  {
    id: 'ntl-whangarei-war-memorial',
    name: 'Whangārei War Memorial Centre',
    regionId: 'northland',
    town: 'Whangārei',
    address: '25 Rust Avenue, Whangārei 0110',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Whangārei War Memorial Centre Rust Avenue'),
  },
  {
    id: 'ntl-dargaville-memorial',
    name: 'Kaipara Memorial Civic Hall',
    regionId: 'northland',
    town: 'Dargaville',
    address: '37 Hokianga Road, Dargaville 0310',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Dargaville Town Hall Hokianga Road'),
  },
  {
    id: 'ntl-te-ahu',
    name: 'Te Ahu Centre',
    regionId: 'northland',
    town: 'Kaitāia',
    address: 'Cnr Matthews Ave & South Rd, Kaitāia 0410',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'generator', 'parking'],
    notes: 'Main welfare hub for the Far North.',
    mapsQuery: maps('Te Ahu Centre Kaitaia'),
  },
  {
    id: 'ntl-turner-centre',
    name: 'Turner Centre',
    regionId: 'northland',
    town: 'Kerikeri',
    address: '43 Cobham Road, Kerikeri 0230',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Turner Centre Kerikeri'),
  },
  {
    id: 'ntl-kaikohe',
    name: 'Kaikohe Memorial Hall',
    regionId: 'northland',
    town: 'Kaikohe',
    address: '45 Broadway, Kaikohe 0405',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Kaikohe Memorial Hall Broadway'),
  },

  // ============ AUCKLAND ============
  {
    id: 'akl-trusts-arena',
    name: 'Trusts Arena',
    regionId: 'auckland',
    town: 'Henderson',
    address: '65-67 Central Park Drive, Henderson, Auckland 0610',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking', 'generator'],
    notes: 'Large-capacity welfare centre for West Auckland.',
    mapsQuery: maps('Trusts Arena Henderson'),
  },
  {
    id: 'akl-due-drop',
    name: 'Due Drop Events Centre',
    regionId: 'auckland',
    town: 'Manukau',
    address: '770 Great South Road, Wiri, Auckland 2104',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking', 'generator'],
    notes: 'Primary welfare centre for South Auckland.',
    mapsQuery: maps('Due Drop Events Centre Manukau'),
  },
  {
    id: 'akl-eventfinda',
    name: 'Eventfinda Stadium',
    regionId: 'auckland',
    town: 'Albany',
    address: '17 Silverfield, Wairau Valley, Auckland 0627',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking'],
    notes: 'North Shore welfare hub.',
    mapsQuery: maps('Eventfinda Stadium North Shore Auckland'),
  },
  {
    id: 'akl-shoesmith',
    name: 'Shoesmith Hall',
    regionId: 'auckland',
    town: 'Warkworth',
    address: '8 Alnwick Street, Warkworth 0910',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Shoesmith Hall Warkworth'),
  },
  {
    id: 'akl-ostend',
    name: 'Ostend War Memorial Hall',
    regionId: 'auckland',
    town: 'Waiheke Island',
    address: '99 Belgium Street, Ostend, Waiheke Island 1081',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    notes: 'Main welfare centre on Waiheke Island.',
    mapsQuery: maps('Ostend War Memorial Hall Waiheke'),
  },
  {
    id: 'akl-claris',
    name: 'Claris Community Hall',
    regionId: 'auckland',
    town: 'Great Barrier Island',
    address: 'Hector Sanderson Road, Claris, Great Barrier Island',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'generator', 'parking'],
    notes: 'Great Barrier Island welfare hub. Island may be isolated in an event.',
    mapsQuery: maps('Claris Community Hall Great Barrier Island'),
  },

  // ============ COROMANDEL ============
  {
    id: 'crm-thames-civic',
    name: 'Thames War Memorial Civic Centre',
    regionId: 'coromandel',
    town: 'Thames',
    address: '200 Mary Street, Thames 3500',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    notes: 'Primary welfare centre for the Coromandel Peninsula.',
    mapsQuery: maps('Thames War Memorial Civic Centre'),
  },
  {
    id: 'crm-mercury-bay-sports',
    name: 'Mercury Bay Multi-Sport Park',
    regionId: 'coromandel',
    town: 'Whitianga',
    address: '8 Lyon Drive, Whitianga 3510',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking'],
    mapsQuery: maps('Mercury Bay Multisport Park Whitianga'),
  },
  {
    id: 'crm-coromandel-town',
    name: 'Coromandel Area School',
    regionId: 'coromandel',
    town: 'Coromandel Town',
    address: '200 Tiki Road, Coromandel 3506',
    type: 'school',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Coromandel Area School Tiki Road'),
  },
  {
    id: 'crm-whangamata-memorial',
    name: 'Whangamatā Memorial Hall',
    regionId: 'coromandel',
    town: 'Whangamatā',
    address: '612 Port Road, Whangamatā 3620',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Whangamata Memorial Hall Port Road'),
  },
  {
    id: 'crm-pauanui',
    name: 'Pauanui Community Hall',
    regionId: 'coromandel',
    town: 'Pauanui',
    address: 'Jubilee Drive, Pauanui 3579',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Pauanui Community Hall'),
  },

  // ============ BAY OF PLENTY ============
  {
    id: 'bop-baypark',
    name: 'ASB Baypark Arena',
    regionId: 'bay_of_plenty',
    town: 'Tauranga',
    address: '81 Truman Lane, Mount Maunganui 3116',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking', 'generator'],
    notes: 'Primary welfare hub for Tauranga & Mount Maunganui.',
    mapsQuery: maps('ASB Baypark Mount Maunganui'),
  },
  {
    id: 'bop-whakatane-war-memorial',
    name: 'Whakatāne War Memorial Hall',
    regionId: 'bay_of_plenty',
    town: 'Whakatāne',
    address: '58 Garaway Street, Whakatāne 3120',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Whakatane War Memorial Hall'),
  },
  {
    id: 'bop-opotiki',
    name: 'Ōpōtiki War Memorial Hall',
    regionId: 'bay_of_plenty',
    town: 'Ōpōtiki',
    address: '155 Church Street, Ōpōtiki 3122',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Opotiki Memorial Hall Church Street'),
  },
  {
    id: 'bop-te-puke',
    name: 'Te Puke Memorial Hall',
    regionId: 'bay_of_plenty',
    town: 'Te Puke',
    address: '130 Jellicoe Street, Te Puke 3119',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Te Puke Memorial Hall'),
  },
  {
    id: 'bop-katikati',
    name: 'Katikati War Memorial Hall',
    regionId: 'bay_of_plenty',
    town: 'Katikati',
    address: '45 Beach Road, Katikati 3129',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Katikati War Memorial Hall'),
  },

  // ============ WAIKATO ============
  {
    id: 'wko-claudelands',
    name: 'Claudelands Event Centre',
    regionId: 'waikato',
    town: 'Hamilton',
    address: 'Brooklyn Road, Claudelands, Hamilton 3214',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'shower', 'parking', 'generator'],
    notes: 'Largest welfare facility in the Waikato.',
    mapsQuery: maps('Claudelands Event Centre Hamilton'),
  },
  {
    id: 'wko-te-awamutu',
    name: 'Te Awamutu Events Centre',
    regionId: 'waikato',
    town: 'Te Awamutu',
    address: '1 Palmer Street, Te Awamutu 3800',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Te Awamutu Events Centre Palmer Street'),
  },
  {
    id: 'wko-cambridge',
    name: 'Cambridge Town Hall',
    regionId: 'waikato',
    town: 'Cambridge',
    address: '23 Queen Street, Cambridge 3434',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Cambridge Town Hall Queen Street'),
  },
  {
    id: 'wko-huntly',
    name: 'Huntly War Memorial Hall',
    regionId: 'waikato',
    town: 'Huntly',
    address: '138 Main Street, Huntly 3700',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Huntly War Memorial Hall'),
  },
  {
    id: 'wko-morrinsville',
    name: 'Morrinsville Events Centre',
    regionId: 'waikato',
    town: 'Morrinsville',
    address: '32 Canada Street, Morrinsville 3300',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Morrinsville Events Centre'),
  },
  {
    id: 'wko-great-lake-centre',
    name: 'Great Lake Centre',
    regionId: 'waikato',
    town: 'Taupō',
    address: '11 Story Place, Taupō 3330',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Great Lake Centre Taupo'),
  },

  // ============ GISBORNE / TAIRĀWHITI ============
  {
    id: 'gis-showgrounds',
    name: 'Showgrounds Events Centre',
    regionId: 'gisborne',
    town: 'Gisborne',
    address: '50 Makaraka Road, Gisborne 4071',
    type: 'sports',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking', 'generator'],
    notes: 'Primary welfare centre for the Tairāwhiti region.',
    mapsQuery: maps('Gisborne Showgrounds Events Centre'),
  },
  {
    id: 'gis-war-memorial-theatre',
    name: 'Gisborne War Memorial Theatre',
    regionId: 'gisborne',
    town: 'Gisborne',
    address: '159 Bright Street, Gisborne 4010',
    type: 'civic',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Gisborne War Memorial Theatre Bright Street'),
  },
  {
    id: 'gis-ruatoria',
    name: 'Ruatoria Memorial Hall',
    regionId: 'gisborne',
    town: 'Ruatoria',
    address: '74 Main Road, Ruatoria 4032',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    notes: 'Key East Coast welfare centre. May be isolated if SH35 is cut.',
    mapsQuery: maps('Ruatoria Memorial Hall'),
  },
  {
    id: 'gis-tolaga-bay',
    name: 'Tolaga Bay Area School',
    regionId: 'gisborne',
    town: 'Tolaga Bay',
    address: '1 Monkhouse Street, Tolaga Bay 4077',
    type: 'school',
    facilities: ['toilets', 'kitchen', 'wheelchair', 'parking'],
    mapsQuery: maps('Tolaga Bay Area School'),
  },
  {
    id: 'gis-te-karaka',
    name: 'Te Karaka Area School',
    regionId: 'gisborne',
    town: 'Te Karaka',
    address: 'State Highway 2, Te Karaka 4071',
    type: 'school',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Te Karaka Area School'),
  },
  {
    id: 'gis-tokomaru-bay',
    name: 'Tokomaru Bay Community Hall',
    regionId: 'gisborne',
    town: 'Tokomaru Bay',
    address: 'Main Road, Tokomaru Bay 4032',
    type: 'hall',
    facilities: ['toilets', 'kitchen', 'parking'],
    mapsQuery: maps('Tokomaru Bay Community Hall'),
  },
]
