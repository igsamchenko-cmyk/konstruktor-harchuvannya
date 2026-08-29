const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/);
if (!inline) throw new Error('Inline application script not found');
const marker = '/* ============ РЕНДЕР ============ */';
const core = inline[1].slice(0, inline[1].indexOf(marker));
const progressStart = inline[1].indexOf('const fmtW =');
const progressEnd = inline[1].indexOf('/* ============ ВИКЛЮЧЕННЯ: РЕНДЕР І ЛОГІКА ============ */');
assert(progressStart>0&&progressEnd>progressStart,'progress render source is discoverable');
const progressRender = inline[1].slice(progressStart,progressEnd);
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML ids remain unique');
for (const id of ['fDiet','healthScreen','safetyWarn','poolWarn','btnGenWeek','btnShareClient','wWaist','wAdaptive',
  'ciDate','ciAdherence','ciHunger','ciEnergy','ciPerformance','btnAddCheckin','ciLatest','ciList',
  'sSodiumContext','sodiumContextHint','btnAutoFit','autoFitMsg','productPicker','productPickerSearch','productPickerClose','productPickerList',
  'shopDetails','shopCount','macroBanner'])
  assert(ids.includes(id), 'required safety control exists: ' + id);
assert(/id="fAge" min="18"/.test(html), 'age input exposes the adult-only limit');
assert(html.includes('./i18n-safety.js'), 'safety translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-safety.js'), 'safety translations are cached offline');
assert(html.includes('./i18n-sprint2.js'), 'Sprint 2 translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-sprint2.js'), 'Sprint 2 translations are cached offline');
assert(html.includes('<details class="quality pro-only">'), 'detailed quality metrics are specialist-only and collapsed');
assert(/class="notice pro-only" id="macroWarn"/.test(html), 'technical macro warnings are specialist-only');
assert(fs.readFileSync('i18n-sprint2.js','utf8').includes('"Детальна оцінка якості раціону"'),
  'specialist quality disclosure has an English translation');
assert(html.includes('class="m-ring"'), 'macro summary uses large circular gauges');
assert(/viewport-fit=cover/.test(html), 'viewport includes safe-area support for foldable screens');
assert(/max-width:1240px/.test(html), 'wide screens use the expanded content width');
assert(/class="sitem"/.test(html), 'calorie legend uses stable non-wrapping items');
assert(html.includes('<details class="shop-details" id="shopDetails">') && !html.includes('<details class="shop-details" id="shopDetails" open>'),
  'the long shopping list is collapsed by default');
assert(html.includes("byId('shopCount').textContent") && html.includes("ukForm(itemCount,'позиція','позиції','позицій')"),
  'shopping menu reports item and category counts with localized plurals');
assert(html.includes('id="macroBanner"') && html.includes('src="./balanced-plate-banner-wide.jpg"') &&
  fs.existsSync('balanced-plate-banner-wide.jpg'),
  'the calculation panel uses a local static balanced-plate banner');
assert(!/@keyframes macroPlateFloat/.test(html) && !html.includes("setProperty('--macro-p'"),
  'the previous decorative macro animation and dynamic styling are removed');
assert(fs.readFileSync('sw.js','utf8').includes('./balanced-plate-banner-wide.jpg'),
  'the balanced-plate banner is available offline');
assert(html.includes('Рідину пийте регулярно протягом дня') && !html.includes("Воду п'ємо до 18:00"),
  'client-note placeholder gives sensible hydration timing');
const uiI18n = fs.readFileSync('i18n-ui.js','utf8');
assert(uiI18n.includes('Drink fluids regularly throughout the day') && !uiI18n.includes('Finish most fluids by 6 p.m.'),
  'hydration placeholder has a corrected English translation');
assert(/@media\(max-width:560px\)/.test(html) && /@media\(max-width:520px\)/.test(html) && /@media\(max-width:360px\)/.test(html),
  'closed foldable and narrow-phone layouts have dedicated breakpoints');
assert(/horizontal-viewport-segments:2/.test(html), 'dual-segment foldable layout avoids the hinge');
assert(fs.readFileSync('i18n-sprint2.js','utf8').includes('"Умови тренування для оцінки натрію"'),
  'sodium exercise context has an English translation');
assert(html.includes('./i18n-adaptive.js'), 'adaptive translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-adaptive.js'), 'adaptive translations are cached offline');
assert(html.includes('manual-choice-note'), 'manual repetition freedom is explained in the menu builder');
assert(html.includes('class="product-select-btn"') && !html.includes('class="selProd"'),
  'meal rows use the bounded custom product picker instead of an unbounded native select');
