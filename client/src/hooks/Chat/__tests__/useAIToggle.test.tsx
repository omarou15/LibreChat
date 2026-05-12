import React from 'react';
import { act, render } from '@testing-library/react';
import { RecoilRoot, useRecoilCallback, useSetRecoilState } from 'recoil';
import type { MutableSnapshot } from 'recoil';
import type { TMessage } from 'librechat-data-provider';
import useAIToggle from '../useAIToggle';
import store from '~/store';

const CONV_ID = 'test-conv-1';
const INDEX = 0;

const mockAsk = jest.fn();
jest.mock('~/Providers', () => ({
  useChatContext: () => ({ ask: mockAsk }),
}));

interface HarnessHandle {
  toggleAI: () => void;
  addToPending: (text: string) => void;
  sendPendingQueue: () => void;
  readAiEnabled: () => boolean;
  readPendingMessages: () => string[];
  readQueueSubmitting: () => boolean;
  setIsSubmitting: (v: boolean) => void;
  setLatestMessage: (msg: TMessage | null) => void;
}

const Harness = ({ handleRef }: { handleRef: React.MutableRefObject<HarnessHandle | null> }) => {
  const { toggleAI, addToPending, sendPendingQueue } = useAIToggle({
    conversationId: CONV_ID,
    index: INDEX,
  });

  const setIsSubmitting = useSetRecoilState(store.isSubmittingFamily(INDEX));
  const setLatestMessage = useSetRecoilState(store.latestMessageFamily(INDEX));

  const readAiEnabled = useRecoilCallback(
    ({ snapshot }) =>
      () =>
        snapshot.getLoadable(store.aiEnabledByConversation(CONV_ID)).getValue(),
    [],
  );
  const readPendingMessages = useRecoilCallback(
    ({ snapshot }) =>
      () =>
        snapshot.getLoadable(store.pendingMessagesByConversation(CONV_ID)).getValue(),
    [],
  );
  const readQueueSubmitting = useRecoilCallback(
    ({ snapshot }) =>
      () =>
        snapshot.getLoadable(store.queueSubmittingByConversation(CONV_ID)).getValue(),
    [],
  );

  if (handleRef.current == null) {
    handleRef.current = {
      toggleAI,
      addToPending,
      sendPendingQueue,
      readAiEnabled,
      readPendingMessages,
      readQueueSubmitting,
      setIsSubmitting,
      setLatestMessage,
    };
  }
  return null;
};

const renderHarness = (initialState?: {
  aiEnabled?: boolean;
  pendingMessages?: string[];
  isSubmitting?: boolean;
}) => {
  const initializeState = (snapshot: MutableSnapshot) => {
    if (initialState?.aiEnabled !== undefined) {
      snapshot.set(store.aiEnabledByConversation(CONV_ID), initialState.aiEnabled);
    }
    if (initialState?.pendingMessages !== undefined) {
      snapshot.set(store.pendingMessagesByConversation(CONV_ID), initialState.pendingMessages);
    }
    if (initialState?.isSubmitting !== undefined) {
      snapshot.set(store.isSubmittingFamily(INDEX), initialState.isSubmitting);
    }
  };

  const handleRef: React.MutableRefObject<HarnessHandle | null> = { current: null };
  render(
    <RecoilRoot initializeState={initializeState}>
      <Harness handleRef={handleRef} />
    </RecoilRoot>,
  );
  if (!handleRef.current) {
    throw new Error('Harness did not attach handle');
  }
  return handleRef.current;
};

beforeEach(() => {
  mockAsk.mockClear();
  localStorage.clear();
});

describe('useAIToggle — toggleAI', () => {
  it('starts with AI enabled by default', () => {
    const h = renderHarness();
    expect(h.readAiEnabled()).toBe(true);
  });

  it('toggles from true to false', () => {
    const h = renderHarness();
    act(() => h.toggleAI());
    expect(h.readAiEnabled()).toBe(false);
  });

  it('toggles from false back to true', () => {
    const h = renderHarness({ aiEnabled: false });
    act(() => h.toggleAI());
    expect(h.readAiEnabled()).toBe(true);
  });
});

describe('useAIToggle — addToPending', () => {
  it('adds a message to the pending queue', () => {
    const h = renderHarness();
    act(() => h.addToPending('hello'));
    expect(h.readPendingMessages()).toEqual(['hello']);
  });

  it('accumulates multiple messages in order', () => {
    const h = renderHarness();
    act(() => h.addToPending('first'));
    act(() => h.addToPending('second'));
    act(() => h.addToPending('third'));
    expect(h.readPendingMessages()).toEqual(['first', 'second', 'third']);
  });
});

describe('useAIToggle — sendPendingQueue', () => {
  it('does nothing when queue is empty', () => {
    const h = renderHarness();
    act(() => h.sendPendingQueue());
    expect(mockAsk).not.toHaveBeenCalled();
  });

  it('calls ask with single message text directly', () => {
    const h = renderHarness({ pendingMessages: ['only message'] });
    act(() => h.sendPendingQueue());
    expect(mockAsk).toHaveBeenCalledWith({ text: 'only message' });
  });

  it('calls ask with combined format for multiple messages', () => {
    const h = renderHarness({ pendingMessages: ['msg A', 'msg B'] });
    act(() => h.sendPendingQueue());
    expect(mockAsk).toHaveBeenCalledTimes(1);
    const { text } = mockAsk.mock.calls[0][0] as { text: string };
    expect(text).toContain('2 messages');
    expect(text).toContain('[1] msg A');
    expect(text).toContain('[2] msg B');
  });

  it('sets queueSubmitting to true when dispatching', () => {
    const h = renderHarness({ pendingMessages: ['hi'] });
    act(() => h.sendPendingQueue());
    expect(h.readQueueSubmitting()).toBe(true);
  });

  it('does nothing when already submitting', () => {
    const h = renderHarness({ pendingMessages: ['hi'], isSubmitting: true });
    act(() => h.sendPendingQueue());
    expect(mockAsk).not.toHaveBeenCalled();
  });
});

describe('useAIToggle — queue clearing after response', () => {
  it('clears pending messages after a confirmed assistant response', async () => {
    const assistantMsg = {
      messageId: 'asst-msg-1',
      isCreatedByUser: false,
    } as TMessage;

    const h = renderHarness({ pendingMessages: ['queued msg'] });

    act(() => h.sendPendingQueue());
    expect(h.readQueueSubmitting()).toBe(true);

    act(() => h.setIsSubmitting(true));
    act(() => {
      h.setLatestMessage(assistantMsg);
      h.setIsSubmitting(false);
    });

    expect(h.readPendingMessages()).toEqual([]);
    expect(h.readQueueSubmitting()).toBe(false);
  });

  it('does NOT clear queue when no new assistant message (abort/error)', async () => {
    const h = renderHarness({ pendingMessages: ['queued msg'] });

    act(() => h.sendPendingQueue());
    act(() => h.setIsSubmitting(true));
    act(() => h.setIsSubmitting(false));

    expect(h.readPendingMessages()).toEqual(['queued msg']);
    expect(h.readQueueSubmitting()).toBe(false);
  });
});
