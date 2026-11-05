# Mandatory review gates

Three hard gates. Each requires a short write-up in its own file in the run directory,
ending with a bare `<Name> review: PASS` line. A verifier PASS (`verify-lore.cjs`) is
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
  created) for it, with an active `cat-events` arc link — `verify-lore.cjs` checks the
  link mechanically but not whether the right occurrences got one at all.
- Watch for the duplication failure mode: narrating the same event's story twice, once
  on the `EVENT` node and once folded into a participant's own `desc`. Use
  `verify-lore.cjs --review-overlap` (12-word shingle detector) to flag candidates, then
  read the flagged passage yourself — it cannot judge whether an overlap is a real
  defect (some short boilerplate, like a "see EVENT-ID" pointer, is meant to repeat).

## Hard gate — Lore-consistency coverage

Chronicle sometimes restates, reframes, or quietly revises what an earlier source (a
game, a prior novel, an earlier Chronicle volume) established. Every such ambiguity or
discrepancy noticed while drafting this section needs a tracked lore note, not a silent
pick of one version. Before recording PASS in `lore-review.md`:

- List every retcon, contradiction, or genuine ambiguity this section's content raises
  against another known source or an earlier volume — check **https://warcraft.wiki.gg/**
  as the primary external source for this comparison.
- Keep any spoiler surfaced by that research out of the journal entry's own prose (see
  "Research source, and keeping the journal spoiler-free" in SKILL.md) — it belongs in
  the lore note's evidence, not in Orken's narration.
- For each, either: confirm a note already exists on the relevant node's `star` field
  and is still accurate (append new evidence via the normal `desc`/`star` full-overwrite
  rule), or add one — a short `★`/`★★`/`★★★` note on whichever existing node the
  ambiguity is most centrally about, optionally ending with `STATUS: OPEN` or `STATUS:
  RESOLVED` if it's been settled. There's no separate notes board anymore (removed for
  being device-bound, browser-storage-only); the `star` field *is* the lore-note record,
  and `stars.js`/`stars-core.js`'s `sourceEntries` is what surfaces every one of them in
  the live app's ★ Notable panel.
- Mechanical completeness only: `stars-core.js` just extracts non-empty `star` fields —
  it never judges whether a note's content is actually correct or resolved. Record the
  semantic judgment yourself.
