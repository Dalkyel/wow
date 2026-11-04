// ── Notable entries (★) ─────────────────────────────────
// Read-only: lists every entity that already carries a ★ note in the committed lore
// data (StarsCore.sourceEntries), sorted by how many ★ it carries. No storage of any
// kind — identical on every device, unlike the bookmarks feature this replaced.
(() => {
  'use strict';
  const dialog = document.getElementById('stars-panel');
  const body = document.getElementById('stars-body');
  const btnStars = document.getElementById('btn-stars');
  const starsClose = document.getElementById('stars-close');

  const starCount = note => (note.match(/★/g) || []).length;

  function render() {
    body.replaceChildren();
    const entries = StarsCore.sourceEntries(figureSourceRevisions)
      .slice()
      .sort((a, b) => starCount(b.note) - starCount(a.note) || a.title.localeCompare(b.title));
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'reference-empty';
      empty.textContent = 'Nothing flagged yet.';
      body.append(empty);
      return;
    }
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.className = 'quest-item';
      const name = document.createElement('button');
      name.type = 'button'; name.className = 'conn-target';
      name.textContent = entry.title;
      const nodeId = entry.nodeIds[0];
      name.addEventListener('click', () => {
        const reopen = () => { if (!dialog.open) dialog.showModal(); };
        if (FigureReference.kind(nodeMap[nodeId])) window.openFigureReference(nodeId, '', reopen);
        else window.openConnections?.(nodeId, reopen);
      });
      item.append(name);
      const note = document.createElement('p');
      note.textContent = entry.note;
      item.append(note);
      body.append(item);
    });
  }

  function open() { render(); if (!dialog.open) dialog.showModal(); }
  btnStars.addEventListener('click', open);
  starsClose.addEventListener('click', () => dialog.close());
})();
