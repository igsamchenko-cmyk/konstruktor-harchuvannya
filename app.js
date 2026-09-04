/* ============ СТРУКТУРА ПРИЙОМІВ ЇЖІ ============ */
/* share — частка добової калорійності; comps — категорія + частка калорій прийому */
const MEAL_PLANS = {
  3:[ {id:'b', name:'Сніданок', share:0.30},
      {id:'l', name:'Обід',     share:0.40},
      {id:'d', name:'Вечеря',   share:0.30} ],
  4:[ {id:'b', name:'Сніданок', share:0.25},
      {id:'s1',name:'Перекус',  share:0.10},
      {id:'l', name:'Обід',     share:0.35},
      {id:'d', name:'Вечеря',   share:0.30} ],
  5:[ {id:'b', name:'Сніданок', share:0.25},
      {id:'s1',name:'Перекус 1',share:0.10},
      {id:'l', name:'Обід',     share:0.30},
      {id:'s2',name:'Перекус 2',share:0.10},
      {id:'d', name:'Вечеря',   share:0.25} ]
};
const MEAL_COMPS = {
  b: [ {cat:'carb',  sh:0.40}, {cat:'protein',sh:0.35}, {cat:'fat',sh:0.10}, {cat:'fruit',sh:0.15} ],
  s1:[ {cat:'snackProtein',sh:0.55}, {cat:'fruit',sh:0.30}, {cat:'fat',sh:0.15} ],
  s2:[ {cat:'snackProtein',sh:0.60}, {cat:'fruit',sh:0.40} ],
  l: [ {cat:'protein',sh:0.35},{cat:'carb',   sh:0.35}, {cat:'veg',sh:0.13}, {cat:'fat',sh:0.17} ],
  d: [ {cat:'protein',sh:0.35},{cat:'carb',   sh:0.28}, {cat:'veg',sh:0.22}, {cat:'fat',sh:0.15} ],
  sw:[ {cat:'sweet', sh:1} ]
};
/* план прийомів з урахуванням смаколика: його частка "відкушується"
   пропорційно від усіх основних прийомів (гнучка дієта 80/20) */
function getPlan(){
  const base = MEAL_PLANS[state.settings.meals];
  const s = (state.settings.sweetPct||0)/100;
  if(!s) return base;
  return base.map(m=>({...m, share:m.share*(1-s)}))
             .concat([{id:'sw', name:'Смаколик', share:s}]);
}
/* межі грамів на порцію (реалістичні розміри порцій) */
let PORTION_SCALE = 1;   /* росте для висококалорійних програм */
/* Стеля порції росте разом із калорійністю програми лише там, де це природно:
   більше каші, м'яса, гарніру. Огірків на 3000 ккал не їдять удвічі більше,
   ніж на 1600 — овочі, фрукти, жири та смаколики не масштабуємо. */
const SCALABLE = {carb:1, protein:1, dish:1, dairy:1};
function gramBounds(p){
  const [lo,hi] = rawBounds(p);
  const sc = SCALABLE[p.dish ? 'dish' : p.c] ? PORTION_SCALE : 1;
  if(state.settings.foodVolume==='compact' && !p.dish && (p.c==='veg' || (p.c==='fruit' && p.k<150)))
    return [Math.max(40,Math.round(lo*0.7)), Math.min(180,Math.round(hi*0.72))];
  return [lo, Math.min(p.ml?750:500, Math.round(hi*sc))];  /* абсолютна стеля порції */
}
function rawBounds(p){
  if(p.gb) return p.gb;                              /* ручне уточнення */
  if(p.ml) return p.k>=60 ? [100,350] : [150,600];    /* напої */
  if(p.dish) return p.k<100 ? [150,450] : [80,350];  /* супи vs другі страви */
  switch(p.c){
    case 'veg':   return p.season ? [5,40] : [80,280];
    case 'fruit': return p.k>150 ? [15,60] : [80,350];   /* сухофрукти — малі порції */
    case 'dairy': return p.add ? [15,80] : (p.k>=100 ? [40,200] : [80,400]);
    case 'fat':   return p.k>=400 ? [7,60]              /* олії, горіхи, насіння */
                       : p.k>=200 ? [15,80]             /* тверді сири, бринза */
                       : [25,150];                      /* авокадо, оливки */
    case 'protein':return [50,300];
    case 'sweet': return p.k>=400 ? [15,100] : [30,250];
    case 'carb':  return p.k>=250 ? [20,150] : [60,400]; /* сухі крупи vs варене/хліб */
    default:      return [10,500];
  }
}

/* ============ ВИКЛЮЧЕННЯ: НАБОРИ ПРЕСЕТІВ ============ */
const PRESETS = {
  fish: ['p09','p10','p11','p12','p13','p14','p15','p23','p24','p29','p38','m17'],
  vegetarian: ['p01','p02','p03','p04','p05','p07','p09','p10','p11','p12','p13','p14','p15',
    'p08','p23','p24','p29','p30','p31','p32','p33','p34','p35','p36','p37','p38',
    'm01','m07','m09','m10','m11','m12','m17','m18'],
  lactose: ['d01','d02','d03','d04','d05','d06','d08','d09','d10','d13','d14','d15','d16','d17','p20','p21','p39',
    'f03','f13','f23','f24','f25','f26','f27','s02','s09','s11','s16','s17','s24','s25','s26','s27','s28','s29','s30','s31','s32','s35','s36',
    's37','s38','s39','s40','s41','s42','s44','s45','s46','s48','s49','s60','s61','m04','m08','m14','m15'],
  gluten: ['c04','c05','c08','c09','c10','c13','c14','c15','c20','c22','c23','c25','c26','c27','c30',
    's08','s10','s13','s20','s21','s22','s23','s25','s26','s27','s28','s29','s30','s31','s32','s35','s36',
    's39','s40','s43','s48','m03','m04','m05','m06','m14','m18']
};

/* Пресети, ручні виключення та точкові повернення зберігаються окремо.
   Інакше перетини наборів (наприклад, «вегетаріанське» містить увесь набір
   «без риби») роблять неможливим коректне вимкнення одного фільтра. */
function hasExclusionState(){
  const s=state.settings||{};
  return Array.isArray(s.activePresets) && Array.isArray(s.manualExcluded) && Array.isArray(s.includedOverrides);
}
function syncExcludedSettings(){
  const s=state.settings;
  const ex=new Set(s.manualExcluded||[]);
  for(const name of s.activePresets||[]) for(const id of PRESETS[name]||[]) ex.add(id);
  for(const id of s.includedOverrides||[]) ex.delete(id);
  s.excluded=[...ex]; /* сумісність зі старими файлами та клієнтськими посиланнями */
  return ex;
}
let EXCLUSION_CACHE = {sig:'', set:null};
function exclusionSignature(){
  const s=state.settings||{};
  return JSON.stringify([s.activePresets||[],s.manualExcluded||[],s.includedOverrides||[],s.excluded||[]]);
}
function clearExclusionCache(){ EXCLUSION_CACHE = {sig:'', set:null}; }
function migrateExclusionState(){
  const s=state.settings;
  if(hasExclusionState()){ syncExcludedSettings(); return; }

  const legacy=new Set(s.excluded||[]), claimed=new Set(), active=[];
  const candidates=Object.entries(PRESETS).map(([name,ids])=>({
    name, ids, matched:ids.filter(id=>legacy.has(id))
  })).filter(x=>x.matched.length/x.ids.length>=0.5)
    .sort((a,b)=>b.matched.length-a.matched.length);

  /* Найбільший відповідний набір забираємо першим. Так повністю ввімкнене
     «вегетаріанське» не перетворюється ще й на зайвий активний «без риби». */
  for(const x of candidates){
    const novel=x.matched.filter(id=>!claimed.has(id));
    if(novel.length<Math.max(2,Math.ceil(x.ids.length*0.15))) continue;
    active.push(x.name);
    for(const id of x.matched) claimed.add(id);
  }
  const presetUnion=new Set(active.flatMap(name=>PRESETS[name]||[]));
  s.activePresets=active;
  s.manualExcluded=[...legacy].filter(id=>!presetUnion.has(id));
  s.includedOverrides=[...presetUnion].filter(id=>!legacy.has(id));
  syncExcludedSettings();
  clearExclusionCache();
}
function excludedSet(){
  if(!hasExclusionState()) return new Set(state.settings.excluded||[]);
  const sig = exclusionSignature();
  if(EXCLUSION_CACHE.set && EXCLUSION_CACHE.sig===sig) return EXCLUSION_CACHE.set;
  const set = syncExcludedSettings();
  EXCLUSION_CACHE = {sig:exclusionSignature(), set};
  return set;
}
function setPresetState(name,on){
  migrateExclusionState();
  clearExclusionCache();
  const active=new Set(state.settings.activePresets);
  on ? active.add(name) : active.delete(name);
  state.settings.activePresets=[...active];
  const covered=new Set(state.settings.activePresets.flatMap(key=>PRESETS[key]||[]));
  state.settings.includedOverrides=(state.settings.includedOverrides||[])
    .filter(id=>covered.has(id) && !(on && (PRESETS[name]||[]).includes(id)));
  return syncExcludedSettings();
}
function setManualExclusion(ids,on){
  migrateExclusionState();
  clearExclusionCache();
  const manual=new Set(state.settings.manualExcluded), restored=new Set(state.settings.includedOverrides);
  const covered=new Set(state.settings.activePresets.flatMap(key=>PRESETS[key]||[]));
  for(const id of ids){
    if(on){ manual.add(id); restored.delete(id); }
    else { manual.delete(id); covered.has(id) ? restored.add(id) : restored.delete(id); }
  }
  state.settings.manualExcluded=[...manual];
  state.settings.includedOverrides=[...restored];
  return syncExcludedSettings();
}

/* ============ СТАН ============ */
const DAY_NAMES = ['Понеділок','Вівторок','Середа','Четвер','П’ятниця','Субота','Неділя'];
const DAY_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'];
const WEEK_MODES = {
  rot3 : {n:'Збалансоване меню · 3 дні', h:'Рекомендовано: три меню чергуються, тому раціон не набридає, а покупки й приготування залишаються простими.'},
  rot2 : {n:'Просте меню · 2 дні',       h:'Два меню чергуються весь тиждень. Мінімум різних продуктів, найпростіші закупівля та приготування.'},
  vary : {n:'Різноманітне меню · 7 днів',h:'Сім різних днів і ширше чергування продуктів. Потребує більше закупівель і приготування.'},
  batch: {n:'Готую на 2 порції',         h:'Вечеря повторюється як обід наступного дня — готуєте раз, їсте двічі.'}
};
const DEFAULT_STATE = () => ({
  profile:{ name:'', sex:'f', age:30, ageRestricted:false, height:168, weight:70, waist:null, muscular:false,
            lifestyle:0.08, training:0.10, goal:'loss', diet:'omnivore',
            health:{pregnancy:false,kidney:false,eatingDisorder:false,bariatric:false,diabetes:false,glp1:false} },
  settings:{ lossRate:0.35, gainRate:0.2, proteinPerKg:1.8, fatPct:27,
             meals:4, sweetPct:10, excluded:[], activePresets:[], manualExcluded:[], includedOverrides:[],
             weekMode:'rot3', foodVolume:'normal', sodiumContext:'standard', times:[] },
  ui:{ mode:'pro', locked:false },
  note:'',          /* нотатка спеціаліста для клієнта */
  done:{},          /* відмічені прийоми: "день:прийом" -> true */
  activeDay:0,
  days:[],          /* days[7] = [ meal -> [ {prodId, customG|null} ] ] */
  weights:[],       /* [{d:'2026-08-19', w:70.5, waist:82|null}] */
  checkins:[]       /* [{d:'2026-08-25', adherence:90, hunger:3, energy:3, performance:3}] */
});
const state = DEFAULT_STATE();

const TRAINING_PROMO_COPY = {
  loss:{
    title:'Збережіть м’язи під час дефіциту калорій',
    text:'Раціон створює дефіцит, а правильно підібрані силові допомагають зберігати м’язову масу. Після звернення Ігор підбере програму під ваш вік, досвід, обладнання та обмеження.'
  },
  maintain:{
    title:'Доповніть збалансований раціон системними тренуваннями',
    text:'Поєднайте розрахований раціон із персональною програмою. Після звернення Ігор врахує ваш вік, досвід, доступне обладнання та бажану частоту тренувань.'
  },
  gain:{
    title:'Перетворіть профіцит калорій на м’язовий прогрес',
    text:'Профіцит працює найкраще разом із послідовним силовим стимулом. Після звернення Ігор сформує програму з прогресією навантаження під ваш рівень і можливості.'
  }
};

/* ---- автозбереження у браузері ---- */
const STORAGE_KEY = 'nutri_konstruktor_v1';
const STORAGE_PREF_KEY = 'nutri_konstruktor_persist_v2';
let saveTimer = null;
let importedFromLink = false;
let localPersistenceEnabled = false;
function showStorageStatus(message, error=false){
  const box = byId('storageStatus');
  if(!box) return;
  box.textContent = message;
  box.className = 'notice'+(error?' critical':'');
  box.style.display = message ? '' : 'none';
}
function localSnapshot(){
  return {
    v:2, profile:state.profile, settings:state.settings, days:state.days,
    weights:state.weights, checkins:state.checkins, ui:state.ui, note:state.note,
    done:state.done, activeDay:state.activeDay,
    customProducts:PRODUCTS.filter(p=>p.custom)
  };
}
function persistLocalSnapshot(announce=false){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localSnapshot()));
    if(announce) showStorageStatus('Локальну копію оновлено на цьому пристрої.');
    return true;
  }catch(e){
    showStorageStatus('Не вдалося зберегти локальну копію. Експортуйте програму у JSON-файл.', true);
    return false;
  }
}
function saveLocal(){
  clearTimeout(saveTimer);
  if(importedFromLink || !localPersistenceEnabled) return;
  saveTimer = setTimeout(()=>persistLocalSnapshot(false), 250);
}
function saveLocalNow(){
  clearTimeout(saveTimer);
  try{ localStorage.setItem(STORAGE_PREF_KEY,'1'); }
  catch(e){
    showStorageStatus('Браузер не дозволив увімкнути локальне збереження.',true);
    return false;
  }
  importedFromLink = false;
  localPersistenceEnabled = true;
  if(persistLocalSnapshot(true)) return true;
  localPersistenceEnabled = false;
  try{ localStorage.removeItem(STORAGE_PREF_KEY); }catch(e){}
  return false;
}
function forgetLocal(){
  clearTimeout(saveTimer);
  try{
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PREF_KEY);
    importedFromLink = true;
    localPersistenceEnabled = false;
    showStorageStatus('Локальну копію видалено. Поточні дані залишаться лише до закриття сторінки.');
    return true;
  }catch(e){
    showStorageStatus('Браузер не дозволив видалити локальну копію.', true);
    return false;
  }
}
function loadLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return false;
    const optedIn = localStorage.getItem(STORAGE_PREF_KEY)==='1';
    applyPortableState(JSON.parse(raw));
    localPersistenceEnabled = optedIn;
    importedFromLink = !optedIn;
    if(!optedIn)
      showStorageStatus('Знайдено локальну копію зі старої версії. Вона відкрита без подальшого автозбереження; підтвердьте збереження кнопкою нижче.');
    return true;
  }catch(e){
    showStorageStatus('Збережена локальна копія пошкоджена й не була завантажена.', true);
    return false;
  }
}

const byId = id => document.getElementById(id);
const PRODUCT_BY_ID = new Map(PRODUCTS.map(p=>[p.i,p]));
const CUSTOM_CATS = new Set(Object.keys(CATS).filter(c=>c!=='snackProtein' && c!=='dish'));
function prodById(id){ return PRODUCT_BY_ID.get(String(id)); }
function escHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function plainText(s, limit=120){
  return String(s ?? '').replace(/<[^>]*>/g,' ').replace(/[<>]/g,'')
    .replace(/\s+/g,' ').trim().slice(0,limit);
}
function sanitizeTime(value){
  const text = plainText(value,24);
  const clock = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if(clock) return String(+clock[1]).padStart(2,'0')+':'+clock[2];
  if(/^\d{1,2}:\d{2}$/.test(text)) return '';
  return /^[\p{L}\p{N} .,:–—-]{1,24}$/u.test(text) ? text : '';
}
function sanitizeTimes(values){
  return Array.isArray(values) ? values.slice(0,6).map(v=>sanitizeTime(v)||null) : [];
}
function sanitizeCustomProduct(cp){
  if(!cp || typeof cp!=='object') return null;
  const id = /^u[A-Za-z0-9_-]{1,42}$/.test(String(cp.i||'')) ? String(cp.i) : 'u'+Date.now()+Math.floor(Math.random()*10000);
  const cat = CUSTOM_CATS.has(cp.c) ? cp.c : 'carb';
  const n = plainText(cp.n, 60);
  const k = Math.round(clampNum(plainText(cp.k, 20), 1, 900, 0)*10)/10;
  if(!n || !k) return null;
  const out = {
    i:id, c:cat, n, k,
    p:Math.round(clampNum(plainText(cp.p, 20), 0, 100, 0)*10)/10,
    f:Math.round(clampNum(plainText(cp.f, 20), 0, 100, 0)*10)/10,
    cb:Math.round(clampNum(plainText(cp.cb ?? cp.carb ?? cp.c, 20), 0, 100, 0)*10)/10,
    custom:1
  };
  if(['omnivore','vegetarian','vegan'].includes(cp.diet)) out.diet = cp.diet;
  if(cp.ml) out.ml = 1;
  return out;
}
function addCustomProduct(cp){
  const clean = sanitizeCustomProduct(cp);
  if(!clean || prodById(clean.i)) return false;
  PRODUCTS.push(clean);
  PRODUCT_BY_ID.set(clean.i, clean);
  QUALITY_CACHE.delete(clean.i);
  return clean;
}
function removeCustomProducts(){
  for(let i=PRODUCTS.length-1;i>=0;i--) if(PRODUCTS[i].custom){
    PRODUCT_BY_ID.delete(PRODUCTS[i].i);
    QUALITY_CACHE.delete(PRODUCTS[i].i);
    PRODUCTS.splice(i,1);
  }
}
const clampNum = (v, lo, hi, fb) => {
  const n = +String(v ?? '').replace(',', '.');
  return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fb;
};
function importProfile(raw){
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return;
  for(const key of ['name','sex','age','height','weight','waist','muscular','lifestyle','training','goal','diet'])
    if(Object.prototype.hasOwnProperty.call(raw,key)) state.profile[key]=raw[key];
  if(raw.health && typeof raw.health==='object' && !Array.isArray(raw.health))
    for(const key of Object.keys(state.profile.health))
      state.profile.health[key] = raw.health[key]===true;
}
function importSettings(raw){
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return;
  for(const key of ['lossRate','gainRate','deficit','surplus','proteinPerKg','fatPct','meals','sweetPct',
    'excluded','activePresets','manualExcluded','includedOverrides','weekMode','foodVolume','sodiumContext','times'])
    if(Object.prototype.hasOwnProperty.call(raw,key)) state.settings[key]=raw[key];
}
function sanitizeDone(raw){
  const out={};
  if(raw && typeof raw==='object' && !Array.isArray(raw))
    for(const [key,value] of Object.entries(raw))
      if(/^\d:[0-5]$/.test(key) && value) out[key]=1;
  return out;
}
function sanitizeDays(raw){
  if(!Array.isArray(raw) || raw.length!==7) return [];
  return raw.map(day=>Array.isArray(day) ? day.slice(0,6).map(meal=>Array.isArray(meal)
    ? meal.slice(0,12).filter(c=>c && typeof c==='object').map(c=>({
        mealId:plainText(c.mealId,4), prodId:plainText(c.prodId,48),
        customG:c.customG==null?null:Math.round(clampNum(c.customG,0,900,0))
      })) : []) : []);
}
function applyPortableState(data,{compact=false,fromLink=false}={}){
  if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('Некоректний формат даних');
  removeCustomProducts();
  Object.assign(state,DEFAULT_STATE());
  const custom = compact ? data.c : data.customProducts;
  if(Array.isArray(custom)) for(const cp of custom.slice(0,250)) addCustomProduct(cp);
  importProfile(compact ? data.p : data.profile);
  importSettings(compact ? data.s : data.settings);
  state.note = plainText(compact ? data.n : data.note,500);
  state.days = sanitizeDays(compact ? data.d : data.days);
  if(!compact){
    state.weights = Array.isArray(data.weights) ? data.weights.slice(0,2000) : [];
    state.checkins = Array.isArray(data.checkins) ? data.checkins.slice(0,500) : [];
    state.done = sanitizeDone(data.done);
    state.activeDay = Math.round(clampNum(data.activeDay,0,6,0));
    if(data.ui && typeof data.ui==='object'){
      state.ui.mode = data.ui.mode==='client'?'client':'pro';
      state.ui.locked = false;
    }
  }else if(data.m==='c'){
    state.ui.mode='client';
    state.ui.locked=true;
  }
  migrateSettings();
  sanitizeProfile();
  if(!repairLoadedDays()) state.days=[];
  importedFromLink=fromLink;
  return true;
}
function sanitizeProfile(){
  const pr = state.profile;
  pr.name = plainText(pr.name,60);
  pr.sex = pr.sex==='m' ? 'm' : 'f';
  const rawAge = +String(pr.age ?? '').replace(',', '.');
  pr.ageRestricted = isFinite(rawAge) && rawAge<18;
  pr.age = Math.round(clampNum(pr.age, 18, 90, 30));
  pr.height = Math.round(clampNum(pr.height, 120, 220, 168));
  pr.weight = Math.round(clampNum(pr.weight, 35, 250, 70)*10)/10;
  pr.waist = pr.waist == null || pr.waist==='' ? null : Math.round(clampNum(pr.waist, 50, 200, 0)*10)/10;
  if(pr.waist===0) pr.waist = null;
  pr.muscular = pr.muscular===true;
  pr.lifestyle = clampNum(pr.lifestyle,0,0.33,0.08);
  pr.training = clampNum(pr.training,0,0.22,0.10);
  if(!['loss','maintain','gain'].includes(pr.goal)) pr.goal='loss';
  if(!['omnivore','vegetarian','vegan'].includes(pr.diet)) pr.diet = 'omnivore';
  const health = pr.health && typeof pr.health==='object' && !Array.isArray(pr.health) ? pr.health : {};
  pr.health = Object.fromEntries(['pregnancy','kidney','eatingDisorder','bariatric','diabetes','glp1'].map(key=>[key,health[key]===true]));
  return pr;
}
const VEGAN_DENY = new Set(['f03','f13','f22','f23','f24','f25','f26']);
function dietAllows(p){
  const diet = state.profile.diet || 'omnivore';
  if(diet==='omnivore') return !p.veganOnly;
  if(p.custom) return p.diet===diet || (diet==='vegetarian' && p.diet==='vegan');
  if(diet==='vegetarian') return !p.veganOnly && !PRESETS.vegetarian.includes(p.i);
  if(p.dish || p.c==='dairy' || VEGAN_DENY.has(p.i)) return false;
  if(p.c==='protein') return !!p.vegan;
  if(p.c==='sweet') return !!p.vegan;
  return true;
}
const activeExcludedSet = () => excludedSet();
function categoryMatches(p, cat){
  if(cat==='snackProtein')
    return !!p.snack || !!(p.roles && p.roles.includes(cat)) || (p.c==='dairy' && p.p>=7) || (p.c==='protein' && !!p.brk);
  if(cat==='protein') return (p.c==='protein' && !p.snackOnly) || !!(p.roles && p.roles.includes(cat));
  return p.c===cat || !!(p.roles && p.roles.includes(cat));
}
/* Автогенератор зберігає окремий практичний пул для перекусів, тоді як
   ручний вибір дає однаковий повний список у кожному білковому слоті.
   Людина може свідомо повторювати продукт або поставити його в будь-який
   прийом їжі; дієта та явні виключення однаково залишаються чинними. */
