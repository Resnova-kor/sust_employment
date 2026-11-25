// ===== 틀 · 메뉴 · 요약 =====
const MENU = [['summary', '요약'], ['stats', '통계'], ['ledger', '전체 기록'], ['students', '학생'], ['companies', '업체'], ['print', '인쇄·엑셀'], ['settings', '관리']];
const VIEWS = {};
function render() {
  const app = $('#app');
  if (!S.db) { app.innerHTML = welcome(); return; }
  // 스크롤·포커스 지키기
  const ae = document.activeElement, fid = ae && ae.id, cs = ae && ae.selectionStart;
  const scr = {}; document.querySelectorAll('[data-keep]').forEach((el) => (scr[el.dataset.keep] = el.scrollTop)); const wy = window.scrollY;
  const html = `<nav class="side" aria-label="메뉴">
      <div class="brand2"><img src="${LOGO_E}" alt="서울도시과학기술고등학교 교표"><div class="bt"><small>서울도시과학기술고</small><b>취업 통계</b></div></div>
      ${(() => { const nb = checkCount(); return MENU.map(([k, l]) => `<button class="m ${S.view === k ? 'on' : ''}" data-act="go" data-v="${k}">${l}${k === 'settings' && nb ? `<span class="badge" title="확인할 것 ${nb}가지">${nb}</span>` : ''}</button>`).join(''); })()}
      <div class="side-foot" id="foot"></div></nav>
    <main class="view ${!(S.handle && S.perm) ? 'hasbar' : ''}" id="main">${!(S.handle && S.perm) ? `<div class="connbar noprint">${S.handle ? `데이터 파일(${esc(S.fileName)})과 연결이 끊겨 <b>브라우저에만</b> 저장되고 있어요. <button class="btn sm" data-act="reconnect">다시 연결</button>` : `데이터 파일이 연결되지 않아 <b>브라우저에만</b> 저장되고 있어요. <button class="btn sm" data-act="openFile">데이터 파일 열기</button> <button class="btn sm" data-act="saveAs">새 데이터 파일 만들기</button>`}</div>` : ''}${(VIEWS[S.view] || VIEWS.summary)()}</main>`;
  morphInto(app, html);
  renderFoot();
  document.querySelectorAll('[data-keep]').forEach((el) => { if (scr[el.dataset.keep] != null) el.scrollTop = scr[el.dataset.keep]; });
  window.scrollTo(0, wy);
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) { el.focus(); try { if (cs != null) el.setSelectionRange(cs, cs); } catch (e) { /* */ } } }
}
// 바뀐 부분만 고치기: 입력 중인 칸(한글 조합 포함)을 새로 만들지 않아요
function morphInto(root, html) {
  const box = document.createElement('div'); box.innerHTML = html;
  morphKids(root, box);
}
function morphKids(a, b) {
  const ac = [...a.childNodes], bc = [...b.childNodes];
  for (let i = 0; i < bc.length; i++) { if (i < ac.length) morphNode(ac[i], bc[i]); else a.appendChild(bc[i]); }
  for (let i = bc.length; i < ac.length; i++) ac[i].remove();
}
function morphNode(a, b) {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName || (a.nodeType === 1 && ((a.id || '') !== (b.id || '') || (a.tagName === 'INPUT' && (a.type !== b.type || a.name !== b.name))))) { a.replaceWith(b); return; }
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  const tg = a.tagName;
  if (tg === 'INPUT') { if (a.type === 'checkbox' || a.type === 'radio') a.checked = b.checked; else if (a !== document.activeElement && a.value !== b.value) a.value = b.value; return; }
  if (tg === 'TEXTAREA') { if (a !== document.activeElement && a.value !== b.value) a.value = b.value; return; }
  morphKids(a, b);
  if (tg === 'SELECT' && a.value !== b.value) a.value = b.value;
}
function renderFoot() {
  const f = $('#foot'); if (!f || !S.db) return;
  const t = (S.savedAt || S.db.savedAt || '').slice(5, 16).replace('T', ' ');
  if (S.handle && S.perm) f.innerHTML = `데이터 파일<br><b>${esc(S.fileName)}</b><br>${S.dirty ? '저장 중…' : `자동 저장됨 ${esc(t)}`}`;
  else if (S.handle) f.innerHTML = `데이터 파일 <b>${esc(S.fileName)}</b><br><span style="color:#ffcb07">연결이 끊겼어요</span><br><button data-act="reconnect">다시 연결</button>`;
  else f.innerHTML = `<span style="color:#ffcb07">데이터 파일 연결 안 됨</span><br>브라우저에만 저장 ${esc(t)}<br><button data-act="saveAs">데이터 파일 만들기</button>`;
}
function welcome() {
  return `<div class="welcome">
    <img class="wlogo" src="${LOGO_L}" alt="서울도시과학기술고등학교"><h1 style="text-align:center;font-size:26px">현장실습·취업 통계 <span class="small muted" style="font-weight:400">${APP_VERSION}</span></h1>
    <div class="card raised"><h2>데이터 파일 열기</h2>
      <p>'취업통계_데이터.json' 파일을 열면 시작해요. 연결한 파일에는 고칠 때마다 자동으로 저장돼요.</p>
      <button class="btn pri" data-act="openFile">데이터 파일 열기</button>
      ${FS_OK ? '' : '<p class="small warn">이 브라우저는 파일 자동 저장을 지원하지 않아요. 크롬이나 엣지에서 열어 주세요(지금은 브라우저에만 저장).</p>'}
    </div></div>`;
}
ACT.go = (el) => { let v = el.dataset.v; if (v === 'upload') { v = 'settings'; S.mg = 'up'; } if (el.dataset.tab) S.mg = el.dataset.tab; S.view = v; S.msOpen = null; window.scrollTo(0, 0); render(); };
ACT.openFile = () => openDataFile();
ACT.saveAs = () => saveAsFile();
ACT.reconnect = () => reconnect();