assert(/\.product-picker\{position:fixed/.test(html) && /max-height:min\(460px,calc\(100dvh - 24px\)\)/.test(html),
  'product picker is viewport-bound and scrollable');
assert(html.includes('function positionProductPicker()') && html.includes("productPickerSearch.addEventListener('input'"),
  'product picker supports viewport-aware placement and live search');
const adaptiveI18n = fs.readFileSync('i18n-adaptive.js','utf8');
assert(adaptiveI18n.includes('"Збалансоване меню · 3 дні"') && adaptiveI18n.includes('"Просте меню · 2 дні"'),
  'practical week-mode labels have English translations');
assert(adaptiveI18n.includes('"Збалансована тарілка з куркою, гречкою та овочами"') && adaptiveI18n.includes('"Відкрити список покупок"'),
  'static banner accessibility and shopping menu have English translations');
assert(html.includes('./i18n-checkin.js'), 'check-in translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-checkin.js'), 'check-in translations are cached offline');
assert(html.includes('./i18n-weighing.js'), 'weighing-guide translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-weighing.js'), 'weighing-guide translations are cached offline');
assert(fs.readFileSync('i18n-weighing.js','utf8').includes('"Як правильно зважувати продукти"'),
  'weighing guide has an English translation');
for(const id of ['btnWeighGuide','weighDialog','weighDialogClose','weighDialogSubject','weighScreen1','weighRuleText'])
  assert(ids.includes(id), 'required weighing-guide control exists: ' + id);
assert(html.includes('function weighTopicForProduct(p)') && html.includes("if(p.dish) return 'dish'") &&
  html.includes("if(p.ml) return 'liquid'") && html.includes("if(p.dry) return 'dry'") &&
  html.includes("if(p.raw) return 'raw'"), 'food metadata selects the matching weighing guide');
assert(html.includes('class="weigh-help-btn"') && html.includes("openWeighGuide(weighTopicForProduct(item?.p)"),
  'every rendered food row can open contextual weighing help');
assert(/@keyframes weighFrame/.test(html) && /prefers-reduced-motion:reduce/.test(html),
  'the weighing diagram is animated and respects reduced-motion preferences');
const weighingI18n = fs.readFileSync('i18n-weighing.js','utf8');
assert(html.includes('class="scale-unit">ОД.</span>') && html.includes('class="scale-power">ВВІМК./ТАРА</span>'),
  'the scale diagram uses common Ukrainian two-button labels');
assert(!html.includes('class="scale-tare"') && weighingI18n.includes('"ВВІМК./ТАРА":"ON/TARE"'),
  'the obsolete anonymous tare control is removed and the new labels are translated');
assert(html.includes('function nutritionHelp(kind,t)') && html.includes('function qualityMetricHelp(kind,t,highSweat=false)'),
  'nutrition and quality targets have contextual explanations');
assert(html.includes("setHelpTooltip(byId('tKcal2').closest('.tile')") &&
  html.includes("macroRow('protein','Білки'") && html.includes('quality-item ${cls} has-tooltip'),
  'target cards, macro rings and specialist quality metrics expose tooltips');
assert(html.includes("className='nutrition-tooltip'") && html.includes('function positionHelpTooltip(target)') &&
  html.includes("document.addEventListener('pointerover'") && html.includes("document.addEventListener('focusin'"),
  'one viewport-positioned tooltip supports pointer, keyboard and touch without card overlap');
assert(html.includes("!hasSideNeighbor('right')") && html.includes("!hasSideNeighbor('left')") &&
  html.includes('Math.max(pad,Math.min(rawLeft,viewW-box.width-pad))') &&
  html.includes("addEventListener('scroll',()=>{if(activeHelpTarget) closeHelpTooltip()"),
  'tooltips choose a free side, stay inside the viewport and close before detaching during scroll');
assert(html.includes('top:auto!important;right:10px') && html.includes('bottom:max(10px,env(safe-area-inset-bottom))'),
  'narrow and foldable phone layouts use a stable safe-area-aware bottom tooltip');
const swSource = fs.readFileSync('sw.js','utf8');
assert(swSource.includes('res.ok') && swSource.includes("res.type === 'basic'"),
  'service worker only runtime-caches successful same-origin app responses');
