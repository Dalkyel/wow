const craftedOutputs = new Set(knownRecipes.map(recipe => recipe.name));
const inventoryMaterials = [...new Set(knownRecipes.flatMap(recipe =>
  recipe.materials.map(([name]) => name).filter(name =>
    craftedOutputs.has(name) || /\b(?:Leather|Hide|Leather Scraps)$/i.test(name)),
))].sort((a, b) => a === "Light Leather" ? -1 : b === "Light Leather" ? 1 : a.localeCompare(b));

function maxCrafts(needed, inventory) {
  return Math.min(...needed.flatMap((quantity, i) =>
    quantity ? [Math.floor(inventory[i] / quantity)] : []));
}

function bestPlan(inventory, recipes = knownRecipes, materials = inventoryMaterials, ownedUnitCosts = {}) {
  const unitCosts = materials.map(name => ownedUnitCosts[name] ?? 0);
  // When owned supplies cover every possible craft, buying that supply cannot help.
  const suppliedOutputs = new Set(recipes.map(recipe => recipe.name));
  const sufficientStock = new Set(materials.filter((name, index) => {
    const demand = recipes.reduce((total, recipe) => {
      const ingredient = recipe.materials.find(([item]) => item === name);
      if (!ingredient) return total;
      const required = recipe.materials.filter(([item]) =>
        materials.includes(item) && !recipe.buyIfMissing?.includes(item));
      if (!required.length || required.some(([item]) => suppliedOutputs.has(item))) return Infinity;
      const batches = Math.min(...required.map(([item, quantity]) =>
        Math.floor(inventory[materials.indexOf(item)] / quantity)));
      return total + batches * ingredient[1];
    }, 0);
    return inventory[index] >= demand;
  }));
  const candidates = recipes.flatMap(recipe => {
    // For ingredients you can buy or own, compare all ways to fill one craft.
    const sources = recipe.materials.reduce((options, [name, quantity, price]) => {
      const index = materials.indexOf(name);
      if (index === -1) return options.map(option => ({
        ...option, purchases: [...option.purchases, [name, quantity, price]],
      }));
      return options.flatMap(option => {
        const minimum = recipe.buyIfMissing?.includes(name) && price !== null && !sufficientStock.has(name)
          ? 0 : quantity;
        const variants = [];
        for (let owned = minimum; owned <= quantity; owned++) {
          const needed = option.needed.slice();
          needed[index] += owned;
          const purchases = owned === quantity ? option.purchases
            : [...option.purchases, [name, quantity - owned, price]];
          variants.push({ needed, purchases });
        }
        return variants;
      });
    }, [{ needed: materials.map(() => 0), purchases: [] }]);

    return sources.flatMap(({ needed, purchases }) => {
      if (!needed.some(Boolean) || purchases.some(([, , price]) => price === null)) return [];
      const cost = purchases.reduce((total, [, quantity, price]) => total + quantity * price, 0);
      const output = materials.indexOf(recipe.name);
      const profit = recipe.vendorCopper === null ? 0 : recipe.vendorCopper * recipe.unitsPerCraft - cost;
      return [{ recipe, needed, purchases, cost, profit, output }];
    });
  });

  // A material is reachable if it's owned, or every input of some recipe making it is reachable.
  const reachable = new Set(materials.filter((name, i) => inventory[i] > 0));
  for (let grown = true; grown; ) {
    grown = false;
    for (const craft of candidates) {
      if (craft.output < 0 || reachable.has(craft.recipe.name)) continue;
      if (craft.needed.every((quantity, i) => !quantity || reachable.has(materials[i]))) {
        reachable.add(craft.recipe.name);
        grown = true;
      }
    }
  }

  // A crafted ingredient only needs its own craft count explored (as a "conversion") when
  // something reachable and worth making actually consumes it. Otherwise a known recipe that
  // merely happens to double as someone else's ingredient (e.g. Fine Leather Belt, consumed by
  // Dark Leather Belt) is just another sale candidate, and the one-dimensional count search below
  // would otherwise multiply with every other such recipe's count search in the common case where
  // the consumer is currently unreachable (e.g. for lack of a hide nobody owns).
  const worthwhile = new Set();
  for (let grown = true; grown; ) {
    grown = false;
    for (const craft of candidates) {
      if (craft.output < 0 || worthwhile.has(craft)) continue;
      const runs = other => other.needed.every((quantity, i) => !quantity || reachable.has(materials[i]));
      if (candidates.some(other => other !== craft && other.needed[craft.output] > 0 && runs(other) &&
          (other.profit > 0 || (other.output >= 0 && worthwhile.has(other))))) {
        worthwhile.add(craft);
        grown = true;
      }
    }
  }

  // Process ingredient recipes before any conversions that consume their output.
  const pending = candidates.filter(craft => craft.output >= 0 && worthwhile.has(craft));
  const conversions = [];
  while (pending.length) {
    const index = pending.findIndex(craft => !pending.some(other => craft.needed[other.output]));
    if (index < 0) break; // Cyclic recipes still qualify for direct sales.
    conversions.push(pending.splice(index, 1)[0]);
  }

  const size = inventory.length;
  const sell = candidates.filter(craft => craft.profit > 0 && !conversions.includes(craft))
    .map(craft => ({ ...craft, needed: [...craft.needed, ...inventory.map(() => 0)] }));
  for (const { recipe, output } of conversions) {
    if (!(recipe.vendorCopper > 0)) continue;
    // A sale needs both remaining stock and a unit crafted during this plan.
    const needed = Array(2 * size).fill(0);
    needed[output] = needed[size + output] = 1;
    sell.push({ recipe, needed, cost: 0, profit: recipe.vendorCopper, saleOnly: true });
  }

  let best = { profit: 0, cost: 0, steps: [], remaining: inventory };
  const salesMemo = new Map();
  const exclusive = conversions.map(craft => !unitCosts.some(Boolean) && craft.recipe.vendorCopper > 0 && craft.profit >= 0 &&
    !conversions.some(other => craft.needed[other.output]) &&
    candidates.every(other => other === craft || !other.needed.some((n, i) => n && craft.needed[i])));
  function convert(index, stock, produced, owned, cost, steps) {
    if (index === conversions.length) {
      const plan = directSales(sell, [...stock, ...produced], salesMemo,
        { unitCosts: [...unitCosts, ...unitCosts.map(() => 0)], owned: [...owned, ...owned.map(() => 0)] });
      if (plan.profit - cost > best.profit) {
        best = {
          profit: plan.profit - cost,
          cost: plan.cost + cost,
          steps: [...steps, ...plan.steps],
          remaining: plan.remaining.slice(0, size),
        };
      }
      return;
    }
    const { recipe, needed, purchases, output, cost: unitCost } = conversions[index];
    const max = maxCrafts(needed, stock);
    // If nothing else uses these ingredients and the output sells at a profit
    // or breaks even, converting all of them preserves every profitable option.
    const min = exclusive[index] ? max : 0;
    for (let count = max; count >= min; count--) {
      const units = count * recipe.unitsPerCraft;
      const nextStock = stock.map((quantity, i) => quantity - needed[i] * count);
      const nextProduced = produced.slice();
      const nextOwned = owned.map((quantity, i) => Math.min(quantity, nextStock[i]));
      const ownedCost = owned.reduce((sum, quantity, i) => sum + (quantity - nextOwned[i]) * unitCosts[i], 0);
      nextStock[output] += units;
      nextProduced[output] += units;
      convert(index + 1, nextStock, nextProduced, nextOwned, cost + unitCost * count + ownedCost,
        count ? [...steps, { recipe, count, purchases, action: "Craft" }] : steps);
    }
  }

  convert(0, inventory, inventory.map(() => 0), inventory, 0, []);
  return best;
}

