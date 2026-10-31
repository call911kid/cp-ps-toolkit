const STORAGE_KEYS = {
  WEBSITES_CONFIG: 'websites_config',
  COLLECTIONS_META: 'collections_meta',
  SNIPPETS_PREFIX: 'snippets_'
};

function stripBom(str) {
  return str.replace(/^\uFEFF/, '');
}

let collections = [];
let snippetsData = {};

let jsonWebsites = [];
let customWebsites = [];
let disabledWebsites = [];
let removedWebsites = [];
let currentTabDomain = null;

const railBtnSnippets = document.getElementById('rail-btn-snippets');
const railBtnWebsites = document.getElementById('rail-btn-websites');
const railBtnAbout = document.getElementById('rail-btn-about');

const viewSnippets = document.getElementById('view-snippets');
const viewWebsites = document.getElementById('view-websites');
const viewAbout = document.getElementById('view-about');

const snippetsHeaderActions = document.getElementById('snippets-header-actions');

const collectionsListEl = document.getElementById('collections-list');
const syncBtnEl = document.getElementById('sync-btn');
const importBtnEl = document.getElementById('import-btn');
const importFileInputEl = document.getElementById('import-file-input');

const syncRibbonEl = document.getElementById('sync-ribbon');

const addWebsiteInput = document.getElementById('add-website-input');
const websitesListEl = document.getElementById('websites-list');

function switchView(target) {
  railBtnSnippets.classList.toggle('active', target === 'snippets');
  railBtnWebsites.classList.toggle('active', target === 'websites');
  railBtnAbout.classList.toggle('active', target === 'about');

  railBtnSnippets.setAttribute('aria-selected', target === 'snippets' ? 'true' : 'false');
  railBtnWebsites.setAttribute('aria-selected', target === 'websites' ? 'true' : 'false');
  railBtnAbout.setAttribute('aria-selected', target === 'about' ? 'true' : 'false');

  viewSnippets.classList.toggle('hidden', target !== 'snippets');
  viewWebsites.classList.toggle('hidden', target !== 'websites');
  viewAbout.classList.toggle('hidden', target !== 'about');

  snippetsHeaderActions.style.display = target === 'snippets' ? 'flex' : 'none';
  if (syncRibbonEl) {
    syncRibbonEl.classList.toggle('view-hidden', target !== 'snippets');
  }
}

railBtnSnippets.addEventListener('click', () => switchView('snippets'));
railBtnWebsites.addEventListener('click', () => switchView('websites'));
railBtnAbout.addEventListener('click', () => switchView('about'));

function sanitizeDomain(input) {
  if (!input || typeof input !== 'string') return '';
  let domain = input.trim().toLowerCase();
  domain = domain.replace(/^[a-z]+:\/\//i, '');
  domain = domain.replace(/^[^@/]+@/, '');
  domain = domain.replace(/[/?#].*$/, '');
  domain = domain.replace(/:\d+$/, '');
  domain = domain.replace(/^www\./i, '');
  domain = domain.trim();

  if (domain === 'localhost') {
    return 'localhost';
  }

  const domainPattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
  if (!domainPattern.test(domain)) {
    return '';
  }

  return domain;
}

async function loadWebsitesData() {
  try {
    try {
      const configUrl = chrome.runtime.getURL('data/websites.json');
      const res = await fetch(configUrl);
      const config = await res.json();
      jsonWebsites = Array.isArray(config.enabledDomains) ? config.enabledDomains : [];
    } catch {
      jsonWebsites = [];
    }

    const stored = await chrome.storage.local.get([STORAGE_KEYS.WEBSITES_CONFIG]);
    const conf = stored[STORAGE_KEYS.WEBSITES_CONFIG] || {};

    customWebsites = Array.isArray(conf.customWebsites) ? conf.customWebsites : [];
    disabledWebsites = Array.isArray(conf.disabledWebsites) ? conf.disabledWebsites : [];
    removedWebsites = Array.isArray(conf.removedWebsites) ? conf.removedWebsites : [];

    await saveAndSyncWebsites();
    await detectCurrentTab();
    renderWebsitesList();
  } catch (err) {
    console.error('[CP PS Toolkit] Failed to load websites data:', err);
  }
}

function getActiveWebsitesList() {
  const combined = Array.from(new Set([...jsonWebsites, ...customWebsites]));
  return combined.filter(d => !removedWebsites.includes(d));
}

async function saveAndSyncWebsites() {
  const activeList = getActiveWebsitesList();
  const enabledDomains = activeList.filter(d => !disabledWebsites.includes(d));

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.WEBSITES_CONFIG]: {
        enabledDomains,
        customWebsites,
        disabledWebsites,
        removedWebsites
      }
    });
  } catch (err) {
    console.error('[CP PS Toolkit] Failed to save websites configuration:', err);
  }
}

