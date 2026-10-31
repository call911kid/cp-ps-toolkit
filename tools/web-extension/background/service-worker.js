const STORAGE_KEYS = {
  WEBSITES_CONFIG: 'websites_config',
  COLLECTIONS_META: 'collections_meta',
  ACTIVE_LANG: 'active_lang',
  SNIPPETS_PREFIX: 'snippets_',
  LAST_SYNC: 'last_sync',
  LAST_SYNCED_SHA: 'last_synced_sha',
  CACHED_REMOTE_SHA: 'cached_remote_sha',
  LAST_CHECK_TIME: 'last_check_time'
};

const DEFAULT_DOMAINS = [
  'codeforces.com',
  'leetcode.com',
  'atcoder.jp',
  'codechef.com'
];

const CACHE_TTL_MS = 5 * 60 * 1000;

function syncError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function fetchGitHubApi(url) {
  try {
    return await fetch(url, {
      cache: 'no-cache',
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
  } catch {
    throw syncError('network', 'Offline or connection failed');
  }
}

async function seedInitialData() {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.WEBSITES_CONFIG
    ]);

    if (!stored[STORAGE_KEYS.WEBSITES_CONFIG]) {
      let enabledDomains = DEFAULT_DOMAINS;
      try {
        const configUrl = chrome.runtime.getURL('data/websites.json');
        const res = await fetch(configUrl);
        const json = await res.json();
        if (Array.isArray(json.enabledDomains)) {
          enabledDomains = json.enabledDomains;
        }
      } catch {
        // Use default fallback
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.WEBSITES_CONFIG]: {
          enabledDomains,
          customWebsites: [],
          disabledWebsites: [],
          removedWebsites: []
        }
      });
    }
  } catch (err) {
    console.error('[Service Worker] Install seeding failed:', err);
  }
}

async function getGitHubConfig() {
  try {
    const configUrl = chrome.runtime.getURL('data/github-config.json');
    const res = await fetch(configUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[Service Worker] Failed to load github-config.json:', err);
  }
  return {
    owner: 'call911kid',
    repo: 'cp-ps-toolkit',
    branch: 'main',
    folderPath: '.snippets/web-extension'
  };
}

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

async function syncSnippetsFromGitHub() {
  const config = await getGitHubConfig();
  const folderUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeURIComponent(config.folderPath)}?ref=${encodeURIComponent(config.branch)}`;

  const res = await fetchGitHubApi(folderUrl);

  if (res.status === 404) {
    throw syncError('404', 'Folder not found on GitHub');
  }
  if (res.status === 403) {
    throw syncError('403', 'Rate limit exceeded');
  }
  if (!res.ok) {
    throw syncError(String(res.status), `GitHub API error (${res.status})`);
  }

  const items = await res.json();
  if (!Array.isArray(items)) {
    throw new Error('Configured path is not a folder');
  }

  const files = items.filter(item => item.type === 'file' && item.name.endsWith('.json'));
  if (files.length === 0) {
    throw syncError('empty', 'No snippet files found in folder');
  }

  const fetchResults = await Promise.allSettled(
    files.map(async file => {
      const fileUrl = file.download_url || `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${file.path}`;
      const fileRes = await fetch(fileUrl, { cache: 'no-cache' });
      if (!fileRes.ok) {
        throw new Error(`Failed to download ${file.name}`);
      }
      const rawText = await fileRes.text();
      const parsed = JSON.parse(stripBom(rawText));

      const fileName = file.name;
      const cleanId = 'gh_' + fileName.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');

      return {
        id: cleanId,
        label: fileName,
        data: parsed
      };
    })
  );

  const newGithubCollections = [];
  const storageUpdate = {};

  for (const result of fetchResults) {
    if (result.status === 'fulfilled') {
      const { id, label, data } = result.value;
      storageUpdate[STORAGE_KEYS.SNIPPETS_PREFIX + id] = data;
      newGithubCollections.push({
        id,
        label,
        source: 'GITHUB'
      });
    }
  }

  if (newGithubCollections.length === 0) {
    throw syncError('download', 'All file downloads failed');
  }

  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.COLLECTIONS_META,
    STORAGE_KEYS.CACHED_REMOTE_SHA
  ]);

  const existing = Array.isArray(stored[STORAGE_KEYS.COLLECTIONS_META])
    ? stored[STORAGE_KEYS.COLLECTIONS_META]
    : [];
  const localCollections = existing.filter(c => c.isCustom);

  storageUpdate[STORAGE_KEYS.COLLECTIONS_META] = [...newGithubCollections, ...localCollections];
  storageUpdate[STORAGE_KEYS.LAST_SYNC] = new Date().toISOString();
  if (stored[STORAGE_KEYS.CACHED_REMOTE_SHA]) {
    storageUpdate[STORAGE_KEYS.LAST_SYNCED_SHA] = stored[STORAGE_KEYS.CACHED_REMOTE_SHA];
  }

  await chrome.storage.local.set(storageUpdate);

  return {
    success: true,
    count: newGithubCollections.length
  };
}

async function checkGitHubUpdates() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.LAST_CHECK_TIME,
    STORAGE_KEYS.CACHED_REMOTE_SHA,
    STORAGE_KEYS.LAST_SYNCED_SHA
  ]);

  const now = Date.now();
  const lastCheck = stored[STORAGE_KEYS.LAST_CHECK_TIME];
  const cachedSha = stored[STORAGE_KEYS.CACHED_REMOTE_SHA];
  const lastSyncedSha = stored[STORAGE_KEYS.LAST_SYNCED_SHA];

  // Serve the cached SHA while the last check is fresh enough
  if (lastCheck && cachedSha && now - lastCheck < CACHE_TTL_MS) {
    return {
      hasUpdates: !lastSyncedSha || cachedSha !== lastSyncedSha,
      sha: cachedSha
    };
  }

  const config = await getGitHubConfig();
  const commitUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/commits?path=${encodeURIComponent(config.folderPath)}&sha=${encodeURIComponent(config.branch)}&per_page=1`;

  const res = await fetchGitHubApi(commitUrl);

  if (!res.ok) {
    throw syncError(String(res.status), `Commit check error: ${res.status}`);
  }

  const commits = await res.json();
  if (!Array.isArray(commits) || commits.length === 0) {
    return { hasUpdates: false };
  }

  const latestSha = commits[0].sha;

  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_CHECK_TIME]: now,
    [STORAGE_KEYS.CACHED_REMOTE_SHA]: latestSha
  });

  return {
    hasUpdates: !lastSyncedSha || lastSyncedSha !== latestSha,
    sha: latestSha
  };
}

chrome.runtime.onInstalled.addListener(() => {
  seedInitialData();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_GITHUB') {
    syncSnippetsFromGitHub()
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.code || 'failed', message: err.message }));
    return true;
  }

  if (message.type === 'CHECK_GITHUB_UPDATES') {
    checkGitHubUpdates()
      .then(res => sendResponse({ success: true, data: res }))
      .catch(err => sendResponse({ success: false, error: err.code || 'failed', message: err.message }));
    return true;
  }
});
