import type { EnrichedBestellerfassung } from '@/types/enriched';
import type { Bestellerfassung, Speisekarte, Tischverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplayMany(urls: unknown, map: Map<string, any>, ...fields: string[]): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .map(u => {
      const id = extractRecordId(u);
      const r = id ? map.get(id) : null;
      return r ? fields.map(f => String(r.fields[f] ?? '')).join(' ').trim() : '';
    })
    .filter(Boolean);
}

interface BestellerfassungMaps {
  tischverwaltungMap: Map<string, Tischverwaltung>;
  speisekarteMap: Map<string, Speisekarte>;
}

export function enrichBestellerfassung(
  bestellerfassung: Bestellerfassung[],
  maps: BestellerfassungMaps
): EnrichedBestellerfassung[] {
  return bestellerfassung.map(r => ({
    ...r,
    tischName: resolveDisplay(r.fields.tisch, maps.tischverwaltungMap, 'tischnummer'),
    artikelNames: resolveDisplayMany(r.fields.artikel, maps.speisekarteMap, 'artikel_name'),
  }));
}
