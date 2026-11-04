// Volume 0 — not a book. Holds the in-game lore graph: NPCs and locations Dalkar
// actually encounters while playing, logged via the log-quest skill. Permanently
// excluded from the reading-order axis (TimelineCore.readingPositions treats a falsy
// `volume`, and 0 is falsy, as "no reading-order position") while fully participating
// in the chronology axis via era/chronOrder like everything else.
const nodesVolume0 = [
    {
        id: "cat-questlore", label: "ENCOUNTERED IN-GAME", group: "CAT", type: "Category",
        desc: "NPCs and locations Dalkar has actually met or visited while playing, as opposed to what he's read about.",
        star: ""
    },
];
