// ═══════════════════════════════════════════════════════
// TIMELINE — replaces the force-graph map. Renders events along
// one of two switchable axes (chronology / reading order), laid
// out in horizontal swimlanes by category. See timeline-core.js
// for the pure position/lane math (tested in tests/timeline-core.test.cjs).
// ═══════════════════════════════════════════════════════

const relationTypes = { rel: 'Relationship', conflict: 'Conflict', event: 'Event', magic: 'Magic',
  goal: 'Goal', lore: 'Lore', history: 'History', geo: 'Geography', trama: 'Plot thread', arc: 'Arc', cat: 'Category' };
const LANE_ORDER = ['PANTHEON', 'TITAN', 'OLD_GOD', 'DRAGON_ASPECT', 'NAARU', 'FACTION', 'ORC_CLAN',
  'HUMAN_KINGDOM', 'NIGHT_ELF', 'BURNING_LEGION', 'EVENT', 'LOCATION', 'ARTIFACT', 'COSMOS'];
const LANE_LABELS = { PANTHEON: 'Pantheons', TITAN: 'Titans', OLD_GOD: 'Old Gods', DRAGON_ASPECT: 'Dragon Aspects',
  NAARU: 'Naaru', FACTION: 'Factions', ORC_CLAN: 'Orc Clans', HUMAN_KINGDOM: 'Human Kingdoms',
  NIGHT_ELF: 'Night Elves', BURNING_LEGION: 'Burning Legion', EVENT: 'Events', LOCATION: 'Locations',
  ARTIFACT: 'Artifacts', COSMOS: 'Cosmic Forces' };
const UNIT = 16; // px per abstract position unit
const LANE_HEIGHT = 56;
const MARGIN = { top: 70, left: 190 };

const svg = d3.select('#graph');
const container = document.getElementById('graph-container');
const width = () => container.clientWidth;
const height = () => container.clientHeight;

const g = svg.append('g');
const laneLayer = g.append('g').attr('class', 'lanes');
const axisLayer = g.append('g').attr('class', 'axis-layer');
const eventsLayer = g.append('g').attr('class', 'events');

const zoom = d3.zoom()
  .scaleExtent([0.35, 6])
  .on('zoom', e => { g.attr('transform', e.transform); rescaleLabels(e.transform.k); window.refreshTimelineReadability?.(); });
svg.call(zoom);

const tooltip = document.getElementById('tooltip');
const ttName = document.getElementById('tt-name');
const ttDesc = document.getElementById('tt-desc');

const nodeMap = {};
nodes.forEach(n => {
  const group = GROUPS[n.group];
  n.r = group?.r || 10;
  n.color = group?.color || '#3a3a3a';
  n.stroke = group?.stroke || '#8a8a8a';
  nodeMap[n.id] = n;
});

let mode = 'chronology';
let selectedNode = null;
let laneOrderCurrent = [];

function short(text, max) { return text.length > max ? text.slice(0, max - 1) + '…' : text; }

function computePositions() {
  const plottable = nodes.filter(n => !['CENTER', 'CAT'].includes(n.group));
  const positions = mode === 'chronology' ? TimelineCore.eraPositions(Eras.ERAS, plottable) : TimelineCore.readingPositions(plottable);
  const visible = plottable.filter(n => positions.get(n.id) != null);
  const { lanes, order } = TimelineCore.laneAssignment(visible, LANE_ORDER);
  laneOrderCurrent = order;
  return visible.map(n => ({ node: n, pos: positions.get(n.id), lane: lanes.get(n.id) }));
}

