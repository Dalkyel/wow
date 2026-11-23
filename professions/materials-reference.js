const materialReference = document.querySelector("#materials-reference");
const materialSearch = document.querySelector("#material-search");
const openMaterialComparisons = new Set();
const unfilteredMaterialComparisons = new Set();

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

// Renders one profit scenario's block: the whole-copper ceiling, the lowest–highest recipe range
// beneath it, and (for the cascading scenario) the recipe name plus its comparison expand.
function renderScenarioBlock(container, labelText, range, { unavailableTitle, scopeTitle }) {
  const { limits, count, highest: best, lowest } = range;
  const { block, value } = renderInfoBlock(container, labelText);
  value.classList.add("info-value-highlight");
  if (!best) value.classList.add("info-value-unavailable");
  value.textContent = best ? coins(best.maximum) : limits.length ? "None" : "Unknown";
  if (best) {
    const rangeLine = document.createElement("small");
    rangeLine.textContent = lowest.maximum === best.maximum
      ? `Recipe ceiling ${coins(best.maximum)}`
      : `Recipe ceilings ${coins(lowest.maximum)} – ${coins(best.maximum)}`;
    block.append(rangeLine);
    const recipeLine = document.createElement("small");
    const link = document.createElement(best.recipe.sourceUrl ? "a" : "span");
    link.textContent = best.recipe.name;
    if (best.recipe.sourceUrl) link.href = best.recipe.sourceUrl;
    recipeLine.append(link);
    block.append(recipeLine);
  }
  block.title = best
    ? `${scopeTitle} At ${coins(lowest.maximum)} or less, all ${count} recipes in this scenario can profit. ` +
      `The highest ceiling is ${coins(best.maximum)} with ${best.recipe.name}. Other ingredients use their cheapest available cost.`
    : limits.length ? `${unavailableTitle} even if this material is free.` : unavailableTitle;
  return block;
}

function renderMaterialReference() {
  const query = (materialSearch.value ?? "").trim().toLocaleLowerCase();
  const names = [...materialValues.keys()].sort((a, b) => a.localeCompare(b))
    .filter(name => name.toLocaleLowerCase().includes(query));
  materialReference.replaceChildren();
  for (const name of names) {
    const quote = auctionQuotes[name];
    const row = materialReference.insertRow();
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = name;
    const self = selfCraftProfit(name);
    if (self) {
      const note = document.createElement("small");
      note.className = "material-self-craft";
      const outcomes = [];
      if (self.vendorProfit !== null) outcomes.push(`vendor ${formatPrice(self.vendorProfit)} profit`);
      if (self.auctionProfit !== null) outcomes.push(`AH ${formatPrice(self.auctionProfit)} profit after fee`);
      const ingredients = self.recipe.materials.map(([ingredient]) => ingredient).join(" + ");
      note.textContent = `Crafted from ${ingredients} for ${coins(self.cost)}` +
        (outcomes.length ? ` → ${outcomes.join(" · ")}` : "");
      note.title = `${name} can itself be crafted (from its own ingredients at their cheapest available cost), separately from ` +
        "anything made further from it. Vendor profit compares that cost to its own vendor sale price; AH profit compares it " +
        "to its own live auction price after the 5% selling fee.";
      label.append(note);
    }
    row.append(label);

    const info = row.insertCell();
    info.className = "info-stack";

    const { value: vendorValue } = renderInfoBlock(info, "Vendor buy price");
    vendorValue.textContent = formatPrice(quote?.vendorCopper ?? null);

    const { block: auctionBlock, value: auctionValue } = renderInfoBlock(info, "AH minimum buyout");
    if (quote?.auctionCopper != null) {
      const source = document.createElement("a");
      source.href = quote.sourceUrl;
      source.textContent = coins(quote.auctionCopper);
      source.title = auctionQuoteLabel(quote);
      auctionValue.append(source);
      const provenance = document.createElement("small");
      provenance.textContent = "AH snapshot";
      auctionBlock.append(provenance);
    } else {
      auctionValue.textContent = quote?.status === "unlisted" ? "Not listed" : "Unknown";
    }

    renderScenarioBlock(info, "Craft → vendor", materialDirectRange(name, "vendor"), {
      unavailableTitle: "No known recipe crafts directly from this material and sells to a vendor, or none can profit",
      scopeTitle: "Craft this material once, directly into a known recipe, and sell that recipe to an NPC vendor.",
    });
    renderScenarioBlock(info, "Craft → AH resale", materialDirectRange(name, "auction"), {
      unavailableTitle: "No known recipe crafts directly from this material with a live auction listing, or none can profit after the 5% fee",
      scopeTitle: "Craft this material once, directly into a known recipe, and resell that recipe on the auction house after the 5% selling fee.",
    });
    const chainBlock = renderScenarioBlock(info, "Craft into a recipe → vendor", materialPurchaseRangeBestPath(name), {
      unavailableTitle: "No reachable recipe can profit by vendoring",
      scopeTitle: "Craft this material through any number of further crafting steps until something sells to an NPC vendor.",
    });
    const comparisons = allKnownRecipes.map(recipe => {
      const limit = recipePurchaseLimitBestPath(recipe, name);
      return { recipe, limit, quantity: limit?.quantity ?? requiredMaterialQuantityBestPath(recipe, name) };
    }).filter(comparison => comparison.quantity > 0)
      .sort((a, b) => (b.limit?.maximum ?? -Infinity) - (a.limit?.maximum ?? -Infinity) ||
        (b.limit?.breakEven ?? -Infinity) - (a.limit?.breakEven ?? -Infinity) || a.recipe.name.localeCompare(b.recipe.name));
    appendRecipeComparison(chainBlock, name, comparisons);
  }
  if (!names.length) {
    const cell = materialReference.insertRow().insertCell();
    cell.colSpan = 2;
    cell.textContent = "No materials match your search.";
  }
}

materialSearch.addEventListener("input", renderMaterialReference);
document.addEventListener("materialvalueschange", renderMaterialReference);
renderMaterialReference();