assert(fs.existsSync('.github/workflows/safety.yml'), 'GitHub Actions safety workflow exists');
const context = {
  console,
  setTimeout,
  clearTimeout,
  alert: () => {},
  window: { nutriLanguage: 'uk' },
  localStorage: { getItem: () => null, setItem: () => {} }
};
vm.createContext(context);
vm.runInContext('let __seed=123456789; Math.random=()=>((__seed=Math.imul(__seed,1664525)+1013904223>>>0)/4294967296);', context);
vm.runInContext(core + '\nglobalThis.api = {state, PRODUCTS, MEAL_COMPS, PRESETS, escHtml, sanitizeCustomProduct, addCustomProduct, removeCustomProducts, excludedSet, migrateExclusionState, migrateSettings, setPresetState, setManualExclusion, sanitizeProfile, calcTargets, calcWeight, categoryMatches, dietAllows, pool, selectList, menuPoolReport, medicalSafety, generationBlockReason, safeGenWeek, calcDay, genWeek, enforceWeeklyProductLimits, gramBounds, portionUnit, dayScore, simpleFitCandidates, simpleFitScore, fitSimpleDay, qualityNutrients, qualityLimits, forecastRange, expectedWeightAt, normalizeWeightEntries, normalizeCheckins, recentCheckin, rollingWeightPoints, robustWeeklyRate, weightFeedback, swapAlternatives, applyClientSwap};', context);

const a = context.api;
const reset = () => {
  const fresh = vm.runInContext('DEFAULT_STATE()', context);
  Object.assign(a.state, fresh);
};
const close = (got, want, tolerance) => Math.abs(got - want) <= tolerance;

reset();
a.removeCustomProducts();
const unsafe = a.addCustomProduct({
  i:'u_bad',
  c:'sweet',
  n:'<img src=x onerror=alert(1)> Дуже довга назва продукту, яка точно має обрізатися після шістдесяти символів',
  k:'450<script>',
  p:'bad',
  f:'15',
  cb:'70'
});
assert(unsafe, 'valid custom product can be imported after sanitization');
assert(!/[<>]/.test(unsafe.n) && unsafe.n.length <= 60, 'custom product names are stripped and length-limited');
assert.equal(unsafe.k, 450, 'custom calories are clamped through numeric parsing');
assert(a.escHtml('"><script>alert(1)</script>') === '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
  'HTML escaping covers quotes and tag delimiters');
a.removeCustomProducts();

reset();
a.state.settings.sodiumContext='invalid';
a.migrateSettings();
assert.equal(a.state.settings.sodiumContext,'standard','invalid sodium context migrates to the safe default');

reset();
a.state.profile.age = 14;
a.sanitizeProfile();
assert.equal(a.state.profile.age, 18, 'adult-only age floor');
assert(a.medicalSafety().blocked, 'an imported under-18 profile remains blocked after normalization');
a.state.profile.age = 30;
a.sanitizeProfile();
assert.equal(a.state.profile.ageRestricted, false, 'adult age clears the imported under-18 flag');

reset();
Object.assign(a.state.profile, {sex:'f', age:30, height:168, weight:70, lifestyle:0, training:0, goal:'loss'});
a.state.settings.lossRate = 1;
let t = a.calcTargets();
assert(t.pace.pct <= 25.0001, 'deficit is capped at 25% TDEE');
assert(t.realRate <= 0.7001, 'loss rate is capped at 1% body weight/week');
assert(t.belowBmr, 'below-BMR intake is surfaced for review');

reset();
Object.assign(a.state.profile, {sex:'m', age:39, height:174, weight:130, muscular:true, goal:'loss'});
a.state.settings.proteinPerKg = 2.4;
t = a.calcTargets();
assert(t.calcW < 130 && t.calcW > 25*1.74*1.74, 'athletic adjusted weight is softened');
assert(t.prot*4 <= t.kcal*0.35 + 4, 'protein cannot crowd out more than 35% energy');

reset();
Object.assign(a.state.profile, {sex:'f', age:28, height:170, weight:52, goal:'loss'});
assert(a.medicalSafety().blocked, 'underweight fat-loss profile is a medical stop');

reset();
a.state.profile.health.kidney = true;
assert(a.medicalSafety().blocked, 'kidney disease blocks automatic generation');
assert(/призупинено/.test(a.generationBlockReason()), 'medical hold has a clear reason');

reset();
const allProtein = a.PRODUCTS.filter(p => a.categoryMatches(p, 'protein') && !p.season && !p.dish).map(p => p.i);
a.setManualExclusion(allProtein, true);
assert.equal(a.pool('protein').length, 0, 'excluded protein foods are never silently restored');
assert(a.menuPoolReport().empty.length > 0, 'empty category is reported');

reset();
assert(!a.pool('protein').some(p=>p.i==='p19'), 'egg whites are not selected automatically as main protein');
assert(!a.pool('snackProtein').some(p=>p.i==='p19'), 'egg whites are not selected automatically as snack protein');
assert(a.selectList('protein').some(p=>p.i==='p19'), 'egg whites remain available for deliberate manual selection');
a.genWeek();
const manualProteinIds = a.selectList('protein').map(p=>p.i).sort();
const manualSnackProteinIds = a.selectList('snackProtein').map(p=>p.i).sort();
assert.deepEqual(manualSnackProteinIds, manualProteinIds,
  'every manual protein slot exposes the same product list');
