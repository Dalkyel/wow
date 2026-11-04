const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../timeline-core.js');

const ERAS = [
  { id: 'early', label: 'Early', order: 0 },
  { id: 'late', label: 'Late', order: 1 },
];

test('eraPositions places nodes in era order, spread by chronOrder within the band', () => {
  const nodes = [
    { id: 'a', era: 'early', chronOrder: 0 },
    { id: 'b', era: 'early', chronOrder: 10 },
    { id: 'c', era: 'late', chronOrder: 0 },
  ];
  const positions = core.eraPositions(ERAS, nodes, { bandWidth: 100 });
  assert.ok(positions.get('a') < positions.get('b'));
  assert.ok(positions.get('b') < positions.get('c'));
  assert.ok(positions.get('a') >= 0 && positions.get('a') < 100);
  assert.ok(positions.get('c') >= 100 && positions.get('c') < 200);
});

test('eraPositions returns null for nodes with no registered era', () => {
  const positions = core.eraPositions(ERAS, [{ id: 'x' }, { id: 'y', era: 'unknown-era' }]);
  assert.equal(positions.get('x'), null);
  assert.equal(positions.get('y'), null);
});

test('readingPositions places nodes in volume order, spread by section within the band', () => {
  const nodes = [
    { id: 'a', volume: 1, section: 1 },
    { id: 'b', volume: 1, section: 5 },
    { id: 'c', volume: 2, section: 1 },
  ];
  const positions = core.readingPositions(nodes, { bandWidth: 100 });
  assert.ok(positions.get('a') < positions.get('b'));
  assert.ok(positions.get('b') < positions.get('c'));
});

test('laneAssignment assigns one lane per group, honoring the requested order first', () => {
  const nodes = [{ id: 'a', group: 'EVENT' }, { id: 'b', group: 'TITAN' }, { id: 'c', group: 'TITAN' }, { id: 'd', group: 'NEW_GROUP' }];
  const { lanes, order } = core.laneAssignment(nodes, ['TITAN', 'EVENT']);
  assert.deepEqual(order.slice(0, 2), ['TITAN', 'EVENT']);
  assert.equal(lanes.get('b'), lanes.get('c'));
  assert.notEqual(lanes.get('a'), lanes.get('b'));
  assert.equal(order.includes('NEW_GROUP'), true);
});

test('eraPositions spreads nodes that share the exact same chronOrder instead of overlapping', () => {
  const nodes = [
    { id: 'a', era: 'early', chronOrder: 1 },
    { id: 'b', era: 'early', chronOrder: 1 },
    { id: 'c', era: 'early', chronOrder: 1 },
  ];
  const positions = core.eraPositions(ERAS, nodes, { bandWidth: 100 });
  const values = new Set([positions.get('a'), positions.get('b'), positions.get('c')]);
  assert.equal(values.size, 3, 'tied nodes must end up at distinct positions');
});

test('readingPositions spreads nodes that share the exact same section instead of overlapping', () => {
  const nodes = [
    { id: 'a', volume: 1, section: 2 },
    { id: 'b', volume: 1, section: 2 },
  ];
  const positions = core.readingPositions(nodes, { bandWidth: 100 });
  assert.notEqual(positions.get('a'), positions.get('b'));
});

test('search matches by label, id, or type, case- and accent-insensitively', () => {
  const nodes = [{ id: 'sargeras', label: "Sargéras", type: 'Titan' }, { id: 'aggramar', label: 'Aggramar', type: 'Titan' }];
  assert.deepEqual(core.search(nodes, 'sargeras').map(n => n.id), ['sargeras']);
  assert.deepEqual(core.search(nodes, 'titan').map(n => n.id).sort(), ['aggramar', 'sargeras']);
  assert.equal(core.search(nodes, '').length, 2);
});
