import { useState, useCallback, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
} from '@librechat/client';
import { useChatContext, useChatFormContext } from '~/Providers';
import { Constants } from 'librechat-data-provider';
import { cn } from '~/utils';
import {
  VITRAGE_OPTIONS,
  MATERIAU_OPTIONS,
  ORIENTATIONS,
  parseSurfaceM2,
  isSurfaceInputAllowed,
  formatM2,
  formatWindowsSurveyAsMessage,
} from './windowsTools.types';
import type { WindowTypology, Vitrage, Materiau, Orientation } from './windowsTools.types';

const TOOL_KEY = 'windows_survey';

function draftKey(conversationId: string) {
  return `fieldtool:${conversationId}:${TOOL_KEY}`;
}

function emptyRow(): WindowTypology {
  return {
    id: crypto.randomUUID(),
    orientation: 'S',
    vitrage: 'double',
    materiau: 'pvc',
    largeur: '',
    hauteur: '',
    quantite: '1',
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WindowsSurveySheet({ open, onClose }: Props) {
  const { conversation } = useChatContext();
  const { setValue } = useChatFormContext();
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;

  const [rows, setRows] = useState<WindowTypology[]>([emptyRow()]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey(conversationId));
      if (raw) {
        const parsed = JSON.parse(raw) as WindowTypology[];
        setRows(parsed.length > 0 ? parsed : [emptyRow()]);
      }
    } catch {
      // ignore
    }
  }, [open, conversationId]);

  const saveDraft = useCallback(
    (updated: WindowTypology[]) => {
      localStorage.setItem(draftKey(conversationId), JSON.stringify(updated));
    },
    [conversationId],
  );

  const updateRow = (id: string, patch: Partial<WindowTypology>) => {
    const updated = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(updated);
    saveDraft(updated);
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    const updated = [
      ...rows,
      emptyRow(),
    ];
    if (last) {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        orientation: last.orientation,
        vitrage: last.vitrage,
        materiau: last.materiau,
      };
    }
    setRows(updated);
    saveDraft(updated);
  };

  const removeRow = (id: string) => {
    const updated = rows.filter((r) => r.id !== id);
    const final = updated.length === 0 ? [emptyRow()] : updated;
    setRows(final);
    saveDraft(final);
  };

  const hasValidRows = rows.some(
    (r) => parseSurfaceM2(r.largeur, r.hauteur, r.quantite) != null,
  );

  const handleSend = () => {
    const valid = rows.filter((r) => parseSurfaceM2(r.largeur, r.hauteur, r.quantite) != null);
    const message = formatWindowsSurveyAsMessage(valid);
    if (!message) return;
    setValue('text', message, { shouldValidate: true });
    localStorage.removeItem(draftKey(conversationId));
    setRows([emptyRow()]);
    onClose();
  };

  const handleClose = () => {
    saveDraft(rows);
    onClose();
  };

  return (
    <OGDialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <OGDialogContent
        showCloseButton={false}
        className={cn(
          'inset-x-0 bottom-0 left-0 top-auto w-full max-w-full translate-x-0 translate-y-0',
          'rounded-b-none rounded-t-2xl p-0',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
          'data-[state=open]:slide-in-from-left-0 data-[state=closed]:slide-out-to-left-0',
          'data-[state=open]:slide-in-from-top-0 data-[state=closed]:slide-out-to-top-0',
        )}
      >
        <OGDialogHeader className="flex flex-row items-center justify-between border-b border-border-light px-4 py-3">
          <OGDialogTitle className="text-base font-semibold">Fenêtres</OGDialogTitle>
          <OGDialogClose asChild>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1 text-text-secondary hover:bg-surface-hover"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </OGDialogClose>
        </OGDialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-3">
          <div className="flex flex-col gap-3">
            {rows.map((row, idx) => {
              const surfM2 = parseSurfaceM2(row.largeur, row.hauteur, row.quantite);
              return (
                <div
                  key={row.id}
                  className="relative rounded-xl border border-border-light bg-surface-secondary p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">
                      Fenêtre {idx + 1}
                      {surfM2 != null && (
                        <span className="ml-2 text-xs text-text-secondary">
                          → {formatM2(surfM2)}
                        </span>
                      )}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="rounded-full p-1 text-text-secondary hover:text-text-primary"
                        aria-label="Supprimer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Orientation</label>
                      <select
                        value={row.orientation}
                        onChange={(e) => updateRow(row.id, { orientation: e.target.value as Orientation })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {ORIENTATIONS.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Vitrage</label>
                      <select
                        value={row.vitrage}
                        onChange={(e) => updateRow(row.id, { vitrage: e.target.value as Vitrage })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {VITRAGE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Matériau</label>
                      <select
                        value={row.materiau}
                        onChange={(e) => updateRow(row.id, { materiau: e.target.value as Materiau })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {MATERIAU_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Largeur (m)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="1,20"
                        value={row.largeur}
                        onChange={(e) => isSurfaceInputAllowed(e.target.value) && updateRow(row.id, { largeur: e.target.value })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Hauteur (m)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="1,40"
                        value={row.hauteur}
                        onChange={(e) => isSurfaceInputAllowed(e.target.value) && updateRow(row.id, { hauteur: e.target.value })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-text-secondary">Quantité</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={row.quantite}
                        onChange={(e) => /^\d{0,2}$/.test(e.target.value) && updateRow(row.id, { quantite: e.target.value })}
                        className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full gap-1">
              <Plus className="h-4 w-4" />
              Ajouter une fenêtre
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border-light px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Enregistrer brouillon
          </Button>
          <Button
            type="button"
            variant="submit"
            size="sm"
            disabled={!hasValidRows}
            onClick={handleSend}
          >
            Envoyer dans le chat
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
