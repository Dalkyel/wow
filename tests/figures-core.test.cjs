const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../figures-core.js');

test('kind classifies individual beings as figures and collectives as factions', () => {
  assert.equal(core.kind({ group: 'TITAN' }), 'figures');
  assert.equal(core.kind({ group: 'OLD_GOD' }), 'figures');
  assert.equal(core.kind({ group: 'PANTHEON' }), 'factions');
  assert.equal(core.kind({ group: 'FACTION' }), 'factions');
  assert.equal(core.kind({ group: 'LOCATION' }), null);
});

test('eraSections extracts only explicit VOLUME/SECTION headings', () => {
  const text = 'Intro text. VOLUME 2, SECTION 3: New developments here. Still more text.';
  const sections = core.eraSections(text);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].volume, 2);
  assert.equal(sections[0].section, 3);
  assert.ok(sections[0].text.startsWith('New developments'));
});

test('profile falls back to an excerpt of desc when no guide intro exists', () => {
  const node = { id: 'x', label: 'X', desc: 'A fairly long description that should be excerpted down to a shorter preview sentence for the profile card.', star: '' };
  const profile = core.profile(node, [{ ...node, volume: 1 }], {});
  assert.ok(profile.introIsExcerpt);
  assert.ok(profile.intro.length <= node.desc.length);
});

test('profile prefers a curated guide intro over the excerpt', () => {
  const node = { id: 'x', label: 'X', desc: 'Raw accumulated text.', star: '' };
  const guides = { x: { intro: 'A hand-written introduction.' } };
  const profile = core.profile(node, [{ ...node, volume: 1 }], guides);
  assert.equal(profile.intro, 'A hand-written introduction.');
  assert.equal(profile.introIsExcerpt, false);
});

test('search ranks exact alias matches above partial matches', () => {
  const profiles = [
    { node: { id: 'a', label: 'Sargeras', type: 'Titan' }, aliases: ['Sargeras'], kind: 'figures' },
    { node: { id: 'b', label: 'Aman\'Thul', type: 'Titan' }, aliases: ["Aman'Thul"], kind: 'figures' },
  ];
  const results = core.search(profiles, 'sargeras');
  assert.equal(results[0].node.id, 'a');
});

test('buildMentionMatcher/findMentions resolve a plain-text mention to its node id', () => {
  const nodes = [{ id: 'sargeras', label: 'Sargeras', group: 'TITAN' }];
  const matcher = core.buildMentionMatcher(nodes, [{ ...nodes[0], volume: 1 }], {});
  const matches = core.findMentions('Long ago, Sargeras fought at the Pantheon\'s side.', matcher);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'sargeras');
  assert.equal(matches[0].text, 'Sargeras');
});
