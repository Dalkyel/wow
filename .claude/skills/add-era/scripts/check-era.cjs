#!/usr/bin/env node
// Run from the project root; evaluates trusted local timeline arrays only.
const fs = require('node:fs');
const assert = require('node:assert/strict');

const [volumeArg, sectionArg] = process.argv.slice(2);
const volume = Number(volumeArg), section = Number(sectionArg);
assert.ok(Number.isInteger(volume) && volume >= 1 && Number.isInteger(section) && section >= 1,
  'Usage: node .claude/skills/add-era/scripts/check-era.cjs VOLUME SECTION');

const timelineFile = `volume${volume}/timeline.js`;
const variable = volume === 1 ? 'timeline' : `timelineVolume${volume}`;
const entries = new Function(fs.readFileSync(timelineFile, 'utf8') + `; return ${variable};`)();
const matches = entries.filter(entry => entry.section === section);
console.log(`Volume ${volume}, section ${section}: ${matches.length} matching timeline entries; latest section: ${Math.max(0, ...entries.map(entry => entry.section))}.`);

let headings = 0;
// Match comment headings only, never section references inside descriptions.
const heading = new RegExp(`^\\s*//[^\\r\\n]*SECTION\\s+${section}(?!\\d)`, 'iu');
for (const name of ['nodes', 'links', 'timeline']) {
  const file = `volume${volume}/${name}.js`;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const locations = lines.flatMap((line, index) => heading.test(line) ? [index + 1] : []);
  headings += locations.length;
  console.log(`${file}: ${locations.length} matching section headings${locations.length ? ` (lines ${locations.slice(0, 20).join(', ')}${locations.length > 20 ? ', …' : ''})` : ''}.`);
}
console.log(matches.length || headings
  ? 'EXISTS OR PARTIAL: inspect existing work before editing; do not blindly append.'
  : 'ABSENT: no matching timeline entry or section heading.');