function directSales(candidates, inventory, memoGroups = new Map(), valuation = {}) {
  const unitCosts = valuation.unitCosts ?? inventory.map(() => 0);
  const owned = valuation.owned ?? inventory.map(() => 0);
  const linearCosts = unitCosts.map((cost, i) => owned[i] >= inventory[i] ? cost : 0);
  const dynamicCosts = unitCosts.map((cost, i) => cost - linearCosts[i]);
  // Recipes that consume the same inventory compete on profit alone.
  const bestByMaterials = new Map();
  for (const candidate of candidates) {
    const ownedCost = candidate.needed.reduce((sum, quantity, i) => sum + quantity * linearCosts[i], 0);
    const craft = { ...candidate, cost: candidate.cost + ownedCost, profit: candidate.profit - ownedCost };
    if (craft.profit <= 0) continue;
    if (maxCrafts(craft.needed, inventory) === 0) continue;
    const key = craft.needed.join(",");
    if (craft.profit > (bestByMaterials.get(key)?.profit ?? 0)) bestByMaterials.set(key, craft);
  }
  // Independent material pools can be solved separately without changing the optimum.
  const groupsByMaterials = [];
  for (const craft of bestByMaterials.values()) {
    const resources = new Set(craft.needed.flatMap((n, i) => n ? [i] : []));
    const connected = groupsByMaterials.filter(group => [...resources].some(i => group.resources.has(i)));
    const group = { resources, crafts: [craft] };
    for (const previous of connected) {
      previous.resources.forEach(i => resources.add(i));
      group.crafts.push(...previous.crafts);
      groupsByMaterials.splice(groupsByMaterials.indexOf(previous), 1);
    }
    groupsByMaterials.push(group);
  }
  if (groupsByMaterials.length > 1) {
    const plans = groupsByMaterials.map(group => directSales(group.crafts, inventory, memoGroups,
      { unitCosts: dynamicCosts, owned }));
    return {
      profit: plans.reduce((sum, plan) => sum + plan.profit, 0),
      cost: plans.reduce((sum, plan) => sum + plan.cost, 0),
      steps: plans.flatMap(plan => plan.steps),
      remaining: inventory.map((quantity, i) =>
        quantity - plans.reduce((used, plan) => used + quantity - plan.remaining[i], 0)),
    };
  }
  // Direct sales consume one item. The extra requirement tracks crafted stock.
  const profitPerMaterial = craft => craft.saleOnly
    ? craft.profit
    : craft.profit / craft.needed.reduce((sum, n) => sum + n, 0);
  const sorted = [...bestByMaterials.values()].sort((a, b) =>
    profitPerMaterial(b) - profitPerMaterial(a) || Number(!!b.saleOnly) - Number(!!a.saleOnly));
  // Keep purchase/owned variants together so private ingredients leave the memo key early.
  const groups = new Map();
  for (const craft of sorted) {
    if (!groups.has(craft.recipe)) groups.set(craft.recipe, []);
    groups.get(craft.recipe).push(craft);
  }
  const crafts = [...groups.values()].flat();

  const active = inventory.flatMap((_, i) => crafts.some(craft => craft.needed[i]) ? [i] : []);
  // An abundant material does not need a search dimension. Bound its total use
  // by the other ingredients each recipe must consume, sharing each bound across recipes.
  for (const index of [...active]) {
    if (dynamicCosts[index]) continue;
    const rates = new Map();
    let bounded = true;
    for (const craft of crafts) {
      if (!craft.needed[index]) continue;
      const alternatives = active.filter(i => i !== index && craft.needed[i]);
      if (!alternatives.length) {
        bounded = false;
        break;
      }
      const limiting = alternatives.reduce((best, i) =>
        inventory[i] / craft.needed[i] < inventory[best] / craft.needed[best] ? i : best);
      rates.set(limiting, Math.max(rates.get(limiting) ?? 0,
        craft.needed[index] / craft.needed[limiting]));
    }
    const demand = [...rates].reduce((sum, [i, rate]) => sum + inventory[i] * rate, 0);
    if (bounded && inventory[index] >= Math.ceil(demand)) active.splice(active.indexOf(index), 1);
  }
  const memoKey = JSON.stringify([active, dynamicCosts, owned.filter((_, i) => dynamicCosts[i]), crafts.map(craft =>
    [craft.recipe.recipeId, craft.needed, craft.profit, craft.cost, !!craft.saleOnly])]);
  if (!memoGroups.has(memoKey)) memoGroups.set(memoKey, new Map());
  const memo = memoGroups.get(memoKey);

  const requirements = crafts.map(craft => active.map(i => craft.needed[i]));
  const initial = active.map(i => inventory[i]);
  const initialKey = initial.join(",");
  // Each inventory state is solved once, independent of the order recipes are tried.
  // Keep one next action per state instead of copying a complete plan into every entry.
  const pending = [{ stock: initial, key: initialKey, index: 0, profit: 0, cost: 0, choice: -1 }];
  while (pending.length) {
    const state = pending.at(-1);
    if (memo.has(state.key)) {
      pending.pop();
      continue;
    }
    if (state.index === crafts.length) {
      memo.set(state.key, { profit: state.profit, cost: state.cost, choice: state.choice });
      pending.pop();
      continue;
    }
    const needed = requirements[state.index];
    if (needed.some((quantity, i) => quantity > state.stock[i])) {
      state.index++;
      continue;
    }
    const leftover = state.stock.map((quantity, i) => quantity - needed[i]);
    const key = leftover.join(",");
    const rest = memo.get(key);
    if (!rest) {
      pending.push({ stock: leftover, key, index: 0, profit: 0, cost: 0, choice: -1 });
      continue;
    }
    const craft = crafts[state.index];
    const ownedCost = active.reduce((sum, index, i) => sum + dynamicCosts[index] *
      (Math.min(state.stock[i], owned[index]) - Math.min(leftover[i], owned[index])), 0);
    const profit = craft.profit - ownedCost + rest.profit;
    if (profit > state.profit) {
      state.profit = profit;
      state.cost = craft.cost + ownedCost + rest.cost;
      state.choice = state.index;
    }
    state.index++;
  }

  const plan = memo.get(initialKey);
  const counts = crafts.map(() => 0);
  let stock = initial;
  for (let choice = plan.choice; choice >= 0; choice = memo.get(stock.join(",")).choice) {
    counts[choice]++;
    stock = stock.map((quantity, i) => quantity - requirements[choice][i]);
  }
  return {
    profit: plan.profit,
    cost: plan.cost,
    remaining: inventory.map((quantity, i) =>
      crafts.reduce((left, craft, j) => left - craft.needed[i] * counts[j], quantity)),
    steps: crafts.flatMap(({ recipe, saleOnly, purchases }, i) => counts[i]
      ? [{ recipe, count: counts[i], purchases, action: saleOnly ? "Sell" : "Craft and sell" }]
      : []),
  };
}

