const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../professions/recipe-buying-plan.js'),'utf8'),context);
const hide={name:'Cured Light Hide',unitsPerCraft:1,vendorCopper:110,materials:[['Light Hide',1],['Salt',1]]};
const pants={name:'Light Leather Pants',unitsPerCraft:1,vendorCopper:599,
  materials:[['Light Leather',10],['Cured Light Hide',1],['Fine Thread',1]]};
const quotes={Salt:{vendorCopper:50},'Fine Thread':{vendorCopper:100}};

test('pants share a 598c budget and a 448c combined leather-and-hide allowance',()=>{
  const prices={'Light Leather':35,'Light Hide':90};
  const plan=context.makeRecipeBuyingPlan(pants,[pants,hide],quotes,name=>prices[name]??null);
  assert.equal(plan.budget,598);
  assert.equal(plan.fixedCost,150);
  assert.equal(plan.variableBudget,448);
  assert.equal(plan.total,590);
  assert.equal(plan.profit,9);
  assert.deepEqual(Array.from(plan.steps),['1 × Cured Light Hide','1 × Light Leather Pants']);
});

test('complete targets are reduced jointly to retain at least 1c profit',()=>{
  const prices={'Light Leather':44,'Light Hide':325};
  const plan=context.makeRecipeBuyingPlan(pants,[pants,hide],quotes,name=>prices[name]??null);
  assert.equal(plan.status,'ready');
  assert.ok(plan.total<=598);
  assert.ok(plan.profit>=1);
  assert.equal(plan.ingredients.find(item=>item.name==='Salt').price,50);
  assert.equal(plan.ingredients.find(item=>item.name==='Fine Thread').price,100);
});

test('budget remains known without a price and unaffordable vendor supplies cannot make a plan',()=>{
  const unknown=context.makeRecipeBuyingPlan(pants,[pants,hide],quotes,()=>null);
  assert.equal(unknown.budget,598);
  assert.equal(unknown.status,'unknown');
  const expensive=context.makeRecipeBuyingPlan({...pants,vendorCopper:100},[pants,hide],quotes,()=>20);
  assert.equal(expensive.status,'vendor-costs-exceed-budget');
});

test('the default buying example comes from the final recipe budget without assuming free inputs',()=>{
  const plan=context.makeRecipeBuyingPlan(pants,[pants,hide],quotes);
  assert.equal(plan.total,598);
  assert.equal(plan.profit,1);
  assert.equal(plan.ingredients.find(item=>item.name==='Light Leather').price,40);
  assert.equal(plan.ingredients.find(item=>item.name==='Light Hide').price,48);
  assert.ok(plan.ingredients.every(item=>item.fixed || item.price>=1));
});
