import type { Bestellerfassung, Tischverwaltung, Speisekarte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BestellerfassungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bestellerfassung | null;
  onEdit: (record: Bestellerfassung) => void;
  tischverwaltungList: Tischverwaltung[];
  speisekarteList: Speisekarte[];
}

export function BestellerfassungViewDialog({ open, onClose, record, onEdit, tischverwaltungList, speisekarteList }: BestellerfassungViewDialogProps) {
  function getTischverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return tischverwaltungList.find(r => r.record_id === id)?.fields.tischnummer ?? '—';
  }

  function getSpeisekarteDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return speisekarteList.find(r => r.record_id === id)?.fields.artikel_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bestellerfassung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tisch</Label>
            <p className="text-sm">{getTischverwaltungDisplayName(record.fields.tisch)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellte Artikel</Label>
            {Array.isArray(record.fields.artikel) && record.fields.artikel.length ? (
              <div className="flex flex-wrap gap-1">
                {record.fields.artikel.map((u: unknown, i: number) => (
                  <Badge key={i} variant="secondary">{getSpeisekarteDisplayName(u)}</Badge>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellzeitpunkt</Label>
            <p className="text-sm">{formatDate(record.fields.bestellzeitpunkt)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Serviceperson</Label>
            <p className="text-sm">{record.fields.serviceperson ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestellstatus</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Besondere Hinweise</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.besondere_hinweise ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}