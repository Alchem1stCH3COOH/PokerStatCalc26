(function (root) {
  'use strict';
  const POINTS = [12, 9, 7, 5, 3, 2, 1, 0];
  const fresh = () => ({version: 1, names: Array.from({length: 8}, (_, i) => `Игрок ${i + 1}`), rounds: Array.from({length: 3}, () => ({stacks: Array(8).fill(''), ko: Array(8).fill(''), out: []}))});
  function number(text, kind) {
    if (text === '') return null;
    if (typeof text !== 'string' || !/^\d+(?:[.,]\d+)?$/.test(text)) throw Error('Введите неотрицательное число.');
    const n = Number(text.replace(',', '.'));
    if (!Number.isFinite(n) || n > (kind === 'stack' ? 80000 : 7) || (kind === 'stack' && !Number.isInteger(n))) throw Error(kind === 'stack' ? 'Фишки: целое число от 0 до 80 000.' : 'KO: число от 0 до 7.');
    return n;
  }
  function validate(s) {
    if (!s || s.version !== 1 || !Array.isArray(s.names) || s.names.length !== 8 || !s.names.every(n => typeof n === 'string' && n.trim().length > 0 && n.length <= 40) || new Set(s.names.map(n => n.trim().toLocaleLowerCase())).size !== 8) throw Error('Нужны 8 разных имён длиной от 1 до 40 символов.');
    if (!Array.isArray(s.rounds) || s.rounds.length !== 3) throw Error('Нужны ровно 3 раунда.');
    for (const r of s.rounds) {
      if (!r || !Array.isArray(r.out) || r.out.length > 7 || new Set(r.out).size !== r.out.length || !r.out.every(i => Number.isInteger(i) && i >= 0 && i < 8)) throw Error('Некорректный порядок выбывания.');
      for (const [key, kind] of [['stacks', 'stack'], ['ko', 'ko']]) {
        if (!Array.isArray(r[key]) || r[key].length !== 8) throw Error('В раунде должно быть 8 игроков.');
        r[key].forEach(v => number(v, kind));
      }
    }
    return s;
  }
  function round(r) {
    const issues = [], active = [], missing = [], places = Array(8).fill(null), base = Array(8).fill(null);
    const ko = r.ko.map(v => number(v, 'ko') || 0);
    r.stacks.forEach((v, i) => {
      if (r.out.includes(i)) return;
      const n = number(v, 'stack');
      if (n === null || n === 0) missing.push(i);
      else active.push({i, n});
    });
    if (missing.length) issues.push(`Осталось внести результатов: ${missing.length}. Укажите положительные стеки или отметьте вылеты.`);
    r.out.forEach((i, order) => { places[i] = String(8 - order); base[i] = POINTS[7 - order]; });
    const chips = active.reduce((sum, p) => sum + p.n, 0);
    if (active.length + r.out.length === 8 && chips !== 80000) issues.push(`Всего ${chips.toLocaleString('ru-RU')} фишек; должно быть 80 000 (8 × 10 000).`);
    const totalKO = ko.reduce((a, b) => a + b, 0);
    if (Math.abs(totalKO - r.out.length) > 0.000001) issues.push(`KO: ${totalKO}; вылетов: ${r.out.length}. Распределите по 1 KO за каждый вылет.`);
    const ready = issues.length === 0;
    const wins = Array(8).fill(0);
    if (ready) {
      active.sort((a, b) => b.n - a.n);
      for (let j = 0; j < active.length;) {
        let end = j + 1;
        while (end < active.length && active[end].n === active[j].n) end++;
        const pts = POINTS.slice(j, end).reduce((a, b) => a + b, 0) / (end - j);
        for (let k = j; k < end; k++) {
          const i = active[k].i;
          places[i] = end - j > 1 ? `${j + 1}–${end}` : String(j + 1);
          base[i] = pts;
          wins[i] = j === 0 ? 1 : 0;
        }
        j = end;
      }
    }
    return {ready, issues, places, base, wins, ko, scores: base.map((b, i) => ready ? b + ko[i] : null)};
  }
  function ranking(s) {
    const rounds = s.rounds.map(round);
    const rows = s.names.map((name, i) => ({i, name, scores: rounds.map(r => r.scores[i]), total: rounds.reduce((v, r) => v + (r.scores[i] ?? 0), 0), wins: rounds.reduce((v, r) => v + (r.ready ? r.wins[i] : 0), 0), ko: rounds.reduce((v, r) => v + (r.ready ? r.ko[i] : 0), 0)}));
    const cmp = (a, b) => Math.abs(b.total - a.total) > 1e-9 ? b.total - a.total : b.wins - a.wins || (Math.abs(b.ko - a.ko) > 1e-9 ? b.ko - a.ko : 0);
    rows.sort(cmp);
    rows.forEach((p, i) => {p.rank = i && cmp(rows[i - 1], p) === 0 ? rows[i - 1].rank : i + 1;});
    return {rows, rounds};
  }
  const api = {POINTS, fresh, number, validate, round, ranking};
  if (typeof module !== 'undefined') module.exports = api;
  else root.Poker = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
