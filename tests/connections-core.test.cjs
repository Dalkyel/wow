const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../connections-core.js');

const nodes = [
  { id: 'a', label: 'A', group: 'TITAN' },
  { id: 'b', label: 'B', group: 'EVENT' },
  { id: 'c', label: 'C', group: 'LOCATION' },
  { id: 'root', label: 'Root', group: 'CENTER' },
];
const links = [
  { source: 'a', target: 'b', label: 'ordered', type: 'event', volume: 1 },
  { source: 'b', target: 'c', label: 'created', type: 'event', volume: 1 },
];

test('index excludes structural CENTER/CAT nodes and builds bidirectional adjacency', () => {
  const graph = core.index(nodes, links);
  assert.ok(!graph.nodes.has('root'));
  assert.ok(graph.adjacency.get('a').has('b'));
  assert.ok(graph.adjacency.get('b').has('a'));
});

test('view expands breadth-first from the root up to each node\'s limit', () => {
  const graph = core.index(nodes, links);
  const state = { ...core.initial('a'), expanded: ['a', 'b'], limits: { a: 12, b: 12 } };
  const view = core.view(graph, state);
  assert.deepEqual([...view.ids].sort(), ['a', 'b', 'c']);
});

test('neighbors filters by nodeKind and linkType', () => {
  const graph = core.index(nodes, links);
  const state = { ...core.initial('b'), nodeKind: 'locations' };
  const result = core.neighbors(graph, 'b', state);
  assert.deepEqual(result.map(r => r.id), ['c']);
});

test('kind classifies events and locations distinctly from figures', () => {
  assert.equal(core.kind({ group: 'EVENT' }), 'events');
  assert.equal(core.kind({ group: 'LOCATION' }), 'locations');
  assert.equal(core.kind({ group: 'TITAN' }), 'figures');
});
