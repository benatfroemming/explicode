// webview-ui/src/components/docRenderer.tsx
import { useEffect, useRef, useMemo } from 'react';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';

declare global {
  interface Window {
    vscodeApi?: { postMessage: (message: any) => void };
  }
}

interface DocRendererProps {
  fileText: string;
  language: string;
  theme: 'dark' | 'light';
  resolvedImages: Record<string, string>;
}

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

// Mermaid lives outside ReactMarkdown so it never gets unmounted on rerender
const MermaidBlock: React.FC<{ code: string; isDark: boolean }> = React.memo(({ code, isDark }) => {
  const ref = useRef<HTMLDivElement>(null);
  const lastCode = useRef<string>('');
  const lastDark = useRef<boolean | null>(null);

  useEffect(() => {
    if (code === lastCode.current && isDark === lastDark.current) return;
    lastCode.current = code;
    lastDark.current = isDark;

    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default' });
    if (ref.current) {
      const id = 'mermaid-' + Math.random().toString(36).slice(2);
      mermaid.render(id, code).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      }).catch(() => {
        if (ref.current) ref.current.innerHTML = '<p style="color:red">Mermaid parse error</p>';
      });
    }
  }, [code, isDark]);

  return <div ref={ref} style={{ margin: '16px 0', textAlign: 'center' }} />;
}, (prev, next) => prev.code === next.code && prev.isDark === next.isDark);

const toId = (children: React.ReactNode): string =>
  String(children).toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

type Segment = { type: 'doc'; content: string } | { type: 'code'; content: string };

// A doc segment split into markdown parts and mermaid blocks
type DocPart =
  | { type: 'markdown'; content: string }
  | { type: 'mermaid'; code: string };

function splitMermaid(content: string): DocPart[] {
  const parts: DocPart[] = [];
  const re = /```mermaid\n([\s\S]*?)```/g;
  let cursor = 0;
  for (const match of content.matchAll(re)) {
    if (match.index! > cursor) {
      const md = content.slice(cursor, match.index).trim();
      if (md) parts.push({ type: 'markdown', content: md });
    }
    parts.push({ type: 'mermaid', code: match[1].trim() });
    cursor = match.index! + match[0].length;
  }
  const tail = content.slice(cursor).trim();
  if (tail) parts.push({ type: 'markdown', content: tail });
  return parts;
}

const C_STYLE_LANGUAGES = new Set([
  'c', 'cpp', 'cuda', 'csharp', 'java', 'javascript', 'typescript',
  'javascriptreact', 'typescriptreact', 'go', 'rust', 'php',
  'swift', 'kotlin', 'scala', 'dart', 'objective-c', 'sql',
]);

export const SUPPORTED_LANGUAGES = new Set([
  ...C_STYLE_LANGUAGES,
  'python',   // """ """ or ''' '''
  'markdown', // rendered directly
  'txt',      // rendered directly
]);

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
        i += 3;
        const closeIdx = src.indexOf(q3, i);
        i = closeIdx === -1 ? n : closeIdx + 3;
      }
      continue;
    }

    if (ch === '#') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }

    i++;
  }

  flushCode(n);
  return mergeSegments(raw);
}

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

