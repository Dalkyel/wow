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
    row.append(name);

    row.insertCell().textContent = materials.map(({ item, quantity, unitPrice, source }) =>
      `${quantity} × ${item} · ${source} at ${formatPrice(unitPrice)} each`).join(", ");
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
