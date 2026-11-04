(function (root) {
  'use strict';

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function eraOrder(eras) {
    return new Map(eras.slice().sort((a, b) => a.order - b.order).map((e, i) => [e.id, i]));
  }

  // Nodes that share the exact same computed position (e.g. two titans with
  // the same chronOrder, since Chronicle rarely gives a precise relative
  // date) would otherwise land on the identical x and visually merge into
  // one circle. Spread ties apart by a small, fixed amount in position-space
  // — enough to be visibly distinct markers, small enough to never approach
  // a neighboring band or a genuinely different position.
  const TIE_SPREAD = 3;
  function spreadTies(positions, nodes) {
    const groups = new Map();
    nodes.forEach(n => {
      const value = positions.get(n.id);
      if (value == null) return;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(n);
    });
    groups.forEach(group => {
      if (group.length < 2) return;
      const sorted = group.slice().sort((a, b) => a.id.localeCompare(b.id));
      const center = (sorted.length - 1) / 2;
      sorted.forEach((n, i) => positions.set(n.id, positions.get(n.id) + (i - center) * TIE_SPREAD));
    });
  }

  // Position every node along the in-universe chronology axis: one band per era
  // (in era-registry order), nodes spread within their band by chronOrder.
  function eraPositions(eras, nodes, options = {}) {
    const bandWidth = options.bandWidth ?? 100;
    const order = eraOrder(eras);
    const byEra = new Map();
    nodes.forEach(n => {
      if (!n.era || !order.has(n.era)) return;
      if (!byEra.has(n.era)) byEra.set(n.era, []);
      byEra.get(n.era).push(n);
    });
    const positions = new Map();
    nodes.forEach(n => {
      if (!n.era || !order.has(n.era)) { positions.set(n.id, null); return; }
      const band = order.get(n.era) * bandWidth;
      const siblings = byEra.get(n.era);
      const values = siblings.map(s => s.chronOrder ?? 0);
      const min = Math.min(...values), max = Math.max(...values);
      const span = max - min || 1;
      const offset = ((n.chronOrder ?? 0) - min) / span * (bandWidth * 0.8) + bandWidth * 0.1;
      positions.set(n.id, band + offset);
    });
    spreadTies(positions, nodes.filter(n => n.era && order.has(n.era)));
    return positions;
  }

  // Position every node along the reading-order axis: one band per volume,
  // nodes spread within their band by section number.
  function readingPositions(nodes, options = {}) {
    const bandWidth = options.bandWidth ?? 100;
    const byVolume = new Map();
    nodes.forEach(n => {
      if (!n.volume) return;
      if (!byVolume.has(n.volume)) byVolume.set(n.volume, []);
      byVolume.get(n.volume).push(n);
    });
    const positions = new Map();
    nodes.forEach(n => {
      if (!n.volume) { positions.set(n.id, null); return; }
      const band = (n.volume - 1) * bandWidth;
      const siblings = byVolume.get(n.volume);
      const values = siblings.map(s => s.section ?? 0);
      const min = Math.min(...values), max = Math.max(...values);
      const span = max - min || 1;
      const offset = ((n.section ?? 0) - min) / span * (bandWidth * 0.8) + bandWidth * 0.1;
      positions.set(n.id, band + offset);
    });
    spreadTies(positions, nodes.filter(n => n.volume));
    return positions;
  }

  // Assign each node a vertical swimlane by category (group). laneOrder, if
  // given, fixes the first N lanes; any other group present gets appended.
  function laneAssignment(nodes, laneOrder = []) {
    const order = laneOrder.slice();
    const seen = new Set(order);
    nodes.forEach(n => { if (!seen.has(n.group)) { seen.add(n.group); order.push(n.group); } });
    const laneByGroup = new Map(order.map((g, i) => [g, i]));
    const lanes = new Map(nodes.map(n => [n.id, laneByGroup.get(n.group) ?? order.length]));
    return { lanes, laneByGroup, order };
  }

  function search(nodes, query) {
    const q = normalize(query);
    if (!q) return nodes;
    return nodes.filter(n => normalize(`${n.label} ${n.id} ${n.type}`).includes(q));
  }

  const api = { normalize, eraOrder, eraPositions, readingPositions, laneAssignment, search };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TimelineCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
