import { describe, expect, it, vi } from 'vitest';
import { runUserCode } from './browserExecutor';

/**
 * `runUserCode` is the body of the sandbox worker. It is tested directly
 * because jsdom has no `Worker`, and because it must stay **self-contained** —
 * `executeJavaScript` ships it to the worker via `toString()`, so a reference
 * to anything in module scope would compile cleanly and then fail at runtime.
 */
describe('runUserCode', () => {
  it('collects what the program logs', () => {
    expect(runUserCode('console.log("a"); console.log("b");', '')).toEqual({
      stdout: 'a\nb',
      stderr: '',
    });
  });

  it('routes console.error to stderr and keeps going', () => {
    const result = runUserCode('console.error("bad"); console.log("still here");', '');
    expect(result.stderr).toBe('bad');
    expect(result.stdout).toBe('still here');
  });

  it('serialises non-string values rather than printing [object Object]', () => {
    expect(runUserCode('console.log({ a: 1 }, [1, 2], 3);', '').stdout).toBe('{"a":1} [1,2] 3');
  });

  it('exposes stdin through the fs shim the template uses', () => {
    const code = 'console.log(require("fs").readFileSync("/dev/stdin", "utf-8").trim());';
    expect(runUserCode(code, ' piped ').stdout).toBe('piped');
  });

  it('reports a thrown error instead of propagating it', () => {
    const result = runUserCode('throw new TypeError("nope");', '');
    expect(result.stderr).toBe('TypeError: nope');
    expect(result.stdout).toBe('');
  });

  it('reports a syntax error in the snippet', () => {
    expect(runUserCode('function (', '').stderr).toMatch(/SyntaxError/);
  });

  it('rejects modules the sandbox does not provide', () => {
    expect(runUserCode('require("net");', '').stderr).toMatch(/Cannot find module 'net'/);
  });

  /**
   * The previous implementation monkey-patched the global console and restored
   * it in a `finally`. Passing the sandbox console as a parameter means a run
   * cannot touch the host page's console at all.
   */
  it('never touches the host console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const original = console.log;
    runUserCode('console.log("inside");', '');
    expect(console.log).toBe(original);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('has no free variables, so it survives being stringified into a worker', () => {
    // Rebuilding it from its own source is exactly what the worker does.
    const rebuilt = new Function(`return (${runUserCode.toString()})`)() as typeof runUserCode;
    expect(rebuilt('console.log(1 + 1);', '')).toEqual({ stdout: '2', stderr: '' });
  });
});
