const auctionProvider = {
  name: "Auction House",
  url: "https://auctionhouse.tk.gg/api/m/us-2-114",
  marketUrl: "https://auctionhouse.tk.gg/m/us-2-114",
  cacheKey: "wow-auctionhouse-us-normal-horde-v1",
};

function parseMarketSnapshot(data, definitions, now = Date.now()) {
  const house = data?.house;
  if (house?.key !== "us-2-114" || house.region !== "us" || house.faction !== "horde" ||
      house.grp !== 2 || house.house !== 114) throw new Error("Unexpected auction market");
  if (!Number.isSafeInteger(data.t) || data.t <= 0 || !Number.isFinite(new Date(data.t).getTime())) {
    throw new Error("Missing auction scan time");
  }
  if (!Array.isArray(data.f) || !Array.isArray(data.items)) throw new Error("Invalid market response");
  const ask = data.f.indexOf("ask");
  const listed = data.f.indexOf("listed");
  if (ask < 0 || listed < 0) throw new Error("Missing minimum buyout fields");
  const items = new Map(data.items.map(item => [item.id, item]));
  const materials = {};
  for (const definition of definitions) {
    const item = items.get(definition.itemId);
    const price = item?.o?.[ask] ?? null;
    const quantity = item?.o?.[listed] ?? 0;
    if (!Number.isSafeInteger(quantity) || quantity < 0 ||
        (price !== null && (!Number.isSafeInteger(price) || price <= 0))) {
      throw new Error(`Invalid price for ${definition.name}`);
    }
    const auctionCopper = quantity > 0 ? price : null;
    const vendorCopper = definition.vendorCopper ?? null;
    materials[definition.name] = {
      name: definition.name,
      itemId: definition.itemId,
      auctionCopper,
      vendorCopper,
      purchaseCopper: auctionCopper === null ? vendorCopper
        : Math.min(auctionCopper, vendorCopper ?? Infinity),
      quantity,
      status: auctionCopper === null ? "unlisted" : "available",
      scannedAt: new Date(data.t).toISOString(),
      sourceUrl: `${auctionProvider.url}/item/${definition.itemId}?hours=1`,
    };
  }
  return { market: { server: "forever-us", realm: "pve-forever-us", faction: "horde" },
    provider: auctionProvider.name, refreshedAt: new Date(now).toISOString(), materials };
}

function readAuctionCache(storage, definitions) {
  try {
    const cached = JSON.parse(storage?.getItem(auctionProvider.cacheKey) ?? "null");
    if (!Number.isFinite(cached?.fetchedAt) || cached.fetchedAt <= 0 ||
        cached.snapshot?.provider !== auctionProvider.name) return null;
    const market = cached.snapshot.market;
    if (market?.server !== "forever-us" || market.realm !== "pve-forever-us" || market.faction !== "horde") return null;
    for (const definition of definitions) {
      const record = cached.snapshot.materials?.[definition.name];
      if (record?.itemId !== definition.itemId ||
          record.vendorCopper !== (definition.vendorCopper ?? null) ||
          !Number.isSafeInteger(record.quantity) || record.quantity < 0 ||
          !["available", "unlisted"].includes(record.status) ||
          (record.purchaseCopper !== null && (!Number.isSafeInteger(record.purchaseCopper) || record.purchaseCopper < 0)) ||
          (record.auctionCopper !== null && (!Number.isSafeInteger(record.auctionCopper) || record.auctionCopper <= 0)) ||
          !Number.isFinite(Date.parse(record.scannedAt))) return null;
      const expectedPurchase = record.auctionCopper === null ? record.vendorCopper
        : Math.min(record.auctionCopper, record.vendorCopper ?? Infinity);
      if (record.purchaseCopper !== expectedPurchase ||
          (record.status === "available" && (record.auctionCopper === null || !record.quantity)) ||
          (record.status === "unlisted" && record.auctionCopper !== null)) return null;
    }
    return cached;
  } catch {
    return null;
  }
}

async function loadAuctionPrices(definitions, { fetchImpl = fetch, storage, now = Date.now() } = {}) {
  try {
    const response = await fetchImpl(auctionProvider.url, {
      credentials: "omit", signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const snapshot = parseMarketSnapshot(await response.json(), definitions, now);
    try {
      storage?.setItem(auctionProvider.cacheKey, JSON.stringify({ fetchedAt: now, snapshot }));
    } catch {
      // Storage can be unavailable or full while the live response is still usable.
    }
    return { snapshot, source: "live" };
  } catch (error) {
    const cached = readAuctionCache(storage, definitions);
    if (cached) return { snapshot: cached.snapshot, source: "stale", error: error.message };
    throw error;
  }
}

async function startAuctionPrices() {
  setAuctionPriceState({ source: "loading" });
  let definitions = Object.values(auctionQuotes).map(quote =>
    ({ name: quote.name, itemId: quote.itemId, vendorCopper: quote.vendorCopper }));
  try {
    const response = await fetch("auction-materials.json", { signal: AbortSignal.timeout(10000) });
    if (response.ok) definitions = await response.json();
  } catch {
    // The saved item mappings support opening the planner as a local HTML file too.
  }
  if (!Array.isArray(definitions) || !definitions.length || definitions.some(definition =>
      typeof definition.name !== "string" || !Number.isSafeInteger(definition.itemId) || definition.itemId <= 0 ||
      (definition.vendorCopper != null && (!Number.isSafeInteger(definition.vendorCopper) || definition.vendorCopper < 0)))) {
    setAuctionPriceState({ source: "error" });
    return;
  }
  let storage;
  try { storage = localStorage; } catch { /* Live prices still work when browser storage is disabled. */ }
  const update = async () => {
    try {
      const result = await loadAuctionPrices(definitions, { storage });
      applyAuctionPrices(result.snapshot, result.source);
    } catch {
      setAuctionPriceState({ source: "error" });
    }
  };
  if (navigator.locks?.request) {
    try {
      await navigator.locks.request(auctionProvider.cacheKey, update);
    } catch {
      await update();
    }
  } else {
    await update();
  }
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", startAuctionPrices);
