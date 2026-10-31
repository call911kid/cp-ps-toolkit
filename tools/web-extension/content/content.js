(async function initCpToolkit() {

  const STORAGE_KEYS = {
    WEBSITES_CONFIG: 'websites_config',
    ACTIVE_LANG: 'active_lang',
    COLLECTIONS_META: 'collections_meta',
    SNIPPETS_PREFIX: 'snippets_',
    TRIGGER_TAB_TOP_PCT: 'trigger_tab_top_pct'
  };

  const LANG_MAP = {
    cs: 'csharp',
    csharp: 'csharp',
    'c#': 'csharp',
    cpp: 'cpp',
    'c++': 'cpp',
    py: 'python',
    python: 'python',
    java: 'java',
    js: 'javascript',
    javascript: 'javascript',
    ts: 'javascript',
    typescript: 'javascript'
  };

  const TOAST_DURATION_MS = 1800;
  const SEARCH_FOCUS_DELAY_MS = 50;
  const FLYOUT_HIDE_DELAY_MS = 250;
  const SEARCH_DEBOUNCE_MS = 100;
  const DRAG_THRESHOLD_PX = 4;
  const TAB_MIN_PCT = 5;
  const TAB_MAX_PCT = 95;


  function checkDomainMatch(enabledDomains) {
    if (!Array.isArray(enabledDomains)) return false;
    const isFile = window.location.protocol === 'file:';
    const hostname = window.location.hostname;

    return isFile
      ? enabledDomains.includes('file')
      : enabledDomains.some(d => {
          if (d === 'localhost' && (hostname === 'localhost' || hostname === '127.0.0.1')) return true;
          return hostname === d || hostname.endsWith('.' + d);
        });
  }

  async function getInitialDomains() {
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEYS.WEBSITES_CONFIG]);
      const configObj = stored[STORAGE_KEYS.WEBSITES_CONFIG];
      if (configObj && Array.isArray(configObj.enabledDomains)) {
        return configObj.enabledDomains;
      }

      const configUrl = chrome.runtime.getURL('data/websites.json');
      const res = await fetch(configUrl);
      const config = await res.json();
      const enabledDomains = Array.isArray(config.enabledDomains) ? config.enabledDomains : [];

      await chrome.storage.local.set({
        [STORAGE_KEYS.WEBSITES_CONFIG]: {
          enabledDomains,
          customWebsites: [],
          disabledWebsites: [],
          removedWebsites: []
        }
      });
      return enabledDomains;
    } catch (err) {
      console.error('[CP PS Toolkit] Failed to load website permissions:', err);
      return [];
    }
  }

  function getSyntaxLanguage(id) {
    if (!id) return 'clike';
    const cleanId = id.toLowerCase().trim();
    if (LANG_MAP[cleanId]) {
      return LANG_MAP[cleanId];
    }
    const sortedKeys = Object.keys(LANG_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (cleanId.includes(key)) {
        return LANG_MAP[key];
      }
    }
    return 'clike';
  }


  let isMounted = false;
  let isOpen = false;
  let isPanelAttached = false;

  let collections = [];
  let activeLang = '';
  let rawSnippets = {};
  let snippetList = [];
  let filteredList = [];
  let activeSnippet = null;
  let searchQuery = '';
  let highlightedIndex = 0;

  let isHoveringFlyoutCard = false;
  let flyoutHideTimer = null;
  let searchDebounceTimer = null;

  let isDraggingTab = false;
  let hasDraggedTab = false;
  let dragStartY = 0;
  let dragStartTopPx = 0;
  let latestPointerY = 0;
  let dragRafId = null;

  // DOM node references
  let host = null;
  let shadow = null;
  let triggerEl = null;
  let overlayEl = null;
  let panelEl = null;
  let flyoutCardEl = null;
  let toastEl = null;

  let closeBtn = null;
  let collectionBar = null;
  let customDropdown = null;
  let customDropdownBtn = null;
  let customDropdownLabel = null;
  let customDropdownMenu = null;
  let searchInput = null;
  let countBadge = null;
  let listViewport = null;

  let flyoutTags = null;
  let flyoutDesc = null;
  let flyoutCode = null;


  async function loadSnippetsData() {
    try {
      const stored = await chrome.storage.local.get([
        STORAGE_KEYS.ACTIVE_LANG,
        STORAGE_KEYS.COLLECTIONS_META
      ]);
      const rawMeta = stored[STORAGE_KEYS.COLLECTIONS_META];
      if (Array.isArray(rawMeta)) {
        collections = rawMeta.filter(
          c => c && c.label !== 'C# (Core)' && c.label !== 'C++ (Core)' && c.id !== 'cs' && c.id !== 'cpp'
        );
      } else {
        collections = [];
      }

      const savedLang = stored[STORAGE_KEYS.ACTIVE_LANG];
      if (savedLang && collections.some(c => c.id === savedLang)) {
        activeLang = savedLang;
      } else {
        activeLang = collections[0] ? collections[0].id : '';
      }

      if (collections.length === 0) {
        rawSnippets = {};
        renderLangTabs();
        updateActiveList();
        return;
      }

      const keysToFetch = collections.map(c => STORAGE_KEYS.SNIPPETS_PREFIX + c.id);
      const storedSnippets = await chrome.storage.local.get(keysToFetch);

      for (const c of collections) {
        const fullKey = STORAGE_KEYS.SNIPPETS_PREFIX + c.id;
        if (storedSnippets[fullKey] && Object.keys(storedSnippets[fullKey]).length > 0) {
          rawSnippets[c.id] = storedSnippets[fullKey];
        } else {
          rawSnippets[c.id] = {};
        }
      }

      renderLangTabs();
      updateActiveList();
    } catch (err) {
      console.error('[CP PS Toolkit] Failed to load snippets from storage:', err);
    }
  }

  function updateActiveList() {
    const map = rawSnippets[activeLang] || {};
    const keys = Object.keys(map);

    if (keys.length > 0) {
      snippetList = keys.map(key => {
        const item = map[key];
        const prefixes = Array.isArray(item.prefix) ? item.prefix : [item.prefix || key];
        const body = Array.isArray(item.body) ? item.body.join('\n') : (item.body || '');
        const methodName = prefixes.length > 0 ? prefixes[prefixes.length - 1] : key;
        return {
          name: methodName,
          key,
          prefixes,
          primaryPrefix: prefixes[0] || key,
          body,
          description: item.description || ''
        };
      });
    } else {
      snippetList = [];
    }

    filterList();
  }

  function filterList() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      filteredList = [...snippetList];
    } else {
      filteredList = snippetList.filter(s => {
        return (
          s.name.toLowerCase().includes(q) ||
          s.primaryPrefix.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.prefixes.some(p => p.toLowerCase().includes(q))
        );
      });
    }

    if (highlightedIndex >= filteredList.length) {
      highlightedIndex = Math.max(0, filteredList.length - 1);
    }

    renderList();
  }

  async function copySnippet(bodyText) {
    let copied = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(bodyText);
        copied = true;
      } catch {
        // Fall back to textarea if clipboard API fails
      }
    }

    if (!copied) {
      try {
        const ta = document.createElement('textarea');
        ta.value = bodyText;
        const parent = document.body || document.documentElement;
        if (parent) {
          parent.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          parent.removeChild(ta);
          copied = true;
        }
      } catch (err) {
        console.error('[CP PS Toolkit] Failed to copy code:', err);
      }
    }

    if (copied) {
      showToast('Snippet copied to clipboard!');
    }
  }


  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg || 'Snippet copied to clipboard!';
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, TOAST_DURATION_MS);
  }

  function ensurePanelAttached() {
    if (isPanelAttached || !shadow) return;
    shadow.appendChild(overlayEl);
    shadow.appendChild(panelEl);
    shadow.appendChild(flyoutCardEl);
    shadow.appendChild(toastEl);
    isPanelAttached = true;
  }

  function toggleOpen(open) {
    if (!isMounted || !panelEl || !triggerEl || !overlayEl) return;
    const shouldOpen = typeof open === 'boolean' ? open : !isOpen;
    if (shouldOpen === isOpen) return;
    isOpen = shouldOpen;

    if (isOpen) {
      ensurePanelAttached();
      void panelEl.offsetWidth;

      triggerEl.classList.add('tab-hidden');
      overlayEl.classList.add('open');
      panelEl.classList.add('open');
      setTimeout(() => {
        if (isOpen && searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, SEARCH_FOCUS_DELAY_MS);

      if (filteredList.length > 0 && listViewport) {
        const firstRow = listViewport.querySelector('.panel-item-row');
        showFlyout(filteredList[highlightedIndex] || filteredList[0], firstRow);
      }
    } else {
      triggerEl.classList.remove('tab-hidden');
      overlayEl.classList.remove('open');
      panelEl.classList.remove('open');
      clearTimeout(flyoutHideTimer);
      clearTimeout(searchDebounceTimer);
      isHoveringFlyoutCard = false;
      hideFlyoutCard();
      if (searchInput) {
        searchInput.blur();
      }
    }
  }

  function showFlyout(item, el) {
    if (!isOpen || !item || !flyoutCardEl || !flyoutTags || !flyoutDesc || !flyoutCode) return;
    activeSnippet = item;
    flyoutTags.innerHTML = '';
    const tags = Array.isArray(item.prefixes) && item.prefixes.length > 0
      ? item.prefixes
      : [item.primaryPrefix || item.key];
    tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'flyout-tag';
      tagSpan.textContent = tag;
      flyoutTags.appendChild(tagSpan);
    });
    flyoutDesc.textContent = item.description || 'No description provided.';

    const lang = getSyntaxLanguage(activeLang);
    flyoutCode.className = 'language-' + lang;

    if (typeof Prism !== 'undefined' && Prism.languages && Prism.languages[lang]) {
      try {
        flyoutCode.innerHTML = Prism.highlight(item.body || '', Prism.languages[lang], lang);
      } catch {
        flyoutCode.textContent = item.body || '';
      }
    } else {
      flyoutCode.textContent = item.body || '';
    }

    flyoutCardEl.classList.add('show');

    if (el) {
      const margin = 12;
      const windowHeight = window.innerHeight;
      const cardHeight = flyoutCardEl.offsetHeight;
      const elRect = el.getBoundingClientRect();

      let targetTop = elRect.top - 10;
      const maxAllowedTop = windowHeight - cardHeight - margin;
      if (targetTop > maxAllowedTop) {
        targetTop = maxAllowedTop;
      }
      if (targetTop < margin) {
        targetTop = margin;
      }

      flyoutCardEl.style.top = `${targetTop}px`;
    }
  }

  function hideFlyoutCard() {
    if (flyoutCardEl) {
      flyoutCardEl.classList.remove('show');
    }
  }

  function renderLangTabs() {
    if (!customDropdownMenu || !customDropdownLabel) return;
    customDropdownMenu.innerHTML = '';

    if (collections.length <= 1) {
      if (collectionBar) collectionBar.style.display = 'none';
      return;
    }

    if (collectionBar) collectionBar.style.display = 'block';

    const currentCol = collections.find(c => c.id === activeLang) || collections[0];
    customDropdownLabel.textContent = currentCol ? currentCol.label : 'Select Collection';

    collections.forEach(col => {
      const item = document.createElement('div');
      item.className = 'custom-dropdown-item' + (col.id === activeLang ? ' active' : '');
      item.textContent = col.label;

      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (customDropdown) customDropdown.classList.remove('open');
        if (activeLang === col.id) return;
        activeLang = col.id;
        customDropdownLabel.textContent = col.label;
        await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_LANG]: activeLang });
        renderLangTabs();
        updateActiveList();
      });

      customDropdownMenu.appendChild(item);
    });
  }

  function renderList() {
    if (!listViewport || !countBadge) return;
    countBadge.textContent = filteredList.length;
    listViewport.innerHTML = '';

    if (!filteredList.length) {
      const empty = document.createElement('div');
      empty.className = 'panel-empty-msg';
      empty.textContent = snippetList.length === 0
        ? 'No snippets loaded. Open extension popup to sync.'
        : 'No matching snippets found.';
      listViewport.appendChild(empty);
      hideFlyoutCard();
      return;
    }

    filteredList.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'panel-item-row' + (idx === highlightedIndex ? ' selected' : '');
      row.dataset.index = String(idx);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'panel-item-name';
      nameSpan.textContent = item.name;
      row.appendChild(nameSpan);

      listViewport.appendChild(row);
    });
  }

  function updateSelectedRow() {
    if (!listViewport) return;
    const rows = listViewport.querySelectorAll('.panel-item-row');
    rows.forEach((r, i) => {
      r.classList.toggle('selected', i === highlightedIndex);
    });
  }

  function bindListViewportDelegation() {
    if (!listViewport) return;

    listViewport.addEventListener('mouseover', e => {
      if (!isOpen) return;
      const row = e.target.closest('.panel-item-row');
      if (!row) return;
      if (e.relatedTarget && row.contains(e.relatedTarget)) return;

      clearTimeout(flyoutHideTimer);
      const idx = Number(row.dataset.index);
      if (!Number.isNaN(idx) && filteredList[idx]) {
        highlightedIndex = idx;
        updateSelectedRow();
        showFlyout(filteredList[idx], row);
      }
    });

    listViewport.addEventListener('mouseout', e => {
      const row = e.target.closest('.panel-item-row');
      if (!row) return;
      if (e.relatedTarget && row.contains(e.relatedTarget)) return;

      clearTimeout(flyoutHideTimer);
      flyoutHideTimer = setTimeout(() => {
        if (!isHoveringFlyoutCard) {
          hideFlyoutCard();
        }
      }, FLYOUT_HIDE_DELAY_MS);
    });

    listViewport.addEventListener('click', e => {
      const row = e.target.closest('.panel-item-row');
      if (!row) return;
      const idx = Number(row.dataset.index);
      if (!Number.isNaN(idx) && filteredList[idx]) {
        highlightedIndex = idx;
        updateSelectedRow();
        copySnippet(filteredList[idx].body);
      }
    });
  }


  function createShadowRoot() {
    host = document.createElement('div');
    host.id = 'cp-toolkit-root';
    shadow = host.attachShadow({ mode: 'open' });

    const prismLink = document.createElement('link');
    prismLink.rel = 'stylesheet';
    prismLink.href = chrome.runtime.getURL('lib/prism-theme.css');
    shadow.appendChild(prismLink);

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('content/content.css');
    shadow.appendChild(styleLink);
  }

  function createTriggerElement() {
    triggerEl = document.createElement('aside');
    triggerEl.className = 'trigger-bracket-tab';
    triggerEl.title = 'CP PS Toolkit (Alt+C)';
    triggerEl.innerHTML = `
      <div class="tab-brand-icon">
        <svg viewBox="0 0 64 64">
          <g transform="translate(2, 2)">
            <path d="M 18 12 L 44 30 L 18 48" fill="none" stroke="#EA580C" stroke-width="5.5" stroke-linecap="butt" stroke-linejoin="round"/>
            <circle cx="18" cy="12" r="7" fill="#FFFFFF"/>
            <circle cx="44" cy="30" r="8.5" fill="#FFFFFF"/>
            <circle cx="18" cy="48" r="7" fill="#EA580C"/>
          </g>
        </svg>
      </div>
      <span class="tab-bracket-text">
        <span class="bracket-char">{</span><span class="bracket-name">cp</span><span class="bracket-accent">-toolkit</span><span class="bracket-char">}</span>
      </span>
    `;
  }

  function createPanelElements() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'panel-overlay';

    panelEl = document.createElement('aside');
    panelEl.className = 'side-panel-container';
    panelEl.innerHTML = `
      <div class="panel-header">
        <div class="panel-brand-lockup">
          <div class="tab-brand-icon panel-brand-icon">
            <svg viewBox="0 0 64 64">
              <g transform="translate(2, 2)">
                <path d="M 18 12 L 44 30 L 18 48" fill="none" stroke="#EA580C" stroke-width="5.5" stroke-linecap="butt" stroke-linejoin="round"/>
                <circle cx="18" cy="12" r="7" fill="#FFFFFF"/>
                <circle cx="44" cy="30" r="8.5" fill="#FFFFFF"/>
                <circle cx="18" cy="48" r="7" fill="#EA580C"/>
              </g>
            </svg>
          </div>
          <span class="panel-brand-title">cp-ps<span class="panel-brand-accent">/toolkit</span></span>
        </div>
        <button class="panel-close-btn" title="Close (Esc)">&times;</button>
      </div>
      <div class="panel-collection-bar" id="panel-collection-bar">
        <div class="custom-dropdown" id="custom-collection-dropdown">
          <button type="button" class="custom-dropdown-btn" id="custom-dropdown-btn">
            <span class="custom-dropdown-label" id="custom-dropdown-label">Select Collection</span>
            <span class="custom-dropdown-arrow">&#9662;</span>
          </button>
          <div class="custom-dropdown-menu" id="custom-dropdown-menu"></div>
        </div>
      </div>
      <div class="panel-search-box">
        <input type="text" class="panel-search-input" placeholder="search..." spellcheck="false" autocomplete="off" />
        <span class="panel-count-badge" id="panel-count-badge">0</span>
      </div>
      <div class="panel-list-viewport" id="panel-list-viewport"></div>
    `;

    flyoutCardEl = document.createElement('div');
    flyoutCardEl.className = 'flyout-blade-card';
    flyoutCardEl.id = 'flyout-card';
    flyoutCardEl.innerHTML = `
      <div class="blade-hover-bridge"></div>
      <div class="flyout-card-header">
        <div class="flyout-tags" id="flyout-tags"></div>
      </div>
      <div class="flyout-desc" id="flyout-desc">Snippet description</div>
      <div class="panel-code-viewport">
        <pre><code id="flyout-code"></code></pre>
      </div>
    `;

    toastEl = document.createElement('div');
    toastEl.className = 'toast-notice';
    toastEl.textContent = 'Snippet copied to clipboard!';
  }

  function queryDOMElements() {
    closeBtn = panelEl.querySelector('.panel-close-btn');
    collectionBar = panelEl.querySelector('#panel-collection-bar');
    customDropdown = panelEl.querySelector('#custom-collection-dropdown');
    customDropdownBtn = panelEl.querySelector('#custom-dropdown-btn');
    customDropdownLabel = panelEl.querySelector('#custom-dropdown-label');
    customDropdownMenu = panelEl.querySelector('#custom-dropdown-menu');
    searchInput = panelEl.querySelector('.panel-search-input');
    countBadge = panelEl.querySelector('#panel-count-badge');
    listViewport = panelEl.querySelector('#panel-list-viewport');

    flyoutTags = flyoutCardEl.querySelector('#flyout-tags');
    flyoutDesc = flyoutCardEl.querySelector('#flyout-desc');
    flyoutCode = flyoutCardEl.querySelector('#flyout-code');
  }

  function initTabPosition() {
    try {
      chrome.storage.local.get([STORAGE_KEYS.TRIGGER_TAB_TOP_PCT], res => {
        const savedPct = res ? res[STORAGE_KEYS.TRIGGER_TAB_TOP_PCT] : undefined;
        if (typeof savedPct === 'number' && triggerEl) {
          const pct = Math.min(Math.max(savedPct, TAB_MIN_PCT), TAB_MAX_PCT);
          triggerEl.style.top = `${pct}%`;
        }
      });
    } catch {
      // Ignore storage read error
    }
  }

  function bindTabDragEvents() {
    triggerEl.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      isDraggingTab = false;
      hasDraggedTab = false;
      dragStartY = e.clientY;
      latestPointerY = e.clientY;
      const rect = triggerEl.getBoundingClientRect();
      dragStartTopPx = rect.top + rect.height / 2;
      triggerEl.setPointerCapture(e.pointerId);
    });

    triggerEl.addEventListener('pointermove', e => {
      if (!triggerEl.hasPointerCapture(e.pointerId)) return;
      latestPointerY = e.clientY;
      const deltaY = latestPointerY - dragStartY;

      if (!isDraggingTab && Math.abs(deltaY) > DRAG_THRESHOLD_PX) {
        isDraggingTab = true;
        hasDraggedTab = true;
        triggerEl.classList.add('is-dragging');
      }

      if (isDraggingTab && dragRafId === null) {
        dragRafId = requestAnimationFrame(() => {
          dragRafId = null;
          if (!isDraggingTab || !triggerEl) return;
          const currentDelta = latestPointerY - dragStartY;
          const halfHeight = triggerEl.offsetHeight / 2;
          const minCenter = halfHeight + 8;
          const maxCenter = window.innerHeight - halfHeight - 8;
          const newTopPx = Math.min(Math.max(dragStartTopPx + currentDelta, minCenter), maxCenter);
          const pct = (newTopPx / window.innerHeight) * 100;
          triggerEl.style.top = `${pct}%`;
        });
      }
    });

    const stopTabDrag = e => {
      if (!triggerEl.hasPointerCapture(e.pointerId)) return;
      triggerEl.releasePointerCapture(e.pointerId);

      if (dragRafId !== null) {
        cancelAnimationFrame(dragRafId);
        dragRafId = null;
      }

      if (isDraggingTab) {
        triggerEl.classList.remove('is-dragging');
        isDraggingTab = false;

        const rect = triggerEl.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const pct = Math.min(Math.max((center / window.innerHeight) * 100, TAB_MIN_PCT), TAB_MAX_PCT);

        try {
          chrome.storage.local.set({ [STORAGE_KEYS.TRIGGER_TAB_TOP_PCT]: pct });
        } catch {
          // Ignore storage write error
        }
      }
    };

    triggerEl.addEventListener('pointerup', stopTabDrag);
    triggerEl.addEventListener('pointercancel', stopTabDrag);

    triggerEl.addEventListener('click', e => {
      if (hasDraggedTab) {
        e.preventDefault();
        e.stopPropagation();
        hasDraggedTab = false;
        return;
      }
      toggleOpen(true);
    });
  }

  function bindPanelEvents() {
    closeBtn.addEventListener('click', () => toggleOpen(false));
    overlayEl.addEventListener('click', () => toggleOpen(false));

    if (customDropdownBtn) {
      customDropdownBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (customDropdown) customDropdown.classList.toggle('open');
      });
    }

    panelEl.addEventListener('click', e => {
      if (customDropdown && !customDropdown.contains(e.target)) {
        customDropdown.classList.remove('open');
      }
    });

    flyoutCardEl.addEventListener('mouseenter', () => {
      clearTimeout(flyoutHideTimer);
      isHoveringFlyoutCard = true;
      flyoutCardEl.classList.add('show');
    });

    flyoutCardEl.addEventListener('mouseleave', () => {
      isHoveringFlyoutCard = false;
      flyoutHideTimer = setTimeout(() => {
        hideFlyoutCard();
      }, FLYOUT_HIDE_DELAY_MS);
    });

    searchInput.addEventListener('input', e => {
      clearTimeout(searchDebounceTimer);
      const val = e.target.value;
      searchDebounceTimer = setTimeout(() => {
        searchQuery = val;
        highlightedIndex = 0;
        filterList();
        if (filteredList.length > 0 && listViewport) {
          const firstRow = listViewport.querySelector('.panel-item-row');
          showFlyout(filteredList[0], firstRow);
        }
      }, SEARCH_DEBOUNCE_MS);
    });

    bindListViewportDelegation();
  }

  function createToolkitUI() {
    if (host) return;

    createShadowRoot();
    createTriggerElement();
    createPanelElements();

    shadow.appendChild(triggerEl);

    queryDOMElements();
    initTabPosition();
    bindTabDragEvents();
    bindPanelEvents();
  }

  // --- 6. Lifecycle Management ---

  function mountToolkit() {
    if (isMounted) return;
    if (!host) {
      createToolkitUI();
    }
    const parent = document.documentElement || document.body;
    if (!parent) return;
    parent.appendChild(host);
    isMounted = true;
    window.addEventListener('keydown', onKeyDown, true);
    loadSnippetsData();
  }

  function unmountToolkit() {
    if (!isMounted) return;
    window.removeEventListener('keydown', onKeyDown, true);
    toggleOpen(false);
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
    if (flyoutCardEl && flyoutCardEl.parentNode) flyoutCardEl.parentNode.removeChild(flyoutCardEl);
    if (toastEl && toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
    isPanelAttached = false;
    isDraggingTab = false;
    hasDraggedTab = false;
    if (dragRafId !== null) {
      cancelAnimationFrame(dragRafId);
      dragRafId = null;
    }
    if (triggerEl) {
      triggerEl.classList.remove('is-dragging');
    }
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    isMounted = false;
  }

  function updateDomainMatch(enabledDomains) {
    const isMatch = checkDomainMatch(enabledDomains);
    if (isMatch && !isMounted) {
      mountToolkit();
    } else if (!isMatch && isMounted) {
      unmountToolkit();
    }
  }

  // --- 7. Event Listeners & Startup ---

  function onKeyDown(e) {
    if (!isMounted) return;

    if (e.altKey && (e.key === 'c' || e.key === 'C')) {
      e.preventDefault();
      toggleOpen();
      return;
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      toggleOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredList.length > 0) {
        highlightedIndex = (highlightedIndex + 1) % filteredList.length;
        updateSelectedRow();
        if (listViewport) {
          const rows = listViewport.querySelectorAll('.panel-item-row');
          const activeRow = rows[highlightedIndex];
          if (activeRow) {
            activeRow.scrollIntoView({ block: 'nearest' });
            showFlyout(filteredList[highlightedIndex], activeRow);
          }
        }
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredList.length > 0) {
        highlightedIndex = (highlightedIndex - 1 + filteredList.length) % filteredList.length;
        updateSelectedRow();
        if (listViewport) {
          const rows = listViewport.querySelectorAll('.panel-item-row');
          const activeRow = rows[highlightedIndex];
          if (activeRow) {
            activeRow.scrollIntoView({ block: 'nearest' });
            showFlyout(filteredList[highlightedIndex], activeRow);
          }
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      if (filteredList[highlightedIndex]) {
        e.preventDefault();
        copySnippet(filteredList[highlightedIndex].body);
      }
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes[STORAGE_KEYS.WEBSITES_CONFIG]) {
      const newConfig = changes[STORAGE_KEYS.WEBSITES_CONFIG].newValue || {};
      const domains = Array.isArray(newConfig.enabledDomains) ? newConfig.enabledDomains : [];
      updateDomainMatch(domains);
    }

    const hasSnippetChange = changes[STORAGE_KEYS.COLLECTIONS_META] ||
      changes[STORAGE_KEYS.ACTIVE_LANG] ||
      Object.keys(changes).some(k => k.startsWith(STORAGE_KEYS.SNIPPETS_PREFIX));

    if (hasSnippetChange && isMounted) {
      loadSnippetsData();
    }
  });

  const initialDomains = await getInitialDomains();
  updateDomainMatch(initialDomains);
})();
