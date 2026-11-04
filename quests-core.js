// Pure data helper shared by the quest log panel and its tests.
(function (root) {
  'use strict';

  // Groups quests by location, preserving the order each location first appears in.
  function groupByLocation(quests) {
    const order = [];
    const groups = new Map();
    quests.forEach(q => {
      const key = q.location || 'Unknown';
      if (!groups.has(key)) { groups.set(key, []); order.push(key); }
      groups.get(key).push(q);
    });
    return order.map(location => ({ location, quests: groups.get(location) }));
  }

  const api = { groupByLocation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuestCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
