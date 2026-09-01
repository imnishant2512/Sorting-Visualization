import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { LinearPage } from './LinearPage';

/**
 * The bug this file exists for: the page instantiates two controllers (one for
 * the array-backed structures, one for the linked list) and only the visible
 * one may play. Passing the same `playing` flag to both made the idle one
 * report itself finished and stop the clock immediately, so no operation ever
 * animated. No algorithm test could have caught it.
 */

function renderAt(variant: string) {
  return render(
    <MemoryRouter initialEntries={[`/linear/${variant}`]}>
      <Routes>
        <Route path="/linear/:variant" element={<LinearPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const playButton = () => screen.getByRole('button', { name: /Play|Pause/ });
const counter = () => screen.getByText(/\d+ \/ \d+/).textContent ?? '';

afterEach(cleanup);

describe('LinearPage', () => {
  it.each(['array', 'stack', 'queue', 'linked-list'])(
    'starts an operation and animates it on the %s tab',
    async (variant) => {
      renderAt(variant);

      // Each tab's first operation button inserts/pushes/enqueues.
      const [firstOperation] = screen.getAllByRole('button', {
        name: /Insert|Push|Enqueue/,
      });
      fireEvent.click(firstOperation);

      // The regression froze the cursor at 0 forever.
      await waitFor(() => expect(counter()).not.toMatch(/^0 \/ 0$/));
      await waitFor(() => expect(playButton().hasAttribute('disabled')).toBe(true), {
        timeout: 4000,
      });
    },
  );

  it('pushes then pops a stack, leaving the original values', async () => {
    renderAt('stack');
    expect(screen.getByText('12')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Push/ }));
    await waitFor(() => expect(screen.getByText('9')).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: /^Pop$/ }));
    await waitFor(() => expect(screen.queryByText('9')).toBeNull());
  });

  it('records committed operations in the history and undoes them', async () => {
    renderAt('stack');
    expect(screen.getByText(/No operations yet/)).toBeDefined();

    // "Push 9" also appears on the button and the pseudocode title, so scope
    // the assertion to the history panel.
    const history = () =>
      screen.getByRole('button', { name: /Undo last/ }).closest('div')!.parentElement!;

    fireEvent.click(screen.getByRole('button', { name: /Push/ }));
    await waitFor(() => expect(within(history()).getByText(/Push 9/)).toBeDefined());

    // First undo cancels the still-active operation rather than a committed one.
    fireEvent.click(screen.getByRole('button', { name: /Undo last/ }));
    await waitFor(() => expect(screen.getByText(/No operations yet/)).toBeDefined());
  });

  it('reports stack underflow instead of breaking', async () => {
    renderAt('stack');
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /^Pop$/ }));
      await waitFor(() => expect(playButton().hasAttribute('disabled')).toBe(true), {
        timeout: 4000,
      });
    }
    fireEvent.click(screen.getByRole('button', { name: /^Pop$/ }));
    await waitFor(() => expect(screen.getByText(/underflow/)).toBeDefined());
  });
});
