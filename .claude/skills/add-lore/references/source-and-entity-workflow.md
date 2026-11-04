# Source and entity workflow

## 1. Preflight

Before drafting anything, run the preflight check for the requested volume/section:

```sh
node .claude/skills/add-lore/scripts/check-lore.cjs VOLUME SECTION
```

If it reports `EXISTS OR PARTIAL`, stop and inspect the existing section before
continuing — either finish an interrupted addition or treat this as an explicitly
requested correction, never a blind second append.

## 2. Entity resolution

Before minting a new node id, check whether the entity already exists — under this name,
an alias, or a different romanization/spelling:

```sh
node .claude/skills/add-lore/scripts/match-entities.cjs VOLUME "Name One" "Name Two"
# or, to inspect the full inventory at once:
node .claude/skills/add-lore/scripts/match-entities.cjs VOLUME --all
```

The matcher normalizes accents, hyphens, and spacing, and checks every historical label
an id has ever carried — not just its current one. An `UNMATCHED` result still requires
a spelling/alias check and, if the archive text is ambiguous, a description search
before minting a new id.

**Minting a new id:** use a short, lowercase, hyphenated slug derived from the entity's
most common name (`the-well-of-eternity`, not `well-of-eternity-cosmic-location-01`).
Two different entities that happen to share a name (a namesake) each need their own,
disambiguated id — never reuse one id for two different beings/places/events. A
collective entity referenced by several individual names (e.g. "the titan Pantheon"
vs. naming each titan) gets its own node distinct from its individual members' nodes.

## 3. Safe append mechanics

Never hand-edit `volume{N}/nodes.js`/`links.js`/`timeline.js` directly for an append —
always go through the scripts, which read the current baseline straight from disk and
splice rather than ask you to retype accumulated text (the documented corruption vector
this guards against: retyping a long accumulated `desc` by hand and silently dropping or
garbling a sentence).

- `scripts/append-node.cjs VOLUME ID SPEC_FILE` — one node at a time (new or update).
- `scripts/append-entries.cjs VOLUME links|timeline SPEC_FILE` — a batch of links or
  exactly one timeline entry.
- `scripts/append-lore.cjs VOLUME SECTION BASELINE_DIR SPEC_FILE` — the full
  manifest-driven, transaction-like appener: copies the archive through the volume cap
  into a scratch directory, replays every node/link/timeline write there, re-verifies
  against the baseline, and only then publishes to the real files — rolling back on any
  write error. Prefer this for a normal multi-node section; use the single-entity
  scripts directly only for a small, isolated correction.

**Correcting an already-published manifest:** rerun `append-lore.cjs` with
`--replace-applied PREVIOUS_SPEC_FILE` and the *original* (pre-that-manifest) baseline —
it reproduces the previously-applied manifest from that baseline, requires a byte-exact
match against the live files before touching anything, then applies your corrected
manifest in its place. This fails safely (publishing nothing) if the live files have
since diverged from what that manifest actually produced — a hand edit, a different
manifest, or a later section applied on top all block the replace.

## 4. Manifest shape (`append-lore.cjs`'s SPEC_FILE)

```json
{
  "header": "// ── VOLUME 1, SECTION 4 — TITLE ──",
  "nodes": [ { "id": "...", "mode": "new", "label": "...", "group": "...", "type": "...", "era": "...", "chronOrder": 0, "section": 4, "desc": "...", "star": "" } ],
  "links": [ { "source": "...", "target": "...", "label": "...", "type": "rel" } ],
  "summary": { "section": 4, "era": "...", "title": "Entry 4 — Title", "summary": "..." }
}
```

Each entry in `nodes` is either `{"mode":"new", ...full fields}` or
`{"mode":"update", "descAppend":"...", "previousState":"...", ...}` — see
`append-node.cjs`'s header comment for the complete per-mode field list.