function coins(copper) {
  const sign = copper < 0 ? "−" : "";
  copper = Math.abs(Math.round(copper));
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor(copper / 100) % 100;
  return sign + [gold && `${gold.toLocaleString()}g`, silver && `${silver}s`, `${copper % 100}c`]
    .filter(Boolean).join(" ");
}

function materialsToBuy(steps) {
  const purchases = new Map();
  for (const { purchases: ingredients = [], count } of steps) {
    for (const [name, quantityPerCraft, unitPrice] of ingredients) {
      const quantity = quantityPerCraft * count;
      const purchase = purchases.get(name) ?? { quantity: 0, cost: 0 };
      purchase.quantity += quantity;
      purchase.cost += quantity * unitPrice;
      purchases.set(name, purchase);
    }
  }
  return [...purchases].sort(([a], [b]) => a.localeCompare(b));
}

function recipeProfitBreakdown(plan, inventory, materials, unitCosts = {}) {
  const stock = new Map(materials.map((name, i) =>
    [name, [{ quantity: inventory[i], unitCost: unitCosts[name] ?? 0, crafted: false }]]));
  const sold = new Map();
  function consume(name, quantity) {
    const lots = stock.get(name) ?? [];
    let cost = 0;
    // Crafted stock has already been paid for by earlier steps in this plan.
    lots.sort((a, b) => Number(b.crafted) - Number(a.crafted));
    for (const lot of lots) {
      const used = Math.min(quantity, lot.quantity);
      lot.quantity -= used;
      quantity -= used;
      cost += used * lot.unitCost;
      if (!quantity) break;
    }
    return cost;
  }
  for (const { recipe, count, action, purchases = [] } of plan.steps) {
    const units = action === "Sell" ? count : count * recipe.unitsPerCraft;
    let cost = 0;
    if (action === "Sell") {
      cost = consume(recipe.name, units);
    } else {
      for (const [name, quantity] of recipe.materials) {
        const purchase = purchases.find(([item]) => item === name);
        const bought = (purchase?.[1] ?? 0) * count;
        cost += bought * (purchase?.[2] ?? 0);
        cost += consume(name, quantity * count - bought);
      }
    }
    if (action === "Craft") {
      const lots = stock.get(recipe.name) ?? [];
      lots.push({ quantity: units, unitCost: cost / units, crafted: true });
      stock.set(recipe.name, lots);
      continue;
    }
    const row = sold.get(recipe.recipeId) ?? { recipe, units: 0, cost: 0, proceeds: 0 };
    row.units += units;
    row.cost += cost;
    row.proceeds += units * recipe.vendorCopper;
    sold.set(recipe.recipeId, row);
  }
  return [...sold.values()].map(row => ({ ...row, profit: row.proceeds - row.cost }));
}

