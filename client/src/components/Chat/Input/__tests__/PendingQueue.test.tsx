import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import PendingQueue from '../PendingQueue';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string, ...args: string[]) => {
    if (key === 'com_ui_ai_queue_send') {
      return `Send ${args[0]} queued message(s) to AI`;
    }
    if (key === 'com_ui_ai_queue_submitting') return 'Sending to AI…';
    if (key === 'com_ui_ai_queue_files_excluded') return 'File attachments cannot be queued';
    return key;
  },
}));

const renderQueue = (props: Partial<React.ComponentProps<typeof PendingQueue>> = {}) =>
  render(
    <PendingQueue
      pendingMessages={[]}
      queueSubmitting={false}
      hasFiles={false}
      onSend={jest.fn()}
      {...props}
    />,
  );

describe('PendingQueue — visibility', () => {
  it('renders nothing when pendingMessages is empty', () => {
    const { container } = renderQueue({ pendingMessages: [] });
    expect(container.firstChild).toBeNull();
  });

  it('renders when there are pending messages', () => {
    renderQueue({ pendingMessages: ['hello'] });
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('shows the correct message count', () => {
    renderQueue({ pendingMessages: ['a', 'b', 'c'] });
    expect(screen.getByText(/Send 3 queued/)).toBeInTheDocument();
  });
});

describe('PendingQueue — expand/collapse', () => {
  it('does not show message list by default (collapsed)', () => {
    renderQueue({ pendingMessages: ['hello world'] });
    expect(screen.queryByText('hello world')).not.toBeInTheDocument();
  });

  it('shows messages after clicking the expand button', () => {
    renderQueue({ pendingMessages: ['message one', 'message two'] });
    fireEvent.click(screen.getByRole('button', { name: /Send 2 queued/i }));
    expect(screen.getByText('message one')).toBeInTheDocument();
    expect(screen.getByText('message two')).toBeInTheDocument();
  });

  it('collapses again after a second click', () => {
    renderQueue({ pendingMessages: ['hello'] });
    const expandBtn = screen.getByRole('button', { name: /Send 1 queued/i });
    fireEvent.click(expandBtn);
    expect(screen.getByText('hello')).toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(screen.queryByText('hello')).not.toBeInTheDocument();
  });
});

describe('PendingQueue — send button', () => {
  it('calls onSend when the send button is clicked', () => {
    const onSend = jest.fn();
    renderQueue({ pendingMessages: ['hi'], onSend });
    fireEvent.click(screen.getByRole('button', { name: /▶ Send/i }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('disables send button when queueSubmitting is true', () => {
    renderQueue({ pendingMessages: ['hi'], queueSubmitting: true });
    const sendBtn = screen.getByRole('button', { name: /Sending to AI/i });
    expect(sendBtn).toBeDisabled();
  });

  it('shows submitting label when queueSubmitting is true', () => {
    renderQueue({ pendingMessages: ['hi'], queueSubmitting: true });
    expect(screen.getByText('Sending to AI…')).toBeInTheDocument();
  });
});

describe('PendingQueue — file warning', () => {
  it('shows files warning when hasFiles and expanded', () => {
    renderQueue({ pendingMessages: ['hi'], hasFiles: true });
    fireEvent.click(screen.getByRole('button', { name: /Send 1 queued/i }));
    expect(screen.getByText(/File attachments cannot be queued/)).toBeInTheDocument();
  });

  it('does not show file warning when hasFiles is false', () => {
    renderQueue({ pendingMessages: ['hi'], hasFiles: false });
    fireEvent.click(screen.getByRole('button', { name: /Send 1 queued/i }));
    expect(screen.queryByText(/File attachments/)).not.toBeInTheDocument();
  });
});
