[← Go Back](../README.md)

# Quick Start: Command-Line Interface & GitHub Pages

Documentation for the Explicode CLI can be found on [npm](https://www.npmjs.com/package/explicode?activeTab=readme).

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

**Skipped directories:** `node_modules`, `.git`, `dist`, `build`, `out`, `docs`, `.next`, `.nuxt`, `.cache`, `.venv`, `venv`, `__pycache__`

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