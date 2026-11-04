// ── Quest log ───────────────────────────────────────
(() => {
  'use strict';
  const dialog = document.getElementById('quest-panel');
  const body = document.getElementById('quest-body');
  const btnQuests = document.getElementById('btn-quests');
  const questClose = document.getElementById('quest-close');

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
      const heading = document.createElement('div');
      heading.className = 'quest-location';
      heading.textContent = location;
      body.append(heading);
      group.forEach(q => {
        const item = document.createElement('div');
        item.className = 'quest-item';
        const name = document.createElement('h3');
        name.textContent = q.name;
        item.append(name);
        if (q.note) {
          const note = document.createElement('p');
          note.textContent = q.note;
          item.append(note);
        }
        body.append(item);
      });
    });
  }

  function open() { render(); if (!dialog.open) dialog.showModal(); }
  btnQuests.addEventListener('click', open);
  questClose.addEventListener('click', () => dialog.close());
})();
