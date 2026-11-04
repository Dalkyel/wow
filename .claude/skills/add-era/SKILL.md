---
name: add-era
description: >
  Use this after reading a section of World of Warcraft Chronicle to add its content to
  the interactive timeline (index.html), or to validate reference material against it.
  Trigger examples: "add Volume 1 section 4", "I just read about the War of the Ancients,
  update the timeline", "log this section", "here are my notes from today's reading, add
  them", "validate this timeline/index against what we have". Takes section notes, a
  summary, raw text, or non-section reference material (an appendix, timeline chart,
  index) as input.
---

# Adding a section to the Chronicle timeline

Volume 1's opening (the Void through the shaping of Azeroth) is the only rebuilt content
so far. From Volume 1 Section 4 onward — and for Volumes 2–4 from their first section —
create new sections directly in the live archive. Use the live volume files for
accumulated history, current lore notes, and open ambiguities.

Determine the requested volume/section and source material, then run the live preflight.
If that section already exists, inspect for an unfinished addition or an explicitly
requested correction rather than appending it twice.

Before editing, read the baseline procedure, applicable node/link/timeline formats,
verification, and the source/entity and semantic-gate references. Read long references
in separate bounded slices through EOF; retrieve any omitted content before proceeding.

This project tracks figures, factions, places, and events across World of Warcraft
Chronicle in a D3 timeline (`index.html`). Normal sessions append to the current volume's
own folder. `data-core.js` merges the full archive in volume order: the latest same-id
entry wins, and all revisions remain available. The app does not hide data behind a
reading cap. Reader helpers still accept a volume cap to bound source inspection; this is
not a display restriction.

## Input types

- **Section content** (notes, a summary, or raw text from an actual section of the book)
  → follow steps 1-3 below: write nodes, links, and a timeline entry.
- **Reference/front-matter material** (an appendix, index, timeline chart, "story so
  far" recap) → this is **not** a section. Don't write a timeline entry for it. Instead,
  use it to **validate** what's already captured: cross-check every claim against
  `volume1/nodes.js` and the current volume's own nodes and links, then report what's
  accurate, what's missing, and what's wrong. When asked to integrate the material, add
  confirmed missing facts directly to the current volume's nodes and links; preserve
  contradictions as qualified source notes (see step 4) — or as a lore note, if the
  contradiction is between Chronicle and another source. Only add net-new entities it
  introduces as nodes if the user asks.

## Before writing anything

Read [source-and-entity-workflow.md](references/source-and-entity-workflow.md) before
section preflight, source retrieval, entity resolution or drafting. It contains the
required identity checks, full-entry reads and safe append procedures.

## Mandatory semantic gates

Read all three gates in [review-gates.md](references/review-gates.md) before drafting.
Completion requires:

- **Fact ownership:** full baseline audit plus final node/link review, recorded in
  `ownership-review.md` with `Ownership review: PASS`.
- **Key event coverage:** every important occurrence has an appropriate EVENT node and
  active KEY EVENTS connection, recorded in `event-review.md` with
  `Event coverage review: PASS`.
- **Lore-consistency coverage:** review every flagged ambiguity, retcon, or
  contradiction raised by this section against other Warcraft sources and record it as a
  lore note (open, or resolved with evidence), recorded in `lore-review.md` with
  `Lore consistency review: PASS`.

Keep the manifest, three review files, and baseline beside the unique temporary run's
`baseline/` through verification and completion. These are temporary working files; do
not copy them into the repository. Persist new evidence, lore-note states and open
ambiguities in the live nodes, links, and the browser-side lore-notes board so the next
section can continue without past review files.

## Capture the baseline before editing

Save the current volume's three data files in a unique temporary directory before the
first mutation, even when Git is unavailable. Keep that directory path for verification;
do not reuse a fixed directory that may contain another run's baseline. For Volume 1:

```sh
era_run=$(mktemp -d "${TMPDIR:-/tmp}/add-era.XXXXXX")
era_baseline="$era_run/baseline"
mkdir "$era_baseline"
cp volume1/nodes.js volume1/links.js volume1/timeline.js "$era_baseline/"
printf '%s\n' "$era_run" "$era_baseline"
```

Use this snapshot for the preservation checks below; it is a pre-edit reference, not
section data to add to the project.

## 1. Nodes — `volume{N}/nodes.js`

```js
{
  id: 'existing-or-new-id',
  label: 'Display Name',
  group: 'TITAN',               // see group guide below
  type: 'Titan — Champion',     // free-text category label
  era: 'order-of-the-titans',   // slug into shared/eras.js — chronology-axis placement
  chronOrder: 1,                // ordering within that era when no precise date exists
  section: 4,                   // reading-order placement within this volume (optional for volume 1)
  desc: '...',                  // see CRITICAL rule below
  star: '★★ ...'                 // significance/ambiguity note, 0-3 stars
}
```

- **New entity** → push a plain node object (no `status` field needed).
- **Existing entity whose info changed/expanded** → add `status: 'updated'` and
  `previousState: 'short note of what changed'`.
- **Existing entity already updated earlier in the SAME volume** (e.g. `volume1/nodes.js`
  already has a `sargeras` or `the-titans` entry from an earlier section) → add a **new**
  node object in the current section's section — do not edit the earlier section's entry
  in place. `data-core.js` merges same-id entries in volume/array order, so only the
  *last* entry's fields actually render; the file's chronological, one-entry-per-section
  structure exists to keep a readable diff history, not because the merge requires it.
  Copy the most recent existing entry's full `desc` (the latest section's version, not
  the original Volume 1 one) and append the new material to it, same as the
  full-overwrite rule above.
