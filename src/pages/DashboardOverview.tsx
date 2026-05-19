import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBestellerfassung } from '@/lib/enrich';
import type { EnrichedBestellerfassung } from '@/types/enriched';
import type { Tischverwaltung } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconChefHat, IconClock, IconUsers, IconMapPin, IconX, IconShoppingCart, IconReceipt } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BestellerfassungDialog } from '@/components/dialogs/BestellerfassungDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a0c7e28ba11a43fcbbe80cf';
const REPAIR_ENDPOINT = '/claude/build/repair';

type StatusKey = 'offen' | 'in_zubereitung' | 'serviert' | 'abgeschlossen' | 'storniert';

const STATUS_CONFIG: Record<StatusKey, { label: string; color: string; bg: string; dot: string }> = {
  offen:          { label: 'Offen',          color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-500' },
  in_zubereitung: { label: 'In Zubereitung', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-500' },
  serviert:       { label: 'Serviert',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500' },
  abgeschlossen:  { label: 'Abgeschlossen',  color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200',  dot: 'bg-slate-400' },
  storniert:      { label: 'Storniert',      color: 'text-red-600',    bg: 'bg-red-50 border-red-200',      dot: 'bg-red-400' },
};

function getStatusConfig(key: string | undefined) {
  if (!key) return { label: 'Unbekannt', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300' };
  return STATUS_CONFIG[key as StatusKey] ?? { label: key, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300' };
}

function getTableStatusKey(bestellungen: EnrichedBestellerfassung[]): string | undefined {
  // Priority: in_zubereitung > offen > serviert > abgeschlossen
  const order: StatusKey[] = ['in_zubereitung', 'offen', 'serviert', 'abgeschlossen', 'storniert'];
  for (const s of order) {
    if (bestellungen.some(b => b.fields.status?.key === s)) return s;
  }
  return undefined;
}

export default function DashboardOverview() {
  const {
    speisekarte, tischverwaltung, bestellerfassung,
    speisekarteMap, tischverwaltungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBestellerfassung = enrichBestellerfassung(bestellerfassung, { tischverwaltungMap, speisekarteMap });

  // All hooks BEFORE early returns
  const [selectedTisch, setSelectedTisch] = useState<Tischverwaltung | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBestellung, setEditBestellung] = useState<EnrichedBestellerfassung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBestellerfassung | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('alle');

  const bestellungenByTisch = useMemo(() => {
    const map = new Map<string, EnrichedBestellerfassung[]>();
    enrichedBestellerfassung.forEach(b => {
      const id = b.fields.tisch ? b.fields.tisch.split('/').pop() ?? '' : '';
      if (!id) return;
      const arr = map.get(id) ?? [];
      arr.push(b);
      map.set(id, arr);
    });
    return map;
  }, [enrichedBestellerfassung]);

  const activeBestellungen = useMemo(() =>
    enrichedBestellerfassung.filter(b => b.fields.status?.key !== 'abgeschlossen' && b.fields.status?.key !== 'storniert'),
    [enrichedBestellerfassung]
  );

  const filteredBestellungen = useMemo(() => {
    const list = selectedTisch
      ? enrichedBestellerfassung.filter(b => {
          const id = b.fields.tisch?.split('/').pop() ?? '';
          return id === selectedTisch.record_id;
        })
      : enrichedBestellerfassung;
    if (filterStatus === 'alle') return list;
    return list.filter(b => b.fields.status?.key === filterStatus);
  }, [enrichedBestellerfassung, selectedTisch, filterStatus]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBestellerfassungEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  const handleStatusChange = async (bestellung: EnrichedBestellerfassung, newStatus: string) => {
    const opt = LOOKUP_OPTIONS['bestellerfassung']?.status?.find(o => o.key === newStatus);
    if (!opt) return;
    await LivingAppsService.updateBestellerfassungEntry(bestellung.record_id, { status: opt as any });
    fetchAll();
  };

  const offenCount = enrichedBestellerfassung.filter(b => b.fields.status?.key === 'offen').length;
  const inZubereitungCount = enrichedBestellerfassung.filter(b => b.fields.status?.key === 'in_zubereitung').length;
  const serviertCount = enrichedBestellerfassung.filter(b => b.fields.status?.key === 'serviert').length;
  const tischeBelegt = new Set(
    activeBestellungen.map(b => b.fields.tisch?.split('/').pop()).filter(Boolean)
  ).size;

  return (
    <div className="space-y-6">
      {/* KPI-Leiste */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Offene Bestellungen"
          value={String(offenCount)}
          description="Warten auf Zubereitung"
          icon={<IconShoppingCart size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="In Zubereitung"
          value={String(inZubereitungCount)}
          description="Werden gerade zubereitet"
          icon={<IconChefHat size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Serviert"
          value={String(serviertCount)}
          description="Warten auf Abschluss"
          icon={<IconReceipt size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Belegte Tische"
          value={String(tischeBelegt)}
          description={`von ${tischverwaltung.length} Tischen`}
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Hauptbereich: Tischplan + Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Tischplan */}
        <div className="xl:col-span-2 rounded-2xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-foreground">Tischplan</h2>
            <span className="text-sm text-muted-foreground">{tischverwaltung.length} Tische</span>
          </div>
          {tischverwaltung.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <IconMapPin size={40} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Noch keine Tische angelegt</p>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {tischverwaltung.map(tisch => {
                const bestellungen = bestellungenByTisch.get(tisch.record_id) ?? [];
                const aktiveBestellungen = bestellungen.filter(b =>
                  b.fields.status?.key !== 'abgeschlossen' && b.fields.status?.key !== 'storniert'
                );
                const statusKey = getTableStatusKey(aktiveBestellungen);
                const cfg = getStatusConfig(statusKey);
                const isSelected = selectedTisch?.record_id === tisch.record_id;

                return (
                  <button
                    key={tisch.record_id}
                    onClick={() => setSelectedTisch(isSelected ? null : tisch)}
                    className={`
                      relative rounded-xl border-2 p-3 text-left transition-all
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-md'
                        : aktiveBestellungen.length > 0
                          ? `border ${cfg.bg} hover:shadow-sm`
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span className="font-bold text-base text-foreground truncate min-w-0">
                        {tisch.fields.tischnummer ?? `Tisch`}
                      </span>
                      {aktiveBestellungen.length > 0 && (
                        <span className={`shrink-0 w-2 h-2 rounded-full mt-1 ${cfg.dot}`} />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <IconUsers size={11} className="shrink-0" />
                      <span>{tisch.fields.sitzplaetze ?? '?'} Pl.</span>
                    </div>
                    {tisch.fields.bereich && (
                      <div className="text-xs text-muted-foreground truncate">
                        {tisch.fields.bereich.label}
                      </div>
                    )}
                    {aktiveBestellungen.length > 0 && (
                      <div className={`mt-2 text-xs font-medium ${cfg.color}`}>
                        {aktiveBestellungen.length} Best.
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Seitenleiste: Tischdetail oder Übersicht */}
        <div className="rounded-2xl border bg-card overflow-hidden flex flex-col">
          {selectedTisch ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {selectedTisch.fields.tischnummer ?? 'Tisch'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedTisch.fields.sitzplaetze} Plätze
                    {selectedTisch.fields.bereich ? ` · ${selectedTisch.fields.bereich.label}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => { setEditBestellung(null); setDialogOpen(true); }}
                    className="h-8 px-2 text-xs"
                  >
                    <IconPlus size={14} className="shrink-0 mr-1" />
                    Bestellen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedTisch(null)}
                  >
                    <IconX size={14} className="shrink-0" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredBestellungen.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 px-5">
                    <IconShoppingCart size={36} className="text-muted-foreground" stroke={1.5} />
                    <p className="text-sm text-muted-foreground text-center">Keine Bestellungen für diesen Tisch</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditBestellung(null); setDialogOpen(true); }}
                    >
                      <IconPlus size={14} className="mr-1" />
                      Erste Bestellung
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBestellungen.map(b => {
                      const skey = b.fields.status?.key ?? '';
                      const scfg = getStatusConfig(skey);
                      return (
                        <div key={b.record_id} className="px-5 py-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border ${scfg.bg} ${scfg.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                                  {scfg.label}
                                </span>
                              </div>
                              {b.artikelNames.length > 0 ? (
                                <p className="text-sm text-foreground truncate">{b.artikelNames.join(', ')}</p>
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Keine Artikel</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {b.fields.bestellzeitpunkt && (
                                  <span className="flex items-center gap-1">
                                    <IconClock size={11} className="shrink-0" />
                                    {formatDate(b.fields.bestellzeitpunkt)}
                                  </span>
                                )}
                                {b.fields.serviceperson && (
                                  <span className="truncate">{b.fields.serviceperson}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setEditBestellung(b); setDialogOpen(true); }}
                              >
                                <IconPencil size={13} className="shrink-0" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(b)}
                              >
                                <IconTrash size={13} className="shrink-0" />
                              </Button>
                            </div>
                          </div>
                          {/* Schnell-Status-Buttons */}
                          <div className="flex gap-1 flex-wrap mt-1">
                            {LOOKUP_OPTIONS['bestellerfassung']?.status?.filter(o => o.key !== skey).map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => handleStatusChange(b, opt.key)}
                                className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                              >
                                → {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Aktuelle Bestellungen</h3>
                <div className="flex gap-1 flex-wrap">
                  {['alle', 'offen', 'in_zubereitung', 'serviert'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        filterStatus === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s === 'alle' ? 'Alle' : getStatusConfig(s).label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredBestellungen.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 px-5">
                    <IconShoppingCart size={36} className="text-muted-foreground" stroke={1.5} />
                    <p className="text-sm text-muted-foreground text-center">
                      {filterStatus === 'alle' ? 'Noch keine Bestellungen' : 'Keine Bestellungen mit diesem Status'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredBestellungen.map(b => {
                      const skey = b.fields.status?.key ?? '';
                      const scfg = getStatusConfig(skey);
                      return (
                        <div key={b.record_id} className="px-5 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-medium text-sm text-foreground">
                                  {b.tischName || '—'}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border ${scfg.bg} ${scfg.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${scfg.dot}`} />
                                  {scfg.label}
                                </span>
                              </div>
                              {b.artikelNames.length > 0 ? (
                                <p className="text-xs text-muted-foreground truncate">{b.artikelNames.join(', ')}</p>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Keine Artikel</p>
                              )}
                              {b.fields.bestellzeitpunkt && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <IconClock size={10} className="shrink-0" />
                                  {formatDate(b.fields.bestellzeitpunkt)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setEditBestellung(b); setDialogOpen(true); }}
                              >
                                <IconPencil size={13} className="shrink-0" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(b)}
                              >
                                <IconTrash size={13} className="shrink-0" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-5 py-3 border-t">
                <Button
                  className="w-full"
                  onClick={() => { setEditBestellung(null); setDialogOpen(true); }}
                >
                  <IconPlus size={15} className="mr-2 shrink-0" />
                  Neue Bestellung
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <BestellerfassungDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditBestellung(null); }}
        onSubmit={async (fields) => {
          if (editBestellung) {
            await LivingAppsService.updateBestellerfassungEntry(editBestellung.record_id, fields);
          } else {
            await LivingAppsService.createBestellerfassungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          editBestellung
            ? { ...editBestellung.fields }
            : selectedTisch
              ? { tisch: createRecordUrl(APP_IDS.TISCHVERWALTUNG, selectedTisch.record_id) }
              : undefined
        }
        tischverwaltungList={tischverwaltung}
        speisekarteList={speisekarte}
        enablePhotoScan={AI_PHOTO_SCAN['Bestellerfassung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bestellerfassung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Bestellung löschen"
        description="Diese Bestellung wird unwiderruflich gelöscht. Fortfahren?"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Skeleton className="xl:col-span-2 h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
