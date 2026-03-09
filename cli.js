#!/usr/bin/env node
'use strict';

/**
 * Explicode CLI
 * Reads explicode.json, renders each listed source file to Markdown,
 * and outputs a Docsify-ready docs/ folder for GitHub Pages.
 *
 * Usage:
 *   node cli.js build          (reads explicode.json in cwd)
 */

const fs   = require('fs');
const path = require('path');

// Language detection
const EXT_TO_LANG = {
  md: 'markdown', mdx: 'markdown',
  py: 'python',
  js: 'javascript', ts: 'typescript',
  jsx: 'javascriptreact', tsx: 'typescriptreact',
  java: 'java',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  c: 'c', h: 'c',
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

// Prism language aliases for fenced code blocks
const PRISM_LANG = {
  javascriptreact: 'jsx',
  typescriptreact: 'tsx',
  csharp: 'csharp',
  'objective-c': 'objectivec',
};

const C_STYLE_LANGUAGES = new Set([
  'c', 'cpp', 'csharp', 'java', 'javascript', 'typescript',
  'javascriptreact', 'typescriptreact', 'go', 'rust', 'php',
  'swift', 'kotlin', 'scala', 'dart', 'objective-c', 'sql',
]);

const SUPPORTED_LANGUAGES = new Set([
  ...C_STYLE_LANGUAGES,
  'python',
  'markdown',
]);

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

// Parsers (ported from docRenderer.tsx)
function mergeSegments(raw) {
  return raw.reduce((acc, seg) => {
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

function parsePython(src) {
  const raw = [];
  let i = 0;
  const n = src.length;

  function isDocContext(pos) {
    let j = pos - 1;
    while (j >= 0 && src[j] !== '\n') {
      if (src[j] !== ' ' && src[j] !== '\t') return false;
      j--;
    }
    return true;
  }

  let codeStart = 0;

  function flushCode(end) {
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

function stripJsDocStars(text) {
  return text
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
}

function parseCStyle(src) {
  const raw = [];
  const RE = /\/\*[\s\S]*?\*\//g;
  let cursor = 0;

  for (const match of src.matchAll(RE)) {
    const start = match.index;
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

function buildSegments(fileText, language) {
  if (language === 'markdown') return [{ type: 'doc', content: fileText }];
  if (language === 'python')   return parsePython(fileText);
  if (C_STYLE_LANGUAGES.has(language)) return parseCStyle(fileText);
  return [];
}

// Renderer: segments to Markdown string
function segmentsToMarkdown(segments, language) {
  const prismLang = PRISM_LANG[language] ?? language;
  return segments
    .map(seg =>
      seg.type === 'doc'
        ? seg.content
        : '```' + prismLang + '\n' + seg.content + '\n```'
    )
    .join('\n\n');
}

// Docsify index.html template
function docsifyIndexHtml(title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
  <style>
    :root { --theme-color: #4a6fa5; }
    .sidebar { border-right: 1px solid #eee; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    window.$docsify = {
      name: '${title}',
      repo: '',
      loadSidebar: true,
      subMaxLevel: 2,
      search: 'auto',
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4/lib/docsify.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify@4/lib/plugins/search.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-python.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-typescript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-java.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-rust.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1/components/prism-go.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/docsify-katex@1/dist/docsify-katex.js"></script>
</body>
</html>`;
}

// Build command
function build() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, 'explicode.json');

  if (!fs.existsSync(configPath)) {
    console.error('❌  explicode.json not found in current directory.');
    console.error('    Create one like:\n');
    console.error('    { "files": ["src/main.py", "src/utils.js"] }\n');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const files = config.files ?? [];
  const outDir = path.join(cwd, 'docs');

  fs.mkdirSync(outDir, { recursive: true });

  // README to docs/README.md (Docsify home page)
  const readmeSrc = ['README.md', 'readme.md', 'Readme.md']
    .map(f => path.join(cwd, f))
    .find(f => fs.existsSync(f));

  if (readmeSrc) {
    fs.copyFileSync(readmeSrc, path.join(outDir, 'README.md'));
    console.log('📄  README.md → docs/README.md');
  } else {
    fs.writeFileSync(
        path.join(outDir, 'README.md'),
        '# Docs\n\nGenerated by [Explicode](https://explicode.com).\n'
    );
  }

  // Render each listed file
  const sidebarEntries = ['- [Home](/)'];
  const skipped = [];

  for (const relPath of files) {
    const srcPath = path.join(cwd, relPath);

    if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️   Skipping (not found): ${relPath}`);
        skipped.push(relPath);
        continue;
    }

    const lang = getLanguage(relPath);

    if (!SUPPORTED_LANGUAGES.has(lang)) {
        console.warn(`⚠️   Skipping (unsupported language): ${relPath}`);
        skipped.push(relPath);
        continue;
    }

    const src      = fs.readFileSync(srcPath, 'utf8');
    const segments = buildSegments(src, lang);
    const markdown = segmentsToMarkdown(segments, lang);

    // Mirror the source path inside docs/
    const outRelPath = relPath.replace(/\.[^.]+$/, '.md');
    const outPath    = path.join(outDir, outRelPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);

    sidebarEntries.push(`- [${relPath}](${outRelPath})`);
    console.log(`✅  ${relPath} → docs/${outRelPath}`);
  }

  // _sidebar.md
  fs.writeFileSync(
    path.join(outDir, '_sidebar.md'),
    sidebarEntries.join('\n') + '\n'
  );

  // index.html (Docsify)
  const title = config.title ?? path.basename(cwd);
  const indexPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    // Only write once so users can customise it without it being overwritten
    fs.writeFileSync(indexPath, docsifyIndexHtml(title));
  }

  // .nojekyll (required for GitHub Pages to serve _ files)
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  console.log('\n🚀  Done! Output in docs/');
  if (skipped.length) {
    console.log(`    Skipped ${skipped.length} file(s): ${skipped.join(', ')}`);
  }
}

// Entry point
const cmd = process.argv[2];
if (cmd === 'build') {
  build();
} else {
  console.log('Explicode CLI\n');
  console.log('Usage:');
  console.log('  npx explicode build    Render docs from explicode.json\n');
}