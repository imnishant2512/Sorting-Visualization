import { useState } from 'react';
import Editor from '@monaco-editor/react';
import css from './IDEPage.module.css';

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', version: '18.15.0', template: 'console.log("Hello, World!");' },
  { id: 'python', name: 'Python', version: '3.10.0', template: 'print("Hello, World!")' },
  { id: 'java', name: 'Java', version: '15.0.2', template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}' },
  { id: 'c++', name: 'C++', version: '10.2.0', template: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}' },
  { id: 'go', name: 'Go', version: '1.16.2', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello, World!")\n}' },
  { id: 'rust', name: 'Rust', version: '1.68.2', template: 'fn main() {\n  println!("Hello, World!");\n}' },
];

export function IDEPage() {
  const [langIndex, setLangIndex] = useState(0);
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const currentLang = LANGUAGES[langIndex];

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    setLangIndex(idx);
    setCode(LANGUAGES[idx].template);
    setOutput('');
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');
    setIsError(false);

    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: currentLang.id,
          version: currentLang.version,
          files: [{ content: code }],
        }),
      });

      const data = await response.json();
      
      if (data.message) {
        setOutput(data.message);
        setIsError(true);
      } else {
        const runRes = data.run || {};
        setOutput(runRes.output || runRes.stdout || runRes.stderr || 'No output.');
        setIsError(runRes.code !== 0);
      }
    } catch (err) {
      setOutput('Failed to execute code. Please check your network connection.');
      setIsError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const getMonacoLanguage = (id: string) => {
    if (id === 'c++') return 'cpp';
    return id;
  };

  return (
    <div className={css.container}>
      <div className={css.toolbar}>
        <select className={css.select} value={langIndex} onChange={handleLangChange}>
          {LANGUAGES.map((lang, idx) => (
            <option key={lang.id} value={idx}>
              {lang.name}
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
          <div className={css.header}>Editor</div>
          <Editor
            height="100%"
            language={getMonacoLanguage(currentLang.id)}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              padding: { top: 16 },
            }}
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
  );
}
