// ═══════════════════════════════════════════════════════
// QUEST LOG — Dalkar's record of quests completed in-game,
// in the order he did them. Empty until he starts playing.
// Shape: { id: 'slug', name: 'Quest Name', location: 'Zone or sub-zone',
//          npcs: ['NPC Name', ...] (optional), note: 'A short personal note' }
// `location` and each `npcs` entry are plain names — the quest panel matches them
// against the lore graph live and renders a link when one exists, including
// volume0 (the in-game lore graph log-quest grows as new NPCs/locations turn up).
// ═══════════════════════════════════════════════════════

const quests = [];
