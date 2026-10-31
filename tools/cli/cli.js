#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const REPO = 'call911kid/cp-ps-toolkit';
const BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/.snippets/`;

const LANG_MAP = {
  cs: { vsLang: 'csharp', vsFolder: 'Visual C#' },
  cpp: { vsLang: 'cpp', vsFolder: 'Visual C++' }
};

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = 'cs';
  let editor = 'all';
  let editorExplicit = false;
  let output = null;
  let isRemove = false;
  let isExtension = false;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--lang' || args[i] === '-l') && i + 1 < args.length) {
      lang = args[++i].toLowerCase();
    } else if ((args[i] === '--editor' || args[i] === '-e') && i + 1 < args.length) {
      editor = args[++i].toLowerCase();
      editorExplicit = true;
    } else if ((args[i] === '--output' || args[i] === '-o') && i + 1 < args.length) {
      output = args[++i];
    } else if (args[i] === '--remove' || args[i] === '-r' || args[i] === 'remove' || args[i] === 'uninstall') {
      isRemove = true;
    } else if (args[i] === '--extension' || args[i] === '-ext' || args[i] === 'extension') {
      isExtension = true;
    } else if (args[i] === '--version' || args[i] === '-v' || args[i] === 'version') {
      try {
        const pkg = require('./package.json');
        console.log(pkg.version);
      } catch {
        console.log('1.0.1');
      }
      process.exit(0);
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Usage: npx cp-ps-toolkit [options]

Options:
  --lang, -l        Language to install/remove: cs, cpp (default: cs)
  --editor, -e      Editor target: vscode, vs, rider, all (default: all)
  --output, -o      Custom output directory (e.g. .vscode, ./snippets, ./extension)
  --extension, -ext Export browser extension folder for Chrome, Edge, Brave, Firefox
  --remove, -r      Remove/uninstall installed snippets from editor directories
  --version, -v     Show version
  --help, -h        Show help
`);
      process.exit(0);
    }
  }

  if (!isExtension) {
    if (!LANG_MAP[lang]) {
      console.error(`Error: Unknown language '${lang}'. Supported: ${Object.keys(LANG_MAP).join(', ')}`);
      process.exit(1);
    }

    const validEditors = ['vscode', 'vs', 'rider', 'all'];
    if (!validEditors.includes(editor)) {
      console.error(`Error: Unknown editor '${editor}'. Supported: ${validEditors.join(', ')}`);
      process.exit(1);
    }

    // If targeting a .vscode folder without explicit editor choice, default to vscode
    if (output && !editorExplicit && (output === '.vscode' || output.endsWith('/.vscode') || output.endsWith('\\.vscode'))) {
      editor = 'vscode';
    }
  }

  return { lang, editor, output, isRemove, isExtension };
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.text();
}

function getVsCodeSnippetDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Code', 'User', 'snippets');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'snippets');
  }
  return path.join(os.homedir(), '.config', 'Code', 'User', 'snippets');
}

function getVisualStudioSnippetDir(vsFolder) {
  if (process.platform !== 'win32' || !process.env.USERPROFILE) return null;

  const vsBase = path.join(process.env.USERPROFILE, 'Documents', 'Visual Studio 2022');
  if (!fs.existsSync(vsBase)) {
    const vsLegacy = path.join(process.env.USERPROFILE, 'Documents', 'Visual Studio 2019');
    if (!fs.existsSync(vsLegacy)) return null;
    return path.join(vsLegacy, 'Code Snippets', vsFolder, 'My Code Snippets');
  }
  return path.join(vsBase, 'Code Snippets', vsFolder, 'My Code Snippets');
}

function getRiderSnippetDirs() {
  let jetbrainsBase = null;
  if (process.platform === 'win32') {
    jetbrainsBase = path.join(process.env.APPDATA || '', 'JetBrains');
  } else if (process.platform === 'darwin') {
    jetbrainsBase = path.join(os.homedir(), 'Library', 'Application Support', 'JetBrains');
  } else {
    jetbrainsBase = path.join(os.homedir(), '.config', 'JetBrains');
  }

  if (!jetbrainsBase || !fs.existsSync(jetbrainsBase)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(jetbrainsBase, { withFileTypes: true });
    return entries
      .filter(d => d.isDirectory() && d.name.toLowerCase().startsWith('rider'))
      .map(d => path.join(jetbrainsBase, d.name, 'templates'));
  } catch {
    return [];
  }
}

