// ═══════════════════════════════════════════════════════
// QUEST LOG — Orken's record of quests completed in-game,
// in the order he did them. Empty until he starts playing.
// Shape: { id: 'slug', name: 'Quest Name', location: 'Zone or sub-zone',
//          npcs: ['NPC Name', ...] (optional),
//          objective: 'The concrete in-game goal, plainly stated' (optional),
//          note: 'A short personal note' }
// `location` and each `npcs` entry are plain names — the quest panel matches them
// against the lore graph live and renders a link when one exists, including
// volume0 (the in-game lore graph log-quest grows as new NPCs/locations turn up).
// `objective` is the mechanical "what to do" (who to talk to, what to kill/fetch),
// kept separate from `note` so that fact isn't only recoverable by decoding Orken's
// prose — `note` stays his personal, voiced reaction to it.
// ═══════════════════════════════════════════════════════

const quests = [
    { id: "your-place-in-the-world", name: "Your Place in the World", location: "Valley of Trials, Durotar", npcs: ["Kaltunk", "Gornek"],
      objective: "Speak with Gornek at the Den in the Valley of Trials.",
      note: "Kaltunk's whole greeting was a challenge dressed up as a welcome: 'Finally, you are of age — of age to battle in the name of the Horde, to conquer for the glory of the Warchief.' Big words for someone who'd just finished looking me over and deciding I'd do. He didn't wait for an answer, just sent me west to the Den. Gornek wasn't any warmer about it — looked me over and called me 'another one of Kaltunk's recruits' like it was already a letdown, then promised that by the time I'm done with this valley I'll be a proper warrior of the Horde, no arguing about it. Already learning how this works — everyone here answers to someone, and someone else answers to them. I don't mind starting at the bottom. Better view of the whole structure from down here, if you ask me." },
    { id: "cutting-teeth", name: "Cutting Teeth", location: "Valley of Trials, Durotar", npcs: ["Gornek"],
      objective: "Slay 6 Mottled Boars, then return to Gornek.",
      note: "Gornek's first order of business is putting strength in my backbone — he could've sent me after kodo in the Barrens for that, he says, except I'm 'more useful to us alive than dead,' so boars nearby it is instead. Comforting, in a backhanded sort of way. Tried checking in once before I'd actually finished, more out of impatience than anything, and he wasn't fooled for a second: 'I hope you haven't returned to try and convince me you've completed your task — no, of course not.' Point taken. Six mottled boars down for real this time, and the valley already looks different to me — tracks in the dust, movement between the rocks, things I walked past before. Gornek allowed it wasn't bad, 'but don't let it get to your head... you'll fight tougher than boars in your career.' Fair enough. Every hunter has to learn to look before he can learn to aim." },
    { id: "etched-tablet", name: "Etched Tablet", location: "Valley of Trials, Durotar", npcs: ["Gornek", "Jen'shan"],
      objective: "Speak to Jen'shan in the Valley of Trials.",
      note: "Came back from the boars to find Gornek holding a tablet with my name on it — word already travels fast around here. He pointed me to Jen'shan, the troll who trains hunters. She looked me over, said the spirits approved, then told me the hunter's path is one of the oldest the trolls walk — something the Horde only came asking for once shamans and warriors alone weren't getting them by. Then she got almost philosophical about it: we teach them, they teach us, she said, 'we become one race... almost.' Promised to teach me everything she can, once she judges me ready and not before, and told me — a little grandly for a first meeting — that I've got 'a large role to play in da future.' I'll take the training over the prophecy for now." },
    { id: "a-peons-burden", name: "A Peon's Burden", location: "Valley of Trials, Durotar", npcs: ["Ukor", "Innkeeper Grosk"],
      objective: "Bring Ukor's Burden to Innkeeper Grosk in Razor Hill.",
      note: "Ukor's a peon, not a soldier, and he said as much himself — hauled a bundle of food all the way from Razor Hill thinking the valley would need it, found out it didn't, and now he's too spooked by what's out along that road to carry it back himself. 'I'm just a peon, but you're a hero,' he told me, like that settled it. Flattery's a cheap price for an errand, so I didn't argue. Razor Hill greeted me plainly enough — 'Welcome to Razor Hill!' is about all the road itself had to say — and Grosk took the bundle off my hands without much fuss, just a puzzled 'did they not need it?' before pouring me a drink and telling me to rest up — can't serve the Horde running on empty, he said. Fair point. First time I've seen the crossroads that ties this valley to the rest of Durotar." },
    { id: "galgars-cactus-apple-surprise", name: "Galgar's Cactus Apple Surprise", location: "Valley of Trials, Durotar", npcs: ["Galgar"],
      objective: "Bring Galgar 6 Cactus Apples, found growing near cactus plants in the valley.",
      note: "Galgar wiped his brow and complained about the heat before getting to the point — he wants cactus apples for his famous cactus apple surprise, and he's willing to trade a few portions of it for 6 of them. Easiest-sounding job I've had yet, and it was: the cactus plants scattered around the valley gave them up without a fight. When I brought the six back, he didn't just hand over the treat — 'here is your cactus apple surprise plus a little something extra,' he said, and threw in more than he'd promised. First NPC here who's made the valley feel generous instead of just demanding." },
];
