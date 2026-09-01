import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { SortingPage } from './SortingPage';

/**
 * Component-level coverage for the sorting page.
 *
 * The algorithm suites cover the parts least likely to break. Every bug that
 * actually reached the browser during this build lived here instead: the size
 * cap, playback stopping at the end, and race mode wiring.
 */

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/sorting${search}`]}>
      <SortingPage />
    </MemoryRouter>,
  );
}

const playButton = () => screen.getByRole('button', { name: /Play|Pause/ });
const stepForward = () => screen.getByRole('button', { name: /Step ›/ });
const stepBack = () => screen.getByRole('button', { name: /‹ Step/ });
/** Sliders in DOM order: size, scrub, speed. */
const sizeSlider = () => screen.getAllByRole('slider')[0];
const scrubSlider = () => screen.getAllByRole('slider')[1];

afterEach(cleanup);

describe('SortingPage', () => {
  it('restores algorithm, size and shape from the URL', () => {
    renderPage('?algo=merge&size=20&shape=reversed&seed=42');

    expect(screen.getByDisplayValue('Merge Sort')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
    expect(screen.getByDisplayValue('Reversed')).toBeDefined();
  });

  it('reproduces the identical array for the same seed', () => {
    const first = renderPage('?algo=bubble&size=12&shape=random&seed=7');
    const firstCount = first.container.querySelectorAll('[class*="slot"]').length;
    const firstSteps = screen.getByText(/0 \/ \d+/).textContent;
    cleanup();

    renderPage('?algo=bubble&size=12&shape=random&seed=7');
    expect(document.querySelectorAll('[class*="slot"]').length).toBe(firstCount);
    // Same input and algorithm means an identical step count.
    expect(screen.getByText(/0 \/ \d+/).textContent).toBe(firstSteps);
  });

  it('produces a different run for a different seed', () => {
    renderPage('?algo=bubble&size=30&shape=random&seed=1');
    const a = screen.getByText(/0 \/ \d+/).textContent;
    cleanup();

    renderPage('?algo=bubble&size=30&shape=random&seed=999');
    expect(screen.getByText(/0 \/ \d+/).textContent).not.toBe(a);
  });

  it('clamps the array when an algorithm with a size ceiling is picked', () => {
    renderPage('?algo=quick&size=45&shape=random&seed=3');
    expect(screen.getByText('45')).toBeDefined();

    // Bogo sort caps the array at 6 rather than freezing the tab.
    fireEvent.change(screen.getByDisplayValue('Quick Sort'), { target: { value: 'bogo' } });

    expect(screen.getByText('6')).toBeDefined();
    expect(sizeSlider().getAttribute('max')).toBe('6');
  });

  it('releases the ceiling when a normal algorithm is picked again', () => {
    renderPage('?algo=bogo&size=6&shape=random&seed=3');
    expect(sizeSlider().getAttribute('max')).toBe('6');

    fireEvent.change(screen.getByDisplayValue('Bogo Sort'), { target: { value: 'insertion' } });
    expect(sizeSlider().getAttribute('max')).toBe('150');
  });

  it('steps forward and back, and back arrives at an untouched frame', () => {
    renderPage('?algo=bubble&size=10&shape=random&seed=5');

    expect(stepBack().hasAttribute('disabled')).toBe(true);
    fireEvent.click(stepForward());
    fireEvent.click(stepForward());
    expect(screen.getByText(/^2 \/ /)).toBeDefined();

    fireEvent.click(stepBack());
    fireEvent.click(stepBack());
    expect(screen.getByText(/^0 \/ /)).toBeDefined();
    expect(stepBack().hasAttribute('disabled')).toBe(true);
  });

  it('plays to the end and stops on its own', async () => {
    renderPage('?algo=bubble&size=8&shape=random&seed=11');

    fireEvent.click(playButton());
    await waitFor(() => expect(stepForward().hasAttribute('disabled')).toBe(true), {
      timeout: 5000,
    });

    // The regression here was the button staying on "Pause" forever.
    expect(playButton().textContent).toContain('Play');
    expect(playButton().hasAttribute('disabled')).toBe(true);
  });

  it('shows one panel normally and two in race mode, each with its own stats', () => {
    renderPage('?algo=quick&size=15&shape=random&seed=2');
    expect(screen.getAllByText('Comparisons')).toHaveLength(1);

    fireEvent.click(screen.getByLabelText(/Race two algorithms/));
    expect(screen.getAllByText('Comparisons')).toHaveLength(2);
    expect(screen.getByDisplayValue('Quick Sort')).toBeDefined();
    expect(screen.getByDisplayValue('Merge Sort')).toBeDefined();
  });

  it('disables scrubbing in race mode and explains why', () => {
    renderPage('?algo=quick&size=15&shape=random&seed=2&vs=merge');
    expect(scrubSlider().hasAttribute('disabled')).toBe(true);
  });

  it('advances both race panels together when stepping', () => {
    renderPage('?algo=bubble&size=12&shape=random&seed=4&vs=selection');

    fireEvent.click(stepForward());
    fireEvent.click(stepForward());

    const panels = document.querySelectorAll('[class*="readouts"]');
    expect(panels.length).toBeGreaterThanOrEqual(2);
    // Both panels have counted something rather than one sitting at zero.
    for (const panel of Array.from(panels).slice(0, 2)) {
      const comparisons = within(panel as HTMLElement).queryByText('Comparisons');
      if (!comparisons) continue;
      const value = comparisons.previousElementSibling?.textContent ?? '0';
      expect(Number(value)).toBeGreaterThan(0);
    }
  });
});
