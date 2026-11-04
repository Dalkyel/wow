(function (root) {
  'use strict';
  function validate(data) {
    if (!data || data.version !== 1 || !Array.isArray(data.items)) throw Error('Could not read the saved bookmarks.');
    const unique = new Map();
    for (const item of data.items) {
      if (!item || !['node', 'note'].includes(item.kind) || typeof item.id !== 'string' || !item.id || item.id.length > 512) {
        throw Error('The saved bookmarks contain an invalid entry.');
      }
      unique.set(JSON.stringify([item.kind, item.id]), { kind: item.kind, id: item.id });
    }
    return [...unique.values()];
  }
  function visible(items, nodes, notes) {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const noteMap = new Map(notes.map(c => [c.id, c]));
    return items.flatMap(item => {
      let source = item.kind === 'node' ? nodeMap.get(item.id) : noteMap.get(item.id);
      // A source bookmark created from an older volume still opens that topic's current note.
      if (!source && item.kind === 'note') {
        const nodeId = item.id.match(/^source:\d+:(.+)$/)?.[1];
        if (nodeId) source = notes.find(c => c.origin === 'source' && c.nodeIds.includes(nodeId));
      }
      return source ? [{ ...item, label: item.kind === 'node' ? source.label : source.title,
        ...(source.id !== item.id ? { targetId: source.id } : {}),
        subtitle: item.kind === 'node' ? source.type : 'Lore note' }] : [];
    });
  }
  const api = { validate, visible };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BookmarkStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
