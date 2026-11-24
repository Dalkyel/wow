const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=vm.createContext({});
for(const file of ['recipe-buying-plan.js','planner-core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../professions',file),'utf8'),context);
const hide={recipeId:'hide',name:'Cured Light Hide',unitsPerCraft:1,vendorCopper:110,materials:[['Light Hide',1],['Salt',1]]};
const pants={recipeId:'pants',name:'Light Leather Pants',unitsPerCraft:1,vendorCopper:599,materials:[['Light Leather',10],['Cured Light Hide',1],['Fine Thread',1]]};
const recipes=[hide,pants];
const available=price=>({auctionCopper:price,quantity:100,status:'available'});
const quotes={'Light Hide':available(90),'Light Leather':available(35),'Cured Light Hide':available(220),Salt:{vendorCopper:50},'Fine Thread':{vendorCopper:100}};

test('a recipe separates current purchase cost from its complete budget-based targets',()=>{
  const view=context.plannerProjection(pants,recipes,quotes);
  assert.equal(view.gross,599);assert.equal(view.fee,0);assert.equal(view.net,599);
  assert.equal(view.plan.budget,598);assert.equal(view.plan.variableBudget,448);
  assert.equal(view.currentCost,590);assert.equal(view.currentProfit,9);
  assert.equal(view.plan.total,598);assert.equal(view.plan.profit,1);
  assert.equal(view.inputs.find(item=>item.name==='Light Hide').price,90);
  assert.equal(view.inputs.find(item=>item.name==='Light Hide').target,48);
  assert.equal(quotes['Light Hide'].auctionCopper,90);
});
test('ready-made and raw-input plans use their actual selected ingredient routes',()=>{
  const bought=context.plannerProjection(pants,recipes,quotes,{route:'buy'});
  assert.equal(bought.currentCost,670);assert.equal(bought.currentProfit,-71);
  assert.ok(bought.inputs.some(item=>item.name==='Cured Light Hide'));
  assert.ok(!bought.inputs.some(item=>item.name==='Light Hide'));
  const linked=context.plannerProjection(pants,recipes,quotes,{keepMaterial:'Cured Light Hide'});
  assert.equal(linked.currentCost,bought.currentCost);
  assert.equal(linked.inputs.find(item=>item.name==='Cured Light Hide').target,48);
});
test('an AH sale subtracts its fee before calculating the ingredient budget and profit',()=>{
  const view=context.plannerProjection(hide,recipes,quotes,{destination:'auction'});
  assert.equal(view.gross,220);assert.equal(view.fee,11);assert.equal(view.net,209);
  assert.equal(view.plan.budget,208);assert.equal(view.currentCost,140);assert.equal(view.currentProfit,69);
  assert.equal(view.net-view.plan.total,1);
});
test('missing or unlisted quotes stay unknown and never become a free input',()=>{
  const missing=context.plannerProjection(pants,recipes,{...quotes,'Light Hide':{...available(90),quantity:0,status:'unlisted'}});
  assert.equal(missing.currentCost,null);assert.equal(missing.currentProfit,null);assert.equal(missing.status,'missing-quotes');
  assert.equal(missing.plan.budget,598);
  const noSale=context.plannerProjection(pants,recipes,quotes,{destination:'auction'});
  assert.equal(noSale.gross,null);assert.equal(noSale.plan.budget,null);assert.equal(noSale.currentProfit,null);
  assert.equal(noSale.currentCost,590);assert.ok(noSale.inputs.length>0);
});
test('materials link to direct and indirect recipes without including their own recipe',()=>{
  assert.equal(context.plannerUsesMaterial(pants,'Light Hide',recipes),true);
  assert.equal(context.plannerUsesMaterial(pants,'Cured Light Hide',recipes),true);
  assert.equal(context.plannerUsesMaterial(hide,'Cured Light Hide',recipes),false);
});