function manualCategoryMatches(p, cat){
  if(cat==='protein' || cat==='snackProtein')
    return categoryMatches(p,'protein') || categoryMatches(p,'snackProtein');
  return categoryMatches(p,cat);
}
const POOL_FALLBACK = {sweet:['fruit'], snackProtein:['protein']};
const pool = (cat, brkOnly) => {
  const ex = activeExcludedSet();
  const base = c => PRODUCTS.filter(p=>categoryMatches(p,c) && !p.season && !p.dish && !p.manualOnly
    && !ex.has(p.i) && dietAllows(p));
  let arr = base(cat);
  if(!arr.length) for(const fc of (POOL_FALLBACK[cat]||[])){ arr = base(fc); if(arr.length) break; }
  if(brkOnly){ const b = arr.filter(p=>p.brk); if(b.length>=3) arr = b; }
  return arr;
};
const rnd = arr => arr[Math.floor(Math.random()*arr.length)];
/* список для випадаючого меню: без приправ, страви — окремою групою */
function selectList(cat, keepId){
  const ex = activeExcludedSet();
  const direct = PRODUCTS.filter(p=>manualCategoryMatches(p,cat) && (!p.season || p.i===keepId)
    && (!ex.has(p.i) || p.i===keepId) && (dietAllows(p) || p.i===keepId));
  if(direct.length) return direct;
  const fallback = new Set(pool(cat).map(p=>p.i));
  return PRODUCTS.filter(p=>fallback.has(p.i) || p.i===keepId);
}
const HEALTH_LABELS = {
  pregnancy:'вагітність або грудне вигодовування',
  kidney:'захворювання нирок',
  eatingDisorder:'РХП зараз або в анамнезі',
  bariatric:'баріатрична операція',
  diabetes:'діабет або цукрознижувальна терапія',
  glp1:'препарати GLP-1'
};
function medicalSafety(){
  const h = state.profile.health || {};
  const active = Object.keys(HEALTH_LABELS).filter(k=>!!h[k]);
  const labels = active.map(k=>HEALTH_LABELS[k]);
  if(state.profile.ageRestricted || (+state.profile.age||0)<18) labels.unshift('вік до 18 років');
  if(state.profile.goal==='loss' && bmiOf(state.profile)<18.5) labels.unshift('ІМТ нижче 18,5 при цілі схуднення');
  return {blocked:labels.length>0, active, labels};
}
function menuPoolReport(){
  const seen = new Set(), empty = [], limited = [];
  for(const meal of getPlan()) for(const tpl of (MEAL_COMPS[meal.id]||[])){
    if(seen.has(tpl.cat)) continue;
    seen.add(tpl.cat);
    const n = pool(tpl.cat, meal.id==='b').length;
    const label = (CATS[tpl.cat]||{name:tpl.cat}).name;
    if(!n) empty.push(label);
    else if(n<3) limited.push({label,n});
  }
  return {empty, limited};
}
function generationBlockReason(){
  const med = medicalSafety();
  if(med.blocked) return `Автоматичне складання призупинено: ${med.labels.join(', ')}. Потрібне індивідуальне погодження з лікарем або профільним дієтологом.`;
  const pools = menuPoolReport();
  if(pools.empty.length) return `Неможливо скласти меню без порушення виключень. Немає дозволених продуктів у категоріях: ${pools.empty.join(', ')}.`;
  return '';
}
function repairLoadedDays(){
  let valid = true;
  for(const day of state.days) for(const meal of day) meal.forEach((c,ci)=>{
    const tpl = MEAL_COMPS[c.mealId] && MEAL_COMPS[c.mealId][ci];
    const current = prodById(c.prodId);
    if(!tpl){ valid=false; return; }
    if(!current || activeExcludedSet().has(c.prodId) || !dietAllows(current) || !categoryMatches(current,tpl.cat)){
      const replacement = pool(tpl.cat, c.mealId==='b')[0];
      if(!replacement){ valid=false; return; }
      c.prodId = replacement.i;
      c.customG = null;
    }
  });
  return valid;
}

/* ============ РОЗРАХУНКИ ============ */
/* Коефіцієнт активності = база 1.20 (сидячий базис: обмін + термічний ефект їжі
   + мінімальний рух) + внесок побутового руху + внесок тренувань.
   Внески рахуються з реальних витрат, а не з класичної таблиці Міффліна:
   ~40 ккал на 1000 кроків понад базис і ~350 ккал за тренування, поділені на 7 днів.
   Тому числа виходять нижчі за звичні множники 1.375/1.55/1.725 — ті помітно
   завищують внесок тренувань (3 заняття на тиждень — це ~150 ккал на день,
   а не 600). Діапазон: 1.20–1.75. */
function activityFactor(pr){
  const life = pr.lifestyle!=null ? +pr.lifestyle : 0.08;
  const tr   = pr.training!=null  ? +pr.training  : 0.10;
  return Math.min(1.75, Math.round((1.20 + life + tr)*1000)/1000);
}
const KCAL_PER_KG = 7700;   /* енергоємність 1 кг жирової тканини */

function bmiOf(pr){ const h=(pr.height||168)/100; return pr.weight/(h*h); }
function bmiLabel(b, pr){
  if(pr && pr.muscular && b>=25) return 'може бути завищений через м’язи';
  return b<18.5?'нижче референсу' : b<25?'у референсі'
       : b<30?'вище референсу' : 'значно вище референсу';
}
/* Співвідношення талії до зросту: <0,5 — нижчий ризик, 0,5–0,59 —
   підвищений, >=0,6 — високий. Показник корисний і за високої м’язової маси. */
function waistRisk(pr){
  const w = +pr.waist||0; if(!w) return null;
  const ratio = w/Math.max(1,+pr.height||168);
  if(ratio >= 0.6) return {lvl:2, ratio, txt:'висока центральна концентрація жиру'};
  if(ratio >= 0.5) return {lvl:1, ratio, txt:'співвідношення вище рекомендованого'};
  return {lvl:0, ratio, txt:'співвідношення нижче 0,5'};
}
/* Розрахункова вага для норм білка та жирів.
   Для атлетичної статури беремо половину перевищення над вагою за ІМТ 25:
   це визнає більшу безжирову масу, але не множить білок на всю фактичну вагу. */
function calcWeight(pr){
  const h=(pr.height||168)/100, ref=25*h*h;
  const share = pr.muscular ? 0.50 : 0.25;
  return pr.weight>ref ? ref + share*(pr.weight-ref) : pr.weight;
}
/* Темп зміни ваги -> добовий дефіцит/профіцит у відсотках від витрат. */
function paceInfo(pr, s, tdee){
  if(pr.goal==='loss'){
    const requested = s.lossRate!=null ? +s.lossRate : 0.5;
    const rate = Math.min(requested, Math.max(0.2, pr.weight*0.01));
    const rawPct = rate*KCAL_PER_KG/7/Math.max(1,tdee)*100;
    return {dir:-1, requested, rate, rateCapped:rate<requested-0.001,
      pct:Math.min(25, rawPct), deficitCapped:rawPct>25};
  }
  if(pr.goal==='gain'){
    const r = s.gainRate!=null ? +s.gainRate : 0.25;
    return {dir:1, rate:r, pct:Math.min(22, r*KCAL_PER_KG/7/Math.max(1,tdee)*100)};
  }
  return {dir:0, rate:0, pct:0};
}
function calcTargets(){
  const pr = sanitizeProfile(), s = state.settings;
  const bmr = 10*pr.weight + 6.25*pr.height - 5*pr.age + (pr.sex==='m' ? 5 : -161);
  const tdee = bmr * activityFactor(pr);
  const pace = paceInfo(pr, s, tdee);
  let kcal = tdee*(1 + pace.dir*pace.pct/100);
  const minK = pr.sex==='m' ? 1500 : 1200;
  const clamped = pr.goal==='loss' && kcal < minK;
  if(clamped) kcal = minK;

  const cw = calcWeight(pr);                 /* розрахункова вага */
  const adjusted = cw < pr.weight - 0.5;
  let prot = Math.round(s.proteinPerKg * cw);
  const protMax = Math.max(1, Math.floor(kcal*0.35/4));
  const proteinCapped = prot > protMax;
  if(proteinCapped) prot = protMax;

  /* Нижня межа жирів: менше — і страждають статеві гормони та засвоєння
     жиророзчинних вітамінів. 0,6 г/кг розрахункової ваги, але не менше 40 г. */
  const fatMin = Math.max(40, Math.round(0.6*cw));
  let fat = Math.round(kcal*s.fatPct/100/9);
  const fatLifted = fat < fatMin;
  if(fatLifted) fat = fatMin;

  let carb = Math.round((kcal - prot*4 - fat*9)/4);
  /* Якщо вуглеводів майже не лишилось — зрізаємо надлишок білка (до 1,2 г/кг),
     а не жири: жири вже на нижній безпечній межі. */
  const carbMin = Math.max(50, Math.round(kcal*0.10/4));
  let protTrimmed = false;
  if(carb < carbMin){
    const cut = Math.min(carbMin-carb, Math.max(0, prot - Math.round(1.2*cw)));
    if(cut>0){ prot -= cut; protTrimmed = true; carb = Math.round((kcal - prot*4 - fat*9)/4); }
  }
  if(carb<0) carb = 0;

  /* Клітковина: 14 г на 1000 ккал (ADA), робочий коридор 25–38 г. */
  const fib = Math.min(38, Math.max(25, Math.round(kcal/1000*14)));
  const realRate = pace.dir ? Math.abs(tdee-kcal)*7/KCAL_PER_KG : 0;

  return { bmr:Math.round(bmr), tdee:Math.round(tdee), kcal:Math.round(kcal),
           prot, fat, carb, fib, clamped, belowBmr:kcal<bmr, fatLifted, fatMin, protTrimmed, proteinCapped, protMax,
           calcW:cw, adjusted, bmi:bmiOf(pr), pace, realRate };
}
/* міграція налаштувань зі старих збережень (v9: deficit/surplus у відсотках) */
function migrateSettings(){
  const pr=state.profile, s=state.settings;
  const bmr = 10*pr.weight + 6.25*pr.height - 5*pr.age + (pr.sex==='m'?5:-161);
  const tdee = bmr*activityFactor(pr);
  if(s.lossRate==null)
    s.lossRate = Math.round((s.deficit!=null?s.deficit:17)/100*tdee*7/KCAL_PER_KG*10)/10;
  if(s.gainRate==null)
    s.gainRate = Math.round((s.surplus!=null?s.surplus:12)/100*tdee*7/KCAL_PER_KG*20)/20;
  s.lossRate = Math.min(1, Math.max(0.2, +s.lossRate||0.35));
  s.gainRate = Math.min(0.4, Math.max(0.1, +s.gainRate||0.2));
  s.meals = [3,4,5].includes(+s.meals) ? +s.meals : 4;
  s.sweetPct = Math.round(clampNum(s.sweetPct,0,20,10)/5)*5;
  s.proteinPerKg = Math.round(clampNum(s.proteinPerKg,1.2,2.4,1.8)*10)/10;
  s.fatPct = Math.round(clampNum(s.fatPct,20,35,27));
  if(!WEEK_MODES[s.weekMode]) s.weekMode = 'rot3';
  if(!['normal','compact'].includes(s.foodVolume)) s.foodVolume = 'normal';
  if(!['standard','highSweat'].includes(s.sodiumContext)) s.sodiumContext = 'standard';
  s.times = sanitizeTimes(s.times);
  const safeIds = values => Array.isArray(values)
    ? [...new Set(values.filter(v=>typeof v==='string' && /^[A-Za-z0-9_-]{1,48}$/.test(v)))].slice(0,500) : [];
  s.excluded = safeIds(s.excluded);
  s.manualExcluded = safeIds(s.manualExcluded);
  s.includedOverrides = safeIds(s.includedOverrides);
  s.activePresets = Array.isArray(s.activePresets)
    ? [...new Set(s.activePresets.filter(key=>Object.prototype.hasOwnProperty.call(PRESETS,key)))] : [];
  migrateExclusionState();
  if(pr.muscular==null) pr.muscular = false;
  if(!['omnivore','vegetarian','vegan'].includes(pr.diet)) pr.diet = 'omnivore';
  if(!state.ui) state.ui = {mode:'pro', locked:false};
  state.ui.mode = state.ui.mode==='client'?'client':'pro';
  state.ui.locked = state.ui.locked===true;
  state.note = plainText(state.note,500);
  state.done = sanitizeDone(state.done);
  state.weights = normalizeWeightEntries(state.weights).map(e=>({d:e.d,w:e.w,waist:e.waist}));
  state.checkins = normalizeCheckins(state.checkins).map(e=>({d:e.d,adherence:e.adherence,
    hunger:e.hunger,energy:e.energy,performance:e.performance}));
}

/* Побутові міри. iw=1 означає неподільну одиницю: яйце, скибка, невеликий
   виріб. Решту мір округлюємо до половини — це зручно для ложок і великих
   десертів, які реально можна поділити. */
function niceUnitCount(n){
  const halves = Math.round(n*2), whole = Math.floor(halves/2);
  if(halves%2) return whole ? `${whole}½` : '½';
  return String(whole);
}
function unitApprox(p, g, whole){
  if(!p.u) return '';
  const integer = whole || p.iw;
  const n = integer ? Math.round(g/p.u) : Math.round(g/p.u*2)/2;
  if(n < (integer?1:0.5)) return '';
  /* Для вручну введеної ваги не показуємо оманливе "≈ 1 шт.", якщо вона
     далеко від ваги цілої одиниці. Автопорції нижче завжди узгоджені. */
  if(p.iw && !whole && Math.abs(g-n*p.u) > p.u*0.22) return '';
  return `≈ ${niceUnitCount(n)} ${p.un}`;
}
function portionUnit(p){
  return p.ml ? 'мл' : p.dry ? 'г сух.' : p.raw ? 'г сир.' : 'г';
}
function snapUnitGrams(p, g, lo, hi){
  if(!p.u) return g;
  const step = p.iw ? 1 : 0.5;
  let best = null, dist = Infinity;
  for(let n=step; n<=hi/p.u+step/2; n+=step){
    const grams = Math.round(n*p.u);
    if(grams<lo || grams>hi) continue;
    const d = Math.abs(grams-g);
    if(d<dist){ best=grams; dist=d; }
  }
  return best==null ? Math.min(hi,Math.max(lo,Math.round(g))) : best;
}
function inputGramStep(p){
  return p.u ? Math.max(1,Math.round(p.u*(p.iw?1:0.5))) : 5;
}
/* вага для списку покупок: кілограми + побутова міра, де вона є */
function shopAmount(p, g){
  const base = p.ml
    ? (g>=1000 ? (g/1000).toFixed(1).replace('.',',')+' л' : Math.round(g)+' мл')
    : (g>=1000 ? (g/1000).toFixed(1).replace('.',',')+' кг' : Math.round(g)+' г');
  const u = unitApprox(p, g, true);
  return u ? `${base} <span class="un">(${u.replace('≈ ','')})</span>` : base;
}
/* орієнтовний час прийомів */
function defaultTimes(){
  const t = {3:['8:00','13:00','18:30'],
             4:['8:00','11:00','14:00','18:30'],
             5:['8:00','11:00','14:00','16:30','19:00']}[state.settings.meals] || [];
  return (state.settings.sweetPct||0) > 0 ? t.concat(['будь-коли']) : t;
}
function mealTimes(){
  const def = defaultTimes(), own = state.settings.times || [];
  return def.map((x,i)=> own[i] || x);
}

/* Рідина. 30–35 мл/кг — це ЗАГАЛЬНА добова потреба, куди входить і вода з їжі
   (приблизно чверть), і всі напої. «Випити» треба менше — і чай, кава, компот,
   юшка теж рахуються. */
function waterCalc(w){
  const totalLo = w*30/1000, totalHi = w*35/1000;
  const food = (totalLo+totalHi)/2 * 0.22;     /* ~22% надходить із їжею */
  return {totalLo, totalHi, food, drinkLo: totalLo-food, drinkHi: totalHi-food};
}
const L = x => x.toFixed(1).replace('.', window.nutriLanguage==='en'?'.':',');
function waterHtml(w){
  const q = waterCalc(w);
  return `💧 <b>Випивати ${L(q.drinkLo)}–${L(q.drinkHi)} л рідини на день</b> — сюди входять вода, чай, ` +
    `кава, компот, юшка.<br><span style="color:var(--muted)">Загальна потреба ${L(q.totalLo)}–${L(q.totalHi)} л ` +
    `(30–35 мл/кг), ще ≈${L(q.food)} л організм отримує з їжі. У спеку та після тренувань — більше.</span>`;
}

/* ============ РОЗПОДІЛ ГРАМІВ ПІД КАЛОРІЇ ТА БЖВ ============
   Грами підбираються так, щоб день збігався з ціллю одночасно за калоріями,
   білками, жирами й вуглеводами (а не лише за калорійністю).
   Метод: координатний спуск — для кожного компонента точно рахуємо оптимальні
   грами при фіксованих інших, і так кілька проходів. Ручні грами не чіпаємо. */
const OPT_W = {k:3.0, p:2.6, f:2.6, c:2.0, fb:0.3};  /* ваги цілей дня */
const OPT_WM = 0.9;    /* тримати калорійність кожного прийому близько до частки */
const OPT_LAM = 0.10;  /* тяжіння до стартових грамів — зберігає структуру прийому */

function optimizeDay(meals, t){
  const W0 = state.profile.diet==='vegan' ? {...OPT_W,p:3.6} : OPT_W;
  const W = state.settings.foodVolume==='compact' ? {...W0,fb:0.12} : W0;
  const T = {k:Math.max(1,t.kcal), p:Math.max(1,t.prot), f:Math.max(1,t.fat),
             c:Math.max(1,t.carb), fb:Math.max(1,t.fib)};
  const all = meals.flatMap(m=>m.items);
  const free = all.filter(it=>!it.fixed && !it.unitLocked);
  if(!free.length) return;

  /* поточні суми дня */
  let K=0,P=0,F=0,C=0,FB=0;
  for(const it of all){ const q=it.g/100;
    K+=it.p.k*q; P+=it.p.p*q; F+=it.p.f*q; C+=it.p.cb*q; FB+=(it.p.fb||0)*q; }
  /* поточні суми прийомів */
  const MK = meals.map(m=>m.items.reduce((a,it)=>a+it.g*it.p.k/100,0));

  for(let sweep=0; sweep<24; sweep++){
    let moved = 0;
    for(let mi=0; mi<meals.length; mi++){
      const m = meals[mi], mt = Math.max(1, m.mealKcal);
      for(const it of m.items){
        if(it.fixed || it.unitLocked) continue;
        const a = {k:it.p.k/100, p:it.p.p/100, f:it.p.f/100, c:it.p.cb/100, fb:(it.p.fb||0)/100};
        /* суми без цього компонента */
        const eK=K-it.g*a.k, eP=P-it.g*a.p, eF=F-it.g*a.f, eC=C-it.g*a.c, eFB=FB-it.g*a.fb;
        const eM=MK[mi]-it.g*a.k;
        let num = W.k*a.k*(T.k-eK)/(T.k*T.k)
                + W.p*a.p*(T.p-eP)/(T.p*T.p)
                + W.f*a.f*(T.f-eF)/(T.f*T.f)
                + W.c*a.c*(T.c-eC)/(T.c*T.c)
                + W.fb*a.fb*(T.fb-eFB)/(T.fb*T.fb)
                + OPT_WM*a.k*(mt-eM)/(mt*mt)
                + OPT_LAM/it.g0;
        let den = W.k*a.k*a.k/(T.k*T.k)
                + W.p*a.p*a.p/(T.p*T.p)
                + W.f*a.f*a.f/(T.f*T.f)
                + W.c*a.c*a.c/(T.c*T.c)
                + W.fb*a.fb*a.fb/(T.fb*T.fb)
                + OPT_WM*a.k*a.k/(mt*mt)
                + OPT_LAM/(it.g0*it.g0);
        if(!(den>0)) continue;
        let g = num/den;
        if(!isFinite(g)) continue;
        g = Math.min(it.hi, Math.max(it.lo, g));
        const d = g-it.g;
        if(Math.abs(d)>0.01){
          moved = 1;
          K+=d*a.k; P+=d*a.p; F+=d*a.f; C+=d*a.c; FB+=d*a.fb; MK[mi]+=d*a.k;
          it.g = g;
        }
      }
    }
    if(!moved) break;
  }
}

