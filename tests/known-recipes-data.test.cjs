const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const context = vm.createContext({});
vm.runInContext(readFileSync(join(__dirname, "../professions/known-recipes-data.js"), "utf8"), context);
const knownRecipes = JSON.parse(vm.runInContext("JSON.stringify(knownRecipes)", context));

test("every material has one recorded price across all known recipes", () => {
  const prices = new Map();
  for (const recipe of knownRecipes) {
    for (const [name, , price] of recipe.materials) {
      if (!prices.has(name)) prices.set(name, new Map());
      prices.get(name).set(price, [...(prices.get(name).get(price) ?? []), recipe.name]);
    }
  }
  const inconsistent = [...prices].filter(([, byPrice]) => byPrice.size > 1);
  assert.deepEqual(inconsistent, [], inconsistent.map(([name, byPrice]) =>
    `${name}: ${[...byPrice].map(([price, recipes]) => `${price}c in ${recipes.join(", ")}`).join(" vs. ")}`).join("\n"));
});

test("every recipe id is unique", () => {
  const ids = knownRecipes.map(recipe => recipe.recipeId);
  assert.deepEqual(ids, [...new Set(ids)]);
});