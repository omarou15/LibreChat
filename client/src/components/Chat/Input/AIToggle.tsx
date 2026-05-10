import React from 'react';
import { TooltipAnchor } from '@librechat/client';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type AIToggleProps = {
  aiEnabled: boolean;
  pendingCount: number;
  onToggle: () => void;
};

const AIToggle = React.memo(function AIToggle({ aiEnabled, pendingCount, onToggle }: AIToggleProps) {
  const localize = useLocalize();

  const tooltip = aiEnabled
    ? localize('com_ui_ai_toggle_tooltip_on')
    : localize('com_ui_ai_toggle_tooltip_off');

  return (
    <TooltipAnchor
      description={tooltip}
      render={
        <button
          type="button"
          aria-label={tooltip}
          aria-pressed={aiEnabled}
          onClick={onToggle}
          data-testid="ai-toggle-button"
          className={cn(
            'relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all duration-200',
            aiEnabled
              ? 'border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              aiEnabled ? 'bg-green-500' : 'bg-amber-500',
            )}
          />
          <span>AI</span>
          {!aiEnabled && pendingCount > 0 && (
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                'bg-amber-500 text-white',
              )}
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      }
    />
  );
});

AIToggle.displayName = 'AIToggle';
export default AIToggle;