// ---- 요약 ----
const FIELDS = [['공공', '#2a78d6'], ['건설·EPC', '#eb6834'], ['엔지니어링·설계', '#1baf7a'], ['제조', '#eda100'], ['전기·에너지', '#6250d6'], ['검사·안전·환경', '#e87ba4'], ['기타', '#b4b1c6']];
const PARTS = [['공공', '#2a78d6'], ['대기업', '#eb6834'], ['중견·중소', '#1baf7a'], ['해외·기타', '#b4b1c6']];
function fieldOf(t) { if (t.part === '공공') return '공공'; return FIELDS.some((f) => f[0] === t.industry) ? t.industry : '기타'; }
VIEWS.summary = () => {
  const db = S.db, gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const done = gis.filter((g) => db.settings.grad[g] && db.settings.grad[g] < today());
  const res = ENG.stat(db, done, statDef()), sm = ENG.summary(res);
  const last = sm[sm.length - 1], off = db.settings.official || {};
  const by = S.sumBy === 'part' ? 'part' : 'field', CATS = by === 'part' ? PARTS : FIELDS;
  const key = (t) => (by === 'part' ? (PARTS.some((p) => p[0] === t.part) ? t.part : '해외·기타') : fieldOf(t));
  const fc = { all: {} };
  for (const t of res.T) if (t.target && t.path === '취업') { const k = key(t); (fc[t.gi] = fc[t.gi] || {})[k] = (fc[t.gi][k] || 0) + 1; fc.all[k] = (fc.all[k] || 0) + 1; }
  const tot = sm.reduce((a, r) => { for (const k of ['n', 'emp', 'conv', 'pracOnly', 'go', 'army', 'prep', 'none', 'other', 'gaup']) a[k] = (a[k] || 0) + r[k]; return a; }, { gi: 'all' });
  tot.rate = tot.n ? tot.emp / tot.n : 0;
  const offT = sm.reduce((a, r) => { const o = off[r.gi]; if (o && o.grad) { a.g += o.grad; a.e += o.emp || 0; } return a; }, { g: 0, e: 0 });
  const bar = (r, lab) => {
    const c = fc[r.gi] || {}, o = r.gi === 'all' ? (offT.g ? { grad: offT.g, emp: offT.e } : null) : off[r.gi];
    const segs = CATS.filter(([k]) => c[k]).map(([k, col]) => { const w = r.n ? (c[k] / r.n) * 100 : 0;
      return `<i style="width:${w}%;background:${col}" data-tip="${esc(`<b>${lab} · ${k}</b><br>${c[k]}명 · 취업자의 ${pct(c[k] / r.emp)}<br><span>졸업 대상 ${r.n}명 중 ${pct(c[k] / r.n)}</span>`)}">${w >= 4.5 ? c[k] : ''}</i>`; }).join('');
    const or = o && o.grad ? o.emp / o.grad : null;
    return `<div class="trk">${segs}${or != null ? `<b class="offm" style="left:${(or * 100).toFixed(1)}%" data-tip="${esc(`<b>${lab} 산학부 공식</b><br>${pct(or)} (${o.emp}/${o.grad}명)`)}"></b>` : ''}</div>`;
  };
  const row = (r, tr) => { const lab = r.gi === 'all' ? '전체' : r.gi + '기', o = r.gi === 'all' ? (offT.g ? { grad: offT.g, emp: offT.e } : null) : off[r.gi];
    return `<tr class="${tr || ''}"><td><b>${lab}</b></td>
      <td class="rt"><b>${pct(r.rate)}</b><span>${r.emp} / ${r.n}명</span></td><td class="bc">${bar(r, lab)}</td>
      <td>${r.conv}</td><td>${r.pracOnly}</td><td class="g">${r.go + r.army}</td><td>${r.prep}</td><td>${r.none}</td>
      <td class="g small ofc">${o && o.grad ? `${pct(o.emp / o.grad)}<br><span class="muted">${o.emp}/${o.grad}</span>` : '-'}</td></tr>`; };
  const sv = SUM_VIEWS.some((x) => x[0] === S.sumView) ? S.sumView : 'tbl';
  const mk = (r) => ({ ...r, lab: r.gi === 'all' ? '전체' : r.gi + '기', other: (r.other || 0) + (r.gaup || 0), f: fc[r.gi] || {}, off: r.gi === 'all' ? (offT.g ? { grad: offT.g, emp: offT.e } : null) : ((off[r.gi] || {}).grad ? off[r.gi] : null) });
  const crow = sm.map(mk), crowT = sm.length > 1 ? [mk(tot)] : [];
  const scale = `<div class="scl">${[0, 25, 50, 75, 100].map((v) => `<span style="left:${v}%">${v}%</span>`).join('')}</div>`;
  return `<div class="head"><div><h1>요약</h1></div></div>
  <div class="grid g4">
    <div class="card raised sh kpi"><div class="kt">전체 취업률 <span class="small muted" style="font-weight:400">${done.length ? `${done[0]}~${done[done.length - 1]}기` : ''}</span></div><div class="v num" style="color:var(--primary)">${pct(tot.rate).replace('%', '<small>%</small>')} <small>${tot.emp} / ${tot.n}명</small></div></div>
    <div class="card raised sh kpi"><div class="kt">졸업생 수 <span class="small muted" style="font-weight:400">${done.length ? `${done[0]}~${done[done.length - 1]}기` : ''}</span></div><div class="v num">${tot.n.toLocaleString()}<small> 명</small> <small>재학 ${db.students.filter((x) => !done.includes(x.gi)).length}명</small></div></div>
    <div class="card raised sh kpi"><div class="kt">실습·취업·진로 기록</div><div class="v num">${db.records.length.toLocaleString()}<small> 건</small></div></div>
    <div class="card raised sh kpi"><div class="kt">등록 업체</div><div class="v num">${db.companies.length}<small> 곳</small></div></div>
  </div>
  <section class="card" style="margin-top:20px"><div class="fl" style="justify-content:space-between;align-items:center;gap:12px">
      <div class="fl" style="align-items:center;gap:14px"><h2>기수별 취업률</h2><a href="#" class="small" data-act="go" data-v="stats">통계에서 자세히 ›</a></div>
      <div class="fl" style="gap:12px;align-items:center">
        <div class="seg2" role="tablist" aria-label="그래프 모양">${SUM_VIEWS.map(([k, l]) => `<button class="${sv === k ? 'on' : ''}" role="tab" aria-selected="${sv === k}" data-act="sumView" data-v="${k}">${l}</button>`).join('')}</div>
        <div class="seg2" role="tablist" aria-label="색으로 나누는 기준"><button class="${by === 'field' ? 'on' : ''}" role="tab" aria-selected="${by === 'field'}" data-act="sumBy" data-b="field">분야별</button><button class="${by === 'part' ? 'on' : ''}" role="tab" aria-selected="${by === 'part'}" data-act="sumBy" data-b="part">규모별</button></div></div></div>
    <div class="legend sl">${CATS.map(([k, col]) => `<span><i style="background:${col}"></i>${k} <b>${fc.all[k] || 0}</b></span>`).join('')}<span><i class="o"></i>산학부 공식</span></div>
    ${sv === 'tbl' ? `<div class="tbox" style="margin-top:8px"><table class="t num fixed sumg"><colgroup><col style="width:64px"><col style="width:112px"><col><col style="width:70px"><col style="width:58px"><col style="width:72px"><col style="width:52px"><col style="width:72px"><col style="width:76px"></colgroup>
      <thead><tr><th>기수</th><th>취업률</th><th class="bc">${scale}</th><th>채용전환</th><th>실습만</th><th class="g">진학·입대</th><th>준비</th><th>기록 없음</th><th class="g">산학부<br>공식</th></tr></thead>
      <tbody>${sm.map((r) => row(r)).join('')}${sm.length > 1 ? row(tot, 'tot') : ''}</tbody></table></div>
    <p class="small muted" style="margin:8px 0 0">막대 길이 = 취업률(졸업 대상 대비), 색 = 최종 취업처의 ${by === 'part' ? '규모' : '분야'} · 막대에 마우스를 올리면 숫자가 보여요</p>`
    : `<div class="schart" style="margin-top:6px">${({ A: () => sumChartA(crow, CATS), B: () => sumChartB(crow, CATS, by), C: () => sumChartC(crow.concat(crowT), CATS), D: () => sumChartD(crow.concat(crowT), CATS) })[sv]()}</div>`}
  </section>`;
};
ACT.sumBy = (el) => { S.sumBy = el.dataset.b; render(); };
// 확인할 것(관리 화면 · 메뉴 배지)
const chkKey = (x) => (x.sid ? x.id : x.name);
function checkItems(all) {
  const db = S.db, gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b), seen = (!all && db.settings.chkSeen) || {};
  const f = (k, arr) => (seen[k] ? arr.filter((x) => !seen[k].includes(chkKey(x))) : arr);
  return { nosize: f('nosize', db.companies.filter((c) => !c.size)), dup: f('dup', specialRecs('dup')), nodate: f('nodate', specialRecs('nodate')), nocomp: f('nocomp', specialRecs('nocomp')),
    cur: gis.filter((g) => !(db.settings.grad[g] && db.settings.grad[g] < today())) };
}
function checkCount() { if (!S.db) return 0; const c = checkItems(); return ['nosize', 'dup', 'nodate', 'nocomp'].filter((k) => c[k].length).length; }
// 말풍선
(function () {
  let tip = null;
  const get = () => { if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); } return tip; };
  document.addEventListener('mouseover', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); const t = get(); if (!el) { t.style.display = 'none'; return; } t.innerHTML = el.dataset.tip; t.style.display = 'block'; });
  document.addEventListener('mousemove', (e) => { if (!tip || tip.style.display !== 'block') return; const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 16; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 12; tip.style.left = x + 'px'; tip.style.top = y + 'px'; });
})();
ACT.goComp = (el) => { S.view = 'companies'; S.cp.blank = el.dataset.f === 'nosize'; S.cp.size = []; S.cp.type = []; S.cp.ind = []; S.cp.q = ''; S.cp.sel = ''; S.msOpen = null; render(); };
ACT.goLedger = (el) => { S.view = 'ledger'; S.lg = lgInit(); S.lg.special = el.dataset.f; S.msOpen = null; render(); };
ACT.goGi = (el) => { S.view = 'students'; S.st.gi = +el.dataset.gi; S.st.grp = ''; S.st.sel = ''; render(); };