assert(a.selectList('protein').some(p=>p.i==='d02'),
  'the shared manual protein list includes practical dairy snack proteins');
assert(!a.pool('snackProtein').some(p=>p.i==='p01'),
  'automatic snacks keep their practical narrower protein pool');

assert(!a.state.days.flat(2).some(c=>c.prodId==='p19'), 'a generated week never inserts standalone egg whites');

reset();
assert.equal(a.state.settings.weekMode, 'rot3', 'new profiles default to the balanced three-menu week');
delete a.state.settings.weekMode;
a.migrateSettings();
assert.equal(a.state.settings.weekMode, 'rot3', 'legacy profiles without a week mode migrate to balanced');

reset();
a.setPresetState('vegetarian', true);
assert(a.state.settings.activePresets.includes('vegetarian'), 'preset state is explicit');
assert(a.excludedSet().has('p09'), 'vegetarian preset excludes fish');
a.setPresetState('fish', false);
assert(a.excludedSet().has('p09'), 'disabling an overlapping inactive preset does not undo vegetarian exclusions');
a.setPresetState('vegetarian', false);
assert.equal(a.excludedSet().size, 0, 'disabling a preset removes all exclusions introduced by it');

reset();
a.setPresetState('vegetarian', true);
a.setPresetState('gluten', true);
a.setPresetState('vegetarian', false);
for(const id of a.PRESETS.gluten) assert(a.excludedSet().has(id), 'another active preset keeps its exclusions');
assert(!a.excludedSet().has('p01'), 'products unique to the disabled preset are restored');

reset();
a.setManualExclusion(['p01'], true);
a.setPresetState('vegetarian', true);
a.setPresetState('vegetarian', false);
assert(a.excludedSet().has('p01'), 'manual exclusion survives preset removal');

reset();
a.setPresetState('vegetarian', true);
a.setManualExclusion(['p01'], false);
assert(!a.excludedSet().has('p01'), 'an individual product can be restored inside an active preset');
assert(a.state.settings.activePresets.includes('vegetarian'), 'individual restore keeps preset active');

reset();
const legacy = a.PRESETS.vegetarian.filter(id => !a.PRESETS.fish.includes(id));
a.state.settings = Object.assign({}, a.state.settings, {excluded:legacy});
delete a.state.settings.activePresets;
delete a.state.settings.manualExcluded;
delete a.state.settings.includedOverrides;
a.migrateExclusionState();
assert(a.state.settings.activePresets.includes('vegetarian'), 'legacy partial preset is recovered');
assert(!a.excludedSet().has('p09'), 'legacy products restored by the user remain restored');
a.setPresetState('vegetarian', false);
assert.equal(a.excludedSet().size, 0, 'legacy partial preset can be fully cleared after migration');

reset();
const unavailableIds = new Set([
  'p06','p16','p17','p25','p26','p27','p28','p40',
  'p22','vp01','vp02','vp03','vp04','vp05','vp06','c06','c12','d07','d11','d12','f10','f12','f15','f16','f17','f18','f20',
  'v15','v25','v26','v29','v30','v31','v32','r24','r25','r26','r27','r28','r29','s14','s33','s34'
]);
const unavailableNames = /Кролик|Креветки|Кальмар|Товстолобик|^Сом$|Горбуша|Ковбаса|Сосиски|Тушонка|перепелині|Тофу|Темпе|Сейтан|Едамаме|соєв|Кіноа|Батат|Айран|Простокваша|козяче|чіа|Авокадо|Сало|Смалець|Олія лляна|Олія гарбузова|Кунжут|Спаржа|Редька|Патисон|Гриби білі|Лисички|Опеньки|мариновані|Аґрус|Ожина|Журавлина|Обліпиха|Калина|Айва|Інжир|Сушені банани|Пахлава|Макарон(?!и)/i;
assert(!a.PRODUCTS.some(p => unavailableIds.has(p.i) || unavailableNames.test(p.n)),
  'hard-to-buy exotic products are removed from the visible food database');
assert(!a.selectList('protein').some(p => unavailableIds.has(p.i) || unavailableNames.test(p.n)),
  'protein selector contains no removed exotic products');
assert(!a.simpleFitCandidates('protein').some(p => unavailableIds.has(p.i) || unavailableNames.test(p.n)),
  'simple-food fitting contains no removed exotic products');
const uaEverydayIds = ['p37','p38','p39','p08','p30','p31','p32','c29','c30','c31','c32',
  'd14','d15','d16','d17','f27','v35','v36','v37','v38','r32','r33'];
for(const id of uaEverydayIds)
  assert(a.PRODUCTS.some(p=>p.i===id), 'expanded Ukrainian grocery base contains ' + id);
