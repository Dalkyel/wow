---
name: log-quest
description: >
  Use this after completing an in-game World of Warcraft quest to add it to Orken's
  quest log (the 📜 panel in index.html), connecting any NPCs or locations it involves
  to the lore graph. Trigger examples: "I completed a quest, log it", "add 'Your Place
  in the World' to my quest log", "log this quest", "I just did a quest at the Valley of
  Trials". Takes a quest name, its location/zone, the NPCs involved, and whatever the
  user says about doing it. For World of Warcraft Chronicle or novel content, use the
  `add-lore` skill instead.
---

# Logging an in-game quest, connected to the lore graph

The quest log itself (`quests-data.js`) stays simple — a standalone `{ id, name,
location, npcs, note }` object per quest, no accumulated text, no baseline/append-script
machinery for the quest entry itself. What's new: the NPCs and locations a quest
involves are real graph entities, backed by **`volume0/`** — a permanent, always-on
lore source (not gated by reading progress the way Chronicle volumes are) that holds the
in-game lore graph: things Orken has actually met or visited, as opposed to what he's
read about. `volume0` reuses the exact same `nodes.js`/`links.js` mechanics as any book
volume, with one structural difference worth knowing: it's permanently excluded from the
reading-order axis (`TimelineCore.readingPositions` treats a falsy `volume`, and `0` is
falsy, as "no position") while fully participating in the chronology axis via
`era`/`chronOrder` like everything else. Its one reserved era is `the-present-day`
(`shared/eras.js`) — use that for anything introduced this way, since Chronicle's own
era registry stops at `first-war` (Warcraft I), long before WoW Forever's present.

## 1. Check for a duplicate quest

`quests-data.js` is short — read it and confirm this quest isn't already logged before
adding a second entry for it.

## 2. Identify and check each NPC/location

For the quest giver, any other named NPCs, and the location, confirm the exact name
against **https://warcraft.wiki.gg/** (the project's primary lore-research source) —
then check whether each already exists in the lore graph:

```sh
node .claude/skills/add-lore/scripts/match-entities.cjs 4 "NPC Name" "Location Name"
```

Pass `4` (or whatever the current highest book volume is) as the cap — `volume0` is
always included automatically regardless of the number passed, since it isn't
reading-progress-gated. A match means nothing new needs creating: just use that exact
name in the quest's `npcs`/`location` fields and the quest panel's own matcher will link
it automatically (same mechanism, and the same merged graph, that makes a Chronicle
figure's name clickable in the journal).

## 3. Mint a node for anything unmatched

For each `UNMATCHED` name, create a real node in `volume0/nodes.js`:

```sh
node .claude/skills/add-lore/scripts/append-node.cjs 0 npc-id-slug spec.json
```

with `spec.json` like:

```json
{ "mode": "new", "label": "Exact Name", "group": "NPC", "type": "free-text category",
  "era": "the-present-day", "chronOrder": 0,
  "desc": "...", "star": "" }
```

Use `group: "NPC"` for an individual in-game mortal (quest givers etc. — distinct from
the cosmic-tier `TITAN`/`OLD_GOD`/`DRAGON_ASPECT`/`NAARU` groups, which don't fit an
ordinary person) and `group: "LOCATION"` for a place. `chronOrder` rarely matters here —
`0` is fine unless two present-day nodes need relative ordering.

Then link it, via `append-entries.cjs 0 links SPEC_FILE`:
- Every new node needs the structural arc link: `{ "source": "cat-questlore", "target":
  "new-id", "label": "includes", "type": "arc" }`.
- Add a real relationship link wherever one actually exists — the quest giver "gives"
  the quest's location-NPC relationship, an NPC "is found at" a location, etc. Write
  each as a sentence (source → relationship → target), same convention as `add-lore`.

**Fact ownership and event coverage still apply, scaled to the size of the addition.**
A quest introducing one or two nodes doesn't need separate `ownership-review.md`/
`event-review.md` files — state the judgment inline when reporting what was added: does
each new node's `desc` describe only that entity (not duplicate what's already said on
a related node), and does the quest itself rise to needing its own `EVENT` node (most
quests don't; a pivotal one — a chain's climax, a first meeting with someone
significant — might).

## 4. Write the quest entry in Orken's voice, without spoilers

```js
{ id: 'kebab-case-slug', name: 'Exact Quest Name', location: 'Zone or sub-zone',
  npcs: ['NPC Name', ...], note: 'A short first-person note from Orken.' }
```

- `note`: Orken Stonewalker's voice (Orc Hunter · Explorer · Future Archaeologist) —
  first person, present-tense reaction to *this* quest, matching the style already
  established in `volume1/timeline.js`.
- **No spoilers**: reflects only what Orken experienced finishing this quest — never
  the quest chain's eventual payoff, a zone's later story beat, or anything he (or the
  user, in-game) hasn't reached yet, even if the wiki page for this quest reveals it.
  When in doubt, leave it out. Same rule applies to any new node's `desc` — describe
  what's known of this NPC/location *as of this encounter*, not their full future arc.

Append the object to the `quests` array in `quests-data.js` directly — there's no append
script for this file; entries are standalone, not accumulated text, so hand-editing it
is safe.

## Verification

```sh
node --check quests-data.js
node --check volume0/nodes.js volume0/links.js
npm test
```

Visual confirmation in `index.html` (open the 📜 panel, confirm the entry appears under
its location with NPC names rendered as clickable links where a match exists) is left to
the user.

## Improving this skill

If a quest's cast grows complex enough that this per-quest, inline-judgment approach
stops being enough (a whole questline's worth of NPCs, recurring factions), that's
signal to revisit — fix this file directly rather than letting process drift
unrecorded.
