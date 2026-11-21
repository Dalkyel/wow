const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const { parseAuctionPage, refreshPrices } = require("../scripts/refresh-auction-prices.cjs");

const tail = { name: "Thunder Lizard Tail", itemId: 5470 };
function fixture(material = tail, changes = {}) {
  const page = {
    route_info: { server: "forever-us", realm: "pve-forever-us", faction: "horde" },
    item: { item_info: { entry: material.itemId, name: material.name },
      stats: { minimum_buyout: 210 }, realm_last_scan: "2026-11-18 20:25:04" },
    v2: { row: { min_buyout: 210, quantity: 291, in_latest_scan: true } },
    ...changes,
  };
  return `<div>Min buyout 2s</div><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: page } })}</script>`;
}

test("minimum buyout comes from exact copper data instead of a truncated price card", () => {
  const quote = parseAuctionPage(fixture(), tail);
  assert.equal(quote.auctionCopper, 210);
  assert.equal(quote.purchaseCopper, 210);
  assert.equal(quote.quantity, 291);
  assert.equal(quote.scannedAt, "2026-11-18T20:25:04.000Z");
});

test("a cheaper known vendor price is retained alongside the auction quote", () => {
  const spice = { name: "Hot Spices", itemId: 2692, vendorCopper: 40 };
  const quote = parseAuctionPage(fixture(spice), spice);
  assert.equal(quote.auctionCopper, 210);
  assert.equal(quote.purchaseCopper, 40);
});

test("a known vendor price is used even when the auction quote is momentarily cheaper", () => {
  const spice = { name: "Hot Spices", itemId: 2692, vendorCopper: 300 };
  const quote = parseAuctionPage(fixture(spice), spice);
  assert.equal(quote.auctionCopper, 210);
  assert.equal(quote.purchaseCopper, 300);
});

test("unlisted materials have an unknown auction cost instead of a zero or previous buyout", () => {
  const quote = parseAuctionPage(fixture(tail, {
    v2: { row: { min_buyout: 210, quantity: 0, in_latest_scan: false } },
  }), tail);
  assert.equal(quote.status, "unlisted");
  assert.equal(quote.auctionCopper, null);
  assert.equal(quote.purchaseCopper, null);
  const empty = parseAuctionPage(fixture(tail, {
    item: { item_info: { entry: 5470, name: tail.name }, stats: null, realm_last_scan: "2026-11-18 20:25:04" },
    v2: { row: null },
  }), tail);
  assert.equal(empty.status, "unlisted");
  assert.equal(empty.purchaseCopper, null);
});

test("item, market, and conflicting numeric quotes are rejected", () => {
  assert.throws(() => parseAuctionPage(fixture(), { name: "Different item", itemId: 5470 }), /different item/);
  assert.throws(() => parseAuctionPage(fixture(tail, {
    route_info: { server: "forever-us", realm: "pve-forever-us", faction: "alliance" },
  }), tail), /different market/);
  assert.throws(() => parseAuctionPage(fixture(tail, {
    v2: { row: { min_buyout: 200, quantity: 291, in_latest_scan: true } },
  }), tail), /disagree/);
});

test("fetch failures retain the previous quote and scan timestamp with a visible error", async () => {
  const previous = parseAuctionPage(fixture(), tail);
  const results = await refreshPrices([tail], { [tail.name]: previous }, async () => { throw new Error("Network unavailable"); });
  assert.equal(results[tail.name].auctionCopper, 210);
  assert.equal(results[tail.name].scannedAt, previous.scannedAt);
  assert.equal(results[tail.name].status, "error");
  assert.equal(results[tail.name].error, "Network unavailable");
});

test("every known recipe material has a unique item mapping", () => {
  const directory = join(__dirname, "../professions");
  const context = vm.createContext({});
  vm.runInContext(readFileSync(join(directory, "known-recipes-data.js"), "utf8"), context);
  const names = JSON.parse(vm.runInContext("JSON.stringify([...new Set([...knownRecipes, ...cookingRecipes, ...firstAidRecipes].flatMap(recipe => recipe.materials.map(([name]) => name)))])", context));
  const definitions = JSON.parse(readFileSync(join(directory, "auction-materials.json"), "utf8"));
  assert.equal(new Set(definitions.map(material => material.name)).size, definitions.length);
  assert.equal(new Set(definitions.map(material => material.itemId)).size, definitions.length);
  assert.deepEqual(names.filter(name => !definitions.some(material => material.name === name)), []);
});