/* наскільки день влучив у цілі (менше — краще) */
function dayScore(tot, t){
  const rel = (got,want,w) => { const d=(got-Math.max(1,want))/Math.max(1,want); return w*d*d; };
  const proteinWeight = state.profile.diet==='vegan' ? 3.6 : 2.6;
  /* клітковина: недобір карається сильно, перебір — майже ні */
  const dfb = (tot.fb - t.fib)/Math.max(1,t.fib);
  const fibPenalty = state.settings.foodVolume==='compact' ? (dfb<0 ? 0.35 : 0.08) : (dfb<0 ? 1.2 : 0.12);
  const limits = qualityLimits(t);
  const dna = Math.max(0, ((+tot.na||0) - limits.na)/limits.na);
  const dsf = Math.max(0, ((+tot.sf||0) - limits.sf)/limits.sf);
  const dsug = Math.max(0, ((+tot.sug||0) - limits.sug)/limits.sug);
  return rel(tot.k,t.kcal,3) + rel(tot.p,t.prot,proteinWeight) + rel(tot.f,t.fat,2.6) + rel(tot.c,t.carb,1.6)
       + fibPenalty*dfb*dfb + 0.40*dna*dna + 0.45*dsf*dsf + 0.30*dsug*dsug;
}

/* побудова дня з набору компонентів (без звернення до state) */
/* Частки компонентів усередині прийому підлаштовуються під цільовий розподіл БЖВ.
   Базова структура природно дає ~30% білка / 27% жирів / 43% вуглеводів від калорій;
   якщо ціль інша (напр., набір маси — більше вуглеводів), частки масштабуються. */
const BASE_SPLIT = {p:0.30, f:0.27, c:0.43};
function adaptShares(mealId, t){
  const base = MEAL_COMPS[mealId] || [];
  if(!base.length) return base;
  const K = Math.max(1, t.kcal);
  const clamp = x => Math.min(1.9, Math.max(0.45, x));
  const fP = clamp((t.prot*4/K)/BASE_SPLIT.p);
  const fF = clamp((t.fat*9/K)/BASE_SPLIT.f);
  const fC = clamp((t.carb*4/K)/BASE_SPLIT.c);
  const compact = state.settings.foodVolume==='compact' ? 0.72 : 1;
  const w = {protein:fP, snackProtein:fP, dairy:(fP+fC)/2, fat:fF, carb:fC,
             fruit:(fC+1)/2*compact, veg:compact, sweet:1};
  const raw = base.map(x=>x.sh*(w[x.cat]||1));
  const sum = raw.reduce((a,b)=>a+b,0) || 1;
  return base.map((x,i)=>({cat:x.cat, sh:raw[i]/sum}));
}

function buildDay(dayComps, t){
  PORTION_SCALE = Math.min(1.8, Math.max(1, t.kcal/2000));
  const plan = getPlan();
  const meals = plan.map((m,mi)=>{
    const mealKcal = t.kcal*m.share;
    const comps = dayComps[mi] || [];
    const adapted = adaptShares(comps.length ? comps[0].mealId : m.id, t);
    const items = comps.map((mc,idx)=>{
      const tpl = adapted[idx] || (MEAL_COMPS[mc.mealId] && MEAL_COMPS[mc.mealId][idx]) || {cat:'carb', sh:1};
      const current = prodById(mc.prodId);
      const ex = activeExcludedSet();
      const p = current && !ex.has(current.i) && dietAllows(current) && categoryMatches(current,tpl.cat)
        ? current : pool(tpl.cat, m.id==='b')[0];
      if(!p) throw new Error('Немає дозволеного продукту для категорії '+tpl.cat);
      const [lo,hi] = gramBounds(p);
      const fixed = mc.customG!=null;
      let g = fixed ? mc.customG
                    : Math.min(hi, Math.max(lo, mealKcal*tpl.sh/p.k*100));
      return { mc, tpl, p, lo, hi, fixed, g0:Math.max(1,g), g };
    });
    return { def:m, mealKcal, items };
  });

  optimizeDay(meals, t);

  /* Фіксуємо кухонно зручні порції, потім ще раз оптимізуємо решту продуктів,
     щоб цілі дня не постраждали від округлення яєць, скибок або ложок. */
  let hasUnitLocks = false;
  for(const m of meals) for(const it of m.items){
    if(it.fixed || !it.p.u) continue;
    it.g = snapUnitGrams(it.p,it.g,it.lo,it.hi);
    it.unitLocked = true;
    hasUnitLocks = true;
  }
  if(hasUnitLocks) optimizeDay(meals,t);

  /* округлення: дрібні калорійні продукти — до 1 г, решта — до 5 г */
  for(const m of meals) for(const it of m.items){
    if(it.fixed || it.unitLocked) continue;
    const step = it.p.k>=300 ? 1 : 5;
    it.g = Math.min(it.hi, Math.max(it.lo, Math.round(it.g/step)*step));
  }
  for(const m of meals){
    m.tot = m.items.reduce((a,it)=>{ const q=it.g/100, quality=qualityNutrients(it.p);
      a.k+=it.p.k*q; a.p+=it.p.p*q; a.f+=it.p.f*q; a.c+=it.p.cb*q; a.fb+=(it.p.fb||0)*q;
      a.na+=quality.na*q; a.sf+=quality.sf*q; a.sug+=quality.sug*q; return a;
    },{k:0,p:0,f:0,c:0,fb:0,na:0,sf:0,sug:0});
  }
  const tot = meals.reduce((a,m)=>{a.k+=m.tot.k;a.p+=m.tot.p;a.f+=m.tot.f;a.c+=m.tot.c;a.fb+=m.tot.fb;
      a.na+=m.tot.na;a.sf+=m.tot.sf;a.sug+=m.tot.sug;return a},
    {k:0,p:0,f:0,c:0,fb:0,na:0,sf:0,sug:0});
  return { targets:t, meals, tot };
}

/* повний розрахунок дня: повертає структуру для рендеру */
function calcDay(dayIdx){
  return buildDay(state.days[dayIdx] || [], calcTargets());
}

/* ============ ГЕНЕРАЦІЯ МЕНЮ ============ */
function newComp(mealId, tplIdx, prevProdId){
  const tpl = MEAL_COMPS[mealId][tplIdx];
  let ps = pool(tpl.cat, mealId==='b');
  if(state.profile.diet==='vegan' && (tpl.cat==='protein' || tpl.cat==='snackProtein')){
    const dense = ps.filter(p=>p.p>=40);
    if(dense.length && Math.random()<0.70) ps = dense;
  }
  /* у перекуси та сніданок не підставляємо олію/масло — лише горіхи, насіння тощо */
  if(tpl.cat==='fat' && mealId!=='l' && mealId!=='d'){
    const noOil = ps.filter(p=>!p.oil); if(noOil.length) ps = noOil;
  }
  if(prevProdId && ps.length>1) ps = ps.filter(p=>p.i!==prevProdId);
  if(!ps.length) throw new Error('Немає дозволених продуктів для категорії '+tpl.cat);
  return { mealId, prodId: rnd(ps).i, customG:null };
}
function randomDay(prevDay){
  const plan = getPlan();
  return plan.map((m,mi)=> MEAL_COMPS[m.id].map((_,ci)=>{
    const prev = prevDay && prevDay[mi] && prevDay[mi][ci] ? prevDay[mi][ci].prodId : null;
    return newComp(m.id, ci, prev);
  }));
}
function weeklyLimitedIds(day){
  return new Set(day.flat().map(c=>c.prodId).filter(id=>{
    const p = prodById(id);
    return p && p.maxPerWeek;
  }));
}
function exceedsWeeklyLimits(day, usage){
  if(!usage) return false;
  for(const id of weeklyLimitedIds(day)){
    const p = prodById(id);
    if((usage.get(id)||0) >= p.maxPerWeek) return true;
  }
  return false;
}
function addWeeklyUsage(day, usage){
  if(!usage) return;
  for(const id of weeklyLimitedIds(day)) usage.set(id, (usage.get(id)||0)+1);
}
function limitedReplacement(tpl, mealId, usage, currentId){
  return pool(tpl.cat, mealId==='b').filter(p=>{
    if(p.i===currentId) return false;
    return !p.maxPerWeek || (usage.get(p.i)||0) < p.maxPerWeek;
  });
}
function enforceWeeklyProductLimits(){
  const usage = new Map();
  for(const day of state.days){
    const daySeen = new Set();
    for(const meal of day) for(let ci=0; ci<meal.length; ci++){
      const comp = meal[ci], p = prodById(comp.prodId);
      if(!p || !p.maxPerWeek) continue;
      if(daySeen.has(p.i)) continue;
      if((usage.get(p.i)||0) >= p.maxPerWeek){
        const tpl = MEAL_COMPS[comp.mealId] && MEAL_COMPS[comp.mealId][ci];
        const repl = tpl ? limitedReplacement(tpl, comp.mealId, usage, p.i) : [];
        if(repl.length){
          const next = rnd(repl);
          comp.prodId = next.i; comp.customG = null;
          if(next.maxPerWeek && !daySeen.has(next.i)){
            usage.set(next.i, (usage.get(next.i)||0)+1);
            daySeen.add(next.i);
          }
        }
      }else{
        usage.set(p.i, (usage.get(p.i)||0)+1);
        daySeen.add(p.i);
      }
    }
  }
}
/* генеруємо кілька варіантів дня і лишаємо той, що найкраще лягає в БЖВ */
function mealProteinPenalty(day, t){
  const coreMin = Math.min(30, Math.max(20, t.prot*0.18));
  const snackMin = Math.min(20, Math.max(12, t.prot*0.10));
  const missWeight = state.profile.diet==='vegan' ? 12 : 3.2;
  let score = 0;
  for(const meal of day.meals){
    const min = ['b','l','d'].includes(meal.def.id) ? coreMin
              : ['s1','s2'].includes(meal.def.id) ? snackMin : 0;
    if(min && meal.tot.p<min){
      const d=(min-meal.tot.p)/min; score += missWeight*d*d;
    }
    if(meal.tot.p>50){
      const d=(meal.tot.p-50)/50; score += 0.35*d*d;
    }
  }
  return score;
}
function genDay(dayIdx, prevDay, weeklyUsage=null){
  const t = calcTargets();
  let best = null, bestScore = Infinity;
  const tries = state.profile.diet==='vegan' ? 100 : 90;
  for(let i=0;i<tries;i++){
    const cand = randomDay(prevDay);
    if(exceedsWeeklyLimits(cand, weeklyUsage)) continue;
    const built = buildDay(cand, t);
    const sc = dayScore(built.tot, t) + mealProteinPenalty(built, t);
    if(sc < bestScore){ bestScore = sc; best = cand; }
    if(bestScore < 0.002) break;         /* достатньо точно — далі не шукаємо */
  }
  return best || randomDay(prevDay);
}
const cloneDay = day => day.map(meal=>meal.map(c=>({...c})));
/* Вечеря дня N повторюється як обід дня N+1: обід і вечеря мають однаковий
   набір категорій, тож ті самі продукти лише перераховуються під іншу частку. */
function applyBatch(){
  const plan = getPlan();
  const li = plan.findIndex(m=>m.id==='l'), di = plan.findIndex(m=>m.id==='d');
  if(li<0 || di<0) return;
  for(let d=0; d<6; d++)
    state.days[d+1][li] = state.days[d][di].map(c=>({prodId:c.prodId, mealId:'l', customG:null}));
}
function genWeek(){
  const mode = state.settings.weekMode || 'rot3';
  if(mode==='rot2' || mode==='rot3'){
    const n = mode==='rot2' ? 2 : 3, base = [];
    for(let i=0;i<n;i++) base.push(genDay(i, i>0?base[i-1]:null));
    state.days = Array.from({length:7}, (_,d)=>cloneDay(base[d%n]));
    enforceWeeklyProductLimits();
    return;
  }
  state.days = [];
  const weeklyUsage = new Map();
  for(let d=0;d<7;d++){
    const day = genDay(d, d>0?state.days[d-1]:null, weeklyUsage);
    state.days.push(day);
    addWeeklyUsage(day, weeklyUsage);
  }
  if(mode==='batch') applyBatch();
  enforceWeeklyProductLimits();
}
function safeGenWeek(showMessage=true){
  const reason = generationBlockReason();
  if(reason){
    if(showMessage) alert(reason);
    return false;
  }
  genWeek();
  return true;
}
/* додає/прибирає слот "Смаколик" без втрати вручну зібраного меню */
function syncSweetSlot(){
  const want = (state.settings.sweetPct||0) > 0;
  for(const day of state.days){
    if(!Array.isArray(day)) continue;
    const last = day[day.length-1];
    const has = last && last[0] && last[0].mealId==='sw';
    if(want && !has) day.push([newComp('sw',0,null)]);
    if(!want && has) day.pop();
  }
}
function ensureDays(){
  syncSweetSlot();
  const plan = getPlan();
  const valid = state.days.length===7 && state.days.every(day=>
    day.length===plan.length && day.every((meal,mi)=>meal.length===MEAL_COMPS[plan[mi].id].length));
  if(!valid) safeGenWeek(false);
}

const SIMPLE_FIT_IDS = {
  fat:['f02','f01','f03','f04','f21','f05','f07'],
  carb:['c01','c02','c04','c11','c25','c26','c13','c10','c17','c18','c19'],
  protein:['p01','p02','p18','p20','p21','p09','p10','vp07','vp09','vp08','vp10','vp11','vp12','c17','c18','c19','c24'],
  snackProtein:['p20','p21','d02','p18','vp11','vp07','vp09','vp08','vp10','vp12','c17','c18','c19','c24'],
  dairy:['d02','d03','d01','d05'],
  sweet:['s01','s07','s20','s21','s23']
};
const SIMPLE_FIT_CATS = new Set(['fat','carb','protein','snackProtein','dairy','sweet']);
function simpleFitCandidates(cat, keepId){
  const allowed = selectList(cat, keepId).filter(p=>!p.dish&&!p.season&&!p.manualOnly);
  const ids = SIMPLE_FIT_IDS[cat] || [];
  const picked = [];
  for(const id of ids){
    const p = allowed.find(x=>x.i===id);
    if(p && !picked.some(x=>x.i===p.i)) picked.push(p);
  }
  const current = allowed.find(p=>p.i===keepId);
  if(current && ids.includes(current.i) && !picked.some(p=>p.i===current.i)) picked.unshift(current);
  return picked.slice(0,6);
}
function simpleFitPortion(p, g, lo, hi){
  let x = Math.min(hi, Math.max(lo, g));
  if(p.u) return snapUnitGrams(p, x, lo, hi);
  const step = p.k>=300 ? 1 : 5;
  return Math.min(hi, Math.max(lo, Math.round(x/step)*step));
}
function simpleFitPortions(p, base, lo, hi, cat){
  const deltas = cat==='fat'
    ? [-39,-26,-20,-13,-10,-7,-5,0,5,7,10,13,20,26,39]
    : cat==='sweet'
      ? [-80,-60,-40,-25,-15,-10,-5,0,5,10,15,25,40]
      : [-100,-80,-60,-40,-25,-15,-10,0,10,15,25,40,60,80,100];
  const out = new Set([lo, hi]);
  for(const d of deltas) out.add(simpleFitPortion(p, base+d, lo, hi));
  return [...out].filter(g=>g>=lo&&g<=hi).sort((a,b)=>a-b);
}
function simpleFitScore(day, t){
  const rel = (got,want,w) => { const d=(got-Math.max(1,want))/Math.max(1,want); return w*d*d; };
  const tot = day.tot;
  const limits = qualityLimits(t);
  const over = (got,want,w) => { const d=Math.max(0,((+got||0)-want)/Math.max(1,want)); return w*d*d; };
  return rel(tot.k,t.kcal,3.4) + rel(tot.p,t.prot,2.8) + rel(tot.f,t.fat,2.8)
       + rel(tot.c,t.carb,2.0) + (tot.fb<t.fib*0.9 ? rel(tot.fb,t.fib,0.8) : 0)
       + over(tot.na,limits.na,0.35) + over(tot.sf,limits.sf,0.35) + over(tot.sug,limits.sug,0.25)
       + mealProteinPenalty(day,t);
}
function simpleFitDistance(day, t){
  const rows = [
    ['ккал', day.tot.k, t.kcal],
    ['Б', day.tot.p, t.prot],
    ['Ж', day.tot.f, t.fat],
    ['В', day.tot.c, t.carb]
  ];
  const worst = rows.map(([n,got,want])=>({n,d:Math.abs(devPct(got,want))}))
    .sort((a,b)=>b.d-a.d)[0];
  return worst ? `${worst.n} ${Math.round(worst.d)}%` : '0%';
}
function fitMsgEscape(s){
  return String(s).replace(/[<>&]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
}
function fitSimpleDay(di=state.activeDay){
  const reason = generationBlockReason();
  if(reason) return {changed:false, reason};
  ensureDays();
  const t = calcTargets(), before = calcDay(di);
  const beforeScore = simpleFitScore(before,t), ops = [];
  for(let pass=0; pass<8; pass++){
    const current = calcDay(di);
    let best = {score:simpleFitScore(current,t)};
    for(let mi=0; mi<current.meals.length; mi++) for(let ci=0; ci<current.meals[mi].items.length; ci++){
      const it = current.meals[mi].items[ci], comp = state.days[di] && state.days[di][mi] && state.days[di][mi][ci];
      if(!comp || !SIMPLE_FIT_CATS.has(it.tpl.cat)) continue;
      for(const p of simpleFitCandidates(it.tpl.cat,it.p.i)){
        const [lo,hi] = gramBounds(p);
        const kcal = it.g*it.p.k/100;
        const base = p.i===it.p.i ? it.g : kcal/Math.max(1,p.k)*100;
        for(const g of simpleFitPortions(p,base,lo,hi,it.tpl.cat)){
          if(p.i===it.p.i && Math.abs(g-it.g)<0.5) continue;
          const test = cloneDay(state.days[di]);
          test[mi][ci] = {...test[mi][ci], prodId:p.i, customG:g};
          const built = buildDay(test,t);
          const sc = simpleFitScore(built,t);
          if(sc < best.score - 0.00005) best = {score:sc,mi,ci,p,g,oldP:it.p,oldG:it.g};
        }
      }
    }
    if(best.mi==null) break;
    state.days[di][best.mi][best.ci].prodId = best.p.i;
    state.days[di][best.mi][best.ci].customG = best.g;
    ops.push(best);
  }
  const after = calcDay(di), afterScore = simpleFitScore(after,t);
  return {changed:afterScore < beforeScore - 0.00005, before, after, ops, beforeScore, afterScore};
}
function autoFitSimpleDay(){
  const res = fitSimpleDay(state.activeDay);
  if(res.reason){ alert(res.reason); return; }
  const box = byId('autoFitMsg');
  if(!res.changed || !res.ops.length){
    state.ui.autoFitMsg = {day:state.activeDay, html:'<b>День уже близько до норми.</b> Прості продукти або впираються в межі порцій, або не дадуть кращого балансу без ширшої перебудови меню.'};
  }else{
    const lastBySlot = new Map();
    for(const op of res.ops) lastBySlot.set(op.mi+':'+op.ci,op);
    const moves = [...lastBySlot.values()].slice(0,4).map(op=>{
      const unit = portionUnit(op.p);
      const prefix = op.p.i===op.oldP.i ? '' : `${fitMsgEscape(op.oldP.n)} → `;
      const diff = op.p.i===op.oldP.i ? op.g-op.oldG : op.g;
      const signed = op.p.i===op.oldP.i && Math.abs(diff)>=0.5 ? ` (${diff>0?'+':'−'}${fmt(Math.abs(diff))} ${unit})` : '';
      return `${prefix}${fitMsgEscape(op.p.n)} ${fmt(op.g)} ${unit}${signed}`;
    }).join('; ');
    state.ui.autoFitMsg = {day:state.activeDay,
      html:`<b>Дотягнуто простими продуктами.</b> ${moves}. Найбільше відхилення: ${simpleFitDistance(res.before,calcTargets())} → ${simpleFitDistance(res.after,calcTargets())}.`};
  }
  renderDay(); renderShop();
}

const DAY_MS=86400000;
function isoDay(iso){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));
  if(!m) return NaN;
  const t=Date.UTC(+m[1],+m[2]-1,+m[3]);
  const d=new Date(t);
  return Number.isFinite(t)&&d.getUTCFullYear()===+m[1]&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[3]
    ? t/DAY_MS : NaN;
}
function normalizeWeightEntries(entries=state.weights){
  const byDate=new Map();
  (Array.isArray(entries)?entries:[]).forEach((e,index)=>{
    const t=isoDay(e&&e.d), w=+(e&&e.w), waist=+(e&&e.waist);
    if(!Number.isFinite(t) || !Number.isFinite(w) || w<30 || w>300) return;
    byDate.set(e.d,{d:e.d,t,w:Math.round(w*10)/10,
      waist:Number.isFinite(waist)&&waist>=40&&waist<=250?Math.round(waist*10)/10:null,_i:index});
  });
  return [...byDate.values()].sort((a,b)=>a.t-b.t);
}
function normalizeCheckins(entries=state.checkins){
  const byDate=new Map();
  (Array.isArray(entries)?entries:[]).forEach((e,index)=>{
    const t=isoDay(e&&e.d);
    if(!Number.isFinite(t)) return;
    const adherence=Math.round(clampNum(e.adherence,0,100,90));
    const hunger=Math.round(clampNum(e.hunger,1,5,3));
    const energy=Math.round(clampNum(e.energy,1,5,3));
    const performance=Math.round(clampNum(e.performance,1,5,3));
    byDate.set(e.d,{d:e.d,t,adherence,hunger,energy,performance,_i:index});
  });
  return [...byDate.values()].sort((a,b)=>a.t-b.t);
}
function recentCheckin(entries=state.checkins,refDay=null,maxAge=10){
  const all=normalizeCheckins(entries);
  if(!all.length) return null;
  const ref=Number.isFinite(refDay)?refDay:all[all.length-1].t;
  const eligible=all.filter(x=>x.t<=ref+2&&ref-x.t<=maxAge);
  return eligible.length?eligible[eligible.length-1]:null;
}
function rollingWeightPoints(entries=state.weights,windowDays=7){
  const ws=normalizeWeightEntries(entries), span=Math.max(1,+windowDays||7);
  return ws.map((e,i)=>{
    const recent=ws.slice(0,i+1).filter(x=>x.t>e.t-span && x.t<=e.t);
    const waist=recent.filter(x=>x.waist!=null);
    return {d:e.d,t:e.t,raw:e.w,w:recent.reduce((s,x)=>s+x.w,0)/recent.length,
      waist:waist.length?waist.reduce((s,x)=>s+x.waist,0)/waist.length:null,_i:e._i};
  });
}
function median(values){
  const a=values.filter(Number.isFinite).sort((x,y)=>x-y), n=a.length;
  return n ? (n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2) : null;
}
/* Theil–Sen: медіана всіх попарних нахилів. Менш чутлива до одного
   солоного вечора, циклу чи випадкового зважування, ніж звичайна пряма. */
