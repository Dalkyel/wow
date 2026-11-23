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
  const html = readFileSync(join(__dirname, "../professions/index.html"), "utf8");
  for (const input of html.matchAll(/<input\b[^>]*id="([^"]+-profitable-only)"[^>]*>/g)) {
    document.querySelector(`#${input[1]}`).checked = /\bchecked\b/.test(input[0]);
  }
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
  assert.equal(document.querySelector("#result").children[0].textContent, "82c profit");
  const pants = document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0].textContent === "Rugged Leather Pants");
  assert.equal(pants.children[2].children[0].children[1].textContent, "1s 50c");
  assert.equal(pants.children[2].children[2].children[1].textContent, "12c");
  assert.match(document.querySelector("#result").children[4].children[1].children[0].textContent,
    /Materials 3s 20c.*Profit 70c/);
});

test("recipe rows show auction quotes and the shared highest purchase limit alongside selected costs", () => {
  const { context, document } = page({ materials: {
    "Thunder Lizard Tail": { auctionCopper: 170, purchaseCopper: 201, vendorCopper: null,
      status: "available", scannedAt: "2026-11-19T02:25:14Z" },
  } });
  const cookingRow = () => document.querySelector("#cooking-recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Crispy Lizard Tail");
  let tail = cookingRow().children[1].children[0];
  assert.match(tail.children[0].textContent, /bought at 2s 1c each/);
  assert.equal(tail.children[1].textContent, "AH snapshot 1s 70c · Max buy 2s 9c each");
  assert.match(tail.children[1].title, /Each ingredient limit applies separately/);
  assert.equal(cookingRow().children[2].children[2].children[1].textContent, "9c");

  vm.runInContext('materialValues.get("Hot Spices").source = "gathered"', context);
  document.dispatchEvent({type:"materialvalueschange"});
  tail = cookingRow().children[1].children[0];
  assert.equal(tail.children[1].textContent, "AH snapshot 1s 70c · Max buy 2s 49c each");

  vm.runInContext('materialValues.get("Hot Spices").source = "bought"; materialValues.get("Hot Spices").price = null', context);
  document.querySelector("#cooking-profitable-only").checked = false;
  document.dispatchEvent({type:"materialvalueschange"});
  assert.equal(cookingRow().children[1].children[0].children[1].textContent,
    "AH snapshot 1s 70c · Max buy Unknown each");

  const boots = document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Fine Leather Boots");
  assert.equal(boots.children[1].children[0].children[1].textContent,
    "AH snapshot Unknown · Max buy 32c each");
});

