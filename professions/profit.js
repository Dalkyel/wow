const craftedOutputs = new Set(knownRecipes.map(recipe => recipe.name));
const inventoryMaterials = [...new Set(knownRecipes.flatMap(recipe =>
  recipe.materials.map(([name]) => name).filter(name =>
    craftedOutputs.has(name) || /\b(?:Leather|Hide|Leather Scraps)$/i.test(name)),
))].sort((a, b) => a === "Light Leather" ? -1 : b === "Light Leather" ? 1 : a.localeCompare(b));

function maxCrafts(needed, inventory) {
  return Math.min(...needed.flatMap((quantity, i) =>
    quantity ? [Math.floor(inventory[i] / quantity)] : []));
}

function bestPlan(inventory) {
  const candidates = knownRecipes.flatMap(recipe => {
    const needed = inventoryMaterials.map(name =>
      recipe.materials.reduce((total, [material, quantity]) => total + (name === material ? quantity : 0), 0));
    const purchases = recipe.materials.filter(([name]) => !inventoryMaterials.includes(name));
    if (!needed.some(Boolean) || purchases.some(([, , price]) => price === null)) return [];
    const cost = purchases.reduce((total, [, quantity, price]) => total + quantity * price, 0);
    const output = inventoryMaterials.indexOf(recipe.name);
    const profit = recipe.vendorCopper === null ? 0 : recipe.vendorCopper * recipe.unitsPerCraft - cost;
    return [{ recipe, needed, cost, profit, output }];
  });

  // A material is reachable if it's owned, or every input of some recipe making it is reachable.
  const reachable = new Set(inventoryMaterials.filter((name, i) => inventory[i] > 0));
  for (let grown = true; grown; ) {
    grown = false;
    for (const craft of candidates) {
      if (craft.output < 0 || reachable.has(craft.recipe.name)) continue;
      if (craft.needed.every((quantity, i) => !quantity || reachable.has(inventoryMaterials[i]))) {
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
      const runs = other => other.needed.every((quantity, i) => !quantity || reachable.has(inventoryMaterials[i]));
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
  const exclusive = conversions.map(craft => craft.recipe.vendorCopper > 0 && craft.profit >= 0 &&
    !conversions.some(other => craft.needed[other.output]) &&
    candidates.every(other => other === craft || !other.needed.some((n, i) => n && craft.needed[i])));
  function convert(index, stock, produced, cost, steps) {
    if (index === conversions.length) {
      const plan = directSales(sell, [...stock, ...produced]);
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
    const { recipe, needed, output, cost: unitCost } = conversions[index];
    const max = maxCrafts(needed, stock);
    // If nothing else uses these ingredients and the output sells at a profit
    // or breaks even, converting all of them preserves every profitable option.
    const min = exclusive[index] ? max : 0;
    for (let count = max; count >= min; count--) {
      const units = count * recipe.unitsPerCraft;
      const nextStock = stock.map((quantity, i) => quantity - needed[i] * count);
      const nextProduced = produced.slice();
      nextStock[output] += units;
      nextProduced[output] += units;
      convert(index + 1, nextStock, nextProduced, cost + unitCost * count,
        count ? [...steps, { recipe, count, action: "Craft" }] : steps);
    }
  }

  convert(0, inventory, inventory.map(() => 0), 0, []);
  return best;
}

function directSales(candidates, inventory) {
  // Recipes that consume the same inventory compete on profit alone.
  const bestByMaterials = new Map();
  for (const craft of candidates) {
    if (maxCrafts(craft.needed, inventory) === 0) continue;
    const key = craft.needed.join(",");
    if (craft.profit > (bestByMaterials.get(key)?.profit ?? 0)) bestByMaterials.set(key, craft);
  }
  // Direct sales consume one item. The extra requirement tracks crafted stock.
  const profitPerMaterial = craft => craft.saleOnly
    ? craft.profit
    : craft.profit / craft.needed.reduce((sum, n) => sum + n, 0);
  const crafts = [...bestByMaterials.values()].sort((a, b) =>
    profitPerMaterial(b) - profitPerMaterial(a) || Number(!!b.saleOnly) - Number(!!a.saleOnly));

  const lastUse = inventory.map((_, i) => crafts.reduce((last, craft, j) => craft.needed[i] ? j : last, -1));
  const memo = new Map();
  function solve(index, remaining) {
    if (index === crafts.length) return { profit: 0, cost: 0, counts: [] };
    const key = [index, ...remaining.filter((_, i) => lastUse[i] >= index)].join(",");
    if (memo.has(key)) return memo.get(key);
    const craft = crafts[index];
    const max = maxCrafts(craft.needed, remaining);
    let best = { profit: -1 };
    // With only one recipe left, crafting the maximum always earns the most.
    const min = index === crafts.length - 1 ? max : 0;
    const later = crafts.slice(index + 1);
    const bounds = craft.needed.flatMap((quantity, i) => {
      if (!quantity || !later.length || !later.every(next => next.needed[i])) return [];
      const rate = Math.max(...later.map(next => next.profit / next.needed[i]));
      return [{ i, rate, falls: craft.profit >= quantity * rate }];
    });
    for (let count = max; count >= min; count--) {
      const leftover = remaining.map((quantity, i) => quantity - count * craft.needed[i]);
      // Even fractional crafts cannot beat this estimate of the remaining profit.
      if (bounds.some(({ i, rate, falls }) =>
        falls && Math.ceil(count * craft.profit + leftover[i] * rate) <= best.profit)) break;
      const rest = solve(index + 1, leftover);
      const profit = count * craft.profit + rest.profit;
      if (profit > best.profit) {
        best = { profit, cost: count * craft.cost + rest.cost, counts: [count, ...rest.counts] };
      }
    }
    memo.set(key, best);
    return best;
  }

  const plan = solve(0, inventory);
  return {
    profit: plan.profit,
    cost: plan.cost,
    remaining: inventory.map((quantity, i) =>
      crafts.reduce((left, craft, j) => left - craft.needed[i] * plan.counts[j], quantity)),
    steps: crafts.flatMap(({ recipe, saleOnly }, i) => plan.counts[i]
      ? [{ recipe, count: plan.counts[i], action: saleOnly ? "Sell" : "Craft and sell" }]
      : []),
  };
}

function coins(copper) {
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor(copper / 100) % 100;
  return [gold && `${gold.toLocaleString()}g`, silver && `${silver}s`, `${copper % 100}c`]
    .filter(Boolean).join(" ");
}

const inventoryFields = document.querySelector("#inventory-fields");
const result = document.querySelector("#result");
const inputs = inventoryMaterials.map((name, index) => {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.id = `inventory-${index}`;
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.value = name === "Light Leather" ? "20" : "0";
  input.setAttribute("aria-describedby", "cost-assumption");
  input.addEventListener("input", showPlan);
  label.htmlFor = input.id;
  label.textContent = name;
  inventoryFields.append(label, input);
  return input;
});

function showPlan() {
  const inventory = inputs.map(input => input.valueAsNumber);
  const invalid = inventory.map(quantity => !Number.isSafeInteger(quantity) || quantity < 0);
  inputs.forEach((input, i) => input.setAttribute("aria-invalid", String(invalid[i])));
  if (invalid.some(Boolean)) {
    result.textContent = "Enter a nonnegative whole number for each material.";
    return;
  }

  const plan = bestPlan(inventory);
  if (!plan.profit) {
    result.textContent = "This inventory cannot make a profitable recipe at the listed prices.";
    return;
  }

  const profit = document.createElement("strong");
  profit.textContent = `${coins(plan.profit)} profit`;
  const crafts = document.createElement("ol");
  for (const { recipe, count, action } of plan.steps) {
    const item = document.createElement("li");
    item.textContent = `${action} ${count.toLocaleString()} × ${recipe.name}`;
    crafts.append(item);
  }

  const used = document.createElement("p");
  used.textContent = inventoryMaterials.flatMap((name, i) => {
    const left = plan.remaining[i];
    if (!inventory[i] && !left) return [];
    const spent = inventory[i] - left;
    return [`${name}: ${spent > 0 ? `${spent.toLocaleString()} used, ` : ""}${left.toLocaleString()} left`];
  }).join(" · ");
  const sale = document.createElement("p");
  sale.textContent = `Other materials cost ${coins(plan.cost)} · Vendor pays ${coins(plan.profit + plan.cost)}`;
  result.replaceChildren(profit, crafts, used, sale);
}

showPlan();