function robustWeeklyRate(points){
  const slopes=[];
  for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++){
    const days=points[j].t-points[i].t;
    if(days>=3) slopes.push((points[j].w-points[i].w)/days*7);
  }
  return median(slopes);
}
/* Динамічний коридор: лінійна межа та межа зі згасанням темпу на 12%
   кожні 4 тижні. Це прогноз, не обіцянка результату. */
function expectedWeightAt(startWeight,days,t){
  const weekly=t.realRate*t.pace.dir, n=Math.max(0,Math.round(days));
  const linear=startWeight+weekly*n/7;
  let damped=startWeight;
  for(let i=0;i<n;i++) damped += weekly/7*Math.pow(0.88,i/28);
  return {lo:Math.min(linear,damped),hi:Math.max(linear,damped),linear,damped};
}
function forecastRange(t,weeks){ return expectedWeightAt(state.profile.weight,weeks*7,t); }

function weightFeedback(entries=state.weights,t=calcTargets(),checkins=state.checkins){
  const ws=normalizeWeightEntries(entries), points=rollingWeightPoints(ws,7);
  const spanDays=ws.length>1?ws[ws.length-1].t-ws[0].t:0;
  const actualRate=robustWeeklyRate(ws);
  const expectedRate=t.pace.dir*t.realRate;
  const tolerance=t.pace.dir===0?0.15:Math.max(0.12,Math.abs(expectedRate)*0.35);
  const ready=ws.length>=3&&spanDays>=14&&actualRate!=null;
  const mature=ws.length>=4&&spanDays>=21&&actualRate!=null;
  const checkin=recentCheckin(checkins,ws.length?ws[ws.length-1].t:null,10);
  const overFastLoss = ready && actualRate<0 && Math.abs(actualRate)/Math.max(1,ws[ws.length-1].w)>0.01;
  let code='collecting', adjustment=0, blocked=false;
  if(ready){
    const delta=actualRate-expectedRate;
    if(Math.abs(delta)<=tolerance) code='onTrack';
    else if(!mature) code='observe';
    else{
      const raw=(expectedRate-actualRate)*KCAL_PER_KG/7;
      adjustment=Math.sign(raw)*Math.min(150,Math.max(100,Math.round(Math.abs(raw)/50)*50));
      if(adjustment<0&&(t.belowBmr||t.clamped||medicalSafety().blocked)){
        adjustment=0; blocked=true; code='safetyReview';
      }else if(adjustment<0&&!checkin){
        adjustment=0; code='checkinNeeded';
      }else if(adjustment<0&&checkin.adherence<80){
        adjustment=0; code='adherenceReview';
      }else if(adjustment<0&&(checkin.hunger>=4||checkin.energy<=2||checkin.performance<=2)){
        adjustment=0; code='recoveryReview';
      }else code=adjustment>0?'raise':'lower';
    }
  }
  return {ws,points,spanDays,actualRate,expectedRate,tolerance,ready,mature,code,adjustment,blocked,checkin,overFastLoss};
}

/* Три близькі за поживністю альтернативи для швидкої клієнтської заміни. */
function swapAlternatives(day,mi,ci,limit=3){
  const current=day && day.meals[mi] && day.meals[mi].items[ci];
  if(!current) return [];
  const used=new Set(day.meals.flatMap(m=>m.items.map(it=>it.p.i)));
  const targetKcal=current.g*current.p.k/100;
  const density=(p,key)=>(+p[key]||0)/Math.max(1,+p.k||0);
  return selectList(current.tpl.cat,current.p.i)
    .filter(p=>p.i!==current.p.i && !p.season && p.k>0)
    .map(p=>{
      const [lo,hi]=gramBounds(p);
      let g=Math.min(hi,Math.max(lo,targetKcal/p.k*100));
      if(p.u) g=snapUnitGrams(p,g,lo,hi); else g=Math.round(g/5)*5;
      const score=Math.abs(density(p,'p')-density(current.p,'p'))*7
        +Math.abs(density(p,'f')-density(current.p,'f'))*4
        +Math.abs(density(p,'cb')-density(current.p,'cb'))*3
        +(used.has(p.i)?0.18:0)+(p.dish!==current.p.dish?0.08:0);
      return {p,g:Math.min(hi,Math.max(lo,g)),score};
    }).sort((a,b)=>a.score-b.score || a.p.n.localeCompare(b.p.n)).slice(0,limit);
}
function applyClientSwap(mi,ci,prodId){
  if(!(state.ui && state.ui.mode==='client')) return false;
  const day=calcDay(state.activeDay);
  const alt=swapAlternatives(day,mi,ci,PRODUCTS.length).find(x=>x.p.i===prodId);
  const comp=state.days[state.activeDay] && state.days[state.activeDay][mi] && state.days[state.activeDay][mi][ci];
  if(!alt || !comp) return false;
  comp.prodId=alt.p.i;
  comp.customG=alt.g;
  return true;
}

/* ============ РЕНДЕР ============ */
const fmt = n => Math.round(n).toLocaleString(window.nutriLanguage==='en'?'en-US':'uk-UA');
const isClient = () => state.ui && state.ui.mode==='client';
const num1 = x => (Math.round(x*10)/10).toFixed(1).replace('.',window.nutriLanguage==='en'?'.':',');
/* темп: 0,35 лишається 0,35, а 0,40 стає 0,4 */
const numR = x => x.toFixed(2).replace(/0$/,'').replace('.',window.nutriLanguage==='en'?'.':',');
const num2 = x => x.toFixed(2).replace('.',window.nutriLanguage==='en'?'.':',');
function nutritionHelp(kind,t){
  const tr=(uk,en)=>window.nutriT?nutriT(uk,en):uk;
  const calcLabel=t.adjusted
    ? tr('розрахункової ваги','calculation weight')
    : tr('фактичної ваги','actual body weight');
  if(kind==='kcal') return tr(
    `BMR ${fmt(t.bmr)} ккал — оцінка витрат у спокої. З урахуванням руху й тренувань виходить ≈${fmt(t.tdee)} ккал, а ціль і темп змінюють план до ${fmt(t.kcal)} ккал. Через 2–3 тижні цифру слід звірити з трендом ваги.`,
    `BMR ${fmt(t.bmr)} kcal estimates resting needs. Movement and training bring expenditure to ≈${fmt(t.tdee)} kcal; the goal and selected rate set the plan at ${fmt(t.kcal)} kcal. Recheck it against the weight trend after 2–3 weeks.`);
  if(kind==='protein') return tr(
    `Орієнтир: ${state.settings.proteinPerKg} г/кг × ${num1(t.calcW)} кг ${calcLabel}. Така кількість підтримує ситість, відновлення й збереження м’язів; застосунок додатково не дозволяє білку витіснити жири та вуглеводи.`,
    `Guide: ${state.settings.proteinPerKg} g/kg × ${num1(t.calcW)} kg of ${calcLabel}. This supports satiety, recovery and muscle retention; the app also prevents protein from crowding out fat and carbohydrates.`);
  if(kind==='fat') return tr(
    `Базово ${state.settings.fatPct}% калорійності, але не нижче ${t.fatMin} г: щонайменше 0,6 г/кг розрахункової ваги та не менше 40 г. Це захищає надто низький рівень жирів і засвоєння жиророзчинних вітамінів.`,
    `The starting point is ${state.settings.fatPct}% of calories, but never below ${t.fatMin} g: at least 0.6 g/kg of calculation weight and no less than 40 g. This avoids an excessively low fat intake and supports absorption of fat-soluble vitamins.`);
  if(kind==='carb') return tr(
    `Вуглеводи отримують решту калорій після білка та жирів. Це не жорстка окрема норма: значення допомагає забезпечити енергію, зручні порції й збалансувати меню в межах загальної калорійності.`,
    `Carbohydrates receive the calories left after protein and fat. This is not a separate rigid requirement: it supports energy, practical portions and a balanced menu within the total calorie target.`);
  if(kind==='fiber') return tr(
    `Мінімальний орієнтир — 14 г клітковини на кожні 1000 ккал, округлений до цілих грамів. Він підтримує ситість і роботу травної системи; різко збільшувати клітковину не варто.`,
    `The minimum guide is 14 g of fiber per 1,000 kcal, rounded to whole grams. It supports satiety and digestive function; fiber should not be increased abruptly.`);
  return tr(
    'Білки й вуглеводи дають приблизно 4 ккал на грам, жири — 9 ккал. Смуга показує частку енергії, а не просто співвідношення грамів.',
    'Protein and carbohydrate provide about 4 kcal per gram; fat provides 9 kcal. The bar shows the share of energy, not merely the ratio of grams.');
}
function formulaHelp(t){
  const tr=(uk,en)=>window.nutriT?nutriT(uk,en):uk;
  const pr=sanitizeProfile();
  const sexUk=pr.sex==='m' ? '+ 5 (чоловік)' : '− 161 (жінка)';
  const sexEn=pr.sex==='m' ? '+ 5 (male)' : '− 161 (female)';
  const formulaUk='10 × '+num1(pr.weight)+' кг + 6,25 × '+fmt(pr.height)+' см − 5 × '+fmt(pr.age)+' років '+sexUk+' = '+fmt(t.bmr)+' ккал';
  const formulaEn='10 × '+num1(pr.weight)+' kg + 6.25 × '+fmt(pr.height)+' cm − 5 × '+fmt(pr.age)+' years '+sexEn+' = '+fmt(t.bmr)+' kcal';
  return tr(
    'BMR (Basal Metabolic Rate) — базальний обмін речовин. У застосунку це оцінка енергії, яку організм витрачає у спокої на дихання, кровообіг, роботу органів і підтримання температури. Формула Міффліна–Сан Жеора для цього профілю: '+formulaUk+'. Далі BMR множиться на коефіцієнт активності '+num2(activityFactor(pr))+' → приблизні добові витрати '+fmt(t.tdee)+' ккал; потім враховуються ціль і обраний темп → '+fmt(t.kcal)+' ккал. Це розрахункова оцінка, а не окрема ціль харчування чи абсолютна нижня межа.',
    'BMR (Basal Metabolic Rate) estimates the energy your body uses at rest for breathing, circulation, organ function and temperature regulation. The Mifflin–St Jeor equation for this profile is: '+formulaEn+'. BMR is then multiplied by the activity factor '+num2(activityFactor(pr))+' → estimated daily expenditure '+fmt(t.tdee)+' kcal; the goal and selected rate then set '+fmt(t.kcal)+' kcal. This is a prediction, not a standalone calorie target or an absolute minimum.'
  );
}
function qualityMetricHelp(kind,t,highSweat=false){
  const tr=(uk,en)=>window.nutriT?nutriT(uk,en):uk;
  if(kind==='sodium'&&highSweat) return tr(
    'Загальний орієнтир ВООЗ для дорослих — менше 2000 мг натрію на добу. Під час тривалого навантаження, спеки або рясного потовиділення додаткове відновлення натрію залежить від фактичних втрат поту, тому застосунок не встановлює універсальну підвищену межу.',
    'The general WHO guide for adults is below 2,000 mg sodium per day. During prolonged exercise, heat or heavy sweating, additional replacement depends on actual sweat losses, so the app does not set one universal higher limit.');
  if(kind==='sodium') return tr(
    'Орієнтир ВООЗ для дорослих — менше 2000 мг натрію на добу, що приблизно відповідає 5 г кухонної солі з усіх джерел. Це популяційна межа, а не персональний медичний припис.',
    'The WHO guide for adults is below 2,000 mg sodium per day, roughly equivalent to 5 g of salt from all sources. This is a population guideline, not an individual medical prescription.');
  if(kind==='satfat') return tr(
    `Межа ${fmt(qualityLimits(t).sf)} г відповідає 10% добової енергії. ВООЗ радить не перевищувати цю частку й переважно замінювати насичені жири ненасиченими.`,
    `The ${fmt(qualityLimits(t).sf)} g limit equals 10% of daily energy. WHO recommends not exceeding this share and primarily replacing saturated fat with unsaturated fat.`);
  return tr(
    `Межа ${fmt(qualityLimits(t).sug)} г відповідає 10% добової енергії. Йдеться про додані цукри, мед, сиропи та соки — не про природні цукри у цілих фруктах і звичайному молоці.`,
    `The ${fmt(qualityLimits(t).sug)} g limit equals 10% of daily energy. It refers to added sugars, honey, syrups and juices, not naturally occurring sugars in whole fruit or plain milk.`);
}
function setHelpTooltip(el,text,label){
  if(!el) return;
  el.classList.add('has-tooltip');
  el.tabIndex=0;
  el.dataset.tip=text;
  el.dataset.tipLabel=label||'';
}
function tooltipAttrs(text,label){
  return `tabindex="0" data-tip="${escHtml(text)}" data-tip-label="${escHtml(label||'')}"`;
}
let activeHelpTarget=null;
function helpTooltipNode(){
  let tip=byId('nutritionTooltip');
  if(!tip){
    tip=document.createElement('div');
    tip.id='nutritionTooltip';
    tip.className='nutrition-tooltip';
    tip.setAttribute('role','tooltip');
    tip.hidden=true;
    document.body.appendChild(tip);
  }
  return tip;
}
function positionHelpTooltip(target){
  if(!target||!target.isConnected) return;
  const tip=helpTooltipNode(),pad=10,gap=10;
  const label=target.dataset.tipLabel;
  tip.textContent=(label?label+' — ':'')+(target.dataset.tip||'');
  tip.hidden=false;
  tip.classList.add('is-open');
  const anchor=target.getBoundingClientRect();
  const box=tip.getBoundingClientRect();
  const viewW=document.documentElement.clientWidth,viewH=document.documentElement.clientHeight;
  const spaces={above:anchor.top-gap,below:viewH-anchor.bottom-gap,left:anchor.left-gap,right:viewW-anchor.right-gap};
  const siblings=[...(target.parentElement?.children||[])].filter(el=>el!==target);
  const hasSideNeighbor=side=>siblings.some(el=>{
    const r=el.getBoundingClientRect();
    const sameRow=r.bottom>anchor.top+4&&r.top<anchor.bottom-4;
    return sameRow&&(side==='right'?r.left>=anchor.right-2:r.right<=anchor.left+2);
  });
  let side;
  if(spaces.above>=box.height) side='above';
  else if(spaces.right>=box.width&&!hasSideNeighbor('right')) side='right';
  else if(spaces.left>=box.width&&!hasSideNeighbor('left')) side='left';
  else if(spaces.below>=box.height) side='below';
  else side=spaces.above>=spaces.below?'above':'below';
  let rawTop=anchor.top+anchor.height/2-box.height/2;
  let rawLeft=anchor.left+anchor.width/2-box.width/2;
  if(side==='above') rawTop=anchor.top-gap-box.height;
  if(side==='below') rawTop=anchor.bottom+gap;
  if(side==='right') rawLeft=anchor.right+gap;
  if(side==='left') rawLeft=anchor.left-gap-box.width;
  const top=Math.max(pad,Math.min(rawTop,viewH-box.height-pad));
  const left=Math.max(pad,Math.min(rawLeft,viewW-box.width-pad));
  tip.style.top=`${Math.round(top)}px`;
  tip.style.left=`${Math.round(left)}px`;
  tip.dataset.side=side;
  target.setAttribute('aria-describedby',tip.id);
}
function openHelpTooltip(target){
  if(activeHelpTarget&&activeHelpTarget!==target) activeHelpTarget.removeAttribute('aria-describedby');
  activeHelpTarget=target;
  positionHelpTooltip(target);
}
function closeHelpTooltip(target=null){
  if(target&&target!==activeHelpTarget) return;
  if(activeHelpTarget) activeHelpTarget.removeAttribute('aria-describedby');
  activeHelpTarget=null;
  const tip=byId('nutritionTooltip');
  if(!tip) return;
  tip.classList.remove('is-open');
  tip.hidden=true;
}
document.addEventListener('pointerover',e=>{
  const target=e.target.closest?.('.has-tooltip');
  if(target&&!target.contains(e.relatedTarget)) openHelpTooltip(target);
});
document.addEventListener('pointerout',e=>{
  const target=e.target.closest?.('.has-tooltip');
  if(target&&!target.contains(e.relatedTarget)&&document.activeElement!==target) closeHelpTooltip(target);
});
document.addEventListener('focusin',e=>{if(e.target.matches?.('.has-tooltip')) openHelpTooltip(e.target)});
document.addEventListener('focusout',e=>{if(e.target.matches?.('.has-tooltip')) closeHelpTooltip(e.target)});
document.addEventListener('pointerdown',e=>{if(activeHelpTarget&&!e.target.closest?.('.has-tooltip')) closeHelpTooltip()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeHelpTarget){const target=activeHelpTarget;closeHelpTooltip();target.blur()}});
addEventListener('resize',()=>{if(activeHelpTarget) positionHelpTooltip(activeHelpTarget)});
addEventListener('scroll',()=>{if(activeHelpTarget) closeHelpTooltip()},true);
function applyMode(){
  document.body.setAttribute('data-mode', isClient() ? 'client' : 'pro');
  byId('btnMode').textContent = isClient() ? '⚙️' : '👤';
  byId('btnMode').title = isClient() ? 'Повернутись у режим спеціаліста' : 'Подивитись очима клієнта';
  byId('btnMode').style.display = (isClient() && state.ui.locked) ? 'none' : '';
  byId('unlockRow').style.display = (isClient() && !state.ui.locked) ? '' : 'none';
  const nm = state.profile.name;
  byId('appTitle').textContent = isClient()
    ? (nm ? `Програма харчування — ${nm}` : 'Ваша програма харчування')
    : 'Конструктор програми харчування';
  byId('appLead').textContent = isClient()
    ? 'Норми, меню на тиждень і список покупок. Продукти в межах одного рядка рівноцінні — можна міняти місцями, зберігаючи вказану порцію.'
    : 'Індивідуальний розрахунок калорійності та БЖВ і побудова тижневого меню з рівноцінних продуктів — обирайте будь-який продукт зі списку, грами перерахуються автоматично.';
}
function renderTargets(){
  const t = calcTargets();
  const helpLabel=window.nutriT?nutriT('Чому така норма?','Why this target?'):'Чому така норма?';
  setHelpTooltip(byId('tKcal2').closest('.tile'),nutritionHelp('kcal',t),helpLabel);
  setHelpTooltip(byId('tProt').closest('.tile'),nutritionHelp('protein',t),helpLabel);
  setHelpTooltip(byId('tFat').closest('.tile'),nutritionHelp('fat',t),helpLabel);
  setHelpTooltip(byId('tCarb').closest('.tile'),nutritionHelp('carb',t),helpLabel);
  setHelpTooltip(byId('tFib').closest('.tile'),nutritionHelp('fiber',t),helpLabel);
  setHelpTooltip(byId('sBar').closest('.split'),nutritionHelp('split',t),
    window.nutriT?nutriT('Як читати розподіл?','How to read this distribution?'):'Як читати розподіл?');
  byId('tKcal').textContent = fmt(t.kcal);
  byId('tKcal2').textContent = fmt(t.kcal);
  byId('tKcalSub').textContent = `BMR ${fmt(t.bmr)} · Витрати ${fmt(t.tdee)} ккал`;
  /* пояснення людською мовою */
  const diff = t.kcal - t.tdee;
  const explByGoal = {
    loss:  `Це на ${fmt(Math.abs(diff))} ккал менше за ваші добові витрати — темп, за якого вага знижується поступово, без втрати м’язів.`,
    maintain: `Стільки ви витрачаєте за добу — раціон утримує вагу та форму на місці.`,
    gain:  `Це на ${fmt(Math.abs(diff))} ккал більше за ваші добові витрати — помірний профіцит для росту м’язів без зайвого жиру.`
  };
  byId('tExpl').textContent = explByGoal[state.profile.goal];
  byId('tWater').innerHTML = waterHtml(state.profile.weight);
  byId('tForecast').innerHTML = forecastHtml(t);
  renderBmi(t);
  renderMacroWarn(t);
  /* розподіл калорій між нутрієнтами — стовпчик частин цілого */
  const parts = [
    {k:'Білки',    kcal:t.prot*4, g:t.prot, col:'var(--s-prot)'},
    {k:'Жири',     kcal:t.fat*9,  g:t.fat,  col:'var(--s-fat)'},
    {k:'Вуглеводи',kcal:t.carb*4, g:t.carb, col:'var(--s-carb)'}
  ];
  const sum = parts.reduce((a,p)=>a+p.kcal,0) || 1;
  byId('sBar').innerHTML = parts.map(p=>{
    const pc = p.kcal/sum*100;
    /* підпис усередині — лише якщо сегмент достатньо широкий */
    return `<div style="flex:${pc};background:${p.col}" title="${p.k}: ${Math.round(pc)}%">${pc>=12?Math.round(pc)+'%':''}</div>`;
  }).join('');
  byId('sLegend').innerHTML = parts.map(p=>
    `<span class="sitem"><i style="background:${p.col}"></i><span class="skey">${p.k}</span><b>${p.g} г</b></span>`).join('');
  byId('tProt').textContent = t.prot+' г';
  byId('tProtSub').textContent = `${fmt(t.prot*4)} ккал · ${Math.round(t.prot*4/t.kcal*100)}%`;
  byId('tFat').textContent = t.fat+' г';
  byId('tFatSub').textContent = `${fmt(t.fat*9)} ккал · ${Math.round(t.fat*9/t.kcal*100)}%`;
  byId('tCarb').textContent = t.carb+' г';
  byId('tCarbSub').textContent = `${fmt(t.carb*4)} ккал · ${Math.round(t.carb*4/t.kcal*100)}%`;
  byId('tFib').textContent = t.fib+' г';
  byId('tFibSub').textContent = 'мінімум на день · 14 г / 1000 ккал';
  const pc = Math.round(t.pace.pct);
  const goals = {loss:`дефіцит ${pc}%`, maintain:'підтримка', gain:`профіцит ${pc}%`};
  byId('tFormulaNote').textContent =
    `Формула Міффліна–Сан Жеора · активність ${num2(activityFactor(state.profile))} · ціль: ${goals[state.profile.goal]}` +
    ` · білок ${state.settings.proteinPerKg} г/кг${t.adjusted?' розрахункової ваги':''} · жири ${state.settings.fatPct}%` +
    ` · клітковина ${t.fib} г` +
    (state.settings.sweetPct ? ` · смаколики ${state.settings.sweetPct}%` : '');
  setHelpTooltip(byId('tFormulaNote'),formulaHelp(t),
    window.nutriT?nutriT('Як працюють формула та BMR?','How do the formula and BMR work?'):'Як працюють формула та BMR?');
  byId('lowKcalWarn').style.display = t.clamped ? '' : 'none';
  const af = activityFactor(state.profile);
  byId('actNote').innerHTML =
    `Коефіцієнт активності: <b>${af.toFixed(2).replace('.',window.nutriLanguage==='en'?'.':',')}</b> — рух протягом дня і тренування рахуються окремо, ` +
    `з реальних витрат (≈40 ккал на 1000 кроків, ≈350 ккал за тренування). Тому значення нижчі за звичні ` +
    `таблиці 1,375/1,55 — ті завищують внесок тренувань у 3–4 рази. ` +
    `<span style="color:var(--muted)">Це стартова оцінка: через 2–3 тижні звірте з фактичною динамікою ваги ` +
    `в розділі «Прогрес» і за потреби скоригуйте дефіцит або профіцит.</span>`;
}