for(const id of ['p08','p30','p31','p32']){
  const item=a.PRODUCTS.find(p=>p.i===id);
  assert(item.manualOnly, id + ' remains a deliberate manual choice');
  assert(a.selectList('protein').some(p=>p.i===id), id + ' is searchable in manual protein choices');
  assert(!a.pool('protein').some(p=>p.i===id), id + ' is never inserted automatically');
}
assert(a.PRESETS.fish.includes('p38') && a.PRESETS.vegetarian.includes('p38'),
  'new fish respects fish and vegetarian exclusions');
assert(['p39','d14','d15','d16','d17','f27'].every(id=>a.PRESETS.lactose.includes(id)),
  'new dairy foods respect the lactose exclusion');
assert(a.PRESETS.gluten.includes('c30'), 'regular pasta respects the gluten exclusion');

reset();
a.state.profile.diet = 'vegan';
assert(a.pool('protein').length >= 4, 'vegan protein pool keeps accessible legume options');
assert(a.pool('snackProtein').length >= 3, 'vegan snack-protein pool has usable depth');
const veganSweets = a.pool('sweet').filter(p=>p.c==='sweet');
assert(veganSweets.length >= 8, 'vegan sweet pool has explicit sweet products, not just fruit fallback');
for (const p of a.pool('protein')) assert(a.dietAllows(p), 'vegan pool contains only explicitly allowed foods');
a.genWeek();
for (let d=0; d<7; d++) {
  const day = a.calcDay(d);
  for (const meal of day.meals) for (const item of meal.items) {
    assert(a.dietAllows(item.p), 'generated vegan day contains no animal product');
  }
}

reset();
for (const p of a.PRODUCTS) {
  const q = a.qualityNutrients(p);
  for (const key of ['na','sf','sug'])
    assert(Number.isFinite(q[key]) && q[key] >= 0, p.i + ': quality nutrient ' + key + ' is covered');
}
assert(a.qualityNutrients(a.PRODUCTS.find(p=>p.i==='p23')).na > 1000, 'salted herring is surfaced as high sodium');
assert(a.qualityNutrients(a.PRODUCTS.find(p=>p.i==='f03')).sf > a.qualityNutrients(a.PRODUCTS.find(p=>p.i==='f01')).sf,
  'butter has more saturated fat than olive oil');
assert(a.qualityNutrients(a.PRODUCTS.find(p=>p.i==='s06')).sug > 50, 'honey is counted toward free sugars');
assert(a.qualityNutrients(a.PRODUCTS.find(p=>p.i==='s51')).sug > 9, 'sweet soda is counted toward free sugars');

const cola = a.PRODUCTS.find(p=>p.i==='s51');
assert.equal(a.portionUnit(cola), 'мл', 'drinks use milliliters as their portion unit');
assert.deepEqual(a.gramBounds(cola), [150,600], 'soft drinks have drink-sized portion bounds');
assert(a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:3600}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}) >
  a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:1800}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}),
  'sodium excess is a one-sided day-score penalty');
assert(a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:1800,sf:35,sug:20}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}) >
  a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:1800,sf:15,sug:20}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}),
  'saturated fat excess is part of day scoring');
assert(a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:1800,sf:15,sug:80}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}) >
  a.dayScore({k:1800,p:120,f:60,c:190,fb:25,na:1800,sf:15,sug:20}, {kcal:1800,prot:120,fat:60,carb:190,fib:25}),
  'free sugar excess is part of day scoring');

reset();
a.state.days = Array.from({length:7}, () => [[{mealId:'l',prodId:'p15',customG:null}]]);
a.enforceWeeklyProductLimits();
const tunaDays = a.state.days.filter(day => day.flat().some(c => c.prodId==='p15')).length;
assert(tunaDays <= 2, 'weekly product limits cap canned tuna to two days');

reset();
a.genWeek();
const simpleFatIds = new Set(['f02','f01','f03','f04','f21','f05','f07']);
for (const meal of a.state.days[0]) meal.forEach((comp, ci) => {
  if (a.MEAL_COMPS[comp.mealId][ci].cat === 'fat') {
    comp.prodId = 'f07';
    comp.customG = 5;
  }
});
const simpleBefore = a.calcDay(0), simpleTarget = a.calcTargets();
const simpleResult = a.fitSimpleDay(0);
assert(simpleResult.changed, 'simple-food fit improves an imbalanced day');
assert(a.simpleFitScore(a.calcDay(0), simpleTarget) < a.simpleFitScore(simpleBefore, simpleTarget),
  'simple-food fit lowers the target deviation score');
const fittedFatIds = [];
for (const meal of a.state.days[0]) meal.forEach((comp, ci) => {
  if (a.MEAL_COMPS[comp.mealId][ci].cat === 'fat') fittedFatIds.push(comp.prodId);
});
assert(fittedFatIds.some(id => simpleFatIds.has(id)), 'simple-food fit uses common fats first');
assert(a.simpleFitCandidates('fat').every(p => simpleFatIds.has(p.i)), 'fat fitting candidates exclude chia and exotic fats');

