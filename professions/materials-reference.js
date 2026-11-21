const materialReference = document.querySelector("#materials-reference");
const materialSearch = document.querySelector("#material-search");
const openMaterialComparisons = new Set();
const unfilteredMaterialComparisons = new Set();

function requiredMaterialQuantity(recipe, target, chain = new Set()) {
  if (chain.has(recipe.name)) return 0;
  const visited = new Set([...chain, recipe.name]);
  return recipe.materials.reduce((sum, [name, quantity]) => {
    if (name === target) return sum + quantity;
    const supplier = materialSuppliers.get(name);
    return sum + (supplier && materialValues.get(name)?.source === "crafted"
      ? quantity * requiredMaterialQuantity(supplier, target, visited) / supplier.unitsPerCraft : 0);
  }, 0);
}

function appendRecipeComparison(cell, name, comparisons) {
  if (!comparisons.length) return;
  const details = document.createElement("details");
  details.className = "material-comparison";
  details.open = openMaterialComparisons.has(name);
  details.addEventListener("toggle", () => {
    if (details.open) openMaterialComparisons.add(name);
    else openMaterialComparisons.delete(name);
  });
  const summary = document.createElement("summary");
  const cost = document.createElement("p");
  const unitCost = materialUnitCost(name);
  cost.textContent = `Selected material cost ${formatPrice(unitCost)} each (${materialValues.get(name).source}).`;
  const filterLabel = document.createElement("label");
  filterLabel.className = "recipe-filter comparison-filter";
  const profitableOnly = document.createElement("input");
  profitableOnly.type = "checkbox";
  profitableOnly.checked = !unfilteredMaterialComparisons.has(name);
  const filterText = document.createElement("span");
  filterText.textContent = "Profitable only";
  filterLabel.append(profitableOnly, filterText);
  cost.append(filterLabel);
  const scroll = document.createElement("div");
  scroll.className = "comparison-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", `${name} recipe comparison`);
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headings = document.createElement("tr");
  for (const text of ["Recipe", "This recipe’s ceiling / item", "Profit / craft", "Combined purchase budget"]) {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.textContent = text;
    headings.append(heading);
  }
  head.append(headings);
  const body = document.createElement("tbody");
  function renderComparisons() {
    body.replaceChildren();
    const visible = comparisons.map(comparison => ({ ...comparison,
      profit: comparison.limit && unitCost !== null
        ? comparison.limit.payout - comparison.limit.otherCost - comparison.quantity * unitCost : null,
    })).filter(comparison => !profitableOnly.checked || comparison.profit > 0);
    summary.textContent = `Compare ${visible.length}${profitableOnly.checked ? " profitable" : ""} ${visible.length === 1 ? "recipe" : "recipes"}`;
    for (const { recipe, limit, quantity, profit } of visible) {
      const row = body.insertRow();
      const title = document.createElement("th");
      title.scope = "row";
      const label = document.createElement(recipe.sourceUrl ? "a" : "span");
      label.textContent = recipe.name;
      if (recipe.sourceUrl) label.href = recipe.sourceUrl;
      const amount = document.createElement("small");
      amount.textContent = `${quantity} × material per craft`;
      title.append(label, amount);
      row.append(title);
      const maximum = row.insertCell();
      maximum.textContent = "Unknown";
      if (limit) maximum.textContent = limit.maximum >= 0 ? coins(limit.maximum) : "None";
      if (recipe.vendorCopper === 0) maximum.textContent = "Can't vendor";
      const profitCell = row.insertCell();
      profitCell.textContent = formatPrice(profit);
      if (profit !== null) {
        const perMaterial = document.createElement("small");
        const unitProfit = profit / quantity;
        perMaterial.textContent = `${Number.isInteger(unitProfit) ? coins(unitProfit) : `${unitProfit.toFixed(2)}c`} / material`;
        profitCell.append(perMaterial);
        if (profit < 0) profitCell.className = "comparison-loss";
      }
      const budgetCell = row.insertCell();
      budgetCell.className = "combined-buy-budget";
      const payout = recipe.vendorCopper == null ? null : recipe.vendorCopper * recipe.unitsPerCraft;
      const ceiling = payout > 0 ? Math.ceil(payout) - 1 : null;
      const total = priceMaterials(recipe).reduce((sum, material) =>
        sum === null || material.cost === null ? null : sum + material.cost, 0);
      const budget = document.createElement("span");
      budget.textContent = ceiling === null ? "No vendor budget" : `All purchases ≤ ${coins(ceiling)} / craft`;
      budgetCell.append(budget);
      const selected = document.createElement("small");
      selected.textContent = `Selected total ${formatPrice(total)} · Vendor pays ${formatPrice(payout)}`;
      budgetCell.append(selected);
      const margin = document.createElement("small");
      const remaining = ceiling === null || total === null ? null : ceiling - total;
      margin.textContent = remaining === null ? "Budget remaining unknown"
        : remaining < 0 ? `${coins(-remaining)} over budget` : `${coins(remaining)} shared budget remaining`;
      budgetCell.append(margin);
      const purchases = new Map();
      function collect(item, quantity, chain = new Set()) {
        const setting = materialValues.get(item);
        if (setting?.source === "gathered") return;
        const supplier = materialSuppliers.get(item);
        if (setting?.source === "crafted" && supplier && !chain.has(item)) {
          supplier.materials.forEach(([ingredient, amount]) =>
            collect(ingredient, quantity * amount / supplier.unitsPerCraft, new Set([...chain, item])));
        } else {
          purchases.set(item, (purchases.get(item) ?? 0) + quantity);
        }
      }
      recipe.materials.forEach(([item, quantity]) => collect(item, quantity));
      for (const [item, quantity] of purchases) {
        const material = document.createElement("small");
        material.textContent = `${quantity} × ${item} at ${formatPrice(materialUnitCost(item))} each`;
        const source = materialSourceLabel(item);
        if (source === "vendor" || source === "manual purchase") material.textContent += ` (${source})`;
        budgetCell.append(material);
      }
      if (!purchases.size) {
        const none = document.createElement("small");
        none.textContent = "All materials gathered";
        budgetCell.append(none);
      }
      budgetCell.title = "One shared budget for all bought ingredients, including ingredients used to craft materials. " +
        "Individual maximum buy prices cannot be combined. Uses your selected purchase prices, including bought inventory.";
    }
    if (!visible.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 4;
      cell.textContent = "No recipes have a positive profit at the selected costs.";
    }
  }
  profitableOnly.addEventListener("change", () => {
    if (profitableOnly.checked) unfilteredMaterialComparisons.delete(name);
    else unfilteredMaterialComparisons.add(name);
    renderComparisons();
  });
  renderComparisons();
  table.append(head, body);
  scroll.append(table);
  details.append(summary, cost, scroll);
  cell.append(details);
}

