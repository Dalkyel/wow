// ═══════════════════════════════════════════════════════
// QUEST LOG — Orken's record of quests completed in-game,
// in the order he did them. Empty until he starts playing.
// Shape: { id: 'slug', name: 'Quest Name', location: 'Zone or sub-zone',
//          npcs: ['NPC Name', ...] (optional), note: 'A short personal note' }
// `location` and each `npcs` entry are plain names — the quest panel matches them
// against the lore graph live and renders a link when one exists, including
// volume0 (the in-game lore graph log-quest grows as new NPCs/locations turn up).
// ═══════════════════════════════════════════════════════

const quests = [
    { id: "your-place-in-the-world", name: "Your Place in the World", location: "Valley of Trials, Durotar", npcs: ["Kaltunk", "Gornek"],
      note: "First task of my life outside wherever I came from. Kaltunk looked me over, decided I'd do, and pointed me at Gornek by the fire for my real orders. Already learning how this works — everyone here answers to someone, and someone else answers to them. I don't mind starting at the bottom. Better view of the whole structure from down here, if you ask me." },
    { id: "cutting-teeth", name: "Cutting Teeth", location: "Valley of Trials, Durotar", npcs: ["Gornek"],
      note: "Gornek calls it putting strength in my backbone. I call it learning how much attention a hunter ought to pay to tusks. Six mottled boars down, and the valley already looks different to me — tracks in the dust, movement between the rocks, things I walked past before. Gornek seems satisfied, though he makes sure I know boars are only a beginning. Fair enough. Every hunter has to learn to look before he can learn to aim." },
];
