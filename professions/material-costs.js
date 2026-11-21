const allKnownRecipes = [...knownRecipes, ...cookingRecipes, ...firstAidRecipes];
const materialSuppliers = new Map(allKnownRecipes.map(recipe => [recipe.name, recipe]));
const auctionQuotes = typeof auctionPriceSnapshot === "undefined" ? {} : { ...auctionPriceSnapshot.materials };
let auctionPriceState = { source: "saved",
  snapshot: typeof auctionPriceSnapshot === "undefined" ? null : auctionPriceSnapshot };
function defaultPurchasePrice(quote, fallback = null) {
  if (quote?.vendorCopper != null) return quote.vendorCopper;
  return quote ? quote.purchaseCopper : fallback;
}
const materialValues = new Map(allKnownRecipes.flatMap(recipe => recipe.materials)
  .map(([name, , price]) => [name, { source: "bought",
    price: defaultPurchasePrice(auctionQuotes[name], price),
    manual: false }]));

function setAuctionPriceState(state) {
  auctionPriceState = { ...auctionPriceState, ...state };
  const status = document.querySelector("#auction-price-status");
  const snapshot = auctionPriceState.snapshot;
  const quotes = Object.values(auctionQuotes);
  const available = quotes.filter(quote => quote.status === "available").length;
  const scan = quotes.find(quote => quote.scannedAt)?.scannedAt;
  const labels = {
    loading: "Loading live auction prices… Using saved prices while loading.",
    saved: "Using saved auction prices.",
    live: "Auction prices loaded.",
    stale: "Auction refresh failed. Using older browser-cached prices.",
    error: "Auction refresh failed. Using saved prices.",
  };
  status.textContent = `${labels[auctionPriceState.source]} US Normal Horde · ` +
    `${available}/${quotes.length} materials listed` +
    `${scan ? ` · Snapshot ${new Date(scan).toLocaleString()}` : ""} `;
  if (snapshot?.provider === "Auction House") {
    const credit = document.createElement("a");
    credit.href = "https://auctionhouse.tk.gg/data/";
    credit.textContent = "Auction House data";
    status.append(credit);
  }
}

function applyAuctionPrices(snapshot, source) {
  for (const name of Object.keys(auctionQuotes)) delete auctionQuotes[name];
  Object.assign(auctionQuotes, snapshot.materials);
  for (const [name, setting] of materialValues) {
    if (!setting.manual && Object.hasOwn(auctionQuotes, name)) setting.price = defaultPurchasePrice(auctionQuotes[name]);
  }
  setAuctionPriceState({ snapshot, source });
  document.dispatchEvent(new Event("materialvalueschange"));
}

function auctionQuoteLabel(quote) {
  const source = auctionPriceState.source;
  const label = quote.status === "error" || ["saved", "loading", "error", "stale"].includes(source)
    ? "Saved AH snapshot" : "AH snapshot";
  return `${label}${quote.scannedAt ? ` · Scanned ${new Date(quote.scannedAt).toLocaleString()}` : ""}. ` +
    "Listings may have changed; enter the available purchase price to plan accurately.";
}

function bestMaterialPurchase(name) {
  const quote = auctionQuotes[name];
  // A vendor-sold reagent's price never truly moves; an auction "ask" below it reflects one
  // fleeting undercut listing, not a reliably buyable price. Always prefer the vendor.
  if (quote?.vendorCopper != null) return { source: "vendor", price: quote.vendorCopper };
  if (quote?.auctionCopper != null) return { source: "AH snapshot", price: quote.auctionCopper };
  return { source: "purchase", price: materialValues.get(name)?.price ?? null };
}

function materialSourceLabel(name) {
  const value = materialValues.get(name);
  if (value?.source !== "bought") return value?.source ?? "unknown";
  if (value.manual) return "manual purchase";
  const best = bestMaterialPurchase(name);
  return best.price === value.price ? best.source : "bought";
}

function materialUnitCost(name, chain = new Set()) {
  const value = materialValues.get(name);
  if (!value || chain.has(name)) return null;
  if (value.source === "gathered") return 0;
  if (value.source === "bought") return value.price;
  const supplier = materialSuppliers.get(name);
  if (!supplier) return null;
  const visited = new Set([...chain, name]);
  const costs = supplier.materials.map(([item, quantity]) => {
    const unitCost = materialUnitCost(item, visited);
    return unitCost === null ? null : unitCost * quantity;
  });
  return costs.some(cost => cost === null) ? null
    : costs.reduce((sum, cost) => sum + cost, 0) / supplier.unitsPerCraft;
}

function recipesAtPurchasePrices(recipes) {
  return recipes.map(recipe => ({ ...recipe,
    materials: recipe.materials.map(([name, quantity]) => [name, quantity, materialValues.get(name)?.price ?? null]),
  }));
}