test('ready-made cured hide and leather each have their own complete quoted-price alternative',()=>{
  const view=context.plannerProjection(pants,recipes,quotes,{route:'buy'});
  const alternatives=context.plannerPurchaseAlternatives(view);
  const cured=alternatives.find(item=>item.name==='Cured Light Hide');
  assert.equal(cured.maximum,148);assert.equal(cured.total,598);assert.equal(cured.profit,1);
  assert.equal(cured.others.find(item=>item.name==='Light Leather').price,35);
  const leather=alternatives.find(item=>item.name==='Light Leather');
  assert.equal(leather.maximum,27);assert.equal(leather.total,590);assert.equal(leather.profit,9);
  assert.equal(leather.others.find(item=>item.name==='Cured Light Hide').price,220);
});
test('an unlisted target can have a buy limit, but missing other prices cannot be assumed free',()=>{
  const missingTarget=context.plannerProjection(pants,recipes,{...quotes,'Cured Light Hide':{status:'unlisted',quantity:0}},{route:'buy'});
  const cured=context.plannerPurchaseAlternatives(missingTarget).find(item=>item.name==='Cured Light Hide');
  assert.equal(cured.maximum,148);
  const leather=context.plannerPurchaseAlternatives(missingTarget).find(item=>item.name==='Light Leather');
  assert.equal(leather.status,'missing-quotes');assert.equal(leather.maximum,null);
  const impossible=context.plannerProjection(pants,recipes,{...quotes,'Light Leather':available(100)},{route:'buy'});
  assert.equal(context.plannerPurchaseAlternatives(impossible).find(item=>item.name==='Cured Light Hide').status,'no-paid-price');
});

test('scraps can replace leather while cured hide remains a ready-made purchase',()=>{
  const leather={recipeId:'leather',name:'Light Leather',unitsPerCraft:1,vendorCopper:15,materials:[['Ruined Leather Scraps',3]]};
  const all=[...recipes,leather];
  const market={...quotes,'Ruined Leather Scraps':available(10)};
  const view=context.plannerProjection(pants,all,market,{choices:{'Light Leather':'craft','Cured Light Hide':'buy'}});
  assert.equal(view.inputs.find(item=>item.name==='Ruined Leather Scraps').quantity,30);
  assert.ok(!view.inputs.some(item=>['Light Leather','Light Hide','Salt'].includes(item.name)));
  assert.equal(view.currentCost,620);assert.equal(view.currentProfit,-21);
  const scraps=context.plannerPurchaseAlternatives(view).find(item=>item.name==='Ruined Leather Scraps');
  assert.equal(scraps.maximum,9);assert.equal(scraps.total,590);assert.equal(scraps.profit,9);
  assert.deepEqual(Array.from(view.plan.steps),['10 × Light Leather','1 × Light Leather Pants']);
});
test('opening a scraps material plan forces every conversion needed to reach the final item',()=>{
  const leather={recipeId:'leather',name:'Light Leather',unitsPerCraft:1,vendorCopper:15,materials:[['Ruined Leather Scraps',3]]};
  const all=[...recipes,leather];const market={...quotes,'Ruined Leather Scraps':available(10)};
  const view=context.plannerProjection(pants,all,market,{keepMaterial:'Ruined Leather Scraps'});
  assert.equal(view.inputs.find(item=>item.name==='Ruined Leather Scraps').quantity,30);
  assert.equal(view.currentCost,540);assert.equal(view.currentProfit,59);
  assert.equal(context.plannerPurchaseAlternatives(view).find(item=>item.name==='Ruined Leather Scraps').maximum,11);
  const costs=context.plannerCraftableInputCosts(view,all,market);
  assert.equal(costs.get('Light Leather').buy,35);assert.equal(costs.get('Light Leather').craft,30);
  assert.equal(costs.get('Cured Light Hide').buy,220);assert.equal(costs.get('Cured Light Hide').craft,140);
});
test('all leather-grade conversions can be selected without dropping or double-counting raw inputs',()=>{
  const leather={name:'Light Leather',unitsPerCraft:1,vendorCopper:15,materials:[['Ruined Leather Scraps',3]]};
  const medium={name:'Medium Leather',unitsPerCraft:1,vendorCopper:50,materials:[['Light Leather',4]]};
  const final={name:'Test final',unitsPerCraft:1,vendorCopper:500,materials:[['Medium Leather',2]]};
  const view=context.plannerProjection(final,[leather,medium,final],{'Ruined Leather Scraps':available(10)},
    {keepMaterial:'Ruined Leather Scraps'});
  assert.equal(view.inputs[0].quantity,24);assert.equal(view.currentCost,240);
  assert.deepEqual(Array.from(view.plan.steps),['8 × Light Leather','2 × Medium Leather','1 × Test final']);
});

