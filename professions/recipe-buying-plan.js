// One jointly valid purchase plan, not a collection of independent price ceilings.
function makeRecipeBuyingPlan(recipe, recipes, quotes, targetPrice = null, expandIntermediates = true, keepMaterial = null, craftChoice = null) {
  const payout = recipe.vendorCopper > 0 ? recipe.vendorCopper * recipe.unitsPerCraft : null;
  if (payout === null) return { recipe, payout, budget:null, ingredients:[], status:'no-vendor' };
  const budget = Math.floor(payout - 1);
  const suppliers = new Map(recipes.map(item => [item.name,item]));
  const quantities = new Map();
  const steps = [];
  const decisions = [];
  let valid = true;
  function collect(name, quantity, chain) {
    if (chain.has(name)) { valid=false; return; }
    const supplier=suppliers.get(name);
    const craft = supplier && (craftChoice ? craftChoice(name)
      : expandIntermediates && name !== keepMaterial && !/\bLeather$/.test(name));
    if (supplier) decisions.push({name,quantity,craft:Boolean(craft),depth:chain.size-1});
    if (craft) {
      const crafts=Math.ceil(quantity/supplier.unitsPerCraft);
      for (const [input,amount] of supplier.materials) collect(input,amount*crafts,new Set([...chain,name]));
      steps.push(`${crafts} × ${name}`);
    } else quantities.set(name,(quantities.get(name) ?? 0)+quantity);
  }
  for (const [name,quantity] of recipe.materials) collect(name,quantity,new Set([recipe.name]));
  const ingredients=[...quantities].map(([name,quantity])=>({name,quantity,
    fixed:quotes[name]?.vendorCopper != null,
    price:quotes[name]?.vendorCopper ?? (targetPrice ? targetPrice(name) : null)}));
  const fixedCost=ingredients.filter(item=>item.fixed).reduce((sum,item)=>sum+item.quantity*item.price,0);
  const variableBudget=budget-fixedCost;
  const base={recipe,payout,budget,ingredients,fixedCost,variableBudget,decisions,steps:[...steps,`1 × ${recipe.name}`]};
  if (!valid) return {...base,status:'unknown'};
  if (variableBudget<0) return {...base,status:'vendor-costs-exceed-budget'};
  if (!targetPrice) {
    const variable=ingredients.filter(item=>!item.fixed);
    const units=variable.reduce((sum,item)=>sum+item.quantity,0);
    if (units>variableBudget) return {...base,status:'paid-inputs-exceed-budget'};
    const unitPrice=units ? Math.floor(variableBudget/units) : 0;
    for (const item of variable) item.price=unitPrice;
    let remaining=variableBudget-unitPrice*units;
    for (const item of [...variable].sort((a,b)=>a.quantity-b.quantity || a.name.localeCompare(b.name))) {
      const extra=Math.floor(remaining/item.quantity);
      item.price+=extra;
      remaining-=extra*item.quantity;
    }
  }
  if (ingredients.some(item=>item.price===null || !Number.isFinite(item.price) || item.price<0))
    return {...base,status:'unknown'};
  const variableCost=ingredients.filter(item=>!item.fixed).reduce((sum,item)=>sum+item.quantity*item.price,0);
  const scale=variableCost>variableBudget ? variableBudget/variableCost : 1;
  for (const item of ingredients) if (!item.fixed) item.price=Math.floor(item.price*scale);
  const total=ingredients.reduce((sum,item)=>sum+item.quantity*item.price,0);
  return {...base,total,profit:payout-total,status:'ready'};
}

function renderRecipeBuyingPlan(container, recipe) {
  const plan=makeRecipeBuyingPlan(recipe,allKnownRecipes,auctionQuotes);
  const block=document.createElement('aside');
  block.className='recipe-purchase-budget';
  const heading=document.createElement('strong');
  heading.textContent=`${recipe.name}: buy budget for at least 1c profit`;
  block.append(heading);
  const budget=document.createElement('p');
  budget.textContent=plan.budget===null ? 'No supported vendor payout.'
    : `Vendor pays ${formatPrice(plan.payout)} − keep at least 1c = spend at most ${formatPrice(plan.budget)} on ALL ingredients together.`;
  block.append(budget);
  if (plan.budget!==null) {
    const fixed=document.createElement('p');
    const vendorInputs=plan.ingredients.filter(item=>item.fixed);
    fixed.textContent=`Fixed vendor supplies: ${vendorInputs.length ? vendorInputs.map(item=>`${item.quantity} × ${item.name} at ${formatPrice(item.price)}`).join(' + ') : 'none'} · Total ${formatPrice(plan.fixedCost)}.`;
    const equation=document.createElement('p');
    const variable=plan.ingredients.filter(item=>!item.fixed);
    equation.textContent=variable.length
      ? `${variable.map(item=>`${item.quantity} × ${item.name} price`).join(' + ')} ≤ ${formatPrice(plan.variableBudget)} together.`
      : 'All ingredients have fixed vendor prices.';
    block.append(fixed,equation);
  }
  if (plan.status==='ready') {
    const label=document.createElement('p');
    label.textContent='One budget-based price example (use these prices together):';
    block.append(label);
    for (const item of plan.ingredients) {
      const line=document.createElement('small');
      line.textContent=`${item.quantity} × ${item.name}: ${item.fixed ? '' : '≤ '}${formatPrice(item.price)} each · ${formatPrice(item.quantity*item.price)} total${item.fixed ? ' (vendor)' : ''}`;
      block.append(line);
    }
    const result=document.createElement('p');
    result.textContent=`All purchases ${formatPrice(plan.total)} → Vendor pays ${formatPrice(plan.payout)} → Profit ${formatPrice(plan.profit)} per craft.`;
    const steps=document.createElement('small');
    steps.textContent=`Craft in order: ${plan.steps.join(' → ')}`;
    const basis=document.createElement('small');
    basis.textContent='This example divides the available budget across the purchased units, then assigns leftover copper. Many other combinations also work. These prices belong to this final recipe only; they are not live AH offers.';
    block.append(result,steps,basis);
  } else if (plan.status!=='no-vendor') {
    const message=document.createElement('p');
    message.textContent=plan.status==='vendor-costs-exceed-budget'
      ? 'Fixed vendor supplies alone exceed the purchase budget.'
      : plan.status==='paid-inputs-exceed-budget' ? 'The remaining budget cannot pay even 1c per raw material. No paid buying plan can make the required profit.'
      : 'The total budget is known, but a complete target set needs supported ingredient prices.';
    block.append(message);
  }
  container.append(block);
  return plan;
}
