# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

- Ongoing improvements and bug fixes.
- Additional language support: HTML, CSS, etc.

---

## [1.0.0] - 2026-06-22
### Added
- Cross-file relative link navigation with anchor support and header reference
- Mermaid diagram rendering with dark/light theme support
- Optimizations to enhance rendering

### Changed
- Moved UI to the sidebar instead of keeping it as a separate panel

## [0.1.3] - 2026-03-14

### Added
- .txt support
- Fix the nested code block for sample code in md

## [0.1.2] - 2026-03-09

### Added
- CUDA support (.cu, .cuh)
- C++ header support (.hpp, .hxx)

## [0.1.1] - 2026-03-09

### Added
- CLI tool (`cli.js`) for rendering Explicode docs outside of VSCode
- GitHub Actions support — push to main and docs auto-deploy to GitHub Pages

## [0.1.0] - 2026-03-05

### Added

- GitHub-flavored Markdown rendering with **light and dark themes**
- Support for multiple programming languages

### Changed

- Explicode now detects **multi-line documentation comments automatically**, removing the need for special delimiters such as `@startmd`
- Updated README
- New project logo

### Removed

- Multiline comment block auto-injection shortcut (no longer needed after delimiter removal)