/* ІМТ, талія до зросту та розрахункова вага — чипи під анкетою */
function renderBmi(t){
  const pr = state.profile, b = t.bmi;
  const muscularHigh = !!pr.muscular && b>=25;
  const cls = muscularHigh ? '' : (b<18.5||b>=30 ? ' bad' : (b>=25 ? ' warn' : ''));
  let html = `<span class="chip${cls}">ІМТ <b>${num1(b)}</b> ${bmiLabel(b,pr)}</span>`;
  const wr = waistRisk(pr);
  if(wr) html += `<span class="chip${wr.lvl===2?' bad':wr.lvl===1?' warn':''}">Талія <b>${pr.waist} см</b> · до зросту <b>${num2(wr.ratio)}</b> — ${wr.txt}</span>`;
  if(pr.muscular) html += `<span class="chip ok">М’язова статура <b>врахована</b></span>`;
  if(t.adjusted) html += `<span class="chip" title="Норми білка та жирів рахуються на скориговану вагу. Для атлетичної статури враховується більша частка перевищення, але не вся фактична вага.">Розрахункова вага <b>${num1(t.calcW)} кг</b></span>`;
  if(muscularHigh){
    html += `<div class="bmi-note">ІМТ не розрізняє м’язи та жир, тому ярлик надлишкової ваги не застосовується. Білок і жири рахуються зі скоригованої ваги з більшою поправкою на м’язову масу. ${wr&&wr.lvl>0?'Водночас співвідношення талії до зросту вище 0,5 — оцініть склад тіла та кардіометаболічні фактори окремо.':'Для контролю орієнтуйтесь на талію відносно зросту та, за можливості, вимір складу тіла.'}</div>`;
  }else if(b>=25){
    html += `<div class="bmi-note">ІМТ — скринінговий показник, а не діагноз: він не відрізняє жир від м’язів. Інтерпретуйте його разом із талією відносно зросту, анамнезом і, за можливості, складом тіла.</div>`;
  }
  byId('bmiRow').innerHTML = html;
}
/* прогноз ваги за поточного темпу */
function forecastHtml(t){
  if(!t.pace.dir) return `Вага утримується на поточному рівні.`;
  const w = state.profile.weight;
  const pctBW = t.realRate/Math.max(1,w)*100;
  const pts = [4,8,12].map(k=>{ const x=forecastRange(t,k);
    return `<b>${k} тиж.</b> ${num1(x.lo)}–${num1(x.hi)} кг`; }).join(' · ');
  const req = Math.round(t.pace.rate*10)/10, got = Math.round(t.realRate*10)/10;
  let warn = '';
  if(pctBW > 1) warn = `<br><span class="risky">Темп понад 1% маси тіла на тиждень — високий ризик втрати м'язів. Клінічний коридор: 0,5–1%.</span>`;
  else if(t.pace.dir<0 && t.pace.deficitCapped) warn = `<br><span class="risky">Дефіцит обмежено 25% добових витрат; заданий швидший темп не використано.</span>`;
  else if(t.pace.rateCapped) warn = `<br><span class="risky">Темп обмежено 1% поточної маси тіла на тиждень.</span>`;
  else if(got < req-0.02) warn = `<br><span class="risky">Фактичний темп нижчий за заданий: калорійність підняли до безпечного мінімуму.</span>`;
  return `За темпу <b>${numR(t.realRate)} кг/тиждень</b> (${num1(pctBW)}% маси тіла), орієнтовний коридор: ${pts}. Нижня/верхня межа враховує нормальне поступове зниження витрат.${warn}`;
}
/* попередження про межі БЖВ */
function renderMacroWarn(t){
  const box = byId('macroWarn'), msgs = [];
  if(t.fatLifted) msgs.push(`Жири підняті до <b>${t.fat} г</b> — нижче цієї межі (${t.fatMin} г) страждають статеві гормони й засвоєння вітамінів A, D, E, K. Повзунок «жири, %» тут уже не діє.`);
  if(t.protTrimmed) msgs.push(`Білок зменшено до <b>${t.prot} г</b>, щоб лишити місце вуглеводам: за такої калорійності задана норма білка не поміщається.`);
  if(t.proteinCapped) msgs.push(`Білок обмежено до <b>${t.prot} г</b> (не більше 35% енергії), щоб надмірна норма не витіснила жири та вуглеводи.`);
  const sweetKcal = t.kcal*(state.settings.sweetPct||0)/100;
  if((state.settings.sweetPct||0) > 10)
    msgs.push(`Смаколики — <b>${fmt(sweetKcal)} ккал</b> (${state.settings.sweetPct}% раціону). ВООЗ радить тримати вільні цукри нижче 10% енергії; вище 10% тримайте слот на фруктах, чорному шоколаді чи горіхах, а не на цукерках.`);
  if(t.fib >= 35) msgs.push(`Норма клітковини <b>${t.fib} г</b> — нарощуйте її поступово (по 5 г на тиждень) і збільшуйте воду, інакше буде здуття.`);
  box.innerHTML = msgs.map(m=>`<div>${m}</div>`).join('<div style="height:7px"></div>');
  box.style.display = msgs.length ? '' : 'none';
}

function renderSafety(t){
  const med = medicalSafety();
  const box = byId('safetyWarn'), msgs = [];
  if(med.blocked)
    msgs.push(`<b>Автоматичне складання призупинено.</b> Позначено: ${med.labels.join(', ')}. Для такого профілю потрібне індивідуальне погодження з лікарем або профільним дієтологом.`);
  if(t.belowBmr && state.profile.goal==='loss')
    msgs.push(`Розрахована калорійність нижча за оцінений BMR (${fmt(t.bmr)} ккал). BMR не використовується як жорстка межа, але це сигнал переглянути активність, заданий темп і переносимість раціону.`);
  if(t.pace.rateCapped || t.pace.deficitCapped)
    msgs.push(`Запитаний темп схуднення автоматично зменшено: діють межі до 1% маси тіла на тиждень і до 25% добових витрат.`);
  box.innerHTML = msgs.map(m=>`<div>${m}</div>`).join('<div style="height:7px"></div>');
  box.className = 'notice'+(med.blocked?' critical':'');
  box.style.display = msgs.length ? '' : 'none';

  const pools = menuPoolReport(), pbox = byId('poolWarn'), pmsgs = [];
  if(pools.empty.length)
    pmsgs.push(`<b>Меню не генерується:</b> немає дозволених продуктів у категоріях ${pools.empty.join(', ')}. Виключення не будуть обійдені автоматично.`);
  if(pools.limited.length)
    pmsgs.push(`Мало варіантів для ротації: ${pools.limited.map(x=>x.label+' — '+x.n).join('; ')}.`);
  if(state.profile.diet==='vegan')
    pmsgs.push('Веганський профіль використовує лише явно позначені рослинні продукти. Окремо перевірте B12, кальцій, йод, залізо, цинк та омега-3: цей конструктор не підтверджує їх повне покриття.');
  pbox.innerHTML = pmsgs.map(m=>`<div>${m}</div>`).join('<div style="height:7px"></div>');
  pbox.className = 'notice'+(pools.empty.length?' critical':'');
  pbox.style.display = pmsgs.length ? '' : 'none';

  const blocked = !!generationBlockReason();
  for(const id of ['btnGenDay','btnGenWeek','btnCopyDay','btnAutoFit','btnShareClient']){
    const el=byId(id); if(!el) continue;
    el.disabled = blocked;
    el.title = blocked ? generationBlockReason() : '';
  }
}

function renderDayTabs(){
  byId('dayTabs').innerHTML = DAY_SHORT.map((d,i)=>
    `<button type="button" data-d="${i}" class="${i===state.activeDay?'on':''}">${d}</button>`).join('');
}

function devPct(got, target){ return target>0 ? (got-target)/target*100 : 0; }
function devText(d){ return `${d>0?'+':'−'}${Math.abs(d).toFixed(0)}%`; }

function macroRow(kind,name,colorVar,got,target,unit,plain,t){
  const pct = target>0 ? Math.min(130, got/target*100) : 0;
  const d = devPct(got,target), a = Math.abs(d);
  const cls = plain ? '' : (a>10 ? 'off' : (a>5 ? 'near' : ''));
  const mark = (!plain && a>5) ? ` <b>${devText(d)}</b>` : '';
  const help=nutritionHelp(kind,t); return `<div class="m-row ${cls} has-tooltip" ${tooltipAttrs(help,name)}>
    <div class="m-ring" style="--m-pct:${Math.min(100,pct)};--m-color:var(${colorVar})">
      <div class="m-center"><strong>${fmt(got)}</strong><span>${unit}</span></div>
    </div>
    <div class="m-meta">
      <div class="m-name"><span class="dot" style="width:9px;height:9px;border-radius:50%;background:var(${colorVar})"></span>${name}</div>
      <div class="m-val">ціль ${fmt(target)} ${unit}${mark}</div>
    </div>
  </div>`;
}

function qualitySummary(tot,t){
  const lim=qualityLimits(t);
  const highSweat=state.settings.sodiumContext==='highSweat';
  const rows=[
    {kind:'sodium',name:highSweat?'Натрій у меню':'Натрій',got:tot.na,max:highSweat?null:lim.na,unit:'мг'},
    {kind:'satfat',name:'Насичені жири',got:tot.sf,max:lim.sf,unit:'г'},
    {kind:'sugar',name:'Вільні цукри',got:tot.sug,max:lim.sug,unit:'г'}
  ];
  const cards=rows.map(x=>{
    const help=qualityMetricHelp(x.kind,t,highSweat);
    if(x.max==null) return `<div class="quality-item ok has-tooltip" ${tooltipAttrs(help,x.name)}>
      <div class="qh"><span>${x.name}</span><span class="qv">≈ ${fmt(x.got)} ${x.unit}</span></div>
      <div class="hint" style="margin-top:7px">Базовий раціон + індивідуальне відновлення під час тривалого навантаження</div>
    </div>`;
    const pct=x.got/Math.max(1,x.max)*100;
    const cls=pct>100?'bad':pct>80?'warn':'ok';
    return `<div class="quality-item ${cls} has-tooltip" ${tooltipAttrs(help,x.name)}>
      <div class="qh"><span>${x.name}</span><span class="qv">≈ ${fmt(x.got)} / ${fmt(x.max)} ${x.unit}</span></div>
      <div class="qbar"><div class="qfill" style="width:${Math.min(100,pct)}%"></div></div>
    </div>`;
  }).join('');
  return `<details class="quality pro-only">
    <summary>Детальна оцінка якості раціону</summary>
    <div class="quality-head"><b>Орієнтовний світлофор якості</b><span>${highSweat
      ?'Для тривалого навантаження натрій оцінюється окремо за втратами поту'
      :'ВООЗ: натрій &lt; 2000 мг, насичені жири й вільні цукри &lt; 10% енергії'}</span></div>
    <div class="quality-grid">${cards}</div>
    <div class="hint" style="margin-top:7px">Довідкова оцінка: склад конкретного бренду та кількість доданої під час готування солі можуть відрізнятися.</div>
  </details>`;
}

function balanceHints(tot, t){
  const items = [
    {
      name:'Білки', got:tot.p, target:t.prot, unit:'г',
      low:'Білку ще не вистачає для ситості й відновлення. Додай курку, рибу, яйця, сир або грецький йогурт.',
      high:'Білка вже з запасом. Якщо калорії тиснуть, зменш м’ясо, сир або порцію протеїнового продукту.',
      ok:'Білкова опора дня зібрана добре.'
    },
    {
      name:'Жири', got:tot.f, target:t.fat, unit:'г',
      low:'Жирів малувато для гормонів і засвоєння вітамінів. Додай 5–10 г олії, горіхів, авокадо або жирної риби.',
      high:'Жири сьогодні трохи забрали калорії на себе. Зменш олію, горіхи, сир, майонез або жирніше м’ясо.',
      ok:'Жири тримаються в комфортному коридорі.'
    },
    {
      name:'Вуглеводи', got:tot.c, target:t.carb, unit:'г',
      low:'Вуглеводів малувато для енергії. Додай крупу, картоплю, хліб, фрукти або трохи збільш гарнір.',
      high:'Вуглеводи вийшли вперед. Підріж гарнір, хліб, солодке або обери менш вуглеводний перекус.',
      ok:'Енергія дня зібрана рівно.'
    },
    {
      name:'Клітковина', got:tot.fb, target:t.fib, unit:'г',
      low:'Клітковини бракує для ситості й травлення. Додай овочі, ягоди, бобові або цільнозерновий продукт.',
      high:'Клітковини достатньо. Якщо є здуття, піднімай її поступово й не забувай про воду.',
      ok:'Клітковина закриває мінімум дня.'
    }
  ];
  const cards = items.map(x=>{
    const d = x.got - x.target;
    const pct = devPct(x.got, x.target);
    const a = Math.abs(pct);
    const cls = a>10 ? 'bad' : (a>5 ? 'warn' : 'ok');
    const diff = Math.abs(d)<0.05 ? `0 ${x.unit}` : `${d>0?'+':'−'}${fmt(Math.abs(d))} ${x.unit}`;
    const action = cls==='ok' ? x.ok : (d<0 ? x.low : x.high);
    const label = cls==='ok' ? 'в нормі' : (d<0 ? 'бракує' : 'надлишок');
    return `<div class="bal ${cls}">
      <div class="bn"><span>${x.name}: ${label}</span><span class="bd">${diff}</span></div>
      <div class="ba">${action}</div>
    </div>`;
  }).join('');
  const worst = items
    .map(x=>({name:x.name, a:Math.abs(devPct(x.got,x.target))}))
    .sort((a,b)=>b.a-a.a)[0];
  const title = worst && worst.a>10 ? 'Є що підкрутити, але день легко врівноважити'
              : worst && worst.a>5 ? 'День майже зібраний, залишились дрібні штрихи'
              : 'Баланс дня тримається красиво';
  return `<div class="balance">
    <div class="bt"><b>Підказки балансу</b><span>${title}</span></div>
    <div class="bal-list">${cards}</div>
  </div>`;
}

/* підсумковий бейдж дивиться на ВСІ чотири цілі, а не лише на калорії */
function devBadge(tot, t){
  const rows = [
    {n:'калорії',   d:devPct(tot.k, t.kcal)},
    {n:'білок',     d:devPct(tot.p, t.prot)},
    {n:'жири',      d:devPct(tot.f, t.fat)},
    {n:'вуглеводи', d:devPct(tot.c, t.carb)}
  ];
  if(tot.fb < t.fib*0.9) rows.push({n:'клітковина', d:devPct(tot.fb, t.fib)});
  const worst = rows.reduce((a,b)=>Math.abs(b.d)>Math.abs(a.d)?b:a);
  const a = Math.abs(worst.d);
  if(a<=5)  return `<span class="badge ok">✓ Калорії та БЖВ у нормі</span>`;
  if(a<=10) return `<span class="badge warn">△ Невелике відхилення: ${worst.n} ${devText(worst.d)}</span>`;
  return `<span class="badge bad">✕ Значне відхилення: ${worst.n} ${devText(worst.d)}</span>`;
}

