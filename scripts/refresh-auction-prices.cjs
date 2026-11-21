const { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const project = join(__dirname, "..");
const directory = join(project, "professions");
const market = { server: "forever-us", realm: "pve-forever-us", faction: "horde" };
const snapshotPrefix = "const auctionPriceSnapshot = ";

function itemUrl(material) {
  const slug = material.name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-");
  return `https://www.wowauctions.net/auctionHouse/${market.server}/${market.realm}/${market.faction}/${slug}-${material.itemId}`;
}

function parseAuctionPage(html, material) {
  const embedded = html.match(/<script\b(?=[^>]*\bid=["']__NEXT_DATA__["'])[^>]*>([\s\S]*?)<\/script>/i);
  if (!embedded) throw new Error("Page has no embedded auction data");
  const page = JSON.parse(embedded[1]).props?.pageProps;
  const route = page?.route_info;
  if (!route || Object.keys(market).some(key => route[key] !== market[key])) {
    throw new Error("Auction page returned a different market");
  }
  const info = page.item?.item_info;
  const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (info?.entry !== material.itemId || normalize(info.name) !== normalize(material.name)) {
    throw new Error("Auction page returned a different item");
  }
  const row = page.v2?.row;
  const stats = page.item.stats;
  if (page.v2?.faction && page.v2.faction !== market.faction) throw new Error("Auction row returned a different faction");
  const empty = page.v2 && Object.hasOwn(page.v2, "row") && row === null && (!stats || stats.item_count === 0);
  if (!empty && (!row || typeof row.in_latest_scan !== "boolean")) throw new Error("Current-scan status is missing");
  if (!empty && (!Number.isSafeInteger(row.quantity) || row.quantity < 0)) throw new Error("Invalid listing quantity");
  const available = !empty && row.in_latest_scan && row.quantity > 0;
  const price = available ? row.min_buyout : null;
  if (available && (!Number.isSafeInteger(price) || price <= 0)) throw new Error("Invalid minimum buyout");
  if (available && stats?.minimum_buyout !== price) throw new Error("Embedded minimum buyouts disagree");
  const scannedAt = new Date(page.item.realm_last_scan.replace(" ", "T") + "Z").toISOString();
  return {
    name: material.name,
    itemId: material.itemId,
    auctionCopper: price,
    quantity: available ? row.quantity : 0,
    vendorCopper: material.vendorCopper ?? null,
    // A vendor-sold reagent's price never truly moves; an auction ask below it reflects one
    // fleeting undercut listing, not a reliably buyable price. Always prefer the vendor.
    purchaseCopper: material.vendorCopper ?? price,
    status: available ? "available" : "unlisted",
    scannedAt,
    sourceUrl: itemUrl(material),
  };
}

async function fetchPage(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "WoW-recipe-planner/1.0 (public material price refresh)" } });
    if (response.ok) return response.text();
    if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    throw new Error(`HTTP ${response.status}`);
  }
}

async function refreshPrices(materials, previous = {}, readPage = fetchPage, report = () => {}) {
  const entries = {};
  let next = 0;
  async function worker() {
    while (next < materials.length) {
      const material = materials[next++];
      try {
        entries[material.name] = parseAuctionPage(await readPage(itemUrl(material)), material);
      } catch (error) {
        const older = previous[material.name]?.itemId === material.itemId ? previous[material.name] : undefined;
        const purchase = material.vendorCopper ?? older?.auctionCopper ?? null;
        entries[material.name] = { ...older, name: material.name, itemId: material.itemId,
          vendorCopper: material.vendorCopper ?? null,
          auctionCopper: older?.auctionCopper ?? null,
          purchaseCopper: purchase,
          sourceUrl: itemUrl(material), status: "error", error: error.message };
      }
      report(entries[material.name]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, materials.length) }, worker));
  return Object.fromEntries(materials.map(material => [material.name, entries[material.name]]));
}

function saveSnapshot(snapshot) {
  const csv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const columns = ["name", "itemId", "auctionCopper", "vendorCopper", "purchaseCopper", "quantity", "status", "scannedAt", "sourceUrl", "error"];
  const rows = [columns.join(","), ...Object.values(snapshot.materials).map(record => columns.map(key => csv(record[key])).join(","))];
  for (const [name, data] of [
    ["auction-prices.csv", rows.join("\n") + "\n"],
    ["auction-prices.js", snapshotPrefix + JSON.stringify(snapshot, null, 2) + ";\n"],
  ]) {
    const destination = join(directory, name);
    const temporary = destination + `.${process.pid}.tmp`;
    try {
      writeFileSync(temporary, data);
      renameSync(temporary, destination);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}

async function main() {
  const lock = join(directory, ".auction-price-refresh.lock");
  const handle = openSync(lock, "wx");
  try {
    const context = vm.createContext({});
    vm.runInContext(readFileSync(join(directory, "known-recipes-data.js"), "utf8"), context);
    const names = JSON.parse(vm.runInContext("JSON.stringify([...new Set([...knownRecipes, ...cookingRecipes, ...firstAidRecipes].flatMap(recipe => recipe.materials.map(([name]) => name)))])", context));
    const definitions = JSON.parse(readFileSync(join(directory, "auction-materials.json"), "utf8"));
    const byName = new Map(definitions.map(material => [material.name, material]));
    const missing = names.filter(name => !byName.has(name));
    if (missing.length) throw new Error(`Add item IDs to professions/auction-materials.json for ${missing.join(", ")}`);
    const filename = join(directory, "auction-prices.js");
    const previous = existsSync(filename)
      ? JSON.parse(readFileSync(filename, "utf8").trim().slice(snapshotPrefix.length, -1)).materials : {};
    const materials = await refreshPrices(names.sort().map(name => byName.get(name)), previous,
      fetchPage, record => console.log(`${record.name}: ${record.status === "error" ? record.error : record.auctionCopper === null ? "no current listings" : record.auctionCopper + "c"}`));
    saveSnapshot({ market, refreshedAt: new Date().toISOString(), materials });
    const failed = Object.values(materials).filter(record => record.status === "error");
    console.log(`Saved ${names.length - failed.length}/${names.length} material quotes for US Normal Horde.`);
    if (failed.length) process.exitCode = 1;
  } finally {
    closeSync(handle);
    unlinkSync(lock);
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { itemUrl, parseAuctionPage, refreshPrices };