- **CRITICAL — `desc` is a full overwrite, not a delta.** `data-core.js` merges an
  updated node with object spread, which replaces the entire `desc` string. If you only
  write the new section's info, the entity's earlier history disappears from its panel.
  Always use the latest same-id `desc` across Volume 1, prior volumes, and earlier
  entries in the current volume; copy it in full and append the new material.
  `previousState` stays short — it's a maintenance note for future edits, not shown in
  the UI. Use `scripts/append-node.cjs` to apply this rule — it reads the latest
  `desc`/`star` from the file and appends your new text itself, so the full-overwrite
  requirement is satisfied by construction instead of by careful retyping.
- **Fact ownership is mandatory.** Apply the [hard ownership gate](references/review-gates.md#hard-gate--fact-ownership)
  to every new/updated entry and relationship. This includes terminology, titles, named
  artifacts, and places; passing the JavaScript verifier cannot waive it.
- Do not set `volume` yourself — `data-core.js` stamps it from the registered volume
  during merge.
- `era` is the cosmology-spine slug this entity is first/primarily associated with (see
  `shared/eras.js`). It never changes once set unless a correction is explicitly
  requested — a later volume narrating an earlier era in more depth does not move an
  entity's era. `chronOrder` only orders entities *within* the same era when no precise
  date is known; keep existing values stable and only insert a new entity at a sensible
  relative position (use `match-entities.cjs`/a description search to find comparable
  existing `chronOrder` values first).

**Group guide** (`groups.js`): `TITAN` / `OLD_GOD` / `DRAGON_ASPECT` / `NAARU` for
individual named beings; `PANTHEON` / `ORC_CLAN` / `HUMAN_KINGDOM` / `NIGHT_ELF` /
`BURNING_LEGION` / `FACTION` for collectives; `EVENT` (discrete occurrences — always
needs a `cat-events` arc link, see below), `LOCATION`, `ARTIFACT`, `COSMOS` (abstract
cosmic forces/entities like the Void or a world-soul). Never invent a new group key
without also adding it to `groups.js` and to `LANE_ORDER`/`LANE_LABELS` in `timeline.js`
(otherwise the entity still renders, just in an unlabeled fallback lane).

## 2. Links — `volume{N}/links.js`

```js
{ source: 'node-id', target: 'other-node-id', label: 'relationship or action', type: 'rel' }
```

`type` must be one of the existing link-color keys: `cat`, `arc`, `rel`, `magic`,
`conflict`, `goal`, `event`, `lore`, `history`, `geo`, `trama`. Using a new type won't
error, it'll just render in the default color — prefer an existing one.

**Every new EVENT node needs an active arc link to `cat-events`**, in the pattern
`{ source: 'cat-events', target: 'new-id', label: 'includes', type: 'arc' }` (confirm an
existing comparable link with `match-entities.cjs`/a links search rather than guessing).
Likewise, a new TITAN/OLD_GOD/PANTHEON-etc. entity that belongs under `cat-pantheon` or
`cat-cosmology` needs the matching structural arc link.

Write and review each link as a sentence: **source label → relationship label → target
label**. For example, `Sargeras → counts among its champions → the Titans`. Reversing the
endpoints requires rewriting the relationship too.

To retire a relationship that no longer holds, add a **broken-link marker** instead of a
normal link — `label` must match the original link's label exactly, since that's the
removal key:

```js
{ source: 'node-id', target: 'other-node-id', label: 'exact original label', status: 'broken', reason: 'why it ended' }
```

The marker field is `status: 'broken'`, including in batch manifests; `broken: true` is
not recognized and is validated as a normal link instead.

## 3. Timeline entry — `volume{N}/timeline.js`

```js
{ section: N, era: 'era-slug', title: "Section N — Title", summary: "..." }
```

English prose, `<br><br>` between paragraphs, `<strong>` for first-mention proper
nouns/key terms, `<em>` for emphasis. This is what populates the "Volume N" tab in the
timeline log — no other wiring needed, the tab appears automatically the first time this
volume's `timeline.js` goes from empty to non-empty. `era` here is informational (which
part of the cosmology spine this section mostly covers) — it does not have to match
every node's own `era`.

