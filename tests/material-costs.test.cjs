const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function page(snapshot, browser) {
  const listeners = new Map();
  const elements = new Map();
  const pending = [];
  function element() {
    return {
      children: [], listeners: {}, classList: { add() {} },
      setAttribute() {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      insertRow() { const row = element(); this.append(row); return row; },
      insertCell() { const cell = element(); this.append(cell); return cell; },
      get valueAsNumber() { return this.value === "" ? NaN : Number(this.value); },
    };
  }
  const document = {
    createElement: element,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element());
      return elements.get(selector);
    },
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(callback);
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.forEach(callback => {
        const result = callback(event);
        if (result?.then) pending.push(result);
      });
    },
  };
  const context = vm.createContext({ document, Event: class { constructor(type) { this.type = type; } },
    ...browser });
  if (snapshot) context.auctionPriceSnapshot = snapshot;
  for (const file of ["known-recipes-data.js", "material-costs.js", "profit.js", "known-recipes.js", "materials-reference.js"]) {
    vm.runInContext(readFileSync(join(__dirname, "../professions", file), "utf8"), context);
  }
  if (browser) vm.runInContext(readFileSync(join(__dirname, "../professions/auction-client.js"), "utf8"), context);
  document.dispatchEvent({ type: "DOMContentLoaded" });
  return { context, document, ready: Promise.all(pending) };
}

test("material source controls update the table and inventory plan together", () => {
  const { context, document } = page();
  assert.equal(vm.runInContext('[...materialValues.values()].every(value => value.source === "bought")', context), true);
  for (const profession of ["leatherworking", "cooking", "first-aid"]) {
    assert.ok(document.querySelector(`#${profession}-material-values`).children.every(row =>
      row.children[0].children[0].value === "bought"));
  }
  const values = document.querySelector("#leatherworking-material-values");
  const row = values.children.find(row => row.children[0].textContent === "Light Leather");
  const source = row.children[0].children[0];
  const price = row.children[1].children[0];
  price.value = "20";
  source.value = "bought";
  source.listeners.change();
  assert.equal(vm.runInContext('materialUnitCost("Light Leather")', context), 20);
  assert.equal(document.querySelector("#result").children[0].textContent, "48c profit");
  const pants = document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0].textContent === "Rugged Leather Pants");
  assert.equal(pants.children[2].textContent, "1s 50c");
  assert.equal(pants.children[4].textContent, "12c");
  assert.match(document.querySelector("#result").children[4].children[1].children[0].textContent,
    /Materials 6s 0c.*Profit 48c/);
});

test("crafted material values include gathered or purchased ingredients recursively", () => {
  const { context } = page();
  vm.runInContext(`materialValues.set("Cured Light Hide", { source: "crafted", price: 172 });
    materialValues.set("Light Hide", { source: "bought", price: 114 });`, context);
  assert.equal(vm.runInContext('materialUnitCost("Cured Light Hide")', context), 164);
  vm.runInContext('materialValues.get("Light Hide").source = "gathered"', context);
  assert.equal(vm.runInContext('materialUnitCost("Cured Light Hide")', context), 50);
  vm.runInContext(`materialValues.get("Light Hide").source = "bought";
    materialValues.get("Light Hide").price = null;`, context);
  assert.equal(vm.runInContext('materialUnitCost("Cured Light Hide")', context), null);
});

test("ingredient crafting costs reach the sold recipe without being charged twice", () => {
  const { context } = page();
  const answer = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const stock = inventoryMaterials.map(name => name === "Ruined Leather Scraps" ? 48 : name === "Medium Hide" ? 1 : 0);
    const costs = { "Ruined Leather Scraps": 1, "Medium Hide": 25 };
    const plan = bestPlan(stock, knownRecipes, inventoryMaterials, costs);
    return { plan, rows: recipeProfitBreakdown(plan, stock, inventoryMaterials, costs) };
  })())`, context));
  assert.equal(answer.plan.profit, 436);
  assert.equal(answer.plan.cost, 223);
  assert.equal(answer.rows.reduce((sum, row) => sum + row.cost, 0), 223);
  assert.equal(answer.rows.reduce((sum, row) => sum + row.profit, 0), 436);
});

test("the planner can leave bought stock untouched and use a cheaper ingredient craft", () => {
  const { context } = page();
  const plan = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const names = ["Light Leather", "Medium Leather", "Cured Medium Hide"];
    const recipes = knownRecipes.filter(recipe =>
      ["Medium Leather", "Hillman's Shoulders"].includes(recipe.name));
    return bestPlan([16, 4, 1], recipes, names, { "Light Leather": 0, "Medium Leather": 98 });
  })())`, context));
  assert.equal(plan.profit, 559);
  assert.equal(plan.cost, 100);
  assert.deepEqual(plan.remaining, [0, 4, 0]);
});

