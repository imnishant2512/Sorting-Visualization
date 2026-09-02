export interface ExecutionResult {
  stdout: string;
  stderr: string;
  error?: string;
  executionTimeMs?: number;
}

export async function executeJavaScript(code: string, stdin: string): Promise<ExecutionResult> {
  const start = performance.now();
  const logs: string[] = [];
  const errors: string[] = [];
  
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' '));
  console.error = (...args: unknown[]) => errors.push(args.map(a => String(a)).join(' '));
  console.warn = (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' '));

  const requireMock = (moduleName: string) => {
    if (moduleName === 'fs') {
      return {
        readFileSync: (path: string) => {
          if (path === '/dev/stdin' || path === '0') return stdin;
          return '';
        }
      };
    }
    return {};
  };

  try {
    const fn = new Function('require', 'console', code);
    fn(requireMock, console);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.toString() : String(err));
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  const end = performance.now();

  return {
    stdout: logs.join('\n'),
    stderr: errors.join('\n'),
    executionTimeMs: Math.round(end - start)
  };
}
