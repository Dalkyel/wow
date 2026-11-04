#!/usr/bin/env node
// Run from the project root. Evaluates only trusted local project data files.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { paginate } = require('./paginate.cjs');

const [volumeArg, sectionArg, baseline, ...options] = process.argv.slice(2);
assert.ok(options.every(option => ['--review-links', '--review-summary', '--review-overlap'].includes(option)
  || /^--review-nodes=[1-9]\d*$/.test(option)),
  'Unknown option; supported: --review-links, --review-summary, --review-overlap, --review-nodes=PAGE');
const nodeReviewOptions = options.filter(option => option.startsWith('--review-nodes='));
assert.ok(nodeReviewOptions.length <= 1, 'Supply only one --review-nodes=PAGE option');
const volume = Number(volumeArg), section = Number(sectionArg);
assert.ok(Number.isInteger(volume) && volume >= 1 && Number.isInteger(section) && section > 0 && baseline,
  'Usage: node .claude/skills/add-lore/scripts/verify-lore.cjs VOLUME SECTION BASELINE_DIR');
const kinds = ['nodes', 'links', 'timeline'];
const variable = (kind, n) => (kind === 'timeline' ? 'timeline' : kind) + (n === 1 ? '' : `Volume${n}`);
const load = (file, name) => new Function(fs.readFileSync(file, 'utf8') + `; return ${name};`)();
const ids = new Set(), latest = new Map(), revisions = [], archiveLinks = [];
const current = {};
for (let n = 1; n <= volume; n++) {
  const arrays = {};
  for (const kind of kinds) {
    const file = `volume${n}/${kind}.js`;
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    arrays[kind] = load(file, variable(kind, n));
  }
  arrays.nodes.forEach(node => ids.add(node.id));
  revisions.push(...arrays.nodes.map(node => ({ ...node, volume: n })));
  archiveLinks.push(...arrays.links);
  assert.deepEqual(arrays.links.filter(link => !ids.has(link.source) || !ids.has(link.target)), [],
    `Volume ${n}: unresolved link endpoints`);
  const sections = arrays.timeline.map(entry => entry.section);
  assert.equal(new Set(sections).size, sections.length, `Volume ${n}: duplicate timeline sections`);
  assert.deepEqual(sections, [...sections].sort((a, b) => a - b), `Volume ${n}: timeline entries out of order`);
  if (n < volume) arrays.nodes.forEach(node => latest.set(node.id, node));
  else Object.assign(current, arrays);
}
const added = {};
for (const kind of kinds) {
  const before = load(path.join(baseline, `${kind}.js`), variable(kind, volume));
  assert.deepEqual(current[kind].slice(0, before.length), before, `${kind}: baseline prefix changed`);
  added[kind] = current[kind].slice(before.length);
  if (kind === 'nodes') before.forEach(node => latest.set(node.id, node));
}
assert.equal(added.timeline.length, 1, 'Expected exactly one new timeline entry');
assert.equal(added.timeline[0].section, section, 'Appended timeline entry has the wrong section number');
assert.equal(new Set(added.nodes.map(node => node.id)).size, added.nodes.length,
  'Duplicate node id within the appended section');
