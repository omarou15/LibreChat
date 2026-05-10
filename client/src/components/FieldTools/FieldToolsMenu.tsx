import { useState } from 'react';
import { Ruler, AppWindow, Layers, ClipboardList, X } from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
} from '@librechat/client';
import { cn } from '~/utils';
import RoomMeasureSheet from './RoomMeasureSheet';
import WindowsSurveySheet from './WindowsSurveySheet';
import DeperditionsSheet from './DeperditionsSheet';
import ChecklistSheet from './ChecklistSheet';

type ToolKey = 'room_measure' | 'windows' | 'deperditions' | 'checklist';

const TOOLS: {
  key: ToolKey;
  icon: React.ElementType;
  label: string;
  description: string;
}[] = [
  {
    key: 'room_measure',
    icon: Ruler,
    label: 'Mesurer une pièce',
    description: 'Surface des pièces — tableau récapitulatif',
  },
  {
    key: 'windows',
    icon: AppWindow,
    label: 'Fenêtres',
    description: 'Inventaire par orientation avec totaux automatiques',
  },
  {
    key: 'deperditions',
    icon: Layers,
    label: 'Surfaces déperditives',
    description: 'Murs, planchers bas/hauts, portes',
  },
  {
    key: 'checklist',
    icon: ClipboardList,
    label: 'Checklist visite',
    description: 'Points à vérifier lors de la visite terrain',
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FieldToolsMenu({ open, onClose }: Props) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  const pickTool = (key: ToolKey) => {
    onClose();
    setActiveTool(key);
  };

  return (
    <>
      <OGDialog open={open} onOpenChange={(v) => !v && onClose()}>
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
            <OGDialogTitle className="text-base font-semibold">Outils terrain</OGDialogTitle>
            <OGDialogClose asChild>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-text-secondary hover:bg-surface-hover"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </OGDialogClose>
          </OGDialogHeader>

          <div className="px-4 pb-6 pt-3">
            <div className="flex flex-col gap-2">
              {TOOLS.map(({ key, icon: Icon, label, description }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => pickTool(key)}
                  className="flex items-center gap-4 rounded-xl border border-border-light bg-surface-secondary px-4 py-3 text-left transition-colors hover:bg-surface-hover"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-primary">
                    <Icon className="h-5 w-5 text-text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{label}</p>
                    <p className="text-xs text-text-secondary">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </OGDialogContent>
      </OGDialog>

      <RoomMeasureSheet
        open={activeTool === 'room_measure'}
        onClose={() => setActiveTool(null)}
      />
      <WindowsSurveySheet
        open={activeTool === 'windows'}
        onClose={() => setActiveTool(null)}
      />
      <DeperditionsSheet
        open={activeTool === 'deperditions'}
        onClose={() => setActiveTool(null)}
      />
      <ChecklistSheet
        open={activeTool === 'checklist'}
        onClose={() => setActiveTool(null)}
      />
    </>
  );
}
