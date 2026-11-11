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
location, npcs, objective, note }` object per quest, no accumulated text, no
baseline/append-script machinery for the quest entry itself. What's new: the NPCs and locations a quest
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

Fetch the wiki.gg page and the foreverchanges.pro page **in the same parallel batch** —
they're independent lookups, and fetching them one after the other just adds a round
trip for no benefit. From wiki.gg pull its **Objectives**, **Description**, **Progress**,
and **Completion** sections; from foreverchanges.pro pull its matching **"When you come
back"** (progress) and **"When you hand it in"** (completion) sections — pull both,
don't settle for whichever one loaded first. Pulling only the quest name and NPC names
here is how a quest entry ends up thin: the mechanical objective and the flavor of what
each NPC actually said never make it into `quests-data.js`, and re-deriving them later
means re-fetching the same pages. Jot down (mentally or literally) the one-line
objective and anything in the dialogue worth carrying into Orken's voice before moving
on to step 3.

foreverchanges.pro is useful but not perfectly reliable for this (see
[[reference_foreverchanges_quest_source]] — it's gotten a kill/collect count wrong
*twice* now, and once returned "When you come back" dialogue for a different quest
entirely). **For numeric objective counts specifically, trust wiki.gg outright rather
than treating the two sites as a 50/50 cross-check** — foreverchanges has a confirmed
track record of getting the number wrong while wiki.gg hasn't yet. Still cross-check its
dialogue against wiki.gg's own Progress/Completion text before trusting it, and don't
assume a "When you come back" stage exists at all — a simple speak-to quest completes in
one step and has no Progress text on either site; if both sites are silent on the second
section, don't fabricate one.

**Watch who a short quote is actually about before writing it into `note` as fact.** A
fetched summary can flip the subject of a sentence without looking wrong in isolation —
"Cutting Teeth" once went into the log as Gornek saying the *boars* are "more useful to
us alive than dead," when the quest's actual description has him saying that about
*Orken* (he's explaining why he's not sending the recruit after dangerous kodo, not
giving boar-conservation advice). For any pronoun-bearing quote ("you'll"/"they're"/etc.)
pulled from a summarized fetch, re-fetch or re-read the surrounding sentence to confirm
who "you" or "they" means before it goes in the log.

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

## 4. Write the quest entry: objective plus Orken's voice, without spoilers

```js
{ id: 'kebab-case-slug', name: 'Exact Quest Name', location: 'Zone or sub-zone',
  npcs: ['NPC Name', ...],
  objective: 'The concrete in-game goal, plainly stated.',
  note: 'A short first-person note from Orken.' }
```

- `objective`: the mechanical "what to do" — who to talk to, what to kill/fetch/escort
  — paraphrased close to the wiki's own Objectives text (e.g. "Slay 6 Mottled Boars,
  then return to Gornek."). Plain fact, not voiced, not spoiler-sensitive (it's always
  about *this* quest, something the player just did) — this is what makes the quest
  panel useful as a reference, not just a mood piece. Omit only if a quest genuinely has
  no clear objective of its own (rare).
- `note`: Orken Stonewalker's voice (Orc Hunter · Explorer · Future Archaeologist) —
  first person, present-tense reaction to *this* quest, matching the style already
  established in `volume1/timeline.js`. It must reflect **both ends of the quest**: the
  hand-off (what the quest giver said/did when assigning it) and the turn-in (what
  happened, and what was said, when Orken came back to complete it) — even when the NPC
  who completes it isn't the one who gave it. A note that only covers the accept half and
  skips the completion dialogue (Gornek's reaction on turn-in, Jen'shan's on turn-in,
  etc.) is missing half the quest. Draw on the Description/Progress/Completion text and
  dialogue you read in step 2 for both halves — don't just restate the objective in
  fancier words.
- **No spoilers**: reflects only what Orken experienced finishing this quest — never
  the quest chain's eventual payoff, a zone's later story beat, or anything he (or the
  user, in-game) hasn't reached yet, even if the wiki page for this quest reveals it.
  When in doubt, leave it out. Same rule applies to `objective`, and to any new node's
  `desc` — describe what's known of this NPC/location *as of this encounter*, not their
  full future arc.

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
