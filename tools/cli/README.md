# CP PS Toolkit CLI

Command-line tool to install competitive programming snippets into code editors and export the browser extension.

Published on npm as [`cp-ps-toolkit`](https://www.npmjs.com/package/cp-ps-toolkit).

---

## Requirements

- Node.js 18 or higher (uses built-in `fetch`).

---

## How to Run

You can run the tool directly with `npx` without installing it first:

```bash
npx cp-ps-toolkit [options]
```

Or install it globally on your machine:

```bash
npm install -g cp-ps-toolkit
cp-ps-toolkit [options]
```

---

## Command Options

| Option | Short | Values | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--lang` | `-l` | `cs`, `cpp` | `cs` | Programming language for snippets. |
| `--editor` | `-e` | `vscode`, `vs`, `rider`, `all` | `all` | Target code editor. |
| `--output` | `-o` | `<path>` | *Editor default* | Custom destination folder for files. |
| `--remove` | `-r` | *None* | `false` | Removes installed snippet files from editor folders. |
| `--extension` | `-ext` | *None* | `false` | Exports unpacked browser extension files to disk. |
| `--version` | `-v` | *None* | | Shows the current version. |
| `--help` | `-h` | *None* | | Shows help text and command usage. |

---

## Examples

### Install Snippets

Install C# snippets into all detected editors (VS Code, Visual Studio, and Rider):

```bash
npx cp-ps-toolkit
```

Install C# snippets into VS Code only:

```bash
npx cp-ps-toolkit --editor vscode
```

Install C++ snippets into Visual Studio:

```bash
npx cp-ps-toolkit --lang cpp --editor vs
```

Install C# snippets into JetBrains Rider:

```bash
npx cp-ps-toolkit --lang cs --editor rider
```

Save snippets to a project folder instead of global editor settings:

```bash
npx cp-ps-toolkit --editor vscode --output .vscode
```

> If `--output` points to a folder named `.vscode` and you do not set `--editor`, the tool automatically selects `vscode`.

---

### Remove Snippets

Remove installed C# snippets from all detected editors:

```bash
npx cp-ps-toolkit --remove
```

Remove installed C++ snippets from Visual Studio:

```bash
npx cp-ps-toolkit --remove --lang cpp --editor vs
```

Remove snippets from a custom folder:

```bash
npx cp-ps-toolkit --remove --editor vscode --output .vscode
```

> You can also use `remove` or `uninstall` instead of `--remove`.

---

### Export Browser Extension

Export the unpacked browser extension files:

```bash
npx cp-ps-toolkit --extension
```

Export extension files to a specific directory:

```bash
npx cp-ps-toolkit --extension --output ./my-extension
```

When you run this command:
1. The tool copies the extension files to the output folder (defaults to `~/.cp-ps-toolkit/extension`).
2. It opens the folder in your operating system file manager.
3. It prints instructions to load the extension in your browser.

#### Load into Chrome, Edge, or Brave:
1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the exported extension folder.

#### Load into Firefox:
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside the exported folder.

---

## Default Editor Directories

When `--output` is not set, the tool finds the configuration folders for your installed editors:

### Visual Studio Code
- **Windows**: `%APPDATA%\Code\User\snippets\cp-toolkit-<lang>.code-snippets`
- **macOS**: `~/Library/Application Support/Code/User/snippets/cp-toolkit-<lang>.code-snippets`
- **Linux**: `~/.config/Code/User/snippets/cp-toolkit-<lang>.code-snippets`

### Visual Studio
- **Windows only**: `%USERPROFILE%\Documents\Visual Studio 2022\Code Snippets\<Visual C# | Visual C++>\My Code Snippets\cp-toolkit-<lang>.snippet`
- If Visual Studio 2022 is not found, the tool checks for Visual Studio 2019.

### JetBrains Rider
- **Windows**: `%APPDATA%\JetBrains\Rider<version>\templates\cp-toolkit-<lang>.xml`
- **macOS**: `~/Library/Application Support/JetBrains/Rider<version>/templates/cp-toolkit-<lang>.xml`
- **Linux**: `~/.config/JetBrains/Rider<version>/templates/cp-toolkit-<lang>.xml`

---

## Development

Run tests using the Node.js test runner:

```bash
npm test
```

Or from the repository root:

```bash
npm --prefix tools/cli test
```
