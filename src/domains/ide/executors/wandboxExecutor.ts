import { ExecutionResult } from './browserExecutor';

export async function executeWandbox(code: string, compiler: string, stdin: string): Promise<ExecutionResult> {
  const start = performance.now();
  
  try {
    const response = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        compiler,
        stdin,
        save: false
      })
    });

    if (!response.ok) {
      throw new Error(`Wandbox API error: ${response.statusText}`);
    }

    const data = await response.json();
    const end = performance.now();

    return {
      stdout: data.program_output || '',
      stderr: data.program_error || data.compiler_error || '',
      error: data.status !== '0' ? 'Execution failed' : undefined,
      executionTimeMs: Math.round(end - start)
    };
  } catch (err: unknown) {
    const end = performance.now();
    return {
      stdout: '',
      stderr: '',
      error: err instanceof Error ? err.message : String(err),
      executionTimeMs: Math.round(end - start)
    };
  }
}

export async function executePyodide(code: string, stdin: string): Promise<ExecutionResult> {
  // Stub for Pyodide, falling back to Wandbox for now
  const res = await executeWandbox(code, 'cpython-head', stdin);
  if (res.stderr) {
    res.stderr = "Python support via Pyodide is loading... Falling back to Wandbox.\n" + res.stderr;
  } else if (!res.stdout) {
     res.stderr = "Python support via Pyodide is loading... Falling back to Wandbox.\n";
  }
  return res;
}