## 4. Later-volume discoveries — integrate directly into nodes and links

The current volume's node and link files are the single source of truth, including
facts that recontextualize an earlier volume. Do not create or maintain a separate
revelations file.

- Add confirmed facts to the existing node's accumulated `desc`, keeping a source marker
  such as `VOLUME 2, SECTION 3` or `VOLUME 2 APPENDIX`. Add a link when the fact
  establishes a meaningful relationship between existing nodes.
- Use a fresh entry in the current section's section for section-specific discoveries.
- Distinguish discovery from inference and contradiction: identify the source, qualify
  inferred identities, and record conflicting claims in the description without
  inventing a confirmed relationship. A genuine contradiction between sources belongs
  in a lore note, not silently resolved one way.
- Reconfirmations need no duplicate entry. Use `previousState` for a short change note
  and `star` when the discovery's significance merits emphasis.

## 5. Volumes 2–4 are already scaffolded

`volume2/`, `volume3/`, `volume4/` each already have empty `nodes.js`/`links.js`/
`timeline.js` (declaring `nodesVolumeN`/`linksVolumeN`/`timelineVolumeN`) and are already
registered in `data-init.js` and loaded by `index.html`. Starting a volume is just
writing its first section — no new wiring needed. (If a fifth volume is ever announced,
copy a `volumeN` folder's three files as a template, add its `<script>` tags to
`index.html` next to Volume 4's, and register it in the array passed to
`ArchiveData.merge` in `data-init.js`.)

## Verification

Use the era verifier and semantic reviews while refining the draft, then run the test
suite once the content is settled.

```sh
node .claude/skills/add-era/scripts/verify-era.cjs 1 4 "$era_baseline" --review-links --review-summary --review-overlap
```

The verifier checks each volume's files separately for JavaScript syntax, resolves link
endpoints against ids available at that volume's reading cap, and requires unique
ordered timeline entries. It compares the current volume's parsed arrays against the
snapshot, requiring unchanged original prefixes and exactly one appended timeline entry
for the requested section. It also requires unique ids among appended nodes,
`status: 'updated'` and a nonempty `previousState` for existing ids, preservation of the
full latest baseline `desc` and `star`, and complete mention matches for emphasized
timeline terms. A failure is fatal: fix it before reporting success.

For the node ownership review, run a separate `verify-era.cjs VOLUME SECTION BASELINE
--review-nodes=1` call, then request each indicated page.

**Completion requires the [ownership gate](references/review-gates.md#hard-gate--fact-ownership),
[event-coverage gate](references/review-gates.md#hard-gate--key-event-coverage) and
[lore-consistency gate](references/review-gates.md#hard-gate--lore-consistency-coverage)
to pass**, with `ownership-review.md`, `event-review.md` and `lore-review.md` in the run
directory. A verifier PASS alone is insufficient.

These checks do not establish factual accuracy or visual correctness. Visual
confirmation in `index.html` (the new/updated node appears with the correct description
and volume metadata, its connections show in the panel, the section appears under the
right "Volume N" tab) is left to the user — report the checks actually completed and do
not attempt browser automation to perform it.

Run `npm test` once content for this run is settled, and after any later edit that
affects a generalizable test's assumptions.

## Improving this skill

Treat friction encountered while running this skill as signal, not noise. After
finishing a section (or a validation pass), before reporting done, ask whether anything
in *this run* was slower, riskier, or more manual than it should have been, and if so fix
this file or its scripts directly — small, load-bearing, no speculative generality for
cases that haven't occurred yet.
