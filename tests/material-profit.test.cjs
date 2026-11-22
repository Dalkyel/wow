const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const path = require('node:path');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../professions/material-profit.js'), 'utf8'), context);
const calculate = context.materialProfitRows;
const recipe = (name, materials, vendorCopper = 110, unitsPerCraft = 1) => ({name, materials, vendorCopper, unitsPerCraft});
const prices = new Map([['Light Hide', {price:83, source:'gathered'}], ['Salt', {price:999, source:'crafted'}]]);
const quotes = {
  Salt: {vendorCopper:50},
  'Cured Light Hide': {auctionCopper:144, quantity:10, status:'available'},
};

test('purchase comparisons ignore gathered sources, use vendor supplies, and separate savings from profit', () => {
  const [row] = calculate([recipe('Cured Light Hide', [['Light Hide',1],['Salt',1]])], prices, quotes);
  assert.equal(row.cost,133);
  assert.equal(row.savings,11);
  assert.equal(row.auctionProfit,4);
  assert.equal(row.vendorProfit,-23);
  assert.equal(row.best,11);
});

test('unlisted outputs and missing inputs remain unknown instead of profitable', () => {
  const r = recipe('Cured Light Hide', [['Light Hide',1],['Salt',1]]);
  const [unlisted] = calculate([r],prices,{...quotes,'Cured Light Hide':{auctionCopper:144,quantity:0,status:'unlisted'}});
  assert.equal(unlisted.savings,null);
  assert.equal(unlisted.auctionProfit,null);
  const [missing] = calculate([r],new Map(),quotes);
  assert.equal(missing.cost,null);
  assert.equal(missing.savings,null);
  assert.equal(missing.vendorProfit,null);
});

test('multiple outputs are compared per item and reusable equipment appears with its consumers', () => {
  const recipes = [recipe('Intermediate', [['Light Hide',2]], 90, 2), recipe('Final item', [['Intermediate',1]])];
  const rows = calculate(recipes,prices,{Intermediate:{auctionCopper:90,quantity:2,status:'available'}});
  assert.equal(rows.length,1);
  assert.equal(rows[0].cost,83);
  assert.equal(rows[0].vendorProfit,7);
  assert.deepEqual(Array.from(rows[0].uses),['Final item']);
});

test('buying a finished material can beat crafting even when vendor sales profit', () => {
  const [row] = calculate([recipe('Cured Light Hide',[['Light Hide',1]],150)],prices,
    {'Cured Light Hide':{auctionCopper:70,quantity:2,status:'available'}});
  assert.equal(row.savings,-13);
  assert.equal(row.vendorProfit,67);
  assert.equal(row.best,67);
});

test('best downstream recipe includes raw material costs and all final ingredients', () => {
  const p = new Map([...prices, ['Light Leather',{price:20}], ['Fine Thread',{price:100}], ['Coarse Thread',{price:10}]]);
  const rs = [recipe('Cured Light Hide',[['Light Hide',1],['Salt',1]]),
    recipe('Light Leather Pants',[['Cured Light Hide',1],['Light Leather',10],['Fine Thread',1]],599),
    recipe('Embossed Leather Pants',[['Cured Light Hide',1],['Light Leather',6],['Coarse Thread',2]],347)];
  const row = calculate(rs,p,quotes).find(row=>row.recipe.name==='Cured Light Hide');
  assert.equal(row.bestUse.recipe.name,'Light Leather Pants');
  assert.equal(row.bestUse.cost,433);
  assert.equal(row.bestUse.profit,166);
  assert.equal(row.downstream[1].profit,74);
  p.get('Light Leather').price=100;
  const updated=calculate(rs,p,quotes).find(row=>row.recipe.name==='Cured Light Hide');
  assert.equal(updated.bestUse.recipe.name,'Embossed Leather Pants');
  assert.equal(updated.bestUse.profit,-406);
});

test('indirect recipe uses include intermediate crafts without double charging bought outputs', () => {
  const rs = [recipe('Cured Light Hide',[['Light Hide',1],['Salt',1]]),
    recipe('Tunic',[['Cured Light Hide',3]],300),
    recipe('Vest',[['Tunic',1],['Cured Light Hide',2]],1000)];
  const row=calculate(rs,prices,quotes).find(row=>row.recipe.name==='Cured Light Hide');
  assert.equal(row.bestUse.recipe.name,'Vest');
  assert.equal(row.bestUse.required,5);
  assert.equal(row.bestUse.cost,665);
  assert.equal(row.bestUse.profit,335);
  assert.deepEqual(Array.from(row.bestUse.steps),['5 × Cured Light Hide','1 × Tunic','1 × Vest']);
});

test('downstream comparisons charge whole batches and ignore unknown or unsupported profit', () => {
  const rs = [recipe('Intermediate',[['Light Hide',1]],10,3),
    recipe('Final',[['Intermediate',1]],100),
    recipe('Unknown',[['Intermediate',1],['Missing',1]],999),
    recipe('Unsellable',[['Intermediate',1]],0)];
  const row=calculate(rs,prices,{}).find(row=>row.recipe.name==='Intermediate');
  assert.equal(row.bestUse.recipe.name,'Final');
  assert.equal(row.bestUse.cost,83);
  assert.equal(row.bestUse.profit,17);
  assert.equal(row.bestUse.leftover,2);
  assert.equal(row.best,17);
  assert.equal(row.downstream.filter(use=>use.profit===null).length,2);
});

test('auction selling fee is charged once on revenue and included in total cost', () => {
  const sale=context.auctionSaleCosts(133,144);
  assert.equal(sale.fee,7);
  assert.equal(sale.totalCost,140);
  assert.equal(sale.profit,4);
  const batch=context.auctionSaleCosts(200,101,3);
  assert.equal(batch.fee,15);
  assert.equal(batch.totalCost,215);
  assert.equal(batch.profit,88);
  const unknown=context.auctionSaleCosts(null,144);
  assert.equal(unknown.fee,7);
  assert.equal(unknown.totalCost,null);
  assert.equal(unknown.profit,null);
  assert.equal(context.auctionSaleCosts(133,null).fee,null);
  const [row]=calculate([recipe('Cured Light Hide',[['Light Hide',1],['Salt',1]])],prices,quotes);
  assert.equal(row.auctionFee,7);
  assert.equal(row.auctionTotalCost,140);
  assert.equal(row.vendorProfit,-23);
});
