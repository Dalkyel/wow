// The redesigned views share one projection. Quotes are purchase observations;
// target prices are a jointly valid example and never become inventory costs.
function plannerPurchaseQuote(name, quotes) {
  const quote=quotes[name];
  if (quote?.vendorCopper != null) return {price:quote.vendorCopper,source:'Vendor'};
  if (quote?.status==='available' && quote.quantity>0 && quote.auctionCopper!=null)
    return {price:quote.auctionCopper,source:'AH quote'};
  return {price:null,source:'No quote'};
}

function plannerProjection(recipe, recipes, quotes, {destination='vendor',route='craft',keepMaterial=null,choices={}}={}) {
  const outputQuote=quotes[recipe.name];
  const auctionPrice=outputQuote?.status==='available' && outputQuote.quantity>0 ? outputQuote.auctionCopper ?? null : null;
  const salePrice=destination==='auction' ? auctionPrice : recipe.vendorCopper>0 ? recipe.vendorCopper : null;
  const gross=salePrice===null ? null : salePrice*recipe.unitsPerCraft;
  const fee=gross===null ? null : destination==='auction' ? Math.floor(gross*5/100) : 0;
  const net=gross===null ? null : gross-fee;
  const suppliers=new Map(recipes.map(item=>[item.name,item]));
  function craftChoice(name) {
    if (name===keepMaterial) return false;
    const supplier=suppliers.get(name);
    if (keepMaterial && supplier && plannerUsesMaterial(supplier,keepMaterial,recipes)) return true;
    if (Object.prototype.hasOwnProperty.call(choices,name)) return choices[name]==='craft';
    return route==='craft' && !/\bLeather$/.test(name);
  }
  // Only the net proceeds are available to cover ingredient purchases.
  const plan=makeRecipeBuyingPlan({...recipe,vendorCopper:net===null ? 1/recipe.unitsPerCraft : net/recipe.unitsPerCraft},
    recipes,quotes,null,route==='craft',keepMaterial,craftChoice);
  if (net===null) { plan.payout=null;plan.budget=null;plan.variableBudget=null;plan.status='no-sale-price'; }
  const inputs=plan.ingredients.map(item=>({...item,...plannerPurchaseQuote(item.name,quotes),target:item.price}));
  const currentCost=plan.status==='unknown' || inputs.some(item=>item.price===null) ? null
    : inputs.reduce((sum,item)=>sum+item.quantity*item.price,0);
  const currentProfit=net===null || currentCost===null ? null : net-currentCost;
  return {recipe,destination,route,choices,keepMaterial,gross,fee,net,salePrice,plan,inputs,currentCost,currentProfit,
    status:net===null ? 'no-sale-price' : currentProfit===null ? 'missing-quotes' : currentProfit>0 ? 'profitable' : 'wait'};
}

function plannerUsesMaterial(recipe, target, recipes) {
  const suppliers=new Map(recipes.map(item=>[item.name,item]));
  function reaches(name,chain) {
    if (name===target) return true;
    if (chain.has(name)) return false;
    return suppliers.get(name)?.materials.some(([input])=>reaches(input,new Set([...chain,name]))) ?? false;
  }
  return recipe.name!==target && recipe.materials.some(([name])=>reaches(name,new Set([recipe.name])));
}

function plannerCoins(amount) {
  if (amount===null || !Number.isFinite(amount)) return 'Unknown';
  const sign=amount<0 ? '−' : '';
  amount=Math.abs(amount);
  const gold=Math.floor(amount/10000),silver=Math.floor(amount%10000/100),copper=Math.round((amount%100)*100)/100;
  return sign+[gold ? `${gold}g` : '',silver ? `${silver}s` : '',copper || (!gold&&!silver) ? `${copper}c` : ''].filter(Boolean).join(' ');
}

