(function (root) {
  'use strict';
  const FIGURE_GROUPS = ['TITAN', 'OLD_GOD', 'DRAGON_ASPECT', 'NAARU', 'NPC'];
  const FACTION_GROUPS = ['PANTHEON', 'ORC_CLAN', 'HUMAN_KINGDOM', 'NIGHT_ELF', 'BURNING_LEGION', 'FACTION'];

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function kind(node) {
    if (FIGURE_GROUPS.includes(node.group)) return 'figures';
    if (FACTION_GROUPS.includes(node.group)) return 'factions';
    return null;
  }
  function excerpt(text, limit = 300) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= limit) return clean;
    const chunk = clean.slice(0, limit);
    const sentence = Math.max(chunk.lastIndexOf('. '), chunk.lastIndexOf('? '), chunk.lastIndexOf('! '));
    return sentence > limit * 0.4 ? chunk.slice(0, sentence + 1) : chunk.slice(0, chunk.lastIndexOf(' ')) + '…';
  }
  // Explicit era-headed revisions use "VOLUME N, SECTION M:" — never an incidental mention.
  function eraSections(text) {
    const pattern = /VOLUME\s+(\d+)\s*,?\s*SECTION\s+(\d+)(\s*\([^)]*\))?\s*:/gi;
    const matches = [...String(text || '').matchAll(pattern)];
    return matches.map((m, i) => ({ volume: Number(m[1]), section: Number(m[2]),
      qualifier: (m[3] || '').trim(),
      text: text.slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length).trim() }));
  }
  function timeline(revisions, id) {
    const sections = new Map();
    revisions.filter(n => n.id === id).forEach(n => {
      eraSections(n.desc).filter(s => s.text).forEach(s => sections.set(`${s.volume}:${s.section}`, s));
    });
    return [...sections.values()].sort((a, b) => a.volume - b.volume || a.section - b.section);
  }
  function aliases(node, revisions, guides) {
    const guide = guides[node.id] || {};
    const knownNames = [node.label, ...revisions.filter(n => n.id === node.id).map(n => n.label)];
    return [...new Set([node.id.replace(/-/g, ' '), ...knownNames, ...(guide.aliases || [])])];
  }
  function profile(node, revisions, guides = {}) {
    const own = revisions.filter(n => n.id === node.id);
    const latestVolume = Math.max(1, ...revisions.map(n => n.volume || 1));
    const guide = guides[node.id] || {};
    const events = timeline(revisions, node.id);
    const latest = events.at(-1);
    const recent = guide.recent;
    const useRecent = recent && latest && recent.volume === latest.volume && recent.section === latest.section;
    return { node, kind: kind(node), aliases: aliases(node, revisions, guides),
      intro: guide.byVolume?.[latestVolume] || guide.intro || excerpt(node.desc.replace(/^VOLUME\s+\d+\s*,?\s*SECTION\s+\d+(\s*\([^)]*\))?\s*:\s*/i, '')),
      introIsExcerpt: !(guide.byVolume?.[latestVolume] || guide.intro),
      latest: latest ? { ...latest, preview: useRecent ? recent.text : excerpt(latest.text, 420), curated: !!useRecent } : null,
      timeline: events, revisions: own };
  }
  function search(profiles, query, filter = '') {
    const q = normalize(query);
    return profiles.filter(p => !filter || p.kind === filter).map(p => {
      const names = p.aliases.map(normalize);
      let score = !q ? 1 : names.some(n => n === q) ? 100 : names.some(n => n.startsWith(q)) ? 80 :
        names.some(n => q.split(' ').every(word => n.includes(word))) ? 60 :
        q.split(' ').every(word => normalize(p.node.type).includes(word)) ? 30 : 0;
      return { p, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.p.node.label.localeCompare(b.p.node.label)).map(x => x.p);
  }
  function groupedConnections(nodeId, nodes, links) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const groups = new Map();
    const endpoint = n => typeof n === 'object' ? n.id : n;
    links.forEach(link => {
      const s = endpoint(link.source), t = endpoint(link.target);
      if (s !== nodeId && t !== nodeId) return;
      const other = byId.get(s === nodeId ? t : s);
      if (!other || ['CENTER', 'CAT'].includes(other.group)) return;
      const category = kind(other) || (other.group === 'EVENT' ? 'events' :
        other.group === 'LOCATION' ? 'locations' : 'lore');
      if (!groups.has(category)) groups.set(category, new Map());
      const group = groups.get(category);
      if (!group.has(other.id)) group.set(other.id, { node: other, links: [] });
      group.get(other.id).links.push({ source: byId.get(s)?.label || s, target: byId.get(t)?.label || t,
        label: link.label, type: link.type, volume: link.volume || 1,
        ...(Number.isInteger(link.section) ? { section: link.section } : {}) });
    });
    return groups;
  }
  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  const LETTER = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF';
  function buildMentionMatcher(nodes, revisions, guides) {
    const seen = new Set();
    const entries = [];
    nodes.filter(n => !['CENTER', 'CAT'].includes(n.group)).forEach(node => {
      const id = node.id;
      aliases(node, revisions, guides).forEach(raw => {
        const name = String(raw || '').trim();
        const key = name.toLowerCase();
        if (name.length < 3 || !/^[A-ZÀ-ÖØ-Þ]/.test(name) || seen.has(key)) return;
        seen.add(key);
        entries.push({ name, id });
      });
    });
    entries.sort((a, b) => b.name.length - a.name.length);
    const byName = new Map(entries.map(e => [e.name, e.id]));
    const pattern = entries.map(e => escapeRegExp(e.name)).join('|');
    const regex = pattern ? new RegExp(`(?:^|[^${LETTER}])(${pattern})(?![${LETTER}])`, 'g') : null;
    return { regex, idFor: name => byName.get(name) };
  }
  function findMentions(text, matcher) {
    if (!matcher?.regex || !text) return [];
    const matches = [];
    for (const m of String(text).matchAll(matcher.regex)) {
      const name = m[1];
      const start = m.index + (m[0].length - name.length);
      matches.push({ start, end: start + name.length, text: name, id: matcher.idFor(name) });
    }
    return matches;
  }
  const api = { normalize, kind, excerpt, eraSections, timeline, aliases, profile, search, groupedConnections, buildMentionMatcher, findMentions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FigureReference = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
