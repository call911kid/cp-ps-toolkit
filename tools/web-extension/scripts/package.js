const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const extensionDir = path.join(__dirname, '..');
const distDir = path.join(extensionDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const zipPath = path.join(distDir, 'cp-ps-toolkit-extension.zip');
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Package complete: ${zipPath} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Include essential files only
archive.file(path.join(extensionDir, 'manifest.json'), { name: 'manifest.json' });
archive.file(path.join(extensionDir, 'README.md'), { name: 'README.md' });
archive.directory(path.join(extensionDir, 'background'), 'background');
archive.directory(path.join(extensionDir, 'content'), 'content');
archive.directory(path.join(extensionDir, 'popup'), 'popup');
archive.directory(path.join(extensionDir, 'lib'), 'lib');
archive.directory(path.join(extensionDir, 'data'), 'data');
archive.directory(path.join(extensionDir, 'icons'), 'icons');

archive.finalize();
