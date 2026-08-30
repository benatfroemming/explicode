#!/usr/bin/env node
'use strict';

/**
 * Command-line interface for explicode.
 *
 * Usage:
 *   npx explicode <file_path> [output_dir]
 *
 * Converts <file_path> into a Markdown file (named "<original_filename>.md")
 * using the same doc/code segmentation logic as the Explicode VS Code
 * extension. If <file_path> is already Markdown, no conversion is performed.
 * If the file type isn't supported, a message is printed and nothing is
 * written. The output is placed in [output_dir] if given, otherwise in the
 * current working directory.
 */

const fs = require('fs');
const path = require('path');
const {
  SUPPORTED_LANGUAGES,
  UNSUPPORTED_MESSAGE,
  getLanguageFromFilename,
  convertToMarkdown,
} = require('../src/parser');

function printUsage() {
  console.log(
    'Usage: explicode <file_path> [output_dir]\n\n' +
    'Convert a source file into Markdown: docblocks and comments become\n' +
    'prose, and code becomes fenced code blocks.\n\n' +
    'Arguments:\n' +
    '  file_path   Path to the file to convert\n' +
    '  output_dir  Directory to write the .md file to (default: current directory)'
  );
}

function main(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    return args.length === 0 ? 1 : 0;
  }

  const filePath = args[0];
  const outputDir = args[1] || process.cwd();

  try {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`Error: file not found: ${filePath}`);
        return 1;
      }
      if (err.code === 'EACCES') {
        console.error(`Error: permission denied accessing '${filePath}'`);
        return 1;
      }
      throw err;
    }

    if (stat.isDirectory()) {
      console.error(`Error: expected a file but got a directory: ${filePath}`);
      return 1;
    }

    const fileName = path.basename(filePath);
    const language = getLanguageFromFilename(fileName);

    if (!SUPPORTED_LANGUAGES.has(language)) {
      console.log(UNSUPPORTED_MESSAGE);
      return 1;
    }

    if (language === 'markdown') {
      console.log(`'${fileName}' is already in Markdown. No conversion needed.`);
      return 0;
    }

    let fileText;
    try {
      fileText = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(`Error: permission denied reading '${filePath}'`);
        return 1;
      }
      console.error(`Error: could not read '${filePath}': ${err.message}`);
      return 1;
    }

    // Node's utf8 decoding is lossy (it substitutes invalid bytes rather
    // than throwing), so do a best-effort binary-content sniff instead.
    if (fileText.includes('\u0000')) {
      console.error(
        `Error: could not read '${filePath}' as UTF-8 text. It may be a binary file.`
      );
      return 1;
    }

    let markdown;
    try {
      markdown = convertToMarkdown(fileText, language);
    } catch (err) {
      console.error(`Error: failed to convert '${filePath}': ${err.message}`);
      return 1;
    }

    try {
      fs.mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      console.error(`Error: could not create output directory '${outputDir}': ${err.message}`);
      return 1;
    }

    const outputName = fileName + '.md';
    const outputPath = path.join(outputDir, outputName);

    try {
      fs.writeFileSync(outputPath, markdown, 'utf8');
    } catch (err) {
      if (err.code === 'EACCES') {
        console.error(`Error: permission denied writing '${outputPath}'`);
        return 1;
      }
      console.error(`Error: could not write '${outputPath}': ${err.message}`);
      return 1;
    }

    console.log(`Wrote ${outputPath}`);
    return 0;
  } catch (err) {
    console.error(`Unexpected error: ${err.message}`);
    return 1;
  }
}

process.exit(main(process.argv));
