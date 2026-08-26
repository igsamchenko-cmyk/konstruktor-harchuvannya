(()=>{'use strict';
const LANG_KEY='nutri_language', E=window.NUTRI_EN||{};
let language='uk', observer=null, busy=false;
const texts=new WeakMap(), attrs=new WeakMap();
const hasUk=s=>/[А-Яа-яІіЇїЄєҐґ]/.test(s||'');
const exactExtra={
  'ІМТ не розрізняє м’язи та жир, тому ярлик надлишкової ваги не застосовується. Норми білка й жирів рахуються від фактичної ваги. Для контролю орієнтуйтесь на талію відносно зросту та, за можливості, вимір складу тіла.':'BMI does not distinguish muscle from fat, so no excess-weight label is applied. Protein and fat targets use actual body weight. Monitor waist-to-height ratio and, when available, body-composition measurements.',
  'ІМТ не розрізняє м’язи та жир, тому ярлик надлишкової ваги не застосовується. Норми білка й жирів рахуються від фактичної ваги. Водночас співвідношення талії до зросту вище 0,5 — оцініть склад тіла та кардіометаболічні фактори окремо.':'BMI does not distinguish muscle from fat, so no excess-weight label is applied. Protein and fat targets use actual body weight. The waist-to-height ratio is above 0.5, so assess body composition and cardiometabolic factors separately.',
  'ІМТ — скринінговий показник, а не діагноз: він не відрізняє жир від м’язів. Інтерпретуйте його разом із талією відносно зросту, анамнезом і, за можливості, складом тіла.':'BMI is a screening measure, not a diagnosis: it does not distinguish fat from muscle. Interpret it alongside waist-to-height ratio, medical history and, when available, body composition.',
  'Вага утримується на поточному рівні.':'Weight is expected to remain stable.',
  'Білок за прийомами:':'Protein per meal:',
  'для повноцінного синтезу м’язового білка основні прийоми мають давати 25–30 г.':'main meals should provide 25–30 g to support muscle-protein synthesis.',
  'Продукти в межах однієї категорії взаємозамінні — можна міняти місцями, зберігаючи вказану порцію.':'Foods within the same category are interchangeable; swap them while keeping the listed portion.',
  'Програма має рекомендаційний характер і не замінює консультацію лікаря.':'This plan is for guidance and does not replace medical advice.'
};
Object.assign(E,exactExtra);
Object.assign(E,{
  'Продукти в кожному списку — рівноцінні за калорійністю: змінюйте будь-який, а грами перерахуються автоматично. Грами можна відредагувати вручну (кнопка ↺ повертає авторозрахунок). У кінці кожного списку є група «Страви» — борщ і рагу серед овочів, вареники й деруни серед гарнірів, голубці й сирники серед білкових; їхні калорії приблизні (≈), бо залежать від рецепта.':'Foods in each list are calorie-equivalent: choose any item and portions recalculate automatically. You can edit grams manually; ↺ restores the automatic portion. The “Dishes” group contains prepared recipes whose calories are approximate (≈) because they depend on the recipe.'
});
Object.assign(E,{
  'Торт «Наполеон»':'Napoleon cake',
  'Торт «Спартак»':'Spartak cake',
  'Торт «Прага»':'Prague cake',
  'Сметанник':'Smetannik sour-cream cake',
  'Еклер з кремом':'Cream eclair',
  'Трубочка зі згущеним молоком':'Wafer tube with condensed milk',
  'Пахлава':'Baklava',
  'Макарон':'Macaron',
  'Донат':'Donut',
  'Тістечко «Картопля»':'Kartoshka cake pop'
});
Object.assign(E,{
  'Підказки балансу':'Balance hints',
  'Баланс дня тримається красиво':'The day is nicely balanced',
  'День майже зібраний, залишились дрібні штрихи':'The day is almost set; just small tweaks left',
  'Є що підкрутити, але день легко врівноважити':'There is something to tune, but the day is easy to balance',
  'в нормі':'on target',
  'бракує':'low',
  'надлишок':'high',
  'Білкова опора дня зібрана добре.':'Protein support is set up well.',
  'Білку ще не вистачає для ситості й відновлення. Додай курку, рибу, яйця, сир або грецький йогурт.':'Protein is still low for satiety and recovery. Add chicken, fish, eggs, cottage cheese or Greek yogurt.',
  'Білка вже з запасом. Якщо калорії тиснуть, зменш м’ясо, сир або порцію протеїнового продукту.':'Protein is already above target. If calories are tight, reduce meat, cottage cheese or another protein portion.',
  'Жири тримаються в комфортному коридорі.':'Fats are in a comfortable range.',
  'Жирів малувато для гормонів і засвоєння вітамінів. Додай 5–10 г олії, горіхів, авокадо або жирної риби.':'Fats are a bit low for hormones and vitamin absorption. Add 5–10 g oil, nuts, avocado or fatty fish.',
  'Жири сьогодні трохи забрали калорії на себе. Зменш олію, горіхи, сир, майонез або жирніше м’ясо.':'Fats took a little too much of today’s calories. Reduce oil, nuts, cheese, mayonnaise or fattier meat.',
  'Енергія дня зібрана рівно.':'Daily energy is lined up well.',
  'Вуглеводів малувато для енергії. Додай крупу, картоплю, хліб, фрукти або трохи збільш гарнір.':'Carbs are a bit low for energy. Add grains, potatoes, bread, fruit or slightly increase the side dish.',
  'Вуглеводи вийшли вперед. Підріж гарнір, хліб, солодке або обери менш вуглеводний перекус.':'Carbs are running ahead. Trim the side dish, bread or sweets, or choose a lower-carb snack.',
  'Клітковина закриває мінімум дня.':'Fiber covers the daily minimum.',
  'Клітковини бракує для ситості й травлення. Додай овочі, ягоди, бобові або цільнозерновий продукт.':'Fiber is low for satiety and digestion. Add vegetables, berries, legumes or a whole-grain food.',
  'Клітковини достатньо. Якщо є здуття, піднімай її поступово й не забувай про воду.':'Fiber is sufficient. If bloating appears, increase it gradually and keep fluids up.'
});
Object.assign(E,{
  "крупи, макарони й бобові — сухими; м'ясо, рибу та субпродукти — сирими (після готування маса меншає на 25–30% у м'яса та ~20% у риби); овочі й фрукти — очищеними.":"grains, pasta and legumes — dry; meat, fish and offal — raw (cooking reduces meat weight by 25–30% and fish by about 20%); vegetables and fruit — after trimming.",
  "— рахуються всі напої (вода, чай, кава, компот, юшка); ще ≈0,5 л надходить із їжею.":"— all drinks count (water, tea, coffee, compote and broth); about 0.5 L also comes from food."
});
Object.assign(E,{
  'Стільки ви витрачаєте за добу — раціон утримує вагу та форму на місці.':'This matches your daily expenditure, keeping weight and body composition stable.',
  'Перетворіть профіцит калорій на м’язовий прогрес':'Turn a calorie surplus into muscle progress',
  'Профіцит працює найкраще разом із послідовним силовим стимулом. Після звернення Ігор сформує програму з прогресією навантаження під ваш рівень і можливості.':'A surplus works best with consistent resistance training. After you get in touch, Ihor will build a progressive program around your level and capabilities.',
  '— співвідношення вище рекомендованого':'— ratio above the recommended range',
  'врахована':'considered',
  'Норма клітковини':'Fiber target',
  '— нарощуйте її поступово (по 5 г на тиждень) і збільшуйте воду, інакше буде здуття.':'— increase it gradually (about 5 g per week) and drink more fluids to limit bloating.',
  'Ваша програма харчування':'Your nutrition program',
  'Норми, меню на тиждень і список покупок. Продукти в межах одного рядка рівноцінні — можна міняти місцями, зберігаючи вказану порцію.':'Targets, weekly menu and shopping list. Foods in the same row are interchangeable — swap them while keeping the listed portion.',
  "з'їдено":'eaten'
});
function core(value){
  const key=String(value).replace(/\s+/g,' ').trim();
  if(!key)return key;
  if(E[key])return E[key];
  const suffix=key.match(/^(.*?) \((суха|сира) вага\)$/);
  if(suffix)return (E[suffix[1]]||suffix[1])+(suffix[2]==='суха'?' (dry weight)':' (raw weight)');
  let s=key;
  const pairs=[
    ['Коефіцієнт активності:','Activity factor:'],['рух протягом дня і тренування рахуються окремо','daily movement and training are calculated separately'],['з реальних витрат','using realistic energy expenditure'],['на 1000 кроків','per 1,000 steps'],['за тренування','per workout'],
    ['Тому значення нижчі за звичні таблиці 1,375/1,55 — ті завищують внесок тренувань у 3–4 рази.','These values are lower than conventional 1.375/1.55 tables, which overstate training expenditure three- to fourfold.'],
    ['Це стартова оцінка:','This is a starting estimate:'],['через 2–3 тижні звірте з фактичною динамікою ваги','compare it with the actual weight trend after 2–3 weeks'],['в розділі «Прогрес»','in the “Progress” section'],['і за потреби скоригуйте дефіцит або профіцит.','and adjust the deficit or surplus if needed.'],
    ['розрахункової ваги','calculation weight'],['м’язова статура врахована','athletic build considered'],['М’язова статура','Athletic build'],['Розрахункова вага','Calculation weight'],['Норми білка та жирів рахуються на скориговану вагу:','Protein and fat targets use an adjusted weight:'],
    ['Талія','Waist'],['до зросту','height ratio'],['ІМТ','BMI'],['Калорії та БЖВ у нормі','Calories and macros are on target'],['Невелике відхилення:','Small deviation:'],['Значне відхилення:','Large deviation:'],
    ["З'їдено",'Eaten'],['вчорашня вечеря, лише розігріти',"yesterday's dinner, reheat only"],['Страви (≈)','Dishes (≈)'],['г сух.','g dry'],['г сир.','g raw'],['(суха вага)','(dry weight)'],['(сира вага)','(raw weight)'],
    ['Ціль:','Goal:'],['схуднення','fat loss'],['у референсі','within reference'],['Розподіл калорій:','Calorie distribution:'],['очікуваний темп','expected rate'],['Рідина:','Fluids:'],['на день','per day'],[' р.',' y.o.'],['за весь час','overall'],['Зараз:','Current:'],['Початок:','Start:'],['Додайте перший запис ваги — і тут з’явиться графік динаміки.','Add your first weight entry to see a trend chart.'],['Додайте ще один запис — і побачите графік динаміки.','Add one more entry to see the trend chart.'],
    ['Як приготувати:','How to prepare:'],['Повернути авторозрахунок','Restore automatic calculation'],['Повернути продукт','Restore food'],['Видалити запис','Delete entry'],['будь-коли','any time'],['ст. л.','tbsp'],['скиб.','slices'],['шт.','pcs'],["(позначка «g dry»); м'ясо, рибу та субпродукти —",'(marked “g dry”); meat, fish and offal —']
  ];
  for(const [a,b] of pairs)s=s.split(a).join(b);
  s=s.replace(/— рахуються всі напої \(вода, чай, кава, компот, юшка\); ще ≈(.*?) л надходить із їжею\./,'— all drinks count (water, tea, coffee, compote and broth); about $1 L also comes from food.');
  const letters='А-Яа-яІіЇїЄєҐґ';
  const words=[['Понеділок','Monday'],['Вівторок','Tuesday'],['Середа','Wednesday'],['Четвер','Thursday'],['П’ятниця','Friday'],['Субота','Saturday'],['Неділя','Sunday'],['калорії','calories'],['білки','protein'],['білок','protein'],['жири','fat'],['вуглеводи','carbohydrates'],['клітковина','fiber'],['ціль','target'],['із','of'],['прийомів','meals'],['прийоми','meals'],['мінімум','minimum'],['підтримка','maintenance'],['дефіцит','deficit'],['профіцит','surplus'],['складено','created'],['чоловік','male'],['жінка','female'],['Продукти','Foods'],['Грами','Grams'],['Витрати','Expenditure'],['активність','activity'],['смаколики','treats']];
  for(const [a,b] of words)s=s.replace(new RegExp('(?<!['+letters+'])'+a+'(?!['+letters+'])','g'),b);
  s=s.replace(/кг\/тиждень/g,'kg/week').replace(/ккал/g,'kcal');
  s=s.replace(/(?<![А-Яа-яІіЇїЄєҐґ])кг(?![А-Яа-яІіЇїЄєҐґ])/g,'kg');
  s=s.replace(/(?<![А-Яа-яІіЇїЄєҐґ])г(?![А-Яа-яІіЇїЄєҐґ])/g,'g');
  s=s.replace(/(?<![А-Яа-яІіЇїЄєҐґ])л(?![А-Яа-яІіЇїЄєҐґ])/g,'L');
  s=s.replace(/(?<![А-Яа-яІіЇїЄєҐґ])см(?![А-Яа-яІіЇїЄєҐґ])/g,'cm');
  s=s.replace(/Це на (.*?) kcal менше за ваші добові витрати — темп, за якого вага знижується поступово, без втрати м’язів\./,'This is $1 kcal below daily expenditure — a gradual rate designed to preserve muscle.');
  s=s.replace(/Це на (.*?) kcal більше за ваші добові витрати — помірний surplus для росту м’язів без зайвого жиру\./,'This is $1 kcal above daily expenditure — a moderate surplus for muscle gain without unnecessary fat.');
  s=s.replace(/Випивати (.*?) L рідини (?:на день|per day)/,'Drink $1 L of fluids per day');
  s=s.replace(/— сюди входять вода, чай, кава, компот, юшка\./,'— this includes water, tea, coffee, compote and broth.');
  s=s.replace(/Загальна потреба (.*?) L \(30–35 мл\/kg\), ще ≈(.*?) L організм отримує з їжі\. У спеку та після тренувань — більше\./,'Total fluid need: $1 L (30–35 ml/kg); about $2 L comes from food. Drink more in hot weather and after training.');
  s=s.replace(/^Формула Міффліна–Сан Жеора · activity/,'Mifflin–St Jeor equation · activity');
  s=s.replace(/^За темпу$/,'At a rate of');
  s=s.replace(/\((.*?)% маси тіла\) через 4 \/ 8 \/ 12 тижнів:/,'($1% of body weight), projected weight after 4 / 8 / 12 weeks:');
  s=s.replace(/Білок за прийомами: (.*?) — для повноцінного синтезу м'язового білка основні meals мають давати 25–30 g\./,'Protein per meal: $1 — main meals should provide 25–30 g to support muscle-protein synthesis.');
  s=s.replace(/^Білки —$/,'Protein —').replace(/^Жири —$/,'Fat —').replace(/^Вуглеводи —$/,'Carbohydrates —');
  s=s.replace(/([·/]) Б /g,'$1 P ').replace(/([·/]) Ж /g,'$1 F ').replace(/([·/]) В /g,'$1 C ');
  s=s.replace(/ · Б$/,' · P').replace(/^\/ Ж /,'/ F ').replace(/ \/ В /,' / C ');
  s=s.replace(/^г$/,'g').replace(/^кг$/,'kg').replace(/^л$/,'L').replace(/^ІС$/,'IS');
  return s;
}
function translated(value){
  const str=String(value),lead=(str.match(/^\s*/)||[''])[0],tail=(str.match(/\s*$/)||[''])[0];
  return lead+core(str.trim())+tail;
}
function walk(root=document.documentElement){
  if(busy)return;busy=true;if(observer)observer.disconnect();
  try{
    const nodes=[];
    if(root.nodeType===3)nodes.push(root);else{
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
      while((n=w.nextNode()))if(!/^(SCRIPT|STYLE)$/.test(n.parentElement?.tagName||'')&&!n.parentElement?.closest('.pnote'))nodes.push(n);
    }
    for(const n of nodes){
      if(language==='en'){
        if(hasUk(n.nodeValue))texts.set(n,n.nodeValue);
        const next=translated(texts.get(n)||n.nodeValue);if(next!==n.nodeValue)n.nodeValue=next;
      }else{const original=texts.get(n);if(original!=null&&n.nodeValue!==original)n.nodeValue=original}
    }
    const els=root.nodeType===1?[root,...root.querySelectorAll('*')]:[];
    for(const el of els){
      const names=['title','aria-label','alt','placeholder'];let saved=attrs.get(el);
      if(!saved){saved={};attrs.set(el,saved)}
      for(const name of names){if(!el.hasAttribute(name))continue;const value=el.getAttribute(name);
        if(language==='en'){if(hasUk(value))saved[name]=value;const next=core(saved[name]||value);if(next!==value)el.setAttribute(name,next)}
        else if(saved[name]!=null)el.setAttribute(name,saved[name]);
      }
    }
    document.title=language==='en'?'Nutrition Program Builder':'Конструктор програми харчування';
    const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=language==='en'?'Personalized calorie and macro calculation with a weekly menu of interchangeable foods.':'Індивідуальний розрахунок калорійності та БЖВ і побудова тижневого меню з рівноцінних продуктів.';
    for(const a of document.querySelectorAll('a[href^="mailto:"]')){
      if(!a.__ukMailHref)a.__ukMailHref=a.getAttribute('href');
      if(language==='en'){
        const subject=a.closest('.training-actions')?'Training program access request':a.classList.contains('training-email')?'Nutrition consultation':'Personalized nutrition program';
        a.setAttribute('href','mailto:igsamchenko@gmail.com?subject='+encodeURIComponent(subject));
      }else if(a.__ukMailHref)a.setAttribute('href',a.__ukMailHref);
    }
    const b=document.getElementById('btnLang');if(b){b.textContent=language==='en'?'UA':'EN';b.title=language==='en'?'Українська':'English';b.setAttribute('aria-label',language==='en'?'Перейти на українську':'Switch to English')}
  }finally{busy=false;if(observer)observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true})}
}
function setLanguage(lang,persist=true){
  language=lang==='en'?'en':'uk';window.nutriLanguage=language;document.documentElement.lang=language;
  if(persist)try{localStorage.setItem(LANG_KEY,language)}catch(e){}
  walk();
}
window.nutriT=(uk,en)=>language==='en'?en:uk;
window.nutriTranslate=walk;
window.nutriProductName=p=>language==='en'?(E[p.n]||p.n):p.n;
try{language=localStorage.getItem(LANG_KEY)==='en'?'en':'uk'}catch(e){}
observer=new MutationObserver(()=>walk());
document.getElementById('btnLang').addEventListener('click',()=>{
  setLanguage(language==='en'?'uk':'en');
  if(typeof renderAll==='function')renderAll();
  if(typeof renderExcluded==='function')renderExcluded();
  if(typeof syncFormFromState==='function')syncFormFromState();
  queueMicrotask(()=>walk());
});
const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window),nativePrompt=window.prompt.bind(window),nativePrint=window.print.bind(window);
window.alert=m=>nativeAlert(language==='en'?core(m):m);
window.confirm=m=>nativeConfirm(language==='en'?core(m):m);
window.prompt=(m,v)=>nativePrompt(language==='en'?core(m):m,v);
window.print=()=>{if(language==='en')walk(document.getElementById('printView'));nativePrint()};
setLanguage(language,false);
if(typeof renderAll==='function')renderAll();
if(typeof renderExcluded==='function')renderExcluded();
queueMicrotask(()=>walk());
})();
