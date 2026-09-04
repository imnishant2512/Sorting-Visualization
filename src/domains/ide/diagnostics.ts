export interface Diagnostic {
  line: number;
  column: number;
  message: string;
}

/**
 * Pulls file positions out of compiler output so they can be shown as squiggles
 * in the editor.
 *
 * Every toolchain reports positions differently, so this recognises four shapes
 * rather than the single `:line:col:` regex it replaces — that one matched gcc
 * and nothing else, which meant Java, Rust and Python errors were never marked.
 */
export function parseDiagnostics(stderr: string): Diagnostic[] {
  const lines = stderr.split('\n');
  const found: Diagnostic[] = [];

  lines.forEach((raw, index) => {
    // gcc / clang / go: main.cpp:5:10: error: message
    let match = raw.match(/^\s*[-\w./\\]+:(\d+):(\d+):\s*(?:fatal\s+)?(?:error|warning):\s*(.+)$/i);
    if (match) {
      found.push({ line: Number(match[1]), column: Number(match[2]), message: match[3].trim() });
      return;
    }

    // javac: Main.java:5: error: message   (no column)
    match = raw.match(/^\s*[-\w./\\]+:(\d+):\s*(?:error|warning):\s*(.+)$/i);
    if (match) {
      found.push({ line: Number(match[1]), column: 1, message: match[2].trim() });
      return;
    }

    // rustc puts the position on its own line, under the message.
    match = raw.match(/^\s*-->\s*[-\w./\\]+:(\d+):(\d+)/);
    if (match) {
      const message = lines
        .slice(0, index)
        .reverse()
        .find((line) => /^(error|warning)/i.test(line.trim()));
      found.push({
        line: Number(match[1]),
        column: Number(match[2]),
        message: (message ?? raw).trim(),
      });
      return;
    }

    // python: File "main.py", line 5   — the exception follows the traceback.
    match = raw.match(/^\s*File "[^"]*", line (\d+)/);
    if (match) {
      const message = lines.slice(index + 1).find((line) => /^\s*\w*(Error|Exception)\b/.test(line));
      found.push({
        line: Number(match[1]),
        column: 1,
        message: (message ?? 'Error').trim(),
      });
    }
  });

  // A traceback names the same line repeatedly; one marker per line is enough.
  const seen = new Set<number>();
  return found.filter((diagnostic) => {
    if (seen.has(diagnostic.line)) return false;
    seen.add(diagnostic.line);
    return true;
  });
}