reset();
const veg = a.PRODUCTS.find(p=>p.i==='v01');
const normalBounds = a.gramBounds(veg);
a.state.settings.foodVolume = 'compact';
const compactBounds = a.gramBounds(veg);
assert(compactBounds[1] < normalBounds[1], 'compact mode lowers high-volume food ceiling');

reset();
Object.assign(a.state.profile, {goal:'loss',weight:85});
const ft = a.calcTargets();
const f4 = a.forecastRange(ft,4), f12 = a.forecastRange(ft,12);
assert(f4.lo < f4.hi, 'forecast is a range rather than a point');
assert(f12.hi-f12.lo > f4.hi-f4.lo, 'forecast uncertainty widens over time');

const weightSeries=(rate,weeks=4)=>{
  const noise=[0,0.08,-0.06,0.04,-0.03,0.02,-0.04,0.05,-0.02,0];
  const out=[];
  for(let d=0,i=0;d<=weeks*7;d+=3,i++){
    const iso=new Date(Date.UTC(2026,0,1)+d*86400000).toISOString().slice(0,10);
    out.push({d:iso,w:85+rate*d/7+noise[i%noise.length],waist:92-rate*d/14});
  }
  return out;
};
const checkinFor=(weights,patch={})=>[{d:weights[weights.length-1].d,adherence:90,hunger:3,energy:3,performance:3,...patch}];
reset();
Object.assign(a.state.profile,{sex:'m',age:39,height:174,weight:85,goal:'loss'});
a.state.settings.lossRate=0.35;
const trendTarget=a.calcTargets();
const slowWeights=weightSeries(-0.10);
const slowFeedback=a.weightFeedback(slowWeights,trendTarget,checkinFor(slowWeights));
assert(slowFeedback.mature, 'four weeks of regular weigh-ins are enough for adaptive feedback');
assert.equal(slowFeedback.code,'lower','slower-than-planned loss suggests a modest calorie reduction');
assert(slowFeedback.adjustment===-100||slowFeedback.adjustment===-150,'adaptive reduction is capped to a small step');
const onTrack=a.weightFeedback(weightSeries(-trendTarget.realRate),trendTarget);
assert.equal(onTrack.code,'onTrack','matching the expected trend does not trigger a change');
assert.equal(onTrack.adjustment,0,'on-track trend keeps calories unchanged');
assert(!a.weightFeedback(weightSeries(-0.10,1),trendTarget).ready,'one week never triggers adaptive feedback');
assert.equal(a.weightFeedback(slowWeights,trendTarget,[]).code,'checkinNeeded','off-track trend waits for a fresh weekly check-in');
const staleCheckin=checkinFor(slowWeights); staleCheckin[0].d=slowWeights[slowWeights.length-6].d;
assert.equal(a.weightFeedback(slowWeights,trendTarget,staleCheckin).code,'checkinNeeded','a check-in older than ten days is stale');
assert.equal(a.weightFeedback(slowWeights,trendTarget,checkinFor(slowWeights,{adherence:65})).code,'adherenceReview',
  'low adherence blocks a misleading calorie reduction');
assert.equal(a.weightFeedback(slowWeights,trendTarget,checkinFor(slowWeights,{hunger:5,energy:2,performance:2})).code,'recoveryReview',
  'poor recovery blocks a deeper deficit');
const cleanCheckins=a.normalizeCheckins([{d:'2026-01-01',adherence:140,hunger:0,energy:9,performance:3},
  {d:'bad',adherence:90,hunger:3,energy:3,performance:3}]);
assert.equal(cleanCheckins.length,1,'invalid check-in dates are removed');
assert.deepEqual([cleanCheckins[0].adherence,cleanCheckins[0].hunger,cleanCheckins[0].energy],[100,1,5],
  'check-in scales are normalized to safe bounds');
const rolling=a.rollingWeightPoints(weightSeries(-0.10),7);
assert(rolling.length>=9&&Number.isFinite(a.robustWeeklyRate(rolling)),'rolling trend and robust slope are available');
assert(rolling.some(x=>x.waist!=null),'waist measurements survive trend normalization');
const fastWeights=weightSeries(-1.2);
const fastFeedback=a.weightFeedback(fastWeights,trendTarget,[]);
assert.equal(fastFeedback.code,'raise','too-fast loss can suggest a protective calorie increase without waiting for check-in');
assert(fastFeedback.overFastLoss,'loss faster than 1% body weight/week is flagged');
const longBand=a.expectedWeightAt(85,84,trendTarget),shortBand=a.expectedWeightAt(85,28,trendTarget);
assert(longBand.hi-longBand.lo>shortBand.hi-shortBand.lo,'expected weight corridor widens over time');

