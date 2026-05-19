import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { TischverwaltungDialog } from '@/components/dialogs/TischverwaltungDialog';
import { SpeisekarteDialog } from '@/components/dialogs/SpeisekarteDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Tischverwaltung, Speisekarte } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  IconPlus,
  IconMinus,
  IconCheck,
  IconShoppingCart,
  IconTable,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Tisch wählen' },
  { label: 'Artikel auswählen' },
  { label: 'Bestätigen' },
];

interface CartItem {
  artikel: Speisekarte;
  quantity: number;
}

function formatEuro(value: number): string {
  return `€${value.toFixed(2).replace('.', ',')}`;
}

function formatDateTimeMinute(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function BestellungErfassenPage() {
  const { speisekarte, tischverwaltung, loading, error, fetchAll } = useDashboardData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<number>(1);
  const [selectedTisch, setSelectedTisch] = useState<Tischverwaltung | null>(null);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [serviceperson, setServiceperson] = useState('');
  const [besondereHinweise, setBesondereHinweise] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const [tischDialogOpen, setTischDialogOpen] = useState(false);
  const [speisekarteDialogOpen, setSpeisekarteDialogOpen] = useState(false);

  // Deep-link: read ?step= from URL on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= WIZARD_STEPS.length && urlStep !== step) {
      setStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync step to URL
  const handleStepChange = useCallback(
    (newStep: number) => {
      setStep(newStep);
      const params = new URLSearchParams(searchParams);
      if (newStep > 1) {
        params.set('step', String(newStep));
      } else {
        params.delete('step');
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Cart helpers
  const addToCart = (artikel: Speisekarte) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(artikel.record_id);
      if (existing) {
        next.set(artikel.record_id, { artikel, quantity: existing.quantity + 1 });
      } else {
        next.set(artikel.record_id, { artikel, quantity: 1 });
      }
      return next;
    });
  };

  const removeFromCart = (artikelId: string) => {
    setCart(prev => {
      const next = new Map(prev);
      const existing = next.get(artikelId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        next.delete(artikelId);
      } else {
        next.set(artikelId, { ...existing, quantity: existing.quantity - 1 });
      }
      return next;
    });
  };

  const cartItems = Array.from(cart.values());
  const grandTotal = cartItems.reduce(
    (sum, item) => sum + (item.artikel.fields.preis ?? 0) * item.quantity,
    0
  );

  const verfuegbareArtikel = speisekarte.filter(a => a.fields.verfuegbar === true);

  const handleSelectTisch = (id: string) => {
    const tisch = tischverwaltung.find(t => t.record_id === id) ?? null;
    setSelectedTisch(tisch);
    handleStepChange(2);
  };

  const handleSubmitBestellung = async () => {
    if (!selectedTisch) return;
    if (cartItems.length === 0) return;
    if (!serviceperson.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Build artikel array: repeat URL per quantity
      const artikelUrls: string[] = [];
      for (const item of cartItems) {
        for (let i = 0; i < item.quantity; i++) {
          artikelUrls.push(createRecordUrl(APP_IDS.SPEISEKARTE, item.artikel.record_id));
        }
      }

      const result = await LivingAppsService.createBestellerfassungEntry({
        tisch: createRecordUrl(APP_IDS.TISCHVERWALTUNG, selectedTisch.record_id),
        artikel: artikelUrls,
        bestellzeitpunkt: formatDateTimeMinute(new Date()),
        serviceperson: serviceperson.trim(),
        status: 'neu',
        besondere_hinweise: besondereHinweise.trim() || undefined,
      });

      // Extract new record id from response
      let newId: string | null = null;
      if (result && typeof result === 'object') {
        const entries = Object.entries(result as Record<string, unknown>);
        if (entries.length > 0) newId = entries[0][0];
      }

      await fetchAll();
      setSuccessOrderId(newId ?? 'unbekannt');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedTisch(null);
    setCart(new Map());
    setServiceperson('');
    setBesondereHinweise('');
    setSubmitError(null);
    setSuccessOrderId(null);
    handleStepChange(1);
  };

  // ALL hooks are declared above — safe to render conditionally now

  // Success screen
  if (successOrderId !== null) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <a href="#/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <IconArrowLeft size={14} className="shrink-0" />
            Zurück zum Dashboard
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Bestellung erfassen</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <IconCheck size={32} className="text-primary" stroke={2.5} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Bestellung erfolgreich aufgegeben!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bestellung wurde erfasst
            </p>
          </div>
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tisch</span>
              <span className="font-medium">{selectedTisch?.fields.tischnummer ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Artikel</span>
              <span className="font-medium">{cartItems.reduce((s, i) => s + i.quantity, 0)} Positionen</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gesamtbetrag</span>
              <span className="font-semibold text-primary">{formatEuro(grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Serviceperson</span>
              <span className="font-medium">{serviceperson}</span>
            </div>
            <div className="pt-1">
              <StatusBadge statusKey="neu" label="Neu" />
            </div>
          </div>
          <Button onClick={handleReset} className="gap-2">
            <IconRefresh size={16} />
            Neue Bestellung
          </Button>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Bestellung erfassen"
      subtitle="Tisch wählen, Artikel auswählen und Bestellung aufgeben"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── STEP 1: Tisch wählen ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconTable size={20} className="text-primary" />
              Tisch auswählen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Tisch, für den du die Bestellung aufnehmen möchtest.
            </p>
          </div>

          <EntitySelectStep
            items={tischverwaltung.map(t => ({
              id: t.record_id,
              title: t.fields.tischnummer ?? '—',
              subtitle: [
                t.fields.bereich?.label,
                t.fields.sitzplaetze ? `${t.fields.sitzplaetze} Plätze` : undefined,
              ]
                .filter(Boolean)
                .join(' · '),
              stats: t.fields.sitzplaetze
                ? [{ label: 'Plätze', value: t.fields.sitzplaetze }]
                : [],
              icon: <IconTable size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectTisch}
            searchPlaceholder="Tisch suchen..."
            emptyText="Kein Tisch gefunden."
            createLabel="Neuen Tisch anlegen"
            onCreateNew={() => setTischDialogOpen(true)}
            createDialog={
              <TischverwaltungDialog
                open={tischDialogOpen}
                onClose={() => setTischDialogOpen(false)}
                onSubmit={async fields => {
                  await LivingAppsService.createTischverwaltungEntry(fields);
                  await fetchAll();
                  setTischDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Tischverwaltung']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Tischverwaltung']}
              />
            }
          />
        </div>
      )}

      {/* ── STEP 2: Artikel auswählen ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <IconShoppingCart size={20} className="text-primary" />
                Artikel auswählen
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tisch: <span className="font-medium text-foreground">{selectedTisch?.fields.tischnummer}</span>
                {selectedTisch?.fields.bereich?.label && (
                  <span className="text-muted-foreground"> · {selectedTisch.fields.bereich.label}</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSpeisekarteDialogOpen(true)}
              className="gap-1.5 shrink-0"
            >
              <IconPlus size={14} />
              Neuen Artikel anlegen
            </Button>
          </div>

          <SpeisekarteDialog
            open={speisekarteDialogOpen}
            onClose={() => setSpeisekarteDialogOpen(false)}
            onSubmit={async fields => {
              await LivingAppsService.createSpeisekarteEntry(fields);
              await fetchAll();
              setSpeisekarteDialogOpen(false);
            }}
            enablePhotoScan={AI_PHOTO_SCAN['Speisekarte']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Speisekarte']}
          />

          {verfuegbareArtikel.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Keine verfügbaren Artikel gefunden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {verfuegbareArtikel.map(artikel => {
                const cartItem = cart.get(artikel.record_id);
                const qty = cartItem?.quantity ?? 0;
                return (
                  <div
                    key={artikel.record_id}
                    className={`bg-card border rounded-2xl p-4 flex flex-col gap-2 overflow-hidden transition-colors ${
                      qty > 0 ? 'border-primary/50 bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <span className="font-semibold text-sm truncate min-w-0">
                        {artikel.fields.artikel_name ?? '—'}
                      </span>
                      {artikel.fields.kategorie && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {artikel.fields.kategorie.label}
                        </Badge>
                      )}
                    </div>

                    {artikel.fields.beschreibung && (
                      <p className="text-xs text-muted-foreground line-clamp-2 min-w-0">
                        {artikel.fields.beschreibung}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-1 gap-2">
                      <span className="font-bold text-primary text-sm">
                        {formatEuro(artikel.fields.preis ?? 0)}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {qty > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeFromCart(artikel.record_id)}
                            >
                              <IconMinus size={13} />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          </>
                        )}
                        <Button
                          variant={qty > 0 ? 'default' : 'outline'}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => addToCart(artikel)}
                        >
                          <IconPlus size={13} />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live total + navigation */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => handleStepChange(1)} className="gap-1.5">
                <IconArrowLeft size={14} />
                Zurück
              </Button>
              {cartItems.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <IconShoppingCart size={16} className="text-primary" />
                  <span className="text-muted-foreground">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)} Artikel
                  </span>
                  <span className="font-bold text-primary">{formatEuro(grandTotal)}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => handleStepChange(3)}
              disabled={cartItems.length === 0}
              className="gap-2"
            >
              Weiter
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Bestellung bestätigen ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <IconCheck size={20} className="text-primary" />
              Bestellung bestätigen
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Prüfe die Zusammenfassung und gib die Bestellung auf.
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-card border rounded-2xl overflow-hidden">
            {/* Table info */}
            <div className="px-4 py-3 border-b bg-secondary/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconTable size={16} className="text-primary" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-sm">{selectedTisch?.fields.tischnummer}</span>
                {selectedTisch?.fields.bereich?.label && (
                  <span className="text-xs text-muted-foreground ml-2">{selectedTisch.fields.bereich.label}</span>
                )}
                {selectedTisch?.fields.sitzplaetze && (
                  <span className="text-xs text-muted-foreground ml-2">· {selectedTisch.fields.sitzplaetze} Plätze</span>
                )}
              </div>
            </div>

            {/* Article list */}
            <div className="divide-y">
              {cartItems.map(item => (
                <div key={item.artikel.record_id} className="px-4 py-3 flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{item.artikel.fields.artikel_name ?? '—'}</span>
                    {item.artikel.fields.kategorie && (
                      <span className="text-xs text-muted-foreground">{item.artikel.fields.kategorie.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-sm">
                    <span className="text-muted-foreground">× {item.quantity}</span>
                    <span className="font-semibold min-w-[4rem] text-right">
                      {formatEuro((item.artikel.fields.preis ?? 0) * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grand total */}
            <div className="px-4 py-3 border-t bg-secondary/40 flex items-center justify-between">
              <span className="font-semibold text-sm">Gesamt</span>
              <span className="font-bold text-primary text-base">{formatEuro(grandTotal)}</span>
            </div>
          </div>

          {/* Service person + notes */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="serviceperson">
                Serviceperson <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceperson"
                placeholder="Name der Serviceperson"
                value={serviceperson}
                onChange={e => setServiceperson(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="besondere_hinweise">Besondere Hinweise <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="besondere_hinweise"
                placeholder="z. B. Allergien, Sonderwünsche..."
                value={besondereHinweise}
                onChange={e => setBesondereHinweise(e.target.value)}
                className="w-full min-h-[80px]"
              />
            </div>
          </div>

          {submitError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-2 border-t flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => handleStepChange(2)} className="gap-1.5">
              <IconArrowLeft size={14} />
              Zurück
            </Button>
            <Button
              onClick={handleSubmitBestellung}
              disabled={submitting || !serviceperson.trim() || cartItems.length === 0}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Wird aufgegeben...
                </>
              ) : (
                <>
                  <IconCheck size={16} />
                  Bestellung aufgeben
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
