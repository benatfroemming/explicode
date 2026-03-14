#!/usr/bin/env node
'use strict';

/**
 * Explicode CLI
 * Scans the current directory, renders supported source files to Markdown,
 * and outputs a Docsify-ready docs/ folder for GitHub Pages.
 *
 * Usage:
 *   node cli.js build [--dark]
 *   node cli.js convert <file>
 */

const fs   = require('fs');
const path = require('path');
const ignore = require('ignore');

// Language detection
const EXT_TO_LANG = {
  md: 'markdown', mdx: 'markdown',
  txt: 'txt',
  py: 'python',
  js: 'javascript', ts: 'typescript',
  jsx: 'javascriptreact', tsx: 'typescriptreact',
  java: 'java',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
  c: 'c', h: 'c',
  cs: 'csharp',
  cu: 'cuda', cuh: 'cuda',
  rs: 'rust',
  go: 'go', 
  swift: 'swift',
  kt: 'kotlin', kts: 'kotlin',
  dart: 'dart',
  php: 'php',
  scala: 'scala', sbt: 'scala',
  sql: 'sql',
};

const PRISM_LANG = {
  javascriptreact: 'jsx',
  typescriptreact: 'tsx',
  cuda: 'c',
  csharp: 'csharp',
  'objective-c': 'objectivec',
};

const C_STYLE_LANGUAGES = new Set([
  'c', 'cpp', 'csharp', 'cuda', 'java', 'javascript', 'typescript',
  'javascriptreact', 'typescriptreact', 'go', 'rust', 'php',
  'swift', 'kotlin', 'scala', 'dart', 'objective-c', 'sql',
]);

const SUPPORTED_LANGUAGES = new Set([
  ...C_STYLE_LANGUAGES,
  'python',
  'markdown',
  'txt',
]);

// Directories to always skip when scanning
function loadDocIgnore(cwd) {
  const ignorePath = path.join(cwd, '.docignore');
  const ig = ignore();
  if (fs.existsSync(ignorePath)) {
    ig.add(fs.readFileSync(ignorePath, 'utf8'));
  }
  return ig;
}

function getLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_LANG[ext] ?? 'plaintext';
}

// Parsers
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
  if (language === 'txt') return [{ type: 'doc', content: fileText }];
  if (language === 'python')   return parsePython(fileText);
  if (C_STYLE_LANGUAGES.has(language)) return parseCStyle(fileText);
  return [];
}

function segmentsToMarkdown(segments, language) {
  const prismLang = PRISM_LANG[language] ?? language;
  return segments
    .map(seg =>
      seg.type === 'doc'
        ? seg.content
        : '```' + prismLang + ' xp-source\n' + seg.content + '\n```'
    )
    .join('\n\n');
}

// Recursively collect all files under a directory, skipping .docignore
function walkDir(dir, cwd, ig) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel  = path.relative(cwd, full).split(path.sep).join('/');
    if (ig.ignores(rel)) continue;
    if (entry.isDirectory()) {
      results.push(...walkDir(full, cwd, ig));
    } else if (entry.isFile()) {
      results.push(rel);
    }
  }
  return results;
}

// Build the sidebar markdown.
// allFiles     - every file discovered (relative, forward-slash paths)
// renderedSet  - Set of relPaths that were successfully rendered
// outRelPathFn - maps a rendered relPath to its docs output path
// rootReadme   - the relPath of the root README (e.g. "README.md"), gets route "/"
function buildSidebarMarkdown(allFiles, renderedSet, outRelPathFn, rootReadme) {
  const sorted = [...allFiles].sort((a, b) => a.localeCompare(b));

  // Build a tree: each node = { children: Map<name, node>, file?: { label, outRelPath?, rendered } }
  const root = { children: new Map() };

  for (const relPath of sorted) {
    const parts = relPath.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i];
      if (!node.children.has(seg)) node.children.set(seg, { children: new Map() });
      node = node.children.get(seg);
    }
    const filename = parts[parts.length - 1];
    const isRoot = relPath === rootReadme;
    const isRendered = isRoot || renderedSet.has(relPath);
    // Root README always links to "/" (the docsify home route)
    const outRel = isRoot ? '/' : (isRendered ? outRelPathFn(relPath) : null);
    node.children.set(filename, {
      children: new Map(),
      file: { label: filename, outRelPath: outRel, rendered: isRendered, relPath },
    });
  }

  function renderNode(node, depth) {
    const indent = '  '.repeat(depth);
    const lines  = [];
    const dirs   = [...node.children.entries()].filter(([, n]) => !n.file).sort(([a], [b]) => a.localeCompare(b));
    const files  = [...node.children.entries()].filter(([, n]) =>  n.file).sort(([a], [b]) => a.localeCompare(b));

    for (const [name, child] of dirs) {
      lines.push(`${indent}- **${name}**`);
      lines.push(...renderNode(child, depth + 1));
    }
    for (const [, child] of files) {
      if (child.file.rendered) {
        lines.push(`${indent}- [${child.file.label}](${child.file.outRelPath})`);
      } else {
        // Unrendered: plain span, no link — styled as grayed-out, but shows GitHub icon on hover
        lines.push(`${indent}- <span class="xp-unrendered" data-path="${child.file.relPath}">${child.file.label}</span>`);
      }
    }
    return lines;
  }

  return renderNode(root, 0).join('\n') + '\n';
}

// Load the index.html template and substitute {{TITLE}}, inject dark mode if needed
function docsifyIndexHtml(title, theme, githubBase) {
  const templatePath = path.join(__dirname, 'index.template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  if (theme === 'dark') {
    html = html.replace('<html lang="en">', '<html lang="en" data-color-mode="dark">');
  }

  html = html.replaceAll('{{TITLE}}', title);
  html = html.replaceAll('{{GITHUB_BASE}}', githubBase || '');
  return html;
}

