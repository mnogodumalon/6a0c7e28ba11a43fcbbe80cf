// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Speisekarte {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    artikel_name?: string;
    kategorie?: LookupValue;
    beschreibung?: string;
    preis?: number;
    verfuegbar?: boolean;
  };
}

export interface Tischverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tischnummer?: string;
    sitzplaetze?: number;
    bereich?: LookupValue;
    tisch_hinweis?: string;
  };
}

export interface Bestellerfassung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    tisch?: string; // applookup -> URL zu 'Tischverwaltung' Record
    artikel?: string[]; // multipleapplookup -> Array von URLs zu 'Speisekarte' Records
    bestellzeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    serviceperson?: string;
    status?: LookupValue;
    besondere_hinweise?: string;
  };
}

export const APP_IDS = {
  SPEISEKARTE: '6a0c7e05738179c77a2f1273',
  TISCHVERWALTUNG: '6a0c7e0cc5e08888032338dd',
  BESTELLERFASSUNG: '6a0c7e0d8fdbde67bb981006',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'speisekarte': {
    kategorie: [{ key: "vorspeise", label: "Vorspeise" }, { key: "hauptgericht", label: "Hauptgericht" }, { key: "dessert", label: "Dessert" }, { key: "getraenk", label: "Getränk" }, { key: "beilage", label: "Beilage" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'tischverwaltung': {
    bereich: [{ key: "innen", label: "Innenbereich" }, { key: "aussen", label: "Außenbereich" }, { key: "bar", label: "Bar" }, { key: "terrasse", label: "Terrasse" }, { key: "separee", label: "Separee" }],
  },
  'bestellerfassung': {
    status: [{ key: "offen", label: "Offen" }, { key: "in_zubereitung", label: "In Zubereitung" }, { key: "serviert", label: "Serviert" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "storniert", label: "Storniert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'speisekarte': {
    'artikel_name': 'string/text',
    'kategorie': 'lookup/select',
    'beschreibung': 'string/textarea',
    'preis': 'number',
    'verfuegbar': 'bool',
  },
  'tischverwaltung': {
    'tischnummer': 'string/text',
    'sitzplaetze': 'number',
    'bereich': 'lookup/select',
    'tisch_hinweis': 'string/text',
  },
  'bestellerfassung': {
    'tisch': 'applookup/select',
    'artikel': 'multipleapplookup/select',
    'bestellzeitpunkt': 'date/datetimeminute',
    'serviceperson': 'string/text',
    'status': 'lookup/select',
    'besondere_hinweise': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSpeisekarte = StripLookup<Speisekarte['fields']>;
export type CreateTischverwaltung = StripLookup<Tischverwaltung['fields']>;
export type CreateBestellerfassung = StripLookup<Bestellerfassung['fields']>;