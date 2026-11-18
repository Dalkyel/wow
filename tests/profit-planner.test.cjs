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
});

test("the planner can sell a crafted ingredient but does not sell existing stock as-is", () => {
  assert.deepEqual(showInventory({ "Ruined Leather Scraps": 3, "Medium Leather": 1 }), [
    "15c profit",
    "Craft 1 × Light Leather",
    "Sell 1 × Light Leather",
    "Other materials cost 0c · Vendor pays 15c",
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
