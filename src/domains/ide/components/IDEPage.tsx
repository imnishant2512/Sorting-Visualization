import { useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { SUPPORTED_LANGUAGES, LanguageId } from '../languageConfig';
import { executeJavaScript } from '../executors/browserExecutor';
import { executeWandbox } from '../executors/wandboxExecutor';
import css from './IDEPage.module.css';

export function IDEPage() {
  const monaco = useMonaco();
  const [language, setLanguage] = useState<LanguageId>('javascript');
  const [codes, setCodes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    SUPPORTED_LANGUAGES.forEach(l => {
      initial[l.id] = l.helloWorldTemplate;
    });
    return initial;
  });

  const [stdin, setStdin] = useState("Hello");
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const currentCode = codes[language];
  const langConfig = SUPPORTED_LANGUAGES.find(l => l.id === language)!;

  const handleEditorChange = (value: string | undefined) => {
    setCodes(prev => ({ ...prev, [language]: value || '' }));
    // Clear squiggly lines when user types
    if (monaco) {
      const models = monaco.editor.getModels();
      if (models.length > 0) {
        monaco.editor.setModelMarkers(models[0], 'owner', []);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorMount = (editor: any) => {
    editor.addCommand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).monaco?.KeyMod.CtrlCmd | (window as any).monaco?.KeyCode.Enter,
      () => {
        runCode();
      }
    );
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    setIsError(false);
    
    // Clear markers
    if (monaco) {
      const models = monaco.editor.getModels();
      if (models.length > 0) {
        monaco.editor.setModelMarkers(models[0], 'owner', []);
      }
    }

    try {
      let res;
      if (language === 'javascript') {
        res = await executeJavaScript(currentCode, stdin);
      } else if (langConfig.wandboxCompiler) {
        res = await executeWandbox(currentCode, langConfig.wandboxCompiler, stdin);
      } else {
        res = { stdout: '', stderr: '', error: 'Unknown executor' };
      }
      
      const out = res.stdout + (res.stdout && res.stderr ? '\n' : '') + res.stderr;
      setOutput(res.error || out || 'No output.');
      setIsError(!!res.error || !!res.stderr);

      if (res.stderr && monaco) {
        const errorLines = res.stderr.split('\n');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markers: any[] = [];
        
        errorLines.forEach(line => {
          if (line.includes('error') || line.includes('Error')) {
            const match = line.match(/:(\d+):(\d+):/);
            if (match) {
              const lineNum = parseInt(match[1], 10);
              const colNum = parseInt(match[2], 10);
              markers.push({
                startLineNumber: lineNum,
                startColumn: colNum,
                endLineNumber: lineNum,
                endColumn: colNum + 5,
                message: line,
                severity: monaco.MarkerSeverity.Error
              });
            }
          }
        });

        if (markers.length > 0) {
          const models = monaco.editor.getModels();
          if (models.length > 0) {
            monaco.editor.setModelMarkers(models[0], 'owner', markers);
          }
        }
      }

    } catch (err: unknown) {
      setOutput(err instanceof Error ? err.message : String(err));
      setIsError(true);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={css.container}>
      <div className={css.toolbar}>
        <select 
          className={css.select} 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as LanguageId)}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
        <button 
          className={css.runBtn} 
          onClick={runCode} 
          disabled={isRunning}
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>
      
      <div className={css.workspace}>
        <div className={css.editorSection}>
          <div className={css.header}>Editor ({langConfig.label})</div>
          <Editor
            height="100%"
            language={langConfig.monacoLanguage}
            theme="vs-dark"
            value={currentCode}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 16 },
              scrollBeyondLastLine: false,
            }}
          />
        </div>
        
        <div className={css.rightPanel}>
          <div className={css.inputSection}>
            <div className={css.header}>Standard Input (stdin)</div>
            <textarea 
              className={css.inputArea} 
              value={stdin} 
              onChange={e => setStdin(e.target.value)} 
              placeholder="Custom input for stdin..."
            />
          </div>
          
          <div className={css.outputSection}>
            <div className={css.header}>Output</div>
            <pre className={css.output + (isError ? ' ' + css.error : '')}>
              {output}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
