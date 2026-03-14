# Explicode

> Turn your codebase into documentation.

**Explicode** is an open-source project that lets you write rich Markdown documentation directly inside your code comments, turning a single source file into both runnable code and beautifully rendered documentation. The VS Code extension provides live previews of your documentation right inside your IDE. Additionally, the `npm` package can convert supported source files into `.md` Markdown via the terminal or generate a GitHub Pages-ready `docs/` folder.

[![](https://img.shields.io/badge/Download-0078D4?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)[![](https://img.shields.io/badge/VS_Code_Extension-005a9e?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)

[![View on GitHub](https://img.shields.io/badge/View_on_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/benatfroemming/explicode)

## How It Works

Explicode lets you write Markdown directly inside your source code comments. The rules for each language are:

- **Python** — Triple-quoted docstrings (`""" ... """` or `''' ... '''`) placed in the normal docstring position are treated as prose. All other code is rendered as code blocks.
- **C-style languages** — Block comments (`/* ... */`) are treated as prose, while the rest of the code is rendered as code blocks.
- **Markdown files** — Passed through directly without changes.

**Supported Languages:** Python, JavaScript, TypeScript, JSX, TSX, Java, C, C++, C#, CUDA, Rust, Go, Swift, Kotlin, Scala, Dart, PHP, Objective-C, SQL, Markdown, txt

## Commands

### `convert`

Converts a single file to Markdown.

```bash
npx explicode convert <file>         # usage
npx explicode convert src/utils.py   # example: outputs `src/utils.py.md` alongside the original file
```

### `build`

Scans the current directory and generates a `docs/` folder.

```bash
npx explicode build          # light theme
npx explicode build --dark   # dark theme
```

- Recursively finds all supported source files
- Extracts docstrings and block comments as Markdown prose
- Wraps code in syntax-highlighted fenced blocks
- Copies your `README.md` as the docs home page
- Generates a `_sidebar.md` with your full file tree
- Writes an `index.html` ready for [Docsify](https://docsify.js.org/#/) + [GitHub Pages](https://docs.github.com/pages)
- Adds "View on GitHub" source links if a GitHub remote is detected

### Skipped directories

By default, Explicode skips nothing, you control what gets scanned via a `.docignore` file in your project root.

`.docignore` works exactly like `.gitignore`: one pattern per line, supports globs, directory-only patterns, and negation.

```gitignore
# Directories
node_modules/
dist/
build/

# Specific files
secrets.txt
config/local.json

# File patterns
*.log
*.lock

# Negation — include something otherwise ignored
!important.log
```

> **Note:** `docs/` is always excluded automatically since it's Explicode's output folder.

## GitHub Pages

After running `npx explicode build`, push your changes including the generated `docs/` folder to your repository. Then, in your repository settings, enable GitHub Pages using the `docs/` folder as the source. Your site will be live at:

```
https://<user>.github.io/<repo>
```

### Automatic Deployment with GitHub Actions

Add the following workflow file to your repository to automatically build and deploy your Explicode docs on every push:

`.github/workflows/<workflow_name>.yml`

```yml
name: Deploy Explicode Docs

on:
  push:
    branches: [main]   # replace with your desired branch
  workflow_dispatch:   # lets users trigger it manually from GitHub UI

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write  # needed to push to gh-pages branch

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Build docs
        run: npx explicode build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

This workflow publishes your docs to a `gh-pages` branch. In your repository settings, enable GitHub Pages and select the root `(/)` of the `gh-pages` branch as the source.


## Themes

| Flag | Style |
|------|-------|
| `none` | GitHub Light |
| `--dark` | GitHub Dark |


The theme is baked into `docs/ghmd.css` at build time. Re-run with or without `--dark` to switch. You can further customize `index.html` or `ghmd.css` as needed.

## Output Structure

After a build, your `docs/` folder will look like this:

```
docs/
  index.html        # Docsify entry point
  README.md         # your project readme (home page)
  _sidebar.md       # auto-generated file tree navigation
  ghmd.css          # theme stylesheet
  .nojekyll         # disables Jekyll on GitHub Pages
  <your files>.md   # rendered source files
```

## License

MIT