reset();
Object.assign(a.state.profile,{sex:'f',age:30,height:168,weight:70,lifestyle:0,training:0,goal:'loss'});
a.state.settings.lossRate=1;
const lowEnergyTarget=a.calcTargets();
assert(lowEnergyTarget.belowBmr,'safety scenario is below estimated BMR');
const guarded=a.weightFeedback(weightSeries(0),lowEnergyTarget);
assert.equal(guarded.code,'safetyReview','slow loss below BMR is routed to review, not a deeper deficit');
assert.equal(guarded.adjustment,0,'no automatic downward calorie suggestion near the safety floor');

/* Execute the actual SVG renderer against a minimal DOM, not just its math. */
const renderEls=new Map(['wSummary','wAdaptive','wList','wChart','ciLatest','ciList'].map(id=>[id,{innerHTML:''}]));
context.document={getElementById:id=>renderEls.get(id)||{innerHTML:''}};
context.numR=x=>Number(x).toFixed(2).replace(/0$/,'').replace('.',',');
vm.runInContext(progressRender,context);
reset();
Object.assign(a.state.profile,{sex:'m',age:39,height:174,weight:85,goal:'loss'});
a.state.settings.lossRate=0.35;
a.state.weights=slowWeights;
a.state.checkins=checkinFor(slowWeights);
vm.runInContext('renderWeight()',context);
const chartHtml=renderEls.get('wChart').innerHTML, adaptiveHtml=renderEls.get('wAdaptive').innerHTML;
assert(chartHtml.includes('<svg')&&chartHtml.includes('expected-band'),'progress renderer draws the expected range');
assert(chartHtml.includes('trend-line')&&chartHtml.includes('waist-line'),'progress renderer draws weight and waist trends');
assert(adaptiveHtml.includes('Орієнтир для спеціаліста'),'progress renderer shows the adaptive recommendation');
assert(renderEls.get('ciLatest').innerHTML.includes('90%'),'progress renderer shows the latest weekly check-in');
assert(!/NaN|undefined/.test(chartHtml+adaptiveHtml),'progress renderer emits no invalid values');

reset();
a.genWeek();
a.state.ui.mode = 'client';
let swapCase = null, built = a.calcDay(0);
for(let mi=0; mi<built.meals.length && !swapCase; mi++) for(let ci=0; ci<built.meals[mi].items.length; ci++){
  const opts = a.swapAlternatives(built,mi,ci,3);
  if(opts.length) swapCase={mi,ci,opt:opts[0],before:built.meals[mi].items[ci].p.i};
}
assert(swapCase, 'client receives an equivalent swap option');
assert(a.applyClientSwap(swapCase.mi,swapCase.ci,swapCase.opt.p.i), 'client swap is applied');
const swapped = a.calcDay(0);
assert.notEqual(swapped.meals[swapCase.mi].items[swapCase.ci].p.i, swapCase.before, 'food actually changes');
assert(Math.abs(swapped.tot.k-swapped.targets.kcal)/swapped.targets.kcal <= 0.10, 'swap keeps daily calories within 10%');

function volumeSimulation(mode, seed){
  reset();
  Object.assign(a.state.profile, {sex:'f',age:34,height:168,weight:68,goal:'maintain',diet:'omnivore'});
  a.state.settings.foodVolume=mode;
  vm.runInContext(`__seed=${seed}`, context);
  let produceG=0, macroOk=0, count=0;
  for(let week=0;week<6;week++){
    a.genWeek();
    for(let d=0;d<7;d++){
      const day=a.calcDay(d), target=day.targets;
      for(const meal of day.meals) for(const item of meal.items)
        if(!item.p.dish && (item.p.c==='veg' || item.p.c==='fruit')) produceG+=item.g;
      if(['k','p','f'].every(key=>{
        const want=key==='k'?target.kcal:key==='p'?target.prot:target.fat;
        return close(day.tot[key],want,want*0.10);
      })) macroOk++;
      count++;
    }
  }
  return {produceG:produceG/count,macroPct:macroOk/count};
}
const normalVolume=volumeSimulation('normal',246813579);
const compactVolume=volumeSimulation('compact',246813579);
assert(compactVolume.produceG < normalVolume.produceG*0.85, 'compact mode materially lowers produce volume');
assert(compactVolume.macroPct >= 0.95, 'compact mode preserves macro quality on at least 95% of days');