function render(animate) {
  const plot = computePositions();
  const bandWidth = 100;
  const bands = mode === 'chronology'
    ? Eras.ERAS.slice().sort((a, b) => a.order - b.order).map((e, i) => ({ key: e.id, label: e.label, start: i * bandWidth, end: (i + 1) * bandWidth }))
    : Array.from({ length: MAX_VOLUME }, (_, i) => ({ key: `v${i + 1}`, label: `Volume ${i + 1}`, start: i * bandWidth, end: (i + 1) * bandWidth }));
  const maxX = Math.max(bandWidth, ...bands.map(b => b.end));
  const lanesCount = Math.max(1, laneOrderCurrent.length);
  const plotW = maxX * UNIT;
  const xFor = d => d.pos * UNIT + MARGIN.left;
  const yFor = d => MARGIN.top + d.lane * LANE_HEIGHT + LANE_HEIGHT / 2;

  const laneSel = laneLayer.selectAll('rect.lane-band')
    .data(laneOrderCurrent, d => d)
    .join('rect').attr('class', 'lane-band');
  laneSel
    .attr('x', 0).attr('width', plotW + MARGIN.left + 80)
    .attr('y', (d, i) => MARGIN.top + i * LANE_HEIGHT).attr('height', LANE_HEIGHT)
    .attr('fill', d => GROUPS[d]?.color || '#222').attr('fill-opacity', 0.14)
    .attr('stroke', d => GROUPS[d]?.stroke || '#444').attr('stroke-opacity', 0.3);

  const laneLabelSel = laneLayer.selectAll('text.lane-label')
    .data(laneOrderCurrent, d => d)
    .join('text').attr('class', 'lane-label');
  laneLabelSel
    .attr('x', 14).attr('y', (d, i) => MARGIN.top + i * LANE_HEIGHT + LANE_HEIGHT / 2)
    .attr('dominant-baseline', 'middle').attr('font-size', 13)
    .text(d => LANE_LABELS[d] || d);

  const bandSel = axisLayer.selectAll('g.era-band')
    .data(bands, d => d.key)
    .join(enter => {
      const sel = enter.append('g').attr('class', 'era-band');
      sel.append('line').attr('class', 'era-gridline');
      sel.append('text').attr('class', 'era-label');
      return sel;
    });
  bandSel.select('line.era-gridline')
    .attr('x1', d => d.start * UNIT + MARGIN.left).attr('x2', d => d.start * UNIT + MARGIN.left)
    .attr('y1', MARGIN.top - 40).attr('y2', MARGIN.top + lanesCount * LANE_HEIGHT);
  bandSel.select('text.era-label')
    .attr('x', d => (d.start + (d.end - d.start) / 2) * UNIT + MARGIN.left)
    .attr('y', MARGIN.top - 48).attr('text-anchor', 'middle').attr('font-size', 13)
    .text(d => d.label);
  const lastBand = bands.at(-1);
  axisLayer.selectAll('line.era-gridline-end').data(lastBand ? [lastBand] : [])
    .join('line').attr('class', 'era-gridline-end')
    .attr('x1', d => d.end * UNIT + MARGIN.left).attr('x2', d => d.end * UNIT + MARGIN.left)
    .attr('y1', MARGIN.top - 40).attr('y2', MARGIN.top + lanesCount * LANE_HEIGHT);

  const eventSel = eventsLayer.selectAll('g.event-node')
    .data(plot, d => d.node.id)
    .join(enter => {
      const node = enter.append('g').attr('class', 'event-node')
        .attr('role', 'button').attr('tabindex', 0)
        .on('click', (e, d) => { e.stopPropagation(); if (selectedNode && selectedNode.id === d.node.id) clearSelection(); else selectNode(d.node); })
        .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectNode(d.node); } });
      node.append('circle');
      node.append('text').attr('class', 'event-label').attr('text-anchor', 'middle');
      node.append('title');
      if (!('ontouchstart' in window)) {
        node.on('mouseenter', (e, d) => { ttName.textContent = d.node.label; ttDesc.textContent = d.node.type; tooltip.classList.add('visible'); })
          .on('mousemove', e => { tooltip.style.left = (e.clientX + 14) + 'px'; tooltip.style.top = (e.clientY - 8) + 'px'; })
          .on('mouseleave', () => tooltip.classList.remove('visible'));
      }
      return node;
    });
  eventSel.attr('aria-label', d => `${d.node.label}. Open detail.`)
    .classed('selected', d => selectedNode && d.node.id === selectedNode.id);
  eventSel.select('circle').attr('r', d => d.node.r).attr('fill', d => d.node.color).attr('stroke', d => d.node.stroke).attr('stroke-width', 1.5);
  eventSel.select('text.event-label').attr('y', d => d.node.r + 16).attr('font-size', 12).text(d => short(d.node.label, 26));
  eventSel.select('title').text(d => `${d.node.label} — ${d.node.type}`);
  (animate ? eventSel.transition().duration(500) : eventSel).attr('transform', d => `translate(${xFor(d)},${yFor(d)})`);

  window.refreshTimelineReadability?.();
}