async function detectCurrentTab() {
  try {
    if (!chrome.tabs || !chrome.tabs.query) return;

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const parsedUrl = new URL(tabs[0].url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        currentTabDomain = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
      }
    }
  } catch {
    // Current tab is not accessible
  }
}

function createWebsiteCard(domain, isEnabled, isCurrent, isSaved) {
  const card = document.createElement('div');
  card.className = `website-card ${isCurrent ? 'current-site-card' : ''}`;

  const left = document.createElement('div');
  left.className = 'website-card-left';

  const dot = document.createElement('span');
  dot.className = `website-dot ${isEnabled ? '' : 'off'}`;

  const nameSpan = document.createElement('span');
  nameSpan.className = `website-name ${isEnabled ? '' : 'disabled'}`;
  nameSpan.textContent = domain;
  nameSpan.title = domain;

  left.appendChild(dot);
  left.appendChild(nameSpan);

  if (isCurrent) {
    const badge = document.createElement('span');
    badge.className = 'current-site-badge';
    badge.textContent = 'current';
    left.appendChild(badge);
  }

  const right = document.createElement('div');
  right.className = 'website-card-right';

  if (isSaved) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'website-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Remove domain';
    deleteBtn.setAttribute('aria-label', 'Remove ' + domain);
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteWebsite(domain);
    });
    right.appendChild(deleteBtn);
  }

  const switchLabel = document.createElement('label');
  switchLabel.className = 'website-switch';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = isEnabled;
  checkbox.setAttribute('aria-label', 'Toggle ' + domain);
  checkbox.addEventListener('change', async () => {
    if (checkbox.checked) {
      removedWebsites = removedWebsites.filter(d => d !== domain);
      disabledWebsites = disabledWebsites.filter(d => d !== domain);
      if (!jsonWebsites.includes(domain) && !customWebsites.includes(domain)) {
        customWebsites.unshift(domain);
      }
    } else {
      if (!disabledWebsites.includes(domain)) {
        disabledWebsites.push(domain);
      }
    }
    await saveAndSyncWebsites();
    renderWebsitesList();
  });

  const slider = document.createElement('span');
  slider.className = 'website-slider';

  switchLabel.appendChild(checkbox);
  switchLabel.appendChild(slider);

  right.appendChild(switchLabel);

  card.appendChild(left);
  card.appendChild(right);

  return card;
}

function renderWebsitesList() {
  websitesListEl.replaceChildren();

  const activeList = getActiveWebsitesList();

  if (currentTabDomain) {
    const isSaved = activeList.includes(currentTabDomain);
    const isEnabled = isSaved && !disabledWebsites.includes(currentTabDomain);
    const currentCard = createWebsiteCard(currentTabDomain, isEnabled, true, isSaved);
    websitesListEl.appendChild(currentCard);
  }

  const remainingDomains = activeList.filter(d => d !== currentTabDomain);

  if (remainingDomains.length === 0 && !currentTabDomain) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.append('No websites added.', document.createElement('br'), 'Type a domain above and press Enter.');
    websitesListEl.appendChild(emptyDiv);
    return;
  }

  remainingDomains.forEach(domain => {
    const isEnabled = !disabledWebsites.includes(domain);
    const card = createWebsiteCard(domain, isEnabled, false, true);
    websitesListEl.appendChild(card);
  });
}

async function addWebsite(rawInput) {
  const domain = sanitizeDomain(rawInput);
  if (!domain) return;

  removedWebsites = removedWebsites.filter(d => d !== domain);
  disabledWebsites = disabledWebsites.filter(d => d !== domain);

  if (!jsonWebsites.includes(domain) && !customWebsites.includes(domain)) {
    customWebsites.unshift(domain);
  }

  await saveAndSyncWebsites();
  addWebsiteInput.value = '';
  renderWebsitesList();
}