function mealDone(di, mi){ return !!state.done[di+':'+mi]; }
function renderDay(){
  const d = calcDay(state.activeDay);
  const t = d.targets;
  const cl = isClient();
  const doneN = d.meals.filter((_,mi)=>mealDone(state.activeDay,mi)).length;
  byId('clientNote').style.display = (cl && state.note) ? '' : 'none';
  byId('clientNote').className = 'notice cnote';
  if(cl && state.note) byId('clientNote').textContent = state.note;

  byId('daySummary').innerHTML = `
    <div class="top">
      <span class="kcal">${fmt(d.tot.k)} ккал</span>
      <span class="target">ціль ${fmt(t.kcal)} ккал · ${DAY_NAMES[state.activeDay]}</span>
      ${cl ? `<span class="prog">З'їдено <b>${doneN}</b> із ${d.meals.length} прийомів</span>`
           : devBadge(d.tot, t)}
    </div>
    <div class="macros">
      ${macroRow('protein','Білки','--s-prot',d.tot.p,t.prot,'г',cl,t)}
      ${macroRow('fat','Жири','--s-fat',d.tot.f,t.fat,'г',cl,t)}
      ${macroRow('carb','Вуглеводи','--s-carb',d.tot.c,t.carb,'г',cl,t)}
      ${macroRow('fiber','Клітковина','--s-fib',d.tot.fb,t.fib,'г',cl,t)}
    </div>
    ${qualitySummary(d.tot,t)}
    ${cl ? '' : balanceHints(d.tot, t)}
    ${cl ? '' : `<div class="hint" style="margin-top:9px">Білок за прийомами: ${
      d.meals.map(m=>fmt(m.tot.p)).join(' / ')} г — для повноцінного синтезу м'язового
      білка основні прийоми мають давати 25–30 г.</div>`}`;
  const fitBox = byId('autoFitMsg'), fitMsg = state.ui && state.ui.autoFitMsg;
  if(fitBox){
    fitBox.innerHTML = fitMsg && fitMsg.day===state.activeDay && !cl ? fitMsg.html : '';
    fitBox.style.display = fitBox.innerHTML ? '' : 'none';
  }

  const batch = state.settings.weekMode==='batch';
  byId('mealsWrap').innerHTML = d.meals.map((m,mi)=>{
    const lowP = !cl && ['b','l','d'].includes(m.def.id) && m.tot.p < 20;
    const reheat = batch && m.def.id==='l' && state.activeDay>0;
    return `
    <div class="meal">
      <div class="meal-head"><h3>${m.def.name} <span class="mt">· ${escHtml(mealTimes()[mi]||'')}${
          reheat ? ' · вчорашня вечеря, лише розігріти' : ''}</span></h3>
        ${cl ? `<label class="eaten"><input type="checkbox" class="ckEat" data-m="${mi}" ${
              mealDone(state.activeDay,mi)?'checked':''}>з'їдено</label>`
             : `<span class="mk">${fmt(m.tot.k)} ккал (ціль ~${fmt(m.mealKcal)}) ·
          Б <span class="mprot${lowP?' low':''}">${fmt(m.tot.p)} г</span> / Ж ${fmt(m.tot.f)} / В ${fmt(m.tot.c)} г</span>`}</div>
      ${m.items.map((it,ci)=>{
        const productLabel = window.nutriProductName ? nutriProductName(it.p) : it.p.n;
        const unit = portionUnit(it.p);
        const custom = it.mc.customG!=null;
        const ua = unitApprox(it.p,it.g);
        const swaps = cl ? swapAlternatives(d,mi,ci,3) : [];
        const swapMenu = swaps.length ? `<details class="swap-menu"><summary title="Рівноцінна заміна">⇄ Замінити</summary>
          <div class="swap-list">${swaps.map(x=>`<button type="button" class="swap-option" data-m="${mi}" data-c="${ci}" data-i="${escHtml(x.p.i)}">
            <span>${escHtml(window.nutriProductName?nutriProductName(x.p):x.p.n)}</span><span>≈ ${x.g} г</span></button>`).join('')}</div></details>` : '';
        const row = cl
          ? `<div class="comp">
              <span class="cat cat-${it.tpl.cat}" title="${CATS[it.tpl.cat].name}">${CATS[it.tpl.cat].short||CATS[it.tpl.cat].name}</span>
              <div class="pname">${escHtml(it.p.n)}${it.p.ml?' <span class="un">(напій)</span>':''}${it.p.dish?' <span class="un">(≈)</span>':''}${swapMenu}</div>
              <span class="gstat">${it.g} ${unit}${ua?` <span class="un">(${ua.replace('≈ ','')})</span>`:''}<button type="button"
                class="weigh-help-btn" data-m="${mi}" data-c="${ci}" aria-label="Як зважувати цей продукт" title="Як зважувати">?</button></span>
              <span class="ck">${it.p.dish?'≈ ':''}${fmt(it.g*it.p.k/100)} ккал</span>
            </div>`
          : `<div class="comp ${custom?'custom':''}">
              <span class="cat cat-${it.tpl.cat}" title="${CATS[it.tpl.cat].name}">${CATS[it.tpl.cat].short||CATS[it.tpl.cat].name}</span>
              <button type="button" data-m="${mi}" data-c="${ci}" data-cat="${it.tpl.cat}"
                class="product-select-btn" aria-label="Вибрати продукт" aria-haspopup="listbox" aria-expanded="false">
                <span class="product-select-label">${escHtml(productLabel)}</span>
                <span class="product-select-chevron" aria-hidden="true">⌄</span></button>
              <span class="gwrap"><input type="number" class="inpG" data-m="${mi}" data-c="${ci}"
                 value="${it.g}" min="0" max="900" step="${inputGramStep(it.p)}" aria-label="Порція"><span class="un"><span class="unit-line"><span>${unit}</span>
                   <button type="button" class="weigh-help-btn" data-m="${mi}" data-c="${ci}" aria-label="Як зважувати цей продукт" title="Як зважувати">?</button></span>${ua ? '<b>'+ua+'</b>' : ''}</span></span>
              <span class="ck">${it.p.dish?'≈ ':''}${fmt(it.g*it.p.k/100)} ккал</span>
              <button type="button" class="reset-g" data-m="${mi}" data-c="${ci}"
                 title="Повернути авторозрахунок" ${custom?'':'style="visibility:hidden"'}>↺</button>
            </div>`;
        return row + (it.p.rc ? `<div class="rcnote"><b>Як приготувати:</b> ${escHtml(it.p.rc)}</div>` : '');
      }).join('')}
    </div>`;}).join('');
  saveLocal();
}

function renderShop(){
  const agg = new Map();
  for(let di=0; di<7; di++){
    const d = calcDay(di);
    for(const m of d.meals) for(const it of m.items){
      agg.set(it.p.i, (agg.get(it.p.i)||0) + it.g);
    }
  }
  const cats = Object.keys(CATS).sort((a,b)=>CATS[a].order-CATS[b].order);
  const groups = cats.map(c=>{
    const items = [...agg.entries()]
      .map(([id,g])=>({p:prodById(id),g}))
      .filter(x=>x.p && (x.p.dish ? c==='dish' : x.p.c===c))
      .sort((a,b)=>b.g-a.g);
    if(!items.length) return null;
    return {count:items.length,html:`<div><h4>${CATS[c].name}</h4><ul>${items.map(x=>
      `<li><span>${escHtml(x.p.n)}${x.p.ml?' (напій)':x.p.dry?' (суха вага)':x.p.raw?' (сира вага)':''}</span><b>${shopAmount(x.p,x.g)}</b></li>`).join('')}</ul></div>`};
  }).filter(Boolean);
  byId('shopList').innerHTML = groups.map(x=>x.html).join('');
  const itemCount=groups.reduce((sum,x)=>sum+x.count,0),categoryCount=groups.length;
  const ukForm=(n,one,few,many)=>n%10===1&&n%100!==11?one:[2,3,4].includes(n%10)&&![12,13,14].includes(n%100)?few:many;
  byId('shopCount').textContent=window.nutriLanguage==='en'
    ? `${itemCount} items · ${categoryCount} categories`
    : `${itemCount} ${ukForm(itemCount,'позиція','позиції','позицій')} · ${categoryCount} ${ukForm(categoryCount,'категорія','категорії','категорій')}`;
}

function renderTrainingPromo(){
  const copy = TRAINING_PROMO_COPY[state.profile.goal] || TRAINING_PROMO_COPY.maintain;
  byId('trainingPromoTitle').textContent = copy.title;
  byId('trainingPromoText').textContent = copy.text;
}

function renderAll(){
  applyMode(); syncPersonalSettings(); renderTargets(); renderSafety(calcTargets()); renderDayTabs(); renderDay(); renderShop(); renderWeight(); renderTrainingPromo(); saveLocal();
}

/* ============ ТРЕКІНГ ВАГИ ============ */
const fmtW = w => (Math.round(w*10)/10).toLocaleString(window.nutriLanguage==='en'?'en-US':'uk-UA');
const fmtD = iso => { const [y,m,d] = iso.split('-'); return window.nutriLanguage==='en'?`${m}/${d}`:`${d}.${m}`; };
function renderCheckins(){
  const cis=normalizeCheckins(state.checkins), latest=cis.length?cis[cis.length-1]:null;
  byId('ciLatest').innerHTML=latest?`<div class="cilatest"><b><span>Останній check-in</span> · ${fmtD(latest.d)}</b> —
    <span>дотримання</span> ${latest.adherence}% · <span>голод</span> ${latest.hunger}/5 ·
    <span>енергія</span> ${latest.energy}/5 · <span>тренування</span> ${latest.performance}/5</div>`:'';
  byId('ciList').innerHTML=cis.slice(-6).reverse().map(e=>`<li>${fmtD(e.d)} · ${e.adherence}%
    <button data-i="${e._i}" title="Видалити check-in">✕</button></li>`).join('');
}
function renderWeight(){
  renderCheckins();
  const t=calcTargets(), fb=weightFeedback(state.weights,t), ws=fb.ws, trend=fb.points;
  /* підсумок */
  let sum = '';
  if(ws.length){
    const first = ws[0], last = ws[ws.length-1];
    const diff = last.w - first.w;
    const col = diff < -0.05 ? 'var(--good-text)' : diff > 0.05 ? 'var(--s-fat)' : 'var(--ink-2)';
    const goalGain = state.profile.goal === 'gain';
    const diffCol = goalGain ? (diff > 0.05 ? 'var(--good-text)' : col) : col;
    sum = `<span>Зараз: <b>${fmtW(last.w)} кг</b></span>
      <span>Початок: ${fmtW(first.w)} кг (${fmtD(first.d)})</span>
      <span style="color:${diffCol};font-weight:700">${diff>0?'+':''}${fmtW(diff)} кг за весь час</span>
      ${last.waist!=null?`<span>Талія: <b>${fmtW(last.waist)} см</b></span>`:''}`;
  }
  byId('wSummary').innerHTML = sum;
  const rate=x=>`${x>0?'+':''}${numR(x)} кг/тиждень`;
  let adaptive='';
  if(!fb.ready){
    const needEntries=Math.max(0,3-ws.length), needDays=Math.max(0,14-fb.spanDays);
    adaptive=`<div class="wadapt"><div class="wa-head"><b>Збираємо базову лінію</b><span>${ws.length} запис(и) · ${fb.spanDays} дн.</span></div>
      Для першої оцінки потрібно щонайменше 3 зважування за 14 днів.${needEntries||needDays?` Залишилось: ${needEntries?needEntries+' запис(и) ':''}${needDays?needDays+' дн.':''}.`:''}</div>`;
  }else{
    const rates=`<span class="wa-rate">фактично ${rate(fb.actualRate)} · очікувано ${rate(fb.expectedRate)}</span>`;
    if(fb.code==='onTrack') adaptive=`<div class="wadapt good"><div class="wa-head"><b>Темп відповідає плану</b>${rates}</div>
      Коливання перебувають у робочому коридорі. Калорійність поки змінювати не потрібно.</div>`;
    else if(fb.code==='observe') adaptive=`<div class="wadapt warn"><div class="wa-head"><b>Є відхилення, але даних ще мало</b>${rates}</div>
      Продовжуйте зважування до 21 дня і не коригуйте раціон за коротким відрізком.</div>`;
    else if(fb.code==='safetyReview') adaptive=`<div class="wadapt bad"><div class="wa-head"><b>Не знижуйте калорійність автоматично</b>${rates}</div>
      Поточний розрахунок уже біля захисної межі або потребує медичного погодження. Перегляньте активність, дотримання плану й стан здоров’я зі спеціалістом.</div>`;
    else if(fb.code==='checkinNeeded') adaptive=`<div class="wadapt warn"><div class="wa-head"><b>Додайте свіжий щотижневий check-in</b>${rates}</div>
      Даних ваги вже достатньо, але без оцінки дотримання, голоду, енергії та тренувань коригувати калорійність зарано.</div>`;
    else if(fb.code==='adherenceReview') adaptive=`<div class="wadapt warn"><div class="wa-head"><b>Спершу вирівняйте дотримання меню</b>${rates}</div>
      <span>Останній check-in показує</span> ${fb.checkin.adherence}% <span>дотримання.</span>
      <span>Зміна калорій може приховати справжню причину відхилення — спочатку спробуйте 7–14 днів виконувати план щонайменше на 80%.</span></div>`;
    else if(fb.code==='recoveryReview') adaptive=`<div class="wadapt bad"><div class="wa-head"><b>Спершу перевірте відновлення</b>${rates}</div>
      Check-in показує високий голод, низьку енергію або погіршення тренувань. Не знижуйте калорії: оцініть сон, стрес, навантаження та самопочуття зі спеціалістом.</div>`;
    else{
      const verb=fb.adjustment>0?'підвищити':'знизити', amount=Math.abs(fb.adjustment);
      adaptive=`<div class="wadapt warn"><div class="wa-head"><b>Темп відрізняється від запланованого</b>${rates}</div>
        <div class="wa-action">Орієнтир для спеціаліста: <b>${verb} калорійність приблизно на ${amount} ккал/день</b>, потім спостерігати ще 2–3 тижні.</div>
        Перед корекцією звірте дотримання меню, кроки, тренування, сіль, цикл і однакові умови зважування. Застосунок нічого не змінює автоматично.</div>`;
    }
    if(fb.overFastLoss) adaptive += `<div class="wadapt bad"><div class="wa-head"><b>Темп схуднення зависокий</b>${rates}</div>
      Фактичне зниження перевищує 1% маси тіла на тиждень. Це не ціль для героїзму: підніміть калорійність або зменшіть дефіцит після перевірки самопочуття.</div>`;
  }
  byId('wAdaptive').innerHTML=adaptive;
  /* список записів */
  byId('wList').innerHTML = ws.map(e=>
    `<li>${fmtD(e.d)} — <b>${fmtW(e.w)}</b> кг
      ${e.waist!=null?`· ${fmtW(e.waist)} см талія`:''}
      <button data-i="${e._i}" title="Видалити запис">✕</button></li>`).join('');
  /* графік */
  const box = byId('wChart');
  if(ws.length < 2){
    box.innerHTML = `<div class="wempty">${ws.length===0
      ? 'Додайте перший запис ваги — і тут з’явиться графік динаміки.'
      : 'Додайте ще один запис — і побачите графік динаміки.'}</div>`;
    return;
  }
  const W=640, H=240, L=46, R=42, T=16, B=30;
  const xs=ws.map(e=>e.t), x0=Math.min(...xs), x1=Math.max(...xs), span=Math.max(1,x1-x0);
  const steps=Math.min(60,Math.max(2,Math.ceil(span/3))), band=[];
  for(let i=0;i<=steps;i++){
    const day=span*i/steps, b=expectedWeightAt(trend[0].w,day,t);
    band.push({t:x0+day,lo:b.lo,hi:b.hi,mid:(b.linear+b.damped)/2});
  }
  const ysv=ws.map(e=>e.w).concat(trend.map(e=>e.w),band.flatMap(e=>[e.lo,e.hi]));
  let y0 = Math.min(...ysv), y1 = Math.max(...ysv);
  const pad = Math.max(0.5,(y1-y0)*0.15); y0-=pad; y1+=pad;
  const X = x => L + (x1===x0 ? (W-L-R)/2 : (x-x0)/(x1-x0)*(W-L-R));
  const Y = v => T + (1-(v-y0)/(y1-y0))*(H-T-B);
  /* сітка: 4 горизонтальні лінії */
  let g='';
  for(let i=0;i<=3;i++){
    const v = y0 + (y1-y0)*i/3, y = Y(v);
    g += `<line class="grid" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/>
          <text class="lbl" x="${L-6}" y="${y+3.5}" text-anchor="end">${fmtW(v)}</text>`;
  }
  /* підписи дат: перший, останній, середина */
  const idxs = ws.length>2 ? [0, Math.floor((ws.length-1)/2), ws.length-1] : [0, ws.length-1];
  for(const i of new Set(idxs))
    g += `<text class="lbl" x="${X(xs[i])}" y="${H-8}" text-anchor="middle">${fmtD(ws[i].d)}</text>`;
  const trendStr=trend.map(e=>`${X(e.t)},${Y(e.w)}`).join(' ');
  const expectedStr=band.map(e=>`${X(e.t)},${Y(e.mid)}`).join(' ');
  const bandStr=band.map(e=>`${X(e.t)},${Y(e.hi)}`)
    .concat([...band].reverse().map(e=>`${X(e.t)},${Y(e.lo)}`)).join(' ');
  const dots=ws.map(e=>`<circle class="raw-dot" cx="${X(e.t)}" cy="${Y(e.w)}" r="3.5">
    <title>${fmtD(e.d)}: ${fmtW(e.w)} кг</title></circle>`).join('');

  const waistPts=trend.filter(e=>e.waist!=null);
  let waistSvg='',waistLegend='';
  if(waistPts.length>=2){
    let a=Math.min(...waistPts.map(e=>e.waist)),b=Math.max(...waistPts.map(e=>e.waist));
    const wp=Math.max(1,(b-a)*0.15);a-=wp;b+=wp;
    const YW=v=>T+(1-(v-a)/(b-a))*(H-T-B);
    const waistStr=waistPts.map(e=>`${X(e.t)},${YW(e.waist)}`).join(' ');
    waistSvg=`<polyline class="waist-line" points="${waistStr}"/>${waistPts.map(e=>`<circle class="waist-dot" cx="${X(e.t)}" cy="${YW(e.waist)}" r="3"><title>${fmtD(e.d)}: ${fmtW(e.waist)} см</title></circle>`).join('')}
      <text class="lbl" x="${W-R+7}" y="${T+4}">${fmtW(b)} см</text><text class="lbl" x="${W-R+7}" y="${H-B}">${fmtW(a)} см</text>`;
    waistLegend='<span><i class="waist"></i>Тренд талії</span>';
  }
  const lastX=X(trend[trend.length-1].t),lastY=Y(trend[trend.length-1].w);
  const anchor = lastX > W-70 ? 'end' : 'start';
  const dl=`<text class="dlab" x="${lastX+(anchor==='end'?-9:9)}" y="${lastY-9}" text-anchor="${anchor}">${fmtW(trend[trend.length-1].w)} кг</text>`;
  box.innerHTML = `<div class="wlegend"><span><i class="raw"></i>Зважування</span><span><i></i>7-денний тренд</span>
    <span><i class="expected"></i>Очікуваний коридор</span>${waistLegend}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Графік тренду ваги та талії">
    ${g}<line class="axis" x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}"/>
    <polygon class="expected-band" points="${bandStr}"/><polyline class="expected-path" points="${expectedStr}"/>
    <polyline class="trend-line" points="${trendStr}"/>${dots}${waistSvg}${dl}
  </svg>`;
}

/* ============ ВИКЛЮЧЕННЯ: РЕНДЕР І ЛОГІКА ============ */
function renderExcluded(){
  migrateExclusionState();
  const ex = [...excludedSet()];
  byId('exCount').textContent = ex.length ? `— ${ex.length}` : '';
  byId('exList').innerHTML = ex.map(id=>{
    const p = prodById(id); if(!p) return '';
    return `<span>${escHtml(p.n)}<button data-i="${escHtml(id)}" title="Повернути продукт">✕</button></span>`;
  }).join('');
  for(const b of byId('exPresets').querySelectorAll('.preset')){
    b.classList.toggle('on', state.settings.activePresets.includes(b.dataset.set));
  }
}
/* виключені продукти в уже зібраному меню замінюємо на дозволені */
function fixExcludedInDays(){
  const ex = activeExcludedSet();
  for(const day of state.days) for(const meal of day) meal.forEach((c,ci)=>{
    const current = prodById(c.prodId);
    const tpl = MEAL_COMPS[c.mealId] && MEAL_COMPS[c.mealId][ci];
    if(tpl && (!current || ex.has(c.prodId) || !dietAllows(current) || !categoryMatches(current,tpl.cat))){
      const ps = pool(tpl.cat, c.mealId==='b').filter(p=>p.i!==c.prodId);
      if(ps.length){ c.prodId = rnd(ps).i; c.customG = null; }
    }
  });
}
function addExcluded(ids){
  setManualExclusion(ids,true);
  fixExcludedInDays(); renderExcluded(); renderAll();
}
function removeExcluded(ids){
  setManualExclusion(ids,false);
  renderExcluded(); renderAll();
}
function toggleExcludedPreset(name){
  migrateExclusionState();
  setPresetState(name,!state.settings.activePresets.includes(name));
  fixExcludedInDays(); renderExcluded(); renderAll();
}

/* ============ ДРУК ============ */
function buildPrintView(){
  const t = calcTargets();
  const pr = state.profile;
  const goals = {loss:'схуднення', maintain:'підтримка ваги', gain:'набір м’язової маси'};
  const esc = s => String(s).replace(/[<>&]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
  const pk = t.prot*4, fk = t.fat*9, ck = t.carb*4, sk = (pk+fk+ck)||1;

  let html = `
  <div class="ph">
    <div>
      <h1>Програма харчування${pr.name?` — ${esc(pr.name)}`:''}</h1>
      <div class="meta">Ціль: ${goals[pr.goal]} · ${pr.sex==='m'?'чоловік':'жінка'}, ${pr.age} р.,
        ${pr.height} см, ${pr.weight} кг · ІМТ ${num1(t.bmi)} (${bmiLabel(t.bmi,pr)})${
          pr.muscular?' · м’язова статура врахована':''}${pr.waist?` · талія/зріст ${num2(pr.waist/pr.height)}`:''} · складено ${new Date().toLocaleDateString(window.nutriLanguage==='en'?'en-US':'uk-UA')}</div>
    </div>
    <div class="by">склав<b>Ihor Samchenko</b>t.me/samchenko_i</div>
  </div>

  <div class="norms">
    <div class="norm acc"><div class="nl">Калорійність</div><div class="nv">${fmt(t.kcal)} ккал</div></div>
    <div class="norm"><div class="nl">Білки</div><div class="nv">${t.prot} г</div></div>
    <div class="norm"><div class="nl">Жири</div><div class="nv">${t.fat} г</div></div>
    <div class="norm"><div class="nl">Вуглеводи</div><div class="nv">${t.carb} г</div></div>
    <div class="norm"><div class="nl">Клітковина</div><div class="nv">${t.fib} г</div></div>
    <div class="norm"><div class="nl">Випивати</div><div class="nv">${L(waterCalc(pr.weight).drinkLo)}–${L(waterCalc(pr.weight).drinkHi)} л</div></div>
  </div>
  <div class="split">
      <div style="flex:${pk};background:#2f6fdd"></div>
    <div style="flex:${fk};background:#eb6834"></div>
    <div style="flex:${ck};background:#1baf7a"></div>
  </div>
  <div class="note">Розподіл калорій: білки ${Math.round(pk/sk*100)}% · жири ${Math.round(fk/sk*100)}% ·
    вуглеводи ${Math.round(ck/sk*100)}%${t.pace.dir?` · очікуваний темп ${numR(t.realRate)} кг/тиждень`:''}</div>`;
  if(state.note) html += `<div class="pnote">${esc(state.note)}</div>`;

  for(let di=0; di<7; di++){
    const d = calcDay(di);
    html += `<div class="day">
      <div class="dh"><h2>${DAY_NAMES[di]}</h2>
        <span>${fmt(d.tot.k)} ккал · Б ${fmt(d.tot.p)} / Ж ${fmt(d.tot.f)} / В ${fmt(d.tot.c)} г ·
          клітковина ${fmt(d.tot.fb)} г</span></div>
      <table><thead><tr><th>Прийом</th><th>Продукт</th><th class="n">Порція</th><th class="n">Ккал</th></tr></thead><tbody>`;
    for(const m of d.meals){
      m.items.forEach((it,ix)=>{
        html += `<tr>${ix===0?`<td class="meal" rowspan="${m.items.length}">${m.def.name}<br>
            <span style="font-weight:400;color:#52514e">${esc(mealTimes()[d.meals.indexOf(m)]||'')} · ${fmt(m.tot.k)} ккал</span></td>`:''}
          <td>${esc(it.p.n)}${it.p.ml?' <span style="color:#52514e">(напій)</span>':it.p.dry?' <span style="color:#52514e">(суха вага)</span>':
              it.p.raw?' <span style="color:#52514e">(сира вага)</span>':''}${
            it.p.dish?' <span style="color:#52514e">(≈)</span>':''}</td>
          <td class="n">${it.g} ${portionUnit(it.p)}${unitApprox(it.p,it.g)?` <span style="color:#52514e">(${unitApprox(it.p,it.g)})</span>`:''}</td><td class="n">${it.p.dish?'≈':''}${fmt(it.g*it.p.k/100)}</td></tr>`;
      });
    }
    html += `</tbody></table></div>`;
  }

  /* список покупок */
  const agg = new Map();
  for(let di=0; di<7; di++){
    const d = calcDay(di);
    for(const m of d.meals) for(const it of m.items)
      agg.set(it.p.i, (agg.get(it.p.i)||0) + it.g);
  }
  const cats = Object.keys(CATS).sort((a,b)=>CATS[a].order-CATS[b].order);
  html += `<h3>Список покупок на тиждень</h3><div class="shopcols">` + cats.map(c=>{
    const items = [...agg.entries()].map(([id,g])=>({p:prodById(id),g}))
      .filter(x=>x.p && (x.p.dish ? c==='dish' : x.p.c===c)).sort((a,b)=>b.g-a.g);
    if(!items.length) return '';
    return `<div class="shopcat"><b>${CATS[c].name}</b>` + items.map(x=>{
      const u = unitApprox(x.p, x.g, true);
      return `<div><span>${esc(x.p.n)}${x.p.ml?' (напій)':x.p.dry?' (суха вага)':x.p.raw?' (сира вага)':''}</span><span>${
        x.p.ml
          ? (x.g>=1000 ? (x.g/1000).toFixed(1).replace('.',',')+' л' : Math.round(x.g)+' мл')
          : (x.g>=1000 ? (x.g/1000).toFixed(1).replace('.',',')+' кг' : Math.round(x.g)+' г')}${
        u?' · '+u.replace('≈ ',''):''}</span></div>`;
    }).join('') + `</div>`;
  }).join('') + `</div>`;

  /* додаток: рецепти страв, що трапляються в тижні */
  const used = new Map();
  for(const [id] of agg){ const p = prodById(id); if(p && p.rc) used.set(p.n, p.rc); }
  if(used.size){
    html += `<h3>Як готувати страви з меню</h3><div class="rccols">` +
      [...used.entries()].map(([n,rc])=>
        `<div class="rc"><b>${esc(n)}</b>${esc(rc)}</div>`).join('') + `</div>`;
  }

  html += `<div class="foot">
    <div style="flex:1">Продукти в межах однієї категорії взаємозамінні — можна міняти місцями,
      зберігаючи вказану порцію.<br>
      <b>Зважування:</b> крупи, макарони й бобові — сухими; м'ясо, рибу та субпродукти — сирими
      (після готування маса меншає на 25–30% у м'яса та ~20% у риби); овочі й фрукти — очищеними.<br>
      Рідина: <b>${L(waterCalc(pr.weight).drinkLo)}–${L(waterCalc(pr.weight).drinkHi)} л на день</b> — рахуються всі напої
      (вода, чай, кава, компот, юшка); ще ≈${L(waterCalc(pr.weight).food)} л надходить із їжею.<br>
      Програма має рекомендаційний характер і не замінює консультацію лікаря.</div>
    <div style="text-align:right;white-space:nowrap">Питання та супровід:<br>
      <b>Telegram: @samchenko_i</b><br>igsamchenko@gmail.com</div>
  </div>`;
  byId('printView').innerHTML = html;
}

/* ============ ЗБЕРЕЖЕННЯ / ЗАВАНТАЖЕННЯ ============ */
function saveToFile(){
  const data = JSON.stringify({...localSnapshot(), exportedAt:new Date().toISOString()}, null, 1);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const nm = state.profile.name ? state.profile.name.replace(/\s+/g,'_') : 'klient';
  a.download = `programa_${nm}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
function loadFromFile(file){
  const rd = new FileReader();
  rd.onload = () => {
    try{
      const data = JSON.parse(rd.result);
      applyPortableState(data);
      syncFormFromState(); ensureDays(); renderExcluded(); renderAll();
      saveLocal();
    }catch(e){ alert('Не вдалося прочитати файл: '+e.message); }
  };
  rd.readAsText(file);
}
function setSelectNum(id, v){
  const el = byId(id); let best = el.options[0];
  for(const o of el.options)
    if(Math.abs(+o.value - v) < Math.abs(+best.value - v)) best = o;
  el.value = best.value; return +best.value;
}
function syncFormFromState(){
  const pr = sanitizeProfile(), s = state.settings;
  byId('fName').value = pr.name; byId('fAge').value = pr.age;
  byId('fHeight').value = pr.height; byId('fWeight').value = pr.weight;
  byId('fWaist').value = pr.waist || '';
  byId('fMuscular').checked = !!pr.muscular;
  byId('fDiet').value = pr.diet || 'omnivore';
  for(const el of byId('healthScreen').querySelectorAll('[data-health]'))
    el.checked = !!(pr.health && pr.health[el.dataset.health]);
  byId('proNote').value = state.note || '';
  /* міграція старих збережень: був один коефіцієнт activity.
     Тригер — саме наявність pr.activity: поля lifestyle/training уже мають
     значення за замовчуванням, тож перевіряти їх на null не можна. */
  if(pr.activity != null){
    const old = +pr.activity || 1.375;
    const lifes = [0,0.08,0.17,0.26,0.33], trs = [0,0.05,0.10,0.16,0.22];
    let best = {l:0.08, t:0.10, d:Infinity};
    for(const l of lifes) for(const t of trs){
      const d = Math.abs(Math.min(1.75, 1.20+l+t) - old);
      if(d < best.d) best = {l, t, d};
    }
    pr.lifestyle = best.l; pr.training = best.t;
    delete pr.activity;
  }
  /* значення можуть не збігатися з option посимвольно (0.1 vs 0.10) — беремо найближче */
  pr.lifestyle = setSelectNum('fLifestyle', pr.lifestyle);
  pr.training  = setSelectNum('fTraining',  pr.training);
  for(const b of byId('fSex').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v===pr.sex);
  for(const b of byId('fGoal').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v===pr.goal);
  for(const b of byId('sMeals').querySelectorAll('button')) b.classList.toggle('on', b.dataset.v===String(s.meals));
  byId('sLossRate').value = s.lossRate; byId('sLossRateOut').textContent = numR(s.lossRate);
  byId('sGainRate').value = s.gainRate; byId('sGainRateOut').textContent = numR(s.gainRate);
  byId('sProtein').value = s.proteinPerKg; byId('sProteinOut').textContent = s.proteinPerKg;
  byId('sFatPct').value = s.fatPct; byId('sFatPctOut').textContent = s.fatPct+'%';
  const sw = s.sweetPct||0;
  byId('sSweet').value = sw; byId('sSweetOut').textContent = sw ? sw+'%' : 'вимк.';
  byId('sWeekMode').innerHTML = Object.entries(WEEK_MODES).map(([k,v])=>
    `<option value="${k}" ${k===s.weekMode?'selected':''}>${v.n}</option>`).join('');
  byId('sFoodVolume').value = s.foodVolume || 'normal';
  byId('sSodiumContext').value = s.sodiumContext || 'standard';
  renderSodiumContextHint();
  byId('weekModeHint').textContent = (WEEK_MODES[s.weekMode]||WEEK_MODES.rot3).h;
  syncPersonalSettings();
  renderTimeRow();
}
function syncPersonalSettings(){
  const goal = state.profile.goal;
  byId('lossRateField').hidden = goal !== 'loss';
  byId('gainRateField').hidden = goal !== 'gain';
  byId('maintainRateNote').hidden = goal !== 'maintain';
}
function renderSodiumContextHint(){
  const high=state.settings.sodiumContext==='highSweat';
  byId('sodiumContextHint').textContent=high
    ? 'Для тривалого або спекотного навантаження натрій оцінюють окремо за втратами поту. Орієнтир напою — близько 500–700 мг натрію на літр.'
    : 'Базовий орієнтир загального раціону — менше 2000 мг натрію на добу. Звичайні тренування до 60 хв автоматично його не підвищують.';
}
/* редагований час прийомів */
function renderTimeRow(){
  const def = defaultTimes(), cur = sanitizeTimes(mealTimes());
  byId('timeRow').innerHTML = getPlan().map((m,i)=>
    `<label>${escHtml(m.name)}<input type="text" class="tInp" data-i="${i}" value="${escHtml(cur[i]||'')}"
       placeholder="${escHtml(def[i]||'')}"></label>`).join('');
}

/* ============ ПОДІЛИТИСЯ ПОСИЛАННЯМ ============ */
function clientShareProfile(){
  const p=state.profile;
  return {sex:p.sex,age:p.age,height:p.height,weight:p.weight,muscular:p.muscular,
    lifestyle:p.lifestyle,training:p.training,goal:p.goal,diet:p.diet};
}
function clientShareSettings(){
  const s=state.settings;
  return {lossRate:s.lossRate,gainRate:s.gainRate,proteinPerKg:s.proteinPerKg,fatPct:s.fatPct,
    meals:s.meals,sweetPct:s.sweetPct,weekMode:s.weekMode,foodVolume:s.foodVolume,
    sodiumContext:s.sodiumContext,times:sanitizeTimes(s.times)};
}
async function packStateToUrl(forClient){
  migrateSettings();
  sanitizeProfile();
  const payload = {v:4, p:forClient?clientShareProfile():state.profile,
    s:forClient?clientShareSettings():state.settings, d:state.days,
    n:state.note||'', m:forClient?'c':'p', c:PRODUCTS.filter(p=>p.custom)};
  const json = JSON.stringify(payload);
  let bytes, mode;
  if(typeof CompressionStream !== 'undefined'){
    const buf = await new Response(new Blob([json]).stream()
      .pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    bytes = new Uint8Array(buf); mode = 'c';
  } else { bytes = new TextEncoder().encode(json); mode = 'r'; }
  let bin=''; for(const x of bytes) bin += String.fromCharCode(x);
  const b64 = btoa(bin).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
  return `${location.origin}${location.pathname}#p=${mode}${b64}`;
}
async function unpackStateFromHash(){
  const m = location.hash.match(/^#p=([cr])([A-Za-z0-9_-]+)$/);
  if(!m || m[2].length>200000) return false;
  try{
    const bin = atob(m[2].replaceAll('-','+').replaceAll('_','/'));
    const bytes = Uint8Array.from(bin, ch=>ch.charCodeAt(0));
    let json;
    if(m[1]==='c'){
      const buf = await new Response(new Blob([bytes]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
      json = new TextDecoder().decode(buf);
    } else json = new TextDecoder().decode(bytes);
    if(json.length>2000000) throw new Error('Завеликий payload');
    applyPortableState(JSON.parse(json),{compact:true,fromLink:true});
    history.replaceState(null,'',location.pathname+location.search);
    return true;
  }catch(e){ return false; }
}

/* ============ ПОДІЇ ============ */
function bindSeg(id, cb){
  byId(id).addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    for(const x of byId(id).querySelectorAll('button')) x.classList.remove('on');
    b.classList.add('on'); cb(b.dataset.v);
  });
}
byId('fName').addEventListener('input', e=>{ state.profile.name = plainText(e.target.value,60); saveLocal(); });
function bindProfileNumber(id, key, lo, hi, fb, nullable=false){
  const el = byId(id);
  el.addEventListener('input', e=>{
    const raw = String(e.target.value).replace(',', '.').trim();
    if(key==='age') state.profile.ageRestricted = !!raw && isFinite(+raw) && +raw<18;
    state.profile[key] = nullable && !raw ? null : clampNum(raw, lo, hi, fb);
    if(key==='waist'){ renderTargets(); saveLocal(); }
    else renderAll();
  });
  el.addEventListener('blur', ()=>{
    sanitizeProfile();
    syncFormFromState();
    if(key==='waist'){ renderTargets(); saveLocal(); }
    else renderAll();
  });
}
bindProfileNumber('fAge', 'age', 18, 90, 30);
bindProfileNumber('fHeight', 'height', 120, 220, 168);
bindProfileNumber('fWeight', 'weight', 35, 250, 70);
bindProfileNumber('fWaist', 'waist', 50, 200, 0, true);
byId('fMuscular').addEventListener('change', e=>{ state.profile.muscular = e.target.checked; renderAll(); });
byId('fDiet').addEventListener('change', e=>{
  state.profile.diet = e.target.value;
  fixExcludedInDays();
  safeGenWeek();
  renderAll();
});
byId('healthScreen').addEventListener('change', e=>{
  const el=e.target.closest('[data-health]'); if(!el) return;
  state.profile.health = state.profile.health || {};
  state.profile.health[el.dataset.health] = el.checked;
  renderAll();
});
byId('proNote').addEventListener('input', e=>{ state.note = plainText(e.target.value,500); saveLocal(); });
byId('fLifestyle').addEventListener('change', e=>{ state.profile.lifestyle = +e.target.value; renderAll(); });
byId('fTraining').addEventListener('change', e=>{ state.profile.training = +e.target.value; renderAll(); });
bindSeg('fSex', v=>{ state.profile.sex = v; renderAll(); });
byId('fGoal').addEventListener('click', e=>{
  const b = e.target.closest('.goal'); if(!b) return;
  for(const x of byId('fGoal').querySelectorAll('.goal')) x.classList.remove('on');
  b.classList.add('on'); state.profile.goal = b.dataset.v; renderAll();
});
function bindRange(id, outId, key, suffix){
  byId(id).addEventListener('input', e=>{
    state.settings[key] = +e.target.value;
    byId(outId).textContent = e.target.value + (suffix||'');
    renderAll();
  });
}
function bindRateRange(id, outId, key){
  byId(id).addEventListener('input', e=>{
    state.settings[key] = +e.target.value;
    byId(outId).textContent = numR(+e.target.value);
    renderAll();
  });
}
bindRateRange('sLossRate','sLossRateOut','lossRate');
bindRateRange('sGainRate','sGainRateOut','gainRate');
bindRange('sProtein','sProteinOut','proteinPerKg','');
bindRange('sFatPct','sFatPctOut','fatPct','%');
bindSeg('sMeals', v=>{ state.settings.meals = +v; state.settings.times = [];
  safeGenWeek(); syncFormFromState(); renderAll(); });
byId('sWeekMode').addEventListener('change', e=>{
  state.settings.weekMode = e.target.value;
  byId('weekModeHint').textContent = (WEEK_MODES[e.target.value]||WEEK_MODES.rot3).h;
  safeGenWeek(); renderAll();
});
byId('sFoodVolume').addEventListener('change', e=>{
  state.settings.foodVolume = e.target.value==='compact' ? 'compact' : 'normal';
  safeGenWeek(); renderAll();
});
byId('sSodiumContext').addEventListener('change',e=>{
  state.settings.sodiumContext=e.target.value==='highSweat'?'highSweat':'standard';
  renderSodiumContextHint(); renderDay(); saveLocal();
});
byId('timeRow').addEventListener('input', e=>{
  const el = e.target.closest('.tInp'); if(!el) return;
  const i = +el.dataset.i, v = sanitizeTime(el.value);
  state.settings.times = sanitizeTimes(state.settings.times);
  state.settings.times[i] = v || null;
  renderDay(); saveLocal();
});
byId('sSweet').addEventListener('input', e=>{
  state.settings.sweetPct = +e.target.value;
  byId('sSweetOut').textContent = state.settings.sweetPct ? state.settings.sweetPct+'%' : 'вимк.';
  syncSweetSlot();          /* меню не перегенеровується — слот лише додається/зникає */
  renderTimeRow(); renderAll();
});
byId('btnResetPersonal').addEventListener('click', ()=>{
  Object.assign(state.settings, {
    lossRate:0.35, gainRate:0.2, meals:4, sweetPct:10, weekMode:'rot3', foodVolume:'normal', times:[]
  });
  safeGenWeek(); syncFormFromState(); renderAll();
});

/* ---- виключення ---- */
byId('exPresets').addEventListener('click', e=>{
  const btn = e.target.closest('.preset'); if(!btn) return;
  toggleExcludedPreset(btn.dataset.set);
});
byId('exSearch').addEventListener('input', e=>{
  const q = e.target.value.trim().toLowerCase();
  const ex = excludedSet();
  const found = q.length<2 ? [] :
    PRODUCTS.filter(p=>!ex.has(p.i) && (p.n.toLowerCase().includes(q) || (window.nutriProductName?nutriProductName(p):p.n).toLowerCase().includes(q))).slice(0,8);
  byId('exMatches').innerHTML = found.map(p=>
    `<button type="button" data-i="${escHtml(p.i)}">+ ${escHtml(window.nutriProductName?nutriProductName(p):p.n)}</button>`).join('');
});
byId('exMatches').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  addExcluded([b.dataset.i]);
  byId('exSearch').value=''; byId('exMatches').innerHTML='';
});
byId('exList').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  removeExcluded([b.dataset.i]);
});

