(function (root) {
  'use strict';
  // Merge the complete archive. Later volumes' fields win by id; every revision is kept.
  function merge(volumes) {
    const nodes = new Map(), links = [], revisions = [], timeline = [], broken = new Set();
    const ordered = [...volumes].sort((a, b) => a.volume - b.volume);
    ordered.forEach(vol => {
      vol.nodes.forEach(source => {
        const revision = { ...source, volume: vol.volume };
        revisions.push(revision);
        nodes.set(source.id, { ...nodes.get(source.id), ...revision });
      });
      vol.links.forEach(source => {
        if (source.status === 'broken') broken.add(JSON.stringify([source.source, source.target, source.label]));
        else links.push({ ...source, volume: vol.volume });
      });
      vol.timeline.forEach(entry => timeline.push({ ...entry, volume: vol.volume }));
    });
    return { nodes: [...nodes.values()], revisions, timeline, maxVolume: Math.max(...ordered.map(vol => vol.volume)),
      links: links.filter(link => !broken.has(JSON.stringify([link.source, link.target, link.label])) && nodes.has(link.source) && nodes.has(link.target)) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { merge }; else root.ArchiveData = { merge };
})(typeof globalThis !== 'undefined' ? globalThis : this);
