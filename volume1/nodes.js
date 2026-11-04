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
];
