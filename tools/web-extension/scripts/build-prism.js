const fs = require('fs');
const path = require('path');

const prismDir = path.join(__dirname, '..', 'node_modules', 'prismjs');
const outputBundle = path.join(__dirname, '..', 'lib', 'prism.bundle.js');

const filesToBundle = [
  'components/prism-core.js',
  'components/prism-markup.js',
  'components/prism-css.js',
  'components/prism-clike.js',
  'components/prism-javascript.js',
  'components/prism-c.js',
  'components/prism-cpp.js',
  'components/prism-csharp.js',
  'components/prism-java.js',
  'components/prism-python.js',
  'plugins/file-highlight/prism-file-highlight.js'
];

let bundleContent = '/* Bundled PrismJS with Core, Markup, CSS, CLike, JS, C, C++, C#, Java, Python */\n';

for (const relPath of filesToBundle) {
  const fullPath = path.join(prismDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing Prism component: ${fullPath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  bundleContent += `\n/* --- ${path.basename(relPath)} --- */\n`;
  bundleContent += content + '\n';
}

fs.writeFileSync(outputBundle, bundleContent, 'utf8');
console.log(`Prism bundle written to ${outputBundle} (${(bundleContent.length / 1024).toFixed(1)} KB)`);
