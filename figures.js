(() => {
  'use strict';
  const core = FigureReference;
  const profiles = nodes.filter(n => core.kind(n)).map(n => core.profile(n, figureSourceRevisions, FIGURE_GUIDES));
  const byId = new Map(profiles.map(p => [p.node.id, p]));
  const visited = [];
  let activeId = null;
  let returnTo = null;
  const categories = { figures: 'Figures', factions: 'Factions', events: 'Events', locations: 'Locations', lore: 'Lore and artifacts' };
  const el = (tag, text, className) => {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  };
  const button = (text, handler, className) => {
    const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', handler); return b;
  };
  const dialog = el('dialog', undefined, 'reference');
  dialog.id = 'figure-reference'; dialog.setAttribute('aria-labelledby', 'reference-heading');
  dialog.innerHTML = `
    <div class="reference-header"><div><h1 id="reference-heading">Figures &amp; Factions</h1>
      <p>A guide to who's who in the Chronicle · ${DATA_LABEL}</p></div>
      <button id="reference-close" type="button" aria-label="Close figures index">Close ✕</button></div>
    <div class="reference-layout"><aside class="reference-index" aria-label="Figures index">
      <label for="reference-search">Name or title</label>
      <input id="reference-search" type="search" placeholder="Name or title…" autocomplete="off">
      <label class="reference-sr" for="reference-kind">Kind</label>
      <select id="reference-kind"><option value="">Everything</option><option value="figures">Figures</option>
        <option value="factions">Factions</option></select>
      <p id="reference-count" role="status" aria-live="polite"></p><div id="reference-list"></div>
    </aside><article id="reference-profile" aria-label="Figure profile"></article></div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);
  const search = $('reference-search'), filter = $('reference-kind'), pane = $('reference-profile');

  function renderIndex() {
    const matches = core.search(profiles, search.value, filter.value);
    $('reference-count').textContent = `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'}`;
    const list = $('reference-list'); list.replaceChildren();
    if (!matches.length) list.append(el('p', 'No matches. Try a shorter name or a different filter.', 'reference-empty'));
    matches.forEach(p => {
      const b = button('', () => showProfile(p.node.id), 'reference-result');
      b.setAttribute('aria-current', p.node.id === activeId ? 'true' : 'false');
      b.append(el('strong', p.node.label), el('span', core.excerpt(p.intro, 105)), el('small', p.node.type));
      list.append(b);
    });
  }

  function renderConnections(node) {
    const section = el('section', undefined, 'reference-connections');
    section.append(el('h2', 'Relationships and context'));
    const groups = core.groupedConnections(node.id, nodes, links);
    const input = el('input'); input.type = 'search'; input.placeholder = 'Filter connections by name or relationship…';
    input.setAttribute('aria-label', 'Filter this figure’s connections');
    section.append(input, el('p', 'Connections keep what was recorded at different points in the archive.', 'reference-muted'));
    const result = el('div'); const count = el('p', '', 'reference-muted'); count.setAttribute('role', 'status');
    section.append(count, result);
    const draw = () => {
      result.replaceChildren(); const query = core.normalize(input.value); let total = 0;
      Object.entries(categories).forEach(([key, label]) => {
        const items = [...(groups.get(key)?.values() || [])].filter(item => !query ||
          core.normalize([item.node.label, item.node.id, ...item.links.map(l => l.label)].join(' ')).includes(query))
          .sort((a, b) => a.node.label.localeCompare(b.node.label));
        if (!items.length) return;
        total += items.length;
        const details = el('details', undefined, 'reference-group');
        details.open = !!query || key === 'factions';
        details.append(el('summary', `${label} (${items.length})`));
        const grid = el('div', undefined, 'reference-connection-grid');
        items.forEach(item => {
          const card = el('div', undefined, 'reference-connection');
          card.append(button(item.node.label, () => showProfile(item.node.id), 'reference-link'));
          const record = l => `${l.source} → ${l.label || relationTypes[l.type] || l.type} → ${l.target}`;
          const latest = item.links.at(-1);
          card.append(el('p', record(latest)), el('small', `Volume ${latest.volume}${Number.isInteger(latest.section) ? ` · Section ${latest.section}` : ''} · ${relationTypes[latest.type] || latest.type}`));
          if (item.links.length > 1) {
            const all = el('details'); all.append(el('summary', `See all ${item.links.length} recorded links`));
            item.links.forEach(l => all.append(el('p', `${record(l)} · Volume ${l.volume}${Number.isInteger(l.section) ? `, section ${l.section}` : ''}`)));
            card.append(all);
          }
          grid.append(card);
        });
        details.append(grid); result.append(details);
      });
      count.textContent = `${total} ${total === 1 ? 'linked topic' : 'linked topics'}`;
      if (!total) result.append(el('p', 'No connections match this search.'));
    };
    input.addEventListener('input', draw); draw(); return section;
  }

  function showProfile(id, back = false) {
    const node = nodeMap[id]; if (!node) return;
    if (activeId && activeId !== id && !back) visited.push(activeId);
    activeId = id;
    const p = byId.get(id) || core.profile(node, figureSourceRevisions, {});
    pane.replaceChildren();
    const nav = el('div', undefined, 'reference-profile-nav');
    const previous = button('← Back to the previous entry', () => {
      if (visited.length) { showProfile(visited.pop(), true); return; }
      if (returnTo) { const reopen = returnTo; returnTo = null; dialog.close(); reopen(); }
    });
    previous.disabled = !visited.length && !returnTo;
    nav.append(previous,
      button('Explore its connections', () => { dialog.close(); window.openConnections(node.id, () => dialog.showModal()); }),
      button('View on timeline ↗', () => { dialog.close(); selectNode(node); }));
    pane.append(nav);
    const heading = el('h2', node.label, 'reference-name'); heading.tabIndex = -1;
    pane.append(el('p', node.type, 'reference-eyebrow'), heading, el('p', p.intro, 'reference-intro'));
    if (p.introIsExcerpt) pane.append(el('small', 'Introduction excerpted from the archive text.', 'reference-muted'));
    const extraAliases = p.aliases.filter(a => core.normalize(a) !== core.normalize(node.label) && core.normalize(a) !== core.normalize(node.id));
    if (extraAliases.length) pane.append(el('p', `Also known as: ${extraAliases.join(' · ')}`, 'reference-aliases'));

    if (p.latest) {
      const latest = el('section', undefined, 'reference-latest');
      latest.append(el('h3', 'Latest recorded development'),
        el('p', `Volume ${p.latest.volume} · Section ${p.latest.section}${p.latest.qualifier ? ' ' + p.latest.qualifier : ''}`, 'reference-eyebrow'),
        el('p', p.latest.preview));
      pane.append(latest);
    }
    const grouped = core.groupedConnections(id, nodes, links);
    const neighbors = new Map([...grouped.values()].flatMap(group => [...group]));
    const keyLinks = (FIGURE_KEY_LINKS[id] || []).map(key => neighbors.get(key)).filter(Boolean);
    if (keyLinks.length) {
      const keySection = el('section', undefined, 'reference-key-links');
      keySection.append(el('h2', 'Connections to start with'));
      const grid = el('div', undefined, 'reference-connection-grid');
      keyLinks.forEach(item => {
        const card = el('div', undefined, 'reference-connection');
        const relation = item.links[0];
        card.append(button(item.node.label, () => showProfile(item.node.id), 'reference-link'),
          el('p', FIGURE_RELATION_HINTS[id]?.[item.node.id] || `${relation.source} → ${relation.label || relationTypes[relation.type]} → ${relation.target}`));
        grid.append(card);
      });
      keySection.append(grid); pane.append(keySection);
    }
    pane.append(renderConnections(node));

    if (p.timeline.length) {
      const tl = el('section', undefined, 'reference-timeline');
      tl.append(el('h2', 'Recorded by section'),
        el('p', 'Entries with a volume/section heading found in the archive text.', 'reference-muted'));
      [...p.timeline].reverse().forEach(event => {
        const entry = el('details');
        entry.append(el('summary', `Volume ${event.volume} · Section ${event.section}${event.qualifier ? ' ' + event.qualifier : ''}`),
          el('p', core.excerpt(event.text, 220), 'reference-timeline-preview'), el('div', event.text, 'reference-original'));
        tl.append(entry);
      });
      pane.append(tl);
    }
    if (node.star) {
      const notes = el('details', undefined, 'reference-archive');
      notes.append(el('summary', 'Original notes and open questions'), el('div', node.star, 'reference-original'));
      pane.append(notes);
    }
    const original = el('details', undefined, 'reference-archive');
    original.append(el('summary', 'Full description'), el('div', node.desc, 'reference-original'));
    pane.append(original);
    const archive = el('details', undefined, 'reference-archive');
    archive.append(el('summary', `Revision history (${p.revisions.length})`));
    p.revisions.forEach((revision, index) => {
      const item = el('details');
      item.append(el('summary', `Volume ${revision.volume} · Entry ${index + 1} · ${revision.label}`));
      if (revision.previousState) item.append(el('h3', 'Previously recorded state'), el('div', revision.previousState, 'reference-original'));
      item.append(el('div', revision.desc, 'reference-original'));
      if (revision.star) item.append(el('h3', 'Original note'), el('div', revision.star, 'reference-original'));
      archive.append(item);
    });
    pane.append(archive);
    renderIndex(); pane.scrollTop = 0;
    if (dialog.open) {
      heading.focus({ preventScroll: true });
      if (matchMedia('(max-width: 768px)').matches) pane.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  function open(id, query = '', onReturn) {
    if (!dialog.open) {
      returnTo = onReturn || (summaryPanel.open ? () => summaryPanel.showModal() : null);
      visited.length = 0; activeId = null;
    }
    if (summaryPanel.open) summaryPanel.close();
    search.value = query; filter.value = '';
    if (!dialog.open) dialog.showModal();
    if (id) showProfile(id);
    else {
      renderIndex();
      if (!activeId) {
        pane.replaceChildren(el('p', 'Choose a name to open its entry', 'reference-eyebrow'),
          el('h2', 'Who or what was this?', 'reference-welcome'),
          el('p', 'Search by name or title. Each entry gathers a short reminder, the latest recorded development, and its connections; the full archive text stays available.'),
          el('h3', 'Start here'));
        const picks = el('div', undefined, 'reference-featured');
        ['the-titans', 'sargeras', 'the-old-gods'].forEach(key => {
          const p = byId.get(key); if (!p) return;
          const b = button('', () => showProfile(key));
          b.append(el('strong', p.node.label), el('span', p.intro)); picks.append(b);
        });
        pane.append(picks);
      }
      search.focus();
    }
  }
  search.addEventListener('input', renderIndex); filter.addEventListener('change', renderIndex);
  search.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      const first = core.search(profiles, search.value, filter.value)[0];
      if (first) { event.preventDefault(); showProfile(first.node.id); }
    }
    if (event.key === 'ArrowDown') { event.preventDefault(); $('reference-list').querySelector('button')?.focus(); }
  });
  $('btn-figures').addEventListener('click', () => open());
  $('reference-close').addEventListener('click', () => { dialog.close(); if (returnTo) { const r = returnTo; returnTo = null; r(); } });
  window.openFigureReference = open;

  // Give the existing timeline search box actual, clickable results too.
  const mapSearch = $('search-input');
  const results = el('div', undefined, 'reference-map-results'); results.id = 'map-search-results'; results.hidden = true;
  results.setAttribute('aria-label', 'Search results');
  mapSearch.parentElement.append(results);
  mapSearch.setAttribute('aria-controls', results.id); mapSearch.setAttribute('aria-expanded', 'false');
  const closeResults = () => { results.hidden = true; mapSearch.setAttribute('aria-expanded', 'false'); };
  function renderMapResults() {
    const query = mapSearch.value.trim(); results.replaceChildren();
    if (!query) { closeResults(); return; }
    const matches = core.search(profiles, query);
    const others = nodes.filter(n => !byId.has(n.id) && !['CENTER', 'CAT'].includes(n.group) &&
      core.normalize(`${n.id} ${n.label}`).includes(core.normalize(query)));
    [...matches.map(p => p.node), ...others].slice(0, 10).forEach(n => {
      const b = button('', () => { closeResults(); if (byId.has(n.id)) open(n.id); else selectNode(n); });
      b.append(el('strong', n.label), el('small', byId.has(n.id) ? 'Open figure entry' : n.type)); results.append(b);
    });
    if (!results.children.length) results.append(el('p', 'No matches.'));
    results.hidden = false; mapSearch.setAttribute('aria-expanded', 'true');
  }
  mapSearch.addEventListener('input', renderMapResults);
  mapSearch.addEventListener('focus', () => { if (mapSearch.value.trim()) renderMapResults(); });
  mapSearch.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeResults();
    if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('button')?.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); results.querySelector('button')?.click(); }
  });
  document.addEventListener('click', event => { if (!results.contains(event.target) && event.target !== mapSearch) closeResults(); });
})();
