import { Suspense, lazy } from 'react';

/*
 * Monaco is several times the size of the entire rest of the app, so the IDE
 * is code-split: every visualizer page stays in the main bundle and the editor
 * is fetched only when someone opens /ide.
 *
 * It lives in its own file so `routes.tsx` keeps exporting nothing but the
 * router, and this file exports nothing but a component — which is what Fast
 * Refresh needs to reload either one cleanly.
 */
const IDEPage = lazy(() => import('../domains/ide'));

export function LazyIDE() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading the editor…</p>}>
      <IDEPage />
    </Suspense>
  );
}
