const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function page() {
  const elements=new Map();
  function element(tag='div') {return {tag,children:[],textContent:'',value:'',checked:false,listeners:{},attributes:{},
    append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
    setAttribute(name,value){this.attributes[name]=value;},addEventListener(type,handler){this.listeners[type]=handler;}};}
  const document={createElement:element,querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);}};
  document.querySelector('#recipe-profession').value='all';
  const quote=price=>({auctionCopper:price,purchaseCopper:price,quantity:10,status:'available'});
  const context=vm.createContext({document,knownRecipes:[
    {recipeId:'leather',name:'Light Leather',unitsPerCraft:1,vendorCopper:15,materials:[['Ruined Leather Scraps',3]]},
    {recipeId:'hide',name:'Cured Light Hide',unitsPerCraft:1,vendorCopper:110,materials:[['Light Hide',1],['Salt',1]]},
    {recipeId:'pants',name:'Light Leather Pants',unitsPerCraft:1,vendorCopper:599,materials:[['Light Leather',10],['Cured Light Hide',1],['Fine Thread',1]]}],
    cookingRecipes:[],firstAidRecipes:[],auctionPriceSnapshot:{materials:{'Ruined Leather Scraps':quote(10),'Light Hide':quote(90),'Light Leather':quote(44),'Cured Light Hide':quote(220),Salt:{vendorCopper:50},'Fine Thread':{vendorCopper:100}}},
    selectProfession(tab){document.selectedTab=tab;}});
  for(const file of ['recipe-buying-plan.js','planner-core.js','planner-ui.js','price-calculator.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../professions',file),'utf8'),context);
  return {document,context};
}
const text=element=>[element.textContent,...element.children.map(text)].join(' ');
function find(element,predicate) {if(predicate(element))return element;for(const child of element.children){const found=find(child,predicate);if(found)return found;}}

test('the default recipe clearly separates the current loss from a 1c-profit example',()=>{
  const {document}=page();
  const detail=document.querySelector('#recipe-detail');
  assert.match(text(detail),/Maximum ingredient spend 5s 98c/);
  assert.match(text(find(detail,e=>e.className==='current-quote-panel')),/Ingredients cost 6s 80c.*Profit after all costs −81c/);
  const example=find(detail,e=>e.className==='buying-example');
  assert.match(text(example),/EXAMPLE TARGETS · NOT AH QUOTES/);
  assert.match(text(example),/10 × Light Leather price \+ 1 × Light Hide price ≤ 4s 48c/);
  assert.match(text(example),/Example ingredient total 5s 98c.*Example profit 1c/);
});
test('a material buying plan opens the exact same route and target in Recipes',()=>{
  const {document,context}=page();
  vm.runInContext('selectedMaterial="Cured Light Hide";renderMaterials()',context);
  const detail=document.querySelector('#material-detail');
  assert.match(text(detail),/Buy 1 × Cured Light Hide at 58c each or less/);
  const card=find(detail,e=>e.className==='material-recipe-card');
  find(card,e=>e.tag==='button').listeners.click();
  assert.equal(document.selectedTab,document.querySelector('#recipes-tab'));
  const recipeText=text(document.querySelector('#recipe-detail'));
  assert.match(recipeText,/This plan buys Cured Light Hide ready-made/);
  assert.match(recipeText,/Buy 1 × Cured Light Hide at 58c each or less/);
});
test('live prices update current costs without changing the fixed vendor budget',()=>{
  const {document,context}=page();
  context.incoming={materials:{'Light Hide':{auctionCopper:40,quantity:10,status:'available'},'Light Leather':{auctionCopper:35,quantity:10,status:'available'},Salt:{vendorCopper:50},'Fine Thread':{vendorCopper:100}}};
  vm.runInContext('applyAuctionPrices(incoming,"live")',context);
  const detail=document.querySelector('#recipe-detail');
  assert.match(text(find(detail,e=>e.className==='current-quote-panel')),/Ingredients cost 5s 40c.*Profit after all costs 59c/);
  assert.match(text(detail),/Maximum ingredient spend 5s 98c/);
});
test('recipe and material filters work without numeric price forms or assumed-cost modes',()=>{
  const {document}=page();
  const search=document.querySelector('#recipe-search');search.value='Sausage';search.listeners.input();
  assert.match(text(document.querySelector('#recipe-list')),/No recipes match/);
  const html=fs.readFileSync(path.join(__dirname,'../professions/index.html'),'utf8');
  assert.doesNotMatch(html.split('<section id="calculator-view"')[0],/type="number"|inventory-valuation\.js|materials-reference\.js|material-profit\.js|known-recipes\.js/);
  assert.equal((html.match(/role="tab" /g)||[]).length,3);
});

test('an explicit ready-made cured-hide route updates both sides of the buying comparison',()=>{
  const {document}=page();
  const detail=document.querySelector('#recipe-detail');
  const ready=find(detail,e=>e.tag==='button' && e.textContent==='Buy Cured Light Hide ready-made');
  assert.ok(ready);ready.listeners.click();
  const alternatives=find(detail,e=>e.className==='purchase-alternatives');
  assert.match(text(alternatives),/Buy 1 × Cured Light Hide at 58c each or less/);
  assert.match(text(alternatives),/10 × Light Leather at 44c each/);
  assert.match(text(alternatives),/Buy 10 × Light Leather at 27c each or less/);
  assert.match(text(alternatives),/1 × Cured Light Hide at 2s 20c each/);
  assert.match(text(document.querySelector('#recipe-list')),/1s 61c loss at quotes/);
  const table=find(detail,e=>e.tag==='table');
  assert.doesNotMatch(text(table),/1 × Salt|1 × Light Hide/);
});