function rescaleLabels(k) {
  laneLayer.selectAll('text.lane-label').attr('font-size', 13 / k);
  axisLayer.selectAll('text.era-label').attr('font-size', 13 / k);
  eventsLayer.selectAll('text.event-label').attr('font-size', 12 / k);
}

function setMode(next) {
  if (mode === next) return;
  mode = next;
  document.getElementById('btn-mode-chronology').classList.toggle('active', mode === 'chronology');
  document.getElementById('btn-mode-reading').classList.toggle('active', mode === 'reading');
  render(true);
}
document.getElementById('btn-mode-chronology').addEventListener('click', () => setMode('chronology'));
document.getElementById('btn-mode-reading').addEventListener('click', () => setMode('reading'));

// ── Detail panel ────────────────────────────────────────
const panel = document.getElementById('detail-panel');
const pType = document.getElementById('p-type');
const pName = document.getElementById('p-name');
const pDesc = document.getElementById('p-desc');
const pConns = document.getElementById('p-connections');
const pStar = document.getElementById('p-star');

function showPanel(d) {
  const referenceButton = document.getElementById('p-reference');
  document.getElementById('p-explore').hidden = ['CENTER', 'CAT'].includes(d.group);
  referenceButton.hidden = !FigureReference.kind(d);
  referenceButton.onclick = () => window.openFigureReference?.(d.id);
  pType.textContent = d.type;
  pName.textContent = d.label;
  pDesc.textContent = d.desc;
  document.getElementById('p-overview').textContent = FigureReference.profile(d, figureSourceRevisions, FIGURE_GUIDES).intro;
  document.getElementById('p-full-description').open = false;
  const bookmark = document.getElementById('p-bookmark'); bookmark.replaceChildren();
  if (!['CENTER', 'CAT'].includes(d.group)) bookmark.append(BookmarkUI.button('node', d.id));
  const notes = document.querySelector('.panel-original-notes'); notes.hidden = !d.star; notes.open = false;
  pStar.replaceChildren();
  if (d.star) { const note = document.createElement('div'); note.className = 'star-note'; note.textContent = d.star; pStar.append(note); }
  document.getElementById('p-connection-search').value = '';
  const typeSelect = document.getElementById('p-connection-type');
  typeSelect.replaceChildren(new Option('All connections', ''));
  [...new Set(links.filter(l => l.source === d.id || l.target === d.id).map(l => l.type))]
    .forEach(type => typeSelect.add(new Option(relationTypes[type] || type, type)));
  renderPanelConnections();
  panel.classList.remove('hidden');
}

