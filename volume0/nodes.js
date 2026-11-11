// Volume 0 — not a book. Holds the in-game lore graph: NPCs and locations Orken
// actually encounters while playing, logged via the log-quest skill. Permanently
// excluded from the reading-order axis (TimelineCore.readingPositions treats a falsy
// `volume`, and 0 is falsy, as "no reading-order position") while fully participating
// in the chronology axis via era/chronOrder like everything else.
const nodesVolume0 = [
    {
        id: "cat-questlore", label: "ENCOUNTERED IN-GAME", group: "CAT", type: "Category",
        desc: "NPCs and locations Orken has actually met or visited while playing, as opposed to what he's read about.",
        star: ""
    },
    {
        id: "valley-of-trials", label: "Valley of Trials", group: "LOCATION", type: "Starting Zone — Durotar",
        era: "the-present-day", chronOrder: 0,
        desc: "The Valley of Trials is the starting area for young orcs and trolls in Durotar, where new recruits are tested and guided by figures like Kaltunk and Gornek before venturing further into the world. The Den, a building to the west, is where Gornek hands out early assignments.",
        star: ""
    },
    {
        id: "kaltunk", label: "Kaltunk", group: "NPC", type: "Orc — Recruiter, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Kaltunk is an orc found in the Valley of Trials, Durotar, where he greets new recruits and directs them west to the Den, where Gornek waits to give their first assignment.",
        star: ""
    },
    {
        id: "gornek", label: "Gornek", group: "NPC", type: "Orc — Quartermaster, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Gornek is an orc stationed at the Den in the Valley of Trials, Durotar, who takes over guiding new recruits once Kaltunk has sent them his way — and sets the valley's hunters loose on its mottled boars to prove themselves.",
        star: ""
    },
    {
        id: "jenshan", label: "Jen'shan", group: "NPC", type: "Jungle Troll — Hunter Trainer, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Jen'shan is a jungle troll hunter trainer stationed in the Valley of Trials, Durotar, who takes on young hunters once Gornek has pointed them her way.",
        star: ""
    },
    {
        id: "ukor", label: "Ukor", group: "NPC", type: "Orc Peon — Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Ukor is an orc peon who carried a bundle of food from Razor Hill to the Valley of Trials, only to find the recruits there didn't need it — too afraid of the beasts along the road to haul it back himself, he asks passing adventurers to return it to Innkeeper Grosk instead.",
        star: ""
    },
    {
        id: "razor-hill", label: "Razor Hill", group: "LOCATION", type: "Orcish Settlement — Durotar",
        era: "the-present-day", chronOrder: 0,
        desc: "Razor Hill is an orcish settlement built on a crossroads in central Durotar, connecting Orgrimmar to the south and the Northern Barrens to the west. Innkeeper Grosk runs its inn.",
        star: ""
    },
    {
        id: "innkeeper-grosk", label: "Innkeeper Grosk", group: "NPC", type: "Orc — Innkeeper, Razor Hill",
        era: "the-present-day", chronOrder: 0,
        desc: "Innkeeper Grosk is an orc who runs the inn at Razor Hill in Durotar, offering travelers food, drink, and a place to rest.",
        star: ""
    },
    {
        id: "galgar", label: "Galgar", group: "NPC", type: "Orc — Cook, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Galgar is an orc cook stationed in the Valley of Trials, Durotar, who hands young recruits an easy first task — gathering cactus apples for his signature cactus apple surprise — in exchange for a taste of the treat.",
        star: ""
    },
];