async function deleteWebsite(domain) {
  customWebsites = customWebsites.filter(d => d !== domain);

  // Prevent default domains from reappearing if removed
  if (!removedWebsites.includes(domain)) {
    removedWebsites.push(domain);
  }

  disabledWebsites = disabledWebsites.filter(d => d !== domain);

  await saveAndSyncWebsites();
  renderWebsitesList();
}

if (addWebsiteInput) {
  addWebsiteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addWebsite(addWebsiteInput.value);
    }
  });
}

async function loadSnippetsData() {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.COLLECTIONS_META]);

    if (Array.isArray(stored[STORAGE_KEYS.COLLECTIONS_META])) {
      const raw = stored[STORAGE_KEYS.COLLECTIONS_META];
      collections = raw.filter(
        c => c && c.label !== 'C# (Core)' && c.label !== 'C++ (Core)' && c.id !== 'cs' && c.id !== 'cpp'
      );
      if (collections.length !== raw.length) {
        await chrome.storage.local.set({ [STORAGE_KEYS.COLLECTIONS_META]: collections });
        await chrome.storage.local.remove(['snippets_cs', 'snippets_cpp']);
      }
    } else {
      collections = [];
    }

    if (collections.length === 0) {
      snippetsData = {};
      renderCollectionsTable();
      return;
    }

    const keysToFetch = collections.map(c => `${STORAGE_KEYS.SNIPPETS_PREFIX}${c.id}`);
    const storedSnippets = await chrome.storage.local.get(keysToFetch);

    for (const c of collections) {
      const snippetKey = `${STORAGE_KEYS.SNIPPETS_PREFIX}${c.id}`;
      if (storedSnippets[snippetKey] && Object.keys(storedSnippets[snippetKey]).length > 0) {
        snippetsData[c.id] = storedSnippets[snippetKey];
      } else {
        snippetsData[c.id] = {};
      }
    }

    renderCollectionsTable();
  } catch (err) {
    console.error('[CP PS Toolkit] Failed to load snippets data:', err);
  }
}

function renderCollectionsTable() {
  collectionsListEl.replaceChildren();

  if (collections.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    const strongEl = document.createElement('strong');
    strongEl.textContent = '+ import';
    emptyDiv.append('No files loaded.', document.createElement('br'), 'Use ', strongEl, ' to add locally, or sync from GitHub above.');
    collectionsListEl.appendChild(emptyDiv);
    return;
  }

  collections.forEach(col => {
    const row = document.createElement('div');
    row.className = 'mono-row';

    const colFile = document.createElement('span');
    colFile.className = 'col-file';
    colFile.textContent = col.label;
    colFile.title = col.label;

    const colSource = document.createElement('span');
    colSource.className = 'col-source' + (col.isCustom ? ' local' : '');
    colSource.textContent = col.isCustom ? 'LOCAL' : 'GITHUB';

    const colAction = document.createElement('span');
    colAction.className = 'col-action';

    if (col.isCustom) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn-remove';
      removeBtn.textContent = '×';
      removeBtn.title = 'Remove file';
      removeBtn.setAttribute('aria-label', 'Remove ' + col.label);
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCollection(col.id);
      });
      colAction.appendChild(removeBtn);
    }

    row.appendChild(colFile);
    row.appendChild(colSource);
    row.appendChild(colAction);

    collectionsListEl.appendChild(row);
  });
}

async function removeCollection(id) {
  collections = collections.filter(c => c.id !== id);
  delete snippetsData[id];

  try {
    await chrome.storage.local.remove(`${STORAGE_KEYS.SNIPPETS_PREFIX}${id}`);
    await chrome.storage.local.set({
      [STORAGE_KEYS.COLLECTIONS_META]: collections
    });
  } catch (err) {
    console.error('[CP PS Toolkit] Failed to remove collection from storage:', err);
  }

  renderCollectionsTable();
}

