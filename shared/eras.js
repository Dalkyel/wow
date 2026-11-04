// ═══════════════════════════════════════════════════════
// ERA REGISTRY — the cosmology spine both timeline axes use.
// Independent of volume: later volumes can narrate an earlier
// era in more depth, so era order lives here, not per-volume.
// ═══════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const ERAS = [
    { id: 'the-void', label: 'The Void', order: 0, color: '#14142a' },
    { id: 'old-gods-corruption', label: 'The Old Gods Stir', order: 1, color: '#3a1a4a' },
    { id: 'order-of-the-titans', label: 'The Order of the Titans', order: 2, color: '#8a6a1a' },
    { id: 'aspects-empowered', label: 'The Dragons Empowered', order: 3, color: '#8b1a1a' },
    { id: 'war-of-the-ancients', label: 'The War of the Ancients', order: 4, color: '#1a4a3a' },
    { id: 'troll-wars', label: 'The Troll Wars', order: 5, color: '#4a2010' },
    { id: 'first-war', label: 'The First War', order: 6, color: '#4a0a0a' },
  ];
  const byId = Object.fromEntries(ERAS.map(e => [e.id, e]));
  const api = { ERAS, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Eras = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
