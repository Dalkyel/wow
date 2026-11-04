const test = require('node:test');
const assert = require('node:assert/strict');
const stars = require('../stars-core.js');

test('sourceEntries imports only nodes with a non-empty star field, from the latest revision', () => {
  const revisions = [
    { id: 'a', label: 'A', volume: 1, star: 'An open question', desc: '' },
    { id: 'b', label: 'B', volume: 1, star: '', desc: '' },
  ];
  const entries = stars.sourceEntries(revisions);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, 'source:1:a');
  assert.equal(entries[0].origin, 'source');
});

test('detectStatus reads an inline STATUS marker from desc or star', () => {
  assert.equal(stars.detectStatus({ desc: 'Some text. STATUS: RESOLVED', star: '' }), 'resolved');
  assert.equal(stars.detectStatus({ desc: '', star: 'STATUS: OPEN' }), 'open');
  assert.equal(stars.detectStatus({ desc: 'No marker here', star: '' }), null);
});