function inventoryInputs(fields, materials, prefix, description, onInput) {
  return materials.map((name, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.id = `${prefix}-${index}`;
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.inputMode = "numeric";
    input.value = name === "Light Leather" ? "20" : "0";
    input.setAttribute("aria-describedby", description);
    input.addEventListener("input", onInput);
    label.htmlFor = input.id;
    label.textContent = name;
    fields.append(label, input);
    return input;
  });
}

const result = document.querySelector("#result");
const updateLeatherworkingPlan = createPlanUpdater(result, knownRecipes, inventoryMaterials);
const inputs = inventoryInputs(document.querySelector("#inventory-fields"), inventoryMaterials,
  "inventory", "cost-assumption", () => updateLeatherworkingPlan(inputs));
document.addEventListener?.("materialvalueschange", () => updateLeatherworkingPlan(inputs));

function readInventory(fields, output) {
  const inventory = fields.map(input => input.valueAsNumber);
  const invalid = inventory.map(quantity => !Number.isSafeInteger(quantity) || quantity < 0);
  fields.forEach((input, i) => input.setAttribute("aria-invalid", String(invalid[i])));
  if (invalid.some(Boolean)) {
    output.textContent = "Enter a nonnegative whole number for each material.";
    return null;
  }
  return inventory;
}

