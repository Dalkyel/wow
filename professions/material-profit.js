// Purchase comparisons deliberately ignore inventory source selections: gathered is not free
// when deciding whether to buy ingredients, and an input's crafting cost is a separate row.
const factionAuctionCutPercent = 5;

function auctionSaleCosts(craftCost, salePrice, quantity = 1) {
  if (salePrice === null) return { fee: null, totalCost: null, profit: null };
  const revenue = salePrice * quantity;
  const fee = Math.floor(revenue * factionAuctionCutPercent / 100);
  const totalCost = craftCost === null ? null : craftCost + fee;
  return { fee, totalCost, profit: totalCost === null ? null : revenue - totalCost };
}

function materialRecipeUses(target, recipes, purchasePrice) {
  const suppliers = new Map(recipes.map(recipe => [recipe.name, recipe]));
  function reaches(name, visited = new Set()) {
    if (name === target.name) return true;
    if (visited.has(name)) return false;
    return suppliers.get(name)?.materials.some(([input]) => reaches(input, new Set([...visited, name]))) ?? false;
  }
  return recipes.filter(recipe => recipe.name !== target.name && recipe.materials.some(([name]) => reaches(name)))
    .map(recipe => {
      const purchases = new Map();
      const steps = [];
      let required = 0;
      let valid = true;
      const buy = (name, quantity) => purchases.set(name, (purchases.get(name) ?? 0) + quantity);
      function expand(name, quantity, visited = new Set()) {
        if (name === target.name) { required += quantity; return; }
        if (!reaches(name)) { buy(name, quantity); return; }
        if (visited.has(name)) { valid = false; return; }
        const supplier = suppliers.get(name);
        const crafts = Math.ceil(quantity / supplier.unitsPerCraft);
        for (const [input, amount] of supplier.materials) expand(input, amount * crafts, new Set([...visited, name]));
        steps.push(`${crafts} × ${name}`);
      }
      for (const [name, quantity] of recipe.materials) expand(name, quantity);
      const crafts = Math.ceil(required / target.unitsPerCraft);
      for (const [name, quantity] of target.materials) buy(name, quantity * crafts);
      steps.unshift(`${crafts} × ${target.name}`);
      steps.push(`1 × ${recipe.name}`);
      const ingredients = [...purchases].map(([name, quantity]) => ({name, quantity, price: purchasePrice(name)}));
      const cost = !valid || ingredients.some(item => item.price === null) ? null
        : ingredients.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const payout = recipe.vendorCopper > 0 ? recipe.vendorCopper * recipe.unitsPerCraft : null;
      const profit = cost === null || payout === null ? null : payout - cost;
      return {recipe, cost, payout, profit, ingredients, steps, required,
        leftover: crafts * target.unitsPerCraft - required};
    }).sort((a, b) => (b.profit ?? -Infinity) - (a.profit ?? -Infinity) || a.recipe.name.localeCompare(b.recipe.name));
}

function materialProfitRows(recipes, prices, quotes) {
  const inputs = new Set(recipes.flatMap(recipe => recipe.materials.map(([name]) => name)));
  const purchasePrice = name => quotes[name]?.vendorCopper ?? prices.get(name)?.price ?? null;
  return recipes.filter(recipe => inputs.has(recipe.name) || /\b(?:Leather|Hide)$/.test(recipe.name))
    .map(recipe => {
      const ingredients = recipe.materials.map(([name, quantity]) => ({
        name, quantity, price: purchasePrice(name),
      }));
      const cost = ingredients.some(item => item.price === null) ? null
        : ingredients.reduce((sum, item) => sum + item.quantity * item.price, 0) / recipe.unitsPerCraft;
      const quote = quotes[recipe.name];
      const auction = quote?.status === 'available' && quote.quantity > 0 ? quote.auctionCopper ?? null : null;
      const savings = cost === null || auction === null ? null : auction - cost;
      // Charge the selling cut once, on the sale price; purchases have no extra AH cut.
      const sale = auctionSaleCosts(cost, auction);
      const auctionProfit = sale.profit;
      const vendorProfit = cost === null || !(recipe.vendorCopper > 0) ? null : recipe.vendorCopper - cost;
      const downstream = materialRecipeUses(recipe, recipes, purchasePrice);
      const bestUse = downstream.find(use => use.profit !== null) ?? null;
      const best = Math.max(savings ?? -Infinity, auctionProfit ?? -Infinity, vendorProfit ?? -Infinity,
        bestUse?.profit ?? -Infinity);
      const uses = recipes.filter(other => other.materials.some(([name]) => name === recipe.name)).map(other => other.name);
      return { recipe, ingredients, cost, auction, savings, auctionProfit, auctionFee: sale.fee,
        auctionTotalCost: sale.totalCost, vendorProfit, best, uses, downstream, bestUse };
    }).sort((a, b) => b.best - a.best || a.recipe.name.localeCompare(b.recipe.name));
}

