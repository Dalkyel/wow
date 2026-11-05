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
        desc: "The Valley of Trials is the starting area for young orcs and trolls in Durotar, where new recruits are tested and guided by figures like Kaltunk and Gornek before venturing further into the world.",
        star: ""
    },
    {
        id: "kaltunk", label: "Kaltunk", group: "NPC", type: "Orc — Recruiter, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Kaltunk is an orc found in the Valley of Trials, Durotar, where he greets new recruits and directs them toward Gornek, seated by the fire, for their first assignment.",
        star: ""
    },
    {
        id: "gornek", label: "Gornek", group: "NPC", type: "Orc — Quartermaster, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Gornek is an orc stationed by the fire in the Valley of Trials, Durotar, who takes over guiding new recruits once Kaltunk has sent them his way.",
        star: ""
    },
];
