import { useEffect, useState, useRef } from 'react';
import './App.css';
import DocRenderer, { buildSegments } from './components/docRenderer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCode, faGear } from '@fortawesome/free-solid-svg-icons';

declare global {
  interface Window {
    vscodeApi?: { postMessage: (message: any) => void };
    acquireVsCodeApi?: () => any;
  }
}

if (typeof window.acquireVsCodeApi !== 'undefined' && !window.vscodeApi) {
  window.vscodeApi = window.acquireVsCodeApi();
}

function App() {
  const [filePath, setFilePath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [isDark, setIsDark] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.vscodeApi?.postMessage({ type: 'requestFile' });
  }, []);

  const handleHelp = () => {
    setDropdownOpen(false);
    window.vscodeApi?.postMessage({
      type: 'open-link',
      url: 'https://marketplace.visualstudio.com/items?itemName=Explicode.explicode',
    });
  };

  const handleOpenFileClick = () => {
    setDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileText(text);
      setFileName(file.name);
      setFilePath(file.name);
      setLanguage(getLanguageFromFilePath(file.name));
      setResolvedImages({});
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'fileData') {
        const fp = message.filePath || '';
        setFilePath(fp);
        setFileText(message.fileText || '');
        setFileName(fp.split(/[/\\]/).pop() || '');
        setLanguage(getLanguageFromFilePath(fp));
        setResolvedImages(message.images || {});
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExportHTML = () => {
    setDropdownOpen(false);
    const contentEl = document.querySelector('.doc-content');
    if (!contentEl) return;

    const themeClass = isDark ? 'ghmd-dark' : 'ghmd-light';
    const contentHTML = contentEl.innerHTML;

    const allCSS = Array.from(document.styleSheets)
      .flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules).map(r => r.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');

    const fullHTML = `<!DOCTYPE html>
<html class="${themeClass}">
<head>
  <meta charset="utf-8" />
  <title>${fileName}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    ${allCSS}
    body { margin: 0; padding: 20px; background: var(--gh-canvas); color: var(--gh-fg); }
  </style>
</head>
<body class="${themeClass}">
  <div class="doc-content" style="position:static; overflow:visible;">
    ${contentHTML}
  </div>
</body>
</html>`;

    if (window.vscodeApi) {
      window.vscodeApi.postMessage({
        type: 'save-file',
        content: fullHTML,
        fileName: fileName.replace(/\.[^/.]+$/, '') + '.html',
        fileType: 'html',
      });
    } else {
      const blob = new Blob([fullHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, '') + '.html';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleExportMarkdown = () => {
    setDropdownOpen(false);
    const segments = buildSegments(fileText, language);
    const markdownContent = segments
      .map(seg =>
        seg.type === 'doc'
          ? seg.content
          : '```' + language + '\n' + seg.content + '\n```'
      )
      .join('\n\n');

    if (window.vscodeApi) {
      window.vscodeApi.postMessage({
        type: 'save-file',
        content: markdownContent,
        fileName: fileName.replace(/\.[^/.]+$/, '') + '.md',
        fileType: 'markdown',
      });
    } else {
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.[^/.]+$/, '') + '.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  function getLanguageFromFilePath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: { [key: string]: string } = {
      md: 'markdown', mdx: 'markdown',
      py: 'python',
      js: 'javascript', ts: 'typescript',
      jsx: 'javascriptreact', tsx: 'typescriptreact',
      java: 'java',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', hxx: 'cpp',
      c: 'c', h: 'c',
      cu: 'cuda', cuh: 'cuda',
      cs: 'csharp',
      rs: 'rust',
      go: 'go',
      swift: 'swift',
      kt: 'kotlin', kts: 'kotlin',
      dart: 'dart',
      php: 'php',
      scala: 'scala', sbt: 'scala',
      sql: 'sql',
    };
    return langMap[ext || ''] || 'plaintext';
  }

  const isMarkdown = language === 'markdown';

  return (
    <div className={`app-container ${isDark ? 'ghmd-dark' : 'ghmd-light'}`}>
      <header className="app-header">
        <div className="header-left">
          {!filePath && <span className="title">Explicode</span>}
          {filePath && <span className="file-badge">{fileName}</span>}
        </div>
        <div className="header-right" ref={dropdownRef}>
          <FontAwesomeIcon className="settings-icon" icon={faGear} onClick={() => setDropdownOpen(prev => !prev)} />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".md,.mdx,.py,.js,.ts,.jsx,.tsx,.java,.cpp,.cc,.cxx,.hpp,.hxx,.c,.h,.cu,.cuh,.cs,.rs,.go,.php,.swift,.kt,.kts,.dart,.sql"
            onChange={handleFileSelected}
          />
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button onClick={() => { setIsDark(prev => !prev); setDropdownOpen(false); }}>
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
              <button onClick={handleHelp}>Guide</button>
              <button onClick={handleOpenFileClick}>Open file</button>
              {filePath && !isMarkdown && (
                <>
                  <button onClick={handleExportMarkdown}>Export as Markdown</button>
                  <button onClick={handleExportHTML}>Export as HTML</button>
                </>
              )}
              {filePath && isMarkdown && (
                <button onClick={handleExportHTML}>Export as HTML</button>
              )}
            </div>
          )}
        </div>
      </header>

      {!filePath && (
        <>
          <div className="empty-icon"><FontAwesomeIcon icon={faFileCode} /></div>
          <p className="empty-title">No file found</p>
          <p className="empty-subtitle">Open a script in VS Code</p>
        </>
      )}

      {filePath && (
        <div className="doc-content">
          <DocRenderer
            fileText={fileText}
            language={language}
            theme={isDark ? 'dark' : 'light'}
            resolvedImages={resolvedImages}
          />
        </div>
      )}

    </div>
  );
}

export default App;