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
    {
        id: "foreman-thazzril", label: "Foreman Thazz'ril", group: "NPC", type: "Orc — Lumber Foreman, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Foreman Thazz'ril is an orc overseeing lumber-gathering in the Valley of Trials, Durotar, who hands his blackjack to passing recruits to keep the peons under him from napping on the job.",
        star: ""
    },
    {
        id: "kzan-thornslash", label: "Kzan Thornslash", group: "NPC", type: "Weaponsmith, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Kzan Thornslash is a weaponsmith stationed at the Den in the Valley of Trials, Durotar, who repairs training weapons recruits recover from failed trainees so the next wave of recruits can use them.",
        star: ""
    },
    {
        id: "zureetha-fargaze", label: "Zureetha Fargaze", group: "NPC", type: "Watcher, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Zureetha Fargaze is stationed outside the Den in the Valley of Trials, Durotar, watching for trouble from the Burning Blade.",
        star: ""
    },
    {
        id: "burning-blade", label: "Burning Blade", group: "FACTION", type: "Demon-Worshipping Cult",
        era: "the-present-day", chronOrder: 0,
        desc: "The Burning Blade is a demon-worshipping cult. One of its members has camped in a cave near the Valley of Trials, Durotar, and his vile familiars have been spilling out of it to cause havoc.",
        star: ""
    },
    {
        id: "hanazua", label: "Hana'zua", group: "NPC", type: "Troll Hunter — dying, Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Hana'zua is a troll hunter found lying mortally wounded beneath a tree in the Valley of Trials, Durotar, after a vicious scorpid he calls Sarkoth tore into his chest with its stinger on the plateau to the south. He asks passing adventurers to finish the scorpid off and bring back its claw as proof.",
        star: ""
    },
    {
        id: "sarkoth", label: "Sarkoth", group: "CREATURE", type: "Scorpid — Plateau south of Valley of Trials",
        era: "the-present-day", chronOrder: 0,
        desc: "Sarkoth is a particularly vicious scorpid that mortally wounded the troll hunter Hana'zua on the plateau south of the Valley of Trials, Durotar, before Orken hunted it down and brought its claw back as proof.",
        star: ""
    },
    {
        id: "yarrog-baneshadow", label: "Yarrog Baneshadow", group: "NPC", type: "Orc — Burning Blade Cultist, Burning Blade Coven",
        era: "the-present-day", chronOrder: 0,
        desc: "Yarrog Baneshadow is the orc cultist camped in the Burning Blade Coven cave near the Valley of Trials, Durotar, whose vile familiars had been spilling out to cause havoc before Orken cleared them and hunted him down, taking his medallion as proof of the cult's rooting-out.",
        star: ""
    },
];
