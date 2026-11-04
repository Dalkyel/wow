(function (root) {
  'use strict';
  const endpoint = value => typeof value === 'object' ? value.id : value;
  const FIGURE_GROUPS = ['TITAN', 'OLD_GOD', 'DRAGON_ASPECT', 'NAARU'];
  const FACTION_GROUPS = ['PANTHEON', 'ORC_CLAN', 'HUMAN_KINGDOM', 'NIGHT_ELF', 'BURNING_LEGION', 'FACTION'];
  function kind(node) {
    if (FIGURE_GROUPS.includes(node.group)) return 'figures';
    if (FACTION_GROUPS.includes(node.group)) return 'factions';
    if (node.group === 'EVENT') return 'events';
    if (node.group === 'LOCATION') return 'locations';
    if (node.group === 'ARTIFACT') return 'artifacts';
    return 'lore';
  }
  function index(nodes, links) {
    const byId = new Map(nodes.filter(n => !['CENTER', 'CAT'].includes(n.group)).map(n => [n.id, n]));
    const adjacency = new Map([...byId.keys()].map(id => [id, new Map()]));
    links.forEach(link => {
      const source = endpoint(link.source), target = endpoint(link.target);
      if (!byId.has(source) || !byId.has(target) || source === target) return;
      const pair = [source, target].sort();
      const key = JSON.stringify(pair);
      let edge = adjacency.get(source).get(target);
      if (!edge) edge = { key, source: pair[0], target: pair[1], records: [] };
      edge.records.push({ source, target, label: link.label || '', type: link.type, volume: link.volume || 1,
        ...(Number.isInteger(link.section) ? { section: link.section } : {}) });
      adjacency.get(source).set(target, edge);
      adjacency.get(target).set(source, edge);
    });
    return { nodes: byId, adjacency };
  }
  function neighbors(graph, id, state, preferred = {}) {
    const priority = new Map((preferred[id] || []).map((key, i) => [key, i]));
    return [...(graph.adjacency.get(id)?.entries() || [])].map(([other, edge]) => ({
      id: other, edge: { ...edge, records: edge.records.filter(r => !state.linkType || r.type === state.linkType) },
    })).filter(item => item.edge.records.length && (!state.nodeKind || kind(graph.nodes.get(item.id)) === state.nodeKind))
      .sort((a, b) => (priority.get(a.id) ?? 1000) - (priority.get(b.id) ?? 1000) ||
        Number(kind(graph.nodes.get(b.id)) === 'figures') - Number(kind(graph.nodes.get(a.id)) === 'figures') ||
        graph.nodes.get(a.id).label.localeCompare(graph.nodes.get(b.id).label));
  }
  function initial(rootId) {
    return { rootId, selectedId: rootId, expanded: [rootId], limits: { [rootId]: 12 }, nodeKind: '', linkType: '' };
  }
  function view(graph, state, preferred = {}) {
    if (!graph.nodes.has(state.rootId)) return { nodes: [], edges: [], ids: new Set() };
    const ids = new Set([state.rootId]), queue = [state.rootId], visited = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id) || !state.expanded.includes(id)) continue;
      visited.add(id);
      const candidates = neighbors(graph, id, state, preferred);
      const limit = state.limits[id] || 12;
      candidates.slice(0, limit).forEach(item => {
        if (!ids.has(item.id)) { ids.add(item.id); queue.push(item.id); }
      });
    }
    const edges = new Map();
    ids.forEach(id => {
      graph.adjacency.get(id).forEach(edge => {
        if (!ids.has(edge.source) || !ids.has(edge.target)) return;
        const records = edge.records.filter(r => !state.linkType || r.type === state.linkType);
        if (records.length) edges.set(edge.key, { ...edge, records });
      });
    });
    return { nodes: [...ids].map(id => graph.nodes.get(id)), edges: [...edges.values()], ids };
  }
  const api = { kind, index, neighbors, initial, view };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConnectionsExplorer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