function specialRecs(k) {
  const db = S.db;
  if (k === 'nocomp') return db.records.filter((r) => r.company && !db._cm.has(r.company) && r.kind !== '진학');
  if (k === 'nodate') return db.records.filter((r) => !r.start && !r.emp && !r.est && !r.end);
  if (k === 'dup') { const seen = {}, out = []; for (const r of db.records) { if (!r.company) continue; const key = r.sid + '|' + r.kind + '|' + r.company; (seen[key] = seen[key] || []).push(r); } for (const v of Object.values(seen)) if (v.length > 1) out.push(...v); return out; }
  return [];
}
const SPECIAL_L = { nocomp: '목록에 없는 업체명', dup: '겹치는 기록', nodate: '날짜 없는 기록' };

// 여러 개 고르는 거르기(체크 목록)
function msel(g, k, label, list) {
  const cur = (S[g][k] || []).map(String), key = g + '.' + k, open = S.msOpen === key;
  const names = list.filter(([v]) => cur.includes(String(v))).map((x) => x[1]);
  const txt = !cur.length ? '전체' : (names.length <= 2 ? names.join(', ') : `${names[0]} 외 ${names.length - 1}`);
  return `<div class="f ms"><span>${label}</span><button type="button" id="msb_${g}_${k}" class="in msb ${cur.length ? 'on' : ''}" data-act="msTog" data-k="${key}" aria-haspopup="true" aria-expanded="${open}">${esc(txt)}</button>
    ${open ? `<div class="msp" role="group" aria-label="${esc(label)}">${list.map(([v, l]) => `<label><input type="checkbox" id="ms_${g}_${k}_${esc(String(v).replace(/[^\w가-힣]/g, '_'))}" data-in="msF" data-g="${g}" data-k="${k}" value="${esc(v)}" ${cur.includes(String(v)) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}
      <div class="msa"><button type="button" class="btn sm" data-act="msClr" data-g="${g}" data-k="${k}" ${cur.length ? '' : 'disabled'}>모두 해제</button><button type="button" class="btn sm pri" data-act="msTog" data-k="">닫기</button></div></div>` : ''}</div>`;
}
ACT.msTog = (el) => { S.msOpen = S.msOpen === el.dataset.k ? null : (el.dataset.k || null); render(); };
ACT.msClr = (el) => { S[el.dataset.g][el.dataset.k] = []; render(); };
INP.msF = (el) => { const a = (S[el.dataset.g][el.dataset.k] || []).map(String).filter((v) => v !== el.value); if (el.checked) a.push(el.value); S[el.dataset.g][el.dataset.k] = a; render(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.msOpen) { S.msOpen = null; render(); } });

