const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../quests-core.js');

test('groupByLocation groups entries sharing a location together', () => {
  const quests = [
    { id: 'a', name: 'A', location: 'Valley of Trials' },
    { id: 'b', name: 'B', location: 'Valley of Trials' },
  ];
  const groups = core.groupByLocation(quests);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].location, 'Valley of Trials');
  assert.deepEqual(groups[0].quests.map(q => q.id), ['a', 'b']);
});

test('groupByLocation preserves first-seen location order', () => {
  const quests = [
    { id: 'a', name: 'A', location: 'Durotar' },
    { id: 'b', name: 'B', location: 'Orgrimmar' },
    { id: 'c', name: 'C', location: 'Durotar' },
  ];
  const groups = core.groupByLocation(quests);
  assert.deepEqual(groups.map(g => g.location), ['Durotar', 'Orgrimmar']);
  assert.deepEqual(groups[0].quests.map(q => q.id), ['a', 'c']);
});

test('groupByLocation falls back to "Unknown" for entries with no location', () => {
  const quests = [{ id: 'a', name: 'A' }];
  const groups = core.groupByLocation(quests);
  assert.equal(groups[0].location, 'Unknown');
});
