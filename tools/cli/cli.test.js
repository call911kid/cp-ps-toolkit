const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const CLI_PATH = path.resolve(__dirname, 'cli.js');

function runCli(args = []) {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI_PATH, ...args], (error, stdout, stderr) => {
      resolve({
        code: error ? (error.code ?? 1) : 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
  });
}

test('CLI Flags', async (t) => {
  await t.test('--help exits with code 0 and shows usage', async () => {
    const res = await runCli(['--help']);
    assert.equal(res.code, 0);
    assert.match(res.stdout, /Usage: npx cp-ps-toolkit/);
    assert.match(res.stdout, /--lang/);
    assert.match(res.stdout, /--editor/);
    assert.match(res.stdout, /--version/);
  });

  await t.test('--version and -v return valid semver format', async () => {
    const resLong = await runCli(['--version']);
    assert.equal(resLong.code, 0);
    assert.match(resLong.stdout, /^\d+\.\d+\.\d+$/);

    const resShort = await runCli(['-v']);
    assert.equal(resShort.code, 0);
    assert.equal(resShort.stdout, resLong.stdout);
  });

  await t.test('unknown language exits with code 1', async () => {
    const res = await runCli(['--lang', 'invalid_lang']);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /Error: Unknown language 'invalid_lang'/);
  });

  await t.test('unknown editor exits with code 1', async () => {
    const res = await runCli(['--editor', 'notepad']);
    assert.equal(res.code, 1);
    assert.match(res.stderr, /Error: Unknown editor 'notepad'/);
  });
});

test('Snippets Installation and Removal', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-cli-test-'));

  t.after(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  await t.test('installs VS Code C# snippets to output folder', async () => {
    const res = await runCli(['--lang', 'cs', '--editor', 'vscode', '--output', tempDir]);
    assert.equal(res.code, 0);

    const snippetFile = path.join(tempDir, 'cp-toolkit-csharp.code-snippets');
    assert.ok(fs.existsSync(snippetFile), 'Snippet file should exist on disk');

    const content = JSON.parse(fs.readFileSync(snippetFile, 'utf8'));
    assert.ok(Object.keys(content).length > 0, 'Snippet file should contain snippets');
  });

  await t.test('removes installed VS Code C# snippets', async () => {
    const snippetFile = path.join(tempDir, 'cp-toolkit-csharp.code-snippets');
    assert.ok(fs.existsSync(snippetFile), 'Snippet file should exist before removal');

    const res = await runCli(['--remove', '--lang', 'cs', '--editor', 'vscode', '--output', tempDir]);
    assert.equal(res.code, 0);
    assert.ok(!fs.existsSync(snippetFile), 'Snippet file should be deleted after removal');
  });
});

test('Web Extension Export', async (t) => {
  const tempExtDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-cli-ext-test-'));

  t.after(() => {
    if (fs.existsSync(tempExtDir)) {
      fs.rmSync(tempExtDir, { recursive: true, force: true });
    }
  });

  await t.test('exports extension files to target directory', async () => {
    const res = await runCli(['--extension', '--output', tempExtDir]);
    assert.equal(res.code, 0);

    const manifestFile = path.join(tempExtDir, 'manifest.json');
    assert.ok(fs.existsSync(manifestFile), 'manifest.json should exist in exported directory');

    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    assert.ok(manifest.name, 'manifest.json should have a name field');
  });
});
