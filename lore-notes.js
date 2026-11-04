(() => {
  'use strict';
  const core = LoreNotes;
  const storageKey = 'wow-lore-notes-v1';
  let saved = {};
  try { const raw = localStorage.getItem(storageKey); if (raw) saved = core.validateBackup(JSON.parse(raw)); }
  catch (_) { /* Unreadable local edits are never discarded; just not loaded this session. */ }

  const el = (tag, text, className) => {
    const n = document.createElement(tag); if (text !== undefined) n.textContent = text;
    if (className) n.className = className; return n;
  };
  const button = (text, handler, className) => { const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', handler); return b; };

  const dialog = el('dialog', undefined, 'notes-board'); dialog.id = 'notes-board';
  dialog.setAttribute('aria-labelledby', 'notes-heading');
  dialog.innerHTML = `
    <div class="notes-topbar"><div><h1 id="notes-heading">Lore Notes</h1>
      <p>Retcons, contradictions between sources, and open lore ambiguities.</p></div>
      <button id="notes-close" type="button">Close ✕</button></div>
    <p class="notes-intro">Entries flagged with a ★ note in the archive are imported automatically as "source" notes; add your own as you read.</p>
    <div class="notes-toolbar">
      <label>Search<input id="notes-search" type="search" placeholder="Title or note…"></label>
      <label>Status<select id="notes-status"><option value="">All statuses</option>
        ${Object.entries(core.statuses).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label class="notes-check"><input id="notes-hide-resolved" type="checkbox" checked> Hide resolved</label>
      <button id="notes-new" type="button" class="notes-primary">+ New note</button>
    </div>
    <div class="notes-transfer"><span>Backups stay on this device unless exported.</span>
      <button id="notes-export" type="button">Export backup</button>
      <label class="notes-import">Import backup<input id="notes-import-file" type="file" accept="application/json" class="sr-only"></label></div>
    <p id="notes-message" role="status" aria-live="polite"></p>
    <div class="notes-workspace">
      <div class="notes-results"><p id="notes-count"></p><div id="notes-list"></div></div>
      <div id="notes-detail"></div>
    </div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);

  let activeId = null;

  function all() { return core.entries(figureSourceRevisions, saved); }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({ format: 'wow-lore-notes', version: 1, entries: Object.values(saved) })); }
    catch (_) { $('notes-message').textContent = 'Could not save this note. Earlier notes are kept.'; }
  }
  window.getVisibleNotes = all;

  function renderList() {
    const query = core.normalize($('notes-search').value), status = $('notes-status').value, hideResolved = $('notes-hide-resolved').checked;
    const order = ['open', 'partial', 'unreviewed', 'contradicted', 'resolved'];
    const matches = all().filter(c => (!status || c.status === status) && (!hideResolved || status || c.status !== 'resolved') &&
      (!query || core.normalize(`${c.title} ${c.note} ${c.evidence} ${c.theory}`).includes(query)))
      .sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.title.localeCompare(b.title));
    $('notes-count').textContent = `${matches.length} ${matches.length === 1 ? 'note' : 'notes'}`;
    const list = $('notes-list'); list.replaceChildren();
    matches.forEach(c => {
      const card = el('button', undefined, 'notes-card'); card.type = 'button';
      card.setAttribute('aria-pressed', String(c.id === activeId));
      card.append(el('strong', c.title));
      card.append(el('p', (c.note || c.evidence || c.theory || '').slice(0, 140), 'notes-preview'));
      const badge = el('span', core.statuses[c.status], `notes-badge status-${c.status}${c.origin === 'source' ? ' auto' : ''}`);
      card.append(badge, el('small', c.origin === 'source' ? 'From the archive' : 'Reader note'));
      card.addEventListener('click', () => showDetail(c.id));
      list.append(card);
    });
    if (!matches.length) list.append(el('p', 'No notes match this search.', 'notes-empty'));
  }

  function showDetail(id) {
    activeId = id;
    renderList();
    const entry = all().find(c => c.id === id);
    const detail = $('notes-detail'); detail.replaceChildren();
    if (!entry) { detail.append(el('p', 'Choose a note to see its details, or create a new one.', 'notes-empty')); return; }
    detail.append(el('h2', entry.title));
    const form = el('form');
    const field = (name, labelText, tag = 'input', attrs = {}) => {
      const label = el('label', labelText); const input = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => input.setAttribute(k, v));
      input.name = name; input.value = entry[name] ?? '';
      label.append(input); return { label, input };
    };
    const title = field('title', 'Title');
    const status = el('label', 'Status');
    const statusSelect = document.createElement('select'); statusSelect.name = 'status';
    Object.entries(core.statuses).forEach(([k, l]) => statusSelect.add(new Option(l, k, false, k === entry.status)));
    status.append(statusSelect);
    const evidence = field('evidence', 'Evidence (textual proof)', 'textarea');
    const theory = field('theory', 'Theory / interpretation', 'textarea');
    const relatedLabel = el('label', 'Related nodes (one id per line)');
    const related = document.createElement('textarea'); related.name = 'related'; related.value = entry.nodeIds.join('\n');
    relatedLabel.append(related);
    form.append(title.label, status, evidence.label, theory.label, relatedLabel);
    const save = button('Save note', () => {
      const next = { ...entry, title: title.input.value.trim() || entry.title, status: statusSelect.value,
        evidence: evidence.input.value, theory: theory.input.value,
        nodeIds: related.value.split('\n').map(s => s.trim()).filter(Boolean),
        history: [...entry.history, { at: new Date().toISOString(), text: 'Updated via the lore-notes board.' }] };
      saved[entry.id] = next; persist(); renderList(); showDetail(entry.id);
      $('notes-message').textContent = 'Note saved.';
    }, 'notes-primary');
    save.type = 'submit';
    form.addEventListener('submit', e => e.preventDefault());
    form.append(save);
    detail.append(form);
    if (entry.note) {
      const original = el('details'); original.open = true;
      original.append(el('summary', 'Original archive note'), el('div', entry.note, 'notes-original'));
      detail.append(original);
    }
    if (entry.origin === 'reader') {
      detail.append(button('Delete this note', () => {
        delete saved[entry.id]; persist(); activeId = null; renderList(); showDetail(null);
      }));
    }
    if (entry.history.length) {
      const history = el('details'); history.append(el('summary', `History (${entry.history.length})`));
      entry.history.forEach(h => history.append(el('p', `${h.at}: ${h.text}`)));
      detail.append(history);
    }
  }
  window.openLoreNote = id => { open(); showDetail(id); };

  function createNote() {
    const id = `reader:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    saved[id] = { id, origin: 'reader', status: 'open', volume: MAX_VOLUME, nodeIds: [], title: 'New lore note',
      note: '', evidence: '', theory: '', section: '', history: [{ at: new Date().toISOString(), text: 'Created.' }] };
    persist(); renderList(); showDetail(id);
  }
  $('notes-new').addEventListener('click', createNote);
  $('notes-search').addEventListener('input', renderList);
  $('notes-status').addEventListener('change', renderList);
  $('notes-hide-resolved').addEventListener('change', renderList);
  $('notes-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ format: 'wow-lore-notes', version: 1, entries: Object.values(saved) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'wow-lore-notes-backup.json';
    document.body.append(a); a.click(); a.remove();
  });
  $('notes-import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try { saved = core.validateBackup(JSON.parse(await file.text())); persist(); renderList(); $('notes-message').textContent = 'Backup imported.'; }
    catch (err) { $('notes-message').textContent = err.message; }
    e.target.value = '';
  });

  function open() { renderList(); if (!dialog.open) dialog.showModal(); }
  $('btn-lore-notes').addEventListener('click', open);
  $('notes-close').addEventListener('click', () => dialog.close());
})();