function renderMaterialProfit() {
  const table = document.querySelector('#material-profit-rows');
  const only = document.querySelector('#material-profit-opportunities-only').checked;
  const search = document.querySelector('#material-profit-search').value.trim().toLowerCase();
  const all = materialProfitRows(allKnownRecipes, materialValues, auctionQuotes);
  const rows = all.filter(row => (!only || row.best > 0) &&
    [row.recipe.name, ...row.ingredients.map(item => item.name), ...row.downstream.map(use => use.recipe.name)]
      .some(name => name.toLowerCase().includes(search)));
  table.replaceChildren();
  document.querySelector('#material-profit-summary').textContent =
    `${rows.length} of ${all.length} material recipes · ${all.filter(row => row.best > 0).length} with savings or sale profit, including downstream recipes. Prices follow the auction status above.`;
  for (const item of rows) {
    const row = table.insertRow();
    const name = document.createElement('th');
    name.scope = 'row';
    const link = document.createElement(item.recipe.sourceUrl ? 'a' : 'span');
    if (item.recipe.sourceUrl) link.href = item.recipe.sourceUrl;
    link.textContent = item.recipe.name;
    name.append(link);
    const yieldLabel = document.createElement('small');
    yieldLabel.textContent = `${item.recipe.unitsPerCraft} produced per craft`;
    name.append(yieldLabel);
    const bestUse = document.createElement('p');
    bestUse.className = 'material-best-recipe';
    bestUse.textContent = item.bestUse
      ? `Best recipe to vendor: ${item.bestUse.recipe.name} · ${formatPrice(item.bestUse.profit)} per final craft` +
        (item.bestUse.profit <= 0 ? ' (no priced recipe is profitable)' : '')
      : item.downstream.length ? 'Best recipe unknown: missing prices or vendor payout.' : 'No further known recipe uses this material.';
    name.append(bestUse);
    if (item.downstream.length) {
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = `Compare ${item.downstream.length} ${item.downstream.length === 1 ? "recipe" : "recipes"} & crafting steps`;
      details.append(summary);
      for (const use of item.downstream) {
        const comparison = document.createElement('div');
        comparison.className = 'material-use-comparison';
        const title = document.createElement(use.recipe.sourceUrl ? 'a' : 'span');
        if (use.recipe.sourceUrl) title.href = use.recipe.sourceUrl;
        title.textContent = `${use.recipe.name}: ${formatPrice(use.profit)} profit per final craft`;
        const budget = document.createElement('p');
        budget.textContent = `All purchases ${formatPrice(use.cost)} · Vendor pays ${formatPrice(use.payout)} · Uses ${use.required} × ${item.recipe.name}.`;
        const steps = document.createElement('p');
        steps.textContent = `Craft in order: ${use.steps.join(' → ')}`;
        comparison.append(title, budget, steps);
        for (const input of use.ingredients) {
          const line = document.createElement('small');
          line.textContent = `Buy ${input.quantity} × ${input.name} at ${formatPrice(input.price)} each`;
          comparison.append(line);
        }
        if (use.leftover) {
          const leftover = document.createElement('small');
          leftover.textContent = `${use.leftover} × ${item.recipe.name} left over; its full crafting cost is included.`;
          comparison.append(leftover);
        }
        details.append(comparison);
      }
      name.append(details);
    }
    row.append(name);
    const ingredients = row.insertCell();
    for (const input of item.ingredients) {
      const line = document.createElement('div');
      line.textContent = `${input.quantity} × ${input.name} at ${formatPrice(input.price)} each`;
      ingredients.append(line);
    }
    for (const [index, value] of [item.cost, item.auction, item.savings, item.auctionProfit, item.vendorProfit].entries()) {
      const cell = row.insertCell();
      cell.textContent = formatPrice(value);
      if (index === 3) {
        const fee = document.createElement('small');
        fee.textContent = `AH selling fee (${factionAuctionCutPercent}%): ${formatPrice(item.auctionFee)}`;
        const total = document.createElement('small');
        total.textContent = `Craft + selling fee: ${formatPrice(item.auctionTotalCost)}`;
        cell.append(fee, total);
      }
      if (index >= 2 && value !== null) cell.className = value > 0 ? 'material-gain' : value < 0 ? 'material-loss' : '';
    }
    const decision = row.insertCell();
    const actions = [];
    if (item.savings > 0) actions.push('Craft instead of buying');
    if (item.auctionProfit > 0) actions.push('Potential AH profit');
    if (item.vendorProfit > 0) actions.push('Vendor profit');
    if (item.bestUse?.profit > 0) actions.push(`Craft for ${item.bestUse.recipe.name}`);
    decision.textContent = actions.join(' · ') || (item.cost === null ? 'Ingredient price missing'
      : item.auction === null ? 'AH price missing' : item.savings < 0 ? 'Buy ready-made' : 'No positive margin');
  }
  if (!rows.length) {
    const cell = table.insertRow().insertCell();
    cell.colSpan = 8;
    cell.textContent = only ? 'No matching opportunities. Turn off Opportunities only to compare all material recipes.'
      : 'No material recipes match your search.';
  }
}

if (typeof document !== 'undefined') {
  document.querySelector('#material-profit-opportunities-only').addEventListener('change', renderMaterialProfit);
  document.querySelector('#material-profit-search').addEventListener('input', renderMaterialProfit);
  document.addEventListener('materialvalueschange', renderMaterialProfit);
  renderMaterialProfit();
}
