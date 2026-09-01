import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePlaybackKeys } from './usePlaybackKeys';

/**
 * The focus rules here were wrong twice while building: first blanket-ignoring
 * every focusable element (which silently killed Space after touching the
 * speed slider), then matching only `event.key`.
 */

interface Handlers {
  onToggle: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
}

function Harness({ handlers }: { handlers: Handlers }) {
  usePlaybackKeys(handlers);
  return (
    <div>
      <input data-testid="text" type="text" />
      <input data-testid="range" type="range" />
      <input data-testid="number" type="number" />
      <button data-testid="button">Play</button>
      <textarea data-testid="area" />
      <select data-testid="select">
        <option>a</option>
      </select>
    </div>
  );
}

function setup() {
  const handlers: Handlers = {
    onToggle: vi.fn(),
    onStepBack: vi.fn(),
    onStepForward: vi.fn(),
  };
  const view = render(<Harness handlers={handlers} />);
  return { handlers, view };
}

afterEach(cleanup);

describe('usePlaybackKeys', () => {
  it('toggles on Space and steps on the arrow keys', () => {
    const { handlers } = setup();

    fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft' });

    expect(handlers.onToggle).toHaveBeenCalledTimes(1);
    expect(handlers.onStepForward).toHaveBeenCalledTimes(1);
    expect(handlers.onStepBack).toHaveBeenCalledTimes(1);
  });

  it('recognises Space from the physical code alone', () => {
    const { handlers } = setup();
    // Some drivers send the code without a printable key.
    fireEvent.keyDown(document, { key: 'Unidentified', code: 'Space' });
    expect(handlers.onToggle).toHaveBeenCalledTimes(1);
  });

  it.each(['text', 'number', 'area', 'select'])(
    'ignores every shortcut while typing in %s',
    (id) => {
      const { handlers, view } = setup();
      const target = view.getByTestId(id);

      fireEvent.keyDown(target, { key: ' ', code: 'Space' });
      fireEvent.keyDown(target, { key: 'ArrowRight', code: 'ArrowRight' });

      expect(handlers.onToggle).not.toHaveBeenCalled();
      expect(handlers.onStepForward).not.toHaveBeenCalled();
    },
  );

  it('leaves arrows to a focused range slider but still takes Space', () => {
    const { handlers, view } = setup();
    const range = view.getByTestId('range');

    // Arrows adjust the slider natively — do not hijack them.
    fireEvent.keyDown(range, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(handlers.onStepForward).not.toHaveBeenCalled();

    // Space does nothing on a range input, so playback may claim it. This is
    // the case that broke: after dragging speed, Space stopped working.
    fireEvent.keyDown(range, { key: ' ', code: 'Space' });
    expect(handlers.onToggle).toHaveBeenCalledTimes(1);
  });

  it('leaves Space to a focused button but still takes arrows', () => {
    const { handlers, view } = setup();
    const button = view.getByTestId('button');

    // The browser already activates the button on Space; a second toggle here
    // would cancel it out.
    fireEvent.keyDown(button, { key: ' ', code: 'Space' });
    expect(handlers.onToggle).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(handlers.onStepForward).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcuts carrying a modifier', () => {
    const { handlers } = setup();
    fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight', metaKey: true });
    expect(handlers.onToggle).not.toHaveBeenCalled();
    expect(handlers.onStepForward).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const { handlers, view } = setup();
    view.unmount();
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    expect(handlers.onToggle).not.toHaveBeenCalled();
  });
});
