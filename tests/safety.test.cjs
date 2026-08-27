const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const inline = html.match(/<script>([\s\S]*?)<\/script>/);
if (!inline) throw new Error('Inline application script not found');
const marker = '/* ============ РЕНДЕР ============ */';
const core = inline[1].slice(0, inline[1].indexOf(marker));
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML ids remain unique');
for (const id of ['fDiet','healthScreen','safetyWarn','poolWarn','btnGenWeek','btnShareClient'])
  assert(ids.includes(id), 'required safety control exists: ' + id);
assert(/id="fAge" min="18"/.test(html), 'age input exposes the adult-only limit');
assert(html.includes('./i18n-safety.js'), 'safety translations are loaded');
assert(fs.readFileSync('sw.js','utf8').includes('./i18n-safety.js'), 'safety translations are cached offline');
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
vm.runInContext(core + '\nglobalThis.api = {state, PRODUCTS, MEAL_COMPS, sanitizeProfile, calcTargets, calcWeight, categoryMatches, dietAllows, pool, menuPoolReport, medicalSafety, generationBlockReason, safeGenWeek, calcDay, genWeek};', context);

const a = context.api;
const reset = () => {
  const fresh = vm.runInContext('DEFAULT_STATE()', context);
  Object.assign(a.state, fresh);
};
const close = (got, want, tolerance) => Math.abs(got - want) <= tolerance;

reset();
a.state.profile.age = 14;
a.sanitizeProfile();
assert.equal(a.state.profile.age, 18, 'adult-only age floor');
assert(a.medicalSafety().blocked, 'an imported under-18 profile remains blocked after normalization');

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
a.state.profile.health.kidney = true;
assert(a.medicalSafety().blocked, 'kidney disease blocks automatic generation');
assert(/призупинено/.test(a.generationBlockReason()), 'medical hold has a clear reason');

reset();
const allProtein = a.PRODUCTS.filter(p => a.categoryMatches(p, 'protein') && !p.season && !p.dish).map(p => p.i);
a.state.settings.excluded = allProtein;
assert.equal(a.pool('protein').length, 0, 'excluded protein foods are never silently restored');
assert(a.menuPoolReport().empty.length > 0, 'empty category is reported');

reset();
a.state.profile.diet = 'vegan';
assert(a.pool('protein').length >= 6, 'vegan protein pool has usable depth');
assert(a.pool('snackProtein').length >= 3, 'vegan snack-protein pool has usable depth');
for (const p of a.pool('protein')) assert(a.dietAllows(p), 'vegan pool contains only explicitly allowed foods');
a.genWeek();
for (let d=0; d<7; d++) {
  const day = a.calcDay(d);
  for (const meal of day.meals) for (const item of meal.items) {
    assert(a.dietAllows(item.p), 'generated vegan day contains no animal product');
  }
}

const profiles = [
  {sex:'f',age:25,height:164,weight:55,goal:'maintain',diet:'omnivore'},
  {sex:'f',age:38,height:168,weight:96,goal:'loss',diet:'omnivore'},
  {sex:'m',age:39,height:174,weight:85,goal:'maintain',diet:'omnivore',muscular:true},
  {sex:'m',age:52,height:182,weight:118,goal:'loss',diet:'omnivore'},
  {sex:'f',age:31,height:170,weight:68,goal:'gain',diet:'vegetarian'},
  {sex:'f',age:29,height:166,weight:64,goal:'maintain',diet:'vegan'}
];
const weeksPerProfile = Math.max(1, +(process.env.NUTRI_TEST_WEEKS || 10));
let days = 0, macroPass = 0, coreProteinPass = 0, snackProteinPass = 0;
const byProfile = [];
for (const profile of profiles) {
  reset();
  Object.assign(a.state.profile, profile);
  const row = {profile: profile.sex+'-'+profile.goal+'-'+profile.diet, days:0, macro:0, core:0, snack:0,
    k:0,p:0,f:0,c:0, dev:{k:0,p:0,f:0,c:0}};
  for (let week=0; week<weeksPerProfile; week++) {
    a.genWeek();
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
for (const row of byProfile) {
  const macroFloor = row.profile.endsWith('-vegan') ? 0.95 : 0.98;
  assert(row.macro/row.days >= macroFloor, row.profile + ': macro quality floor');
  assert(row.core/row.days >= 0.95, row.profile + ': core-meal protein quality must reach 95%');
  assert(row.snack/row.days >= 0.90, row.profile + ': snack protein quality must reach 90%');
  for(const key of ['k','p','f','c'])
    assert(row[key]/row.days >= 0.95, row.profile + ': '+key+' quality must reach 95%');
}
