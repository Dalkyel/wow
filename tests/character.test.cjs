const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCharacterPage } = require('../scripts/refresh-character.cjs');

function page(character) {
  return `<script type="text/javascript" id="character-profile-mount-initial-state">var characterProfileInitialState = ${JSON.stringify({ character })};</script>`;
}
const character = {
  slug: 'orken-stonewalker', region: 'us', name: 'Orken', surname: 'Stonewalker', level: 22,
  race: { name: 'Orc' }, class: { name: 'Hunter' }, averageItemLevel: 18,
  specs: [{ active: false, name: 'Survival' }, { active: true, name: 'Beast Mastery' }],
  professions: { primaries: [{ name: 'Skinning', tiers: [{ skillPoints: 153, maxSkillPoints: 225 }] }] },
};

test('extracts the expected profile and active specialization from embedded Armory data', () => {
  const snapshot = parseCharacterPage(page(character), '2026-11-20T18:00:00Z');
  assert.equal(snapshot.name, 'Orken Stonewalker');
  assert.equal(snapshot.specialization, 'Beast Mastery');
  assert.deepEqual(snapshot.professions, [{ name: 'Skinning', skill: 153, max: 225 }]);
  assert.equal(snapshot.fetchedAt, '2026-11-20T18:00:00Z');
  assert.equal(snapshot.pet, null);
});

test('rejects missing data, another character, and incomplete profiles', () => {
  assert.throws(() => parseCharacterPage('<html>Unavailable</html>'), /missing/);
  assert.throws(() => parseCharacterPage(page({ ...character, slug: 'someone-else' })), /different character/);
  assert.throws(() => parseCharacterPage(page({ ...character, class: null })), /Incomplete/);
});

test('rejects executable JavaScript instead of evaluating it', () => {
  assert.throws(() => parseCharacterPage('<script id="character-profile-mount-initial-state">var characterProfileInitialState = process.exit();</script>'));
});
