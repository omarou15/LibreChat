import { useCallback, useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import store from '~/store';

type Params = {
  conversationId: string;
  index: number;
};

export default function useAIToggle({ conversationId, index }: Params) {
  const { ask } = useChatContext();
  const isSubmitting = useRecoilValue(store.isSubmittingFamily(index));
  const latestMessage = useRecoilValue(store.latestMessageFamily(index));

  const isNewConvo = conversationId === Constants.NEW_CONVO;

  const [aiEnabled, setAiEnabled] = useRecoilState(store.aiEnabledByConversation(conversationId));
  const [pendingMessages, setPendingMessages] = useRecoilState(
    store.pendingMessagesByConversation(conversationId),
  );
  const [queueSubmitting, setQueueSubmitting] = useRecoilState(
    store.queueSubmittingByConversation(conversationId),
  );

  const prevIsSubmittingRef = useRef(false);
  const prevMessageIdRef = useRef<string | undefined>(undefined);

  /**
   * Clear the queue only after a confirmed assistant response.
   * Watches isSubmitting: false→true→false transition while queueSubmitting is set.
   * Checks for a new assistant message ID to distinguish success from error/abort.
   */
  useEffect(() => {
    if (!queueSubmitting) {
      prevIsSubmittingRef.current = isSubmitting;
      return;
    }

    const wasSubmitting = prevIsSubmittingRef.current;
    prevIsSubmittingRef.current = isSubmitting;

    if (!wasSubmitting || isSubmitting) {
      return;
    }

    const latestId = latestMessage?.messageId;
    const isNewAssistantMessage =
      latestId !== prevMessageIdRef.current && latestMessage?.isCreatedByUser === false;

    if (isNewAssistantMessage) {
      setPendingMessages([]);
    }
    setQueueSubmitting(false);
  }, [isSubmitting, queueSubmitting, latestMessage, setPendingMessages, setQueueSubmitting]);

  const addToPending = useCallback(
    (text: string) => {
      setPendingMessages((prev) => [...prev, text]);
    },
    [setPendingMessages],
  );

  const sendPendingQueue = useCallback(() => {
    if (pendingMessages.length === 0 || isSubmitting || queueSubmitting) {
      return;
    }

    prevMessageIdRef.current = latestMessage?.messageId;

    const combinedText =
      pendingMessages.length === 1
        ? pendingMessages[0]
        : `Here are ${pendingMessages.length} messages sent while AI was paused. Please respond to each one:\n\n${pendingMessages.map((msg, i) => `[${i + 1}] ${msg}`).join('\n\n')}`;

    setQueueSubmitting(true);
    ask({ text: combinedText });
  }, [
    pendingMessages,
    isSubmitting,
    queueSubmitting,
    latestMessage,
    ask,
    setQueueSubmitting,
  ]);

  const toggleAI = useCallback(
    (value?: boolean) => {
      if (isNewConvo) {
        return;
      }
      setAiEnabled((prev) => value ?? !prev);
    },
    [isNewConvo, setAiEnabled],
  );

  return {
    aiEnabled,
    toggleAI,
    pendingMessages,
    addToPending,
    sendPendingQueue,
    queueSubmitting,
    isNewConvo,
  };
}
