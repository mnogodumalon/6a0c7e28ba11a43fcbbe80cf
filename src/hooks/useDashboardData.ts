import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Speisekarte, Tischverwaltung, Bestellerfassung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [speisekarte, setSpeisekarte] = useState<Speisekarte[]>([]);
  const [tischverwaltung, setTischverwaltung] = useState<Tischverwaltung[]>([]);
  const [bestellerfassung, setBestellerfassung] = useState<Bestellerfassung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [speisekarteData, tischverwaltungData, bestellerfassungData] = await Promise.all([
        LivingAppsService.getSpeisekarte(),
        LivingAppsService.getTischverwaltung(),
        LivingAppsService.getBestellerfassung(),
      ]);
      setSpeisekarte(speisekarteData);
      setTischverwaltung(tischverwaltungData);
      setBestellerfassung(bestellerfassungData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [speisekarteData, tischverwaltungData, bestellerfassungData] = await Promise.all([
          LivingAppsService.getSpeisekarte(),
          LivingAppsService.getTischverwaltung(),
          LivingAppsService.getBestellerfassung(),
        ]);
        setSpeisekarte(speisekarteData);
        setTischverwaltung(tischverwaltungData);
        setBestellerfassung(bestellerfassungData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const speisekarteMap = useMemo(() => {
    const m = new Map<string, Speisekarte>();
    speisekarte.forEach(r => m.set(r.record_id, r));
    return m;
  }, [speisekarte]);

  const tischverwaltungMap = useMemo(() => {
    const m = new Map<string, Tischverwaltung>();
    tischverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [tischverwaltung]);

  return { speisekarte, setSpeisekarte, tischverwaltung, setTischverwaltung, bestellerfassung, setBestellerfassung, loading, error, fetchAll, speisekarteMap, tischverwaltungMap };
}