function createPlanUpdater(output, recipes, materials) {
  let timer;
  let worker;
  let workerUrl;
  let request = 0;
  return fields => {
    const currentRequest = ++request;
    if (typeof clearTimeout === "function") clearTimeout(timer);
    worker?.terminate();
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    worker = null;
    workerUrl = null;
    const inventory = readInventory(fields, output);
    if (!inventory) return;
    const currentRecipes = typeof recipesAtPurchasePrices === "function" ? recipesAtPurchasePrices(recipes) : recipes;
    const unitCosts = Object.fromEntries(materials.map(name =>
      [name, typeof materialUnitCost === "function" ? materialUnitCost(name) : 0]));
    const missingCost = materials.find((name, i) => inventory[i] > 0 && unitCosts[name] === null);
    if (missingCost) {
      output.textContent = `Enter a purchase price for ${missingCost} or its crafting ingredients.`;
      return;
    }
    if (typeof Worker === "undefined") return showPlan(fields, output, currentRecipes, materials, null, unitCosts);
    output.textContent = "Calculating the best vendor plan…";
    timer = setTimeout(() => {
      const source = `${maxCrafts.toString()}\n${bestPlan.toString()}\n${directSales.toString()}\n` +
        "self.onmessage = ({ data }) => self.postMessage(bestPlan(data.inventory, data.recipes, data.materials, data.unitCosts));";
      const finish = () => {
        worker?.terminate();
        worker = null;
        URL.revokeObjectURL(workerUrl);
        workerUrl = null;
      };
      try {
        // A Blob worker also supports opening this project directly from a local file.
        workerUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
        worker = new Worker(workerUrl);
        worker.onmessage = ({ data }) => {
          if (request !== currentRequest) return;
          finish();
          showPlan(fields, output, currentRecipes, materials, data, unitCosts);
        };
        worker.onerror = () => {
          if (request !== currentRequest) return;
          finish();
          output.textContent = "The calculation failed. Change a quantity to retry.";
        };
        worker.postMessage({ inventory, recipes: currentRecipes, materials, unitCosts });
      } catch {
        finish();
        output.textContent = "The calculation could not start. Change a quantity to retry.";
      }
    }, 150);
  };
}

