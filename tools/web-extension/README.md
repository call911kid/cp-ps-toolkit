# CP PS Toolkit — Web Extension

A browser extension that adds a docked IDE tool tab on supported problem-solving websites, opening a side panel with a live flyout code blade to search, browse, and copy competitive programming snippets.

---

## Features

- **Draggable tab**: Sits on the screen edge. Drag it up or down to place it where you want.
- **Side panel and code preview**: Click the tab or press `Alt+C` to open the list. Hover over any snippet to see its full code.
- **One-click copy**: Click any snippet or press `Enter` to copy it to your clipboard.
- **Keyboard navigation**: Move with arrow keys, copy with `Enter`, and close with `Escape`.
- **Search and filter**: Find snippets quickly and switch between C# and C++.
- **Sync and import**: Update snippets from GitHub or import local snippet files.
- **Supported websites**: Works on Codeforces, LeetCode, AtCoder, and CodeChef by default. Add custom domains or turn sites on and off in the popup.
- **Isolated styles**: Uses Shadow DOM so website styles do not break the extension.

---

## How to Install and Test Locally

### 1. In Chrome, Edge, or Brave:
1. Open your browser and go to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Turn on the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the folder `tools/web-extension`.
5. If already loaded, click the **Reload** button on the extension card.

### 2. In Firefox:
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file inside `tools/web-extension`.

---

## How to Use

1. Open any supported website (such as [Codeforces](https://codeforces.com) or [LeetCode](https://leetcode.com)).
2. Look at the right edge of the page. You will see the **{cp-toolkit}** tool tab.
3. Click the tab (or press `Alt+C`) to open the side panel.
4. Hover any snippet to inspect its code in the flyout card.
5. Click the snippet or press `Enter` to copy it to your clipboard.
6. Paste the code into your problem editor with `Ctrl+V`.

---

## Folder Structure

```text
tools/web-extension/
├── manifest.json            # Extension settings (Manifest V3)
├── package.json             # NPM package and build scripts
├── README.md                # Documentation and setup guide
├── background/
│   └── service-worker.js    # Background service worker for sync and storage setup
├── content/
│   ├── content.js           # Content script for side panel and flyout blade
│   └── content.css          # Styles for the content script UI
├── popup/
│   ├── popup.html           # Toolbar popup HTML layout
│   ├── popup.css            # Toolbar popup styles
│   └── popup.js             # Toolbar popup script for search, copy, and sync
├── data/
│   ├── github-config.json   # GitHub repository and folder configuration
│   └── websites.json        # Supported website domains
├── lib/
│   ├── prism.bundle.js      # Prism syntax highlighter library
│   └── prism-theme.css      # Syntax highlighter theme styles
├── scripts/
│   ├── build-prism.js       # Script to bundle Prism syntax grammars
│   └── package.js           # Script to create store zip distribution
└── icons/
    ├── icon-16.png          # 16x16 icon for the toolbar
    ├── icon-48.png          # 48x48 icon for the extensions page
    ├── icon-128.png         # 128x128 icon for store and dashboard
    ├── icon.svg             # Vector brand icon (transparent)
    └── icon-square.svg      # Vector brand squircle icon
```

---

## Development Scripts

From `tools/web-extension`:

- `npm run build:prism`: Rebuilds the Prism syntax highlighter bundle with C#, C++, Java, and Python grammars.
- `npm run package`: Creates a clean zip archive in `tools/web-extension/dist/` ready to upload to browser extension stores.

### Descriptions

- **`manifest.json`**: Extension configuration with permissions, content scripts, and accessible files.
- **`README.md`**: Setup guide and documentation.
- **`content/`**: Files injected into supported problem pages to show the side panel and code blade.
- **`popup/`**: Extension toolbar popup interface, styles, and logic.
- **`data/`**: Configuration files for GitHub sync and supported website domains.
- **`lib/`**: Third-party Prism syntax highlighter bundle and CSS theme.
- **`icons/`**: Extension icons in PNG and SVG formats.