function renderMaterialReference() {
  const query = (materialSearch.value ?? "").trim().toLocaleLowerCase();
  const names = [...materialValues.keys()].sort((a, b) => a.localeCompare(b))
    .filter(name => name.toLocaleLowerCase().includes(query));
  materialReference.replaceChildren();
  for (const name of names) {
    const quote = auctionQuotes[name];
    const comparisons = allKnownRecipes.map(recipe => {
      const limit = recipePurchaseLimit(recipe, name);
      return { recipe, limit, quantity: limit?.quantity ?? requiredMaterialQuantity(recipe, name) };
    }).filter(comparison => comparison.quantity > 0)
      .sort((a, b) => (b.limit?.maximum ?? -Infinity) - (a.limit?.maximum ?? -Infinity) ||
        (b.limit?.breakEven ?? -Infinity) - (a.limit?.breakEven ?? -Infinity) || a.recipe.name.localeCompare(b.recipe.name));
    const { limits, count, highest: best, lowest } = materialPurchaseRange(name);
    const row = materialReference.insertRow();
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = name;
    const bestBuy = bestMaterialPurchase(name);
    const recommendation = document.createElement("small");
    recommendation.className = "material-best-buy";
    recommendation.textContent = `Best buy: ${bestBuy.source} ${formatPrice(bestBuy.price)} each`;
    label.append(recommendation);
    row.append(label);
    row.insertCell().textContent = formatPrice(quote?.vendorCopper ?? null);
    const auction = row.insertCell();
    if (quote?.auctionCopper != null) {
      const source = document.createElement("a");
      source.href = quote.sourceUrl;
      source.textContent = coins(quote.auctionCopper);
      source.title = auctionQuoteLabel(quote);
      auction.append(source);
      const provenance = document.createElement("small");
      provenance.textContent = "AH snapshot";
      auction.append(provenance);
    } else {
      auction.textContent = quote?.status === "unlisted" ? "Not listed" : "Unknown";
    }
    const maximum = row.insertCell();
    if (!best) maximum.className = "material-price-unavailable";
    maximum.textContent = materialMaximumBuyLabel(name);
    if (best && lowest.maximum !== best.maximum) {
      const range = document.createElement("small");
      range.textContent = `Recipe ceilings ${coins(lowest.maximum)} – ${coins(best.maximum)}`;
      maximum.append(range);
    }
    maximum.title = best ? `Recipe purchase ceilings, not a minimum purchase price. ` +
      `At ${coins(lowest.maximum)} or less, all ${count} recipes with a nonnegative ceiling can profit. ` +
      `The highest ceiling is ${coins(best.maximum)} with ${best.recipe.name}. ` +
      "Other selected costs stay fixed; unknown limits and recipes that cannot profit even with a free material are excluded."
      : limits.length ? "Other ingredient costs leave no profit even if this material is free" : "Other material prices are missing";
    const recipe = row.insertCell();
    if (best) {
      const link = document.createElement(best.recipe.sourceUrl ? "a" : "span");
      link.textContent = best.recipe.name;
      if (best.recipe.sourceUrl) link.href = best.recipe.sourceUrl;
      recipe.append(link);
    } else {
      recipe.textContent = "—";
    }
    appendRecipeComparison(recipe, name, comparisons);
  }
  if (!names.length) {
    const cell = materialReference.insertRow().insertCell();
    cell.colSpan = 5;
    cell.textContent = "No materials match your search.";
  }
}

materialSearch.addEventListener("input", renderMaterialReference);
document.addEventListener("materialvalueschange", renderMaterialReference);
renderMaterialReference();
