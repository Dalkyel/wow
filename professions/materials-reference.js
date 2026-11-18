const materialReference = document.querySelector("#materials-reference");
const materialSearch = document.querySelector("#material-search");
const openMaterialComparisons = new Set();

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
  if (comparisons.length < 2) return;
  const details = document.createElement("details");
  details.className = "material-comparison";
  details.open = openMaterialComparisons.has(name);
  details.addEventListener("toggle", () => {
    if (details.open) openMaterialComparisons.add(name);
    else openMaterialComparisons.delete(name);
  });
  const summary = document.createElement("summary");
  summary.textContent = `Compare ${comparisons.length} recipes`;
  const cost = document.createElement("p");
  const unitCost = materialUnitCost(name);
  cost.textContent = `Selected material cost ${formatPrice(unitCost)} each (${materialValues.get(name).source}).`;
  const scroll = document.createElement("div");
  scroll.className = "comparison-scroll";
  scroll.tabIndex = 0;
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", `${name} recipe comparison`);
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headings = document.createElement("tr");
  for (const text of ["Recipe", "Max buy / item", "Profit / craft"]) {
    const heading = document.createElement("th");
    heading.scope = "col";
    heading.textContent = text;
    headings.append(heading);
  }
  head.append(headings);
  const body = document.createElement("tbody");
  for (const { recipe, limit, quantity } of comparisons) {
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
    const profit = limit && unitCost !== null ? limit.payout - limit.otherCost - quantity * unitCost : null;
    const profitCell = row.insertCell();
    profitCell.textContent = formatPrice(profit);
    if (profit !== null) {
      const perMaterial = document.createElement("small");
      const unitProfit = profit / quantity;
      perMaterial.textContent = `${Number.isInteger(unitProfit) ? coins(unitProfit) : `${unitProfit.toFixed(2)}c`} / material`;
      profitCell.append(perMaterial);
      if (profit < 0) profitCell.className = "comparison-loss";
    }
  }
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
    const limits = comparisons.flatMap(comparison => comparison.limit ? [comparison.limit] : []);
    const best = limits.find(limit => limit.maximum >= 0);
    const row = materialReference.insertRow();
    const label = document.createElement("th");
    label.scope = "row";
    label.textContent = name;
    row.append(label);
    row.insertCell().textContent = formatPrice(quote?.vendorCopper ?? null);
    const auction = row.insertCell();
    if (quote?.auctionCopper != null) {
      const source = document.createElement("a");
      source.href = quote.sourceUrl;
      source.textContent = coins(quote.auctionCopper);
      source.title = quote.scannedAt ? `Scanned ${new Date(quote.scannedAt).toLocaleString()}` : "Price source";
      auction.append(source);
    } else {
      auction.textContent = quote?.status === "unlisted" ? "Not listed" : "Unknown";
    }
    const maximum = row.insertCell();
    if (!best) maximum.className = "material-price-unavailable";
    maximum.textContent = best ? coins(best.maximum) : limits.length ? "None" : "Unknown";
    maximum.title = best ? "Highest whole-copper unit price that produces a positive vendor profit"
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