function showPlan(fields = inputs, output = result, recipes = knownRecipes, materials = inventoryMaterials,
  calculatedPlan = null, unitCosts = {}) {
  const inventory = readInventory(fields, output);
  if (!inventory) return;
  const plan = calculatedPlan ?? bestPlan(inventory, recipes, materials, unitCosts);
  if (!plan.profit) {
    output.textContent = "This inventory cannot make a profitable recipe at the listed prices.";
    return;
  }

  const profit = document.createElement("strong");
  profit.textContent = `${coins(plan.profit)} profit`;
  const crafts = document.createElement("ol");
  const craftSteps = [];
  for (const step of plan.steps) {
    const previous = craftSteps.at(-1);
    if (previous?.recipe === step.recipe && previous.action === step.action) {
      previous.count += step.count;
    } else {
      craftSteps.push({ ...step });
    }
  }
  for (const { recipe, count, action } of craftSteps) {
    const item = document.createElement("li");
    const makes = action !== "Sell" && recipe.unitsPerCraft > 1
      ? ` (makes ${(count * recipe.unitsPerCraft).toLocaleString()})`
      : "";
    item.textContent = `${action} ${count.toLocaleString()} × ${recipe.name}${makes}`;
    crafts.append(item);
  }

  const used = document.createElement("p");
  used.textContent = materials.flatMap((name, i) => {
    const left = plan.remaining[i];
    if (!inventory[i] && !left) return [];
    const spent = inventory[i] - left;
    return [`${name}: ${spent > 0 ? `${spent.toLocaleString()} used, ` : ""}${left.toLocaleString()} left`];
  }).join(" · ");
  const shopping = document.createElement("div");
  shopping.className = "profit-shopping";
  const shoppingTitle = document.createElement("h3");
  shoppingTitle.textContent = "Materials to buy";
  shopping.append(shoppingTitle);
  const purchases = materialsToBuy(plan.steps);
  if (purchases.length) {
    const list = document.createElement("ul");
    for (const [name, { quantity, cost }] of purchases) {
      const item = document.createElement("li");
      item.textContent = `${quantity.toLocaleString()} × ${name} · ${coins(cost)}`;
      list.append(item);
    }
    shopping.append(list);
  } else {
    const message = document.createElement("p");
    message.textContent = "No purchases needed.";
    shopping.append(message);
  }
  const sale = document.createElement("p");
  const purchasesCost = purchases.reduce((sum, [, purchase]) => sum + purchase.cost, 0);
  sale.textContent = unitCosts && Object.values(unitCosts).some(Boolean)
    ? `Material cost ${coins(plan.cost)} (${coins(purchasesCost)} to buy now) · Vendor pays ${coins(plan.profit + plan.cost)}`
    : `Other materials cost ${coins(plan.cost)} · Vendor pays ${coins(plan.profit + plan.cost)}`;
  const breakdown = document.createElement("div");
  breakdown.className = "profit-breakdown";
  const title = document.createElement("h3");
  title.textContent = "Profit by recipe";
  const list = document.createElement("ul");
  for (const row of recipeProfitBreakdown(plan, inventory, materials, unitCosts)) {
    const item = document.createElement("li");
    const batches = row.units / row.recipe.unitsPerCraft;
    item.textContent = `${row.units.toLocaleString()} × ${row.recipe.name} · Materials ${coins(row.cost)} · ` +
      `Vendor pays ${coins(row.proceeds)} · Profit ${coins(row.profit)} ` +
      `(${coins(row.profit / batches)} per craft)`;
    list.append(item);
  }
  breakdown.append(title, list);
  output.replaceChildren(profit, crafts, used, shopping, breakdown, sale);
}

updateLeatherworkingPlan(inputs);

function setupProfessionPlanner(profession, recipes) {
  const fields = document.querySelector(`#${profession}-inventory-fields`);
  if (!fields) return;
  const result = document.querySelector(`#${profession}-result`);
  const materials = [...new Set(recipes.flatMap(recipe => recipe.stockMaterials))].sort();
  const calculatePlan = createPlanUpdater(result, recipes, materials);
  const updatePlan = () => calculatePlan(inputs);
  const inputs = inventoryInputs(fields, materials, `${profession}-inventory`,
    `${profession}-cost-assumption`, updatePlan);
  document.addEventListener?.("materialvalueschange", updatePlan);
  updatePlan();
}

setupProfessionPlanner("cooking", cookingRecipes);
setupProfessionPlanner("first-aid", firstAidRecipes);
