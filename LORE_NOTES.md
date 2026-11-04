# Lore notes

Chronicle is a fixed, published text — there's no reader mystery to solve the way a novel's open plot threads get tracked. This board reuses that same status model for a different purpose: tracking **lore-consistency notes** — retcons, contradictions with other Warcraft sources, and open scholarly ambiguities worth flagging as you read.

- Any node whose `star` field is non-empty is auto-imported as a **source** note (status detected from an inline `STATUS: RESOLVED|PARTIAL|OPEN|DISCARDED` marker in the archive text, defaulting to "unreviewed" otherwise).
- You can add your own **reader** notes directly from the board ("+ New note"), independent of any node.
- Edits are stored per-browser in `localStorage`; nothing is ever written back into the volume data files. Export/import a JSON backup to move or share your notes.
- "Hide resolved" is on by default; turn it off to review everything, including notes already marked resolved.

Separating evidence (what the text actually says) from theory (your own interpretation) in each note's form keeps the two from blurring together over a long readthrough.