test("a vendor-sold material always prices recipes and hide limits, even when the AH quote is cheaper", () => {
  const snapshot = {materials:{
    "Fine Thread": {auctionCopper:150,purchaseCopper:150,vendorCopper:100,status:"available"},
  }};
  const { context, document } = page(snapshot);
  vm.runInContext('materialValues.get("Light Leather").price=20; materialValues.get("Cured Light Hide").price=30', context);
  document.dispatchEvent({type:"materialvalueschange"});
  const recipe = () => document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Light Leather Pants");
  assert.equal(vm.runInContext('materialUnitCost("Fine Thread")',context),100);
  assert.equal(recipe().children[2].children[0].children[1].textContent,"3s 30c");
  assert.equal(recipe().children[1].children[2].children[0].textContent,
    "1 × Fine Thread · vendor at 1s 0c each");
  assert.match(recipe().children[1].children[2].children[1].textContent,/^Vendor 1s 0c/);
  assert.equal(vm.runInContext('recipePurchaseLimit(knownRecipes.find(r=>r.name==="Light Leather Pants"),"Cured Light Hide").maximum',context),298);
  const hide = document.querySelector("#materials-reference").children.find(row=>row.children[0].textContent==="Cured Light Hide");
  const details = hide.children[1].children[4].children.find(child=>child.className==="material-comparison");
  const pants = details.children[2].children[0].children[1].children.find(row=>
    row.children[0].children[0].textContent==="Light Leather Pants");
  assert.ok(pants.children[3].children.some(child=>child.textContent==="1 × Fine Thread at 1s 0c each (vendor)"));
  context.incoming={materials:{"Fine Thread":{auctionCopper:80,purchaseCopper:80,vendorCopper:100,status:"available"}}};
  vm.runInContext('applyAuctionPrices(incoming,"live")',context);
  assert.equal(recipe().children[2].children[0].children[1].textContent,"3s 30c");
  vm.runInContext('materialValues.get("Fine Thread").manual=true; materialValues.get("Fine Thread").price=200; incoming.materials["Fine Thread"].auctionCopper=150; incoming.materials["Fine Thread"].purchaseCopper=150; applyAuctionPrices(incoming,"live")',context);
  assert.equal(vm.runInContext('materialUnitCost("Fine Thread")',context),200);
  assert.match(recipe().children[1].children[2].children[0].textContent,/manual purchase at 2s 0c/);
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
  assert.equal(answer.plan.profit, 457);
  assert.equal(answer.plan.cost, 163);
  assert.equal(answer.rows.reduce((sum, row) => sum + row.cost, 0), 163);
  assert.equal(answer.rows.reduce((sum, row) => sum + row.profit, 0), 457);
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
  const allRecipes = document.querySelector("#cooking-profitable-only");
  allRecipes.checked = false;
  allRecipes.listeners.change();
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
  assert.equal(recipe().children[2].children[0].children[1].textContent, "2s 50c");
  assert.equal(recipe().children[2].children[1].children[1].textContent, "2s 50c");
  assert.equal(recipe().children[2].children[2].children[1].textContent, "0c");
  assert.equal(document.querySelector("#cooking-result").textContent,
    "This inventory cannot make a profitable recipe at the listed prices.");
  source.value = "gathered";
  source.listeners.change();
  assert.equal(recipe().children[2].children[2].children[1].textContent, "2s 10c");
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
  assert.equal(tail().children[1].children[0].children[1].textContent, "Unknown");
  assert.equal(tail().children[1].children[1].children[1].children[0].textContent, "2s 10c");
  assert.equal(tail().children[1].children[2].children[1].textContent, "2s 9c");
  assert.equal(tail().children[1].children[4].children[1].textContent, "2s 9c");
  assert.equal(tail().children[1].children[4].children[3].children[0].textContent, "Crispy Lizard Tail");
  const spices = table.children.find(row => row.children[0].textContent === "Hot Spices");
  assert.equal(spices.children[1].children[0].children[1].textContent, "40c");
  assert.equal(spices.children[1].children[1].children[1].children[0].textContent, "49c");

  vm.runInContext('materialValues.get("Hot Spices").source = "gathered"', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(tail().children[1].children[2].children[1].textContent, "2s 49c");
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
  assert.equal(materialRow().children[1].children[2].children[1].textContent, "28c");
  assert.equal(materialRow().children[1].children[2].children[2].textContent, "Recipe ceilings 27c – 28c");
  assert.equal(materialRow().children[1].children[4].children[3].children[0].textContent, "Heavy Wool Bandage");
  const details = materialRow().children[1].children[4].children[4];
  const filter = details.children[1].children[0].children[0];
  assert.equal(filter.checked, true);
  filter.checked = false;
  filter.listeners.change();
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
  assert.equal(materialRow().children[1].children[4].children[4].open, true);
});

test("material ranges include zero ceilings, exclude unknown and impossible limits, and recalculate", () => {
  const { context, document } = page();
  vm.runInContext(`
    materialValues.set("Test Material", {source:"bought",price:100});
    materialValues.set("Test Other", {source:"bought",price:10});
    materialValues.set("Test Missing", {source:"bought",price:null});
    allKnownRecipes.push(
      {recipeId:"test:low",name:"Low",unitsPerCraft:1,vendorCopper:11,
        materials:[["Test Material",1,100],["Test Other",1,10]]},
      {recipeId:"test:high",name:"High",unitsPerCraft:1,vendorCopper:21,
        materials:[["Test Material",1,100],["Test Other",1,10]]},
      {recipeId:"test:loss",name:"Loss",unitsPerCraft:1,vendorCopper:9,
        materials:[["Test Material",1,100],["Test Other",1,10]]},
      {recipeId:"test:unknown",name:"Unknown",unitsPerCraft:1,vendorCopper:1000,
        materials:[["Test Material",1,100],["Test Missing",1,null]]});
  `, context);
  document.dispatchEvent({type:"materialvalueschange"});
  const range = () => document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Test Material").children[1].children[2];
  assert.equal(range().children[1].textContent, "10c");
  assert.equal(range().children[2].textContent, "Recipe ceilings 0c – 10c");
  assert.match(range().title, /all 2 recipes in this scenario can profit/);
  vm.runInContext('materialValues.get("Test Other").price = 20', context);
  document.dispatchEvent({type:"materialvalueschange"});
  assert.equal(range().children[1].textContent, "0c");
  vm.runInContext('materialValues.get("Test Other").price = 21', context);
  document.dispatchEvent({type:"materialvalueschange"});
  assert.equal(range().children[1].textContent, "None");
});

test("30c and 45c recipe ceilings give one shared 45c maximum that updates with live ingredient prices", () => {
  const { context, document } = page();
  vm.runInContext(`
    materialValues.set("Shared Leather", { source: "bought", price: 5, manual: false });
    materialValues.set("Shared Thread", { source: "bought", price: 10, manual: false });
    const examples = [
      { name: "Thirty recipe", vendorCopper: 41, unitsPerCraft: 1,
        materials: [["Shared Leather", 1, 5], ["Shared Thread", 1, 10]] },
      { name: "Forty-five recipe", vendorCopper: 56, unitsPerCraft: 1,
        materials: [["Shared Leather", 1, 5], ["Shared Thread", 1, 10]] },
    ];
    knownRecipes.push(...examples);
    allKnownRecipes.push(...examples);
  `, context);
  document.dispatchEvent({ type: "materialvalueschange" });
  const material = () => document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Shared Leather");
  function assertSharedMaximum(expected) {
    assert.equal(material().children[1].children[2].children[1].textContent, expected);
    const recipes = document.querySelector("#recipes").children.filter(row =>
      ["Thirty recipe", "Forty-five recipe"].includes(row.children[0].children[0]?.textContent));
    assert.equal(recipes.length, 2);
    for (const recipe of recipes) {
      assert.match(recipe.children[1].children[0].children[1].textContent,
        new RegExp(`Max buy ${expected} each`));
    }
  }
  assertSharedMaximum("45c");
  assert.equal(material().children[1].children[2].children[2].textContent, "Recipe ceilings 30c – 45c");
  assert.equal(material().children[1].children[4].children[3].children[0].textContent, "Forty-five recipe");
  vm.runInContext(`applyAuctionPrices({ materials: {
    "Shared Thread": { auctionCopper: 20, purchaseCopper: 20, vendorCopper: null, status: "available" }
  } }, "live")`, context);
  assertSharedMaximum("35c");
  assert.equal(material().children[1].children[2].children[2].textContent, "Recipe ceilings 20c – 35c");
  vm.runInContext('materialValues.get("Shared Thread").source = "gathered"', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assertSharedMaximum("55c");
  const filter = document.querySelector("#leatherworking-profitable-only");
  filter.checked = false;
  filter.listeners.change();
  assertSharedMaximum("55c");
});

test("leather-and-hide notes solve the combined purchase budget and update without changing selected prices", () => {
  const { context, document } = page({ materials: {
    "Light Leather": { auctionCopper: 36, purchaseCopper: 36, vendorCopper: null, status: "available" },
    "Cured Light Hide": { auctionCopper: 152, purchaseCopper: 152, vendorCopper: null, status: "available" },
    "Fine Thread": { auctionCopper: 150, purchaseCopper: 150, vendorCopper: 100, status: "available" },
  } });
  const calculate = () => JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseTradeoff(
    knownRecipes.find(r => r.name === "Light Leather Pants"), "Light Leather", "Cured Light Hide"))`, context));
  const scenario = calculate();
  assert.equal(scenario.maximumLeather, 34);
  assert.equal(scenario.profit, 7);
  assert.equal(scenario.otherCost, 100);
  assert.equal(scenario.extraHidePerCopperSaved, 10);
  assert.equal(vm.runInContext('materialUnitCost("Light Leather")', context), 36);
  const filter = document.querySelector("#leatherworking-profitable-only");
  filter.checked = false;
  filter.listeners.change();
  const note = () => document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Light Leather Pants").children[0].children.find(child =>
      child.className === "recipe-tradeoff");
  assert.match(note().children[0].textContent, /10 × Light Leather at 34c each or less.*1 × Cured Light Hide at 1s 52c each.*7c or more/);
  assert.match(note().children[1].textContent, /Every 1c less.*adds 10c.*1s 0c per craft/);
  vm.runInContext('materialValues.get("Cured Light Hide").price = 198', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(calculate().maximumLeather, 30);
  assert.equal(calculate().profit, 1);
  assert.match(note().children[0].textContent, /at 30c each or less.*at 1s 98c each.*1c or more/);
  vm.runInContext('materialValues.get("Cured Light Hide").price = 199', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(calculate().maximumLeather, 29); // 30c would only break even.
});

test("a material with a known vendor price is never offered as the one being solved for", () => {
  const { document } = page({ materials: {
    "Light Leather": { auctionCopper: 36, purchaseCopper: 36, vendorCopper: null, status: "available" },
    "Cured Light Hide": { auctionCopper: 152, purchaseCopper: 152, vendorCopper: null, status: "available" },
    "Fine Thread": { auctionCopper: 150, purchaseCopper: 150, vendorCopper: 100, status: "available" },
  } });
  const filter = document.querySelector("#leatherworking-profitable-only");
  filter.checked = false;
  filter.listeners.change();
  const notes = document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Light Leather Pants").children[0].children
    .filter(child => child.className === "recipe-tradeoff");
  assert.ok(notes.length > 0);
  assert.ok(notes.every(note => !/^Buy \d+ × Fine Thread/.test(note.children[0].textContent)),
    "Fine Thread has a fixed 100c vendor price; a ceiling solved for it is never actionable");
  assert.ok(notes.some(note => /to afford \d+ × Fine Thread/.test(note.children[0].textContent)),
    "Fine Thread should still anchor the other side of a tradeoff");
});

test("tradeoffs respect multiple hides, selected crafting chains, and unsupported scenarios", () => {
  const { context } = page();
  vm.runInContext('materialValues.get("Cured Light Hide").price = 100', context);
  const tradeoff = recipe => JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseTradeoff(
    knownRecipes.find(r => r.name === ${JSON.stringify(recipe)}), "Light Leather", "Cured Light Hide"))`, context));
  const tunic = tradeoff("Fine Leather Tunic");
  assert.equal(tunic.leatherQuantity, 6);
  assert.equal(tunic.hideQuantity, 3);
  assert.equal(tunic.maximumLeather, 20);
  assert.equal(tunic.profit, 1);
  assert.equal(tunic.extraHidePerCopperSaved, 2);
  vm.runInContext('materialValues.get("Fine Leather Tunic").source = "crafted"', context);
  const vest = tradeoff("Hillman's Leather Vest");
  assert.equal(vest.leatherQuantity, 6);
  assert.equal(vest.hideQuantity, 5);
  assert.equal(vest.otherCost, 60);
  assert.equal(vest.maximumLeather, 27);
  assert.equal(vest.profit, 1);
  assert.equal(tradeoff("Fine Leather Boots"), null); // No hide in this recipe.
  vm.runInContext('materialValues.get("Cured Light Hide").price = 500', context);
  assert.equal(tradeoff("Light Leather Pants"), null); // Free leather still cannot help.
  vm.runInContext('materialValues.get("Cured Light Hide").price = null', context);
  assert.equal(tradeoff("Fine Leather Tunic"), null);
  vm.runInContext('materialValues.get("Cured Light Hide").price = 100; materialValues.get("Fine Thread").price = null', context);
  assert.equal(tradeoff("Light Leather Pants"), null);
});

