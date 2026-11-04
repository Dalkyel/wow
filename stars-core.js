/* Pure data helper shared by the Notable-entries (★) panel and its tests.
   Extracts every node flagged with a ★ significance/ambiguity note in the
   archive — committed, device-independent data. This used to also back a
   reader-editable lore-notes board (status tracking, evidence, JSON backups,
   all in localStorage); that board was removed, and with it the functions
   that only existed to serve it. */
(function (root) {
  'use strict';
  const statusTagToStatus = { RESOLVED: 'resolved', PARTIAL: 'partial', OPEN: 'open', DISCARDED: 'resolved' };
  // Archive text can tag its own resolution inline as "STATUS: X".
  function detectStatus(node) {
    for (const text of [node.desc, node.star]) {
      if (!text) continue;
      const matches = [...text.matchAll(/STATUS:\s*(RESOLVED|PARTIAL|OPEN|DISCARDED)/g)];
      if (matches.length) return statusTagToStatus[matches[matches.length - 1][1]];
    }
    return null;
  }

  function sourceEntries(revisions) {
    const latest = new Map();
    revisions.forEach(n => latest.set(n.id, n));
    return [...latest.values()].filter(n => n.star && n.star.trim()).map(n => ({
      id: `source:${n.volume}:${n.id}`, title: n.label, note: n.star,
      status: detectStatus(n) || 'unreviewed', volume: n.volume, nodeIds: [n.id], origin: 'source',
    }));
  }

  const api = { sourceEntries, detectStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StarsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
