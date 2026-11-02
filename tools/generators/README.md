# Snippet Generators

This folder contains tools that turn toolkit code into snippet files for code editors. The generators scan source files, find snippet tags, resolve required dependencies, and write snippet files for Visual Studio, VS Code, and JetBrains Rider.

Two generator implementations are provided:
* [.NET / C# Generator](./csharp/program.cs): A cross-platform console application.
* [PowerShell Generator](./powershell/generate-snippets.ps1): A PowerShell script that performs the same tasks.

Configuration settings are loaded from [toolkit.config.json](../../toolkit.config.json) in the repository root.

---

## File Naming Convention

The generators only scan files that match the pattern `*.<prefix>.<lang>`.
With the default prefix `cp` from [toolkit.config.json](../../toolkit.config.json):
* C# files must end with `.cp.cs` (for example, `mod-inverse.cp.cs`).
* C++ files must end with `.cp.cpp` (for example, `mod-inverse.cp.cpp`).

Files without `.cp.` in their name are ignored by the generator.

---

## Supported Tags Reference

All tags are placed in single-line comments directly above the method, function, struct, or class.

### 1. `// @snippet <name>`

Marks a block of code as a snippet.

* **Position**: Placed directly above the target method, struct, or class (above the XML doc comment if present).
* **Tag format**: Must contain only letters, numbers, dashes, and underscores (`[a-zA-Z0-9_\-]`).
* **Shortcuts generated**: The generator automatically creates up to four shortcuts for each snippet:
  1. Prefix + name without dashes or underscores (for example, `cpmodinv`).
  2. Prefix + underscore + name with underscores (for example, `cp_mod_inv`).
  3. Exact tag name (for example, `mod-inv`).
  4. The declared method, struct, or class identifier in the code (for example, `ModInverse`).

#### Example:
```csharp
// @snippet mod-inv
/// <summary>
/// Computes the modular multiplicative inverse of a modulo mod.
/// </summary>
public static T ModInverse<T>(T a, T mod) where T : IBinaryInteger<T>
{
    ...
}
```

---

### 2. `// @require <dependency> ...`

Defines dependencies on other snippets in the toolkit.

* **Position**: Placed under the `// @snippet` tag and above the code or doc comment.
* **Separators**: Multiple dependencies can be separated by spaces, commas, or semicolons. You can also write multiple `// @require` lines.
* **Resolution**: The generator resolves dependencies using depth-first search order. All required snippets are added before the parent snippet in the final snippet body.
* **Duplicate prevention**: Each dependency is included only once, even if multiple snippets in a chain require the same helper.

#### Example with single dependency:
```csharp
// @snippet mod-inv
// @require egcd
/// <summary>
/// Computes the modular multiplicative inverse of a modulo mod.
/// </summary>
public static T ModInverse<T>(T a, T mod) where T : IBinaryInteger<T>
{
    var (gcd, x, _) = ExtendedGcd(a, mod);
    ...
}
```

#### Example with multiple dependencies:
```csharp
// @snippet ncr
// @require fact, mod-inv
/// <summary>
/// Computes combinations n choose r modulo a prime.
/// </summary>
public static long NCr(int n, int r, long mod)
{
    ...
}
```

When you type `cp_ncr`, the generated snippet contains the code for `fact`, `mod-inv` (and any dependencies required by `mod-inv`, such as `egcd`), followed by `ncr`.

---

### 3. `/// <summary>` Doc Comment (Snippet Description)

Sets the description shown in the auto-complete popup of your editor.

* **Position**: Directly above the method or class declaration.
* **Format**: Standard 3-line XML documentation comment:
  ```csharp
  /// <summary>
  /// Computes greatest common divisor using Euclid algorithm.
  /// </summary>
  ```
* **Fallback**: If no XML summary comment is found, the description defaults to the snippet tag name.

---

### Comment Stripping (Sanitization)

When the generator builds the final snippet code, it automatically removes:
* The `// @snippet` lines
* The `// @require` lines
* The `///` XML documentation lines

The inserted snippet code remains clean without extra generator metadata.

---

## Code Extraction Details

The extraction logic in [CodeExtractor](./csharp/languages/code-extractor.cs) and [generate-snippets.ps1](./powershell/generate-snippets.ps1) uses syntax masking to locate the start and end of code blocks:

* **Token Masking**: All string literals (`"..."`, `@"..."`), character literals (`'.'`), and comments (`//`, `/* */`) are masked before counting braces. Braces inside strings or comments do not affect block extraction.
* **Brace Matching**: Method and class bodies wrapped in `{ ... }` are extracted once brace depth returns to zero.
* **Expression Bodies**: C# expression-bodied methods (`=> ...;`) are supported and extracted up to the ending semicolon.
* **C++ Preprocessor Directives**: `#define` macros with backslash line continuations (`\`) are supported.
* **Trailing Semicolons**: C++ struct and class declarations ending with `};` keep their trailing semicolon.

---

## How to Run

Run commands from the repository root.

### Option 1: Using .NET (C#)

```cmd
dotnet run --project tools/generators/csharp
```

### Option 2: Using PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File tools/generators/powershell/generate-snippets.ps1
```

---

## Command Options

Both tools support these optional flags:

### 1. Editor Target (`--target` or `-Target`)
* `all` (default): Generates snippets for Visual Studio, VS Code, and JetBrains Rider.
* `vs`: Generates snippets for Visual Studio only.
* `vscode`: Generates snippets for VS Code only.
* `rider`: Generates Live Templates for JetBrains Rider only.

Example:
```cmd
dotnet run --project tools/generators/csharp -- --target vscode
```

### 2. Language (`--lang` or `-Lang`)
* `cs` (default): Scans `*.cp.cs` files and generates C# snippets.
* `cpp`: Scans `*.cp.cpp` files and generates C++ snippets.

Example:
```cmd
dotnet run --project tools/generators/csharp -- --lang cpp
```

### 3. Custom Output Directory (`--output` or `-OutputDir`)
Overrides the default output path:

```cmd
dotnet run --project tools/generators/csharp -- --output "C:\MySnippets"
```

---

## Output Files and Locations

By default, files are written to these locations:

| Editor | File Path | Format |
| :--- | :--- | :--- |
| **Visual Studio** | `cp-snippets/vs/cp-toolkit-<lang>.snippet` | XML `<CodeSnippets>` |
| **VS Code** | `cp-snippets/vscode/cp-toolkit-<lang>.code-snippets` | JSON Snippets Map |
| **JetBrains Rider** | `cp-snippets/rider/cp-toolkit-<lang>.xml` | XML `<templateSet>` |

---

## Editor Setup Guide

### Visual Studio
1. Open Visual Studio.
2. Go to **Tools** > **Code Snippets Manager** (or press `Ctrl` + `K`, `Ctrl` + `B`).
3. Select your language (**Visual C#** or **Visual C++**).
4. Click **Add** and choose the `cp-snippets/vs` folder.
5. In your code, type the shortcut (e.g. `cp_bs` or `cpbs`) and press `Tab` + `Tab`.

### VS Code
To use snippets in this workspace, copy the generated file from `cp-snippets/vscode/` into `.vscode/`.
To use snippets across all workspaces:
1. Open VS Code Command Palette (`Ctrl` + `Shift` + `P`).
2. Run **Snippets: Configure Snippets**.
3. Select **New Global Snippets file...** or edit `csharp.json` / `cpp.json`.
4. Copy the contents of the generated snippet file into your user snippets file.
Alternatively, use the repository CLI tool in [tools/cli](../cli/cli.js) to install directly into user directories:
```cmd
node tools/cli/cli.js --lang cs --editor vscode
```

### JetBrains Rider
1. Open Rider settings (**File** > **Settings** > **Editor** > **Live Templates**).
2. Choose your language.
3. Import the template XML file from `cp-snippets/rider/cp-toolkit-<lang>.xml`.
