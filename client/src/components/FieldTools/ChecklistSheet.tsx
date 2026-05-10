import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
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
import { DEFAULT_CHECKLIST, formatChecklistAsMessage } from './checklistTools.types';
import type { ChecklistSection } from './checklistTools.types';

const TOOL_KEY = 'checklist';

function draftKey(conversationId: string) {
  return `fieldtool:${conversationId}:${TOOL_KEY}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ChecklistSheet({ open, onClose }: Props) {
  const { conversation } = useChatContext();
  const { setValue } = useChatFormContext();
  const conversationId = conversation?.conversationId ?? Constants.NEW_CONVO;

  const [sections, setSections] = useState<ChecklistSection[]>(
    structuredClone(DEFAULT_CHECKLIST),
  );

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(draftKey(conversationId));
      if (raw) setSections(JSON.parse(raw) as ChecklistSection[]);
      else setSections(structuredClone(DEFAULT_CHECKLIST));
    } catch {
      setSections(structuredClone(DEFAULT_CHECKLIST));
    }
  }, [open, conversationId]);

  const saveDraft = useCallback(
    (updated: ChecklistSection[]) => {
      localStorage.setItem(draftKey(conversationId), JSON.stringify(updated));
    },
    [conversationId],
  );

  const toggleItem = (sectionId: string, itemId: string) => {
    const updated = sections.map((s) =>
      s.id !== sectionId
        ? s
        : {
            ...s,
            items: s.items.map((item) =>
              item.id !== itemId ? item : { ...item, checked: !item.checked },
            ),
          },
    );
    setSections(updated);
    saveDraft(updated);
  };

  const updateNote = (sectionId: string, itemId: string, note: string) => {
    const updated = sections.map((s) =>
      s.id !== sectionId
        ? s
        : {
            ...s,
            items: s.items.map((item) =>
              item.id !== itemId ? item : { ...item, note },
            ),
          },
    );
    setSections(updated);
    saveDraft(updated);
  };

  const totalChecked = sections.flatMap((s) => s.items).filter((i) => i.checked).length;
  const totalItems = sections.flatMap((s) => s.items).length;

  const handleSend = () => {
    const message = formatChecklistAsMessage(sections);
    if (!message) return;
    setValue('text', message, { shouldValidate: true });
    localStorage.removeItem(draftKey(conversationId));
    setSections(structuredClone(DEFAULT_CHECKLIST));
    onClose();
  };

  const handleReset = () => {
    const fresh = structuredClone(DEFAULT_CHECKLIST);
    setSections(fresh);
    saveDraft(fresh);
  };

  const handleClose = () => {
    saveDraft(sections);
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
          <div>
            <OGDialogTitle className="text-base font-semibold">Checklist visite</OGDialogTitle>
            <p className="mt-0.5 text-xs text-text-secondary">
              {totalChecked}/{totalItems} points vérifiés
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg px-2 py-1 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            >
              Réinitialiser
            </button>
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
          </div>
        </OGDialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4 pt-3">
          <div className="flex flex-col gap-4">
            {sections.map((section) => {
              const checked = section.items.filter((i) => i.checked).length;
              return (
                <div key={section.id}>
                  <h3 className="mb-2 text-sm font-semibold text-text-primary">
                    {section.title}
                    <span className="ml-2 text-xs font-normal text-text-secondary">
                      ({checked}/{section.items.length})
                    </span>
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-xl border p-3 transition-colors',
                          item.checked
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-border-light bg-surface-secondary',
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(section.id, item.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-green-500"
                          />
                          <span
                            className={cn(
                              'text-sm',
                              item.checked
                                ? 'text-text-secondary line-through'
                                : 'text-text-primary',
                            )}
                          >
                            {item.label}
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ajouter une note…"
                          value={item.note}
                          onChange={(e) => updateNote(section.id, item.id, e.target.value)}
                          className="mt-2 w-full rounded-lg border border-border-light bg-surface-primary px-2 py-1 text-xs text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
            disabled={totalChecked === 0}
            onClick={handleSend}
          >
            Envoyer dans le chat
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
