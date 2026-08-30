# Explicode

Documentation usually lives apart from the code it describes, making it easy for the two to drift out of sync and forcing agents to jump between files to reconstruct context. **Explicode** solves this by letting you write rich **Markdown** directly inside your code comments, turning any script into a notebook-style document for humans and clean structured context for coding agents, while remaining fully runnable because the documentation is embedded in comments.

> [Read the guide](https://explicode.com/docs)

## Usage

No install needed, run it directly with `npx`:

```bash
npx explicode <file_path> [output_dir]
```

- `file_path` — the file to convert.
- `output_dir` — optional. Where to write the result. Defaults to the current directory.

The output file is named `<original_filename>.md`, e.g. converting `main.py`
produces `main.py.md`.

Examples:

```bash
npx explicode main.py
# -> ./main.py.md

npx explicode src/app.ts ./docs
# -> ./docs/app.ts.md
```

If the input file is already Markdown (`.md` / `.mdx`), explicode prints a
message and does nothing, since no conversion is needed.

If the file extension isn't one of the supported languages, explicode prints
a "Language not supported" message and exits without writing anything.

## Use it as a library

You can also import explicode directly and get the Markdown string back,
instead of going through the CLI, useful if you want to embed this in
another tool. Install it as a dependency first:

```bash
npm install explicode
```

There are two main functions:

**`convertText(text, language)`** — you already have the file contents in
memory and just want the Markdown back.

```js
const { convertText } = require('explicode');

const markdown = convertText(fileText, 'python');
```

**`convertFile(filePath)`** — you have a path on disk; it reads the file and
figures out the language from the extension for you.

```js
const { convertFile } = require('explicode');

const { fileName, language, markdown } = convertFile('./src/main.py');
```

Both throw an `Error` (with `err.code === 'UNSUPPORTED_LANGUAGE'`) if the
language isn't supported, so wrap calls in `try/catch` if the input isn't
guaranteed to be one of the supported types. `convertFile` also throws
normal Node `fs` errors (e.g. `ENOENT`) if the file can't be read.

From TypeScript, with full type checking:

```ts
import { convertText, convertFile } from 'explicode';

const markdown = convertText(fileText, 'python');
const { fileName, language, markdown: md2 } = convertFile('./src/app.ts');
```

## Supported languages

Python, JavaScript, TypeScript, JSX, TSX, C, C++, CUDA, C#, Java, Go, Rust,
PHP, Swift, Kotlin, Scala, Dart, Objective-C, SQL, plain text (`.txt`), and
Markdown (passthrough).
