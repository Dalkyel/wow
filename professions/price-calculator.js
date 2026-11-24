const calculatorState={recipeId:selectedRecipe,destination:'vendor',minimumProfit:1,salePrice:null,
  prices:new Map(),choices:new Map(),shape:null,quoteLabels:new Map(),fixedLabels:new Map()};
function calculatorPrices() {
  if (!calculatorState.prices.has(calculatorState.recipeId)) calculatorState.prices.set(calculatorState.recipeId,new Map());
  return calculatorState.prices.get(calculatorState.recipeId);
}
function calculatorView() {
  const recipe=plannerRecipes.find(item=>item.recipeId===calculatorState.recipeId);
  return plannerProjection(recipe,plannerRecipes,auctionQuotes,{destination:calculatorState.destination,
    choices:calculatorState.choices.get(calculatorState.recipeId) ?? {}});
}
function openPriceCalculator(recipeId,view=null) {
  if (calculatorState.recipeId!==recipeId) {calculatorState.salePrice=null;$('#calculator-sale-price').value='';}
  calculatorState.recipeId=recipeId;
  if (view) {
    calculatorState.destination=view.destination;
    calculatorState.choices.set(recipeId,Object.fromEntries((view.plan.decisions ?? []).map(item=>[item.name,item.craft?'craft':'buy'])));
  }
  $('#calculator-destination').value=calculatorState.destination;
  $('#calculator-recipe-search').value='';$('#calculator-recipe-profession').value='all';renderCalculatorRecipePicker();
  selectProfession($('#calculator-tab'));renderPriceCalculator();
}
function renderPriceCalculator() {
  const view=calculatorView();
  $('#calculator-selected-recipe').textContent=`${view.recipe.name} · ${view.recipe.profession}`;
  $('#calculator-sale-label').hidden=calculatorState.destination!=='auction';
  const route=$('#calculator-route');route.replaceChildren(plannerRouteControls(view,choices=>{
    calculatorState.choices.set(calculatorState.recipeId,choices);renderPriceCalculator();
  }));
  const shape=JSON.stringify([calculatorState.recipeId,view.inputs.map(item=>[item.name,item.quantity,item.fixed])]);
  const prices=calculatorPrices();
  if (shape!==calculatorState.shape) {
    calculatorState.shape=shape;calculatorState.quoteLabels.clear();calculatorState.fixedLabels.clear();
    const table=node('table',undefined,'calculator-table');const head=node('thead');const tr=node('tr');
    for (const label of ['Purchase per craft','Quote / each','Your price / each (copper)']) {const th=node('th',label);th.setAttribute('scope','col');tr.append(th);}
    head.append(tr);table.append(head);const body=node('tbody');
    for (const item of view.inputs) {
      const row=node('tr');const name=node('td',`${item.quantity} × ${item.name}`);
      const quote=node('td');calculatorState.quoteLabels.set(item.name,quote);
      const price=node('td');
      if (item.fixed) {const fixed=node('span',`Vendor ${money(item.price)} · fixed`,'quiet');calculatorState.fixedLabels.set(item.name,fixed);price.append(fixed);}
      else {
        const input=node('input');input.type='number';input.min='0';input.step='1';input.inputMode='numeric';input.placeholder='Blank = calculate';
        input.setAttribute('aria-label',`${item.name} calculator price in copper`);
        input.value=prices.has(item.name) ? prices.get(item.name) : '';
        input.addEventListener('input',()=>{
          if (input.value==='') prices.delete(item.name);
          else prices.set(item.name,Number(input.value));
          input.setAttribute('aria-invalid',String(input.value!=='' && (!Number.isSafeInteger(Number(input.value)) || Number(input.value)<0)));
          renderCalculatorResult();
        });
        price.append(input);
      }
      row.append(name,quote,price);body.append(row);
    }
    table.append(body);$('#calculator-inputs').replaceChildren(table);
  }
  for (const item of view.inputs) {
    const label=calculatorState.quoteLabels.get(item.name);
    if (label) label.textContent=`${money(item.price)} · ${item.source}`;
    const fixed=calculatorState.fixedLabels.get(item.name);if(fixed) fixed.textContent=`Vendor ${money(item.price)} · fixed`;
  }
  renderCalculatorResult();
}
function renderCalculatorResult() {
  const view=calculatorView();
  const result=plannerPriceCalculation(view,calculatorPrices(),{minimumProfit:calculatorState.minimumProfit,
    salePrice:calculatorState.destination==='auction' ? calculatorState.salePrice : null});
  const output=$('#calculator-results');output.replaceChildren();
  const metrics=node('div',undefined,'metric-grid calculator-metrics');
  metrics.append(metric('Sale proceeds',money(result.gross)),metric('Selling fee',money(result.fee)),metric('Maximum ingredient spend',money(result.budget),'budget-metric'));
  output.append(metrics);
  if (result.budget!==null) output.append(node('p',`${money(result.gross)} sale − ${money(result.fee)} selling fee − ${money(result.minimumProfit)} desired profit = ${money(result.budget)} ingredient budget.`,'budget-equation'));
  const status=$('#calculator-status');
  if (result.status==='invalid'||result.status==='no-sale-price') {status.textContent=result.message;return;}
  const reserved=node('section',undefined,'calculator-reserved');reserved.append(node('h3','Prices already set'));
  for (const item of result.locked) reserved.append(node('p',`${item.quantity} × ${item.name} at ${money(item.price)} each = ${money(item.quantity*item.price)}${item.fixed ? ' (vendor)' : ''}`));
  if (!result.locked.length) reserved.append(node('p','No purchase prices have been set yet.','quiet'));
  reserved.append(node('strong',`${money(result.committed)} reserved · ${money(result.remaining)} left for blank prices`));output.append(reserved);
  if (result.status==='over-budget') {
    status.textContent=`Your set prices exceed the purchase budget by ${money(result.overBy)}. Lower them to keep ${money(result.minimumProfit)} profit.`;
    if (result.profit!==null) output.append(metric('Profit at your set prices',money(result.profit),result.profit>0?'positive':'negative'));
    return;
  }
  if (result.status==='no-paid-price') {status.textContent=result.message;return;}
  if (result.status==='all-priced') {
    status.textContent=`All prices are set. This craft earns ${money(result.profit)} after selling fees.`;
    const totals=node('div',undefined,'example-result');totals.append(metric('Total purchase cost',money(result.total)),metric('Profit per craft',money(result.profit),'positive'));output.append(totals);return;
  }
  if (result.status==='one-unpriced') {
    const item=result.unpriced[0];status.textContent=`Buy ${item.quantity} × ${item.name} at ${money(result.maximum)} each or less to keep at least ${money(result.minimumProfit)} profit.`;
  } else status.textContent=`The ${result.unpriced.length} blank material prices share ${money(result.remaining)}. Their separate limits cannot be combined.`;
  const example=node('section',undefined,'buying-example calculator-example');
  example.append(node('h3',result.status==='one-unpriced' ? 'Your completed purchase plan' : 'One valid combination for the blank prices'));
  const equation=result.unpriced.map(item=>`${item.quantity} × ${item.name} price`).join(' + ');
  example.append(node('p',`${equation} ≤ ${money(result.remaining)} together.`,'shared-budget-rule'));
  for (const item of result.example) {
    const set=result.locked.some(locked=>locked.name===item.name);
    example.append(node('p',`${item.quantity} × ${item.name}: ${set ? '' : '≤ '}${money(item.price)} each · ${money(item.quantity*item.price)} total${set ? ' · fixed in this scenario' : ''}`));
  }
  const totals=node('div',undefined,'example-result');totals.append(metric('All purchases',money(result.total)),metric('Profit per craft',money(result.profit),'positive'));example.append(totals);
  if (result.status==='shared-budget') example.append(node('p','This is one combined example, not independent maximum prices. Paying more for one blank material requires spending less on another.','quiet'));
  output.append(example);
}
let calculatorRecipeMatches=[];
function chooseCalculatorRecipe(recipeId) {
  if (calculatorState.recipeId!==recipeId) {calculatorState.salePrice=null;$('#calculator-sale-price').value='';}
  calculatorState.recipeId=recipeId;
  $('#calculator-recipe-picker').open=false;
  renderCalculatorRecipePicker();renderPriceCalculator();
  $('#calculator-selected-recipe').focus?.();
}
function renderCalculatorRecipePicker() {
  const query=$('#calculator-recipe-search').value.trim().toLowerCase();
  const profession=$('#calculator-recipe-profession').value;
  calculatorRecipeMatches=plannerRecipes.filter(recipe=>(profession==='all'||recipe.profession===profession) && recipe.name.toLowerCase().includes(query))
    .sort((a,b)=>a.name.localeCompare(b.name));
  $('#calculator-recipe-count').textContent=`${calculatorRecipeMatches.length} ${calculatorRecipeMatches.length===1?'recipe':'recipes'} found`;
  const results=$('#calculator-recipe-results');results.replaceChildren();
  for (const recipe of calculatorRecipeMatches) {
    const button=node('button',undefined,`calculator-recipe-option${recipe.recipeId===calculatorState.recipeId?' selected':''}`);
    button.type='button';button.setAttribute('aria-pressed',String(recipe.recipeId===calculatorState.recipeId));
    button.append(node('strong',recipe.name),node('span',recipe.profession,'quiet'));
    button.addEventListener('click',()=>chooseCalculatorRecipe(recipe.recipeId));results.append(button);
  }
  if (!calculatorRecipeMatches.length) results.append(node('p','No recipes match. Try another name or profession.','empty-state'));
}
$('#calculator-recipe-profession').value='all';
$('#calculator-recipe-picker').open=false;
$('#calculator-recipe-search').addEventListener('input',renderCalculatorRecipePicker);
$('#calculator-recipe-profession').addEventListener('change',renderCalculatorRecipePicker);
$('#calculator-recipe-picker').addEventListener('toggle',()=>{
  if ($('#calculator-recipe-picker').open) $('#calculator-recipe-search').focus?.();
});
$('#calculator-recipe-search').addEventListener('keydown',event=>{
  if (event.key==='Enter' && calculatorRecipeMatches.length) {event.preventDefault();chooseCalculatorRecipe(calculatorRecipeMatches[0].recipeId);}
  if (event.key==='ArrowDown') {event.preventDefault();$('#calculator-recipe-results').children[0]?.focus?.();}
  if (event.key==='Escape') {event.preventDefault();$('#calculator-recipe-picker').open=false;$('#calculator-selected-recipe').focus?.();}
});
renderCalculatorRecipePicker();
$('#calculator-destination').value=calculatorState.destination;
$('#calculator-min-profit').value='1';
$('#calculator-destination').addEventListener('change',()=>{calculatorState.destination=$('#calculator-destination').value;renderPriceCalculator();});
$('#calculator-min-profit').addEventListener('input',()=>{calculatorState.minimumProfit=Number($('#calculator-min-profit').value);renderCalculatorResult();});
$('#calculator-sale-price').addEventListener('input',()=>{calculatorState.salePrice=$('#calculator-sale-price').value==='' ? null : Number($('#calculator-sale-price').value);renderCalculatorResult();});
$('#calculator-clear').addEventListener('click',()=>{calculatorPrices().clear();calculatorState.shape=null;renderPriceCalculator();});
$('#calculator-use-quotes').addEventListener('click',()=>{
  const prices=calculatorPrices();
  for (const input of calculatorView().inputs) if (!input.fixed) {if (input.price!==null) prices.set(input.name,input.price);else prices.delete(input.name);}
  calculatorState.shape=null;renderPriceCalculator();
});
renderPriceCalculator();