function renderPanelConnections() {
  if (!selectedNode) return;
  const id = selectedNode.id, query = FigureReference.normalize(document.getElementById('p-connection-search').value);
  const type = document.getElementById('p-connection-type').value;
  const all = links.filter(l => l.source === id || l.target === id);
  const matches = all.filter(l => {
    const otherId = l.source === id ? l.target : l.source;
    const other = nodeMap[otherId];
    return (!type || l.type === type) && (!query ||
      FigureReference.normalize(`${other?.label} ${l.label}`).includes(query) ||
      searchNames.get(otherId)?.some(name => name.includes(query)));
  });
  document.getElementById('p-connection-count').textContent = `${matches.length} of ${all.length} recorded connections`;
  pConns.replaceChildren();
  const make = (tag, text, className) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; };
  for (const [key, label] of Object.entries(relationTypes)) {
    const records = matches.filter(l => l.type === key); if (!records.length) continue;
    const group = make('details', undefined, 'conn-group'); group.open = !!query || !!type || key === 'rel' || all.length <= 10;
    group.append(make('summary', `${label} (${records.length})`));
    const others = new Map();
    records.forEach(l => {
      const otherId = l.source === id ? l.target : l.source; const other = nodeMap[otherId]; if (!other) return;
      if (!others.has(otherId)) others.set(otherId, { node: other, records: [] }); others.get(otherId).records.push(l);
    });
    [...others.values()].sort((a, b) => a.node.label.localeCompare(b.node.label)).forEach(item => {
      const row = make('div', undefined, 'conn-item'); row.style.borderLeftColor = item.node.stroke;
      const content = make('div');
      const target = make('button', item.node.label, 'conn-name conn-target'); target.type = 'button';
      target.addEventListener('click', () => selectNode(item.node)); content.append(target);
      const description = l => `${nodeMap[l.source]?.label || l.source} → ${l.label || label} → ${nodeMap[l.target]?.label || l.target}`;
      const latest = item.records.at(-1);
      content.append(make('p', description(latest), 'conn-rel'));
      content.append(make('small', `Volume ${latest.volume || 1}${Number.isInteger(latest.section) ? ` · Section ${latest.section}` : ''}`, 'conn-source'));
      if (item.records.length > 1) {
        const history = make('details', undefined, 'conn-records'); history.append(make('summary', `See all ${item.records.length} records`));
        item.records.forEach(l => history.append(make('p', `${description(l)} · Volume ${l.volume || 1}${Number.isInteger(l.section) ? `, section ${l.section}` : ''}`, 'conn-rel')));
        content.append(history);
      }
      row.append(content); group.append(row);
    });
    pConns.append(group);
  }
  if (!matches.length) pConns.append(make('p', 'No connections match this search.'));
}
document.getElementById('p-connection-search').addEventListener('input', renderPanelConnections);
document.getElementById('p-connection-type').addEventListener('change', renderPanelConnections);

function selectNode(d) {
  selectedNode = d;
  showPanel(d);
  const connectedIds = new Set([d.id]);
  links.forEach(l => { if (l.source === d.id) connectedIds.add(l.target); if (l.target === d.id) connectedIds.add(l.source); });
  eventsLayer.selectAll('g.event-node')
    .classed('selected', nd => nd.node.id === d.id)
    .classed('faded', nd => !connectedIds.has(nd.node.id));
  window.refreshTimelineReadability?.();
}

function clearSelection() {
  selectedNode = null;
  eventsLayer.selectAll('g.event-node').classed('selected faded', false);
  panel.classList.add('hidden');
  window.refreshTimelineReadability?.();
}

svg.on('click', clearSelection);
document.getElementById('panel-close').addEventListener('click', clearSelection);

// ── Zoom controls ─────────────────────────────────────
document.getElementById('btn-zoom-in').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.4));
document.getElementById('btn-zoom-out').addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 0.7));
function resetZoom(animate) {
  const t = d3.zoomIdentity.translate(30, 10).scale(0.8);
  (animate ? svg.transition().duration(500) : svg).call(zoom.transform, t);
}
document.getElementById('btn-reset').addEventListener('click', () => resetZoom(true));

// ── Search ─────────────────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchNames = new Map(nodes.map(n => [n.id, FigureReference.aliases(n, figureSourceRevisions, FIGURE_GUIDES).map(FigureReference.normalize)]));
searchInput.addEventListener('input', e => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) { clearSelection(); return; }
  const matchIds = new Set();
  const nq = FigureReference.normalize(query);
  nodes.forEach(n => { if (searchNames.get(n.id)?.some(name => name.includes(nq))) matchIds.add(n.id); });
  eventsLayer.selectAll('g.event-node').classed('selected', d => matchIds.has(d.node.id)).classed('faded', d => !matchIds.has(d.node.id));
  const exact = nodes.find(n => n.label.toLowerCase() === query || n.id.toLowerCase() === query);
  if (exact) selectNode(exact);
  window.refreshTimelineReadability?.();
});

// ── Initial render ─────────────────────────────────────
render(false);
rescaleLabels(1);
setTimeout(() => resetZoom(false), 50);
window.addEventListener('resize', () => render(false));

