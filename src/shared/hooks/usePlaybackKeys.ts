import { useEffect, useRef } from 'react';

export interface PlaybackKeyHandlers {
  onToggle(): void;
  onStepBack(): void;
  onStepForward(): void;
}

const TEXT_INPUT_TYPES = new Set([
  'text',
  'number',
  'search',
  'email',
  'password',
  'tel',
  'url',
  'date',
]);

/**
 * What the focused element already does with these keys.
 *
 * A blanket "ignore anything focusable" rule is too blunt: after dragging the
 * speed slider, focus sits on a range input, and Space would stop working even
 * though a range input does nothing with it.
 */
type FocusKind =
  /** Typing target — leave every shortcut alone. */
  | 'text'
  /** Native Space activation; arrows are free. */
  | 'button'
  /** Native arrow adjustment; Space is free. */
  | 'stepper'
  | 'none';

function focusKind(target: EventTarget | null): FocusKind {
  if (!(target instanceof HTMLElement)) return 'none';
  if (target.isContentEditable) return 'text';

  switch (target.tagName) {
    case 'TEXTAREA':
    case 'SELECT':
      return 'text';
    case 'BUTTON':
      return 'button';
    case 'A':
      return 'button';
    case 'INPUT': {
      const type = (target as HTMLInputElement).type;
      if (TEXT_INPUT_TYPES.has(type)) return 'text';
      if (type === 'range') return 'stepper';
      // Checkboxes and radios toggle on Space.
      return 'button';
    }
    default:
      return 'none';
  }
}

/**
 * Space toggles play/pause, arrow keys step. Bound at the document so it works
 * without having to click into the page first.
 */
export function usePlaybackKeys(handlers: PlaybackKeyHandlers) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const kind = focusKind(event.target);
      if (kind === 'text') return;

      // `code` as well as `key`: older engines report "Spacebar", and some
      // automation drivers send the physical code without a printable key.
      const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';
      const isLeft = event.key === 'ArrowLeft' || event.code === 'ArrowLeft';
      const isRight = event.key === 'ArrowRight' || event.code === 'ArrowRight';
      const isArrow = isLeft || isRight;

      // Don't fight the focused control over the key it already owns.
      if (isSpace && kind === 'button') return;
      if (isArrow && kind === 'stepper') return;

      if (isSpace) {
        // Space would otherwise scroll the page.
        event.preventDefault();
        ref.current.onToggle();
      } else if (isArrow) {
        event.preventDefault();
        if (isLeft) ref.current.onStepBack();
        else ref.current.onStepForward();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