test("reverse side notes price the hide against current leather and remain available when the other direction is impossible", () => {
  const { context, document } = page({ materials: {
    "Light Leather": { auctionCopper: 36, purchaseCopper: 36, vendorCopper: null, status: "available" },
    "Cured Light Hide": { auctionCopper: 152, purchaseCopper: 152, vendorCopper: null, status: "available" },
    "Fine Thread": { auctionCopper: 150, purchaseCopper: 150, vendorCopper: 100, status: "available" },
  } });
  const filter = document.querySelector("#leatherworking-profitable-only");
  filter.checked = false;
  filter.listeners.change();
  const notes = () => document.querySelector("#recipes").children.find(row =>
    row.children[0].children[0]?.textContent === "Light Leather Pants").children[0].children
    .filter(child => child.className === "recipe-tradeoff");
  const reverse = () => JSON.parse(vm.runInContext(`JSON.stringify(recipePurchaseTradeoff(
    knownRecipes.find(r => r.name === "Light Leather Pants"), "Cured Light Hide", "Light Leather"))`, context));
  // Every pair of this recipe's three priced ingredients, both directions (6), minus the two
  // directions that would solve for Fine Thread's ceiling — it has a fixed vendor price (100c).
  assert.equal(notes().length, 4);
  assert.match(notes()[1].children[0].textContent, /1 × Cured Light Hide at 1s 38c each or less.*10 × Light Leather at 36c each.*1c or more/);
  assert.equal(reverse().maximumLeather, 138);
  assert.equal(reverse().profit, 1);
  assert.equal(reverse().extraHidePerCopperSaved, 0.1);
  vm.runInContext('materialValues.get("Light Leather").price = 30', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(reverse().maximumLeather, 198);
  assert.match(notes()[1].children[0].textContent, /Hide at 1s 98c each or less.*Leather at 30c each/);
  vm.runInContext('materialValues.get("Cured Light Hide").price = 500', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(notes().length, 2); // Only directions that solve for Cured Light Hide's own ceiling survive its 500c price.
  assert.match(notes()[0].children[0].textContent, /Buy 1 × Cured Light Hide at 1s 98c/);
});

test("a single-recipe material shows one shared purchase budget for all quantities and crafted ingredients", () => {
  const { context, document } = page();
  vm.runInContext(`
    materialValues.set("Budget A", {source:"bought",price:200});
    materialValues.set("Budget B", {source:"bought",price:300});
    materialValues.set("Budget Crafted", {source:"crafted",price:999});
    materialSuppliers.set("Budget Crafted", {name:"Budget Crafted",unitsPerCraft:1,
      materials:[["Budget A",2,200],["Budget B",1,300]]});
    allKnownRecipes.push({recipeId:"test:budget",name:"Budget recipe",unitsPerCraft:1,vendorCopper:1000,
      materials:[["Budget Crafted",1,999]]});
  `, context);
  document.dispatchEvent({type:"materialvalueschange"});
  const details = () => document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Budget A").children[1].children[4].children.find(child =>
      child.className === "material-comparison");
  const budget = () => details().children[2].children[0].children[1].children[0].children[3];
  assert.equal(details().children[0].textContent, "Compare 1 profitable recipe");
  assert.deepEqual(budget().children.map(child => child.textContent), [
    "All purchases ≤ 9s 99c / craft",
    "Selected total 7s 0c · Vendor pays 10s 0c",
    "2s 99c shared budget remaining",
    "2 × Budget A at 2s 0c each",
    "1 × Budget B at 3s 0c each",
  ]);
  const filter = details().children[1].children[0].children[0];
  filter.checked = false;
  filter.listeners.change();
  vm.runInContext('materialValues.get("Budget B").price = 600', context);
  document.dispatchEvent({type:"materialvalueschange"});
  assert.equal(budget().children[1].textContent, "Selected total 10s 0c · Vendor pays 10s 0c");
  assert.equal(budget().children[2].textContent, "1c over budget");
  vm.runInContext('materialValues.get("Budget B").price = null', context);
  document.dispatchEvent({type:"materialvalueschange"});
  assert.equal(budget().children[1].textContent, "Selected total Unknown · Vendor pays 10s 0c");
  assert.equal(budget().children[2].textContent, "Budget remaining unknown");
});

test("the highest purchase limit can come from a recipe with a lower profit per craft", () => {
  const { context, document } = page();
  // Fine Thread has no crafting recipe of its own, so pricing it out of reach can't be routed
  // around the way a crafted ingredient (like Cured Light Hide) could under the best-path search.
  vm.runInContext('materialValues.get("Fine Thread").price = 10000', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  const row = document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === "Light Leather");
  assert.equal(row.children[1].children[2].children[1].textContent, "27c");
  assert.equal(row.children[1].children[2].children[2].textContent, "Recipe ceilings 1c – 27c");
  assert.equal(row.children[1].children[4].children[3].children[0].textContent, "Embossed Leather Pants");
  const comparisons = row.children[1].children[4].children[4].children[2].children[0].children[1].children;
  const pants = comparisons.find(row => row.children[0].children[0].textContent === "Rugged Leather Pants");
  const boots = comparisons.find(row => row.children[0].children[0].textContent === "Embossed Leather Boots");
  assert.equal(pants.children[1].textContent, "22c");
  assert.equal(pants.children[2].textContent, "1s 12c");
  assert.equal(boots.children[1].textContent, "20c");
  assert.equal(boots.children[2].textContent, "1s 67c");
});

test("each profession can filter positive profits independently and react to changing costs", () => {
  const { context, document } = page();
  const names = selector => document.querySelector(selector).children.map(row => row.children[0].children[0]?.textContent);
  const leather = document.querySelector("#leatherworking-profitable-only");
  assert.equal(leather.checked, true);
  leather.listeners.change();
  assert.ok(names("#recipes").includes("Rugged Leather Pants"));
  assert.ok(!names("#recipes").includes("Forceful Medium Armor Kit"));

  const cooking = document.querySelector("#cooking-profitable-only");
  assert.equal(cooking.checked, true);
  cooking.listeners.change();
  assert.ok(names("#cooking-recipes").includes("Crispy Lizard Tail"));
  assert.ok(!names("#cooking-recipes").includes("Charred Wolf Meat"));
  vm.runInContext('materialValues.get("Thunder Lizard Tail").price = 210', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.ok(!names("#cooking-recipes").includes("Crispy Lizard Tail"));
  assert.ok(names("#cooking-recipes").includes("Smoked Sagefish"));
  vm.runInContext('materialValues.get("Raw Sagefish").price = null; materialValues.get("White Spider Meat").price = null', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(document.querySelector("#cooking-recipes").children[0].children[0].textContent,
    "No recipes have a positive profit at the selected costs.");

  const firstAid = document.querySelector("#first-aid-profitable-only");
  assert.equal(firstAid.checked, true);
  vm.runInContext('materialValues.get("Wool Cloth").price = 20', context);
  firstAid.checked = true;
  firstAid.listeners.change();
  assert.ok(names("#first-aid-recipes").includes("Wool Bandage"));
  assert.ok(!names("#first-aid-recipes").includes("Healing Potion"));
  cooking.checked = false;
  cooking.listeners.change();
  assert.ok(names("#cooking-recipes").includes("Crispy Lizard Tail"));
  assert.ok(leather.checked && firstAid.checked);
});

test("each material comparison filters positive current profits and keeps its selection on updates", () => {
  const { context, document } = page();
  const materialRow = name => document.querySelector("#materials-reference").children.find(row =>
    row.children[0].textContent === name);
  const details = () => materialRow("Wool Cloth").children[1].children[4].children[4];
  const body = () => details().children[2].children[0].children[1];
  const filter = () => details().children[1].children[0].children[0];
  vm.runInContext('materialValues.get("Wool Cloth").price = 20', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  filter().checked = true;
  filter().listeners.change();
  assert.equal(body().children.length, 2);
  assert.equal(details().children[0].textContent, "Compare 2 profitable recipes");
  assert.equal(materialRow("Light Leather").children[1].children[4].children[4].children[1].children[0].children[0].checked, true);

  vm.runInContext('materialValues.get("Wool Cloth").price = 28', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(filter().checked, true);
  assert.equal(body().children.length, 1);
  assert.equal(body().children[0].children[0].children[0].textContent, "Heavy Wool Bandage");
  assert.equal(details().children[0].textContent, "Compare 1 profitable recipe");
  vm.runInContext('materialValues.get("Wool Cloth").price = 29', context);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(body().children[0].children[0].textContent,
    "No recipes have a positive profit at the selected costs.");
  filter().checked = false;
  filter().listeners.change();
  assert.equal(body().children.length, 3);
  document.dispatchEvent({ type: "materialvalueschange" });
  assert.equal(filter().checked, false);
  assert.equal(body().children.length, 3);
});

test('material profit filters distinguish crafting savings from resale and respond to price updates', () => {
  const { context, document } = page({ materials: {
    'Cured Medium Hide': {auctionCopper:390,quantity:100,status:'available'},
    Salt: {vendorCopper:50},
  }});
  document.querySelector('#material-profit-search').value = '';
  document.querySelector('#material-profit-opportunities-only').checked = true;
  vm.runInContext('materialValues.get("Medium Hide").price = 330', context);
  vm.runInContext(readFileSync(join(__dirname, '../professions/material-profit.js'), 'utf8'), context);
  const body = document.querySelector('#material-profit-rows');
  const hide = () => body.children.find(row => row.children[0].children[0]?.textContent === 'Cured Medium Hide');
  assert.equal(hide().children[2].children[2].children[1].textContent, '10c');
  assert.match(hide().children[0].children[2].textContent, /Best recipe to vendor: Hillman's Shoulders/);
  assert.equal(hide().children[2].children[3].children[1].textContent, '−9c');
  assert.equal(hide().children[2].children[3].children[2].textContent, 'AH selling fee (5%): 19c');
  assert.equal(hide().children[2].children[3].children[3].textContent, 'Craft + selling fee: 3s 99c');
  assert.equal(hide().children[2].children[5].children[1].textContent, 'Craft instead of buying');
  vm.runInContext('materialValues.get("Medium Hide").price = 400', context);
  document.dispatchEvent({type:'materialvalueschange'});
  assert.equal(hide(), undefined);
  const filter = document.querySelector('#material-profit-opportunities-only');
  filter.checked = false;
  filter.listeners.change();
  assert.equal(hide().children[2].children[5].children[1].textContent, 'Buy ready-made');
  const search = document.querySelector('#material-profit-search');
  search.value = 'no such material';
  search.listeners.input();
  assert.equal(body.children[0].children[0].textContent, 'No material recipes match your search.');
});
