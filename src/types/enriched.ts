import type { Bestellerfassung } from './app';

export type EnrichedBestellerfassung = Bestellerfassung & {
  tischName: string;
  artikelNames: string[];
};