const profiles = [
  {sex:'f',age:25,height:164,weight:55,goal:'maintain',diet:'omnivore'},
  {sex:'f',age:38,height:168,weight:96,goal:'loss',diet:'omnivore'},
  {sex:'m',age:39,height:174,weight:85,goal:'maintain',diet:'omnivore',muscular:true},
  {sex:'m',age:52,height:182,weight:118,goal:'loss',diet:'omnivore'},
  {sex:'f',age:31,height:170,weight:68,goal:'gain',diet:'vegetarian'},
  {sex:'f',age:29,height:166,weight:64,goal:'maintain',diet:'vegan'}
];
/* Keep the long simulation reproducible even when focused tests above add generators. */
vm.runInContext('__seed=123456789', context);
const weeksPerProfile = Math.max(1, +(process.env.NUTRI_TEST_WEEKS || 10));
let days = 0, macroPass = 0, coreProteinPass = 0, snackProteinPass = 0, automaticEggWhites = 0;
const byProfile = [];
for (const profile of profiles) {
  reset();
  Object.assign(a.state.profile, profile);
  const row = {profile: profile.sex+'-'+profile.goal+'-'+profile.diet, days:0, macro:0, core:0, snack:0,
    k:0,p:0,f:0,c:0, dev:{k:0,p:0,f:0,c:0}};
  for (let week=0; week<weeksPerProfile; week++) {
    a.genWeek();
    automaticEggWhites += a.state.days.flat(2).filter(c=>c.prodId==='p19').length;
    for (let d=0; d<7; d++) {
      const day = a.calcDay(d), target = day.targets;
      const macroOk = ['k','p','f'].every(key => {
        const want = key==='k' ? target.kcal : key==='p' ? target.prot : target.fat;
        return close(day.tot[key], want, want*0.10);
      });
      for(const key of ['k','p','f','c']){
        const want = key==='k' ? target.kcal : key==='p' ? target.prot : key==='f' ? target.fat : target.carb;
        const dev = Math.abs(day.tot[key]-want)/Math.max(1,want);
        if(dev<=0.10) row[key]++;
        row.dev[key]+=dev;
      }
      if (macroOk) { macroPass++; row.macro++; }
      const coreMeals = day.meals.filter(m => ['b','l','d'].includes(m.def.id));
      const snacks = day.meals.filter(m => ['s1','s2'].includes(m.def.id));
      if (coreMeals.every(m => m.tot.p >= 18)) { coreProteinPass++; row.core++; }
      if (!snacks.length || snacks.every(m => m.tot.p >= 10)) { snackProteinPass++; row.snack++; }
      days++; row.days++;
    }
  }
  byProfile.push(row);
}
const report = {
  days,
  weeksPerProfile,
  macroPassPct: +(macroPass/days*100).toFixed(2),
  coreProteinPassPct: +(coreProteinPass/days*100).toFixed(2),
  snackProteinPassPct: +(snackProteinPass/days*100).toFixed(2),
  automaticEggWhites,
  foodVolume: {
    normalProduceG: +normalVolume.produceG.toFixed(1),
    compactProduceG: +compactVolume.produceG.toFixed(1),
    reductionPct: +((1-compactVolume.produceG/normalVolume.produceG)*100).toFixed(1),
    compactMacroPct: +(compactVolume.macroPct*100).toFixed(2)
  },
  byProfile: byProfile.map(x=>({
    profile:x.profile,
    macroPct:+(x.macro/x.days*100).toFixed(2),
    corePct:+(x.core/x.days*100).toFixed(2),
    snackPct:+(x.snack/x.days*100).toFixed(2),
    nutrientPct:Object.fromEntries(['k','p','f','c'].map(k=>[k,+(x[k]/x.days*100).toFixed(2)])),
    meanAbsDevPct:Object.fromEntries(['k','p','f','c'].map(k=>[k,+(x.dev[k]/x.days*100).toFixed(2)]))
  }))
};
console.log(JSON.stringify(report, null, 2));
assert(macroPass/days >= 0.98, 'at least 98% of simulated days keep calories/protein/fat within ±10%');
assert(coreProteinPass/days >= 0.95, 'at least 95% of days keep all core meals at 18+ g protein');
assert(snackProteinPass/days >= 0.90, 'at least 90% of days keep snacks at 10+ g protein');
assert.equal(automaticEggWhites, 0, 'standalone egg whites never appear in the full automatic simulation');
for (const row of byProfile) {
  const macroFloor = row.profile.endsWith('-vegan') ? 0.95 : 0.98;
  assert(row.macro/row.days >= macroFloor, row.profile + ': macro quality floor');
  assert(row.core/row.days >= 0.95, row.profile + ': core-meal protein quality must reach 95%');
  assert(row.snack/row.days >= 0.90, row.profile + ': snack protein quality must reach 90%');
  for(const key of ['k','p','f','c'])
    assert(row[key]/row.days >= 0.95, row.profile + ': '+key+' quality must reach 95%');
}
