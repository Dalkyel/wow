function priceMaterials(recipe) {
  return recipe.materials.map(([item, quantity]) => {
    const unitPrice = materialUnitCost(item);
    return { item, quantity, unitPrice, source: materialValues.get(item).source,
      cost: unitPrice === null ? null : quantity * unitPrice };
  });
}

const formatPrice = price => price === null
  ? "Unknown"
  : `${price < 0 ? "−" : ""}${coins(Math.abs(price))}`;

const recipeTable = document.querySelector("#recipes");

function renderRecipeTable(table, recipes, profitableOnly = false) {
  const recipeRows = recipes.map(recipe => {
    const materials = priceMaterials(recipe);
    const cost = materials.some(ingredient => ingredient.cost === null)
      ? null
      : materials.reduce((total, ingredient) => total + ingredient.cost, 0);
    const payout = recipe.vendorCopper === null ? null : recipe.vendorCopper * recipe.unitsPerCraft;
    const net = cost === null || payout === null || payout === 0 ? null : payout - cost;
    return { recipe, materials, cost, payout, net };
  }).filter(row => !profitableOnly || row.net > 0)
    .sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity) ||
    a.recipe.name.localeCompare(b.recipe.name));

  table.replaceChildren();
  for (const { recipe, materials, cost, payout, net } of recipeRows) {
    const row = table.insertRow();
    const name = document.createElement("th");
    name.scope = "row";
    const title = document.createElement(recipe.sourceUrl ? "a" : "span");
    if (recipe.sourceUrl) title.href = recipe.sourceUrl;
    title.textContent = recipe.name;
    name.append(title);
    for (const leather of [...materialValues.keys()].filter(item => /\bLeather$/.test(item))) {
      for (const hide of [...materialValues.keys()].filter(item => /\bHide$/.test(item))) {
        for (const tradeoff of [recipePurchaseTradeoff(recipe, leather, hide),
          recipePurchaseTradeoff(recipe, hide, leather)]) {
          if (!tradeoff) continue;
          const cheaper = tradeoff.leather;
          const dearer = tradeoff.hide;
          const note = document.createElement("aside");
          note.className = "recipe-tradeoff";
          const scenario = document.createElement("p");
          scenario.textContent = `Buy ${tradeoff.leatherQuantity} × ${cheaper} at ${coins(tradeoff.maximumLeather)} each or less ` +
            `to afford ${tradeoff.hideQuantity} × ${dearer} at ${coins(tradeoff.hidePrice)} each ` +
            `and earn ${formatPrice(tradeoff.profit)} or more per craft.`;
          const ratio = document.createElement("p");
          const increase = tradeoff.extraHidePerCopperSaved;
          ratio.textContent = `Every 1c less per ${cheaper} adds ${Number.isInteger(increase) ? coins(increase) : `${increase.toFixed(2)}c`} ` +
            `to the allowance per ${dearer}. Other ingredients stay at ${formatPrice(tradeoff.otherCost)} per craft.`;
          note.append(scenario, ratio);
          note.title = "A hypothetical purchase of both materials, including ingredients of selected crafting steps. " +
            "Holds the second material at its selected purchase price and uses current costs for all other ingredients. " +
            "The recipe's displayed profit still uses your current selected sources and prices.";
          name.append(note);
        }
      }
    }
    row.append(name);

    const ingredientCell = row.insertCell();
    for (const { item, quantity, unitPrice, source } of materials) {
      const ingredient = document.createElement("div");
      ingredient.className = "recipe-ingredient";
      const selected = document.createElement("span");
      selected.textContent = `${quantity} × ${item} · ${materialSourceLabel(item)} at ${formatPrice(unitPrice)} each`;
      const buying = document.createElement("small");
      buying.className = "recipe-buy-limit";
      const quote = auctionQuotes[item];
      const maximum = materialMaximumBuyLabel(item);
      const bestBuy = bestMaterialPurchase(item);
      buying.textContent = `${bestBuy.source === "vendor" ? `Vendor ${formatPrice(bestBuy.price)}`
        : `AH snapshot ${formatPrice(quote?.auctionCopper ?? null)}`} · Max buy ${maximum} each`;
      buying.title = materialMaximumBuyExplanation;
      if (quote) buying.title += ` ${auctionQuoteLabel(quote)}`;
      ingredient.append(selected, buying);
      ingredientCell.append(ingredient);
    }
    row.insertCell().textContent = formatPrice(cost);
    row.insertCell().textContent = payout === 0 ? "Can't be sold" : formatPrice(payout);
    row.insertCell().textContent = payout === 0 ? "—" : formatPrice(net);
    if (net < 0) row.classList.add("recipe-loss");
  }
  if (!recipeRows.length && profitableOnly) {
    const cell = table.insertRow().insertCell();
    cell.colSpan = 5;
    cell.textContent = "No recipes have a positive profit at the selected costs.";
  }
}

const recipeViews = [
  { table: recipeTable, recipes: knownRecipes, filter: document.querySelector("#leatherworking-profitable-only") },
  { table: document.querySelector("#cooking-recipes"), recipes: cookingRecipes, filter: document.querySelector("#cooking-profitable-only") },
  { table: document.querySelector("#first-aid-recipes"), recipes: firstAidRecipes, filter: document.querySelector("#first-aid-profitable-only") },
];

function updateRecipeTables() {
  for (const view of recipeViews) renderRecipeTable(view.table, view.recipes, view.filter.checked);
}

for (const view of recipeViews) {
  view.filter.addEventListener("change", () => renderRecipeTable(view.table, view.recipes, view.filter.checked));
}
document.addEventListener("materialvalueschange", updateRecipeTables);
updateRecipeTables();
