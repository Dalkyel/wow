#!/usr/bin/env node
// Run from the project root; evaluates trusted local node arrays only.
const fs = require('node:fs');
const assert = require('node:assert/strict');

const [volumeArg, ...names] = process.argv.slice(2);
const volume = Number(volumeArg);
const dumpAll = names.length === 1 && names[0] === '--all';
assert.ok(Number.isInteger(volume) && volume >= 0 && (names.length || dumpAll),
  'Usage: node .claude/skills/add-lore/scripts/match-entities.cjs VOLUME NAME [NAME ...]\n' +
  '   or: node .claude/skills/add-lore/scripts/match-entities.cjs VOLUME --all');

// Keep all historical labels, including variants replaced in later sections.
// Volume 0 (in-game lore) always exists and isn't gated by reading progress like the
// book volumes are, so it's always included regardless of the requested cap.
const inventory = new Map();
for (let n = 0; n <= volume; n++) {
  const file = `volume${n}/nodes.js`;
  const variable = n === 1 ? 'nodes' : `nodesVolume${n}`;
  const entries = new Function(fs.readFileSync(file, 'utf8') + `; return ${variable};`)();
  for (const { id, label } of entries) {
    if (!inventory.has(id)) inventory.set(id, new Set());
    inventory.get(id).add(label);
  }
}
if (dumpAll) {
  // Full compact listing: use only when the section's entity list isn't complete
  // or targeted matching is uncertain — otherwise pass names to filter.
  for (const [id, labels] of inventory) console.log(`${id} | ${JSON.stringify([...labels])}`);
  process.exit(0);
}
// Source prose may space a compound that inventory labels/ids hyphenate.
// Normalize separators without removing word boundaries or other punctuation.
const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[\p{Dash_Punctuation}\s]+/gu, ' ').trim();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matched = new Map();
const unmatched = [];
for (const name of names) {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(name))}(?![\\p{L}\\p{N}])`, 'u');
  const ids = [];
  for (const [id, labels] of inventory) {
    if (pattern.test(normalize(id)) || [...labels].some(label => pattern.test(normalize(label)))) {
      ids.push(id);
      matched.set(id, labels);
    }
  }
  console.log(`${JSON.stringify(name)} -> ${ids.length ? ids.join(', ') : 'UNMATCHED'}`);
  if (!ids.length) unmatched.push(name);
}
console.log('Matched inventory:');
for (const [id, labels] of matched) console.log(`${id} | ${JSON.stringify([...labels])}`);
console.log(`Unmatched names: ${JSON.stringify(unmatched)}`);
console.log('Unmatched names still require spelling/alias checks and description searches before creating IDs.');
