# Contributing to Explicode

Thanks for your interest in contributing!

## Ways to Contribute

- **Bug reports** — open an issue describing what happened and how to reproduce it
- **Feature requests** — open an issue with your idea and the use case behind it
- **Language support** — Explicode currently supports 15+ languages; PRs adding new ones are welcome
- **Bug fixes and improvements** — see open issues for things to pick up

## Getting Started

### Extension

1. Fork the repo and clone it locally
2. Install and build the webview UI:
   ```
   cd ./extension/webview-ui
   npm install
   npm run build
   ```
3. Back in the extension root, compile the extension:
   ```
   cd ..
   npm run compile
   ```
4. Open the project in VS Code and press `F5` (or the Run button) to launch the extension in a development host window
5. Make your changes in `src/` (extension logic) or `webview-ui/` (the rendered preview UI)

### CLI

1. Fork the repo and clone it locally
2. Install dependencies and link the CLI locally:
```
   cd npm
   npm install
   npm link
```
3. Confirm it's working:
```
   explicode --help
```
4. Make your changes in `src/` (conversion logic) or `bin/cli.js` (the command-line entry point)
5. Re-run `explicode <file>` against a test file to confirm your changes work as expected

## Submitting a PR

- Keep PRs focused — one fix or feature per PR
- Describe what you changed and why in the PR description
- If your change affects rendering, include a before/after screenshot or screen recording

## Reporting Bugs

Please include:
- The file type and a minimal code snippet that reproduces the issue
- What you expected to see vs what actually rendered
- Your VS Code version and OS

## Contact

For questions or collaboration inquiries, reach out at [explicode.com/contact](https://explicode.com/contact).