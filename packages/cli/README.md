# Explicode

> Turn your codebase into documentation.

**Explicode** is an open-source project that lets you write rich Markdown documentation directly inside your code comments, turning a single source file into both runnable code and beautifully rendered documentation. The VS Code extension provides live previews of your documentation right inside your IDE. Additionally, the `npm` package can convert supported source files into `.md` Markdown via the terminal or generate a GitHub Pages-ready `docs/` folder.

[![](https://img.shields.io/badge/Download-0078D4?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)[![](https://img.shields.io/badge/VS_Code_Extension-005a9e?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)

[![View on GitHub](https://img.shields.io/badge/View_on_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/benatfroemming/explicode)

[![](https://img.shields.io/badge/View-00A300?style=for-the-badge&logoColor=white)](https://benatfroemming.github.io/explicode-demo)[![](https://img.shields.io/badge/Live_Demo-00875a?style=for-the-badge)](https://benatfroemming.github.io/explicode-demo)

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

Control what Explicode scans by adding a `.docignore` file to your project root. It works exactly like `.gitignore`: one pattern per line, supporting globs, directory-only patterns, and negation.

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

> **Note:** `docs/` and hidden files (`.*`) are always excluded automatically.

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

## Media and Links

### Media

Supported file types: `png`, `jpg`, `jpeg`, `gif`, `svg`, `webp`, `pdf`, `mp4`, `mp3`. Use external URLs or relative paths,  relative paths resolve from the current file's location.

```markdown
![Same folder](diagram.png)
![Subfolder](images/diagram.png)
![Parent folder](../diagram.png)
![External](https://picsum.photos/200/300)
```

### Links

External URLs open in a new tab. Markdown files can be interlinked using relative paths.

```markdown
[Same folder](other.md)
[Subfolder](guide/intro.md)
[Parent folder](../README.md)
[External](https://explicode.com)
```

To link to a specific heading in another file, use `?id=` followed by the heading title in lowercase with spaces replaced by hyphens and special characters removed.

```markdown
[Link to heading](other.md?id=how-to-test-code)
```

For same-page heading links, use a standard `#` anchor.
```markdown
[Same page heading](#how-to-test-code)
```

## Themes

| Flag | Style |
|------|-------|
| `none` | GitHub Light |
| `--dark` | GitHub Dark |


The theme is baked into `docs/ghmd.css` at build time. Re-run with or without `--dark` to switch. You can further customize `index.html` or `ghmd.css` as needed.

## Output Structure

After a build, your `docs/` folder will look like this:

```text
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