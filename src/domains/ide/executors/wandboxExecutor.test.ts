import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeWandbox } from './wandboxExecutor';

function respond(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? 'OK' : 'Service Unavailable',
    json: async () => body,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('executeWandbox', () => {
  it('returns program output on a clean run', async () => {
    vi.stubGlobal('fetch', respond({ status: '0', program_output: 'Hello, World!\n' }));

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.stdout).toBe('Hello, World!');
    expect(result.stderr).toBe('');
    expect(result.error).toBeUndefined();
    expect(result.exitCode).toBe(0);
  });

  /**
   * The regression this file exists for. The old executor set
   * `error: 'Execution failed'` whenever `status !== '0'`, and the page renders
   * `error` in preference to everything else — so a failed compile showed two
   * useless words and threw away the diagnostic explaining the failure.
   *
   * A program that fails to compile is a *result*, not a transport error.
   */
  it('keeps the compiler diagnostic when the build fails', async () => {
    vi.stubGlobal(
      'fetch',
      respond({ status: '1', compiler_error: "prog.cc:3:5: error: 'x' was not declared" }),
    );

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.stderr).toContain("'x' was not declared");
    expect(result.exitCode).toBe(1);
    expect(result.error).toBeUndefined();
  });

  it('keeps runtime output produced before a non-zero exit', async () => {
    vi.stubGlobal(
      'fetch',
      respond({ status: '134', program_output: 'partial\n', program_error: 'Aborted' }),
    );

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.stdout).toBe('partial');
    expect(result.stderr).toBe('Aborted');
    expect(result.exitCode).toBe(134);
  });

  it('sends the code, compiler and stdin, and does not save a snippet', async () => {
    const fetchMock = respond({ status: '0', program_output: 'ok' });
    vi.stubGlobal('fetch', fetchMock);

    await executeWandbox('int main(){}', 'gcc-head', 'input text');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      code: 'int main(){}',
      compiler: 'gcc-head',
      stdin: 'input text',
      save: false,
    });
  });

  it('reports an HTTP failure as an error, not as program output', async () => {
    vi.stubGlobal('fetch', respond({}, false, 503));

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.error).toMatch(/503/);
    expect(result.stdout).toBe('');
  });

  it('reports an unreachable service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.error).toMatch(/Could not reach wandbox.org/);
  });

  it('reports an abort as a timeout rather than a generic failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError')),
    );

    const result = await executeWandbox('...', 'gcc-head', '');
    expect(result.error).toMatch(/Timed out/);
  });
});