async function installVsCode(langConfig, customOutDir) {
  const vsCodeDir = customOutDir ? path.resolve(process.cwd(), customOutDir) : getVsCodeSnippetDir();
  fs.mkdirSync(vsCodeDir, { recursive: true });

  const url = `${RAW_BASE}vscode/cp-toolkit-${langConfig.vsLang}.code-snippets`;
  const content = await fetchText(url);
  const destFile = path.join(vsCodeDir, `cp-toolkit-${langConfig.vsLang}.code-snippets`);
  fs.writeFileSync(destFile, content, 'utf8');

  const count = Object.keys(JSON.parse(content)).length;
  console.log(`[VS Code] Installed ${count} ${langConfig.vsLang} snippets to:`);
  console.log(`  ${destFile}`);
  return true;
}

async function installVisualStudio(langConfig, customOutDir) {
  const vsDir = customOutDir ? path.resolve(process.cwd(), customOutDir) : getVisualStudioSnippetDir(langConfig.vsFolder);
  if (!vsDir) {
    console.log('[Visual Studio] Skipped: Visual Studio installation not detected.');
    return false;
  }

  fs.mkdirSync(vsDir, { recursive: true });
  const url = `${RAW_BASE}vs/cp-toolkit-${langConfig.vsLang}.snippet`;
  const xml = await fetchText(url);
  const destFile = path.join(vsDir, `cp-toolkit-${langConfig.vsLang}.snippet`);
  fs.writeFileSync(destFile, xml, 'utf8');

  const count = new Set([...xml.matchAll(/<Title>([^(\s]+)/g)].map(m => m[1])).size || (xml.match(/<CodeSnippet\b/g) || []).length;
  console.log(`[Visual Studio] Installed ${count} ${langConfig.vsLang} snippets to:`);
  console.log(`  ${destFile}`);
  return true;
}

async function installRider(langConfig, customOutDir) {
  const targetDirs = customOutDir ? [path.resolve(process.cwd(), customOutDir)] : getRiderSnippetDirs();
  if (targetDirs.length === 0) {
    console.log('[Rider] Skipped: JetBrains Rider installation not detected.');
    return false;
  }

  const url = `${RAW_BASE}rider/cp-toolkit-${langConfig.vsLang}.xml`;
  const xml = await fetchText(url);
  const count = new Set([...xml.matchAll(/description="([^"]+)"/g)].map(m => m[1])).size || (xml.match(/<template\b/g) || []).length;

  for (const dir of targetDirs) {
    fs.mkdirSync(dir, { recursive: true });
    const destFile = path.join(dir, `cp-toolkit-${langConfig.vsLang}.xml`);
    fs.writeFileSync(destFile, xml, 'utf8');
    console.log(`[Rider] Installed ${count} ${langConfig.vsLang} templates to:`);
    console.log(`  ${destFile}`);
  }
  return true;
}

function removeVsCode(langConfig, customOutDir) {
  const vsCodeDir = customOutDir ? path.resolve(process.cwd(), customOutDir) : getVsCodeSnippetDir();
  const targetFile = path.join(vsCodeDir, `cp-toolkit-${langConfig.vsLang}.code-snippets`);
  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log(`[VS Code] Removed: ${targetFile}`);
    return true;
  }
  console.log(`[VS Code] Snippet file not found: ${targetFile}`);
  return false;
}

function removeVisualStudio(langConfig, customOutDir) {
  const vsDir = customOutDir ? path.resolve(process.cwd(), customOutDir) : getVisualStudioSnippetDir(langConfig.vsFolder);
  if (!vsDir) {
    console.log('[Visual Studio] Skipped: Visual Studio installation not detected.');
    return false;
  }
  const targetFile = path.join(vsDir, `cp-toolkit-${langConfig.vsLang}.snippet`);
  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log(`[Visual Studio] Removed: ${targetFile}`);
    return true;
  }
  console.log(`[Visual Studio] Snippet file not found: ${targetFile}`);
  return false;
}

function removeRider(langConfig, customOutDir) {
  const targetDirs = customOutDir ? [path.resolve(process.cwd(), customOutDir)] : getRiderSnippetDirs();
  if (targetDirs.length === 0) {
    if (!customOutDir) {
      console.log('[Rider] Skipped: JetBrains Rider installation not detected.');
    }
    return false;
  }

  let removedAny = false;
  for (const dir of targetDirs) {
    const targetFile = path.join(dir, `cp-toolkit-${langConfig.vsLang}.xml`);
    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
      console.log(`[Rider] Removed: ${targetFile}`);
      removedAny = true;
    } else {
      console.log(`[Rider] Template file not found: ${targetFile}`);
    }
  }
  return removedAny;
}