test('each craftable input has independent choices including leather made from scraps',()=>{
  const {document}=page();const detail=document.querySelector('#recipe-detail');
  find(detail,e=>e.tag==='button' && e.textContent==='Buy Cured Light Hide ready-made').listeners.click();
  find(detail,e=>e.tag==='button' && e.textContent==='Craft Light Leather').listeners.click();
  const table=find(detail,e=>e.tag==='table');
  assert.match(text(table),/30 × Ruined Leather Scraps/);
  assert.match(text(table),/1 × Cured Light Hide/);
  assert.doesNotMatch(text(table),/10 × Light Leather|1 × Salt|1 × Light Hide/);
  assert.match(text(find(detail,e=>e.className==='purchase-alternatives')),/Buy 30 × Ruined Leather Scraps at 9c each or less/);
  assert.equal(find(detail,e=>e.tag==='button' && e.textContent==='Buy Cured Light Hide ready-made').attributes['aria-pressed'],'true');
});
test('a scraps card opens the full matching pants route, rather than buying leather instead',()=>{
  const {document,context}=page();vm.runInContext('selectedMaterial="Ruined Leather Scraps";renderMaterials()',context);
  const detail=document.querySelector('#material-detail');
  const card=find(detail,e=>e.className==='material-recipe-card' && e.children[0].textContent==='Light Leather Pants');
  assert.match(text(card),/Buy 30 × Ruined Leather Scraps at 11c each or less/);
  find(card,e=>e.tag==='button').listeners.click();
  const recipe=document.querySelector('#recipe-detail');
  assert.match(text(find(recipe,e=>e.tag==='table')),/30 × Ruined Leather Scraps/);
  assert.equal(find(recipe,e=>e.tag==='button' && e.textContent==='Craft Light Leather').attributes['aria-pressed'],'true');
});

test('calculator fixes one entered price and solves the other without changing the Recipes view',()=>{
  const {document}=page();
  const before=text(document.querySelector('#recipe-detail'));
  const input=find(document.querySelector('#calculator-inputs'),e=>e.attributes['aria-label']==='Light Hide calculator price in copper');
  input.value='90';input.listeners.input();
  assert.match(document.querySelector('#calculator-status').textContent,/Buy 10 × Light Leather at 35c each or less/);
  assert.match(text(document.querySelector('#calculator-results')),/All purchases 5s 90c.*Profit per craft 9c/);
  assert.equal(text(document.querySelector('#recipe-detail')),before);
});
test('calculator entries survive live quote updates without rebuilding the price input',()=>{
  const {document,context}=page();
  const inputs=document.querySelector('#calculator-inputs');
  const input=find(inputs,e=>e.attributes['aria-label']==='Light Hide calculator price in copper');
  input.value='90';input.listeners.input();
  context.next={materials:{'Light Hide':{auctionCopper:4900,quantity:100,status:'available'},'Light Leather':{auctionCopper:50,quantity:100,status:'available'},Salt:{vendorCopper:50},'Fine Thread':{vendorCopper:100}}};
  vm.runInContext('applyAuctionPrices(next,"live")',context);
  assert.equal(find(inputs,e=>e.attributes['aria-label']==='Light Hide calculator price in copper'),input);
  assert.equal(input.value,'90');
  assert.match(document.querySelector('#calculator-status').textContent,/35c each or less/);
});
test('calculator ready-made and scraps routes preserve entered prices and ignore hidden raw inputs',()=>{
  const {document}=page();
  const route=document.querySelector('#calculator-route');
  find(route,e=>e.tag==='button' && e.textContent==='Buy Cured Light Hide ready-made').listeners.click();
  let inputs=document.querySelector('#calculator-inputs');
  const cured=find(inputs,e=>e.attributes['aria-label']==='Cured Light Hide calculator price in copper');
  cured.value='220';cured.listeners.input();
  assert.match(document.querySelector('#calculator-status').textContent,/10 × Light Leather at 27c each or less/);
  find(route,e=>e.tag==='button' && e.textContent==='Craft Light Leather').listeners.click();
  inputs=document.querySelector('#calculator-inputs');
  assert.match(text(inputs),/30 × Ruined Leather Scraps/);
  assert.match(document.querySelector('#calculator-status').textContent,/30 × Ruined Leather Scraps at 9c each or less/);
  assert.doesNotMatch(text(inputs),/1 × Salt|1 × Light Hide/);
});
test('calculator link copies the selected recipe route and Clear my prices restores a shared budget',()=>{
  const {document}=page();const detail=document.querySelector('#recipe-detail');
  find(detail,e=>e.tag==='button' && e.textContent==='Buy Cured Light Hide ready-made').listeners.click();
  find(detail,e=>e.tag==='button' && e.textContent==='Craft Light Leather').listeners.click();
  find(detail,e=>e.tag==='button' && e.textContent==='Try your own purchase prices').listeners.click();
  assert.equal(document.selectedTab,document.querySelector('#calculator-tab'));
  assert.match(text(document.querySelector('#calculator-inputs')),/30 × Ruined Leather Scraps/);
  document.querySelector('#calculator-use-quotes').listeners.click();
  assert.match(document.querySelector('#calculator-status').textContent,/exceed the purchase budget/);
  document.querySelector('#calculator-clear').listeners.click();
  assert.match(document.querySelector('#calculator-status').textContent,/blank material prices share/);
});