test("a 210c bought lizard tail breaks even with 40c spices, while a gathered tail earns 210c", () => {
  const { document } = page();
  const fields = document.querySelector("#cooking-inventory-fields").children;
  const label = fields.findIndex(field => field.textContent === "Thunder Lizard Tail");
  fields[label + 1].value = "1";
  const row = document.querySelector("#cooking-material-values").children.find(row =>
    row.children[0].textContent === "Thunder Lizard Tail");
  const source = row.children[0].children[0];
  row.children[1].children[0].value = "210";
  source.value = "bought";
  source.listeners.change();
  const recipe = () => document.querySelector("#cooking-recipes").children.find(row =>
    row.children[0].children[0].textContent === "Crispy Lizard Tail");
  assert.equal(recipe().children[2].textContent, "2s 50c");
  assert.equal(recipe().children[3].textContent, "2s 50c");
  assert.equal(recipe().children[4].textContent, "0c");
  assert.equal(document.querySelector("#cooking-result").textContent,
    "This inventory cannot make a profitable recipe at the listed prices.");
  source.value = "gathered";
  source.listeners.change();
  assert.equal(recipe().children[4].textContent, "2s 10c");
  assert.equal(document.querySelector("#cooking-result").children[0].textContent, "2s 10c profit");
});

test("purchase limits distinguish positive profit from break-even and update with other costs", () => {
  const { context, document } = page();
  const limits = () => JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseLimit(
    cookingRecipes.find(recipe => recipe.name === "Crispy Lizard Tail"), "Thunder Lizard Tail"))`, context));
  assert.equal(limits().maximum, 209);
  assert.equal(limits().breakEven, 210);
  const row = document.querySelector("#cooking-material-values").children.find(row =>
    row.children[0].textContent === "Thunder Lizard Tail");
  assert.match(row.children[1].children[1].textContent,
    /Buy at 2s 9c each or less.*Crispy Lizard Tail.*Break-even at 2s 10c/);
  vm.runInContext('materialValues.get("Hot Spices").source = "gathered"', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(limits().maximum, 249);
  assert.match(row.children[1].children[1].textContent, /Buy at 2s 49c each or less/);
});

test("purchase limits account for ingredient quantities, crafting chains, and missing costs", () => {
  const { context } = page();
  const heavy = JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseLimit(
    firstAidRecipes.find(recipe => recipe.name === "Heavy Wool Bandage"), "Wool Cloth"))`, context));
  assert.equal(heavy.maximum, 28);
  assert.equal(heavy.breakEven, 28.5);
  vm.runInContext('materialValues.get("Cured Light Hide").source = "crafted"', context);
  const tunic = JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseLimit(
    knownRecipes.find(recipe => recipe.name === "Fine Leather Tunic"), "Light Hide"))`, context));
  assert.equal(tunic.maximum, 90);
  vm.runInContext('materialValues.get("Hot Spices").price = null', context);
  assert.equal(vm.runInContext(`recipePurchaseLimit(
    cookingRecipes.find(recipe => recipe.name === "Crispy Lizard Tail"), "Thunder Lizard Tail")`, context), null);
});

test("saved auction quotes price the table and planner while allowing manual purchase prices", () => {
  const { context, document } = page({ refreshedAt: "2026-11-18T20:30:00Z", materials: {
    "Thunder Lizard Tail": { auctionCopper: 200, vendorCopper: null, purchaseCopper: 200,
      quantity: 291, status: "available", scannedAt: "2026-11-18T20:25:04Z", sourceUrl: "https://www.wowauctions.net/" },
  } });
  assert.equal(vm.runInContext('materialUnitCost("Thunder Lizard Tail")', context), 200);
  const fields = document.querySelector("#cooking-inventory-fields").children;
  const label = fields.findIndex(field => field.textContent === "Thunder Lizard Tail");
  fields[label + 1].value = "1";
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(document.querySelector("#cooking-result").children[0].textContent, "10c profit");
  const row = document.querySelector("#cooking-material-values").children.find(row =>
    row.children[0].textContent === "Thunder Lizard Tail");
  assert.match(row.children[1].children[2].children[0].textContent, /AH minimum 2s 0c each/);
  const price = row.children[1].children[0];
  price.value = "199";
  price.listeners.input();
  assert.equal(document.querySelector("#cooking-result").children[0].textContent, "11c profit");
  assert.match(row.children[1].children[2].children[0].textContent, /Manual price/);
});

test("opening the planner loads live prices and preserves edits made during the request", async () => {
  const definitions = [
    { name: "Thunder Lizard Tail", itemId: 5470 },
    { name: "Hot Spices", itemId: 2692, vendorCopper: 40 },
    { name: "Bruiseweed", itemId: 2453 },
  ];
  let complete;
  const incoming = new Promise(resolve => { complete = resolve; });
  const { context, document, ready } = page(undefined, { AbortSignal, navigator: {},
    fetch: async url => url === "auction-materials.json"
      ? { ok: true, json: async () => definitions } : incoming });
  const row = document.querySelector("#cooking-material-values").children.find(row =>
    row.children[0].textContent === "Thunder Lizard Tail");
  const input = row.children[1].children[0];
  input.value = "199";
  input.listeners.input();
  vm.runInContext('materialValues.get("Bruiseweed").source = "gathered"', context);
  complete({ ok: true, json: async () => ({
    house: { key: "us-2-114", region: "us", faction: "horde", grp: 2, house: 114 },
    t: Date.parse("2026-11-18T20:25:04Z"), f: ["ask", "listed"],
    items: [{ id: 5470, o: [200, 291] }, { id: 2692, o: [49, 100] }, { id: 2453, o: [50, 20] }],
  }) });
  await ready;
  assert.equal(vm.runInContext('materialUnitCost("Thunder Lizard Tail")', context), 199);
  assert.equal(vm.runInContext('auctionQuotes["Thunder Lizard Tail"].auctionCopper', context), 200);
  assert.equal(vm.runInContext('materialValues.get("Bruiseweed").price', context), 50);
  assert.equal(vm.runInContext('materialUnitCost("Bruiseweed")', context), 0);
  assert.match(document.querySelector("#auction-price-status").textContent, /Auction prices loaded/);
  assert.match(row.children[1].children[2].children[0].textContent, /Manual price.*AH minimum 2s 0c/);
});

test("a live request failure keeps the saved prices and labels the fallback", async () => {
  const snapshot = { refreshedAt: "2026-11-18T20:30:00Z", materials: {
    "Thunder Lizard Tail": { name: "Thunder Lizard Tail", itemId: 5470, auctionCopper: 200,
      vendorCopper: null, purchaseCopper: 200, status: "available", quantity: 291,
      scannedAt: "2026-11-18T20:25:04Z", sourceUrl: "https://www.wowauctions.net/" },
  } };
  const { context, document, ready } = page(snapshot, { AbortSignal, navigator: {},
    fetch: async () => { throw new Error("offline"); } });
  await ready;
  assert.equal(vm.runInContext('materialUnitCost("Thunder Lizard Tail")', context), 200);
  assert.match(document.querySelector("#auction-price-status").textContent, /refresh failed.*Using saved prices/);
});

test("the materials reference lists all unique ingredients and separates vendor, AH, and profit limits", () => {
  const { context, document } = page({ materials: {
    "Thunder Lizard Tail": { auctionCopper: 210, vendorCopper: null, purchaseCopper: 210,
      status: "available", scannedAt: "2026-11-18T20:25:04Z", sourceUrl: "https://auctionhouse.tk.gg/" },
    "Hot Spices": { auctionCopper: 49, vendorCopper: 40, purchaseCopper: 40,
      status: "available", scannedAt: "2026-11-18T20:25:04Z", sourceUrl: "https://auctionhouse.tk.gg/" },
  } });
  const table = document.querySelector("#materials-reference");
  const names = table.children.map(row => row.children[0].textContent);
  const expected = JSON.parse(vm.runInContext("JSON.stringify([...materialValues.keys()].sort((a, b) => a.localeCompare(b)))", context));
  assert.deepEqual(names, expected);
  assert.equal(new Set(names).size, names.length);
  const tail = () => table.children.find(row => row.children[0].textContent === "Thunder Lizard Tail");
  assert.equal(tail().children[1].textContent, "Unknown");
  assert.equal(tail().children[2].children[0].textContent, "2s 10c");
  assert.equal(tail().children[3].textContent, "2s 9c");
  assert.equal(tail().children[4].children[0].textContent, "Crispy Lizard Tail");
  const spices = table.children.find(row => row.children[0].textContent === "Hot Spices");
  assert.equal(spices.children[1].textContent, "40c");
  assert.equal(spices.children[2].children[0].textContent, "49c");

  vm.runInContext('materialValues.get("Hot Spices").source = "gathered"', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(tail().children[3].textContent, "2s 49c");
  const search = document.querySelector("#material-search");
  search.value = "  LIZARD  ";
  search.listeners.input();
  assert.equal(table.children.length, 1);
  assert.equal(table.children[0].children[0].textContent, "Thunder Lizard Tail");
  search.value = "no such material";
  search.listeners.input();
  assert.equal(table.children[0].children[0].textContent, "No materials match your search.");
});

test("a shared material shows every known recipe's distinct quantity, purchase limit, and profit", () => {
  const { context, document } = page();
  vm.runInContext('materialValues.get("Wool Cloth").price = 20', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  const materialRow = () => document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Wool Cloth");
  assert.equal(materialRow().children[3].textContent, "28c");
  assert.equal(materialRow().children[4].children[0].textContent, "Heavy Wool Bandage");
  const details = materialRow().children[4].children[1];
  assert.equal(details.children[0].textContent, "Compare 3 recipes");
  const rows = details.children[2].children[0].children[1].children;
  const wool = rows.find(row => row.children[0].children[0].textContent === "Wool Bandage");
  const heavy = rows.find(row => row.children[0].children[0].textContent === "Heavy Wool Bandage");
  assert.equal(wool.children[0].children[1].textContent, "1 × material per craft");
  assert.equal(wool.children[1].textContent, "27c");
  assert.equal(wool.children[2].textContent, "8c");
  assert.equal(heavy.children[0].children[1].textContent, "2 × material per craft");
  assert.equal(heavy.children[1].textContent, "28c");
  assert.equal(heavy.children[2].textContent, "17c");
  assert.equal(heavy.children[2].children[0].textContent, "8.50c / material");
  details.open = true;
  details.listeners.toggle();
  vm.runInContext('materialValues.get("Wool Cloth").price = 21', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(materialRow().children[4].children[1].open, true);
});

test("the highest purchase limit can come from a recipe with a lower profit per craft", () => {
  const { context, document } = page();
  vm.runInContext('materialValues.get("Cured Light Hide").price = 10000', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  const row = document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Light Leather");
  assert.equal(row.children[3].textContent, "22c");
  assert.equal(row.children[4].children[0].textContent, "Rugged Leather Pants");
  const comparisons = row.children[4].children[1].children[2].children[0].children[1].children;
  const pants = comparisons.find(row => row.children[0].children[0].textContent === "Rugged Leather Pants");
  const boots = comparisons.find(row => row.children[0].children[0].textContent === "Embossed Leather Boots");
  assert.equal(pants.children[1].textContent, "22c");
  assert.equal(pants.children[2].textContent, "1s 12c");
  assert.equal(boots.children[1].textContent, "20c");
  assert.equal(boots.children[2].textContent, "1s 67c");
});
