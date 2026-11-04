(() => {
  'use strict';
  const groupLabels = { TITAN: 'Titans', OLD_GOD: 'Old Gods', PANTHEON: 'Pantheons', DRAGON_ASPECT: 'Dragon Aspects',
    NAARU: 'Naaru', ORC_CLAN: 'Orc Clans', HUMAN_KINGDOM: 'Human Kingdoms', NIGHT_ELF: 'Night Elves',
    BURNING_LEGION: 'Burning Legion', EVENT: 'Events', LOCATION: 'Locations', ARTIFACT: 'Artifacts',
    FACTION: 'Factions', COSMOS: 'Cosmic Forces' };
  const el = (tag, text, className) => {
    const n = document.createElement(tag); if (text !== undefined) n.textContent = text;
    if (className) n.className = className; return n;
  };
  const legend = el('details', undefined, 'map-legend'); legend.id = 'map-legend';
  legend.open = !matchMedia('(max-width: 768px)').matches;
  legend.append(el('summary', 'Legend · categories & eras'), el('p', 'Colors group entries by category; the time axis follows the era registry (or reading order, when toggled).'));
  const colorList = el('div', undefined, 'map-legend-colors');
  const presentGroups = new Set(nodes.map(n => n.group));
  for (const [group, label] of Object.entries(groupLabels)) {
    if (!presentGroups.has(group)) continue;
    const item = el('span', undefined, 'map-legend-item');
    const swatch = el('i'); swatch.style.backgroundColor = GROUPS[group]?.color; swatch.style.borderColor = GROUPS[group]?.stroke;
    item.append(swatch, document.createTextNode(label)); colorList.append(item);
  }
  legend.append(colorList, el('p', 'Switch "Chronology" / "Reading order" above the graph to change what the horizontal axis follows.'));
  document.getElementById('graph-container').append(legend);

  // Along-axis label decluttering. Unlike the force-graph this replaces, event
  // positions are fixed by era/lane, so overlap is mostly horizontal, within a
  // single lane, at low zoom — a much smaller problem than free-floating
  // screen-space collision, so a simple left-to-right spacing pass is enough.
  function declutter() {
    const svgNode = document.getElementById('graph');
    const transform = d3.zoomTransform(svgNode), k = transform.k;
    const byLane = new Map();
    document.querySelectorAll('.event-node').forEach(node => {
      const match = node.getAttribute('transform')?.match(/translate\(([-\d.]+),([-\d.]+)\)/);
      if (!match) return;
      const x = parseFloat(match[1]) * k + transform.x;
      const y = Math.round(parseFloat(match[2]) * k + transform.y);
      if (!byLane.has(y)) byLane.set(y, []);
      byLane.get(y).push({ el: node, x, selected: node.classList.contains('selected') });
    });
    byLane.forEach(items => {
      items.sort((a, b) => a.x - b.x);
      let lastShownX = -Infinity;
      items.forEach(item => {
        const label = item.el.querySelector('.event-label');
        if (!label) return;
        const show = item.selected || item.x - lastShownX > 46;
        label.style.display = show ? null : 'none';
        if (show) lastShownX = item.x;
      });
    });
  }
  let pending = false;
  function refresh() { if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; declutter(); }); } }
  window.refreshTimelineReadability = refresh;
  legend.addEventListener('toggle', refresh);
  new ResizeObserver(refresh).observe(document.getElementById('graph-container'));
  refresh();
})();
