import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import AIToggle from '../AIToggle';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

const renderToggle = (props: Partial<React.ComponentProps<typeof AIToggle>> = {}) =>
  render(
    <AIToggle aiEnabled={true} pendingCount={0} onToggle={jest.fn()} {...props} />,
  );

describe('AIToggle — visual state', () => {
  it('has green styling when AI is enabled', () => {
    renderToggle({ aiEnabled: true });
    const btn = screen.getByTestId('ai-toggle-button');
    expect(btn.className).toMatch(/green/);
  });

  it('has amber styling when AI is disabled', () => {
    renderToggle({ aiEnabled: false });
    const btn = screen.getByTestId('ai-toggle-button');
    expect(btn.className).toMatch(/amber/);
  });

  it('sets aria-pressed=true when AI is enabled', () => {
    renderToggle({ aiEnabled: true });
    expect(screen.getByTestId('ai-toggle-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets aria-pressed=false when AI is disabled', () => {
    renderToggle({ aiEnabled: false });
    expect(screen.getByTestId('ai-toggle-button')).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('AIToggle — interaction', () => {
  it('calls onToggle when clicked', () => {
    const onToggle = jest.fn();
    renderToggle({ onToggle });
    fireEvent.click(screen.getByTestId('ai-toggle-button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle on each click', () => {
    const onToggle = jest.fn();
    renderToggle({ onToggle });
    const btn = screen.getByTestId('ai-toggle-button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});

describe('AIToggle — pending badge', () => {
  it('shows no badge when AI is enabled (even with pending messages)', () => {
    renderToggle({ aiEnabled: true, pendingCount: 5 });
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('shows no badge when AI is disabled but count is 0', () => {
    renderToggle({ aiEnabled: false, pendingCount: 0 });
    // Badge only renders when pendingCount > 0 — no numeric text should appear
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    // The button should only contain "AI" text and the status dot
    expect(screen.getByTestId('ai-toggle-button').querySelectorAll('span')).toHaveLength(2);
  });

  it('shows count badge when AI is disabled and pendingCount > 0', () => {
    renderToggle({ aiEnabled: false, pendingCount: 3 });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows "9+" when pendingCount exceeds 9', () => {
    renderToggle({ aiEnabled: false, pendingCount: 15 });
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows "9" when pendingCount is exactly 9', () => {
    renderToggle({ aiEnabled: false, pendingCount: 9 });
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});
