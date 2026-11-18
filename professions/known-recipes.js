const recipesByOutput = new Map(knownRecipes.map(recipe => [recipe.name, recipe]));

function priceMaterials(recipe, gatherLightHide, batches = 1, chain = new Set()) {
  const visited = new Set([...chain, recipe.name]);
  return recipe.materials.map(([item, quantityPerCraft, recordedPrice]) => {
    const unitPrice = item === "Light Hide" && gatherLightHide ? 0 : recordedPrice;
    const quantity = quantityPerCraft * batches;
    const purchaseCost = unitPrice === null ? null : quantity * unitPrice;
    const supplier = recipesByOutput.get(item);
    if (supplier && !visited.has(item) && purchaseCost !== 0) {
      const ingredients = priceMaterials(supplier, gatherLightHide, Math.ceil(quantity / supplier.unitsPerCraft), visited);
      if (ingredients.every(ingredient => ingredient.cost !== null)) {
        const craftCost = ingredients.reduce((total, ingredient) => total + ingredient.cost, 0);
        if (purchaseCost === null || craftCost < purchaseCost) {
          return { item, quantity, cost: craftCost, crafted: true };
        }
      }
    }
    return { item, quantity, cost: purchaseCost, unitPrice, crafted: false };
  });
}

const formatPrice = price => price === null
  ? "Unknown"
  : `${price < 0 ? "−" : ""}${coins(Math.abs(price))}`;

const recipeTable = document.querySelector("#recipes");
const lightHideSource = document.querySelector("#light-hide-source");

function renderRecipeTable() {
  const gatherLightHide = lightHideSource.value === "gathered";
  const recipeRows = knownRecipes.map(recipe => {
    const materials = priceMaterials(recipe, gatherLightHide);
    const cost = materials.some(ingredient => ingredient.cost === null)
      ? null
      : materials.reduce((total, ingredient) => total + ingredient.cost, 0);
    const payout = recipe.vendorCopper === null ? null : recipe.vendorCopper * recipe.unitsPerCraft;
    const net = cost === null || payout === null || payout === 0 ? null : payout - cost;
    return { recipe, materials, cost, payout, net };
  }).sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity) ||
    a.recipe.name.localeCompare(b.recipe.name));

  recipeTable.replaceChildren();
  for (const { recipe, materials, cost, payout, net } of recipeRows) {
    const row = recipeTable.insertRow();
    const name = document.createElement("th");
    name.scope = "row";
    const title = document.createElement(recipe.sourceUrl ? "a" : "span");
    if (recipe.sourceUrl) title.href = recipe.sourceUrl;
    title.textContent = recipe.name;
    name.append(title);
    row.append(name);

    row.insertCell().textContent = materials.map(({ item, quantity, cost, unitPrice, crafted }) =>
      crafted ? `${quantity} × ${item} (craft for ${formatPrice(cost)} total)`
        : `${quantity} × ${item} at ${formatPrice(unitPrice)} each`).join(", ");
    row.insertCell().textContent = formatPrice(cost);
    row.insertCell().textContent = payout === 0 ? "Can't be sold" : formatPrice(payout);
    row.insertCell().textContent = payout === 0 ? "—" : formatPrice(net);
    if (net < 0) row.classList.add("recipe-loss");
  }
}

lightHideSource.addEventListener("change", renderRecipeTable);
renderRecipeTable();
