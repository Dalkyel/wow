const nodes = [

    {
        id: "root", label: "World of Warcraft Chronicle", group: "CENTER", type: "Work",
        desc: "A four-volume chronological history of the Warcraft universe, from the Void before creation through the eve of the First War.",
        star: ""
    },
    {
        id: "cat-cosmology", label: "COSMOLOGY", group: "CAT", type: "Category",
        desc: "The Void, the titans, and the forces that shape worlds.",
        star: ""
    },
    {
        id: "cat-pantheon", label: "THE PANTHEON", group: "CAT", type: "Category",
        desc: "The titans and their order.",
        star: ""
    },
    {
        id: "cat-events", label: "KEY EVENTS", group: "CAT", type: "Category",
        desc: "Pivotal occurrences in the history of Azeroth.",
        star: ""
    },

// ── VOLUME 1, SECTION 1 — GENESIS ──
    {
        id: "the-void", label: "The Great Dark Beyond", group: "COSMOS", type: "Cosmic Force",
        era: "the-void", chronOrder: 0,
        desc: "Before the universe existed, there was only the Void: an endless, dark emptiness that some sorcerers believe is itself a sleeping, malevolent entity. The first stars and worlds coalesced out of nothing within it, and the Void has pressed against creation ever since, giving rise to the dark whispers the Old Gods carry and the Void Lords who still covet every world that forms.",
        star: "★ Foreshadows the Void Lords and the Old Gods — the Void is a cause, not just a place."
    },
    {
        id: "the-old-gods", label: "The Old Gods", group: "OLD_GOD", type: "Cosmic Horror — Pantheon",
        era: "old-gods-corruption", chronOrder: 0,
        desc: "Titanic, alien intelligences born of the Void's whispers, the Old Gods — among them Yogg-Saron, N'Zoth, C'Thun and Y'Shaarj — infested young, newly-formed worlds from within, including the world that would become Azeroth, twisting its life and stone to serve the Void's hunger long before the titans ever arrived.",
        star: "★ Already present and dormant/active on Azeroth before the titans arrive to shape it."
    },
    {
        id: "azeroth-world-soul", label: "Azeroth's World-Soul", group: "COSMOS", type: "Cosmic Entity",
        era: "old-gods-corruption", chronOrder: 1,
        desc: "Deep within the molten core of the young planet later named Azeroth slept a world-soul — one of the rare, precious sparks of titanic life that can occur when a world forms around sufficient arcane energy. The Old Gods' corruption spread through the planet's crust specifically to smother this slumbering soul before it could awaken and resist them.",
        star: ""
    },

// ── VOLUME 1, SECTION 2 — THE ORDER OF THE TITANS ──
    {
        id: "the-titans", label: "The Titans", group: "PANTHEON", type: "Pantheon",
        era: "order-of-the-titans", chronOrder: 0,
        desc: "Enormous beings of living metal and elemental fire, the titans were once ordinary world-souls who awakened, shed their rocky shells, and dedicated themselves to seeking out and freeing other sleeping world-souls across the cosmos — and to cleansing the corruption the Old Gods and the Void leave in their wake wherever they find it.",
        star: ""
    },
    {
        id: "aman-thul", label: "Aman'Thul, the Highfather", group: "TITAN", type: "Titan — Pantheon Leader",
        era: "order-of-the-titans", chronOrder: 1,
        desc: "The leader of the titan Pantheon and the eldest of its surviving members, Aman'Thul guided the titans' long crusade to awaken world-souls and cleanse corrupted worlds, Azeroth among them.",
        star: ""
    },
    {
        id: "aggramar", label: "Aggramar", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        desc: "The mightiest champion of the titan Pantheon, Aggramar led the Pantheon's armies into battle against corruption wherever it was found, standing beside Sargeras as one of the order's greatest warriors.",
        star: ""
    },
    {
        id: "sargeras", label: "Sargeras", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        desc: "Once the Pantheon's mightiest and most relentless champion, Sargeras spent ages personally cleansing corrupted worlds of Old God influence and demonic taint. The endless parade of corruption he witnessed would, long after the shaping of Azeroth, convince him the only mercy left for creation was its total destruction — but in this earliest age he fights at the Pantheon's side, not yet against it.",
        star: "★★ Foreshadowing only — his fall and the Burning Legion belong to later volumes."
    },
    {
        id: "shaping-of-azeroth", label: "The Shaping of Azeroth", group: "EVENT", type: "Event — Cosmic",
        era: "order-of-the-titans", chronOrder: 2,
        desc: "Drawn by the strength of the world-soul sleeping at its core, the titan Pantheon descended on the young, Old-God-corrupted planet and set about remaking it: raising mountains, carving oceans and seas, and physically battling the corruption infesting its crust so the world-soul beneath could one day awaken in safety.",
        star: ""
    },
    {
        id: "sealing-of-the-old-gods", label: "The Sealing of the Old Gods", group: "EVENT", type: "Event — Cosmic",
        era: "order-of-the-titans", chronOrder: 3,
        desc: "Unable to fully destroy the Old Gods' deeply-rooted corruption without unmaking the world itself, the titans instead imprisoned the surviving Old Gods in great subterranean vaults beneath Azeroth's surface, binding their influence as best they could rather than risk destroying the world-soul they had come to protect.",
        star: ""
    },
    {
        id: "the-well-of-eternity", label: "The Well of Eternity", group: "LOCATION", type: "Location — Cosmic",
        era: "order-of-the-titans", chronOrder: 3,
        desc: "During the shaping of Azeroth, a great wellspring of raw arcane energy formed at the heart of the single world-continent, feeding the planet's life and magic. In an age yet to come, the night elves would build their civilization around its shores — and its power would draw far worse things than mortals to its depths.",
        star: "★★ Foreshadows the War of the Ancients (later volume)."
    },

// ── VOLUME 1 — THE COSMOS (reference primer integration) ──
    {
        id: "light-and-shadow", label: "Light and Shadow", group: "COSMOS", type: "Cosmic Force — Duality",
        era: "the-void", chronOrder: 0,
        desc: "Light and Shadow are the most fundamental forces in existence — contradictory by nature, yet bound together on a cosmic scale, such that one cannot exist without the other. Pure Light and Shadow dwell in a realm outside the borders of reality, but shades of their presence are found throughout the physical universe: Light manifests as holy magic, while Shadow — also called the Void — appears as shadow magic.",
        star: ""
    },
    {
        id: "life-and-death", label: "Life and Death", group: "COSMOS", type: "Cosmic Force — Duality",
        era: "the-void", chronOrder: 0,
        desc: "Life and Death hold sway over every living thing in the physical universe. Life's energies, known as nature magic, promote growth and renewal; Death, wielded as necromantic magic, counterbalances Life as an unavoidable force that breeds despair and pushes all things toward entropic decay and eventual oblivion.",
        star: ""
    },
    {
        id: "order-and-disorder", label: "Order and Disorder", group: "COSMOS", type: "Cosmic Force — Duality",
        era: "the-void", chronOrder: 0,
        desc: "Order and Disorder govern the cosmic systems of the physical universe. Order is most commonly perceived as arcane magic — innately volatile energy that demands intense precision and concentration to wield. Disorder is manifested as fel magic: brutal, highly addictive energy fueled by drawing life from living beings.",
        star: ""
    },
    {
        id: "the-elements", label: "The Elements", group: "COSMOS", type: "Cosmic Force — Primal",
        era: "the-void", chronOrder: 0,
        desc: "Fire, air, earth, and water are the basic building blocks of all matter in the physical universe. Shamanic cultures seek to live in harmony with, or assert dominion over, the elements by calling upon the primordial forces of Spirit and Decay: Spirit — sometimes called the \"fifth element,\" or \"chi\" by monks — is a life-giving force that interconnects and binds all things in existence, while Decay is the tool shaman use to subjugate and weaponize the elements themselves.",
        star: ""
    },
    {
        id: "the-great-dark-beyond", label: "The Great Dark Beyond", group: "COSMOS", type: "Cosmic Realm",
        era: "the-void", chronOrder: 1,
        desc: "The Great Dark Beyond is the physical universe itself: an infinite living realm of innumerable stars, worlds, and mortal civilizations that coalesced within the formless Void. Azeroth is merely one of countless worlds drifting through its vast reaches.",
        star: "★ Distinct from the Void, with which an earlier entry conflated it under this same label: the Void is the primordial Shadow-force that exists outside reality, while the Great Dark Beyond is the populated physical universe that formed within it. STATUS: RESOLVED — the-void node's label corrected to match."
    },
    {
        id: "twisting-nether", label: "The Twisting Nether", group: "COSMOS", type: "Cosmic Realm",
        era: "the-void", chronOrder: 1,
        desc: "The Twisting Nether is a volatile astral dimension lying in parallel with the Great Dark Beyond, where the forces of Light and Void bleed together at its boundaries in perpetual strife. Its magics occasionally intrude upon the physical universe, warping reality wherever they do.",
        star: "★ The spirits of Burning Legion demons are tethered here, making them extraordinarily difficult to destroy permanently outside it."
    },
    {
        id: "emerald-dream", label: "The Emerald Dream", group: "COSMOS", type: "Cosmic Realm",
        era: "order-of-the-titans", chronOrder: 3,
        desc: "The Emerald Dream is an ethereal realm of spirits and untamed nature existing alongside Azeroth, forged by beings known as the keepers to serve as a map for the evolutionary path of the world's flora and fauna. The two realms are bound as one — as life ebbs and flows across the physical world, the Dream's spiritual energies keep pace with it. Mortals who channel druidic magic can enter a dreaming state and consciously navigate it, though any imprint they leave behind there is never permanent.",
        star: "★ First mention of \"the keepers\" — caretaker beings not yet individually named in the archive; their relationship to the titan Pantheon is not yet confirmed here."
    },
    {
        id: "shadowlands", label: "The Shadowlands", group: "COSMOS", type: "Cosmic Realm",
        era: "the-void", chronOrder: 5,
        desc: "The Shadowlands are nightmarish, labyrinthine spiritual planes of decay tangentially linked to Azeroth, representing death as the Emerald Dream represents life; the souls of the dead are said to pass into them. Their origin is uncertain, and belief is divided on whether mortal souls remain there forever or can go on to a brighter place.",
        star: "★★ This framing — a single shared afterlife realm that all mortal souls pass into — reflects the Shadowlands expansion's 2020 retcon of the Warcraft afterlife, not Chronicle Volume 1's original 2016 text. Likely inserted in a later printing; track as a retcon rather than treating it as day-one canon. STATUS: OPEN"
    },
    {
        id: "void-lords", label: "The Void Lords", group: "COSMOS", type: "Cosmic Horror — Void",
        era: "the-void", chronOrder: 1,
        desc: "The void lords are monstrous entities composed of pure shadow energy, cruel and merciless beyond mortal comprehension, driven by an insatiable hunger to devour all matter and energy in the physical universe. In their natural state they exist outside reality; only the most powerful can manifest in the physical universe, and only for limited stretches of time sustained by consuming untold amounts of matter and energy. The Old Gods serve the void lords as their agents within the worlds they infest.",
        star: "★★ Confirms the hierarchy hinted at on the-void: the Old Gods act as the void lords' servants, not independent horrors."
    },
    {
        id: "the-naaru", label: "The Naaru", group: "NAARU", type: "Cosmic Faction — Light-aligned",
        era: "the-void", chronOrder: 1,
        desc: "The naaru are benevolent creatures of living holy energy, perhaps the purest expression of the Light in the Great Dark Beyond. They have vowed to bring peace and hope to mortal civilizations and to waylay the dark forces of the Void that seek to engulf creation.",
        star: ""
    },
    {
        id: "burning-legion", label: "The Burning Legion", group: "BURNING_LEGION", type: "Faction — Demonic Army",
        era: "war-of-the-ancients", chronOrder: 0,
        desc: "The Burning Legion is the single most destructive force within the Great Dark Beyond: a vast demonic army created by the fallen titan Sargeras to scour all creation. It moves from world to world, decimating everything in its path with devastating fel magic; no one knows exactly how many worlds and civilizations it has annihilated in its unholy Burning Crusade. Its demons' spirits are tethered to the Twisting Nether, making them extraordinarily difficult to destroy permanently — one slain in the physical universe simply returns to the Nether and manifests again, and can only be truly destroyed within the Nether itself, at places where it bleeds into mortal worlds, or in regions saturated with the Legion's own energies.",
        star: "★★★ Major foreshadowing relative to the current narrative point: Sargeras is still fighting at the Pantheon's side in Volume 1's own story so far (see sargeras's entry) — his fall and this army's creation lie many sections ahead."
    },
    {
        id: "wild-gods", label: "The Wild Gods", group: "FACTION", type: "Primal Deities — Nature",
        era: "order-of-the-titans", chronOrder: 4,
        desc: "The Wild Gods are primal manifestations of life and nature, creatures of two realms: they inhabit the physical world of Azeroth, but their spirits are bound to the ethereal Emerald Dream. Many take the form of gargantuan animals, such as wolves, bears, tigers, or birds.",
        star: ""
    },
    {
        id: "elemental-spirits", label: "Elemental Spirits", group: "FACTION", type: "Primal Beings — Elemental",
        era: "the-void", chronOrder: 2,
        desc: "The elemental spirits are primitive, chaotic beings of fire, earth, air, or water — among the first sentient creatures to inhabit the nascent worlds of the waking universe. They appear in an almost infinite variety of shapes and sizes, each with a distinct personality and temperament shaped by its elemental nature; a world's balance of the fifth element, Spirit, further shapes whether its native elementals trend passive or aggressive.",
        star: ""
    },
    {
        id: "undead", label: "The Undead", group: "FACTION", type: "Condition — Undeath",
        era: "the-void", chronOrder: 2,
        desc: "The undead are former mortals who have died and become trapped between life and death, deriving power from the necromantic energies that pervade the universe. Most are driven by vengeance and hatred to destroy the one thing they can never have again: life.",
        star: ""
    },
    {
        id: "the-void", label: "The Void", group: "COSMOS", type: "Cosmic Force",
        era: "the-void", chronOrder: 0,
        status: "updated",
        previousState: "Relabeled from \"The Great Dark Beyond\" — a distinct concept, the populated physical universe that forms within the Void — to \"The Void\" itself, per Chronicle's Cosmos primer; added the Light/Shadow pairing.",
        desc: "Before the universe existed, there was only the Void: an endless, dark emptiness that some sorcerers believe is itself a sleeping, malevolent entity. The first stars and worlds coalesced out of nothing within it, and the Void has pressed against creation ever since, giving rise to the dark whispers the Old Gods carry and the Void Lords who still covet every world that forms. The Cosmos primer confirms Shadow is another name for the Void, and that Light and Shadow are an inseparable cosmic duality — holy magic is the Light's expression, shadow magic the Void's.",
        star: "★ Foreshadows the Void Lords and the Old Gods — the Void is a cause, not just a place."
    },
    {
        id: "the-old-gods", label: "The Old Gods", group: "OLD_GOD", type: "Cosmic Horror — Pantheon",
        era: "old-gods-corruption", chronOrder: 0,
        status: "updated",
        previousState: "Added confirmed hierarchy: the Old Gods serve the void lords (Cosmos primer).",
        desc: "Titanic, alien intelligences born of the Void's whispers, the Old Gods — among them Yogg-Saron, N'Zoth, C'Thun and Y'Shaarj — infested young, newly-formed worlds from within, including the world that would become Azeroth, twisting its life and stone to serve the Void's hunger long before the titans ever arrived. The Cosmos primer confirms a hierarchy: the Old Gods serve the void lords, the rare, immensely powerful Void entities capable of manifesting directly in the physical universe, acting as their agents and proxies within the worlds they infest.",
        star: "★ Already present and dormant/active on Azeroth before the titans arrive to shape it."
    },

// ── VOLUME 1, SECTION 4 — THE DAWN OF THE PANTHEON ──
    {
        id: "aman-thul", label: "Aman'Thul, the Highfather", group: "TITAN", type: "Titan — Pantheon Leader",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        status: "updated",
        previousState: "Added: first titan to awaken; found and nurtured the nascent world-souls who became the Pantheon.",
        desc: "The leader of the titan Pantheon and the eldest of its surviving members, Aman'Thul guided the titans' long crusade to awaken world-souls and cleanse corrupted worlds, Azeroth among them.  No one knows when or why he awoke, but legends hold Aman'Thul was the first titan to stir. Alone, he explored the worlds of the Great Dark Beyond searching for others of his kind, finding and lovingly nurturing other nascent world-souls until they, too, awakened; those he roused devoted themselves to his search and, in time, became known together as the Pantheon.",
        star: ""
    },
    {
        id: "the-titans", label: "The Titans", group: "PANTHEON", type: "Pantheon",
        era: "order-of-the-titans", chronOrder: 0,
        section: 4,
        status: "updated",
        previousState: "Added the Pantheon's standard world-ordering method and their use of titan-forged monitoring machines and the constellar's fail-safe purge.",
        desc: "Enormous beings of living metal and elemental fire, the titans were once ordinary world-souls who awakened, shed their rocky shells, and dedicated themselves to seeking out and freeing other sleeping world-souls across the cosmos — and to cleansing the corruption the Old Gods and the Void leave in their wake wherever they find it.  On every world they found, the Pantheon followed the same method: first pacifying its raging elemental populations, then reshaping it — raising mountains, carving seas, shaping skies — and finally seeding it with life, hoping to call forth and mature any world-soul sleeping within. They embedded colossal machines into the worlds they shaped to monitor them afterward, and called upon a race of celestial beings known as the constellar to watch for instability, empowered to trigger a fail-safe purge of a world's life if its evolution ever slid into disorder.",
        star: ""
    },
    {
        id: "formation-of-the-pantheon", label: "The Formation of the Pantheon", group: "EVENT", type: "Event — Cosmic",
        era: "order-of-the-titans", chronOrder: 0,
        section: 4,
        desc: "Aman'Thul, the first titan to stir, spent a lonely age roaming the Great Dark Beyond in search of others of his kind. The nascent world-souls he found and nurtured into awakening joined his quest, and together they became the Pantheon — titans aligned with order and stability, bound by a code of temperance toward the civilizations they encountered.",
        star: ""
    },
    {
        id: "constellar", label: "The Constellar", group: "FACTION", type: "Faction — Celestial Watchers",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        desc: "The constellar are a celestial race called upon by Aman'Thul to aid the Pantheon. They keep watch over the many worlds the titans have ordered, staying vigilant for any sign of instability — and, when necessary, can initiate a fail-safe procedure that scours a world of life to reset its evolutionary process.",
        star: ""
    },
    {
        id: "eonar", label: "Eonar, the Life-Binder", group: "TITAN", type: "Titan — Pantheon Member",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        desc: "A member of the titan Pantheon known as the Life-Binder, Eonar is entrusted with upholding the Pantheon's vow to protect living things wherever possible.",
        star: ""
    },
    {
        id: "khaz-goroth", label: "Khaz'goroth", group: "TITAN", type: "Titan — Shaper and Forger of Worlds",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        desc: "A member of the titan Pantheon known as the Shaper and Forger of Worlds, Khaz'goroth lends his mastery of world-shaping to the Pantheon's work of reordering the worlds they find.",
        star: ""
    },
    {
        id: "norgannon", label: "Norgannon", group: "TITAN", type: "Titan — Keeper of Celestial Magics and Lore",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        desc: "A member of the titan Pantheon known as the Keeper of Celestial Magics and Lore, Norgannon safeguards the Pantheon's accumulated knowledge and arcane craft.",
        star: ""
    },
    {
        id: "golganneth", label: "Golganneth", group: "TITAN", type: "Titan — Lord of the Skies and Roaring Oceans",
        era: "order-of-the-titans", chronOrder: 1,
        section: 4,
        desc: "A member of the titan Pantheon known as the Lord of the Skies and Roaring Oceans, Golganneth holds dominion over the storms and seas the Pantheon raises when they reshape a world.",
        star: ""
    },

// ── VOLUME 1, SECTION 5 — THE VOID LORDS' HIDDEN WAR ──
    {
        id: "void-lords", label: "The Void Lords", group: "COSMOS", type: "Cosmic Horror — Void",
        era: "the-void", chronOrder: 1,
        section: 5,
        status: "updated",
        previousState: "Added the void lords' origin plan for the Old Gods: blind, mass-scattered creations hurled across the cosmos hoping to strike a sleeping world-soul.",
        desc: "The void lords are monstrous entities composed of pure shadow energy, cruel and merciless beyond mortal comprehension, driven by an insatiable hunger to devour all matter and energy in the physical universe. In their natural state they exist outside reality; only the most powerful can manifest in the physical universe, and only for limited stretches of time sustained by consuming untold amounts of matter and energy. The Old Gods serve the void lords as their agents within the worlds they infest.  Unable to corrupt an awakened titan — every one of the Pantheon proved impervious to their influence — the void lords instead sought to seize a titan spirit in its most vulnerable state: before it had ever awoken. Not knowing which worlds cradled a sleeping world-soul, they pooled their power and hurled dark creations blindly across the Great Dark Beyond, hoping some would strike one. These creations contaminated every world and being they touched in their search, and in time came to be known as the Old Gods.",
        star: "★★ Confirms the hierarchy hinted at on the-void: the Old Gods act as the void lords' servants, not independent horrors."
    },
    {
        id: "the-old-gods", label: "The Old Gods", group: "OLD_GOD", type: "Cosmic Horror — Pantheon",
        era: "old-gods-corruption", chronOrder: 0,
        section: 5,
        status: "updated",
        previousState: "Added origin: the void lords' blind, mass-scattered search-creations; noted the Pantheon was still unaware of them at this point, distracted by the demon threat.",
        desc: "Titanic, alien intelligences born of the Void's whispers, the Old Gods — among them Yogg-Saron, N'Zoth, C'Thun and Y'Shaarj — infested young, newly-formed worlds from within, including the world that would become Azeroth, twisting its life and stone to serve the Void's hunger long before the titans ever arrived. The Cosmos primer confirms a hierarchy: the Old Gods serve the void lords, the rare, immensely powerful Void entities capable of manifesting directly in the physical universe, acting as their agents and proxies within the worlds they infest.  The Old Gods are these very creations: dark seeds flung by the void lords across the Great Dark Beyond in a blind search for a sleeping world-soul to corrupt before it could ever awaken. At this stage of the Pantheon's history, the titans remained wholly unaware that the void lords or the Old Gods even existed — their attention was consumed instead by a more immediate threat: the demons spilling out of the Twisting Nether.",
        star: "★ Already present and dormant/active on Azeroth before the titans arrive to shape it."
    },
    {
        id: "sargeras", label: "Sargeras", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        section: 5,
        status: "updated",
        previousState: "Added: dispatched by the Pantheon as its champion against the demonic incursions out of the Twisting Nether.",
        desc: "Once the Pantheon's mightiest and most relentless champion, Sargeras spent ages personally cleansing corrupted worlds of Old God influence and demonic taint. The endless parade of corruption he witnessed would, long after the shaping of Azeroth, convince him the only mercy left for creation was its total destruction — but in this earliest age he fights at the Pantheon's side, not yet against it.  When demonic incursions began to threaten the Pantheon's work across the Great Dark Beyond, the titans dispatched Sargeras — their mightiest warrior — to answer the threat. He pledged he would not rest until he had cleansed the universe of all demonic influence.",
        star: "★★ Foreshadowing only — his fall and the Burning Legion belong to later volumes."
    },
    {
        id: "demons", label: "Demons", group: "FACTION", type: "Faction — Denizens of the Nether",
        era: "order-of-the-titans", chronOrder: 1,
        section: 5,
        desc: "Demons are creatures born of the Twisting Nether, formed where Light and Void energies bleed together at its boundaries. They embrace furious passions without restraint, reveling in the Nether's volatile energy, and many learn to wield the all-consuming power of fel magic. Before long, demons clawed their way into the physical universe, terrorizing mortal civilizations and bringing ruin to world after world — among them the two-headed void hounds, the mindless abyssals and infernals, and the far more cunning nathrezim and annihilan.",
        star: ""
    },
    {
        id: "nathrezim", label: "The Nathrezim", group: "FACTION", type: "Demonkind — Dreadlords",
        era: "order-of-the-titans", chronOrder: 1,
        section: 5,
        desc: "Also known as dreadlords, the nathrezim are among the greater demons of the Twisting Nether, cunning and manipulative masters of shadow magic. Rather than brute conquest, they prefer to infiltrate mortal civilizations, sowing unrest and turning nation against nation — and as a society devolves and crumbles from within, the nathrezim corrupt its population into new and horrific breeds of demon.",
        star: ""
    },
    {
        id: "annihilan", label: "The Annihilan", group: "FACTION", type: "Demonkind — Pit Lords",
        era: "order-of-the-titans", chronOrder: 1,
        section: 5,
        desc: "Also known as pit lords, the annihilan are monstrous demon butchers who favor direct conquest over subtlety, existing only to brutalize and torture the mortals who cross their path. They often enslave lesser demons of the Nether, hurling them as fodder against the mortal civilizations of the Great Dark Beyond.",
        star: ""
    },

// ── VOLUME 1, SECTION 6 — SARGERAS'S CRUSADE AND THE PLANE OF BANISHMENT ──
    {
        id: "sargeras", label: "Sargeras", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        section: 6,
        status: "updated",
        previousState: "Added his demon crusade: discovering the void lords' existence through demons who wielded Void energy, and forging Mardum to permanently imprison demons rather than let them be reborn.",
        desc: "Once the Pantheon's mightiest and most relentless champion, Sargeras spent ages personally cleansing corrupted worlds of Old God influence and demonic taint. The endless parade of corruption he witnessed would, long after the shaping of Azeroth, convince him the only mercy left for creation was its total destruction — but in this earliest age he fights at the Pantheon's side, not yet against it.  When demonic incursions began to threaten the Pantheon's work across the Great Dark Beyond, the titans dispatched Sargeras — their mightiest warrior — to answer the threat. He pledged he would not rest until he had cleansed the universe of all demonic influence.  In his war, Sargeras discovered that some demons had learned to wield Void energies, and in investigating their source he learned that malign intelligences — the void lords — were spreading corruption throughout the cosmos, a discovery that troubled him deeply. He also came to realize that demons slain in the physical universe simply returned to the Twisting Nether and were reborn in new bodies, so he turned to studying the Nether itself and learned to manipulate some of its energies. With this knowledge he forged Mardum, the Plane of Banishment, an inescapable prison within the Nether where demons could be contained forever instead of returning to the field of battle. His and Aggramar's efforts brought a long peace to the cosmos: demonic incursions became rare, and the titans' worlds prospered.",
        star: "★★ Foreshadowing only — his fall and the Burning Legion belong to later volumes."
    },
    {
        id: "aggramar", label: "Aggramar", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        section: 6,
        status: "updated",
        previousState: "Added: sent by the Pantheon to aid Sargeras against the demons, becoming his trusted lieutenant.",
        desc: "The mightiest champion of the titan Pantheon, Aggramar led the Pantheon's armies into battle against corruption wherever it was found, standing beside Sargeras as one of the order's greatest warriors.  When the demonic incursions redoubled, the Pantheon sent Aggramar to aid Sargeras. Though inexperienced in battle, he proved a quick study, earning Sargeras's admiration and becoming his trusted lieutenant; for millennia the two fought shoulder to shoulder as an impenetrable bulwark against the demonic onslaught.",
        star: ""
    },
    {
        id: "sargeras-demon-crusade", label: "Sargeras's Crusade Against the Demons", group: "EVENT", type: "Event — Cosmic Campaign",
        era: "order-of-the-titans", chronOrder: 1,
        section: 6,
        desc: "For ages, Sargeras waged a one-titan war against the demons spilling out of the Twisting Nether, later joined by Aggramar as his trusted lieutenant. Victory after victory taught Sargeras a bitter lesson: demons slain in the physical universe simply returned to the Nether and were reborn. His answer was Mardum, the Plane of Banishment — a prison built to contain demons forever. The campaign brought the cosmos a long peace, but it also exposed Sargeras, for the first time, to the existence of the void lords lurking behind the Void energies some demons wielded.",
        star: "★ Plants the seed for Sargeras's later discovery of the Old Gods and his unraveling faith in the Pantheon."
    },
    {
        id: "mardum", label: "Mardum, the Plane of Banishment", group: "LOCATION", type: "Location — Prison Realm",
        era: "order-of-the-titans", chronOrder: 1,
        section: 6,
        desc: "Forged by Sargeras within the Twisting Nether itself, Mardum is an impregnable pocket dimension built to imprison demons so that, once defeated, they could never again be reborn in the physical universe. As the prison filled with captive demons and their fel energies, the pressure began tearing at the veil between the Nether and reality, and Mardum came to appear in the distant Great Dark Beyond as a burning, verdant star.",
        star: ""
    },

// ── VOLUME 1, SECTION 7 — THE WORLD THAT BROKE SARGERAS ──
    {
        id: "sargeras", label: "Sargeras", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        section: 7,
        status: "updated",
        previousState: "Added the breaking point: destroying a fully consumed world-soul out of mercy, and the resulting rift with the Pantheon over his methods.",
        desc: "Once the Pantheon's mightiest and most relentless champion, Sargeras spent ages personally cleansing corrupted worlds of Old God influence and demonic taint. The endless parade of corruption he witnessed would, long after the shaping of Azeroth, convince him the only mercy left for creation was its total destruction — but in this earliest age he fights at the Pantheon's side, not yet against it.  When demonic incursions began to threaten the Pantheon's work across the Great Dark Beyond, the titans dispatched Sargeras — their mightiest warrior — to answer the threat. He pledged he would not rest until he had cleansed the universe of all demonic influence.  In his war, Sargeras discovered that some demons had learned to wield Void energies, and in investigating their source he learned that malign intelligences — the void lords — were spreading corruption throughout the cosmos, a discovery that troubled him deeply. He also came to realize that demons slain in the physical universe simply returned to the Twisting Nether and were reborn in new bodies, so he turned to studying the Nether itself and learned to manipulate some of its energies. With this knowledge he forged Mardum, the Plane of Banishment, an inescapable prison within the Nether where demons could be contained forever instead of returning to the field of battle. His and Aggramar's efforts brought a long peace to the cosmos: demonic incursions became rare, and the titans' worlds prospered.  Confronted at last with a world-soul the Old Gods had already consumed entirely (see The Shattering of the Dead World), Sargeras judged in that moment that ending it was the only mercy left — a judgment his kin would not forgive, and the source of the first open breach between him and the rest of the Pantheon (see Sargeras's Rift with the Pantheon). He left that argument believing himself alone in grasping just how high the stakes of the war against the void lords truly were.",
        star: "★★ Foreshadowing only — his fall and the Burning Legion belong to later volumes.  ★★★ This is the breaking point itself — Sargeras's fall and the founding of the Burning Legion follow directly from this rift, though they still lie many sections ahead."
    },
    {
        id: "eonar", label: "Eonar, the Life-Binder", group: "TITAN", type: "Titan — Pantheon Member",
        era: "order-of-the-titans", chronOrder: 1,
        section: 7,
        status: "updated",
        previousState: "Added her objection to Sargeras's plan to destroy all creation, invoking the Pantheon's vow to protect life.",
        desc: "A member of the titan Pantheon known as the Life-Binder, Eonar is entrusted with upholding the Pantheon's vow to protect living things wherever possible.  When Sargeras proposed burning away all of creation to defeat the void lords, Eonar was the first to object, reminding him that the Pantheon had sworn to protect living things whenever possible and that nothing could justify such wholesale extinction.",
        star: ""
    },
    {
        id: "aggramar", label: "Aggramar", group: "TITAN", type: "Titan — Champion",
        era: "order-of-the-titans", chronOrder: 1,
        section: 7,
        status: "updated",
        previousState: "Added: stood against Sargeras's plan to destroy creation, urging another solution; unable to stop Sargeras from storming off.",
        desc: "The mightiest champion of the titan Pantheon, Aggramar led the Pantheon's armies into battle against corruption wherever it was found, standing beside Sargeras as one of the order's greatest warriors.  When the demonic incursions redoubled, the Pantheon sent Aggramar to aid Sargeras. Though inexperienced in battle, he proved a quick study, earning Sargeras's admiration and becoming his trusted lieutenant; for millennia the two fought shoulder to shoulder as an impenetrable bulwark against the demonic onslaught.  Even Aggramar, Sargeras's own trusted lieutenant, stood against his mentor's plan to destroy all of creation, urging him to abandon the idea and reason out another solution — but Sargeras, convinced his kin would never understand what he had witnessed, stormed away regardless.",
        star: ""
    },
    {
        id: "the-titans", label: "The Titans", group: "PANTHEON", type: "Pantheon",
        era: "order-of-the-titans", chronOrder: 0,
        section: 7,
        status: "updated",
        previousState: "Added the Pantheon's reaction to Sargeras splitting a corrupted world: shock, and the first sign of fracture in their unity.",
        desc: "Enormous beings of living metal and elemental fire, the titans were once ordinary world-souls who awakened, shed their rocky shells, and dedicated themselves to seeking out and freeing other sleeping world-souls across the cosmos — and to cleansing the corruption the Old Gods and the Void leave in their wake wherever they find it.  On every world they found, the Pantheon followed the same method: first pacifying its raging elemental populations, then reshaping it — raising mountains, carving seas, shaping skies — and finally seeding it with life, hoping to call forth and mature any world-soul sleeping within. They embedded colossal machines into the worlds they shaped to monitor them afterward, and called upon a race of celestial beings known as the constellar to watch for instability, empowered to trigger a fail-safe purge of a world's life if its evolution ever slid into disorder.  When Sargeras revealed that the void lords sought to corrupt nascent titans into unstoppable dark creatures, and that he had destroyed one such corrupted world rather than risk its rise, the rest of the Pantheon was stunned — not only by the revelation, but by what they saw as his needless killing of a kindred world-soul. They argued that, had he called on their aid, the corruption might have been purged without destroying the world-soul itself. This first, bitter rift between Sargeras and his kin would not be the last.",
        star: ""
    },
    {
        id: "void-lords", label: "The Void Lords", group: "COSMOS", type: "Cosmic Horror — Void",
        era: "the-void", chronOrder: 1,
        section: 7,
        status: "updated",
        previousState: "Confirmed, via Sargeras's discovery, the full stakes of the void lords' plan: a successfully corrupted nascent titan would become an unstoppable dark titan threatening all existence.",
        desc: "The void lords are monstrous entities composed of pure shadow energy, cruel and merciless beyond mortal comprehension, driven by an insatiable hunger to devour all matter and energy in the physical universe. In their natural state they exist outside reality; only the most powerful can manifest in the physical universe, and only for limited stretches of time sustained by consuming untold amounts of matter and energy. The Old Gods serve the void lords as their agents within the worlds they infest.  Unable to corrupt an awakened titan — every one of the Pantheon proved impervious to their influence — the void lords instead sought to seize a titan spirit in its most vulnerable state: before it had ever awoken. Not knowing which worlds cradled a sleeping world-soul, they pooled their power and hurled dark creations blindly across the Great Dark Beyond, hoping some would strike one. These creations contaminated every world and being they touched in their search, and in time came to be known as the Old Gods.  Sargeras later confirmed the full horror of their plan: were the void lords ever to succeed in corrupting a nascent titan, it would awaken as an unspeakably dark creature that no power in creation — not even the Pantheon — could stand against, one that would in time consume all matter and energy in the universe and bring every mote of existence under the void lords' will.",
        star: "★★ Confirms the hierarchy hinted at on the-void: the Old Gods act as the void lords' servants, not independent horrors."
    },
    {
        id: "shattering-of-the-dead-world", label: "The Shattering of the Dead World", group: "EVENT", type: "Event — Cosmic",
        era: "order-of-the-titans", chronOrder: 2,
        section: 7,
        desc: "Deep in a remote corner of the Great Dark Beyond, Sargeras discovered a black, desiccated world where the Old Gods had fully corrupted a nascent titan's world-soul, turning its dreams to nightmare. A conclave of nathrezim had gathered there to bask in the Old Gods' power; Sargeras captured and interrogated them, learning the void lords' ultimate goal before obliterating them in his fury. With no way to purge the corruption in time, he split the world in two — an explosion that destroyed the Old Gods infesting it, but killed the corrupted world-soul as well.",
        star: "★★ The first world-soul Sargeras ever killed outright — and the act that convinced him the Pantheon's usual methods were no longer enough."
    },
    {
        id: "sargeras-rift-with-pantheon", label: "Sargeras's Rift with the Pantheon", group: "EVENT", type: "Event — Cosmic",
        era: "order-of-the-titans", chronOrder: 2,
        section: 7,
        desc: "When Sargeras returned and recounted the black world's fate, the Pantheon was stunned — both by the revelation of the void lords' designs and by what they saw as his needless destruction of a kindred world-soul. Convinced that existence itself might already be irreparably flawed, Sargeras proposed burning away all of creation rather than risk the void lords corrupting other titans; Eonar and Aggramar both refused him, and the Pantheon unanimously rejected the plan. Overcome with despair, Sargeras stormed away — the last time the titans of the Pantheon would see him as one of their own.",
        star: "★★★ The direct seed of Sargeras's fall and the founding of the Burning Legion, both still many sections ahead."
    },
    {
        id: "demons", label: "Demons", group: "FACTION", type: "Faction — Denizens of the Nether",
        era: "order-of-the-titans", chronOrder: 1,
        section: 6,
        status: "updated",
        previousState: "Added the Nether-tether/rebirth mechanic — a demon slain in the physical universe is reborn in the Twisting Nether rather than truly destroyed.",
        desc: "Demons are creatures born of the Twisting Nether, formed where Light and Void energies bleed together at its boundaries. They embrace furious passions without restraint, reveling in the Nether's volatile energy, and many learn to wield the all-consuming power of fel magic. Before long, demons clawed their way into the physical universe, terrorizing mortal civilizations and bringing ruin to world after world — among them the two-headed void hounds, the mindless abyssals and infernals, and the far more cunning nathrezim and annihilan.  A demon's spirit remains tethered to the Twisting Nether: one slain in the physical universe does not simply die, but is drawn back into the Nether and, in time, reborn in a new body there. Only destroying a demon within the Nether itself, or in a region where its energies bleed into the physical universe, can end it for good.",
        star: ""
    },
];