// Load the CSS file for the selected theme
function loadThemeCss(theme) {
  const cssFile = theme === 'dark' ? 'ghmd-dark.css' : 'ghmd-light.css';
  return fs.readFileSync(path.join(__dirname, cssFile), 'utf8');
}

// Detect GitHub remote and return a blob base URL, or empty string if not found
function getGitHubBase() {
  try {
    const { execSync } = require('child_process');
    const remote = execSync('git remote get-url origin', { stdio: ['pipe','pipe','pipe'] })
      .toString().trim();
    // Normalise SSH and HTTPS to https://github.com/user/repo
    let match = remote.match(/github\.com[:/]([^/]+\/[^\.]+?)(\.git)?$/);
    if (!match) return '';
    const repoPath = match[1];
    // Detect default branch
    let branch = 'main';
    try {
      branch = execSync('git symbolic-ref --short HEAD', { stdio: ['pipe','pipe','pipe'] })
        .toString().trim();
    } catch (_) {}
    return `https://github.com/${repoPath}/blob/${branch}`;
  } catch (_) {
    return '';
  }
}

// Build command
function build() {
  const args  = process.argv.slice(3);
  const theme = args.includes('--dark') ? 'dark' : 'light';

  const cwd    = process.cwd();
  const title  = path.basename(cwd);
  const outDir = path.join(cwd, 'docs');
  const ig = loadDocIgnore(cwd);
  ig.add('docs/');

  fs.mkdirSync(outDir, { recursive: true });

  // Write theme CSS
  fs.writeFileSync(path.join(outDir, 'ghmd.css'), loadThemeCss(theme));

  // Handle root README — always docs/README.md
  const readmeSrc = ['README.md', 'readme.md', 'Readme.md']
    .map(f => path.join(cwd, f))
    .find(f => fs.existsSync(f)) ?? null;

  if (readmeSrc) {
    fs.copyFileSync(readmeSrc, path.join(outDir, 'README.md'));
    console.log(`${path.relative(cwd, readmeSrc)} -> docs/README.md`);
  } else {
    fs.writeFileSync(
      path.join(outDir, 'README.md'),
      '# Docs\n\nGenerated by [Explicode](https://explicode.com).\n'
    );
    console.log('No README.md found, writing placeholder docs/README.md');
  }

  // Discover every file in the project
  const allFiles = walkDir(cwd, cwd, ig);

  // The relative path of the root README (for sidebar routing)
  const rootReadme = readmeSrc ? path.relative(cwd, readmeSrc).split(path.sep).join('/') : null;

  function outRelPath(relPath) {
    const lang = getLanguage(relPath);
    return lang === 'markdown' ? relPath : relPath + '.md';
  }

  const renderedSet = new Set();
  const skipped     = [];

  for (const relPath of allFiles) {
    // Root README was already copied above; just mark it rendered so it gets a sidebar link
    if (relPath === rootReadme) {
      renderedSet.add(relPath);
      continue;
    }

    const lang = getLanguage(relPath);

    if (!SUPPORTED_LANGUAGES.has(lang)) {
      skipped.push(relPath);
      continue;
    }

    const srcPath = path.join(cwd, relPath);
    const src     = fs.readFileSync(srcPath, 'utf8');
    const segments = buildSegments(src, lang);
    const markdown = segmentsToMarkdown(segments, lang);

    const out     = outRelPath(relPath);
    const outPath = path.join(outDir, out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, markdown);

    renderedSet.add(relPath);
    console.log(`${relPath} -> docs/${out}`);
  }

  // Sidebar: all files visible, unrendered ones grayed out and non-clickable
  fs.writeFileSync(
    path.join(outDir, '_sidebar.md'),
    buildSidebarMarkdown(allFiles, renderedSet, outRelPath, rootReadme)
  );

  // Write index.html only if it doesn't already exist
  const githubBase = getGitHubBase();
  if (githubBase) console.log(`GitHub source links: ${githubBase}`);

  const indexPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, docsifyIndexHtml(title, theme, githubBase));
  }

  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  console.log('\nDone! Output in docs/');
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} unsupported file(s): ${skipped.join(', ')}`);
  }
}

// Convert command
function convert() {
  const relPath = process.argv[3];

  if (!relPath) {
    console.error('Usage: explicode convert <file>');
    process.exit(1);
  }

  const cwd     = process.cwd();
  const srcPath = path.join(cwd, relPath);

  if (!fs.existsSync(srcPath)) {
    console.error(`File not found: ${relPath}`);
    process.exit(1);
  }

  const lang = getLanguage(relPath);

  if (lang === 'markdown') {
    console.log(`${relPath} is already markdown, nothing to convert.`);
    process.exit(0);
  }

  if (!SUPPORTED_LANGUAGES.has(lang)) {
    console.error(`Unsupported language: ${relPath}`);
    process.exit(1);
  }

  const src      = fs.readFileSync(srcPath, 'utf8');
  const segments = buildSegments(src, lang);
  const markdown = segmentsToMarkdown(segments, lang);

  const outPath = path.join(cwd, relPath + '.md');
  fs.writeFileSync(outPath, markdown);
  console.log(`${relPath} -> ${relPath}.md`);
}

// Entry point
const cmd = process.argv[2];
if (cmd === 'build') {
  build();
} else if (cmd === 'convert') {
  convert();
} else {
  console.log('Explicode CLI\n');
  console.log('Usage:');
  console.log('  npx explicode build [--dark]   Render docs from current directory');
  console.log('  npx explicode convert <file>   Convert a single file to markdown\n');
}