#!/usr/bin/env node
// Apply a section manifest in a scratch archive; publish only after verification.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const [volumeArg, sectionArg, baselineArg, specArg, ...options] = process.argv.slice(2);
const volume = Number(volumeArg), section = Number(sectionArg);
assert.ok(Number.isInteger(volume) && volume >= 1 && Number.isInteger(section) && section > 0 && baselineArg && specArg,
  'Usage: node append-lore.cjs VOLUME SECTION BASELINE_DIR SPEC_FILE [--replace-applied PREVIOUS_SPEC_FILE]');
let previousSpec;
for (let i = 0; i < options.length; i++) {
  if (options[i] === '--replace-applied' && !previousSpec && options[i + 1] && !options[i + 1].startsWith('--')) {
    previousSpec = path.resolve(options[++i]);
  } else assert.fail('Unknown, duplicate or incomplete option');
}
const baseline = path.resolve(baselineArg), spec = JSON.parse(fs.readFileSync(specArg, 'utf8'));
assert.ok(spec.header === undefined || /^\/\/[^\r\n]*$/.test(spec.header), 'header must be a single-line // comment');
assert.ok(Array.isArray(spec.nodes) && Array.isArray(spec.links), 'nodes and links must be arrays (possibly empty)');
assert.ok(spec.summary?.section === section, 'summary.section must match the requested section');
const ids = spec.nodes.map(node => node.id);
assert.ok(ids.every(id => typeof id === 'string' && id.trim()), 'Every node needs a nonempty id');
assert.equal(new Set(ids).size, ids.length, 'Duplicate node id in manifest');
assert.ok(spec.nodes.every(node => node.header === undefined), 'Use the manifest header, not per-node headers');
const kinds = ['nodes', 'links', 'timeline'];
const variable = (kind, n) => (kind === 'timeline' ? 'timeline' : kind) + (n === 1 ? '' : `Volume${n}`);
const parse = (source, kind, n) => new Function(source + `;return ${variable(kind, n)};`)();
const root = process.cwd(), originals = new Map();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'append-lore-'));
const run = (helper, args) => execFileSync(process.execPath, [path.join(__dirname, helper + '.cjs'), ...args],
  { cwd: scratch, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
try {
  // Copy through the volume cap, including earlier-volume baselines used by append-node.
  for (let n = 1; n <= volume; n++) {
    fs.mkdirSync(path.join(scratch, `volume${n}`));
    for (const kind of kinds) {
      const file = `volume${n}/${kind}.js`, original = fs.readFileSync(path.join(root, file));
      originals.set(file, original);
      const initial = n === volume ? fs.readFileSync(path.join(baseline, `${kind}.js`)) : original;
      if (n === volume && !previousSpec) assert.deepEqual(original, initial,
        `${kind}: archive no longer matches the pre-edit baseline; inspect existing work before retrying`);
      fs.writeFileSync(path.join(scratch, file), initial);
    }
  }
  if (previousSpec) {
    // Reproduce the applied manifest from the original baseline before replacing it.
    // Any hand edit, different manifest or later section must fail without publishing.
    run('append-lore', [volume, section, baseline, previousSpec]);
    for (const kind of kinds) {
      const file = `volume${volume}/${kind}.js`;
      assert.deepEqual(fs.readFileSync(path.join(scratch, file)), originals.get(file),
        `${kind}: current archive does not exactly match the previous manifest; no lore files published`);
      fs.copyFileSync(path.join(baseline, `${kind}.js`), path.join(scratch, file));
    }
  }
  for (let i = 0; i < spec.nodes.length; i++) {
    const { id, ...node } = spec.nodes[i];
    const file = path.join(scratch, 'node.json');
    fs.writeFileSync(file, JSON.stringify({ ...node, ...(i === 0 && spec.header ? { header: spec.header } : {}) }));
    run('append-node', [volume, id, file]);
  }
  for (const [kind, entries] of [['links', spec.links], ['timeline', [spec.summary]]]) {
    if (!entries.length) continue;
    const file = path.join(scratch, `${kind}.json`);
    fs.writeFileSync(file, JSON.stringify({ header: spec.header, entries }));
    run('append-entries', [volume, kind, file]);
  }
  const before = parse(fs.readFileSync(path.join(baseline, 'nodes.js'), 'utf8'), 'nodes', volume);
  const after = parse(fs.readFileSync(path.join(scratch, `volume${volume}/nodes.js`), 'utf8'), 'nodes', volume);
  for (const id of ids) assert.equal(after.filter(node => node.id === id).length,
    before.filter(node => node.id === id).length + 1, `${id}: expected exactly one appended revision`);
  const verification = run('verify-lore', [volume, section, baseline]);
  // Detect edits since the scratch copy, including earlier-volume changes.
  for (const [file, original] of originals) assert.deepEqual(fs.readFileSync(path.join(root, file)), original,
    `${file}: changed during preparation; no lore files published`);
  const written = [];
  try {
    for (const kind of kinds) {
      const file = `volume${volume}/${kind}.js`;
      written.push(file);
      fs.writeFileSync(path.join(root, file), fs.readFileSync(path.join(scratch, file)));
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const file of written.reverse()) {
      try { fs.writeFileSync(path.join(root, file), originals.get(file)); }
      catch (restoreError) { rollbackErrors.push(`${file}: ${restoreError.message}`); }
    }
    if (rollbackErrors.length) throw new Error(`${error.message}; restore from ${baseline}: ${rollbackErrors.join('; ')}`);
    throw error;
  }
  console.log(verification.trim());
  console.log(`${previousSpec ? 'REVISED' : 'APPLIED'}: ${ids.length} node revisions (each count +1), ${spec.links.length} links, 1 timeline entry. Semantic review gates remain required.`);
} catch (error) {
  console.error(error.stderr?.toString().trim() || error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
