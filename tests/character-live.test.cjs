const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { createServer } = require('../scripts/server.cjs');

async function withServer(getCharacter, run) {
  const server = createServer(getCharacter);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('each character request fetches again and cannot reuse a cached response', async () => {
  let requests = 0;
  await withServer(async () => ({ level: 22 + requests++ }), async base => {
    const first = await fetch(base + '/api/character');
    assert.equal(first.headers.get('cache-control'), 'no-store');
    assert.equal((await first.json()).level, 22);
    assert.equal((await (await fetch(base + '/api/character')).json()).level, 23);
    assert.equal(requests, 2);
    assert.match(await (await fetch(base + '/')).text(), /character\.js/);
    assert.equal((await fetch(base + '/.git/config')).status, 404);
    assert.equal((await fetch(base + '/scripts/server.cjs')).status, 404);
  });
});

test('upstream errors return a failure rather than pretending saved data is fresh', async () => {
  await withServer(async () => { throw new Error('upstream failure'); }, async base => {
    assert.equal((await fetch(base + '/api/character')).status, 502);
  });
});

class Element {
  constructor() { this.children = []; this.textContent = ''; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute() {}
  addEventListener() {}
}
async function loadCard(fetcher, protocol = 'http:') {
  const profile = new Element();
  const context = vm.createContext({
    document: { getElementById: () => profile, createElement: () => new Element() },
    location: { protocol }, fetch: fetcher, AbortSignal,
  });
  vm.runInContext(readFileSync(require.resolve('../character-data.js'), 'utf8'), context);
  vm.runInContext(readFileSync(require.resolve('../character.js'), 'utf8'), context);
  await new Promise(resolve => setImmediate(resolve));
  const allText = element => [element.textContent, ...element.children.map(allText)].join(' ');
  return { profile, text: allText(profile) };
}

test('the browser replaces the saved card with the freshly requested profile', async () => {
  let request;
  const c = vm.runInNewContext(readFileSync(require.resolve('../character-data.js'), 'utf8') + '\ncharacterSnapshot');
  const result = await loadCard(async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ ...c, level: 27 }) };
  });
  assert.equal(request.url, '/api/character');
  assert.equal(request.options.cache, 'no-store');
  assert.match(result.text, /Level 27 Orc Hunter/);
  assert.match(result.text, /Checked Armory/);
  assert.equal(result.profile.children.length, 2);
});

test('the browser keeps the saved profile and explains a failed refresh', async () => {
  const result = await loadCard(async () => { throw new Error('offline'); });
  assert.match(result.text, /Level 22 Orc Hunter/);
  assert.match(result.text, /Armory refresh unavailable/);
});

test('file visits explain how to enable automatic refresh', async () => {
  const result = await loadCard(() => { throw new Error('should not fetch'); }, 'file:');
  assert.match(result.text, /127\.0\.0\.1:8788/);
});