// ── Timeline log ───────────────────────────────────────
const summaryPanel = document.getElementById('summary-panel');
const chapterListEl = document.getElementById('chapter-list');
const chapterPaneEl = document.getElementById('chapter-pane');
const btnLog = document.getElementById('btn-log');
const summaryClose = document.getElementById('summary-close');
const bookTabsEl = document.getElementById('book-tabs');
let activeVolumeTab = timeline.at(-1)?.volume || MAX_VOLUME;
let activeSection = timeline.at(-1)?.section ?? null;
const mentionMatcher = FigureReference.buildMentionMatcher(nodes, figureSourceRevisions, FIGURE_GUIDES);

function renderVolumeTabs() {
  const volumes = [...new Set(timeline.map(t => t.volume || 1))].sort((a, b) => a - b);
  bookTabsEl.innerHTML = volumes.map(v => `<button class="book-tab${v === activeVolumeTab ? ' active' : ''}" data-volume="${v}">Volume ${v}</button>`).join('');
  bookTabsEl.querySelectorAll('.book-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeVolumeTab = parseInt(btn.dataset.volume, 10);
      const inVolume = timeline.filter(t => (t.volume || 1) === activeVolumeTab);
      activeSection = inVolume.at(-1)?.section ?? null;
      renderVolumeTabs(); renderSectionList();
    });
  });
}
function renderSectionList() {
  const entries = timeline.filter(t => (t.volume || 1) === activeVolumeTab).slice().reverse();
  chapterListEl.innerHTML = entries.map(t => `
    <button class="reference-result" type="button" data-section="${t.section}" aria-current="${t.section === activeSection}">
      <strong>${t.title}</strong>
    </button>`).join('');
  if (!entries.length) chapterListEl.innerHTML = '<p class="reference-empty">I haven\'t written anything for this volume yet.</p>';
  chapterListEl.querySelectorAll('.reference-result').forEach(btn => {
    btn.addEventListener('click', () => showEntry(parseInt(btn.dataset.section, 10)));
  });
  showEntry(activeSection);
}
function showEntry(section) {
  const entry = timeline.find(t => (t.volume || 1) === activeVolumeTab && t.section === section);
  activeSection = entry?.section ?? null;
  chapterListEl.querySelectorAll('.reference-result').forEach(btn =>
    btn.setAttribute('aria-current', parseInt(btn.dataset.section, 10) === activeSection));
  if (!entry) { chapterPaneEl.innerHTML = '<p class="reference-empty">I haven\'t written anything for this volume yet.</p>'; return; }
  chapterPaneEl.innerHTML = `
    <p class="reference-eyebrow">Volume ${entry.volume || 1} · Entry ${entry.section}</p>
    <h2 class="reference-name">${entry.title}</h2>
    <div class="chapter-text">${entry.summary}</div>`;
  linkifyMentions(chapterPaneEl.querySelector('.chapter-text'));
  chapterPaneEl.scrollTop = 0;
}
function linkifyMentions(container) {
  if (!container || !mentionMatcher.regex) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes = []; let node;
  while ((node = walker.nextNode())) textNodes.push(node);
  textNodes.forEach(textNode => {
    const matches = FigureReference.findMentions(textNode.data, mentionMatcher);
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(m => {
      if (m.start > cursor) fragment.append(textNode.data.slice(cursor, m.start));
      const link = document.createElement('button');
      link.type = 'button'; link.className = 'mention'; link.dataset.id = m.id;
      link.textContent = m.text;
      fragment.append(link);
      cursor = m.end;
    });
    if (cursor < textNode.data.length) fragment.append(textNode.data.slice(cursor));
    textNode.replaceWith(fragment);
  });
}
chapterPaneEl.addEventListener('click', event => {
  const link = event.target.closest('.mention');
  if (!link) return;
  const id = link.dataset.id;
  if (FigureReference.kind(nodeMap[id])) window.openFigureReference(id); else window.openConnections?.(id);
});
function loadLog() { renderVolumeTabs(); renderSectionList(); }
function openLog() { if (bookTabsEl.innerHTML === '') loadLog(); if (!summaryPanel.open) summaryPanel.showModal(); }
btnLog.addEventListener('click', openLog);
summaryClose.addEventListener('click', () => summaryPanel.close());
