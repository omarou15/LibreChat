import { useState } from 'react';
import { HardHat } from 'lucide-react';
import { cn } from '~/utils';
import FieldToolsMenu from './FieldToolsMenu';

export default function FieldToolsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Outils terrain"
        title="Outils terrain"
        onClick={() => setOpen(true)}
        className={cn(
          'relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200',
          'border-blue-500/40 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400',
        )}
      >
        <HardHat className="h-3.5 w-3.5" />
        <span>Terrain</span>
      </button>

      <FieldToolsMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
