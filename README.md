# wow — World of Warcraft Chronicle Timeline

An interactive timeline (D3) tracking figures, factions, places, and events for a readthrough of Blizzard's *World of Warcraft Chronicle* (Volumes 1–4). Events are plotted along one of two switchable axes — in-universe chronology (by era) or reading order (by volume/section) — instead of the force-graph "clue map" this project's sibling, [tSotG](../tSotG), uses. Each entity's narrative state is updated as the volumes are read.

## Running locally

This is a static site — no build step. Either open `index.html` directly in a browser, or serve it locally:

```sh
npx serve .
```

## Tests

Pure data/logic modules (the `*-core.js` files) are covered by Node's built-in test runner:

```sh
npm test
```

## Project layout

- `index.html`, `timeline.js` / `timeline-core.js`, `styles.css` — the timeline app itself.
- `figures.js`, `connections.js`, `stars.js` — feature panels (figures & factions reference, connection explorer, a read-only list of every ★-flagged entry), each paired with a `*-core.js` module holding the testable logic. No panel uses browser storage — bookmarks and the old reader-editable lore-notes board were both removed for being stuck on one device.
- `volume1/` … `volume4/` — live per-volume `nodes.js`, `links.js`, `timeline.js` data. Only Volume 1 has real seed content so far; the rest are empty until read. A future volume slot can hold either the next Chronicle volume or a novel.
- `quests-data.js` / `quests-core.js` / `quests.js` — the in-game quest log (name, location, a personal note), separate from the book-lore journal above.
- `shared/eras.js` — the ordered cosmology spine (the Void → the First War) both timeline axes key off of.
- `.claude/skills/add-lore/` — source reading, entity matching, safe appenders and semantic checks for new book-lore sections (Chronicle or a novel).
- `.claude/skills/log-quest/` — adding an in-game quest to the quest log.
- `tests/` — the Node test suite.

## Adding content

Volume 1's opening (the Void, the Old Gods, and the shaping of Azeroth by the titan Pantheon) is seeded as a working example. Continue reading and add each new section/event directly to the live volume files by following [.claude/skills/add-lore/SKILL.md](.claude/skills/add-lore/SKILL.md). Add new nodes, relationships, and a timeline entry; preserve existing history using the baseline-backed appenders. Run the lore verifier, complete the ownership/event/lore-consistency reviews, and run `npm test`. For in-game quests, use [.claude/skills/log-quest/SKILL.md](.claude/skills/log-quest/SKILL.md) instead.

Repairs to existing content are separate, explicitly requested work.