function recipePurchaseLimit(recipe, target) {
  function value(name, chain = new Set()) {
    if (name === target) return { quantity: 1, cost: 0 };
    if (chain.has(name)) return null;
    const setting = materialValues.get(name);
    if (setting?.source !== "crafted") {
      const cost = materialUnitCost(name);
      return cost === null ? null : { quantity: 0, cost };
    }
    const supplier = materialSuppliers.get(name);
    if (!supplier) return null;
    const ingredients = supplier.materials.map(([item, quantity]) => {
      const part = value(item, new Set([...chain, name]));
      return part && { quantity: part.quantity * quantity / supplier.unitsPerCraft,
        cost: part.cost * quantity / supplier.unitsPerCraft };
    });
    if (ingredients.some(part => part === null)) return null;
    return ingredients.reduce((total, part) =>
      ({ quantity: total.quantity + part.quantity, cost: total.cost + part.cost }), { quantity: 0, cost: 0 });
  }
  const ingredients = recipe.materials.map(([name, quantity]) => {
    const part = value(name);
    return part && { quantity: part.quantity * quantity, cost: part.cost * quantity };
  });
  if (!(recipe.vendorCopper > 0) || ingredients.some(part => part === null)) return null;
  const total = ingredients.reduce((sum, part) =>
    ({ quantity: sum.quantity + part.quantity, cost: sum.cost + part.cost }), { quantity: 0, cost: 0 });
  if (!total.quantity) return null;
  const breakEven = (recipe.vendorCopper * recipe.unitsPerCraft - total.cost) / total.quantity;
  return { recipe, breakEven, maximum: Math.ceil(breakEven) - 1,
    quantity: total.quantity, otherCost: total.cost, payout: recipe.vendorCopper * recipe.unitsPerCraft };
}

const materialPurchaseRanges = new Map();
document.addEventListener("materialvalueschange", () => materialPurchaseRanges.clear());

function materialPurchaseRange(name) {
  if (materialPurchaseRanges.has(name)) return materialPurchaseRanges.get(name);
  const limits = allKnownRecipes.map(recipe => recipePurchaseLimit(recipe, name)).filter(Boolean);
  const eligible = limits.filter(limit => limit.maximum >= 0)
    .sort((a, b) => a.maximum - b.maximum || a.recipe.name.localeCompare(b.recipe.name));
  const range = { lowest: eligible[0], highest: eligible.at(-1), count: eligible.length, limits };
  materialPurchaseRanges.set(name, range);
  return range;
}

function materialMaximumBuyLabel(name) {
  const { highest, limits } = materialPurchaseRange(name);
  return highest ? coins(highest.maximum) : limits.length ? "None" : "Unknown";
}

const materialMaximumBuyExplanation = "Highest positive-profit purchase ceiling across all known recipes, " +
  "using current selected costs for other ingredients. The same material has the same max buy in every recipe. " +
  "At this price, the recipe with the highest ceiling can profit; other recipes may lose money. " +
  "Each ingredient limit applies separately.";

// A recipe's own materials, plus the materials of any ingredient currently selected as "crafted",
// expanded recursively. Mirrors the chain recipePurchaseTradeoff and materialUnitCost already follow,
// so every pair tried here is one that function can actually resolve a tradeoff for.
function recipeIngredientNames(recipe, chain = new Set()) {
  const names = new Set();
  for (const [name] of recipe.materials) {
    if (chain.has(name)) continue;
    names.add(name);
    const supplier = materialSuppliers.get(name);
    if (supplier && materialValues.get(name)?.source === "crafted") {
      recipeIngredientNames(supplier, new Set([...chain, name])).forEach(sub => names.add(sub));
    }
  }
  return names;
}

function recipePurchaseTradeoff(recipe, leather, hide) {
  const hidePrice = materialValues.get(hide)?.price;
  if (!(recipe.vendorCopper > 0) || hidePrice == null) return null;
  function ingredient(name, chain = new Set()) {
    if (name === leather) return { leather: 1, hide: 0, cost: 0 };
    if (name === hide) return { leather: 0, hide: 1, cost: 0 };
    if (chain.has(name)) return null;
    if (materialValues.get(name)?.source !== "crafted") {
      const cost = materialUnitCost(name);
      return cost == null ? null : { leather: 0, hide: 0, cost };
    }
    const supplier = materialSuppliers.get(name);
    return supplier ? combine(supplier.materials, new Set([...chain, name]), supplier.unitsPerCraft) : null;
  }
  function combine(materials, chain = new Set(), yieldCount = 1) {
    const total = { leather: 0, hide: 0, cost: 0 };
    for (const [name, quantity] of materials) {
      const part = ingredient(name, chain);
      if (!part) return null;
      for (const key of ["leather", "hide", "cost"]) total[key] += part[key] * quantity / yieldCount;
    }
    return total;
  }
  const parts = combine(recipe.materials);
  if (!parts || !parts.leather || !parts.hide) return null;
  const payout = recipe.vendorCopper * recipe.unitsPerCraft;
  const budget = payout - parts.cost;
  const maximumLeather = Math.ceil((budget - parts.hide * hidePrice) / parts.leather) - 1;
  if (maximumLeather < 0) return null;
  return { leather, hide, leatherQuantity: parts.leather, hideQuantity: parts.hide,
    hidePrice, maximumLeather, otherCost: parts.cost, budget,
    profit: budget - parts.leather * maximumLeather - parts.hide * hidePrice,
    extraHidePerCopperSaved: parts.leather / parts.hide };
}

