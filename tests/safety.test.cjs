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
  'sSodiumContext','sodiumContextHint'])
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
assert(fs.readFileSync('i18n-sprint2.js','utf8').includes('"Умови тренування для оцінки натрію"'),
  'sodium exercise context has an English translation');
assert(html.includes('./i18n-adaptive.js'), 'adaptive translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-adaptive.js'), 'adaptive translations are cached offline');
assert(html.includes('./i18n-checkin.js'), 'check-in translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-checkin.js'), 'check-in translations are cached offline');
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
vm.runInContext(core + '\nglobalThis.api = {state, PRODUCTS, MEAL_COMPS, PRESETS, excludedSet, migrateExclusionState, migrateSettings, setPresetState, setManualExclusion, sanitizeProfile, calcTargets, calcWeight, categoryMatches, dietAllows, pool, selectList, menuPoolReport, medicalSafety, generationBlockReason, safeGenWeek, calcDay, genWeek, gramBounds, portionUnit, dayScore, qualityNutrients, qualityLimits, forecastRange, expectedWeightAt, normalizeWeightEntries, normalizeCheckins, recentCheckin, rollingWeightPoints, robustWeeklyRate, weightFeedback, swapAlternatives, applyClientSwap};', context);

const a = context.api;
const reset = () => {
  const fresh = vm.runInContext('DEFAULT_STATE()', context);
  Object.assign(a.state, fresh);
};
const close = (got, want, tolerance) => Math.abs(got - want) <= tolerance;

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
assert(!a.state.days.flat(2).some(c=>c.prodId==='p19'), 'a generated week never inserts standalone egg whites');

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
a.state.profile.diet = 'vegan';
assert(a.pool('protein').length >= 6, 'vegan protein pool has usable depth');
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