async function handleSync() {
  syncBtnEl.disabled = true;
  const originalText = syncBtnEl.textContent;
  syncBtnEl.textContent = '~ syncing';

  let result;
  try {
    result = await chrome.runtime.sendMessage({ type: 'SYNC_GITHUB' });
  } catch (err) {
    console.error('[CP PS Toolkit] Sync request failed:', err);
    result = { success: false, error: 'network', message: 'Background service unreachable' };
  }

  if (!result || !result.success) {
    const code = result && result.error ? result.error : 'failed';
    if (code === '404') {
      syncBtnEl.textContent = '~ 404 not found';
    } else if (code === '403') {
      syncBtnEl.textContent = '~ rate limited';
    } else if (code === 'network') {
      syncBtnEl.textContent = '~ offline';
    } else if (code === 'empty') {
      syncBtnEl.textContent = '~ empty folder';
    } else {
      syncBtnEl.textContent = '~ failed';
    }

    const diffEl = document.getElementById('sync-git-diff');
    if (diffEl && syncRibbonEl && !syncRibbonEl.classList.contains('hidden')) {
      diffEl.textContent = result && result.message ? result.message : 'sync error';
    }

    setTimeout(() => {
      syncBtnEl.textContent = originalText;
      syncBtnEl.disabled = false;
    }, 2500);
    return;
  }

  // The background service already wrote the updated collections to storage.
  await loadSnippetsData();

  syncBtnEl.textContent = '~ done';
  setTimeout(() => {
    hideSyncRibbon();
  }, 1000);
  setTimeout(() => {
    syncBtnEl.textContent = originalText;
    syncBtnEl.disabled = false;
  }, 1500);
}

function showSyncRibbon(sha) {
  if (!syncRibbonEl) return;
  const shaEl = document.getElementById('sync-git-sha');
  if (shaEl) {
    shaEl.textContent = sha ? `[${sha.substring(0, 7)}]` : '';
  }
  const diffEl = document.getElementById('sync-git-diff');
  if (diffEl) {
    diffEl.textContent = 'updates available';
  }
  syncRibbonEl.classList.remove('hidden');
}

function hideSyncRibbon() {
  if (syncRibbonEl) {
    syncRibbonEl.classList.add('hidden');
  }
}

async function checkGitHubUpdates() {
  try {
    const result = await chrome.runtime.sendMessage({ type: 'CHECK_GITHUB_UPDATES' });
    if (!result || !result.success) {
      return;
    }

    const {
      hasUpdates,
      sha
    } = result.data;

    if (hasUpdates) {
      showSyncRibbon(sha);
    } else {
      hideSyncRibbon();
    }
  } catch (err) {
    console.warn('[CP PS Toolkit] Failed to check GitHub updates:', err);
  }
}

async function handleImport(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(stripBom(text));

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Snippets file must be a JSON object');
    }

    const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      throw new Error('Snippets file contains no entries');
    }

    for (const key of keys) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error('Forbidden property key in snippets');
      }
      const item = parsed[key];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new Error(`Snippet "${key}" is not an object`);
      }
      const isValidPrefix = typeof item.prefix === 'string' || (Array.isArray(item.prefix) && item.prefix.every(p => typeof p === 'string'));
      const isValidBody = typeof item.body === 'string' || (Array.isArray(item.body) && item.body.every(b => typeof b === 'string'));
      if (!isValidPrefix || !isValidBody) {
        throw new Error(`Snippet "${key}" missing valid prefix or body`);
      }
    }

    const fileName = file.name;
    const cleanId = 'local_' + fileName.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');

    const existingIndex = collections.findIndex(c => c.id === cleanId);
    if (existingIndex === -1) {
      collections.push({ id: cleanId, label: fileName, isCustom: true });
    } else {
      collections[existingIndex].label = fileName;
    }

    snippetsData[cleanId] = parsed;

    await chrome.storage.local.set({
      [STORAGE_KEYS.COLLECTIONS_META]: collections,
      [`${STORAGE_KEYS.SNIPPETS_PREFIX}${cleanId}`]: parsed
    });

    renderCollectionsTable();
  } catch (err) {
    console.error('[CP PS Toolkit] Import failed:', err);
    const originalText = importBtnEl.textContent;
    importBtnEl.textContent = '! invalid';
    importBtnEl.disabled = true;
    setTimeout(() => {
      importBtnEl.textContent = originalText;
      importBtnEl.disabled = false;
    }, 2000);
  } finally {
    importFileInputEl.value = '';
  }
}

syncBtnEl.addEventListener('click', handleSync);
importBtnEl.addEventListener('click', () => importFileInputEl.click());
importFileInputEl.addEventListener('change', handleImport);

loadSnippetsData();
loadWebsitesData();
checkGitHubUpdates();
