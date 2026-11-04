#!/usr/bin/env node
// Append links or timeline entries to a trusted local archive; validate before writing.
// Usage: node append-entries.cjs VOLUME links|timeline SPEC_FILE
// Spec: { "header": "// optional section heading", "entries": [...] }
const fs = require('node:fs');
const assert = require('node:assert/strict');

const [volumeArg, kind, specPath] = process.argv.slice(2);
const volume = Number(volumeArg);
assert.ok(Number.isInteger(volume) && volume >= 1 && ['links', 'timeline'].includes(kind) && specPath,
  'Usage: node append-entries.cjs VOLUME links|timeline SPEC_FILE');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
assert.ok(Array.isArray(spec.entries) && spec.entries.length, 'spec.entries must be a nonempty array');
assert.ok(spec.header === undefined || /^\/\/[^\r\n]*$/.test(spec.header), 'spec.header must be a single-line // comment');
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
for (const entry of spec.entries) {
  assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'Every entry must be an object');
  if (kind === 'links') {
    for (const key of ['source', 'target', 'label']) assert.ok(nonempty(entry[key]), `Link ${key} is required`);
    if (entry.status === 'broken') assert.ok(nonempty(entry.reason), 'Broken link reason is required');
    else assert.ok(['cat', 'arc', 'rel', 'magic', 'conflict', 'goal', 'event', 'lore', 'history', 'geo', 'trama'].includes(entry.type), 'Invalid link type');
  } else {
    assert.ok(Number.isInteger(entry.section) && entry.section > 0, 'Timeline entry section must be a positive integer');
    for (const key of ['title', 'summary']) assert.ok(nonempty(entry[key]), `Timeline entry ${key} is required`);
  }
}

const file = `volume${volume}/${kind}.js`;
const variable = (kind === 'timeline' ? 'timeline' : 'links') + (volume === 1 ? '' : `Volume${volume}`);
const readArray = source => {
  const result = new Function(source + `; return ${variable};`)();
  assert.ok(Array.isArray(result), `${variable} must be an array`);
  return result;
};
const original = fs.readFileSync(file, 'utf8');
const before = readArray(original);
if (kind === 'timeline') {
  const sections = [...before, ...spec.entries].map(entry => entry.section);
  assert.ok(sections.every((section, i) => Number.isInteger(section) && section > 0 && (!i || section > sections[i - 1])),
    'Timeline sections must be unique and strictly increasing');
}
const end = original.match(/\n\]\s*;\s*$/);
assert.ok(end, `Missing trailing array terminator in ${file}`);
const prefix = original.slice(0, end.index);
const block = '\n' + (spec.header ? `\n${spec.header}\n` : '') +
  spec.entries.map(entry => '    ' + JSON.stringify(entry) + ',').join('\n');
// Both compact arrays and older section files may omit the final item comma.
let candidate = prefix + block + end[0];
try {
  new Function(candidate);
} catch (error) {
  if (!(error instanceof SyntaxError) || !before.length) throw error;
  candidate = prefix + ',' + block + end[0];
}
const after = readArray(candidate);
assert.deepStrictEqual(after, [...before, ...spec.entries], 'Append must preserve every original entry');
assert.ok(candidate.startsWith(prefix), 'Original file prefix must be preserved');
fs.writeFileSync(file, candidate);
console.log(`OK: appended ${spec.entries.length} ${kind} to ${file}; original prefix and entries preserved. Run verify-era for endpoints and semantic review.`);
