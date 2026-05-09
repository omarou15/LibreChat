import { atomFamily } from 'recoil';
import { Constants } from 'librechat-data-provider';

const AI_TOGGLE_STORAGE = 'lc_ai_toggle';
const AI_QUEUE_STORAGE = 'lc_ai_queue';

/** Whether AI is enabled for a given conversationId. Persisted to localStorage. */
const aiEnabledByConversation = atomFamily<boolean, string>({
  key: 'aiEnabledByConversation',
  default: true,
  effects: (conversationId) => [
    ({ setSelf, onSet }) => {
      if (conversationId === Constants.NEW_CONVO) {
        return;
      }
      const storageKey = `${AI_TOGGLE_STORAGE}__${conversationId}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved != null) {
          setSelf(JSON.parse(saved) as boolean);
        }
      } catch {
        // ignore parse/storage errors
      }
      onSet((newValue) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newValue));
        } catch {
          // ignore storage errors
        }
      });
    },
  ],
});

/** FIFO queue of pending text messages per conversationId. Persisted to localStorage. */
const pendingMessagesByConversation = atomFamily<string[], string>({
  key: 'pendingMessagesByConversation',
  default: [],
  effects: (conversationId) => [
    ({ setSelf, onSet }) => {
      if (conversationId === Constants.NEW_CONVO) {
        return;
      }
      const storageKey = `${AI_QUEUE_STORAGE}__${conversationId}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved != null) {
          setSelf(JSON.parse(saved) as string[]);
        }
      } catch {
        // ignore
      }
      onSet((newValue) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newValue));
        } catch {
          // ignore
        }
      });
    },
  ],
});

/**
 * True while a queued batch is in-flight.
 * Used to know when to clear the queue (only after a confirmed assistant response).
 */
const queueSubmittingByConversation = atomFamily<boolean, string>({
  key: 'queueSubmittingByConversation',
  default: false,
});

export default {
  aiEnabledByConversation,
  pendingMessagesByConversation,
  queueSubmittingByConversation,
};
