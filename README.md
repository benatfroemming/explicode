# Explicode

[![VS Code Install](https://img.shields.io/badge/VS_Code-Install-0078d7?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)
[![Open VSX Install](https://img.shields.io/badge/Open_VSX-Install-c160ef?logo=eclipseide)](https://open-vsx.org/extension/Explicode/explicode)
[![npm Install](https://img.shields.io/badge/npm-Install-cb3837?logo=npm)](https://www.npmjs.com/package/explicode)

Documentation usually lives apart from the code it describes, making it easy for the two to drift out of sync and forcing agents to jump between files to reconstruct context. **Explicode** solves this by letting you write rich **Markdown** directly inside your code comments, turning any script into a notebook-style document for humans and clean structured context for coding agents, while remaining fully runnable because the documentation is embedded in comments.

> [Read the guide](./GUIDE.md)

## Why Explicode?

- **No separate doc files**, everything is versioned with your code in Git.
- **Rich Markdown**: syntax highlighting, images, Mermaid, math, interlinking, and more.
- **15+ languages supported**, no workflow changes needed.
- **Live preview in the IDE**, side-by-side with your code.
- **No config or tooling required**, just simple comment conventions.
- **Export to Markdown or HTML** for sharing outside the IDE.

## Demo

![](https://raw.githubusercontent.com/benatfroemming/explicode/master/extension/media/demo.gif)

A quick walkthrough of the Explicode extension: open a source file with inline documentation and see it instantly rendered into a clean, notebook-style view alongside your code.

## Project

Currently the project consists of two tools:

- **IDE Extension** `v1.0.1`: supported in VS Code and Open VSX editors. Source code in [`/extension`](./extension/README.md).
- **CLI** `v0.1.0`: a Node-based tool for converting scripts into Markdown via the command line or as a library. Source code in [`/cli`](./npm/README.md).

## Coding Agents

Explicode keeps **code and docs tightly coupled**, giving agents **high-quality context** to understand **what the code does and why** without jumping between files. Teach your AI to write code with embedded documentation: copy [`SKILL.md`](https://github.com/benatfroemming/explicode/blob/main/skills/explicode/SKILL.md) into `.claude/skills/explicode/` for Claude, `.cursor/skills/explicode/` for Cursor, or `.agents/skills/explicode/` for Codex, in your project root.

## Supported Languages

Python · JavaScript / TypeScript · JSX / TSX · Java · C / C++ / C# · CUDA · Go · Rust · PHP · Swift · Kotlin · Scala · Dart · Objective-C · SQL · Markdown · Plain text

## Contributing
Contributions are always welcome! See [CONTRIBUTING.md](https://github.com/benatfroemming/explicode/blob/main/CONTRIBUTING.md) for guidelines, then open an issue or submit a pull request.

## Contact
Have a bug report, feature request, or collaboration inquiry? Reach out [here](https://explicode.com/contact).

## License
Explicode is licensed under the [MIT License](https://github.com/benatfroemming/explicode/blob/main/LICENSE), free to use, modify, and distribute for personal and commercial projects.

## Privacy
Explicode is privacy-friendly: **we do not collect or store your code or personal data**. Everything stays local unless you choose to share or publish it yourself.