// Curated overrides layered on top of the auto-extracted node data. An entry
// here never replaces the underlying archive — it just gives a hand-written
// intro/alias/key-link for a figure worth the attention; everything else
// falls back to an excerpt of the node's own accumulated desc.
const FIGURE_GUIDES = {
  'the-titans': { intro: "A pantheon of god-like beings devoted to awakening world-souls and cleansing corruption across the cosmos.", aliases: ["the Titans", "the Pantheon"] },
  'aman-thul': { intro: "Leader of the titan Pantheon, called the Highfather.", aliases: ["Aman'Thul", "the Highfather"] },
  aggramar: { intro: "The Pantheon's mightiest champion-at-arms.", aliases: ['Aggramar'] },
  sargeras: { intro: "Once the Pantheon's most relentless champion against corruption — not yet the Dark Titan he will become.", aliases: ['Sargeras'] },
  'the-old-gods': { intro: 'Ancient, alien horrors whispered into being by the Void itself.', aliases: ['the Old Gods'] },
  eonar: { intro: "The Pantheon's Life-Binder, sworn to protect living things wherever possible.", aliases: ['Eonar'] },
  'khaz-goroth': { intro: "The Pantheon's Shaper and Forger of Worlds.", aliases: ["Khaz'goroth"] },
  norgannon: { intro: "The Pantheon's Keeper of Celestial Magics and Lore.", aliases: ['Norgannon'] },
  golganneth: { intro: "The Pantheon's Lord of the Skies and Roaring Oceans.", aliases: ['Golganneth'] },
  constellar: { intro: 'A celestial race that watches the Pantheon-ordered worlds for instability.', aliases: ['Constellar'] },
};

// A small set of useful starting points; every other connection stays available.
const FIGURE_KEY_LINKS = {
  'the-titans': ['aman-thul', 'sargeras', 'aggramar', 'shaping-of-azeroth'],
  'aman-thul': ['the-titans', 'sargeras', 'aggramar'],
  aggramar: ['the-titans', 'aman-thul', 'sargeras'],
  sargeras: ['the-titans', 'aman-thul', 'aggramar'],
  'the-old-gods': ['azeroth-world-soul', 'sealing-of-the-old-gods'],
};

const FIGURE_RELATION_HINTS = {
  sargeras: { 'the-titans': 'The pantheon he serves as champion, long before his fall.' },
  'the-old-gods': { 'azeroth-world-soul': 'The sleeping entity their corruption was meant to smother.' },
};
