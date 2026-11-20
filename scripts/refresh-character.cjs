const { readFileSync, writeFileSync, renameSync } = require('node:fs');
const { join } = require('node:path');

const sourceUrl = 'https://worldofwarcraft.blizzard.com/en-us/forever/us/armory/character/orken-stonewalker';

function parseCharacterPage(html, fetchedAt = new Date().toISOString()) {
  const script = html.match(/<script\b(?=[^>]*\bid=["']character-profile-mount-initial-state["'])[^>]*>([\s\S]*?)<\/script>/i);
  const assignment = script?.[1].match(/^\s*var characterProfileInitialState\s*=\s*([\s\S]*?)\s*;?\s*$/);
  if (!assignment) throw new Error('Armory character data is missing');
  const { character: c } = JSON.parse(assignment[1]);
  if (c?.slug !== 'orken-stonewalker' || c.region !== 'us' || !Number.isInteger(c.level) || c.level < 1) {
    throw new Error('Armory returned an invalid or different character');
  }
  if (!c.race?.name || !c.class?.name || !Number.isFinite(c.averageItemLevel)) throw new Error('Incomplete character profile');
  const professions = [...(c.professions?.primaries || []), ...(c.professions?.secondaries || [])]
    .flatMap(p => (p.tiers || []).map(t => ({ name: p.name, skill: t.skillPoints, max: t.maxSkillPoints })));
  return {
    sourceUrl, fetchedAt, updatedAt: c.lastUpdatedTimestamp?.iso8601 || null,
    outdated: c.isOutdated === true,
    name: [c.name, c.surname].filter(Boolean).join(' '), level: c.level,
    race: c.race.name, class: c.class.name, faction: c.faction?.name || '',
    guild: c.guild?.name || '', specialization: c.specs?.find(s => s.active)?.name || '',
    averageItemLevel: c.averageItemLevel, professions,
    pet: c.pets?.filter(p => p.active).map(p => ({ name: p.name, family: p.family?.name, level: p.level }))[0] || null,
    stats: (c.stats?.basic?.primary || []).filter(s => ['HEALTH', 'MANA'].includes(s.enum))
      .map(s => ({ name: s.enum === 'HEALTH' ? 'Health' : 'Mana', value: s.value.value })),
    equipment: Object.values(c.gear || {}).map(g => ({ slot: g.slot?.name, name: g.name, id: g.id, itemLevel: g.level?.value })),
    images: { avatar: c.avatar?.url || null, portrait: c.render?.foreground?.url || null },
  };
}

function saveSnapshot(snapshot) {
  const destination = join(__dirname, '..', 'character-data.js');
  const data = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c');
  writeFileSync(destination + '.tmp', `// Public Armory snapshot. Refresh with npm run character:refresh.\nconst characterSnapshot = ${data};\n`);
  renameSync(destination + '.tmp', destination);
}

async function fetchCharacter() {
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(15000),
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) throw new Error(`Armory returned HTTP ${response.status}`);
  return parseCharacterPage(await response.text());
}

async function main() {
  // A saved HTML file also permits refreshes when the host cannot reach Blizzard.
  const snapshot = process.argv[2] ? parseCharacterPage(readFileSync(process.argv[2], 'utf8')) : await fetchCharacter();
  saveSnapshot(snapshot);
  console.log(`Saved ${snapshot.name}: level ${snapshot.level} ${snapshot.class}, item level ${snapshot.averageItemLevel}`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseCharacterPage, fetchCharacter };
