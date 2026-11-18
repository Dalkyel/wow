const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

function client() {
  const context = vm.createContext({ AbortSignal });
  vm.runInContext(readFileSync(join(__dirname, "../professions/auction-client.js"), "utf8"), context);
  return context;
}

const definitions = [
  { name: "Thunder Lizard Tail", itemId: 5470 },
  { name: "Hot Spices", itemId: 2692, vendorCopper: 40 },
  { name: "Light Hide", itemId: 783 },
];
const now = Date.parse("2026-11-18T21:00:00Z");
function market() {
  return { house: { key: "us-2-114", region: "us", faction: "horde", grp: 2, house: 114 },
    t: Date.parse("2026-11-18T20:25:04Z"), f: ["listed", "median", "ask"],
    items: [{ id: 5470, o: [291, 220, 210] }, { id: 2692, o: [200, 55, 49] }] };
}
function storage() {
  const saved = new Map();
  return { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
}

test("the client reads named minimum-price fields, validates the market, and keeps vendor alternatives", () => {
  const context = client();
  const snapshot = context.parseMarketSnapshot(market(), definitions, now);
  assert.equal(snapshot.materials["Thunder Lizard Tail"].auctionCopper, 210);
  assert.equal(snapshot.materials["Hot Spices"].purchaseCopper, 40);
  assert.equal(snapshot.materials["Light Hide"].purchaseCopper, null);
  assert.equal(snapshot.materials["Light Hide"].status, "unlisted");
  assert.equal(snapshot.materials["Thunder Lizard Tail"].scannedAt, "2026-11-18T20:25:04.000Z");
  const wrong = market(); wrong.house.grp = 1;
  assert.throws(() => context.parseMarketSnapshot(wrong, definitions, now), /Unexpected auction market/);
  const invalid = market(); invalid.items[0].o[2] = -10;
  assert.throws(() => context.parseMarketSnapshot(invalid, definitions, now), /Invalid price/);
});

test("repeated visits reuse one hour of cached quotes and refresh after expiry", async () => {
  const context = client();
  const cache = storage();
  let requests = 0;
  const fetchImpl = async (url, options) => {
    requests++;
    assert.equal(url, "https://auctionhouse.tk.gg/api/m/us-2-114");
    assert.equal(options.credentials, "omit");
    return { ok: true, json: async () => market() };
  };
  assert.equal((await context.loadAuctionPrices(definitions, { fetchImpl, storage: cache, now })).source, "live");
  assert.equal((await context.loadAuctionPrices(definitions, { fetchImpl, storage: cache, now: now + 3599999 })).source, "cache");
  assert.equal(requests, 1);
  assert.equal((await context.loadAuctionPrices(definitions, { fetchImpl, storage: cache, now: now + 3600000 })).source, "live");
  assert.equal(requests, 2);
});

test("a failed refresh returns an older cache with its original scan time", async () => {
  const context = client();
  const cache = storage();
  await context.loadAuctionPrices(definitions, { storage: cache, now,
    fetchImpl: async () => ({ ok: true, json: async () => market() }) });
  const result = await context.loadAuctionPrices(definitions, { storage: cache, now: now + 3600000,
    fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(result.source, "stale");
  assert.equal(result.snapshot.materials["Thunder Lizard Tail"].auctionCopper, 210);
  assert.equal(result.snapshot.materials["Thunder Lizard Tail"].scannedAt, "2026-11-18T20:25:04.000Z");
});

test("bad caches are ignored and disabled browser storage does not prevent live prices", async () => {
  const context = client();
  const result = await context.loadAuctionPrices(definitions, { now,
    storage: { getItem() { throw new Error("disabled"); }, setItem() { throw new Error("disabled"); } },
    fetchImpl: async () => ({ ok: true, json: async () => market() }) });
  assert.equal(result.source, "live");
  await assert.rejects(context.loadAuctionPrices(definitions, { now,
    storage: { getItem: () => "corrupt" }, fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
});