byId('dayTabs').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  state.activeDay = +b.dataset.d; renderDayTabs(); renderDay();
});
function clearAutoFitMsg(){ if(state.ui) delete state.ui.autoFitMsg; }
byId('btnGenWeek').addEventListener('click', ()=>{ clearAutoFitMsg(); safeGenWeek(); renderAll(); });
byId('btnGenDay').addEventListener('click', ()=>{
  const reason = generationBlockReason();
  if(reason){ alert(reason); renderAll(); return; }
  clearAutoFitMsg();
  state.days[state.activeDay] = genDay(state.activeDay,
    state.activeDay>0 ? state.days[state.activeDay-1] : null);
  renderDay(); renderShop();
});
byId('btnAutoFit').addEventListener('click', autoFitSimpleDay);
byId('btnCopyDay').addEventListener('click', ()=>{
  clearAutoFitMsg();
  const src = state.days[state.activeDay];
  state.days = state.days.map(()=> src.map(meal=>meal.map(c=>({...c}))));
  renderDay(); renderShop();
});

let gramInputTimer = 0;
function setManualGram(el, emptyAsZero=false){
  const mi = +el.dataset.m, ci = +el.dataset.c;
  if(isNaN(mi) || isNaN(ci)) return null;
  const comp = state.days[state.activeDay] &&
    state.days[state.activeDay][mi] && state.days[state.activeDay][mi][ci];
  if(!comp) return null;
  const raw = String(el.value).replace(',', '.').trim();
  if(!raw && !emptyAsZero) return null;
  const g = raw ? +raw : 0;
  if(!isFinite(g)) return null;
  clearAutoFitMsg();
  comp.customG = Math.min(900, Math.max(0, g));
  return {mi, ci};
}
function renderMenuAfterGramEdit(focus){
  renderDay(); renderShop();
  if(!focus) return;
  requestAnimationFrame(()=>{
    const el = byId('mealsWrap').querySelector(`.inpG[data-m="${focus.mi}"][data-c="${focus.ci}"]`);
    if(el) el.focus({preventScroll:true});
  });
}
function scheduleGramRender(focus){
  clearTimeout(gramInputTimer);
  gramInputTimer = setTimeout(()=>{
    gramInputTimer = 0;
    renderMenuAfterGramEdit(focus);
  }, 180);
}

