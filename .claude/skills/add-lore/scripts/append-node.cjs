#!/usr/bin/env node
// Run from the project root; evaluates trusted local node arrays only.
//
// Appends one new node entry to volume{N}/nodes.js without ever passing the
// existing baseline desc/star text back through the caller: this script reads
// it straight from the file and splices it internally, so an update can never
// retype (and silently corrupt) accumulated canon text. Only genuinely new
// content — the section's own addition — needs to be supplied by the caller.
//
// Usage: node append-node.cjs VOLUME ID SPEC_FILE
//
// SPEC_FILE is a small JSON file:
//   update (existing id, baseline desc/star read from the file and extended):
//     { "mode": "update", "descAppend": "...", "starAppend": "..." (optional),
//       "previousState": "...", "status": "updated" (optional, default "updated"),
//       "label"/"group"/"type"/"era"/"chronOrder"/"section": "..." (optional overrides),
//       "header": "// ── VOLUME N, SECTION M — TITLE ──" (optional; include only
//                  on the first node appended for a new section) }
//   new (brand-new id, full fields supplied as-is, no baseline involved):
//     { "mode": "new", "label": "...", "group": "...", "type": "...",
//       "desc": "...", "star": "...", "era": "...", "chronOrder": 0,
//       "section": 1, "header": "..." (optional) }
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const [volumeArg, id, specPath] = process.argv.slice(2);
const volume = Number(volumeArg);
assert.ok(Number.isInteger(volume) && volume >= 0 && id && specPath,
  'Usage: node .claude/skills/add-lore/scripts/append-node.cjs VOLUME ID SPEC_FILE');

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
assert.ok(spec.mode === 'update' || spec.mode === 'new', 'spec.mode must be "update" or "new"');

const file = `volume${volume}/nodes.js`;
const variable = volume === 1 ? 'nodes' : `nodesVolume${volume}`;
const text = fs.readFileSync(file, 'utf8');
const currentArray = new Function(text + `; return ${variable};`)();

let label, group, type, status, previousState, desc, star, era, chronOrder, section;

if (spec.mode === 'update') {
  const latest = new Map();
  // Volume 0 (in-game lore) always exists and isn't gated by reading progress like
  // the book volumes are, so it's always included regardless of the volume being edited.
  for (let n = 0; n <= volume; n++) {
    const bfile = `volume${n}/nodes.js`;
    const bvar = n === 1 ? 'nodes' : `nodesVolume${n}`;
    const arr = n === volume ? currentArray : new Function(fs.readFileSync(bfile, 'utf8') + `; return ${bvar};`)();
    arr.forEach(node => latest.set(node.id, node));
  }
  const baseline = latest.get(id);
  assert.ok(baseline, `Unknown id "${id}" through Volume ${volume} — use mode: "new" for a brand-new node`);
  assert.ok(spec.descAppend && spec.descAppend.trim(), 'spec.descAppend is required for mode: "update"');
  assert.ok(spec.previousState && spec.previousState.trim(), 'spec.previousState is required for mode: "update"');

  label = spec.label ?? baseline.label;
  group = spec.group ?? baseline.group;
  type = spec.type ?? baseline.type;
  era = spec.era ?? baseline.era;
  chronOrder = spec.chronOrder ?? baseline.chronOrder;
  section = spec.section ?? baseline.section;
  status = spec.status ?? 'updated';
  previousState = spec.previousState;
  desc = [baseline.desc ?? '', spec.descAppend].filter(Boolean).join(' ');
  star = [baseline.star ?? '', spec.starAppend ?? ''].filter(Boolean).join(' ');
} else {
  assert.ok(!currentArray.some(node => node.id === id), `Id "${id}" already exists in ${file} — use mode: "update"`);
  for (const field of ['label', 'group', 'type', 'desc']) {
    assert.ok(spec[field] && String(spec[field]).trim(), `spec.${field} is required for mode: "new"`);
  }
  ({ label, group, type, desc, era, chronOrder, section } = spec);
  star = spec.star ?? '';
}

const lines = [
  '    {',
  `        id: ${JSON.stringify(id)}, label: ${JSON.stringify(label)}, group: ${JSON.stringify(group)}, type: ${JSON.stringify(type)},`,
];
if (era !== undefined || chronOrder !== undefined) {
  lines.push(`        era: ${JSON.stringify(era)}, chronOrder: ${JSON.stringify(chronOrder ?? 0)},`);
}
if (volume > 1 || section !== undefined) {
  lines.push(`        section: ${JSON.stringify(section ?? null)},`);
}
if (spec.mode === 'update') {
  lines.push(`        status: ${JSON.stringify(status)},`);
  lines.push(`        previousState: ${JSON.stringify(previousState)},`);
}
lines.push(`        desc: ${JSON.stringify(desc)},`);
lines.push(`        star: ${JSON.stringify(star)}`);
lines.push('    },');
const block = lines.join('\n');

const closeRe = /\n\]\s*;\s*$/;
const m = text.match(closeRe);
assert.ok(m, `Could not find the trailing "];" to insert before in ${file}`);
const insertion = '\n' + (spec.header ? `\n${spec.header}\n` : '') + block;
const newText = text.slice(0, m.index) + insertion + m[0];

fs.writeFileSync(file, newText);
execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`OK: ${spec.mode === 'update' ? 'updated' : 'created'} "${id}" in ${file} ` +
  `(desc ${desc.length} chars, star ${star.length} chars). Baseline text was read from disk, not retyped.`);
