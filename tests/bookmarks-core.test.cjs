const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../bookmarks-core.js');

test('validate rejects an unknown kind and dedupes repeated entries', () => {
  assert.throws(() => store.validate({ version: 1, items: [{ kind: 'bogus', id: 'x' }] }));
  const result = store.validate({ version: 1, items: [{ kind: 'node', id: 'a' }, { kind: 'node', id: 'a' }] });
  assert.equal(result.length, 1);
});

test('visible resolves node bookmarks to current labels', () => {
  const nodes = [{ id: 'a', label: 'A', type: 'Titan' }];
  const result = store.visible([{ kind: 'node', id: 'a' }], nodes, []);
  assert.equal(result[0].label, 'A');
  assert.equal(result[0].subtitle, 'Titan');
});

test('visible falls back to the current source note for a stale note bookmark id', () => {
  const notes = [{ id: 'source:2:a', origin: 'source', nodeIds: ['a'], title: 'Updated title' }];
  const result = store.visible([{ kind: 'note', id: 'source:1:a' }], [], notes);
  assert.equal(result.length, 1);
  assert.equal(result[0].label, 'Updated title');
  assert.equal(result[0].targetId, 'source:2:a');
});

test('visible drops a bookmark whose target no longer exists', () => {
  const result = store.visible([{ kind: 'node', id: 'missing' }], [], []);
  assert.equal(result.length, 0);
});
