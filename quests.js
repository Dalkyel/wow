// ── Quest log ───────────────────────────────────────
(() => {
  'use strict';
  const dialog = document.getElementById('quest-panel');
  const body = document.getElementById('quest-body');
  const btnQuests = document.getElementById('btn-quests');
  const questClose = document.getElementById('quest-close');

  // Reuses the same mention-matcher the Chronicle journal links through (built once
  // in timeline.js from the full merged graph, volume0's in-game lore included) so an
  // NPC/location name already in the lore graph renders as a clickable link here too;
  // an unmatched name just stays plain text.
  function linkifyText(el) {
    if (!mentionMatcher.regex) return;
    const matches = FigureReference.findMentions(el.textContent, mentionMatcher);
    if (!matches.length) return;
    const text = el.textContent;
    el.replaceChildren();
    let cursor = 0;
    matches.forEach(m => {
      if (m.start > cursor) el.append(text.slice(cursor, m.start));
      const link = document.createElement('button');
      link.type = 'button'; link.className = 'mention'; link.dataset.id = m.id;
      link.textContent = m.text;
      el.append(link);
      cursor = m.end;
    });
    if (cursor < text.length) el.append(text.slice(cursor));
  }

  function render() {
    body.replaceChildren();
    if (!quests.length) {
      const empty = document.createElement('p');
      empty.className = 'reference-empty';
      empty.textContent = "Nothing logged here yet. I haven't set out from the valley.";
      body.append(empty);
      return;
    }
    QuestCore.groupByLocation(quests).forEach(({ location, quests: group }) => {
      const locationGroup = document.createElement('details');
      locationGroup.className = 'quest-location-group';
      const heading = document.createElement('summary');
      heading.className = 'quest-location';
      heading.textContent = `${location} (${group.length})`;
      linkifyText(heading);
      locationGroup.append(heading);
      group.forEach(q => {
        const item = document.createElement('details');
        item.className = 'quest-item';
        const name = document.createElement('summary');
        name.textContent = q.name;
        item.append(name);
        if (q.npcs?.length) {
          const npcs = document.createElement('p');
          npcs.className = 'quest-npcs';
          npcs.textContent = q.npcs.join(', ');
          linkifyText(npcs);
          item.append(npcs);
        }
        if (q.objective) {
          const objective = document.createElement('p');
          objective.className = 'quest-objective';
          objective.textContent = q.objective;
          linkifyText(objective);
          item.append(objective);
        }
        if (q.note) {
          const note = document.createElement('p');
          note.textContent = q.note;
          item.append(note);
        }
        locationGroup.append(item);
      });
      body.append(locationGroup);
    });
  }

  body.addEventListener('click', event => {
    const link = event.target.closest('.mention');
    if (!link) return;
    event.preventDefault(); // mentions can sit inside a <summary>; don't let the click also toggle it
    const id = link.dataset.id;
    const reopen = () => { if (!dialog.open) dialog.showModal(); };
    if (FigureReference.kind(nodeMap[id])) window.openFigureReference(id, '', reopen);
    else window.openConnections?.(id, reopen);
  });

  function open() { render(); if (!dialog.open) dialog.showModal(); }
  btnQuests.addEventListener('click', open);
  document.getElementById('btn-open-quests').addEventListener('click', open);
  questClose.addEventListener('click', () => dialog.close());
})();