for (const node of added.nodes) {
  const before = latest.get(node.id);
  if (!before) continue;
  assert.equal(node.status, 'updated', `${node.id}: existing node must be marked updated`);
  assert.ok(typeof node.previousState === 'string' && node.previousState.trim(),
    `${node.id}: missing previousState`);
  for (const field of ['desc', 'star']) {
    const baselineText = before[field] ?? '';
    const actual = node[field];
    if (typeof actual === 'string' && actual.startsWith(baselineText)) continue;
    let i = 0;
    while (i < baselineText.length && i < (actual ?? '').length && baselineText[i] === actual[i]) i++;
    assert.fail(`${node.id}: ${field} does not preserve its latest baseline text (diverges at char ${i}/${baselineText.length})\n` +
      `  baseline  ...${JSON.stringify(baselineText.slice(Math.max(0, i - 40), i + 40))}\n` +
      `  appended  ...${JSON.stringify((actual ?? '').slice(Math.max(0, i - 40), i + 40))}`);
  }
}
// Match the loader's exact removal key; a retired category edge does not count.
const linkKey = link => JSON.stringify([link.source, link.target, link.label]);
const broken = new Set(archiveLinks.filter(link => link.status === 'broken').map(linkKey));
const activeLinks = archiveLinks.filter(link => link.status !== 'broken' && !broken.has(linkKey(link)));
const addedEvents = added.nodes.filter(node => node.group === 'EVENT');
for (const event of addedEvents) {
  assert.ok(activeLinks.some(link =>
    (link.source === 'cat-events' && link.target === event.id) ||
    (link.target === 'cat-events' && link.source === event.id)),
  `${event.id}: EVENT must have an active direct link to KEY EVENTS (cat-events)`);
}
// Match the live inventory and guides; bold markup alone does not create links.
const root = path.resolve(__dirname, '../../../..');
const mentions = require(path.join(root, 'figures-core.js'));
const guides = load(path.join(root, 'figures-data.js'), 'FIGURE_GUIDES');
const resolved = [...new Map(revisions.map(node => [node.id, node])).values()];
const matcher = mentions.buildMentionMatcher(resolved, revisions, guides);
const summaryTerms = [...added.timeline[0].summary.matchAll(/<strong>(.*?)<\/strong>/g)].map(match => match[1]);
const summaryTargets = new Map();
for (const term of summaryTerms) {
  const matches = mentions.findMentions(term, matcher);
  assert.ok(matches.length === 1 && matches[0].text === term,
    `Section ${section}: timeline term ${JSON.stringify(term)} does not resolve completely to one node; use a canonical name or supported alias`);
  summaryTargets.set(term, matches[0].id);
}
// Print only verified deltas for previously audited baselines. New entries are
// complete; changed metadata includes both values so stale labels cannot hide.
let nodeReview;
if (nodeReviewOptions.length) {
  const entries = added.nodes.map(node => {
    const before = latest.get(node.id);
    if (!before) return { mode: 'new', node };
    const metadataChanges = {};
    for (const key of new Set([...Object.keys(before), ...Object.keys(node)])) {
      if (['id', 'desc', 'star'].includes(key)) continue;
      if (JSON.stringify(before[key]) !== JSON.stringify(node[key])) {
        metadataChanges[key] = { before: before[key] ?? null, after: node[key] ?? null };
      }
    }
    return {
      mode: 'update', id: node.id, label: node.label,
      descAppend: node.desc.slice((before.desc ?? '').length),
      starAppend: node.star.slice((before.star ?? '').length),
      metadataChanges,
    };
  });
  const text = JSON.stringify(entries, null, 2);
  const page = Number(nodeReviewOptions[0].split('=')[1]);
  const chunks = paginate(text, undefined, { preferLines: true });
  const pages = chunks.length;
  assert.ok(page <= pages, `Node review page ${page} exceeds ${pages} pages`);
  nodeReview = `Node review page ${page}/${pages}; ${text.length} characters; baseline desc/star prefixes verified.\n`
    + chunks[page - 1]
    + (page < pages ? `\nCONTINUES: use --review-nodes=${page + 1}` : '\nEND: all changed nodes displayed.');
}
console.log(`PASS: Volume ${volume}, section ${section}: ${added.nodes.length} nodes, ${added.links.length} links, 1 timeline entry appended.`);
console.log('Syntax, endpoints at each volume cap, timeline order/uniqueness, baseline prefixes, and accumulated node text verified.');
console.log(`Timeline links: ${summaryTerms.length} emphasized terms resolve completely (live guides).`);
console.log(`Key-event links: ${addedEvents.length} added/updated EVENT nodes connected to KEY EVENTS.`);
console.log('Content accuracy and browser appearance still require review.');
if (nodeReview) console.log(nodeReview);
if (options.includes('--review-summary')) {
  const labels = new Map(resolved.map(node => [node.id, node.label]));
  console.log('Timeline mentions — review intended identity:');
  for (const [term, id] of summaryTargets) console.log(`${term} → ${labels.get(id)} [${id}]`);
}
if (options.includes('--review-links')) {
  const labels = new Map([...latest.values(), ...current.nodes].map(node => [node.id, node.label]));
  console.log('Appended links — review direction and meaning:');
  for (const link of added.links) {
    const sentence = `${labels.get(link.source)} → ${link.label} → ${labels.get(link.target)}`;
    console.log(link.status === 'broken' ? `[BROKEN] ${sentence} (${link.reason ?? 'no reason supplied'})` : sentence);
  }
}
if (options.includes('--review-overlap')) {
  // Flags a candidate for the manual side-by-side re-read the ownership/event-coverage
  // gates already require; it cannot judge whether the overlap is a real defect (some
  // short boilerplate, like a "See EVENT-ID" pointer, is meant to repeat verbatim).
  const SHINGLE_SIZE = 12;
  const newText = node => {
    const before = latest.get(node.id);
    return before ? node.desc.slice((before.desc ?? '').length) : node.desc;
  };
  const shingles = text => {
    const words = text.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
    const set = new Map();
    for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) set.set(words.slice(i, i + SHINGLE_SIZE).join(' '), i);
    return set;
  };
  const entries = added.nodes.map(node => ({ node, shingles: shingles(newText(node)) }));
  const found = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      for (const [shingle] of entries[i].shingles) {
        if (entries[j].shingles.has(shingle)) { found.push([entries[i].node, entries[j].node, shingle]); break; }
      }
    }
  }
  console.log(found.length
    ? `Shared-passage candidates (${SHINGLE_SIZE}+ identical consecutive words) — review for duplicated ownership:`
    : `No shared passages of ${SHINGLE_SIZE}+ consecutive words among the ${added.nodes.length} appended nodes.`);
  for (const [a, b, shingle] of found) console.log(`${a.id} (${a.label}) ~ ${b.id} (${b.label}): "${shingle}"`);
}
