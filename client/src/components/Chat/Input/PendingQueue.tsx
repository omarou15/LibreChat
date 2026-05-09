import React, { useState } from 'react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

type PendingQueueProps = {
  pendingMessages: string[];
  queueSubmitting: boolean;
  hasFiles: boolean;
  onSend: () => void;
};

const PendingQueue = React.memo(function PendingQueue({
  pendingMessages,
  queueSubmitting,
  hasFiles,
  onSend,
}: PendingQueueProps) {
  const localize = useLocalize();
  const [expanded, setExpanded] = useState(false);

  if (pendingMessages.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Queued messages"
      className="mx-3 mb-1 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-amber-500" />
          <span className="truncate text-xs font-medium text-amber-600 dark:text-amber-400">
            {localize('com_ui_ai_queue_send', String(pendingMessages.length))}
          </span>
          <span
            className={cn(
              'ml-auto flex-shrink-0 text-amber-500 transition-transform duration-200',
              expanded ? 'rotate-180' : '',
            )}
            aria-hidden
          >
            ▾
          </span>
        </button>

        <button
          type="button"
          disabled={queueSubmitting}
          onClick={onSend}
          className={cn(
            'flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200',
            'bg-amber-500 text-white hover:bg-amber-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {queueSubmitting ? localize('com_ui_ai_queue_submitting') : '▶ Send'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-amber-500/20 px-3 pb-2 pt-1">
          <ol className="space-y-1">
            {pendingMessages.map((msg, i) => (
              <li key={i} className="flex gap-2 text-xs text-text-secondary">
                <span className="flex-shrink-0 font-mono text-amber-500">[{i + 1}]</span>
                <span className="line-clamp-2 break-words">{msg}</span>
              </li>
            ))}
          </ol>
          {hasFiles && (
            <p className="mt-1.5 text-[11px] italic text-amber-600/80 dark:text-amber-400/80">
              ⚠ {localize('com_ui_ai_queue_files_excluded')}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

PendingQueue.displayName = 'PendingQueue';
export default PendingQueue;
