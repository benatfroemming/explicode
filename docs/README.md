<h1>
  <img src="img/logo.svg" alt="Logo" width="40" align="center">
   Explicode
</h1>
 
> **Explicode** lets you write rich **Markdown** documentation directly inside your **code comments**, turning a single source file into both **runnable code and beautifully rendered documentation**.

Because the documentation lives inside comments, it doesn’t affect your program or build process. No special compilers, configuration, or tooling changes are required. Just write Markdown in your comments and keep coding. Keeping documentation in the same file as the code makes it far more likely to stay accurate and up to date, since it evolves alongside the implementation and is automatically versioned with your project in Git. Explicode brings the ideas of literate programming to modern development across many languages, without requiring language-specific documentation frameworks.

<br>

[![](https://img.shields.io/badge/Download-0078D4?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)[![](https://img.shields.io/badge/VS_Code_Extension-005a9e?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=Explicode.explicode)

[![View on GitHub](https://img.shields.io/badge/View_on_GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/benatfroemming/explicode)

## Features

- ✍️ Write Markdown directly inside code comments
- 👀 Live preview panel that renders documentation next to your code
- 🔄 Real-time updates as you edit
- 📦 Export to Markdown or HTML when you're ready to share
- 🌍 Works across multiple programming languages

## How It Works

![](https://raw.githubusercontent.com/benatfroemming/explicode/refs/heads/main/docs/demo.gif)

<br>

Use Markdown syntax inside the multiline comments of your favorite language:

- ### Python - Docstring triple-quotes

    In Python, Explicode looks for triple-quoted strings (`"""` or `'''`) that start at the **beginning of a line** (only whitespace before them). These are the same positions Python uses for docstrings, at the top of a module, class, or function. Triple-quotes used as regular string values mid-expression are ignored.

    ```python
    """
    This is a Markdown doc block — triple-quote is at the start of the line.
    """

    x = """this is NOT a doc block — it's a string value assigned to a variable"""
    ```

- ### C-family languages - Block comments

    For all other supported languages, Explicode renders any `/* ... */` block comment as Markdown. JSDoc-style `/** ... */` comments are also supported.

    ```javascript
    /*
    This is a Markdown doc block.
    */

    /** This too — leading asterisks are stripped automatically. */

    // Single-line comments are NOT rendered as Markdown, they stay as code.
    ```

Everything outside a doc block is rendered as a syntax-highlighted code block. Full [CommonMark](https://www.markdownguide.org/basic-syntax/) syntax is supported, including headings, lists, math with LaTeX syntax, images, tables, and more.

## Quick Start

Open any supported file in VSCode, then either:

- Press `Ctrl+Alt+E` (or `Cmd+Alt+E` on Mac), or
- Right-click on IDE and select **Open with Explicode**

This opens a live preview panel to the right that updates as you edit. 

The ⚙️ button on the header enables some additional functionalities:
- Change theme (Dark/Bright).
- Open the guide.
- Download render as `.md` or `.html`.


## Examples

#### Python

```python
"""
# Fibonacci Sequence

Generates the first `n` Fibonacci numbers iteratively.

- **Input**: `n` (int) — how many numbers to generate
- **Output**: list of the first `n` Fibonacci numbers
"""

def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    seq = [0, 1]
    for _ in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq

fibonacci(5)  # [0, 1, 1, 2, 3]
```

#### JavaScript

```javascript
/*
# Fibonacci Sequence

Generates the first `n` Fibonacci numbers iteratively.

- **Input**: `n` (int) — how many numbers to generate
- **Output**: list of the first `n` Fibonacci numbers
*/

function fibonacci(n) {
    if (n <= 0) return [];
    if (n === 1) return [0];
    const seq = [0, 1];
    for (let i = 2; i < n; i++) {
        seq.push(seq[i - 1] + seq[i - 2]);
    }
    return seq;
}

fibonacci(5);  // [0, 1, 1, 2, 3]
```


## Supported Languages

Explicode currently supports:
- Python
- JavaScript / TypeScript
- JSX / TSX
- Java
- C / C++ / C#
- Go
- Rust
- PHP
- Swift
- Kotlin
- Scala
- Dart
- Objective-C
- SQL
- Markdown

Need support for another language? Open an issue or reach out.

## Commonly Asked Questions

<details class="faq-item">
  <summary>Why use Explicode?</summary>
  <p>
    Explicode keeps your documentation and code in the same place. By writing Markdown directly inside code comments, you can turn a single source file into both runnable code and clear, readable documentation. This makes documentation easier to maintain, keeps it versioned alongside your code, and helps others understand your work without needing separate documentation files or tools.
  </p>
</details>

<details class="faq-item">
  <summary>Do I need special files or tools to use Explicode?</summary>
  <p>
    No. Explicode works directly with your existing source files. Simply write Markdown inside your code comments and open the preview. There’s no need for special file formats, configuration, or changes to your build system.
  </p>
</details>

<details class="faq-item">
  <summary>Does Explicode change my code or build output?</summary>
  <p>
    No. Explicode only reads your source file — it never modifies it. Documentation lives inside standard language comments, so your compiler, interpreter, and build tools see exactly the same code they always did.
  </p>
</details>

<details class="faq-item">
  <summary>Does Explicode store my code?</summary>
  <p>
    No. Explicode only reads your source file locally to generate the rendered preview. Your code is never uploaded or stored in any database.
  </p>
</details>

<details class="faq-item">
  <summary>How is this different from JSDoc, Doxygen, or Sphinx?</summary>
  <p>
    Tools like JSDoc and Sphinx extract documentation from <em>special comment annotations</em> (for example <code>@param</code> or <code>@returns</code>) and generate API reference docs. Explicode takes a different approach: your comments are free-form Markdown prose, letting you write narrative documentation, tutorials, or literate-programming-style explanations — not just API stubs. It also works across many languages without any language-specific toolchain.
  </p>
</details>

<details class="faq-item">
  <summary>My favorite language isn't listed, can I request it?</summary>
  <p>
    Absolutely. Open an issue on GitHub with the language name and its block comment syntax. Languages that use <code>/* ... */</code> style block comments are usually trivial to add.
  </p>
</details>

<details class="faq-item">
  <summary>Is Explicode free and open source?</summary>
  <p>
    Yes! The extension is free to install from the VS Code Marketplace. Check the repository for license details and source code.
  </p>
</details>


## Contact

<p>
  Have a bug report, feature request, or collaboration idea?<br>
  Reach out at <a href="mailto:froem076@umn.edu">froem076@umn.edu</a>.
</p>

<hr style="margin: 40px 0; border: none; border-top: 1px solid #e5e7eb;">

<p align="center" style="color:#6b7280; font-size:0.9rem;">
  <img src="img/logo.svg" alt="Explicode logo" width="20" style="vertical-align: middle; margin-right:8px;">
  Explicode · 2026
</p>