/* ---- наочний довідник зі зважування продуктів ---- */
const WEIGH_GUIDES = {
  basics:{
    subject:['Кнопка «ОД.» перемикає одиниці, а «ВВІМК./ТАРА» вмикає ваги та обнуляє тару.','The UNIT button changes units; ON/TARE turns the scale on and tares the container.'],
    screens:['186 г','0 г','100 г'],
    steps:[
      ['Поставте порожню ємність','Тарілка або миска вже стоїть на вагах.','Place an empty container','Put the plate or bowl on the scale.'],
      ['Натисніть «ВВІМК./ТАРА»','Вага ємності більше не враховується.','Press TARE / 0','The container weight is now excluded.'],
      ['Додайте продукт','Зупиніться на кількості, вказаній у меню.','Add the food','Stop at the amount shown in the menu.']
    ],
    rule:['Порівнюйте цифру на вагах з грамами у відповідному рядку меню.','Match the scale reading to the grams shown in the relevant menu row.'],
    caution:['Якщо на упаковці вказані інші дані на 100 г, використовуйте етикетку конкретного продукту.','If the package shows different values per 100 g, use the label of that specific product.']
  },
  dry:{
    subject:['Крупи, макарони та бобові зважуйте сухими — до додавання води.','Weigh grains, pasta and legumes dry, before adding water.'],
    screens:['186 г','0 г','70 г'],
    steps:[
      ['Поставте суху миску','Вона має бути чистою та без води.','Place a dry bowl','It should be clean and contain no water.'],
      ['Обнуліть тару кнопкою «ВВІМК./ТАРА»','На дисплеї має з’явитися 0 г.','Tare the container','The display should read 0 g.'],
      ['Насипте сухий продукт','Відміряйте грами з позначкою «г сух.».','Add the dry food','Measure the amount marked “g dry”.']
    ],
    rule:['70 г сухої гречки — це саме 70 г до варіння, а не вага готової каші.','70 g of dry buckwheat means 70 g before cooking, not the cooked weight.'],
    caution:['Після варіння крупа може важити у 2–3 рази більше через воду, але калорій вона від цього не отримує.','After cooking, grains may weigh two to three times more because of water, but water adds no calories.']
  },
  raw:{
    subject:['М’ясо, рибу та субпродукти зважуйте сирими до термічної обробки.','Weigh meat, fish and offal raw, before cooking.'],
    screens:['186 г','0 г','150 г'],
    steps:[
      ['Підготуйте продукт','Приберіть кістки та неїстівні частини, якщо вони не входять у порцію.','Prepare the food','Remove bones and inedible parts unless they are included in the portion.'],
      ['Поставте тарілку й обнуліть','Промокніть зайву рідину та натисніть «ВВІМК./ТАРА».','Place the plate and tare','Pat away excess liquid and press TARE / 0.'],
      ['Зважте сирим','Відміряйте грами з позначкою «г сир.».','Weigh it raw','Measure the amount marked “g raw”.']
    ],
    rule:['150 г сирого філе — це вага до запікання, варіння або смаження.','150 g of raw fillet is the weight before baking, boiling or frying.'],
    caution:['Після приготування м’ясо зазвичай втрачає 20–30% маси через воду. Не порівнюйте готову вагу із сирою нормою напряму.','Meat commonly loses 20–30% of its weight during cooking. Do not compare cooked weight directly with a raw target.']
  },
  produce:{
    subject:['Овочі та фрукти зважуйте в тому вигляді, у якому будете їх їсти.','Weigh vegetables and fruit in the form in which you will eat them.'],
    screens:['186 г','0 г','180 г'],
    steps:[
      ['Підготуйте їстівну частину','Помийте продукт, приберіть кісточку, хвостик або неїстівну шкірку.','Prepare the edible portion','Wash it and remove the stone, stem or inedible peel.'],
      ['Обнуліть тарілку','Поставте порожню тарілку та натисніть «ВВІМК./ТАРА».','Tare the plate','Place the empty plate on the scale and press TARE / 0.'],
      ['Додайте очищений продукт','Відміряйте потрібну їстівну кількість.','Add the prepared food','Measure the required edible amount.']
    ],
    rule:['Для банана не рахуйте шкірку, а для яблука зі шкіркою — рахуйте все, що фактично з’їсте.','Do not count a banana peel; for an apple eaten with the peel, count everything you actually eat.'],
    caution:['Для заморожених овочів використовуйте вагу самого продукту без льоду та зайвої води.','For frozen vegetables, use the food weight without loose ice or excess water.']
  },
  liquid:{
    subject:['Олію, мед і соуси найточніше контролювати методом різниці ваги.','Oil, honey and sauces are easiest to track accurately by weight difference.'],
    screens:['520 г','0 г','−10 г'],
    steps:[
      ['Поставте пляшку на ваги','Кришка має бути на пляшці, зовнішня поверхня — сухою.','Place the bottle on the scale','Keep the cap on and make sure the outside is dry.'],
      ['Натисніть «ВВІМК./ТАРА»','Не переставляйте пляшку до використання продукту.','Press TARE / 0','Do not move the bottle until after pouring.'],
      ['Налийте й поверніть пляшку','Мінус 10 г означає, що використано 10 г продукту.','Pour, then return the bottle','A reading of −10 g means that 10 g was used.']
    ],
    rule:['Для олії орієнтуйтесь на грами з меню: кухонна ложка часто дає неточну кількість.','For oil, follow the grams in the menu: a household spoon is often imprecise.'],
    caution:['Напої з позначкою «мл» можна відміряти мірною склянкою; для густих соусів точнішими будуть ваги.','Drinks marked “ml” can be measured in a measuring cup; scales are more accurate for thick sauces.']
  },
  dish:{
    subject:['Для домашньої страви спочатку визначте вагу всього готового виходу, потім — своєї порції.','For a homemade dish, first find the total cooked yield, then weigh your portion.'],
    screens:['986 г','0 г','800 г'],
    steps:[
      ['Зважте порожній посуд','Запишіть вагу каструлі або обнуліть її до готування.','Weigh the empty cookware','Record the pot weight or tare it before cooking.'],
      ['Зважте готову страву','Відніміть вагу каструлі — отримаєте чистий вихід.','Weigh the finished dish','Subtract the pot weight to get the net cooked yield.'],
      ['Відкладіть свою порцію','Поставте тарілку, обнуліть і відміряйте грами з меню.','Serve your portion','Tare a plate and measure the grams shown in the menu.']
    ],
    rule:['Якщо вихід страви 800 г, а ви відклали 200 г, це чверть усіх інгредієнтів і калорій рецепта.','If the cooked yield is 800 g and your serving is 200 g, that is one quarter of all recipe ingredients and calories.'],
    caution:['Позначка ≈ нагадує: калорійність готової страви залежить від фактичного рецепта та кінцевого виходу.','The ≈ mark is a reminder that a prepared dish depends on its actual recipe and final cooked yield.']
  }
};
const weighDialog = byId('weighDialog');
let weighReturnFocus = null;
function weighTopicForProduct(p){
  if(!p) return 'basics';
  if(p.dish) return 'dish';
  if(p.ml) return 'liquid';
  if(p.dry) return 'dry';
  if(p.raw) return 'raw';
  if(p.c==='veg'||p.c==='fruit') return 'produce';
  return 'basics';
}
function renderWeighGuide(topic='basics',p=null){
  const guide=WEIGH_GUIDES[topic]||WEIGH_GUIDES.basics;
  const tr=(uk,en)=>window.nutriT?nutriT(uk,en):uk;
  weighDialog.dataset.topic=topic;
  byId('weighDialogTitle').textContent=tr('Як правильно зважувати продукт','How to weigh food correctly');
  const productName=p?(window.nutriProductName?nutriProductName(p):p.n):'';
  byId('weighDialogSubject').textContent=(productName?productName+' · ':'')+tr(...guide.subject);
  for(let i=0;i<3;i++){
    byId('weighScreen'+(i+1)).textContent=tr(guide.screens[i],guide.screens[i].replace(' г',' g'));
    byId('weighStepTitle'+(i+1)).textContent=tr(guide.steps[i][0],guide.steps[i][2]);
    byId('weighStepText'+(i+1)).textContent=tr(guide.steps[i][1],guide.steps[i][3]);
  }
  byId('weighRuleTitle').textContent=tr('Головне правило','Key rule');
  byId('weighRuleText').textContent=tr(...guide.rule);
  byId('weighCaution').textContent=tr(...guide.caution);
  weighDialog.querySelectorAll('.weigh-tab').forEach(tab=>{
    const selected=tab.dataset.topic===topic;
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
  });
}
function openWeighGuide(topic='basics',p=null,trigger=null){
  weighReturnFocus=trigger||document.activeElement;
  renderWeighGuide(topic,p);
  if(typeof weighDialog.showModal==='function') weighDialog.showModal();
  else weighDialog.setAttribute('open','');
}
function closeWeighGuide(){
  if(typeof weighDialog.close==='function'&&weighDialog.open) weighDialog.close();
  else weighDialog.removeAttribute('open');
}
byId('btnWeighGuide').addEventListener('click',e=>openWeighGuide('basics',null,e.currentTarget));
byId('weighDialogClose').addEventListener('click',closeWeighGuide);
const weighTabs=weighDialog.querySelector('.weigh-tabs');
weighTabs.addEventListener('click',e=>{
  const tab=e.target.closest('.weigh-tab'); if(tab) renderWeighGuide(tab.dataset.topic);
});
weighTabs.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
  const tabs=[...weighTabs.querySelectorAll('.weigh-tab')], current=tabs.indexOf(e.target.closest('.weigh-tab'));
  if(current<0) return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:
    (current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  renderWeighGuide(tabs[next].dataset.topic);
  tabs[next].focus();
});
weighDialog.addEventListener('click',e=>{ if(e.target===weighDialog) closeWeighGuide(); });
weighDialog.addEventListener('close',()=>{ if(weighReturnFocus?.isConnected) weighReturnFocus.focus(); });
/* Власний вибір продукту замість нативного <select>: браузерні списки не
   дозволяють надійно обмежити висоту й можуть виходити за межі вікна. */
let productPickerCtx = null;
const productPicker = byId('productPicker');
const productPickerSearch = byId('productPickerSearch');
const productPickerList = byId('productPickerList');
function pickerText(uk,en){ return window.nutriLanguage==='en' ? en : uk; }
function pickerProductName(p){ return window.nutriProductName ? nutriProductName(p) : p.n; }
function closeProductPicker(restoreFocus){
  if(!productPickerCtx) return;
  const anchor = productPickerCtx.anchor;
  anchor.setAttribute('aria-expanded','false');
  productPicker.hidden = true;
  productPickerCtx = null;
  productPickerSearch.value = '';
  if(restoreFocus && anchor.isConnected) anchor.focus({preventScroll:true});
}
function renderProductPickerOptions(revealSelected){
  if(!productPickerCtx) return;
  const q = productPickerSearch.value.trim().toLocaleLowerCase('uk-UA');
  const all = selectList(productPickerCtx.cat, productPickerCtx.keepId);
  const filtered = q ? all.filter(p=>pickerProductName(p).toLocaleLowerCase('uk-UA').includes(q)) : all;
  const regular = filtered.filter(p=>!p.dish);
  const dishes = filtered.filter(p=>p.dish);
  const optionHtml = p => '<button type="button" class="product-option" role="option" data-i="' +
    escHtml(p.i) + '" aria-selected="' + (p.i===productPickerCtx.keepId?'true':'false') + '">' +
    '<span>' + escHtml(pickerProductName(p)) + '</span><span class="product-kcal">' +
    fmt(p.k) + ' ' + pickerText('ккал / 100 г','kcal / 100 g') + '</span></button>';
  const groupHtml = (label,items) => items.length
    ? '<div class="product-group-title">' + label + '</div>' + items.map(optionHtml).join('')
    : '';
  productPickerList.innerHTML = regular.length || dishes.length
    ? groupHtml(pickerText('Продукти','Foods'),regular) +
      groupHtml(pickerText('Готові страви (≈)','Prepared dishes (≈)'),dishes)
    : '<div class="product-picker-empty">' + pickerText('Нічого не знайдено','No products found') + '</div>';
  if(revealSelected) requestAnimationFrame(()=>{
    const selected = productPickerList.querySelector('[aria-selected="true"]');
    if(selected) selected.scrollIntoView({block:'nearest'});
  });
}
function positionProductPicker(){
  if(!productPickerCtx || !productPickerCtx.anchor.isConnected){ closeProductPicker(false); return; }
  productPicker.style.left = '';
  productPicker.style.right = '';
  productPicker.style.top = '';
  productPicker.style.bottom = '';
  productPicker.style.width = '';
  productPicker.style.maxHeight = '';
  if(window.matchMedia('(max-width:520px)').matches) return;
  const vv = window.visualViewport;
  const vx = vv ? vv.offsetLeft : 0;
  const vy = vv ? vv.offsetTop : 0;
  const vw = vv ? vv.width : document.documentElement.clientWidth;
  const vh = vv ? vv.height : document.documentElement.clientHeight;
  const rect = productPickerCtx.anchor.getBoundingClientRect();
  const width = Math.min(520, vw-24, Math.max(320,rect.width));
  const left = Math.max(vx+12,Math.min(rect.left,vx+vw-width-12));
  const below = vy+vh-rect.bottom-8;
  const above = rect.top-vy-8;
  productPicker.style.left = left+'px';
  productPicker.style.width = width+'px';
  if(Math.max(below,above)<180){
    productPicker.style.top = (vy+12)+'px';
    productPicker.style.maxHeight = Math.max(120,vh-24)+'px';
  } else if(below>=280 || below>=above){
    productPicker.style.top = (rect.bottom+6)+'px';
    productPicker.style.maxHeight = Math.min(460,below)+'px';
  } else {
    const maxHeight = Math.min(460,above);
    productPicker.style.top = Math.max(vy+12,rect.top-6-maxHeight)+'px';
    productPicker.style.maxHeight = maxHeight+'px';
  }
}
function openProductPicker(anchor){
  closeProductPicker(false);
  productPickerCtx = {
    anchor,
    day:state.activeDay,
    mi:+anchor.dataset.m,
    ci:+anchor.dataset.c,
    cat:anchor.dataset.cat,
    keepId:state.days[state.activeDay][+anchor.dataset.m][+anchor.dataset.c].prodId
  };
  anchor.setAttribute('aria-expanded','true');
  productPicker.hidden = false;
  productPickerSearch.value = '';
  renderProductPickerOptions(true);
  positionProductPicker();
  requestAnimationFrame(()=>productPickerSearch.focus({preventScroll:true}));
}
productPickerSearch.addEventListener('input',()=>renderProductPickerOptions(false));
productPickerSearch.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){
    const first=productPickerList.querySelector('.product-option');
    if(first){ e.preventDefault(); first.focus(); }
  }
});
byId('productPickerClose').addEventListener('click',()=>closeProductPicker(true));
productPickerList.addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key)) return;
  const options=[...productPickerList.querySelectorAll('.product-option')], current=options.indexOf(e.target.closest('.product-option'));
  if(current<0 || !options.length) return;
  e.preventDefault();
  const next=e.key==='Home'?0:e.key==='End'?options.length-1:
    (current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
  options[next].focus();
});
productPickerList.addEventListener('click',e=>{
  const option=e.target.closest('.product-option');
  if(!option || !productPickerCtx) return;
  const ctx=productPickerCtx;
  const allowed=selectList(ctx.cat,ctx.keepId).some(p=>p.i===option.dataset.i);
  const comp=state.days[ctx.day] && state.days[ctx.day][ctx.mi] && state.days[ctx.day][ctx.mi][ctx.ci];
  if(!allowed || !comp){ closeProductPicker(false); return; }
  clearAutoFitMsg();
  comp.prodId=option.dataset.i;
  comp.customG=null;
  closeProductPicker(false);
  renderDay();
  renderShop();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && productPickerCtx){ e.preventDefault(); closeProductPicker(true); }
});
document.addEventListener('pointerdown',e=>{
  if(!productPickerCtx || productPicker.contains(e.target) || productPickerCtx.anchor.contains(e.target)) return;
  closeProductPicker(false);
});
window.addEventListener('resize',positionProductPicker);
if(window.visualViewport) window.visualViewport.addEventListener('resize',positionProductPicker);
byId('mealsWrap').addEventListener('input', e=>{
  const el = e.target;
  if(!el.classList.contains('inpG')) return;
  const focus = setManualGram(el);
  if(focus) scheduleGramRender(focus);
});
byId('mealsWrap').addEventListener('change', e=>{
  const el = e.target;
  if(el.classList.contains('ckEat')) return;   /* чек-лист має власний обробник */
  const mi = +el.dataset.m, ci = +el.dataset.c;
  if(isNaN(mi) || isNaN(ci)) return;
  const comp = state.days[state.activeDay][mi][ci];
  if(el.classList.contains('selProd')){
    clearAutoFitMsg();
    comp.prodId = el.value; comp.customG = null;
  } else if(el.classList.contains('inpG')){
    clearTimeout(gramInputTimer);
    setManualGram(el, true);
  }
  renderDay(); renderShop();
});
byId('mealsWrap').addEventListener('change', e=>{
  const c = e.target.closest('.ckEat'); if(!c) return;
  const key = state.activeDay+':'+c.dataset.m;
  if(c.checked) state.done[key] = 1; else delete state.done[key];
  renderDay();
});
byId('mealsWrap').addEventListener('click', e=>{
  const weighButton=e.target.closest('.weigh-help-btn');
  if(weighButton){
    const meal=calcDay(state.activeDay).meals[+weighButton.dataset.m];
    const item=meal&&meal.items[+weighButton.dataset.c];
    openWeighGuide(weighTopicForProduct(item?.p),item?.p,weighButton);
    return;
  }
  const productButton=e.target.closest('.product-select-btn');
  if(productButton){
    openProductPicker(productButton);
    return;
  }
  const swap=e.target.closest('.swap-option');
  if(swap){
    if(applyClientSwap(+swap.dataset.m,+swap.dataset.c,swap.dataset.i)){ renderDay(); renderShop(); }
    return;
  }
  const b = e.target.closest('.reset-g'); if(!b) return;
  clearAutoFitMsg();
  state.days[state.activeDay][+b.dataset.m][+b.dataset.c].customG = null;
  renderDay(); renderShop();
});

byId('btnPrint').addEventListener('click', ()=>{ buildPrintView(); window.print(); });
byId('btnSave').addEventListener('click', saveToFile);
byId('btnSaveBrowser').addEventListener('click', ()=>{
  if(saveLocalNow()) alert('Поточну програму збережено у сховищі цього браузера без шифрування.');
});
byId('btnForgetLocal').addEventListener('click', ()=>{
  if(confirm('Видалити локальну копію анкети, меню та прогресу з цього браузера? Поточна відкрита сторінка не закриється.')) forgetLocal();
});
async function shareLink(forClient){
  const reason = forClient ? generationBlockReason() : '';
  if(reason){ alert(reason); return; }
  const warning = forClient
    ? 'Створити посилання на спрощений вигляд? Воно не міститиме поля імені, талії, медичного скринінгу чи історії прогресу. Нотатка спеціаліста входить у посилання. Кожен власник посилання зможе прочитати меню й базові параметри розрахунку.'
    : 'Створити повне посилання для колеги? Воно міститиме анкету, медичний скринінг, налаштування та меню без шифрування. Надсилайте його лише довіреному отримувачу.';
  if(!confirm(warning)) return;
  const url = await packStateToUrl(forClient);
  const msg = forClient
    ? 'Посилання на спрощений вигляд скопійовано. Це не пароль: доступ має кожен, хто отримає посилання.'
    : 'Повне посилання скопійовано. Отримувач зможе змінювати анкету, налаштування та меню.';
  try{ await navigator.clipboard.writeText(url); alert(msg); }
  catch(e){ prompt('Скопіюйте посилання вручну:', url); }
}
byId('btnShare').addEventListener('click', ()=>shareLink(false));
byId('btnShareClient').addEventListener('click', ()=>shareLink(true));
byId('btnLoad').addEventListener('click', ()=>byId('fileInput').click());
byId('fileInput').addEventListener('change', e=>{
  if(e.target.files[0]) loadFromFile(e.target.files[0]);
  e.target.value='';
});
byId('btnAddProd').addEventListener('click', ()=>{
  const n = byId('npName').value.trim();
  const k = +byId('npK').value, p = +byId('npP').value||0,
        f = +byId('npF').value||0, c = +byId('npC').value||0;
  if(!n || !k){ alert('Вкажіть назву та калорійність.'); return; }
  const added = addCustomProduct({ i:'u'+Date.now(), c:byId('npCat').value, n, k, p, f, cb:c, custom:1 });
  if(!added){ alert('Перевірте назву та калорійність продукту.'); return; }
  byId('npName').value=''; byId('npK').value=''; byId('npP').value='';
  byId('npF').value=''; byId('npC').value='';
  renderDay();
  alert(`Продукт «${added.n}» додано. Тепер він доступний у списках своєї категорії.`);
});

/* ---- вага: додати / видалити ---- */
byId('btnAddW').addEventListener('click', ()=>{
  const d = byId('wDate').value;
  const w = parseFloat(String(byId('wKg').value).replace(',','.'));
  const waistRaw=String(byId('wWaist').value||'').replace(',','.');
  const waist=waistRaw===''?null:parseFloat(waistRaw);
  if(!d || !w || w<30 || w>300){ alert('Вкажіть дату та вагу (30–300 кг).'); return; }
  if(waist!=null&&(!Number.isFinite(waist)||waist<40||waist>250)){ alert('Талія має бути в межах 40–250 см або лишатися порожньою.'); return; }
  const ex = state.weights.find(e=>e.d===d);
  if(ex){ ex.w=w; if(waist!=null) ex.waist=waist; }
  else state.weights.push({d,w,waist});
  byId('wKg').value=''; byId('wWaist').value='';
  renderWeight(); saveLocal();
});
byId('wList').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  state.weights.splice(+b.dataset.i, 1);
  renderWeight(); saveLocal();
});

/* ---- щотижневий check-in: додати / видалити ---- */
byId('btnAddCheckin').addEventListener('click', ()=>{
  const item={d:byId('ciDate').value,adherence:+byId('ciAdherence').value,
    hunger:+byId('ciHunger').value,energy:+byId('ciEnergy').value,performance:+byId('ciPerformance').value};
  if(!Number.isFinite(isoDay(item.d))){ alert('Вкажіть дату check-in.'); return; }
  if(![item.hunger,item.energy,item.performance].every(v=>v>=1&&v<=5)||item.adherence<0||item.adherence>100){
    alert('Перевірте оцінки check-in.'); return;
  }
  const ex=state.checkins.find(e=>e.d===item.d);
  if(ex) Object.assign(ex,item); else state.checkins.push(item);
  renderWeight(); saveLocal();
});
byId('ciList').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  state.checkins.splice(+b.dataset.i,1);
  renderWeight(); saveLocal();
});

/* ---- новий клієнт ---- */
byId('btnNewClient').addEventListener('click', ()=>{
  if(!confirm('Очистити всі дані (анкету, меню, записи ваги та check-in) й почати з чистої анкети?\n' +
    'Порада: перед цим можна зберегти поточну програму у файл.')) return;
  try{ localStorage.removeItem(STORAGE_KEY); }catch(e){ showStorageStatus('Не вдалося видалити попередню локальну копію.',true); }
  importedFromLink=false;
  removeCustomProducts();
  Object.assign(state, DEFAULT_STATE());
  migrateSettings(); safeGenWeek(false); syncFormFromState(); renderExcluded(); renderAll();
});

/* ---- тема ---- */
const THEME_KEY = 'nutri_theme';
function currentTheme(){
  const set = document.documentElement.getAttribute('data-theme');
  if(set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(mode){
  if(mode) document.documentElement.setAttribute('data-theme', mode);
  const dark = currentTheme()==='dark';
  byId('btnTheme').textContent = dark ? '☀️' : '🌙';
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? '#16201d' : '#1f6f73');
}
byId('btnMode').addEventListener('click', ()=>{
  state.ui.mode = isClient() ? 'pro' : 'client';
  applyMode(); renderDay(); saveLocal();
});
byId('btnUnlock').addEventListener('click', e=>{
  e.preventDefault();
  if(state.ui.locked){ alert('Це посилання відкриває лише спрощений вигляд. Для налаштувань потрібен оригінальний файл або повне посилання від спеціаліста.'); return; }
  if(!confirm('Відкрити режим спеціаліста? Ви побачите анкету, розрахунки й налаштування ' +
    'і зможете змінювати програму.')) return;
  state.ui.mode='pro'; state.ui.locked=false; syncFormFromState(); renderExcluded(); renderAll();
});
byId('btnTheme').addEventListener('click', ()=>{
  const next = currentTheme()==='dark' ? 'light' : 'dark';
  applyTheme(next);
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
  renderWeight();  /* графік перемальовується під нові кольори */
});
try{
  const saved = localStorage.getItem(THEME_KEY);
  if(saved) document.documentElement.setAttribute('data-theme', saved);
}catch(e){}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
  if(!document.documentElement.getAttribute('data-theme')) applyTheme();
});

/* ============ СТАРТ ============ */
(async ()=>{
const fromLink = await unpackStateFromHash();
const restored = fromLink || loadLocal();
migrateSettings();
sanitizeProfile();
ensureDays();
syncFormFromState();
renderExcluded();
renderAll();
if(fromLink){
  showStorageStatus('Програму відкрито з посилання без перезапису локального профілю. Щоб зберегти її на цьому пристрої, натисніть відповідну кнопку нижче.');
  setTimeout(()=>alert('Програму відкрито з посилання. Вона не перезаписала локальну копію на цьому пристрої.'),300);
}
})();
/* дата за замовчуванням — сьогодні (локальний час) */
{ const t = new Date();
  const today=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
  byId('wDate').value = today; byId('ciDate').value = today; }
/* PWA: працює, коли сайт відкрито за https-посиланням */
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
