(() => {
  if (typeof characterSnapshot === 'undefined') return;
  const profile = document.getElementById('character-profile');
  if (!profile) return;
  function render(c, status) {
    const text = (tag, className, value) => {
      const element = document.createElement(tag);
      element.className = className;
      element.textContent = value;
      return element;
    };
    const portraitFrame = document.createElement('div');
    portraitFrame.className = 'character-portrait-frame';
    const portrait = document.createElement('img');
    portrait.className = 'character-portrait';
    portrait.src = c.images.portrait || c.images.avatar || '';
    portrait.alt = `${c.name} in equipped armor`;
    portrait.addEventListener('error', () => { portraitFrame.hidden = true; }, { once: true });
    portraitFrame.append(portrait);
    const body = document.createElement('div');
    body.className = 'character-body';
    body.append(text('p', 'character-eyebrow', 'World of Warcraft · Forever US'));
    body.append(text('h2', 'character-heading', `Level ${c.level} ${c.race} ${c.class}`));
    body.append(text('p', 'character-affiliation', [c.specialization, c.faction, c.guild && `〈${c.guild}〉`].filter(Boolean).join(' · ')));
    const stats = document.createElement('dl');
    stats.className = 'character-stats';
    for (const stat of [{ name: 'Item level', value: c.averageItemLevel }, ...c.stats]) {
      const group = document.createElement('div');
      group.append(text('dt', '', stat.name), text('dd', '', stat.value.toLocaleString()));
      stats.append(group);
    }
    body.append(stats);
    const professions = document.createElement('ul');
    professions.className = 'character-professions';
    professions.setAttribute('aria-label', 'Professions');
    for (const p of c.professions) {
      const item = document.createElement('li');
      item.append(text('span', '', p.name), text('span', 'character-skill', `${p.skill} / ${p.max}`));
      professions.append(item);
    }
    body.append(professions);
    if (c.pet) body.append(text('p', 'character-pet', `Companion: ${c.pet.name} · Level ${c.pet.level} ${c.pet.family === c.pet.name ? '' : c.pet.family || ''}`));
    const source = document.createElement('a');
    source.href = c.sourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.textContent = 'View on Armory ↗';
    const footer = document.createElement('div');
    footer.className = 'character-source';
    const date = new Date(c.fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
    const statusText = text('span', 'character-refresh-status', `${status} · ${date}${c.outdated ? ' · Armory marked outdated' : ''}`);
    statusText.setAttribute('role', 'status');
    footer.append(source, statusText);
    body.append(footer);
    profile.replaceChildren(portraitFrame, body);
    profile.hidden = false;
  }

  render(characterSnapshot, 'Checking Armory… Saved');
  if (location.protocol === 'file:') {
    render(characterSnapshot, 'Saved profile · Open http://127.0.0.1:8788 for automatic refresh');
    return;
  }
  fetch('/api/character', { cache: 'no-store', signal: AbortSignal.timeout(20000) })
    .then(response => {
      if (!response.ok) throw new Error('Refresh unavailable');
      return response.json();
    })
    .then(character => {
      if (character.sourceUrl !== characterSnapshot.sourceUrl || !Number.isInteger(character.level) || !Array.isArray(character.professions)) {
        throw new Error('Invalid character response');
      }
      render(character, 'Checked Armory');
    })
    .catch(() => render(characterSnapshot, 'Armory refresh unavailable · Showing saved profile'));
})();
