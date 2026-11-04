/* Pure data helpers shared by the lore-notes board and its validation tests.
   Chronicle is a fixed, published text — there's no reader mystery to solve
   here, so this reinterprets the clue-board status model as lore-consistency
   notes: retcons, contradictions with other sources, and open ambiguities. */
(function (root) {
  'use strict';
  const statuses = {
    unreviewed: 'Unreviewed', open: 'Open', partial: 'Partially resolved',
    resolved: 'Resolved', contradicted: 'Contradicted',
  };
  const normalize = text => String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Archive text can tag its own resolution inline as "STATUS: X"; reuse that
  // evidence-backed marker as the default status instead of always starting
  // at "unreviewed". DISCARDED has no dedicated status; closest is resolved.
  const statusTagToStatus = { RESOLVED: 'resolved', PARTIAL: 'partial', OPEN: 'open', DISCARDED: 'resolved' };
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
      status: detectStatus(n) || 'unreviewed', volume: n.volume, nodeIds: [n.id],
      evidence: '', theory: '', section: '', history: [], origin: 'source',
    }));
  }

  function entries(revisions, saved) {
    const imported = sourceEntries(revisions);
    const ids = new Set(imported.map(c => c.id));
    return imported.map(c => ({ ...c, ...(saved[c.id] || {}), note: c.note, reviewedByReader: Object.hasOwn(saved, c.id) }))
      // Retain edits to older source observations as well as independent reader notes.
      .concat(Object.values(saved).filter(c => !ids.has(c.id)).map(c => ({ ...c, reviewedByReader: true })));
  }

  // Validate the whole file before merging; never partially import a bad backup.
  function validateBackup(data) {
    if (!data || data.format !== 'wow-lore-notes' || data.version !== 1 || !Array.isArray(data.entries)) {
      throw new Error('This file is not a compatible lore-notes backup.');
    }
    const result = Object.create(null);
    const validPoint = point => point && [1, 2, 3, 4].includes(point.volume) && Number.isInteger(point.section) && point.section >= 0;
    function clean(c, allowVersions = true) {
      if (!c || typeof c.id !== 'string' || !/^(source:[1-4]:.+|reader:[\w-]+)$/.test(c.id) ||
          !['source', 'reader'].includes(c.origin) || !Object.hasOwn(statuses, c.status) ||
          ![1, 2, 3, 4].includes(c.volume) || !Array.isArray(c.nodeIds) || !c.nodeIds.every(x => typeof x === 'string') ||
          !['title', 'note', 'evidence', 'theory', 'section'].every(k => typeof c[k] === 'string') ||
          !c.title.trim() || !Array.isArray(c.history) ||
          !c.history.every(h => h && typeof h.at === 'string' && typeof h.text === 'string' && (!h.reading || validPoint(h.reading))) ||
          (c.availableAt && !validPoint(c.availableAt)) || (c.updatedAt && typeof c.updatedAt !== 'string') ||
          (c.versions && (!allowVersions || !Array.isArray(c.versions))) ||
          (c.origin === 'source' && !c.id.startsWith(`source:${c.volume}:`)) ||
          (c.origin === 'reader' && !c.id.startsWith('reader:'))) {
        throw new Error('An entry has incomplete or invalid data. The file was not imported.');
      }
      const value = {
        id: c.id, origin: c.origin, status: c.status, volume: c.volume,
        nodeIds: [...c.nodeIds], title: c.title, note: c.note,
        evidence: c.evidence, theory: c.theory, section: c.section,
        history: c.history.map(h => ({ at: h.at, text: h.text, ...(h.reading ? { reading: { ...h.reading } } : {}) })),
        ...(c.availableAt ? { availableAt: { ...c.availableAt } } : {}),
        ...(c.updatedAt ? { updatedAt: c.updatedAt } : {}),
      };
      if (c.versions) value.versions = c.versions.map(version => {
        const snapshot = clean(version, false);
        if (snapshot.id !== c.id || snapshot.origin !== c.origin) throw new Error('A revision does not belong to its entry.');
        return snapshot;
      });
      return value;
    }
    for (const c of data.entries) {
      const value = clean(c);
      if (Object.hasOwn(result, value.id)) throw new Error('The backup contains duplicate entries.');
      result[value.id] = value;
    }
    return result;
  }

  const api = { statuses, normalize, sourceEntries, entries, validateBackup, detectStatus };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LoreNotes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