function renderMaterialValues(container, recipes) {
  const names = new Set();
  function include(name) {
    if (names.has(name)) return;
    names.add(name);
    materialSuppliers.get(name)?.materials.forEach(([item]) => include(item));
  }
  recipes.forEach(recipe => recipe.materials.forEach(([name]) => include(name)));
  for (const name of [...names].sort()) {
    const row = document.createElement("div");
    row.className = "material-value";
    const label = document.createElement("label");
    label.textContent = name;
    const source = document.createElement("select");
    source.setAttribute("aria-label", `${name} source`);
    for (const [value, text] of [["gathered", "Gathered"], ["bought", "Bought"], ["crafted", "Crafted"]]) {
      if (value === "crafted" && !materialSuppliers.has(name)) continue;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      source.append(option);
    }
    source.value = materialValues.get(name).source;
    label.append(source);
    const purchase = document.createElement("label");
    purchase.textContent = "Purchase price (copper)";
    const price = document.createElement("input");
    price.type = "number";
    price.min = "0";
    price.step = "1";
    price.value = materialValues.get(name).price ?? "";
    price.setAttribute("aria-label", `${name} purchase price in copper`);
    purchase.append(price);
    const limit = document.createElement("small");
    limit.className = "purchase-limit";
    purchase.append(limit);
    const quoteInfo = document.createElement("small");
    quoteInfo.className = "auction-quote";
    purchase.append(quoteInfo);
    const cost = document.createElement("span");
    const refresh = () => {
      const value = materialValues.get(name);
      source.value = value.source;
      price.value = value.price ?? "";
      const unitCost = materialUnitCost(name);
      cost.textContent = unitCost === null ? "Cost unknown" : `${coins(unitCost)} per owned item`;
      const quote = auctionQuotes[name];
      quoteInfo.replaceChildren();
      if (quote) {
        const auction = quote.auctionCopper === null ? "No auction quote in this snapshot"
          : `Snapshot AH minimum ${coins(quote.auctionCopper)} each`;
        const vendor = quote.vendorCopper === null ? "" : ` · Vendor ${coins(quote.vendorCopper)} each`;
        const message = document.createElement("span");
        message.textContent = `${value.manual ? "Manual price · " : ""}${auction}${vendor} `;
        message.title = auctionQuoteLabel(quote);
        const link = document.createElement("a");
        link.href = quote.sourceUrl;
        link.textContent = "Price source";
        quoteInfo.append(message, link);
      }
      const range = materialPurchaseRange(name);
      const best = range.highest;
      if (!best) {
        limit.textContent = range.limits.length
          ? "Other ingredient costs leave no vendor profit, even if this material is free."
          : "Set the other ingredient costs to calculate a profitable purchase price.";
      } else {
        const breakEven = Number.isInteger(best.breakEven) ? coins(best.breakEven)
          : `${best.breakEven.toFixed(2)}c`;
        limit.textContent = `Buy at ${coins(best.maximum)} each or less for profit with ${best.recipe.name}. ` +
          `Break-even at ${breakEven} each, using your selected costs for other ingredients.`;
      }
      limit.title = materialMaximumBuyExplanation;
    };
    const update = (manual = false) => {
      const amount = price.valueAsNumber;
      const valid = Number.isSafeInteger(amount) && amount >= 0;
      price.setAttribute("aria-invalid", String(!valid));
      materialValues.set(name, { source: source.value, price: valid ? amount : null,
        manual: manual || materialValues.get(name).manual });
      document.dispatchEvent(new Event("materialvalueschange"));
    };
    source.addEventListener("change", () => update());
    price.addEventListener("input", () => update(true));
    document.addEventListener("materialvalueschange", refresh);
    row.append(label, purchase, cost);
    container.append(row);
    refresh();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setAuctionPriceState(auctionPriceState);
  renderMaterialValues(document.querySelector("#leatherworking-material-values"), knownRecipes);
  renderMaterialValues(document.querySelector("#cooking-material-values"), cookingRecipes);
  renderMaterialValues(document.querySelector("#first-aid-material-values"), firstAidRecipes);
});
