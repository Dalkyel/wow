const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function element() {
  return {
    children: [],
    setAttribute() {},
    addEventListener() {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    get valueAsNumber() { return Number(this.value); },
  };
}

const result = element();
const context = vm.createContext({
  document: {
    createElement: element,
    querySelector: selector => selector === "#result" ? result : element(),
  },
});
for (const script of ["known-recipes-data.js", "profit.js"]) {
  vm.runInContext(readFileSync(join(__dirname, "../professions", script), "utf8"), context);
}

function showInventory(stock) {
  context.stock = stock;
  vm.runInContext(`
    inputs.forEach((input, i) => input.value = String(stock[inventoryMaterials[i]] ?? 0));
    showPlan();
  `, context);
  return [
    result.children[0].textContent,
    ...result.children[1].children.map(li => li.textContent),
    result.children.at(-1).textContent,
  ];
}

test("the vendor plan uses leather made from scraps, then sells only the surplus", () => {
  assert.deepEqual(showInventory({ "Ruined Leather Scraps": 108 }), [
    "7s 99c profit",
    "Craft 36 × Light Leather",
    "Craft and sell 7 × Rugged Leather Pants",
    "Sell 1 × Light Leather",
    "Other materials cost 3s 50c · Vendor pays 11s 49c",
  ]);
});

test("the planner can combine two ingredient chains and charge for salt once", () => {
  const [profit, ...lines] = showInventory({ "Ruined Leather Scraps": 48, "Medium Hide": 1 });
  assert.equal(profit, "5s 9c profit");
  const sale = lines.indexOf("Craft and sell 1 × Hillman's Shoulders");
  assert.ok(sale >= 3);
  assert.ok(lines.slice(0, sale).includes("Craft 1 × Cured Medium Hide"));
  const lightLeather = lines.indexOf("Craft 16 × Light Leather");
  const mediumLeather = lines.indexOf("Craft 4 × Medium Leather");
  assert.ok(lightLeather >= 0 && lightLeather < mediumLeather && mediumLeather < sale);
  assert.equal(lines.at(-1), "Other materials cost 1s 50c · Vendor pays 6s 59c");
  assert.deepEqual(result.children[3].children[1].children.map(item => item.textContent), [
    "1 × Fine Thread · 1s 0c",
    "1 × Salt · 50c",
  ]);
});

test("the planner can sell a crafted ingredient but does not sell existing stock as-is", () => {
  assert.deepEqual(showInventory({ "Ruined Leather Scraps": 3, "Medium Leather": 1 }), [
    "15c profit",
    "Craft 1 × Light Leather",
    "Sell 1 × Light Leather",
    "Other materials cost 0c · Vendor pays 15c",
  ]);
  assert.equal(result.children[3].children[1].textContent, "No purchases needed.");
});

test("the shopping list combines thread across different crafts", () => {
  showInventory({ "Ruined Leather Scraps": 239 });
  assert.deepEqual(result.children[3].children[1].children.map(item => item.textContent), [
    "75 × Coarse Thread · 7s 50c",
  ]);
});

test("owned leather still works without a conversion step", () => {
  assert.deepEqual(showInventory({ "Light Leather": 40 }), [
    "8s 96c profit",
    "Craft and sell 8 × Rugged Leather Pants",
    "Other materials cost 4s 0c · Vendor pays 12s 96c",
  ]);
});

test("a large scrap count still resolves quickly, by skipping unreachable conversions like Fine Leather Belt", () => {
  const start = Date.now();
  const [profit] = showInventory({ "Ruined Leather Scraps": 300 });
  assert.ok(Date.now() - start < 1000, "bestPlan should not need to branch over unreachable conversions");
  assert.equal(profit, "22s 40c profit");
});

test("51 Strider Stew crafts match the observed 918c vendor payout", () => {
  const plan = JSON.parse(vm.runInContext(`JSON.stringify(bestPlan(
    [51, 0],
    cookingRecipes.filter(recipe => recipe.recipeId === "cooking:strider-stew"),
    ["Strider Meat", "Shiny Red Apple"]
  ))`, context));
  assert.equal(plan.steps.reduce((total, step) => total + step.count * step.recipe.unitsPerCraft, 0), 51);
  assert.equal(plan.cost, 255);
  assert.equal(plan.profit + plan.cost, 918);
  assert.equal(plan.profit, 663);
  assert.deepEqual(plan.remaining, [0, 0]);
});

test("owned apples remove the purchase cost from the same Strider Stew batch", () => {
  const plan = JSON.parse(vm.runInContext(`JSON.stringify(bestPlan(
    [51, 51],
    cookingRecipes.filter(recipe => recipe.recipeId === "cooking:strider-stew"),
    ["Strider Meat", "Shiny Red Apple"]
  ))`, context));
  assert.equal(plan.cost, 0);
  assert.equal(plan.profit, 918);
  assert.deepEqual(plan.remaining, [0, 0]);
});

test("999 Light Leather resolves without repeating the sale search for each conversion", () => {
  const profit = vm.runInContext(`bestPlan(inventoryMaterials.map(name =>
    name === "Light Leather" ? 999 : 0)).profit`, context, { timeout: 2000 });
  assert.equal(profit, 22358);
});

test("300 Light Leather and 300 Cured Light Hide produce a complete plan promptly", () => {
  const plan = JSON.parse(vm.runInContext(`JSON.stringify(bestPlan(inventoryMaterials.map(name =>
    ["Light Leather", "Cured Light Hide"].includes(name) ? 300 : 0)))`, context, { timeout: 2000 }));
  assert.equal(plan.profit, 21050);
  assert.equal(plan.cost, 2000);
  assert.equal(plan.profit + plan.cost, 23050);
  assert.deepEqual(plan.steps.map(step => [step.recipe.name, step.count]), [["Fine Leather Tunic", 50]]);
  const materials = JSON.parse(vm.runInContext("JSON.stringify(inventoryMaterials)", context));
  assert.equal(plan.remaining[materials.indexOf("Light Leather")], 0);
  assert.equal(plan.remaining[materials.indexOf("Cured Light Hide")], 150);
});

test("inventory state reuse and abundant-material removal match exhaustive small plans", () => {
  const candidates = [
    { needed: [6, 3], profit: 421, cost: 40 },
    { needed: [5, 0], profit: 112, cost: 50 },
    { needed: [4, 1], profit: 161, cost: 20 },
    { needed: [10, 1], profit: 499, cost: 100 },
  ].map((craft, index) => ({ ...craft, recipe: { recipeId: String(index) } }));
  context.saleCandidates = candidates;
  vm.runInContext("var sharedSaleMemo = new Map()", context);
  for (let leather = 0; leather <= 20; leather++) {
    for (let hides = 0; hides <= 10; hides++) {
      let expected = 0;
      for (let tunics = 0; tunics * 6 <= leather; tunics++) {
        for (let gloves = 0; tunics * 6 + gloves * 4 <= leather; gloves++) {
          for (let pants = 0; tunics * 6 + gloves * 4 + pants * 10 <= leather; pants++) {
            if (tunics * 3 + gloves + pants > hides) continue;
            const rugged = Math.floor((leather - tunics * 6 - gloves * 4 - pants * 10) / 5);
            expected = Math.max(expected, tunics * 421 + gloves * 161 + pants * 499 + rugged * 112);
          }
        }
      }
      context.saleInventory = [leather, hides];
      const plan = JSON.parse(vm.runInContext(
        "JSON.stringify(directSales(saleCandidates, saleInventory, sharedSaleMemo))", context));
      assert.equal(plan.profit, expected, `${leather} leather, ${hides} hides`);
      assert.ok(plan.remaining.every(quantity => quantity >= 0));
    }
  }
});

test("three-digit quantities work in every material field", () => {
  vm.runInContext(`
    for (const recipes of [knownRecipes, cookingRecipes, firstAidRecipes]) {
      const materials = recipes === knownRecipes ? inventoryMaterials
        : [...new Set(recipes.flatMap(recipe => recipe.stockMaterials))].sort();
      for (let index = 0; index < materials.length; index++) {
        const inventory = materials.map((_, i) => i === index ? 100 : 0);
        const plan = bestPlan(inventory, recipes, materials);
        if (!Number.isFinite(plan.profit) || plan.remaining.some(quantity => quantity < 0)) {
          throw new Error("Invalid plan for " + materials[index]);
        }
      }
    }
  `, context, { timeout: 3000 });
});

test("background plans debounce typing, cancel obsolete work, and run without DOM access", () => {
  const timers = new Map();
  const sources = new Map();
  const workers = [];
  let nextId = 0;
  class PlannerWorker {
    constructor(url) { this.source = sources.get(url); workers.push(this); }
    postMessage(data) { this.data = data; }
    terminate() { this.terminated = true; }
  }
  const background = vm.createContext({
    document: { createElement: element, querySelector: element },
    Worker: PlannerWorker,
    Blob: class { constructor(parts) { this.source = parts.join(""); } },
    URL: {
      createObjectURL(blob) { const url = String(++nextId); sources.set(url, blob.source); return url; },
      revokeObjectURL(url) { sources.delete(url); },
    },
    setTimeout(callback) { const id = ++nextId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    output: element(),
    fields: [{ valueAsNumber: 100, setAttribute() {} }],
  });
  for (const script of ["known-recipes-data.js", "profit.js"]) {
    vm.runInContext(readFileSync(join(__dirname, "../professions", script), "utf8"), background);
  }
  timers.clear();
  vm.runInContext(`fields = inventoryMaterials.map(name => ({
      valueAsNumber: name === "Light Leather" ? 100 : 0, setAttribute() {}
    }));
    const update = createPlanUpdater(output, knownRecipes, inventoryMaterials);
    update(fields); fields[0].valueAsNumber = 999; update(fields);`, background);
  assert.equal(timers.size, 1);
  assert.equal(workers.length, 0);
  [...timers.values()][0]();
  timers.clear();
  const first = workers[0];
  assert.equal(first.data.inventory[0], 999);

  background.materialUnitCost = name => name === "Cured Light Hide" ? 172 : 0;
  vm.runInContext(`fields.forEach((field, i) => field.valueAsNumber =
    ["Light Leather", "Cured Light Hide"].includes(inventoryMaterials[i]) ? 300 : 0);
    update(fields);`, background);
  assert.equal(first.terminated, true);
  first.onmessage({ data: { profit: 999999 } });
  assert.equal(background.output.textContent, "Calculating the best vendor plan…");
  [...timers.values()][0]();
  const current = workers[1];
  let answer;
  const workerGlobal = { postMessage(data) { answer = data; } };
  const workerContext = vm.createContext({ self: workerGlobal });
  vm.runInContext(current.source, workerContext, { timeout: 2000 });
  workerGlobal.onmessage({ data: current.data });
  current.onmessage({ data: answer });
  assert.equal(background.output.children[0].textContent, "98s 10c profit");
  assert.equal(current.terminated, true);
  assert.equal(sources.size, 0);
});
