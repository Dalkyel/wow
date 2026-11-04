const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const archive = require('../data-core.js');
const notes = require('../stars-core.js');
const context = vm.createContext({});
for (const file of ['volume1/nodes.js', 'volume2/nodes.js', 'volume1/links.js', 'volume2/links.js', 'volume1/timeline.js', 'volume2/timeline.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const volumes = JSON.parse(vm.runInContext(`JSON.stringify([
  {volume:1,nodes,links,timeline},
  {volume:2,nodes:nodesVolume2,links:linksVolume2,timeline:timelineVolume2}
])`, context));

test('full archive includes both volumes, current nodes, links, revisions, and timeline', () => {
  const before = JSON.stringify(volumes);
  const result = archive.merge(volumes);
  const allNodes = volumes.flatMap(v => v.nodes);
  const ids = new Set(allNodes.map(n => n.id));
  const allLinks = volumes.flatMap(v => v.links);
  const key = link => JSON.stringify([link.source, link.target, link.label]);
  const broken = new Set(allLinks.filter(l => l.status === 'broken').map(key));
  const expectedLinks = allLinks.filter(l => l.status !== 'broken' && !broken.has(key(l)) && ids.has(l.source) && ids.has(l.target));
  assert.equal(result.nodes.length, ids.size);
  assert.deepEqual(result.links.map(key), expectedLinks.map(key));
  assert.equal(result.revisions.length, volumes.reduce((total, v) => total + v.nodes.length, 0));
  assert.equal(result.timeline.length, volumes.reduce((total, v) => total + v.timeline.length, 0));
  assert.equal(result.maxVolume, 2);
  assert.equal(JSON.stringify(volumes), before);
  assert.ok(result.nodes.some(n => n.id === 'sargeras'));
});

test('new or undated content loads without a reading restriction', () => {
  const input = structuredClone(volumes);
  input[1].nodes.push({ id: 'new-note', label: 'New information', group: 'LOCATION', type: 'Location', desc: 'Added without a precise date', star: 'An open question' });
  input[1].links.push({ source: 'the-titans', target: 'new-note', label: 'related to', type: 'lore' });
  input[1].timeline.push({ section: 1, title: 'New entry', summary: 'New summary' });
  const result = archive.merge(input);
  assert.ok(result.nodes.some(n => n.id === 'new-note'));
  assert.ok(result.links.some(l => l.target === 'new-note'));
  assert.ok(result.timeline.some(t => t.volume === 2 && t.section === 1));
});

test('latest node state is merged while original descriptions and revisions are preserved', () => {
  const result = archive.merge(volumes);
  const latest = volumes[0].nodes.filter(n => n.id === 'sargeras').at(-1);
  assert.equal(result.nodes.find(n => n.id === 'sargeras').desc, latest.desc);
  assert.equal(result.revisions.find(n => n.id === 'sargeras' && n.volume === 1).desc, volumes[0].nodes.find(n => n.id === 'sargeras').desc);
});

test('a broken link marker retracts the original relationship', () => {
  const input = structuredClone(volumes);
  input[1].links.push({ source: 'root', target: 'cat-cosmology', label: 'cosmology', status: 'broken', reason: 'reorganized' });
  const result = archive.merge(input);
  assert.ok(!result.links.some(l => l.source === 'root' && l.target === 'cat-cosmology' && l.label === 'cosmology'));
});

test('lore notes import source entries with non-empty star fields', () => {
  const result = archive.merge(volumes);
  const imported = notes.sourceEntries(result.revisions);
  assert.ok(imported.some(c => c.nodeIds.includes('the-void')));
  assert.ok(imported.every(c => c.origin === 'source'));
});
