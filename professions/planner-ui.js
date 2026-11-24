const plannerRecipes=[...knownRecipes.map(recipe=>({...recipe,profession:'Leatherworking'})),
  ...cookingRecipes.map(recipe=>({...recipe,profession:'Cooking'})),
  ...firstAidRecipes.map(recipe=>({...recipe,profession:'First Aid'}))];
const auctionQuotes=typeof auctionPriceSnapshot==='undefined' ? {} : {...auctionPriceSnapshot.materials};
let plannerMarketState={source:'saved',snapshot:typeof auctionPriceSnapshot==='undefined' ? null : auctionPriceSnapshot};
let selectedRecipe=plannerRecipes.find(recipe=>recipe.name==='Light Leather Pants')?.recipeId ?? plannerRecipes[0]?.recipeId;
let selectedMaterial='Light Hide';
let saleDestination='vendor';
let purchaseRoute='craft';
let selectedKeepMaterial=null;
let ingredientChoices={};
const $=selector=>document.querySelector(selector);
const money=plannerCoins;
function node(tag,text,className) {
  const element=document.createElement(tag);
  if (text!==undefined) element.textContent=text;
  if (className) element.className=className;
  return element;
}
function setAuctionPriceState(state) {
  plannerMarketState={...plannerMarketState,...state};
  const status=$('#auction-price-status');
  const scan=Object.values(auctionQuotes).find(quote=>quote.scannedAt)?.scannedAt;
  const labels={loading:'Refreshing AH quotes',live:'AH quotes loaded',saved:'Saved AH quotes',stale:'Refresh failed · older cached quotes',error:'Refresh failed · saved quotes'};
  status.textContent=`${labels[plannerMarketState.source]}${scan ? ` · Scan ${new Date(scan).toLocaleString()}` : ''}`;
}
function applyAuctionPrices(snapshot,source) {
  for (const name of Object.keys(auctionQuotes)) delete auctionQuotes[name];
  Object.assign(auctionQuotes,snapshot.materials);
  setAuctionPriceState({snapshot,source});
  renderPlanner();
}
function metric(label,value,kind='') {
  const block=node('div',undefined,`metric ${kind}`);
  block.append(node('span',label,'metric-label'),node('strong',value));
  return block;
}
function heading(kicker,title,description) {
  const block=node('div',undefined,'detail-heading');
  block.append(node('p',kicker,'eyebrow'),node('h2',title));
  if (description) block.append(node('p',description,'quiet'));
  return block;
}
function quoteLink(name,price) {
  const quote=auctionQuotes[name];
  if (!quote?.sourceUrl || price===null) return node('span',money(price));
  const link=node('a',money(price));link.href=quote.sourceUrl;link.target='_blank';link.rel='noreferrer';return link;
}
function projection(recipe, options={}) {
  return plannerProjection(recipe,plannerRecipes,auctionQuotes,options.keepMaterial!==undefined ? {...options,choices:options.choices ?? {}}
    : {...options,keepMaterial:recipe.recipeId===selectedRecipe ? selectedKeepMaterial : null,
      choices:recipe.recipeId===selectedRecipe ? ingredientChoices : {}});
}
function closeMobileDrawer(id) {
  if (typeof window!=='undefined' && window.matchMedia('(max-width:640px)').matches) $(id).open=false;
}
function recipeStatus(view) {
  return view.status==='profitable' ? `${money(view.currentProfit)} profit at quotes` : view.status==='wait'
    ? view.currentProfit===0 ? 'Breaks even at quotes' : `${money(-view.currentProfit)} loss at quotes`
    : view.status==='no-sale-price' ? 'Sale price unavailable' : 'Ingredient quote missing';
}
function selectRecipe(id,{destination='vendor',route='craft',keepMaterial=null}={}) {
  selectedRecipe=id;saleDestination=destination;purchaseRoute=route;selectedKeepMaterial=keepMaterial;ingredientChoices=keepMaterial ? {[keepMaterial]:'buy'} : {};
  $('#recipe-search').value='';$('#recipe-profession').value='all';
  selectProfession($('#recipes-tab'));
  renderRecipes();
}
function renderRecipes() {
  const search=$('#recipe-search').value.trim().toLowerCase();
  const profession=$('#recipe-profession').value;
  const only=$('#recipe-available-only').checked;
  const recipes=plannerRecipes.filter(recipe=>(profession==='all'||recipe.profession===profession)&&recipe.name.toLowerCase().includes(search))
    .map(recipe=>({recipe,view:projection(recipe,recipe.recipeId===selectedRecipe
      ? {destination:saleDestination,route:purchaseRoute} : {destination:'vendor',route:'craft',keepMaterial:null})})).filter(item=>!only||item.view.currentProfit>0)
    .sort((a,b)=>a.recipe.name.localeCompare(b.recipe.name));
  $('#recipe-count').textContent=`${recipes.length} known recipes`;
  const list=$('#recipe-list');list.replaceChildren();
  for (const {recipe,view} of recipes) {
    const button=node('button',undefined,`selection-item${recipe.recipeId===selectedRecipe ? ' selected' : ''}`);
    button.type='button';button.setAttribute('aria-pressed',String(recipe.recipeId===selectedRecipe));
    button.append(node('strong',recipe.name),node('span',`${recipe.profession} · ${view.destination==='auction' ? `AH ${money(view.gross)}` : recipe.vendorCopper>0 ? `Vendor ${money(recipe.vendorCopper*recipe.unitsPerCraft)}` : 'Cannot vendor'}`,'quiet'),
      node('span',recipeStatus(view),view.status==='profitable' ? 'positive' : 'quiet'));
    button.addEventListener('click',()=>{selectedRecipe=recipe.recipeId;saleDestination='vendor';selectedKeepMaterial=null;ingredientChoices={};closeMobileDrawer('#recipe-drawer');renderRecipes();});
    list.append(button);
  }
  if (!recipes.length) list.append(node('p','No recipes match these filters.','empty-state'));
  renderRecipeDetail();
}
function plannerRouteControls(view,onChoose) {
  const route=node('div',undefined,'route-control');
  route.setAttribute('role','group');route.setAttribute('aria-label','How to get the ingredients');
  route.append(node('span','How to get the ingredients','metric-label'));
  const costs=plannerCraftableInputCosts(view,plannerRecipes,auctionQuotes);
  const decisions=new Map();
  for (const input of view.plan.decisions ?? []) {
    const old=decisions.get(input.name);
    decisions.set(input.name,{...input,quantity:input.quantity+(old?.quantity ?? 0),depth:Math.min(input.depth,old?.depth ?? input.depth)});
  }
  if (decisions.size) {
    const rows=node('div',undefined,'ingredient-choice-rows');
    for (const input of decisions.values()) {
      const row=node('div',undefined,'ingredient-choice-row');
      row.append(node('span',`${input.quantity} × ${input.name}`,'ingredient-choice-name'));
      const choices=node('div',undefined,'route-choices');
      for (const [value,label] of [['craft',`Craft ${input.name}`],['buy',`Buy ${input.name} ready-made`]]) {
        const button=node('button',label,`route-choice${(value==='craft')===input.craft?' active':''}`);button.type='button';
        button.setAttribute('aria-pressed',String((value==='craft')===input.craft));
        button.addEventListener('click',()=>{
          // Keep every other visible choice intact when changing one ingredient.
          const choices=Object.fromEntries([...decisions.values()].map(item=>[item.name,item.craft?'craft':'buy']));
          choices[input.name]=value;onChoose(choices);
        });
        choices.append(button);
      }
      const cost=costs.get(input.name);
      row.append(choices,node('p',`Buy at quotes: ${money(cost.buy)} each · Craft at quotes: ${money(cost.craft)} each`,'ingredient-cost-comparison'));rows.append(row);
    }
    route.append(rows,node('p','Choose independently for every ingredient. Crafting it includes its own ingredients and conversions.','quiet'));
  } else route.append(node('p','Buy the recipe ingredients.','quiet'));
  return route;
}
function renderRecipeDetail() {
  const recipe=plannerRecipes.find(item=>item.recipeId===selectedRecipe);
  const detail=$('#recipe-detail');detail.replaceChildren();
  if (!recipe) {detail.append(node('p','Choose a recipe.'));return;}
  const view=projection(recipe,{destination:saleDestination,route:purchaseRoute});
  detail.append(heading(recipe.profession,recipe.name,`${recipe.unitsPerCraft} item${recipe.unitsPerCraft===1 ? '' : 's'} produced per craft. All amounts below are for one craft.`));
  const controls=node('div',undefined,'plan-controls');
  const sale=node('label','Sell the finished item to');
  const saleSelect=node('select');saleSelect.setAttribute('aria-label','Sell the finished item to');
  for (const [value,label] of [['vendor','Vendor'],['auction','Auction House (5% fee)']]) {
    const option=node('option',label);option.value=value;saleSelect.append(option);
  }
  saleSelect.value=saleDestination;
  saleSelect.addEventListener('change',()=>{saleDestination=saleSelect.value;renderRecipes();});sale.append(saleSelect);
  const route=plannerRouteControls(view,choices=>{ingredientChoices=choices;selectedKeepMaterial=null;renderRecipes();});
  controls.append(sale,route);detail.append(controls);
  const calculator=node('button','Try your own purchase prices','secondary-action calculator-link');calculator.type='button';
  calculator.addEventListener('click',()=>openPriceCalculator(recipe.recipeId,view));detail.append(calculator);
  const metrics=node('div',undefined,'metric-grid');
  metrics.append(metric(saleDestination==='vendor' ? 'Vendor pays' : 'AH sale proceeds',money(view.gross)),
    metric(saleDestination==='vendor' ? 'Selling fee' : 'AH fee · 5%',money(view.fee)),
    metric('Maximum ingredient spend',money(view.plan.budget),'budget-metric'));
  detail.append(metrics);
  if (view.net!==null) detail.append(node('p',`${money(view.gross)} sale − ${money(view.fee)} selling fee − at least 1c profit = ${money(view.plan.budget)} purchase budget.`,'budget-equation'));
  const now=node('section',undefined,'current-quote-panel');
  now.append(node('h3','At current purchase quotes'));
  const current=node('div',undefined,'current-metrics');
  current.append(metric('Ingredients cost',money(view.currentCost)),metric('Profit after all costs',money(view.currentProfit),view.currentProfit>0?'positive':'negative'));
  now.append(current,node('p',view.status==='profitable' ? 'The quoted purchases fit this budget.' : view.status==='wait'
    ? 'Wait for cheaper ingredients. Use the buying example below as a target.' : 'A quote or sale price is missing. No current profit is assumed.','quiet'));
  detail.append(now);
  if (selectedKeepMaterial && purchaseRoute==='craft' && plannerRecipes.some(item=>item.name===selectedKeepMaterial)) detail.append(node('p',`This plan buys ${selectedKeepMaterial} ready-made and crafts the other intermediate ingredients.`,'quiet'));
  renderPurchaseAlternatives(detail,view);
  renderBuyingExample(detail,view);
  const steps=node('section',undefined,'crafting-steps');steps.append(node('h3','Crafting order'));
  const ol=node('ol');for (const step of view.plan.steps ?? []) ol.append(node('li',step));steps.append(ol);detail.append(steps);
  detail.append(node('p',saleDestination==='auction'
    ? 'AH profit assumes a sale at the quoted price. Refunded deposits add no sale cost; lost deposits and relisting costs are excluded.'
    : 'Vendor payout is fixed. Ingredient AH quotes are snapshot minimums; stock at that price can change.','footnote'));
}
function renderPurchaseAlternatives(container,view) {
  const alternatives=plannerPurchaseAlternatives(view);
  if (!alternatives.length || view.plan.budget===null) return;
  const section=node('section',undefined,'purchase-alternatives');
  section.append(node('h3','What price should I look for?'),node('p','Each purchased material has its own buy limit, with all other purchases at their quoted prices. Switch any ingredient between Buy and Craft above to see its other routes. Use one complete option at a time.','quiet'));
  for (const alternative of alternatives) {
    const card=node('div',undefined,'purchase-option');
    if (alternative.status==='ready') {
      card.append(node('strong',`Buy ${alternative.quantity} × ${alternative.name} at ${money(alternative.maximum)} each or less.`,'target-price'));
      card.append(node('p',`With ${alternative.others.map(item=>`${item.quantity} × ${item.name} at ${money(item.price)} each`).join('; ')}.`));
      card.append(node('small',`All purchases ${money(alternative.total)} → ${money(view.net)} after selling fees → ${money(alternative.profit)} profit per craft.`));
    } else card.append(node('p',alternative.status==='missing-quotes'
      ? `A quote for another ingredient is missing, so the buy limit for ${alternative.name} is unknown.`
      : `No paid price for ${alternative.name} leaves 1c profit at the other quoted prices. The other ingredients alone cost ${money(alternative.otherCost)} against a ${money(view.plan.budget)} budget.`));
    section.append(card);
  }
  container.append(section);
}
function renderBuyingExample(container,view) {
  const section=node('section',undefined,'buying-example');
  const title=node('div',undefined,'section-title');title.append(node('h3','Buying plan'),node('span','EXAMPLE TARGETS · NOT AH QUOTES','example-tag'));section.append(title);
  const plan=view.plan;
  if (view.net===null) {section.append(node('p','No sale price is available for this destination, so a profitable purchase budget cannot be calculated.'));container.append(section);return;}
  const variables=plan.ingredients.filter(item=>!item.fixed);
  const fixed=plan.ingredients.filter(item=>item.fixed);
  const formula=variables.length ? `${variables.map(item=>`${item.quantity} × ${item.name} price`).join(' + ')} ≤ ${money(plan.variableBudget)}` : 'All supplies have fixed vendor prices.';
  section.append(node('p',formula,'shared-budget-rule'));
  if (fixed.length) section.append(node('p',`${money(plan.fixedCost)} is reserved for vendor supplies: ${fixed.map(item=>`${item.quantity} × ${item.name}`).join(', ')}.`,'quiet'));
  if (plan.status!=='ready') {
    section.append(node('p',plan.status==='vendor-costs-exceed-budget' ? 'Vendor supplies alone cost more than the sale can cover.'
      : plan.status==='paid-inputs-exceed-budget' ? 'The remaining budget cannot cover even 1c per purchased raw material.' : 'No complete buying example can be calculated for this recipe.'));
    container.append(section);return;
  }
  const scroll=node('div',undefined,'table-scroll');
  const table=node('table');const head=node('thead');const hr=node('tr');
  for (const label of ['Buy','Current price / each','Example target / each','Example total']) { const th=node('th',label);th.setAttribute('scope','col');hr.append(th); }head.append(hr);table.append(head);
  const body=node('tbody');
  for (const input of view.inputs) {
    const tr=node('tr');const name=node('td');name.append(node('strong',`${input.quantity} × ${input.name}`),node('small',input.fixed?'Vendor supply':'Auction material'));
    const actual=node('td');actual.append(quoteLink(input.name,input.price),node('small',input.source));
    const target=node('td',`${input.fixed ? '' : '≤ '}${money(input.target)}`,'target-price');
    const total=node('td',money(input.quantity*input.target));tr.append(name,actual,target,total);body.append(tr);
  }
  table.append(body);scroll.append(table);section.append(scroll);
  const result=node('div',undefined,'example-result');
  result.append(metric('Example ingredient total',money(plan.total)),metric('Example profit',money(view.net-plan.total),'positive'));
  section.append(result,node('p','These prices work together. They are one possible split of the budget—not separate maximums. You can pay more for one ingredient if you spend less on another.','quiet'));
  container.append(section);
}
function renderMaterials() {
  const names=[...new Set(plannerRecipes.flatMap(recipe=>recipe.materials.map(([name])=>name)))].sort((a,b)=>a.localeCompare(b));
  const search=$('#material-search').value.trim().toLowerCase();
  const filtered=names.filter(name=>name.toLowerCase().includes(search));
  if (!names.includes(selectedMaterial)) selectedMaterial=names[0];
  $('#material-count').textContent=`${filtered.length} materials in your recipes`;
  const list=$('#material-list');list.replaceChildren();
  for (const name of filtered) {
    const quote=plannerPurchaseQuote(name,auctionQuotes);
    const button=node('button',undefined,`selection-item${name===selectedMaterial?' selected':''}`);button.type='button';button.setAttribute('aria-pressed',String(name===selectedMaterial));
    button.append(node('strong',name),node('span',`${quote.source} · ${money(quote.price)} each`,'quiet'));
    button.addEventListener('click',()=>{selectedMaterial=name;closeMobileDrawer('#material-drawer');renderMaterials();});list.append(button);
  }
  if (!filtered.length) list.append(node('p','No materials match your search.','empty-state'));
  renderMaterialDetail();
}
function renderMaterialDetail() {
  const detail=$('#material-detail');detail.replaceChildren();
  const name=selectedMaterial;if (!name) return;
  detail.append(heading('MATERIAL',name,'A material has no universal profitable buy price. Its buying target depends on the final recipe and the other purchases.'));
  const quote=auctionQuotes[name];const metrics=node('div',undefined,'metric-grid');
  const ah=metric('AH purchase quote',quote?.status==='available' ? money(quote.auctionCopper ?? null) : 'No quote');
  metrics.append(ah,metric('Vendor purchase price',quote?.vendorCopper!=null?money(quote.vendorCopper):'No known vendor source'));
  detail.append(metrics);
  const supplier=plannerRecipes.find(recipe=>recipe.name===name);
  if (supplier) {
    const conversion=node('section',undefined,'conversion-card');conversion.append(node('h3','You know how to craft this material'),
      node('p',`${supplier.materials.map(([input,quantity])=>`${quantity} × ${input}`).join(' + ')} → ${supplier.unitsPerCraft} × ${name}`));
    const button=node('button','Open craft-and-sell plan','primary-action');button.type='button';button.addEventListener('click',()=>selectRecipe(supplier.recipeId,{destination:'auction'}));conversion.append(button);detail.append(conversion);
  }
  const uses=plannerRecipes.filter(recipe=>plannerUsesMaterial(recipe,name,plannerRecipes))
    .map(recipe=>({recipe,view:projection(recipe,{keepMaterial:name})})).sort((a,b)=>a.recipe.name.localeCompare(b.recipe.name));
  detail.append(node('h3',`Recipe buying plans · ${uses.length}`),node('p','Each card belongs to one final recipe. Its ingredient prices must work together within that recipe’s budget.','quiet'));
  for (const {recipe,view} of uses) {
    const card=node('section',undefined,'material-recipe-card');
    card.append(node('h4',recipe.name),node('p',view.gross===null ? 'No vendor sale budget is available for this recipe.'
      : `Vendor pays ${money(view.gross)} · Spend at most ${money(view.plan.budget)} on all ingredients.`));
    const input=view.inputs.find(item=>item.name===name);
    const alternative=plannerPurchaseAlternatives(view).find(item=>item.name===name);
    if (alternative?.status==='ready') {
      card.append(node('p',`Buy ${alternative.quantity} × ${name} at ${money(alternative.maximum)} each or less to profit at the other quoted prices.`,'material-target'));
      card.append(node('p',`Other purchases: ${alternative.others.map(item=>`${item.quantity} × ${item.name} at ${money(item.price)} each`).join('; ')}.`,'quiet'));
      card.append(node('p',`Total ${money(alternative.total)} · Profit ${money(alternative.profit)} per craft.`,'quiet'));
    } else card.append(node('p',alternative?.status==='no-paid-price' ? 'The other quoted ingredients leave no profitable paid price for this material.'
      : input?.fixed ? `Vendor supply: ${money(input.price)} each. Open the plan to check all purchases together.`
      : 'Open the plan to see the ingredient route and shared budget.','material-target'));

    const button=node('button','Open buying plan','secondary-action');button.type='button';
    button.setAttribute('aria-label',`Open buying plan for ${recipe.name}`);
    // Preserve the chosen material as a purchased input so the target matches this card.
    button.addEventListener('click',()=>selectRecipe(recipe.recipeId,{keepMaterial:name}));
    card.append(button);detail.append(card);
  }
  if (!uses.length) detail.append(node('p','No further known recipe uses this material.','empty-state'));
}
function renderPlanner() {renderRecipes();renderMaterials();if(typeof renderPriceCalculator==='function') renderPriceCalculator();}
$('#recipe-search').addEventListener('input',renderRecipes);
$('#recipe-profession').addEventListener('change',renderRecipes);
$('#recipe-available-only').addEventListener('change',renderRecipes);
$('#material-search').addEventListener('input',renderMaterials);
if (typeof window!=='undefined') {
  const mobile=window.matchMedia('(max-width:640px)');
  const syncDrawers=()=>{ $('#recipe-drawer').open=!mobile.matches;$('#material-drawer').open=!mobile.matches; };
  mobile.addEventListener('change',syncDrawers);syncDrawers();
}
renderPlanner();
setAuctionPriceState(plannerMarketState);
