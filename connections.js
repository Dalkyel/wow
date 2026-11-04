(() => {
  'use strict';
  const core = ConnectionsExplorer;
  const graph = core.index(nodes, links);
  const preferred = FIGURE_KEY_LINKS;
  const typeLabels = { rel: 'Relationship', conflict: 'Conflict', event: 'Event', magic: 'Magic', goal: 'Goal',
    lore: 'Lore', history: 'History', geo: 'Geography', trama: 'Plot thread', arc: 'Arc', cat: 'Category' };
  const kindLabels = { figures: 'Figures', factions: 'Factions', events: 'Events', locations: 'Locations', artifacts: 'Artifacts', lore: 'Lore' };

  const el = (tag, text, className) => {
    const n = document.createElement(tag); if (text !== undefined) n.textContent = text;
    if (className) n.className = className; return n;
  };
  const button = (text, handler, className) => {
    const b = el('button', text, className); b.type = 'button'; b.addEventListener('click', handler); return b;
  };

  const dialog = el('dialog', undefined, 'focus-dialog'); dialog.id = 'connections-dialog';
  dialog.setAttribute('aria-labelledby', 'connections-heading');
  dialog.innerHTML = `
    <div class="focus-heading"><div><h1 id="connections-heading">Explore Connections</h1>
      <p>A local, expandable view of one figure, faction, or event's web of connections.</p></div>
      <button id="connections-close" type="button" aria-label="Close connections explorer">Close ✕</button></div>
    <div class="focus-toolbar">
      <div class="focus-search"><label for="connections-search">Center on</label>
        <input id="connections-search" type="search" placeholder="Search a name…" autocomplete="off">
        <div id="connections-search-results" hidden></div></div>
      <label>Kind<select id="connections-kind"><option value="">All kinds</option>
        ${Object.entries(kindLabels).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
      <label>Relationship type<select id="connections-type"><option value="">All types</option>
        ${Object.entries(typeLabels).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
    </div>
    <div class="focus-navigation">
      <button id="connections-back" type="button">← Back</button>
      <button id="connections-forward" type="button">Forward →</button>
      <button id="connections-recenter" type="button" class="focus-primary">Re-center here</button>
      <button id="connections-collapse" type="button">Collapse this branch</button>
      <button id="connections-full" type="button">Full timeline ↗</button>
    </div>
    <p class="focus-instructions">Click a node to select it, click it again to show more of its connections. Click an edge to see every recorded link between the two.</p>
    <div class="focus-body">
      <div class="focus-canvas"><p id="focus-count"></p><svg id="focus-graph"></svg>
        <div class="focus-zoom"><button id="connections-zoom-in" type="button">+</button><button id="connections-zoom-out" type="button">−</button></div>
      </div>
      <div id="focus-detail"></div>
    </div>`;
  document.body.append(dialog);
  const $ = id => document.getElementById(id);

  let state = null, history = [], future = [], onReturn = null;

  function pushState(next) { if (state) history.push(state); future = []; state = next; draw(); }
  function replaceState(next) { state = next; draw(); }

  function recenter(id) { pushState({ ...core.initial(id) }); }
  function expand(id) {
    const next = structuredClone(state);
    if (!next.expanded.includes(id)) next.expanded.push(id);
    else next.limits[id] = (next.limits[id] || 12) + 12;
    next.selectedId = id;
    pushState(next);
  }
  function collapseBranch(id) {
    const next = structuredClone(state);
    next.expanded = next.expanded.filter(x => x !== id);
    if (next.selectedId === id) next.selectedId = next.rootId;
    pushState(next);
  }

  const svg = d3.select('#focus-graph');
  const canvas = () => document.querySelector('.focus-canvas');
  const fg = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => fg.attr('transform', e.transform));
  svg.call(zoom);

  let chosenEdge = null;

  function draw() {
    $('connections-back').disabled = !history.length;
    $('connections-forward').disabled = !future.length;
    const view = core.view(graph, state, preferred);
    $('focus-count').textContent = `${view.nodes.length} nodes shown · ${view.edges.length} connections`;
    const w = canvas().clientWidth || 600, h = canvas().clientHeight || 400;

    const simNodes = view.nodes.map(n => ({ ...n }));
    const byId = new Map(simNodes.map(n => [n.id, n]));
    // Keep the original string ids (recordSource/recordTarget) distinct from
    // source/target, which d3.forceLink/positioning need resolved to node
    // objects — showEdgeDetail must never look up a node by a node object.
    const simLinks = view.edges.map(e => ({ ...e, recordSource: e.source, recordTarget: e.target, source: byId.get(e.source), target: byId.get(e.target) }));

    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id(d => d.id).distance(90).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide(d => (d.r || 12) + 20))
      .stop();
    for (let i = 0; i < 180; i++) sim.tick();

    fg.selectAll('*').remove();
    const edgeSel = fg.append('g').selectAll('g').data(simLinks).join('g').attr('class', 'focus-edge')
      .classed('focus-edge-selected', d => chosenEdge && chosenEdge.key === d.key);
    edgeSel.append('line').attr('class', 'focus-edge-hit')
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    edgeSel.append('line').attr('class', 'focus-edge-line')
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    edgeSel.on('click', (e, d) => { e.stopPropagation(); chosenEdge = d; showEdgeDetail(d); draw(); });

    const nodeSel = fg.append('g').selectAll('g').data(simNodes).join('g')
      .attr('class', d => `focus-node ${d.id === state.rootId ? 'focus-root' : ''} ${d.id === state.selectedId ? 'focus-selected' : ''} ${state.expanded.includes(d.id) ? 'focus-expanded' : ''}`)
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.label}. Expand connections.`);
    nodeSel.append('circle').attr('r', d => d.r || 12).attr('fill', d => d.color).attr('stroke', d => d.stroke);
    nodeSel.append('text').attr('y', d => (d.r || 12) + 16).attr('text-anchor', 'middle').text(d => d.label);
    nodeSel.on('click', (e, d) => { e.stopPropagation(); expand(d.id); showNodeDetail(d.id); })
      .on('keydown', (e, d) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expand(d.id); showNodeDetail(d.id); } });

    // An edge click sets chosenEdge and shows its own detail before calling
    // draw(); don't let this redraw clobber that with the node detail.
    if (!chosenEdge) showNodeDetail(state.selectedId);
  }

  function showNodeDetail(id) {
    chosenEdge = null;
    const node = graph.nodes.get(id); if (!node) return;
    const detail = $('focus-detail'); detail.replaceChildren();
    const h2 = el('h2', node.label); detail.append(h2);
    detail.append(el('p', node.type, 'focus-eyebrow'));
    detail.append(el('p', FigureReference.excerpt(node.desc, 400)));
    if (FigureReference.kind(node)) detail.append(button('Open figure profile', () => { dialog.close(); window.openFigureReference(id, '', () => dialog.showModal()); }));
    detail.append(button('View on timeline ↗', () => { dialog.close(); selectNode(node); }));
    detail.append(button('Collapse this branch', () => collapseBranch(id)));
    const neighborList = core.neighbors(graph, id, state, preferred);
    if (neighborList.length) {
      detail.append(el('h3', `Connections (${neighborList.length})`));
      neighborList.forEach(item => {
        const other = graph.nodes.get(item.id);
        const row = el('button', undefined, 'focus-text-button');
        row.type = 'button';
        row.append(el('div', other.label));
        row.addEventListener('click', () => { expand(item.id); showNodeDetail(item.id); });
        detail.append(row);
      });
    }
  }

  function showEdgeDetail(edge) {
    const detail = $('focus-detail'); detail.replaceChildren();
    const sourceNode = graph.nodes.get(edge.recordSource), targetNode = graph.nodes.get(edge.recordTarget);
    detail.append(el('h2', 'Recorded connections'));
    detail.append(button(sourceNode.label, () => showNodeDetail(sourceNode.id)));
    detail.append(button(targetNode.label, () => showNodeDetail(targetNode.id)));
    edge.records.forEach(r => {
      const rec = el('div', undefined, 'focus-record');
      const fromLabel = graph.nodes.get(r.source)?.label || r.source, toLabel = graph.nodes.get(r.target)?.label || r.target;
      rec.append(el('p', `${fromLabel} → ${r.label || typeLabels[r.type] || r.type} → ${toLabel}`));
      rec.append(el('small', `${typeLabels[r.type] || r.type} · Volume ${r.volume}${Number.isInteger(r.section) ? ` · Section ${r.section}` : ''}`));
      detail.append(rec);
    });
  }

  function setFilter(key, value) {
    const next = structuredClone(state); next[key] = value; replaceState(next);
  }
  $('connections-kind').addEventListener('change', e => setFilter('nodeKind', e.target.value));
  $('connections-type').addEventListener('change', e => setFilter('linkType', e.target.value));
  $('connections-back').addEventListener('click', () => { if (!history.length) return; future.push(state); state = history.pop(); draw(); });
  $('connections-forward').addEventListener('click', () => { if (!future.length) return; history.push(state); state = future.pop(); draw(); });
  $('connections-recenter').addEventListener('click', () => recenter(state.selectedId));
  $('connections-collapse').addEventListener('click', () => collapseBranch(state.selectedId));
  $('connections-full').addEventListener('click', () => { dialog.close(); selectNode(graph.nodes.get(state.selectedId)); });
  $('connections-zoom-in').addEventListener('click', () => svg.transition().duration(200).call(zoom.scaleBy, 1.4));
  $('connections-zoom-out').addEventListener('click', () => svg.transition().duration(200).call(zoom.scaleBy, 0.7));
  svg.on('click', () => { chosenEdge = null; draw(); });

  const searchInput = $('connections-search'), searchResults = $('connections-search-results');
  function renderSearch() {
    const query = searchInput.value.trim(); searchResults.replaceChildren();
    if (!query) { searchResults.hidden = true; return; }
    const matches = TimelineCore.search(nodes.filter(n => graph.nodes.has(n.id)), query).slice(0, 10);
    matches.forEach(n => searchResults.append(button(n.label, () => { searchInput.value = ''; searchResults.hidden = true; recenter(n.id); })));
    searchResults.hidden = !matches.length;
  }
  searchInput.addEventListener('input', renderSearch);

  function open(id, returnHandler) {
    onReturn = returnHandler || null;
    history = []; future = [];
    $('connections-kind').value = ''; $('connections-type').value = '';
    recenter(id);
    dialog.showModal();
  }
  $('btn-connections').addEventListener('click', () => open(Object.keys(FIGURE_KEY_LINKS)[0] || nodes.find(n => !['CENTER', 'CAT'].includes(n.group))?.id));
  $('connections-close').addEventListener('click', () => { dialog.close(); if (onReturn) { const r = onReturn; onReturn = null; r(); } });
  window.openConnections = open;
})();
