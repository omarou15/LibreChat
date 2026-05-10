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
  ROOM_GROUPS,
  ROOM_KIND_LABEL,
  formatSurface,
  formatRoomEntriesAsMessage,
} from './fieldTools.types';
import type { RoomKind, RoomEntry } from './fieldTools.types';

const TOOL_KEY = 'room_measure';

function draftKey(conversationId: string) {
  return `fieldtool:${conversationId}:${TOOL_KEY}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RoomMeasureSheet({ open, onClose }: Props) {
  const { conversation } = useChatContext();
  const { setValue } = useChatFormContext();
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;

  const [entries, setEntries] = useState<RoomEntry[]>([]);
  const [kind, setKind] = useState<RoomKind>('sejour');
  const [surfaceInput, setSurfaceInput] = useState('');

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey(conversationId));
      if (raw) setEntries(JSON.parse(raw) as RoomEntry[]);
    } catch {
      // ignore
    }
  }, [open, conversationId]);

  const saveDraft = useCallback(
    (updated: RoomEntry[]) => {
      localStorage.setItem(draftKey(conversationId), JSON.stringify(updated));
    },
    [conversationId],
  );

  const addEntry = () => {
    const n = parseFloat(surfaceInput.replace(',', '.'));
    if (isNaN(n) || n <= 0) return;
    const entry: RoomEntry = { id: crypto.randomUUID(), kind, surface: Math.round(n * 10) / 10 };
    const updated = [...entries, entry];
    setEntries(updated);
    saveDraft(updated);
    setSurfaceInput('');
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveDraft(updated);
  };

  const handleSend = () => {
    const message = formatRoomEntriesAsMessage(entries);
    if (!message) return;
    setValue('text', message, { shouldValidate: true });
    localStorage.removeItem(draftKey(conversationId));
    setEntries([]);
    onClose();
  };

  const handleClose = () => {
    saveDraft(entries);
    onClose();
  };

  const surfaceOk = !isNaN(parseFloat(surfaceInput.replace(',', '.'))) && parseFloat(surfaceInput.replace(',', '.')) > 0;

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
          <OGDialogTitle className="text-base font-semibold">Mesurer une pièce</OGDialogTitle>
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Type de pièce</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as RoomKind)}
                className="w-full rounded-lg border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ROOM_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.kinds.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Surface (m²)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="ex: 18,5"
                  value={surfaceInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d{0,4}([.,]\d{0,2})?$/.test(v)) setSurfaceInput(v);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && surfaceOk && addEntry()}
                  className="flex-1 rounded-lg border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                  disabled={!surfaceOk}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </div>

            {entries.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-text-primary">
                  Pièces ajoutées ({entries.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {entries.map((e) => (
                    <span
                      key={e.id}
                      className="flex items-center gap-1 rounded-full border border-border-light bg-surface-secondary px-3 py-1 text-sm text-text-primary"
                    >
                      {ROOM_KIND_LABEL[e.kind]} — {formatSurface(e.surface)}
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        className="ml-1 rounded-full p-0.5 text-text-secondary hover:text-text-primary"
                        aria-label={`Supprimer ${ROOM_KIND_LABEL[e.kind]}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <p className="text-sm text-text-secondary">
                  Total :{' '}
                  <strong>{formatSurface(entries.reduce((acc, e) => acc + e.surface, 0))}</strong>
                </p>
              </div>
            )}
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
            disabled={entries.length === 0}
            onClick={handleSend}
          >
            Envoyer dans le chat
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
