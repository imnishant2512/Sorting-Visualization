import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// monaco-editor's `exports` map rewrites "./*" to "./esm/vs/*.js", so the
// worker entry points are addressed without the esm/vs prefix.
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

/*
 * `@monaco-editor/react` defaults to fetching the editor from
 * cdn.jsdelivr.net at runtime. That leaves the deployed app broken offline,
 * broken behind a strict CSP, and pinned to a *different* Monaco version than
 * the one in package-lock (the CDN default was 0.55.1 against 0.56.0 installed).
 *
 * Pointing the loader at the bundled copy makes the build self-contained. The
 * weight is paid for by lazy-loading this whole domain in the router, so the
 * editor is only downloaded when someone actually opens /ide.
 */
declare global {
  var MonacoEnvironment: monaco.Environment | undefined;
}

globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    // JavaScript is the only language we hand to the richer TypeScript worker;
    // the rest just need tokenization, which the core editor worker provides.
    if (label === 'typescript' || label === 'javascript') return new tsWorker();
    return new editorWorker();
  },
};

loader.config({ monaco });

// The CDN loader this replaces published the instance globally, and Monaco's
// own tooling expects to find it there. Keeping it means devtools behave the
// same way against a bundled build.
(globalThis as unknown as { monaco: typeof monaco }).monaco = monaco;
