// ===== v3 통계 화면 =====
function soDefault() {
  const db = S.db, gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b);
  return Object.assign({}, statDef(), { gis: gis.filter((g) => db.settings.grad[g] && db.settings.grad[g] < today()), dept: '', baseMode: 'grad', base: '', tab: 'gi', cq: '' });
}
S.so = null; S.drill = null;
IDB.get('statOpt').then((v) => { if (v) S.soSaved = v; }).catch(() => {});
function so() { if (!S.so) S.so = Object.assign(soDefault(), S.soSaved || {}); return S.so; }
function soSave() { const o = Object.assign({}, S.so); delete o.cq; IDB.set('statOpt', o).catch(() => {}); }

const SCOLS = [
  { k: 'n', l: '대상', T: () => true },
  { k: 'emp', l: '취업', T: (t) => t.path === '취업', b: 1 },
  { k: 'conv', l: '채용전환', T: (t) => t.detail === '채용전환', g: '취업 내역' },
  { k: 'prac', l: '실습만', T: (t) => t.detail === '실습만' },
  { k: 'pub', l: '공공', R: (r) => r.part === '공공', g: '취업처 규모' },
  { k: 'big', l: '대기업', R: (r) => r.part === '대기업' },
  { k: 'sme', l: '중견·중소', R: (r) => r.part === '중견·중소' },
  { k: 'etc', l: '해외·기타', R: (r) => r.part === '해외·기타' || !r.part },
  { k: 'out', l: '진학·입대', t: '진학·입대·가업승계(가업승계를 취업으로 보지 않을 때)', T: (t) => ['진학', '입대', '가업승계'].includes(t.path), g: '취업 외' },
  { k: 'prep', l: '준비', T: (t) => t.path === '취업·진학 준비' },
  { k: 'none', l: '기타·없음', T: (t) => t.path === '기록 없음' || t.path === '기타' },
];
function statRun() {
  const o = so();
  const res = ENG.stat(S.db, o.gis.slice().sort((a, b) => a - b), { base: o.baseMode === 'date' ? o.base : (o.baseMode === 'today' ? today() : ''), months: +o.months || 0, mode: o.mode, prac: o.prac, glob: o.glob, ignoreAfter: o.ignoreAfter, gaup: o.gaup, school: true, unit: o.unit, denom: o.denom });
  const T = res.T.filter((t) => t.target && (!o.dept || t.dept === o.dept)), R = res.R.filter((r) => !o.dept || r.dept === o.dept);
  return { T, R, o };
}
function aggRow(T, R, o) {
  const v = {}; for (const c of SCOLS) v[c.k] = c.T ? T.filter(c.T).length : R.filter(c.R).length;
  const d = v.n - (o.denom === 'excl' ? T.filter((t) => t.path === '진학' || t.path === '입대').length : 0);
  v.rate = d ? v.emp / d : 0; return v;
}
const cellBtn = (n, drill) => (n ? `<button class="nb" data-act="drill" data-d='${esc(JSON.stringify(drill))}'>${n}</button>` : '<span class="muted">0</span>');
function groupTable(keys, keyName, keyOf, run, withOff) {
  const { T, R, o } = run, off = S.db.settings.official || {};
  const rows = keys.map((k) => ({ k, T: T.filter((t) => keyOf(t) === k), R: R.filter((r) => keyOf(r) === k) }));
  rows.push({ k: '합계', T, R, total: true });
  const groups = [[keyName + ' · 대상 · 취업', 3]]; let cur = null;
  for (const c of SCOLS.slice(2)) { if (c.g) { cur = [c.g, 0]; groups.push(cur); } cur[1]++; }
  groups.push(['취업률', withOff ? 2 : 1]);
  const gstart = new Set(SCOLS.filter((c) => c.g).map((c) => c.k));
  const w = [keyName === '학과' ? 84 : 44, 46, 46, 58, 48, 42, 48, 60, 54, 62, 38, 56, 56].concat(withOff ? [104] : []);
  const html = `<table class="t num fixed sumt" style="min-width:${w.reduce((a, b) => a + b, 0)}px"><colgroup>${w.map((x) => `<col style="width:${x}px">`).join('')}</colgroup>
    <thead><tr class="gh">${groups.map(([l, n], i) => `<th colspan="${n}" class="${i ? 'g' : ''}">${esc(l)}</th>`).join('')}</tr>
    <tr><th>${esc(keyName)}</th>${SCOLS.map((c) => `<th class="${gstart.has(c.k) ? 'g' : ''}" ${c.t ? `title="${esc(c.t)}"` : ''}>${esc(c.l)}</th>`).join('')}<th class="g">원장</th>${withOff ? '<th>공식</th>' : ''}</tr></thead>
    <tbody>${rows.map((r) => { const v = aggRow(r.T, r.R, o); const lab = r.total ? '합계' : (keyName === '기수' ? r.k + '기' : r.k); const of = withOff && !o.dept ? (r.total ? keys.reduce((a, k) => { const x = off[k]; if (!x || !x.grad) return a; return { emp: a.emp + (x.emp || 0), grad: a.grad + x.grad }; }, { emp: 0, grad: 0 }) : off[r.k]) : null;
      return `<tr class="${r.total ? 'tot' : ''}"><td><b>${esc(lab)}</b></td>${SCOLS.map((c) => `<td class="${gstart.has(c.k) ? 'g' : ''}">${c.b ? '<b>' : ''}${cellBtn(v[c.k], { by: keyName, k: r.total ? '' : r.k, c: c.k })}${c.b ? '</b>' : ''}</td>`).join('')}
        <td class="g"><b style="color:var(--primary)">${pct(v.rate)}</b></td>${withOff ? `<td class="ok" style="font-weight:400">${of && of.grad ? `${pct(of.emp / of.grad)} <span class="small muted">(${of.emp}/${of.grad})</span>` : '-'}</td>` : ''}</tr>`; }).join('')}</tbody></table>`;
  return html;
}
function rateBars(run) {
  const { T, R, o } = run, off = S.db.settings.official || {}, H = 180;
  const gis = o.gis.slice().sort((a, b) => a - b);
  const data = gis.map((g) => ({ g, v: aggRow(T.filter((t) => t.gi === g), R.filter((r) => r.gi === g), o), of: !o.dept && off[g] && off[g].grad ? off[g].emp / off[g].grad : null }));
  return `<div class="bars" style="height:${H + 40}px" role="img" aria-label="기수별 취업률">${data.map((d) => `<div class="b"><div class="lab">${pct(d.v.rate)}</div><div class="bar" style="height:${Math.round(d.v.rate * H)}px">${d.of != null ? `<div class="off" style="bottom:${Math.round(d.of * H)}px"></div>` : ''}</div></div>`).join('')}</div>
    <div class="bx">${data.map((d) => `<div>${d.g}기${d.of != null ? `<br>공식 ${pct(d.of)}` : ''}</div>`).join('')}</div>`;
}
function distBars(run, field, list, title) {
  const R = run.R, tot = R.length || 1;
  const items = list.map((x) => [x, R.filter((r) => (r[field] || '(미분류)') === x).length]).concat([['(미분류)', R.filter((r) => !r[field]).length]]).filter((x) => x[1]);
  const max = Math.max(1, ...items.map((x) => x[1]));
  return `<section class="card"><h3>${esc(title)} <span class="small muted" style="font-weight:400">${run.o.unit === 'record' ? '취업 기록' : '취업자'} ${R.length}</span></h3>
    <div class="hbars">${items.map(([l, n]) => `<button class="hb" data-act="drill" data-d='${esc(JSON.stringify({ f: field, v: l }))}'><span class="hl">${esc(l)}</span><span class="ht"><span class="hf" style="width:${(n / max) * 100}%"></span></span><span class="hn">${n} <small>${pct(n / tot)}</small></span></button>`).join('')}</div></section>`;
}
function compTable(run) {
  const { R, o } = run, gis = o.gis.slice().sort((a, b) => a - b), q = norm(o.cq || '');
  const by = {}; for (const r of R) { const k = r.company || '(업체 미기재)'; (by[k] = by[k] || []).push(r); }
  const PARTS = ['공공', '대기업', '중견·중소', '해외·기타'];
  let names = Object.keys(by); if (q) names = names.filter((n) => norm(n).includes(q) || ((compInfo(n) || {}).alias || []).some((a) => norm(a).includes(q)));
  const partOf = (n) => (by[n][0].part || '해외·기타');
  const w = [260, 74].concat(gis.map(() => 52)).concat([64]);
  let body = '';
  for (const p of PARTS) {
    const ns = names.filter((n) => partOf(n) === p).sort((a, b) => by[b].length - by[a].length || (a < b ? -1 : 1)); if (!ns.length) continue;
    const sub = gis.map((g) => ns.reduce((t, n) => t + by[n].filter((r) => r.gi === g).length, 0));
    body += `<tr class="part"><td colspan="2"><b>${esc(p)}</b> <span class="small">${ns.length}곳</span></td>${sub.map((x) => `<td>${x || ''}</td>`).join('')}<td><b>${sub.reduce((a, b) => a + b, 0)}</b></td></tr>`;
    body += ns.map((n) => `<tr><td class="cn" title="${esc(n)}">${esc(n)}</td><td class="small muted">${esc((compInfo(n) || {}).size || '')}</td>${gis.map((g) => { const c = by[n].filter((r) => r.gi === g).length; return `<td>${c ? cellBtn(c, { comp: n, gi: g }) : ''}</td>`; }).join('')}<td><b>${cellBtn(by[n].length, { comp: n })}</b></td></tr>`).join('');
  }
  return `<div class="fl" style="margin-bottom:10px"><label class="f" style="flex:0 1 320px"><span>업체 찾기</span><input class="in" id="soCq" data-in="soCq" type="search" value="${esc(o.cq || '')}" placeholder="이름 · 별칭"></label>
      <span class="small muted" style="align-self:center">${o.unit === 'record' ? '취업 기록마다(이직 전 포함)' : '학생 1명 = 1건(최종 취업처)'} · 부문 안에서 인원 많은 순</span></div>
    <div class="tbox" data-keep="soComp" style="max-height:calc(100vh - 300px)"><table class="t num fixed comt" style="min-width:${w.reduce((a, b) => a + b, 0)}px"><colgroup>${w.map((x) => `<col style="width:${x}px">`).join('')}</colgroup>
    <thead><tr><th>업체</th><th>규모</th>${gis.map((g) => `<th>${g}기</th>`).join('')}<th>합계</th></tr></thead><tbody>${body || `<tr><td colspan="${gis.length + 3}" class="empty">없어요</td></tr>`}</tbody></table></div>`;
}
function deptMatrix(run) {
  const { T, R, o } = run, gis = o.gis.slice().sort((a, b) => a - b);
  const cell = (t, r, d) => { const v = aggRow(t, r, o); return `${pct(v.rate)} <span class="small muted">${cellBtn(v.emp, d)}/${v.n}</span>`; };
  return `<table class="t num fixed sumt" style="min-width:${120 + DEPTS.length * 150 + 150}px"><colgroup><col style="width:120px">${DEPTS.map(() => '<col style="width:150px">').join('')}<col style="width:150px"></colgroup>
    <thead><tr><th>기수</th>${DEPTS.map((d) => `<th class="${DCLS[d]}t">${d}</th>`).join('')}<th class="g">전체</th></tr></thead><tbody>
    ${gis.map((g) => `<tr><td><b>${g}기</b></td>${DEPTS.map((d) => `<td>${cell(T.filter((t) => t.gi === g && t.dept === d), R.filter((r) => r.gi === g && r.dept === d), { gi: g, dept: d, c: 'emp' })}</td>`).join('')}<td class="g"><b>${cell(T.filter((t) => t.gi === g), R.filter((r) => r.gi === g), { gi: g, c: 'emp' })}</b></td></tr>`).join('')}
    <tr class="tot"><td><b>합계</b></td>${DEPTS.map((d) => `<td>${cell(T.filter((t) => t.dept === d), R.filter((r) => r.dept === d), { dept: d, c: 'emp' })}</td>`).join('')}<td class="g"><b>${cell(T, R, { c: 'emp' })}</b></td></tr></tbody></table>`;
}
// ---- 숫자 눌러 학생 보기 ----
function drillList(run) {
  const d = S.drill; if (!d) return '';
  const { T, R } = run; let rows = [], title = '';
  const col = SCOLS.find((c) => c.k === d.c);
  const keyOk = (x) => (d.by === '기수' ? (!d.k || x.gi === +d.k) : d.by === '학과' ? (!d.k || x.dept === d.k) : true) && (d.gi == null || x.gi === d.gi) && (!d.dept || x.dept === d.dept);
  if (d.comp) { rows = R.filter((r) => (r.company || '(업체 미기재)') === d.comp && (d.gi == null || r.gi === d.gi)); title = `${d.comp}${d.gi ? ' · ' + d.gi + '기' : ''}`; }
  else if (d.f) { rows = R.filter((r) => (r[d.f] || '(미분류)') === d.v); title = `${{ part: '부문', type: '유형', industry: '업종' }[d.f]} ‘${d.v}’`; }
  else if (col && col.R) { rows = R.filter((r) => keyOk(r) && col.R(r)); }
  else if (col) { rows = T.filter((t) => keyOk(t) && col.T(t)); }
  if (!title) title = `${d.by === '기수' && d.k ? d.k + '기 · ' : d.by === '학과' && d.k ? d.k + ' · ' : d.gi ? d.gi + '기 · ' : ''}${d.dept ? d.dept + ' · ' : ''}${col ? col.l : ''}`;
  const tmap = new Map(T.map((t) => [t.sid, t]));
  rows = rows.slice().sort((a, b) => stuCmp(stu(a.sid), stu(b.sid)));
  return `<section class="card raised drill" id="drill"><div class="fl" style="justify-content:space-between"><h2>${esc(title)} <span class="small muted" style="font-weight:400">${rows.length}명</span></h2><button class="btn sm" data-act="drillClose">닫기</button></div>
    <div class="tbox" style="margin-top:8px;max-height:360px"><table class="t fixed"><colgroup><col style="width:70px"><col style="width:90px"><col style="width:60px"><col style="width:110px"><col style="width:130px"><col></colgroup>
    <thead><tr><th>기수</th><th>학과</th><th>반·번호</th><th>이름</th><th>진로</th><th>진로처</th></tr></thead><tbody>
    ${rows.map((x) => { const s = stu(x.sid), t = tmap.get(x.sid) || {}; return `<tr class="click" data-act="toStu" data-id="${esc(x.sid)}"><td>${s.gi}기</td><td>${deptTag(s.dept)}</td><td>${s.cls}-${s.no}</td><td><b>${esc(s.name)}</b></td><td>${esc(t.path === '취업' && t.detail && t.detail !== '취업' ? `취업(${t.detail})` : t.path || '')}</td><td class="cn">${esc(x.company || t.company || '')}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">없어요</td></tr>'}
    </tbody></table></div><p class="small muted" style="margin:6px 0 0">줄을 누르면 학생 카드로 가요</p></section>`;
}
ACT.drill = (el) => { S.drill = JSON.parse(el.dataset.d); render(); setTimeout(() => { const d = $('#drill'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 30); };
ACT.drillClose = () => { S.drill = null; render(); };
ACT.toStu = (el) => { const s = stu(el.dataset.id); S.view = 'students'; S.st.gi = s.gi; S.st.grp = ''; S.st.q = ''; S.st.sel = s.id; S.st.form = null; window.scrollTo(0, 0); render(); };

// ---- 옵션 ----
function optPanel(o) {
  const gis = [...new Set(S.db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const r = (k, v, l) => `<label class="ro"><input type="radio" name="so_${k}" data-in="soR" data-k="${k}" value="${v}" ${String(o[k]) === String(v) ? 'checked' : ''}><span>${l}</span></label>`;
  const c = (k, l, hint) => `<label class="ro"><input type="checkbox" data-in="soC" data-k="${k}" ${o[k] ? 'checked' : ''}><span>${l}${hint ? `<span class="hint">${hint}</span>` : ''}</span></label>`;
  return `<aside class="opt" aria-label="통계 옵션"><div class="fl" style="justify-content:space-between;align-items:center"><h2>통계 옵션</h2><div class="fl" style="gap:4px"><button class="btn sm" data-act="soReset" title="저장된 기본 통계 옵션으로 되돌려요">기본값으로</button><button class="btn sm" data-act="soPanel" title="옵션 접기" aria-label="옵션 접기">‹</button></div></div>
    <fieldset><legend>기준일</legend>${r('baseMode', 'grad', '기수마다 졸업일')}${r('baseMode', 'today', `오늘(현재) <span class="hint">${today()}</span>`)}${r('baseMode', 'date', '날짜 지정')}
      ${o.baseMode === 'date' ? `<input class="in" type="date" data-in="soV" data-k="base" value="${esc(o.base)}" aria-label="기준일">` : ''}
      <label class="ro">인정 기간 + <input class="in" type="number" min="0" max="24" style="width:56px" data-in="soV" data-k="months" value="${esc(o.months)}" aria-label="인정 개월"> 개월</label></fieldset>
    <fieldset><legend>판단 방식</legend>${r('mode', 'any', '한 번이라도 취업 기록이 있으면 취업')}${r('mode', 'latest', '기준일 현재 마지막 기록대로')}</fieldset>
    <fieldset><legend>포함할 것</legend>${c('prac', '현장실습만 한 학생도 취업')}${c('glob', '글로벌현장학습 실습')}${c('gaup', '가업승계를 취업으로')}${c('ignoreAfter', '퇴사·입대 기록 무시', '실습·취업 뒤의 준비·입대 기록')}</fieldset>
    <details class="more" ${o.unit !== 'student' || o.denom !== 'all' ? 'open' : ''}><summary>더 보기 (업체 집계 · 분모)</summary>
    <fieldset><legend>업체·규모 집계</legend>${r('unit', 'student', '학생 1명 = 1건(최종 취업처)')}${r('unit', 'record', '취업 기록마다(이직 전 포함)')}</fieldset>
    <fieldset><legend>취업률 분모</legend>${r('denom', 'all', '졸업 대상 전체(공식과 같음)')}${r('denom', 'excl', '대상 − 진학 − 입대')}</fieldset></details>
    <fieldset><legend>기수</legend><div class="gis">${gis.map((g) => `<label class="gchip ${o.gis.includes(g) ? 'on' : ''}"><input type="checkbox" data-in="soGi" value="${g}" ${o.gis.includes(g) ? 'checked' : ''}>${g}기</label>`).join('')}</div>
      <div class="fl" style="gap:6px;margin-top:6px"><button class="btn sm" data-act="soGiAll" data-m="done">졸업 기수</button><button class="btn sm" data-act="soGiAll" data-m="all">전체</button></div></fieldset>
    <fieldset><legend>학과</legend><select class="in" data-in="soV" data-k="dept" style="width:100%">${opts(DEPTS, o.dept, '전체 학과')}</select></fieldset>
    <div class="defbox"><button class="btn sm pri" data-act="soSaveDef" ${o.baseMode !== 'grad' ? 'disabled title="기준일이 졸업일일 때만 기본값으로 저장할 수 있어요"' : ''} ${soIsDef(o) ? 'disabled' : ''}>이 옵션을 기본값으로 저장</button>
      <p class="small muted">기본값은 요약 · 학생 화면 · 인쇄에 쓰여요(데이터 파일에 저장).${o.baseMode !== 'grad' ? ' 기준일이 졸업일일 때만 저장돼요.' : ''}</p></div>
  </aside>`;
}
function soChanged() { S.drill = null; soSave(); render(); }
INP.soR = (el) => { const o = so(); o[el.dataset.k] = el.value;
  if (el.dataset.k === 'baseMode' && el.value === 'today') { o.mode = 'latest'; o.ignoreAfter = false; o.months = 0; toast('오늘 기준: 인정 기간 0개월, 판단 방식 ‘마지막 기록대로’, 퇴사·입대 무시 ‘끔’으로 바꿨어요'); }
  if (el.dataset.k === 'baseMode' && el.value === 'grad') { const d = statDef(); o.mode = d.mode; o.ignoreAfter = d.ignoreAfter; o.months = d.months; }
  soChanged(); };
const DEF_OPT_KEYS = ['months', 'mode', 'prac', 'glob', 'gaup', 'ignoreAfter', 'unit', 'denom'];
function soIsDef(o) { const d = statDef(); return o.baseMode === 'grad' && DEF_OPT_KEYS.every((k) => String(d[k]) === String(o[k])); }
ACT.soSaveDef = () => { const o = so(); if (o.baseMode !== 'grad') return;
  ask('기본 통계 옵션 저장', `<p>지금 옵션을 기본값으로 저장할까요?<br><b>${esc(optShort(o))}</b><br><span class="small muted">요약·학생 화면·인쇄 숫자가 이 기준으로 바뀌어요.</span></p>`, '저장', () => {
    const d = {}; for (const k of DEF_OPT_KEYS) d[k] = k === 'months' ? +o[k] || 0 : o[k];
    S.db.settings.statDefault = d; statCache = {}; changed(`기본 통계 옵션 저장: ${optShort(o)}`); render(); toast('기본값으로 저장했어요'); }); };
INP.soC = (el) => { so()[el.dataset.k] = el.checked; soChanged(); };
INP.soV = (el) => { so()[el.dataset.k] = el.type === 'number' ? Math.max(0, +el.value || 0) : el.value; soChanged(); };
INP.soGi = (el) => { const o = so(), g = +el.value; o.gis = el.checked ? [...new Set(o.gis.concat([g]))] : o.gis.filter((x) => x !== g); soChanged(); };
INP.soCq = (el) => { so().cq = el.value; render(); };
ACT.soGiAll = (el) => { const o = so(), all = [...new Set(S.db.students.map((s) => s.gi))].sort((a, b) => a - b); o.gis = el.dataset.m === 'all' ? all : soDefault().gis; soChanged(); };
ACT.soReset = () => { const t = so().tab; S.so = Object.assign(soDefault(), { tab: t }); soChanged(); };
ACT.soTab = (el) => { so().tab = el.dataset.t; S.drill = null; soSave(); render(); };
function optText(o) {
  return [`기준일 ${o.baseMode === 'date' ? o.base : o.baseMode === 'today' ? `오늘(${today()})` : '기수마다 졸업일'} + ${o.months}개월`, o.mode === 'any' ? '한 번이라도 취업' : '기준일 현재 상태',
    o.prac ? '현장실습만 포함' : '현장실습만 제외', o.glob ? '글로벌 포함' : '글로벌 제외', o.gaup ? '가업승계=취업' : '가업승계≠취업', o.ignoreAfter ? '퇴사·입대 무시' : '퇴사·입대 반영',
o.unit === 'record' ? '업체: 기록마다' : '업체: 학생 1명=1건', o.denom === 'excl' ? '분모: 대상−진학−입대' : '분모: 대상 전체', o.dept || ''].filter(Boolean).join(' · ');
}

// ---- 화면 ----
VIEWS.stats = () => {
  const o = so();
  if (!o.gis.length) return `<div class="statw">${optPanel(o)}<main class="sm"><div class="head"><h1>통계</h1></div><div class="empty card">기수를 하나 이상 골라 주세요</div></main></div>`;
  const run = statRun(), gis = o.gis.slice().sort((a, b) => a - b);
  const TABS = [['gi', '기수별'], ['dept', '학과별'], ['comp', '업체별']];
  const d0 = soDefault(); const dflt = ['baseMode', 'months', 'mode', 'prac', 'glob', 'gaup', 'ignoreAfter', 'unit', 'denom', 'dept'].every((k) => String(d0[k]) === String(o[k])) && d0.gis.join() === gis.join();
  let body = '';
  if (o.tab === 'gi') {
    body = `<div class="tbox">${groupTable(gis, '기수', (x) => x.gi, run, true)}</div>
      <div class="row" style="margin-top:16px"><section class="card" style="flex:2 1 480px;min-width:0"><div class="fl" style="justify-content:space-between"><h3>기수별 취업률</h3><div class="legend"><span><i></i>원장(이 옵션)</span>${o.dept ? '' : '<span><i class="o"></i>산학부 공식</span>'}</div></div><div style="margin-top:10px">${rateBars(run)}</div></section>
        <div style="flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:16px">${distBars(run, 'part', ['공공', '대기업', '중견·중소', '해외·기타'], '취업처 규모')}</div></div>
      <div class="grid g2" style="margin-top:16px">${distBars(run, 'type', TYPES, '유형')}${distBars(run, 'industry', INDS, '업종')}</div>`;
  } else if (o.tab === 'dept') {
    body = `<div class="tbox">${groupTable(o.dept ? [o.dept] : DEPTS, '학과', (x) => x.dept, run, false)}</div>
      <h3 style="margin:18px 0 8px">기수 × 학과 취업률 <span class="small muted" style="font-weight:400">취업률 · 취업/대상</span></h3><div class="tbox">${deptMatrix(run)}</div>`;
  } else body = compTable(run);
  return `<div class="statw">${S.soHide ? '' : optPanel(o)}<main class="sm">
    <div class="head" style="margin-bottom:12px"><div><h1>통계</h1><p class="muted small" title="${esc(optText(o))}">${dflt ? '<span class="chip ok">기본값</span> ' : '<span class="chip">바꾼 옵션</span> '}${esc(optShort(o))}</p></div>${S.soHide ? '<button class="btn" data-act="soPanel">옵션 펼치기</button>' : ''}</div>
    <div class="fl" role="tablist" style="margin-bottom:14px">${TABS.map(([k, l]) => `<button class="btn ${o.tab === k ? 'pri' : ''}" role="tab" aria-selected="${o.tab === k}" data-act="soTab" data-t="${k}">${l}</button>`).join('')}
      <span class="small muted" style="align-self:center;margin-left:8px">${gis.length > 1 ? `${gis[0]}~${gis[gis.length - 1]}기` : gis[0] + '기'} · 숫자를 누르면 학생 명단</span><button class="btn" style="margin-left:auto" data-act="soExcel">엑셀로 저장</button></div>
    ${body}${drillList(run)}</main></div>`;
};

// ---- 엑셀 ----
ACT.soExcel = () => {
  const o = so(), run = statRun(), gis = o.gis.slice().sort((a, b) => a - b), wb = XLSX.utils.book_new();
  const head = [o.tab === 'dept' ? '학과' : '기수'].concat(SCOLS.map((c) => c.l), ['취업률']);
  const rowsOf = (keys, keyOf, lab) => keys.map((k) => { const v = aggRow(run.T.filter((t) => keyOf(t) === k), run.R.filter((r) => keyOf(r) === k), o); return [lab(k)].concat(SCOLS.map((c) => v[c.k]), [Math.round(v.rate * 1000) / 10]); })
    .concat([(() => { const v = aggRow(run.T, run.R, o); return ['합계'].concat(SCOLS.map((c) => v[c.k]), [Math.round(v.rate * 1000) / 10]); })()]);
  const add = (name, aoa) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = aoa[0].map((h, i) => ({ wch: i === 0 ? 30 : 11 })); XLSX.utils.book_append_sheet(wb, ws, name); };
  add('기수별', [head.concat(['공식(%)'])].concat(rowsOf(gis, (x) => x.gi, (g) => g + '기').map((r, i) => r.concat([i < gis.length && !o.dept && (S.db.settings.official[gis[i]] || {}).grad ? Math.round(S.db.settings.official[gis[i]].emp / S.db.settings.official[gis[i]].grad * 1000) / 10 : '']))));
  add('학과별', [['학과'].concat(head.slice(1))].concat(rowsOf(o.dept ? [o.dept] : DEPTS, (x) => x.dept, (d) => d)));
  const by = {}; for (const r of run.R) { const k = r.company || '(업체 미기재)'; (by[k] = by[k] || []).push(r); }
  const comp = Object.keys(by).sort((a, b) => ['공공', '대기업', '중견·중소', '해외·기타'].indexOf(by[a][0].part || '해외·기타') - ['공공', '대기업', '중견·중소', '해외·기타'].indexOf(by[b][0].part || '해외·기타') || by[b].length - by[a].length)
    .map((n) => [n, by[n][0].part || '해외·기타', (compInfo(n) || {}).size || ''].concat(gis.map((g) => by[n].filter((r) => r.gi === g).length || ''), [by[n].length]));
  add('업체별', [['업체', '부문', '규모'].concat(gis.map((g) => g + '기'), ['합계'])].concat(comp));
  add('명단', [['기수', '학과', '반', '번호', '이름', '진로', '세부', '진로처', '규모', '유형', '업종']].concat(run.T.slice().sort((a, b) => stuCmp(stu(a.sid), stu(b.sid))).map((t) => { const s = stu(t.sid); return [s.gi, s.dept, s.cls, s.no, s.name, t.path, t.detail, t.company, t.size, t.type, t.industry]; })));
  add('옵션', [['통계 옵션'], [optText(o)], ['기수', gis.join(', ')], ['만든 날', nowIso().replace('T', ' ')]]);
  XLSX.writeFile(wb, `취업통계_${today().replace(/-/g, '').slice(2)}.xlsx`);
};

ACT.soPanel = () => { S.soHide = !S.soHide; render(); };

