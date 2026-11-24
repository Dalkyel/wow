// Hypothetical inventory valuation is scoped to one material scenario. Never overwrite
// market quotes or combine independent ingredient ceilings into one purchase plan.

function materialCeilingScenario(name) {
  const supplier = materialSuppliers.get(name);
  const anchors = new Set();
  function leaves(item, visited = new Set()) {
    if (visited.has(item)) return;
    const recipe = materialSuppliers.get(item);
    if (recipe) {
      recipe.materials.forEach(([input]) => leaves(input, new Set([...visited, item])));
    } else if (auctionQuotes[item]?.vendorCopper == null) anchors.add(item);
  }
  leaves(name);
  const scenarios = [];
  for (const anchor of anchors) {
    const limit = materialPurchaseRangeBestPath(anchor).lowest;
    if (!limit) continue;
    function costFor(item) {
      const part = valueBestPath(item, anchor);
      return part ? part.cost + part.quantity * limit.maximum : null;
    }
    const costs = supplier?.materials.map(([item, quantity]) => {
      const cost = costFor(item);
      return cost === null ? null : cost * quantity;
    });
    const cost = !supplier ? limit.maximum : costs.some(value => value === null) ? null
      : costs.reduce((sum, value) => sum + value, 0) / supplier.unitsPerCraft;
    if (cost === null) continue;
    scenarios.push({anchor, maximum:limit.maximum, recipe:limit.recipe, cost, costFor});
  }
  return scenarios.sort((a,b)=>a.cost-b.cost || a.anchor.localeCompare(b.anchor))[0] ?? null;
}

function materialValuationExplanation(scenario) {
  return scenario ? `Assumed inventory: ${scenario.anchor} bought at ${coins(scenario.maximum)}, the lowest recipe buy limit (${scenario.recipe.name}). ` +
    'Only this input uses the lowest recipe limit; other ingredients stay at their current cheapest costs. This is a purchase target, not a guaranteed AH offer.'
    : 'Assumed inventory cost unknown: no supported profitable recipe ceiling is available.';
}