// Solve each ingredient independently while keeping every other purchase at its
// quoted price. Each result is a complete alternative, never a combined set of caps.
function plannerPurchaseAlternatives(view) {
  return view.inputs.filter(input=>!input.fixed).map(input=>{
    const others=view.inputs.filter(other=>other.name!==input.name);
    const base={name:input.name,quantity:input.quantity,others};
    if (view.plan.budget===null || others.some(other=>other.price===null)) return {...base,status:'missing-quotes',maximum:null};
    const otherCost=others.reduce((sum,other)=>sum+other.quantity*other.price,0);
    const maximum=Math.floor((view.plan.budget-otherCost)/input.quantity);
    if (maximum<1) return {...base,status:'no-paid-price',maximum:null,otherCost};
    const total=otherCost+input.quantity*maximum;
    return {...base,status:'ready',maximum,otherCost,total,profit:view.net-total};
  });
}

function plannerCraftableInputCosts(view, recipes, quotes) {
  const suppliers=new Map(recipes.map(recipe=>[recipe.name,recipe]));
  const costs=new Map();
  for (const input of view.plan.decisions ?? []) {
    if (costs.has(input.name)) continue;
    const supplier=suppliers.get(input.name);
    const crafted=plannerProjection(supplier,recipes,quotes,{route:view.route,keepMaterial:view.keepMaterial,choices:view.choices});
    costs.set(input.name,{buy:plannerPurchaseQuote(input.name,quotes).price,
      craft:crafted.currentCost===null ? null : crafted.currentCost/supplier.unitsPerCraft});
  }
  return costs;
}

// Calculator overrides belong to an isolated scenario; they never change AH quotes.
function plannerPriceCalculation(view, prices=new Map(), {minimumProfit=1,salePrice=null}={}) {
  const gross=salePrice===null ? view.gross : salePrice*view.recipe.unitsPerCraft;
  const fee=gross===null ? null : view.destination==='auction' ? Math.floor(gross*5/100) : 0;
  const net=gross===null ? null : gross-fee;
  const base={gross,fee,net,minimumProfit,budget:null,locked:[],unpriced:[],remaining:null};
  if (!Number.isSafeInteger(minimumProfit) || minimumProfit<1 ||
      (salePrice!==null && (!Number.isSafeInteger(salePrice) || salePrice<1)))
    return {...base,status:'invalid',message:'Use whole copper amounts and a profit target of at least 1c.'};
  if (net===null) return {...base,status:'no-sale-price',message:'Enter an AH sale price or select Vendor to calculate a purchase budget.'};
  const budget=net-minimumProfit;
  const locked=[],unpriced=[];
  for (const input of view.inputs) {
    const overridden=prices.has(input.name);
    const price=overridden ? prices.get(input.name) : input.fixed ? input.price : null;
    if (price===null) {unpriced.push({...input});continue;}
    if (!Number.isSafeInteger(price) || price<0) return {...base,budget,status:'invalid',message:`Enter a whole copper price of 0 or more for ${input.name}.`};
    locked.push({...input,price,provided:overridden});
  }
  const committed=locked.reduce((sum,item)=>sum+item.quantity*item.price,0);
  const remaining=budget-committed;
  const result={...base,budget,locked,unpriced,committed,remaining};
  if (view.plan.status==='unknown') return {...result,status:'invalid',message:'This ingredient route cannot be calculated.'};
  if (remaining<0) return {...result,status:'over-budget',overBy:-remaining,
    total:unpriced.length ? null : committed,profit:unpriced.length ? null : net-committed};
  if (!unpriced.length) return {...result,status:'all-priced',total:committed,profit:net-committed,example:locked};
  const units=unpriced.reduce((sum,item)=>sum+item.quantity,0);
  if (remaining<units) return {...result,status:'no-paid-price',message:'The remaining budget cannot pay at least 1c for each unpriced material. Lower a set price or explicitly enter 0 for materials obtained free.'};
  const startingPrice=Math.floor(remaining/units);
  const allocated=unpriced.map(item=>({...item,price:startingPrice}));
  let leftover=remaining-startingPrice*units;
  for (const item of [...allocated].sort((a,b)=>a.quantity-b.quantity || a.name.localeCompare(b.name))) {
    const extra=Math.floor(leftover/item.quantity);item.price+=extra;leftover-=extra*item.quantity;
  }
  const example=[...locked,...allocated];
  const total=example.reduce((sum,item)=>sum+item.quantity*item.price,0);
  return {...result,status:unpriced.length===1 ? 'one-unpriced' : 'shared-budget',
    maximum:unpriced.length===1 ? allocated[0].price : null,example,total,profit:net-total};
}