function openDirectory(dirPath) {
  const platform = process.platform;
  let cmd = '';
  if (platform === 'win32') {
    cmd = `explorer.exe "${dirPath}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${dirPath}"`;
  } else {
    cmd = `xdg-open "${dirPath}"`;
  }

  exec(cmd, () => {
    // Ignore error if system cannot open GUI folder (e.g. headless/CI)
  });
}

function getExtensionSourceDir() {
  const bundled = path.resolve(__dirname, 'web-extension');
  if (fs.existsSync(bundled)) return bundled;

  const repo = path.resolve(__dirname, '..', 'web-extension');
  if (fs.existsSync(repo)) return repo;

  return null;
}

function exportExtension(customOutDir) {
  const sourceDir = getExtensionSourceDir();
  if (!sourceDir) {
    console.error('Error: Web extension source folder not found.');
    return false;
  }

  const destDir = customOutDir
    ? path.resolve(process.cwd(), customOutDir)
    : path.join(os.homedir(), '.cp-ps-toolkit', 'extension');

  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourceDir, destDir, { recursive: true });

  console.log('Web extension files exported to:');
  console.log(`  ${destDir}\n`);

  openDirectory(destDir);

  console.log('To install the extension in your browser:');
  console.log('1. Chrome, Edge, or Brave:');
  console.log('   - Open chrome://extensions (or edge://extensions, brave://extensions)');
  console.log('   - Turn on "Developer mode" in the top-right corner');
  console.log('   - Click "Load unpacked" and select the folder above\n');
  console.log('2. Firefox:');
  console.log('   - Open about:debugging#/runtime/this-firefox');
  console.log('   - Click "Load Temporary Add-on..."');
  console.log(`   - Select the manifest.json file inside: ${destDir}\n`);

  return true;
}

const EDITORS = [
  {
    id: 'vscode',
    name: 'VS Code',
    install: installVsCode,
    remove: removeVsCode,
    isSupported: () => true
  },
  {
    id: 'vs',
    name: 'Visual Studio',
    install: installVisualStudio,
    remove: removeVisualStudio,
    isSupported: (out) => Boolean(out || process.platform === 'win32'),
    unsupportedMsg: 'Visual Studio is only supported on Windows.'
  },
  {
    id: 'rider',
    name: 'Rider',
    install: installRider,
    remove: removeRider,
    isSupported: () => true
  }
];

async function main() {
  const { lang, editor, output, isRemove, isExtension } = parseArgs();

  if (isExtension) {
    console.log('Exporting browser extension...');
    const ok = exportExtension(output);
    if (!ok) {
      process.exit(1);
    }
    console.log('Export completed.');
    return;
  }

  const langConfig = LANG_MAP[lang];

  if (isRemove) {
    console.log(`Removing ${langConfig.vsLang} snippets...`);
    let errors = 0;

    for (const ed of EDITORS) {
      if (editor === 'all' || editor === ed.id) {
        if (!ed.isSupported(output)) {
          if (editor === ed.id) {
            errors++;
            console.error(`Error: ${ed.unsupportedMsg}`);
          } else {
            console.log(`[${ed.name}] Skipped: ${ed.unsupportedMsg}`);
          }
          continue;
        }

        try {
          ed.remove(langConfig, output);
        } catch (err) {
          errors++;
          console.error(`Error: Failed to remove ${ed.name} snippets: ${err.message}`);
        }
      }
    }

    if (errors > 0) {
      console.error(`Removal finished with ${errors} error(s).`);
      process.exit(1);
    }

    console.log('Removal completed.');
    return;
  }

  console.log(`Installing ${langConfig.vsLang} snippets...`);
  let errors = 0;
  let installedCount = 0;

  for (const ed of EDITORS) {
    if (editor === 'all' || editor === ed.id) {
      if (!ed.isSupported(output)) {
        if (editor === ed.id) {
          errors++;
          console.error(`Error: ${ed.unsupportedMsg}`);
        } else {
          console.log(`[${ed.name}] Skipped: ${ed.unsupportedMsg}`);
        }
        continue;
      }

      try {
        if (await ed.install(langConfig, output)) {
          installedCount++;
        }
      } catch (err) {
        errors++;
        console.error(`Error: Failed to install ${ed.name} snippets: ${err.message}`);
      }
    }
  }

  if (errors > 0) {
    console.error(`Installation finished with ${errors} error(s).`);
    process.exit(1);
  }

  if (installedCount === 0) {
    console.log('No snippets were installed (no matching editors found). Use --output to specify a target directory.');
    return;
  }

  console.log('Installation completed.');
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
