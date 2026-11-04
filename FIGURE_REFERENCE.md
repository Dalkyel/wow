# Figures & Factions reference

Opens from the "Figures & Factions" header button, from a timeline node's detail panel ("Open figure profile"), or from the connections explorer. Search by name or title; filter to just Figures (titans, Old Gods, dragon Aspects, naaru) or just Factions (pantheons, clans, kingdoms, the Burning Legion).

Each entry shows:
- A short reminder of who or what this is.
- The latest recorded development, if the archive has a dated (`VOLUME N, SECTION M:`) update for it.
- "Connections to start with" — a short, hand-picked set of useful starting links (see `figures-data.js`'s `FIGURE_KEY_LINKS`), followed by the full set of grouped connections.
- A section-by-section timeline, when the archive text has explicit section headings for this entry.
- The full accumulated description, and a revision history of every volume's entry for it.

## Maintenance

`figures-data.js` holds a thin, optional curation layer on top of the auto-generated profile: a hand-written `intro`, extra `aliases`, and a short `FIGURE_KEY_LINKS` list of useful neighbors per entry. It never replaces the underlying node data in `volumeN/nodes.js` — an entity with no guide entry still gets a full profile, just with its intro auto-excerpted from `desc` instead of hand-written.

`figures-core.js` is pure (search/timeline/grouping) and is covered by `tests/figures-core.test.cjs`. `figures.js` is presentation wiring and needs no data edits.
