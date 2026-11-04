const test = require('node:test');
const assert = require('node:assert/strict');
const notes = require('../lore-notes-core.js');

test('sourceEntries imports only nodes with a non-empty star field, from the latest revision', () => {
  const revisions = [
    { id: 'a', label: 'A', volume: 1, star: 'An open question', desc: '' },
    { id: 'b', label: 'B', volume: 1, star: '', desc: '' },
  ];
  const entries = notes.sourceEntries(revisions);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, 'source:1:a');
  assert.equal(entries[0].origin, 'source');
});

test('detectStatus reads an inline STATUS marker from desc or star', () => {
  assert.equal(notes.detectStatus({ desc: 'Some text. STATUS: RESOLVED', star: '' }), 'resolved');
  assert.equal(notes.detectStatus({ desc: '', star: 'STATUS: OPEN' }), 'open');
  assert.equal(notes.detectStatus({ desc: 'No marker here', star: '' }), null);
});

test('entries merges saved reader edits over imported source entries without losing the note', () => {
  const revisions = [{ id: 'a', label: 'A', volume: 1, star: 'Original note', desc: '' }];
  const saved = { 'source:1:a': { evidence: 'Reader-added evidence' } };
  const result = notes.entries(revisions, saved);
  const entry = result.find(c => c.id === 'source:1:a');
  assert.equal(entry.evidence, 'Reader-added evidence');
  assert.equal(entry.note, 'Original note');
  assert.equal(entry.reviewedByReader, true);
});

test('validateBackup rejects a file with the wrong format tag', () => {
  assert.throws(() => notes.validateBackup({ format: 'something-else', version: 1, entries: [] }));
});

test('validateBackup accepts a well-formed backup and preserves its fields', () => {
  const entry = { id: 'reader:abc', origin: 'reader', status: 'open', volume: 1, nodeIds: ['a'],
    title: 'A question', note: '', evidence: '', theory: '', section: '', history: [] };
  const result = notes.validateBackup({ format: 'wow-lore-notes', version: 1, entries: [entry] });
  assert.deepEqual(result['reader:abc'], entry);
});
