# Explicode
 
> **Explicode** is an open-source project that lets you write rich **Markdown** documentation directly inside your code comments, turning a single source file into both **runnable code and beautifully rendered documentation**.

Because the documentation lives inside comments, it doesn’t affect your program or build process, no special compilers, configuration, or tooling changes are required. Simply write Markdown in your comments as you code. Keeping documentation in the same file as the code ensures it stays accurate and up to date, evolving alongside the implementation and automatically versioned with your project in `Git`. Explicode brings the principles of literate programming to modern development across many languages, without the need for language-specific frameworks or tedious setup.

Open a live preview panel in `VSCode` to see your code and documentation rendered side-by-side in real time. When you're ready to share, export the result as `Markdown` or `HTML`.

![](https://raw.githubusercontent.com/benatfroemming/explicode-extension/master/demo.gif)


## How It Works

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

#### Markdown

~~~~markdown
# Fibonacci Sequence

Generates the first `n` Fibonacci numbers iteratively.

- **Input**: `n` (int) — how many numbers to generate
- **Output**: list of the first `n` Fibonacci numbers

```python
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
~~~~

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

#### Markdown

~~~~markdown

# Fibonacci Sequence

Generates the first `n` Fibonacci numbers iteratively.

- **Input**: `n` (int) — how many numbers to generate
- **Output**: list of the first `n` Fibonacci numbers

```javascript
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
~~~~


## Supported Languages

Explicode currently supports:
- Python
- JavaScript / TypeScript
- JSX / TSX
- Java
- C / C++ / C#
- CUDA
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


## Contact

Email [froem076@umn.edu](mailto:froem076@umn.edu) with bug reports, feature requests, or collaboration inquiries.