export function buildSegments(fileText: string, language: string): Segment[] {
  if (language === 'markdown') return [{ type: 'doc', content: fileText }];
  if (language === 'txt') return [{ type: 'doc', content: fileText }];
  if (language === 'python') return parsePython(fileText);
  if (C_STYLE_LANGUAGES.has(language)) return parseCStyle(fileText);
  return [];
}

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
            Rust, PHP, Swift, Kotlin, Scala, Dart, Objective-C, SQL, txt, and Markdown.
          </p>
        </div>
      </div>
    );
  }

  const segments = useMemo(
    () => buildSegments(fileText, language),
    [fileText, language]
  );

  const markdownComponents = useMemo(() => ({
    img({ src, alt }: { src?: string; alt?: string }) {
      return (
        <ResolvedImage
          src={src ?? ''}
          alt={alt ?? ''}
          resolvedImages={resolvedImages}
        />
      );
    },

    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      const isExternal = /^https?:\/\//.test(href ?? '');
      const isAnchor = href?.startsWith('#');

      if (isExternal) {
        return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
      }

      if (isAnchor) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(href!.slice(1));
              if (el) {
                requestAnimationFrame(() => {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }
            }}
          >
            {children}
          </a>
        );
      }

      return (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            window.vscodeApi?.postMessage({ type: 'open-relative-file', href });
          }}
        >
          {children}
        </a>
      );
    },

    h1({ children }: { children?: React.ReactNode }) {
      return <h1 id={toId(children)}>{children}</h1>;
    },
    h2({ children }: { children?: React.ReactNode }) {
      return <h2 id={toId(children)}>{children}</h2>;
    },
    h3({ children }: { children?: React.ReactNode }) {
      return <h3 id={toId(children)}>{children}</h3>;
    },
    h4({ children }: { children?: React.ReactNode }) {
      return <h4 id={toId(children)}>{children}</h4>;
    },
    h5({ children }: { children?: React.ReactNode }) {
      return <h5 id={toId(children)}>{children}</h5>;
    },
    h6({ children }: { children?: React.ReactNode }) {
      return <h6 id={toId(children)}>{children}</h6>;
    },

    pre({ children }: { children?: React.ReactNode }) {
      return <>{children}</>;
    },
    code({ className, children }: { className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className ?? '');
      const lang = match?.[1];

      if (lang) {
        return (
          <SyntaxHighlighter
            language={lang}
            style={syntaxStyle}
            customStyle={{
              margin: '12px 0',
              borderRadius: '6px',
              border: `1px solid ${isDark ? '#30363d' : '#d0d7de'}`,
              fontSize: '13px',
              lineHeight: '1.5',
              borderLeft: `3px solid var(--gh-accent-emphasis)`,
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }

      return <code className="ghmd-inline-code">{children}</code>;
    },
  }), [isDark, resolvedImages, syntaxStyle]);

  useEffect(() => {
    const container = document.querySelector('.doc-container');
    if (!container) {
      window.vscodeApi?.postMessage({ type: 'render-complete' });
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    let hasSignaled = false;

    const signal = () => {
      if (hasSignaled) return;
      hasSignaled = true;
      window.vscodeApi?.postMessage({ type: 'render-complete' });
    };

    const ro = new ResizeObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(signal, 50);
    });

    ro.observe(container);

    const images = container.querySelectorAll('img');
    let pendingImages = images.length;

    if (pendingImages === 0) {
      timeout = setTimeout(signal, 50);
    } else {
      images.forEach((img) => {
        const image = img as HTMLImageElement;
        const onDone = () => {
          pendingImages--;
          if (pendingImages <= 0) {
            timeout = setTimeout(signal, 50);
          }
        };
        if (image.complete) onDone();
        else {
          image.onload = onDone;
          image.onerror = onDone;
        }
      });
    }

    return () => {
      clearTimeout(timeout);
      ro.disconnect();
    };
  }, [fileText]);

  return (
    <div className={`doc-container ${themeClass}`}>
      {segments.map((seg, segIdx) =>
        seg.type === 'code' ? (
          <div key={segIdx} className="seg-code">
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
          // Split doc segments so mermaid blocks live outside ReactMarkdown
          <div key={segIdx} className={`seg-doc ghmd ${themeClass}`}>
            {splitMermaid(seg.content).map((part, partIdx) =>
              part.type === 'mermaid' ? (
                <MermaidBlock
                  key={`mermaid-${part.code.slice(0, 32)}`}
                  code={part.code}
                  isDark={isDark}
                />
              ) : (
                <ReactMarkdown
                  key={partIdx}
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {part.content}
                </ReactMarkdown>
              )
            )}
          </div>
        )
      )}
    </div>
  );
};

export default DocRenderer;