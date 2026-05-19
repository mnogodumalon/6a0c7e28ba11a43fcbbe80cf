import type { Tischverwaltung } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface TischverwaltungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Tischverwaltung | null;
  onEdit: (record: Tischverwaltung) => void;
}

export function TischverwaltungViewDialog({ open, onClose, record, onEdit }: TischverwaltungViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tischverwaltung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tischnummer</Label>
            <p className="text-sm">{record.fields.tischnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anzahl Sitzplätze</Label>
            <p className="text-sm">{record.fields.sitzplaetze ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bereich</Label>
            <Badge variant="secondary">{record.fields.bereich?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hinweise zum Tisch</Label>
            <p className="text-sm">{record.fields.tisch_hinweis ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}