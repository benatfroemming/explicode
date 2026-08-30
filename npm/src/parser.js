'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Core conversion logic for explicode.
 *
 * This mirrors the segment-splitting logic used by the Explicode VS Code
 * extension's DocRenderer (parsePython / parseCStyle / buildSegments in
 * docRenderer.tsx), and the Python CLI port. It walks a source file and
 * splits it into alternating "doc" segments (docstrings / block comments)
 * and "code" segments, which are then reassembled into a Markdown document.
 */

// Languages that use C-style block comments: /* ... */
const C_STYLE_LANGUAGES = new Set([
  'c', 'cpp', 'cuda', 'csharp', 'java', 'javascript', 'typescript',
  'javascriptreact', 'typescriptreact', 'go', 'rust', 'php',
  'swift', 'kotlin', 'scala', 'dart', 'objective-c', 'sql',
]);

const SUPPORTED_LANGUAGES = new Set([
  ...C_STYLE_LANGUAGES,
  'python',
  'markdown',
  'txt',
]);

// File extension -> language identifier, mirrors getLanguageFromFilePath in App.tsx
const EXTENSION_LANGUAGE_MAP = {
  md: 'markdown', mdx: 'markdown',
  txt: 'txt',
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

// Language identifier -> fenced-code-block tag used when emitting Markdown.
const FENCE_LANG = {
  javascriptreact: 'jsx',
  typescriptreact: 'tsx',
  cuda: 'c',
  csharp: 'csharp',
  'objective-c': 'objectivec',
};

function getLanguageFromFilename(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return 'plaintext';
  const ext = parts.pop().toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || 'plaintext';
}

function toFenceLang(language) {
  return FENCE_LANG[language] || language;
}

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
  const n = src.length;
  let i = 0;

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
    .map((line) => line.replace(/^\s*\*\s?/, ''))
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
  if (language === 'markdown' || language === 'txt') {
    return [{ type: 'doc', content: fileText }];
  }
  if (language === 'python') return parsePython(fileText);
  if (C_STYLE_LANGUAGES.has(language)) return parseCStyle(fileText);
  return [];
}

function segmentsToMarkdown(segments, language) {
  const fenceLang = toFenceLang(language);
  const parts = segments.map((seg) =>
    seg.type === 'code' ? '```' + fenceLang + '\n' + seg.content + '\n```' : seg.content
  );
  return parts.join('\n\n').trim() + '\n';
}

function convertToMarkdown(fileText, language) {
  const segments = buildSegments(fileText, language);
  return segmentsToMarkdown(segments, language);
}

/**
 * Convert a string of source text into Markdown.
 *
 * @param {string} text - The file contents.
 * @param {string} language - An explicode language id (e.g. "python", "javascript").
 *   Use getLanguageFromFilename(fileName) if you only have a file name/extension.
 * @returns {string} The rendered Markdown.
 * @throws {Error} If `language` isn't a supported language.
 */
function convertText(text, language) {
  if (!SUPPORTED_LANGUAGES.has(language)) {
    const err = new Error(UNSUPPORTED_MESSAGE);
    err.code = 'UNSUPPORTED_LANGUAGE';
    throw err;
  }
  return convertToMarkdown(text, language);
}

/**
 * Read a file from disk and convert it to Markdown. The language is inferred
 * from the file's extension, so you don't need to pass it separately.
 *
 * @param {string} filePath - Path to the file to convert.
 * @returns {{ fileName: string, language: string, markdown: string }}
 * @throws {Error} If the file can't be read, or its language isn't supported.
 */
function convertFile(filePath) {
  const fileName = path.basename(filePath);
  const language = getLanguageFromFilename(fileName);
  const text = fs.readFileSync(filePath, 'utf8');
  const markdown = convertText(text, language);
  return { fileName, language, markdown };
}

const UNSUPPORTED_MESSAGE =
  'Language not supported.\n' +
  'Supported: Python, JavaScript, TypeScript, JSX, TSX, C, C++, CUDA, C#, Java, Go, ' +
  'Rust, PHP, Swift, Kotlin, Scala, Dart, Objective-C, SQL, txt, and Markdown.';

module.exports = {
  C_STYLE_LANGUAGES,
  SUPPORTED_LANGUAGES,
  EXTENSION_LANGUAGE_MAP,
  FENCE_LANG,
  UNSUPPORTED_MESSAGE,
  getLanguageFromFilename,
  toFenceLang,
  buildSegments,
  segmentsToMarkdown,
  convertToMarkdown,
  convertText,
  convertFile,
};
