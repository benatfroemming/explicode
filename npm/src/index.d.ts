export type SegmentType = 'doc' | 'code';

export interface Segment {
  type: SegmentType;
  content: string;
}

export const C_STYLE_LANGUAGES: Set<string>;
export const SUPPORTED_LANGUAGES: Set<string>;
export const EXTENSION_LANGUAGE_MAP: Record<string, string>;
export const FENCE_LANG: Record<string, string>;
export const UNSUPPORTED_MESSAGE: string;

/** Map a filename's extension to an explicode language identifier (e.g. "main.py" -> "python"). */
export function getLanguageFromFilename(filename: string): string;

/** Map an explicode language identifier to the tag used in fenced code blocks. */
export function toFenceLang(language: string): string;

/** Split file text into alternating doc/code segments for the given language. */
export function buildSegments(fileText: string, language: string): Segment[];

/** Render segments back out as a Markdown string. */
export function segmentsToMarkdown(segments: Segment[], language: string): string;

/** Convenience wrapper: build segments and render them as a Markdown string. */
export function convertToMarkdown(fileText: string, language: string): string;

/**
 * Convert a string of source text into Markdown.
 * Throws if `language` isn't supported.
 */
export function convertText(text: string, language: string): string;

/**
 * Read a file from disk and convert it to Markdown. The language is
 * inferred from the file's extension. Throws if the file can't be read
 * or its language isn't supported.
 */
export function convertFile(filePath: string): {
  fileName: string;
  language: string;
  markdown: string;
};
