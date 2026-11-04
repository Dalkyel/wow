# Mandatory review gates

Three hard gates. Each requires a short write-up in its own file in the run directory,
ending with a bare `<Name> review: PASS` line. A verifier PASS (`verify-era.cjs`) is
necessary but never sufficient — these are semantic judgments the script cannot make.

## Hard gate — Fact ownership

A fact must live on the entity it's actually about, not wherever it happens to be
mentioned. Before recording PASS in `ownership-review.md`:

- Re-read every new/updated node's `desc`/`star` and confirm each sentence is attached
  to the right id — a fact about Sargeras's fall belongs on `sargeras`, not on
  `the-titans` just because the sentence appears while narrating the Pantheon.
- Distinguish testimony/legend from confirmed narration: Chronicle sometimes frames a
  claim as "some say" or "it is told" — keep that qualification in the text rather than
  upgrading it to a flat fact.
- Distinguish an instance from a type: a specific titan's action is not automatically
  true of "the Titans" as a whole, and vice versa.
- Check terminology, titles, and named places/artifacts against the established
  inventory (`match-entities.cjs --all`) rather than inventing a new spelling.

## Hard gate — Key event coverage

Every pivotal occurrence needs a discoverable `EVENT` node, actively linked to
`cat-events`, distinct from the entity nodes that merely participated in it. Before
recording PASS in `event-review.md`:

- For each major occurrence in the section, confirm an `EVENT` node exists (or was
  created) for it, with an active `cat-events` arc link — `verify-era.cjs` checks the
  link mechanically but not whether the right occurrences got one at all.
- Watch for the duplication failure mode: narrating the same event's story twice, once
  on the `EVENT` node and once folded into a participant's own `desc`. Use
  `verify-era.cjs --review-overlap` (12-word shingle detector) to flag candidates, then
  read the flagged passage yourself — it cannot judge whether an overlap is a real
  defect (some short boilerplate, like a "see EVENT-ID" pointer, is meant to repeat).

## Hard gate — Lore-consistency coverage

Chronicle sometimes restates, reframes, or quietly revises what an earlier source (a
game, a prior novel, an earlier Chronicle volume) established. Every such ambiguity or
discrepancy noticed while drafting this section needs a tracked lore note, not a silent
pick of one version. Before recording PASS in `lore-review.md`:

- List every retcon, contradiction, or genuine ambiguity this section's content raises
  against another known source or an earlier volume.
- For each, either: confirm a lore note already exists and is still accurate (update it
  if this section adds evidence), or create a new one via the lore-notes board's data
  shape (a `source:` note auto-imports from a node's `star` field; anything else is a
  `reader:` note — see `lore-notes-core.js`).
- Mechanical completeness only: this gate's script support is limited to confirming the
  structural shape of a note (`lore-notes-core.js`'s `validateBackup`); it never judges
  whether the note's content is actually correct or resolved. Record the semantic
  judgment yourself.
