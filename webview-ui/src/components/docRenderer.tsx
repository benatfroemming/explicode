import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

interface DocRendererProps {
  fileText: string;
  language: string;
  theme: 'dark' | 'light';
  resolvedImages: Record<string, string>;
}

// Renders an image — uses pre-resolved base64 data URI for local files,
// passes remote URLs through directly.
const ResolvedImage: React.FC<{
  src: string;
  alt: string;
  resolvedImages: Record<string, string>;
}> = ({ src, alt, resolvedImages }) => {
  const isRemote = /^https?:\/\//.test(src) || src.startsWith('data:');
  const finalSrc = isRemote ? src : resolvedImages[src];
  if (!finalSrc) return null;
  return (
    <img
      src={finalSrc}
      alt={alt}
      style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '16px auto' }}
    />
  );
};

type Segment = { type: 'doc'; content: string } | { type: 'code'; content: string };

// Languages that support /* */ or /** */ style block comments
const C_STYLE_LANGUAGES = new Set([
  'c', 'cpp', 'cuda', 'csharp', 'java', 'javascript', 'typescript',
  'javascriptreact', 'typescriptreact', 'go', 'rust', 'php',
  'swift', 'kotlin', 'scala', 'dart', 'objective-c', 'sql',
]);

export const SUPPORTED_LANGUAGES = new Set([
  ...C_STYLE_LANGUAGES,
  'python',   // """ """ or ''' '''
  'markdown', // rendered directly
]);

// Python parser — handles """ """ and ''' ''' docstrings
function parsePython(src: string): Segment[] {
  const raw: Segment[] = [];
  let i = 0;
  const n = src.length;

  function isDocContext(pos: number): boolean {
    let j = pos - 1;
    while (j >= 0 && src[j] !== '\n') {
      if (src[j] !== ' ' && src[j] !== '\t') return false;
      j--;
    }
    return true;
  }

  let codeStart = 0;

  function flushCode(end: number) {
    const chunk = src.slice(codeStart, end).trim();
    if (chunk) raw.push({ type: 'code', content: chunk });
  }

  while (i < n) {
    const ch = src[i];

    // Skip single-line strings so their content is invisible to us
    if ((ch === '"' || ch === "'") &&
        src.slice(i, i + 3) !== '"""' && src.slice(i, i + 3) !== "'''") {
      i++;
      const q = ch;
      while (i < n && src[i] !== q && src[i] !== '\n') {
        if (src[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    // Triple-quote
    if (src.slice(i, i + 3) === '"""' || src.slice(i, i + 3) === "'''") {
      const q3 = src.slice(i, i + 3);
      const isDoc = isDocContext(i);

      if (isDoc) {
        flushCode(i);
        i += 3;
        const closeIdx = src.indexOf(q3, i);
        const inner = (closeIdx === -1 ? src.slice(i) : src.slice(i, closeIdx)).trim();
        if (inner) raw.push({ type: 'doc', content: inner });
        i = closeIdx === -1 ? n : closeIdx + 3;
        codeStart = i;
      } else {
        // String value — skip over it
        i += 3;
        const closeIdx = src.indexOf(q3, i);
        i = closeIdx === -1 ? n : closeIdx + 3;
      }
      continue;
    }

    // Single-line comment — stays as code
    if (ch === '#') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    i++;
  }

  flushCode(n);
  return mergeSegments(raw);
}

// C-style parser — /* */ and /** */
function stripJsDocStars(text: string): string {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
}

function parseCStyle(src: string): Segment[] {
  const raw: Segment[] = [];
  const RE = /\/\*[\s\S]*?\*\//g;
  let cursor = 0;

  for (const match of src.matchAll(RE)) {
    const start = match.index!;
    if (start > cursor) {
      const chunk = src.slice(cursor, start).trim();
      if (chunk) raw.push({ type: 'code', content: chunk });
    }
    const inner = stripJsDocStars(match[0].replace(/^\/\*+/, '').replace(/\*+\/$/, ''));
    if (inner) raw.push({ type: 'doc', content: inner });
    cursor = start + match[0].length;
  }

  const tail = src.slice(cursor).trim();
  if (tail) raw.push({ type: 'code', content: tail });

  return mergeSegments(raw);
}

// Merge adjacent same-type segments
function mergeSegments(raw: Segment[]): Segment[] {
  return raw.reduce<Segment[]>((acc, seg) => {
    if (!seg.content.trim()) return acc;
    const last = acc[acc.length - 1];
    if (last && last.type === seg.type) {
      last.content += '\n\n' + seg.content;
    } else {
      acc.push({ ...seg });
    }
    return acc;
  }, []);
}


// Public API
export function buildSegments(fileText: string, language: string): Segment[] {
  if (language === 'markdown') return [{ type: 'doc', content: fileText }];
  if (language === 'python') return parsePython(fileText);
  if (C_STYLE_LANGUAGES.has(language)) return parseCStyle(fileText);
  return [];
}

// Component

// Map VSCode language IDs to Prism-compatible identifiers
const PRISM_LANG: Record<string, string> = {
  javascriptreact: 'jsx',
  typescriptreact: 'tsx',
  cuda:            'c',
  csharp:          'csharp',
  'objective-c':   'objectivec',
};
function toPrismLang(lang: string): string {
  return PRISM_LANG[lang] ?? lang;
}

const DocRenderer: React.FC<DocRendererProps> = ({ fileText, language, theme, resolvedImages }) => {
  const isDark = theme === 'dark';
  const themeClass = isDark ? 'ghmd-dark' : 'ghmd-light';
  const syntaxStyle = isDark ? oneDark : oneLight;
  const prismLang = toPrismLang(language);

  if (!SUPPORTED_LANGUAGES.has(language)) {
    return (
      <div className={`doc-container ${themeClass}`}>
        <div className="unsupported-language">
          <p className="unsupported-title">Language not supported</p>
          <p className="unsupported-hint">
            Supported: Python, JavaScript, TypeScript, JSX, TSX, C, C++, CUDA, C#, Java, Go,
            Rust, PHP, Swift, Kotlin, Scala, Dart, Objective-C, SQL, and Markdown.
          </p>
        </div>
      </div>
    );
  }

  const segments = buildSegments(fileText, language);

  return (
    <div className={`doc-container ${themeClass}`}>
      {segments.map((seg, idx) =>
        seg.type === 'code' ? (
          <div key={idx} className="seg-code">
            <SyntaxHighlighter
              language={prismLang}
              style={syntaxStyle}
              customStyle={{
                margin: 0,
                borderRadius: '6px',
                border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
                fontSize: '13.5px',
                lineHeight: '1.5',
              }}
            >
              {seg.content}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div key={idx} className={`seg-doc ghmd ${themeClass}`}>
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img({ src, alt }) {
                  return (
                    <ResolvedImage
                      src={src ?? ''}
                      alt={alt ?? ''}
                      resolvedImages={resolvedImages}
                    />
                  );
                },
                code({ className, children }) {
                  const match = /language-(\w+)/.exec(className ?? '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        language={match[1]}
                        style={syntaxStyle}
                        customStyle={{ borderRadius: '6px', fontSize: '13px', margin: '12px 0' }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    );
                  }
                  return <code className="ghmd-inline-code">{children}</code>;
                },
              }}
            >
              {seg.content}
            </ReactMarkdown>
          </div>
        )
      )}
    </div>
  );
};

export default DocRenderer;