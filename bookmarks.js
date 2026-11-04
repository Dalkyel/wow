(() => {
  'use strict';
  const key = 'wow-bookmarks-v1';
  let items = [], error = '';
  try { const raw = localStorage.getItem(key); if (raw) items = BookmarkStore.validate(JSON.parse(raw)); }
  catch (_) { error = 'Could not read the saved bookmarks. Your data is kept; it will not be overwritten.'; }
  const unreadable = !!error;
  const el = (tag, text, className) => {
    const n = document.createElement(tag); if (text !== undefined) n.textContent = text;
    if (className) n.className = className; return n;
  };
  const has = (kind, id) => items.some(item => item.kind === kind && item.id === id);
  const dialog = el('dialog', undefined, 'bookmarks-dialog'); dialog.id = 'bookmarks-dialog';
  dialog.setAttribute('aria-labelledby', 'bookmarks-heading');
  dialog.innerHTML = `<div class="bookmarks-header"><div><h1 id="bookmarks-heading">Bookmarks</h1><p>${DATA_LABEL}</p></div><button id="bookmarks-close" type="button">Close ✕</button></div>
    <div class="bookmarks-body"><p>Save a figure, faction, event, or lore note with ☆ to come back to it. Bookmarks are stored in this browser and open the full entry.</p>
    <label for="bookmarks-search">Search my bookmarks</label><input id="bookmarks-search" type="search" placeholder="Name or note…">
    <p id="bookmarks-status" role="status" aria-live="polite"></p><div id="bookmarks-list"></div></div>`;
  document.body.append(dialog);
  const status = () => document.getElementById('bookmarks-status');
  function syncButtons() {
    document.querySelectorAll('[data-bookmark-kind]').forEach(b => {
      const selected = has(b.dataset.bookmarkKind, b.dataset.bookmarkId);
      b.textContent = selected ? '★ Saved' : '☆ Save bookmark';
      b.setAttribute('aria-pressed', String(selected)); b.disabled = unreadable;
    });
    window.refreshTimelineReadability?.();
  }
  function toggle(kind, id) {
    if (unreadable) return;
    const next = has(kind, id) ? items.filter(item => item.kind !== kind || item.id !== id) : [...items, { kind, id }];
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, items: next }));
      items = next; error = ''; syncButtons(); render();
      document.getElementById('bookmark-feedback').textContent = has(kind, id) ? 'Bookmark saved in this browser.' : 'Bookmark removed.';
    } catch (_) {
      document.getElementById('bookmark-feedback').textContent = 'Could not save the bookmark. Earlier bookmarks are kept.';
      document.querySelectorAll('[data-bookmark-kind]').forEach(b => {
        if (b.dataset.bookmarkKind === kind && b.dataset.bookmarkId === id) b.textContent = 'Could not save';
      });
    }
  }
  function bookmarkButton(kind, id) {
    const b = el('button', '', 'bookmark-button'); b.type = 'button';
    b.dataset.bookmarkKind = kind; b.dataset.bookmarkId = id;
    b.textContent = has(kind, id) ? '★ Saved' : '☆ Save bookmark';
    b.setAttribute('aria-pressed', String(has(kind, id))); b.disabled = unreadable;
    b.addEventListener('click', () => toggle(kind, id)); return b;
  }
  function render() {
    if (!dialog.open) return;
    const query = FigureReference.normalize(document.getElementById('bookmarks-search').value);
    const visible = BookmarkStore.visible(items, nodes, window.getVisibleNotes?.() || []);
    const matches = visible.filter(item => !query || FigureReference.normalize(`${item.label} ${item.subtitle}`).includes(query));
    const list = document.getElementById('bookmarks-list'); list.replaceChildren();
    status().textContent = error || `${matches.length} bookmarks`;
    for (const [kind, title] of [['node', 'Figures, factions, places and events'], ['note', 'Lore notes']]) {
      const group = matches.filter(item => item.kind === kind); if (!group.length) continue;
      list.append(el('h2', title));
      group.forEach(item => {
        const row = el('div', undefined, 'bookmark-row');
        const open = el('button', undefined, 'bookmark-open'); open.type = 'button';
        open.append(el('strong', item.label), el('span', item.subtitle));
        open.addEventListener('click', () => {
          dialog.close();
          if (item.kind === 'note') window.openLoreNote(item.targetId || item.id);
          else if (FigureReference.kind(nodeMap[item.id])) window.openFigureReference(item.id, '', () => dialog.showModal());
          else selectNode(nodeMap[item.id]);
        });
        const remove = el('button', 'Remove', 'bookmark-remove'); remove.type = 'button';
        remove.setAttribute('aria-label', `Remove bookmark: ${item.label}`);
        remove.addEventListener('click', () => toggle(item.kind, item.id));
        row.append(open, remove); list.append(row);
      });
    }
    if (!matches.length) list.append(el('p', query ? 'No matches.' : 'No visible bookmarks yet. Use ☆ on a profile, a lore note, or a timeline node panel.'));
  }
  document.getElementById('btn-bookmarks').addEventListener('click', () => { dialog.showModal(); render(); });
  document.getElementById('bookmarks-close').addEventListener('click', () => dialog.close());
  document.getElementById('bookmarks-search').addEventListener('input', render);
  window.addEventListener('storage', event => {
    if (event.key !== key || unreadable) return;
    try { items = event.newValue ? BookmarkStore.validate(JSON.parse(event.newValue)) : []; syncButtons(); render(); }
    catch (_) { /* A bad external write must not replace the working in-memory copy. */ }
  });
  window.BookmarkUI = { button: bookmarkButton, has };
})();
