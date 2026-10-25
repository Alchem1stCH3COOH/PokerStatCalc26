'use strict';
const KEY = 'poker-league-v1';
let state = Poker.fresh(), current = 0, storageBlocked = false;
const $ = id => document.getElementById(id);
const fmt = n => n === null ? '—' : new Intl.NumberFormat('ru-RU', {maximumFractionDigits:6}).format(n);
function message(text) { $('message').textContent = text; }
try { const raw = localStorage.getItem(KEY); if (raw) state = Poker.validate(JSON.parse(raw)); }
catch { storageBlocked = true; message('Не удалось прочитать сохранение. Оно не перезаписано. Экспортируйте исходную копию или импортируйте исправный JSON.'); }
function save() {
  if (storageBlocked) { $('saved').textContent = 'Автосохранение недоступно — экспортируйте JSON'; return; }
  try { localStorage.setItem(KEY, JSON.stringify(state)); $('saved').textContent = 'Сохранено в браузере'; }
  catch { $('saved').textContent = 'Не сохранено — экспортируйте JSON'; }
}
function element(tag, text, className) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (className) e.className = className; return e; }
function update() {
  const data = Poker.ranking(state), r = data.rounds[current];
  $('progress').textContent = `Учтено раундов: ${data.rounds.filter(r => r.ready).length} из 3. «—» означает неполный раунд.`;
  $('ranking').replaceChildren(...data.rows.map(p => { const row = element('tr'); for (const value of [data.rounds.some(r=>r.ready) ? p.rank : '—', p.name, ...p.scores.map(fmt), fmt(p.total)]) row.append(element('td',value)); row.title = `Побед: ${p.wins}; KO: ${fmt(p.ko)}`; return row; }));
  $('round-status').replaceChildren(element('strong',r.ready ? 'Раунд учтён в рейтинге.' : 'Раунд пока не учтён.'));
  if (!r.ready) { const ul = element('ul'); r.issues.forEach(t=>ul.append(element('li',t.replace(/Игрок (\d+)/,(_,n)=>state.names[Number(n)-1])))); $('round-status').append(ul); }
  document.querySelectorAll('.result').forEach((e,i)=>{e.textContent = `Место: ${r.places[i] ?? '—'} · ${fmt(r.scores[i])} очк.`;});
}
function renderPlayers() {
  const r = state.rounds[current];
  document.querySelectorAll('[data-round]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.round)===current)));
  $('players').replaceChildren(...state.names.map((name,i)=>{
    const row=element('div',undefined,'player'); row.append(element('div',name,'player-name'));
    for(const [key,title,kind] of [['stacks','Фишки','stack'],['ko','KO','ko']]) {
      const label=element('label',title), input=element('input'); input.type='text'; input.inputMode=kind==='stack'?'numeric':'decimal'; input.value=r[key][i]; input.setAttribute('aria-label',`${name}: ${title}`); input.autocomplete='off'; input.maxLength=18;
      if(key==='stacks' && r.out.includes(i)) {input.disabled=true;input.value='';input.placeholder='Вылетел';}
      input.addEventListener('input',()=>{try {Poker.number(input.value,kind); input.setCustomValidity('');input.removeAttribute('aria-invalid');r[key][i]=input.value;save();update();message('');}catch(e){input.setCustomValidity(e.message);input.setAttribute('aria-invalid','true');message(`${name}: ${e.message} Это значение не сохранено; в расчёте остаётся предыдущее.`);}});
      input.addEventListener('change',()=>{if(!input.checkValidity()){input.reportValidity();input.value=r[key][i];input.setCustomValidity('');input.removeAttribute('aria-invalid');}});
      label.append(input);row.append(label);
    }
    const control=element('div',undefined,'out-control'), button=element('button',r.out.includes(i)?'Вернуть в игру':'Вылетел');button.setAttribute('aria-label',`${name}: ${button.textContent}`);
    button.onclick=()=>{if(r.out.includes(i))r.out.splice(r.out.indexOf(i),1);else {if(r.out.length===7){message('Один игрок должен остаться победителем.');return;} r.out.push(i);}save();renderPlayers();};
    if(r.out.includes(i)) {const select=element('select');select.setAttribute('aria-label',`${name}: порядок вылета`);r.out.forEach((_,j)=>{const o=element('option',`Вылет №${j+1}`);o.value=j;o.selected=r.out[j]===i;select.append(o);});select.onchange=()=>{r.out.splice(r.out.indexOf(i),1);r.out.splice(Number(select.value),0,i);save();renderPlayers();};control.append(select);}
    control.append(button);row.append(control,element('div',undefined,'result'));return row;
  }));update();
}
function renderNames() {
  $('names').replaceChildren(...state.names.map((name,i)=>{const label=element('label',`Игрок ${i+1}`),input=element('input');input.value=name;input.maxLength=40;input.setAttribute('aria-label',`Имя игрока ${i+1}`);input.oninput=()=>{const copy=structuredClone(state);copy.names[i]=input.value.trim();try{Poker.validate(copy);state.names[i]=copy.names[i];input.removeAttribute('aria-invalid');message('');save();renderPlayers();}catch(e){input.setAttribute('aria-invalid','true');message(e.message+' Предыдущее имя сохранено.');}};input.onchange=()=>{input.value=state.names[i];input.removeAttribute('aria-invalid');};label.append(input);return label;}));
}
document.querySelectorAll('[data-round]').forEach(b=>b.onclick=()=>{current=Number(b.dataset.round);renderPlayers();});
$('export').onclick=()=>{let raw=JSON.stringify(state,null,2);if(storageBlocked){try{raw=localStorage.getItem(KEY)||raw;}catch{}}const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=element('a');a.href=url;a.download=`poker-league-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{const file=$('file').files[0];if(!file)return;try{if(file.size>100000)throw Error('Файл слишком большой (максимум 100 КБ).');const imported=Poker.validate(JSON.parse(await file.text()));if(!confirm('Заменить имена и все три раунда данными из JSON? Текущую копию можно предварительно экспортировать.'))return;state=imported;storageBlocked=false;save();renderNames();renderPlayers();message('Резервная копия восстановлена.');}catch(e){message(`Импорт отменён: ${e.message} Текущие данные сохранены.`);}finally{$('file').value='';}};
window.addEventListener('storage',e=>{if(e.key===KEY){storageBlocked=true;$('saved').textContent='Данные изменены в другой вкладке — обновите страницу';message('Чтобы не перезаписать изменения другой вкладки, автосохранение остановлено. Экспортируйте нужную копию и обновите страницу.');}});
renderNames();renderPlayers();if(storageBlocked)$('saved').textContent='Автосохранение недоступно';
