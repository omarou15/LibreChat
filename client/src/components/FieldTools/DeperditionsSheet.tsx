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
  WALL_ADJACENCY_OPTIONS,
  FLOOR_LOW_OPTIONS,
  FLOOR_HIGH_OPTIONS,
  parseSurface1Dec,
  formatSurface1Dec,
  computeDeperditionsTotals,
  formatDeperditionsAsMessage,
} from './deperditionsTools.types';
import type {
  WallRow,
  FloorLowRow,
  FloorHighRow,
  DoorRow,
  DeperditionsPayload,
  WallAdjacency,
  FloorLowType,
  FloorHighType,
} from './deperditionsTools.types';

const TOOL_KEY = 'deperditions';

function draftKey(conversationId: string) {
  return `fieldtool:${conversationId}:${TOOL_KEY}`;
}

function emptyPayload(): DeperditionsPayload {
  return { walls: [], floorsLow: [], floorsHigh: [], doors: [] };
}

function emptyWall(): WallRow {
  return { id: crypto.randomUUID(), adjacency: 'exterieur', surface: '', orientation: '', note: '' };
}
function emptyFloorLow(): FloorLowRow {
  return { id: crypto.randomUUID(), type: 'terre_plein', surface: '', note: '' };
}
function emptyFloorHigh(): FloorHighRow {
  return { id: crypto.randomUUID(), type: 'combles_perdus', surface: '', note: '' };
}
function emptyDoor(): DoorRow {
  return { id: crypto.randomUUID(), surface: '', note: '' };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = 'walls' | 'floorsLow' | 'floorsHigh' | 'doors';

const TABS: { key: Tab; label: string }[] = [
  { key: 'walls', label: 'Murs' },
  { key: 'floorsLow', label: 'Planchers bas' },
  { key: 'floorsHigh', label: 'Planchers hauts' },
  { key: 'doors', label: 'Portes' },
];

export default function DeperditionsSheet({ open, onClose }: Props) {
  const { conversation } = useChatContext();
  const { setValue } = useChatFormContext();
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;

  const [payload, setPayload] = useState<DeperditionsPayload>(emptyPayload());
  const [activeTab, setActiveTab] = useState<Tab>('walls');

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey(conversationId));
      if (raw) setPayload(JSON.parse(raw) as DeperditionsPayload);
    } catch {
      // ignore
    }
  }, [open, conversationId]);

  const saveDraft = useCallback(
    (updated: DeperditionsPayload) => {
      localStorage.setItem(draftKey(conversationId), JSON.stringify(updated));
    },
    [conversationId],
  );

  const update = (patch: Partial<DeperditionsPayload>) => {
    const updated = { ...payload, ...patch };
    setPayload(updated);
    saveDraft(updated);
  };

  const totals = computeDeperditionsTotals(payload);
  const hasData = totals.grand > 0;

  const handleSend = () => {
    const message = formatDeperditionsAsMessage(payload);
    if (!message) return;
    setValue('text', message, { shouldValidate: true });
    localStorage.removeItem(draftKey(conversationId));
    setPayload(emptyPayload());
    onClose();
  };

  const handleClose = () => {
    saveDraft(payload);
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
          <OGDialogTitle className="text-base font-semibold">Surfaces déperditives</OGDialogTitle>
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

        <div className="flex gap-1 overflow-x-auto border-b border-border-light px-4 pt-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'shrink-0 border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary',
              )}
            >
              {label}
              {key === 'walls' && payload.walls.length > 0 && (
                <span className="ml-1 text-xs text-text-secondary">({payload.walls.length})</span>
              )}
              {key === 'floorsLow' && payload.floorsLow.length > 0 && (
                <span className="ml-1 text-xs text-text-secondary">({payload.floorsLow.length})</span>
              )}
              {key === 'floorsHigh' && payload.floorsHigh.length > 0 && (
                <span className="ml-1 text-xs text-text-secondary">({payload.floorsHigh.length})</span>
              )}
              {key === 'doors' && payload.doors.length > 0 && (
                <span className="ml-1 text-xs text-text-secondary">({payload.doors.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 pb-4 pt-3">
          {activeTab === 'walls' && (
            <WallsTab
              rows={payload.walls}
              onChange={(walls) => update({ walls })}
            />
          )}
          {activeTab === 'floorsLow' && (
            <FloorsLowTab
              rows={payload.floorsLow}
              onChange={(floorsLow) => update({ floorsLow })}
            />
          )}
          {activeTab === 'floorsHigh' && (
            <FloorsHighTab
              rows={payload.floorsHigh}
              onChange={(floorsHigh) => update({ floorsHigh })}
            />
          )}
          {activeTab === 'doors' && (
            <DoorsTab
              rows={payload.doors}
              onChange={(doors) => update({ doors })}
            />
          )}
        </div>

        {hasData && (
          <div className="border-t border-border-light bg-surface-secondary px-4 py-2 text-sm text-text-secondary">
            Total : <strong className="text-text-primary">{formatSurface1Dec(totals.grand)}</strong>
            {totals.walls > 0 && ` (murs ${formatSurface1Dec(totals.walls)}`}
            {totals.floorsLow > 0 && ` · pb ${formatSurface1Dec(totals.floorsLow)}`}
            {totals.floorsHigh > 0 && ` · ph ${formatSurface1Dec(totals.floorsHigh)}`}
            {totals.doors > 0 && ` · portes ${formatSurface1Dec(totals.doors)}`}
            {hasData && ')'}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border-light px-4 py-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            Enregistrer brouillon
          </Button>
          <Button
            type="button"
            variant="submit"
            size="sm"
            disabled={!hasData}
            onClick={handleSend}
          >
            Envoyer dans le chat
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}

function SurfaceInput({
  value,
  onChange,
  placeholder = 'ex: 12,5',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (/^\d{0,5}([.,]\d{0,1})?$/.test(v)) onChange(v);
      }}
      className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function NoteInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      placeholder="Note (optionnel)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function RowActions({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="mt-1 self-start rounded-full p-1 text-text-secondary hover:text-text-primary"
      aria-label="Supprimer"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function WallsTab({ rows, onChange }: { rows: WallRow[]; onChange: (rows: WallRow[]) => void }) {
  const update = (id: string, patch: Partial<WallRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => {
        const s = parseSurface1Dec(row.surface);
        return (
          <div key={row.id} className="rounded-xl border border-border-light bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Mur {idx + 1}
                {s != null && <span className="ml-2 text-xs text-text-secondary">→ {formatSurface1Dec(s)}</span>}
              </span>
              <RowActions onRemove={() => onChange(rows.filter((r) => r.id !== row.id))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Adjacence</label>
                <select
                  value={row.adjacency}
                  onChange={(e) => update(row.id, { adjacency: e.target.value as WallAdjacency })}
                  className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {WALL_ADJACENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Orientation</label>
                <input
                  type="text"
                  placeholder="N, S, E, O…"
                  value={row.orientation}
                  onChange={(e) => update(row.id, { orientation: e.target.value })}
                  className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Surface (m²)</label>
                <SurfaceInput value={row.surface} onChange={(v) => update(row.id, { surface: v })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Note</label>
                <NoteInput value={row.note} onChange={(v) => update(row.id, { note: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyWall()])} className="w-full gap-1">
        <Plus className="h-4 w-4" />
        Ajouter un mur
      </Button>
    </div>
  );
}

function FloorsLowTab({ rows, onChange }: { rows: FloorLowRow[]; onChange: (rows: FloorLowRow[]) => void }) {
  const update = (id: string, patch: Partial<FloorLowRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => {
        const s = parseSurface1Dec(row.surface);
        return (
          <div key={row.id} className="rounded-xl border border-border-light bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Plancher bas {idx + 1}
                {s != null && <span className="ml-2 text-xs text-text-secondary">→ {formatSurface1Dec(s)}</span>}
              </span>
              <RowActions onRemove={() => onChange(rows.filter((r) => r.id !== row.id))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Type</label>
                <select
                  value={row.type}
                  onChange={(e) => update(row.id, { type: e.target.value as FloorLowType })}
                  className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {FLOOR_LOW_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Surface (m²)</label>
                <SurfaceInput value={row.surface} onChange={(v) => update(row.id, { surface: v })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Note</label>
                <NoteInput value={row.note} onChange={(v) => update(row.id, { note: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyFloorLow()])} className="w-full gap-1">
        <Plus className="h-4 w-4" />
        Ajouter un plancher bas
      </Button>
    </div>
  );
}

function FloorsHighTab({ rows, onChange }: { rows: FloorHighRow[]; onChange: (rows: FloorHighRow[]) => void }) {
  const update = (id: string, patch: Partial<FloorHighRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => {
        const s = parseSurface1Dec(row.surface);
        return (
          <div key={row.id} className="rounded-xl border border-border-light bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Plancher haut {idx + 1}
                {s != null && <span className="ml-2 text-xs text-text-secondary">→ {formatSurface1Dec(s)}</span>}
              </span>
              <RowActions onRemove={() => onChange(rows.filter((r) => r.id !== row.id))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Type</label>
                <select
                  value={row.type}
                  onChange={(e) => update(row.id, { type: e.target.value as FloorHighType })}
                  className="rounded-lg border border-border-light bg-surface-primary px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {FLOOR_HIGH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Surface (m²)</label>
                <SurfaceInput value={row.surface} onChange={(v) => update(row.id, { surface: v })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Note</label>
                <NoteInput value={row.note} onChange={(v) => update(row.id, { note: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyFloorHigh()])} className="w-full gap-1">
        <Plus className="h-4 w-4" />
        Ajouter un plancher haut
      </Button>
    </div>
  );
}

function DoorsTab({ rows, onChange }: { rows: DoorRow[]; onChange: (rows: DoorRow[]) => void }) {
  const update = (id: string, patch: Partial<DoorRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, idx) => {
        const s = parseSurface1Dec(row.surface);
        return (
          <div key={row.id} className="rounded-xl border border-border-light bg-surface-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary">
                Porte {idx + 1}
                {s != null && <span className="ml-2 text-xs text-text-secondary">→ {formatSurface1Dec(s)}</span>}
              </span>
              <RowActions onRemove={() => onChange(rows.filter((r) => r.id !== row.id))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Surface (m²)</label>
                <SurfaceInput value={row.surface} onChange={(v) => update(row.id, { surface: v })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-text-secondary">Note</label>
                <NoteInput value={row.note} onChange={(v) => update(row.id, { note: v })} />
              </div>
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, emptyDoor()])} className="w-full gap-1">
        <Plus className="h-4 w-4" />
        Ajouter une porte
      </Button>
    </div>
  );
}