test('a given raw hide price determines the remaining leather price without changing quotes',()=>{
  const view=context.plannerProjection(pants,recipes,quotes);
  const result=context.plannerPriceCalculation(view,new Map([['Light Hide',90]]));
  assert.equal(result.status,'one-unpriced');assert.equal(result.budget,598);
  assert.equal(result.committed,240);assert.equal(result.remaining,358);assert.equal(result.maximum,35);
  assert.equal(result.total,590);assert.equal(result.profit,9);
  assert.equal(quotes['Light Hide'].auctionCopper,90);
});
test('several blank prices share one budget while all-priced and over-budget cases stay explicit',()=>{
  const view=context.plannerProjection(pants,recipes,quotes,{route:'buy'});
  const shared=context.plannerPriceCalculation(view);
  assert.equal(shared.status,'shared-budget');assert.equal(shared.remaining,498);
  assert.equal(shared.total,598);assert.equal(shared.profit,1);
  const fixed=context.plannerPriceCalculation(view,new Map([['Light Leather',35],['Cured Light Hide',148]]));
  assert.equal(fixed.status,'all-priced');assert.equal(fixed.profit,1);
  const over=context.plannerPriceCalculation(view,new Map([['Light Leather',50],['Cured Light Hide',220]]));
  assert.equal(over.status,'over-budget');assert.equal(over.overBy,222);assert.equal(over.profit,-221);
});
test('calculator scenarios support scraps, profit targets, and a proposed AH output price',()=>{
  const leather={name:'Light Leather',unitsPerCraft:1,vendorCopper:15,materials:[['Ruined Leather Scraps',3]]};
  const view=context.plannerProjection(pants,[...recipes,leather],quotes,{choices:{'Light Leather':'craft','Cured Light Hide':'buy'}});
  const scraps=context.plannerPriceCalculation(view,new Map([['Cured Light Hide',220]]));
  assert.equal(scraps.maximum,9);assert.equal(scraps.unpriced[0].quantity,30);assert.equal(scraps.profit,9);
  const higher=context.plannerPriceCalculation(context.plannerProjection(pants,recipes,quotes),new Map([['Light Hide',90]]),{minimumProfit:10});
  assert.equal(higher.maximum,34);assert.equal(higher.profit,19);
  const auction=context.plannerPriceCalculation(context.plannerProjection(pants,recipes,quotes,{destination:'auction'}),new Map(),{salePrice:1000});
  assert.equal(auction.gross,1000);assert.equal(auction.fee,50);assert.equal(auction.budget,949);
});
test('invalid calculator prices and unaffordable positive purchases never produce a false profitable plan',()=>{
  const view=context.plannerProjection(pants,recipes,quotes);
  assert.equal(context.plannerPriceCalculation(view,new Map([['Light Hide',-1]])).status,'invalid');
  assert.equal(context.plannerPriceCalculation(view,new Map([['Light Hide',1.5]])).status,'invalid');
  assert.equal(context.plannerPriceCalculation(view,new Map(),{minimumProfit:0}).status,'invalid');
  assert.equal(context.plannerPriceCalculation(view,new Map([['Light Hide',448]])).status,'no-paid-price');
  assert.equal(context.plannerPriceCalculation(context.plannerProjection(pants,recipes,quotes,{destination:'auction'})).status,'no-sale-price');
});

test('calculator proposed AH prices and profit targets account for the entire output batch',()=>{
  const batch={name:'Batch item',unitsPerCraft:3,vendorCopper:20,materials:[['Raw',2]]};
  const view=context.plannerProjection(batch,[batch],{}, {destination:'auction'});
  const result=context.plannerPriceCalculation(view,new Map(),{salePrice:101,minimumProfit:10});
  assert.equal(result.gross,303);assert.equal(result.fee,15);assert.equal(result.budget,278);
  assert.equal(result.maximum,139);assert.equal(result.total,278);assert.equal(result.profit,10);
});
