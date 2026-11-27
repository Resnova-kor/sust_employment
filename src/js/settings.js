// ===== 설정 · 시작 =====
S.snaps = [];
async function loadSnaps() { try { S.snaps = (await IDB.keys()).filter((k) => String(k).startsWith('snap:')).sort().reverse(); } catch (e) { S.snaps = []; } }
const MG_TABS = [['up', '자료 올리기'], ['opt', '통계 기준'], ['chk', '확인할 것'], ['log', '바뀐 기록'], ['file', '데이터 파일·백업']];
VIEWS.settings = () => {
  const t = MG_TABS.some((x) => x[0] === S.mg) ? S.mg : 'up', nb = checkCount();
  const bar = `<div class="tabs" role="tablist" aria-label="관리">${MG_TABS.map(([k, l]) => `<button class="tab ${t === k ? 'on' : ''}" role="tab" aria-selected="${t === k}" data-act="mgTab" data-t="${k}">${l}${k === 'chk' && nb ? `<span class="badge">${nb}</span>` : ''}</button>`).join('')}</div>`;
  const body = ({ up: () => VIEWS.upload(), opt: mgOpt, chk: mgChk, log: mgLog, file: mgFile })[t]();
  return `<div class="head"><div><h1>관리</h1></div><p class="small muted" style="margin:0">취업 통계 ${APP_VERSION}</p></div>${bar}<div class="tabbody">${body}</div>`;
};
function mgOpt() {
  const db = S.db, st = db.settings, gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const d = statDef(); const rr0 = (k, v, l) => `<label class="ro"><input type="radio" name="df_${k}" data-in="defR" data-k="${k}" value="${v}" ${String(d[k]) === String(v) ? 'checked' : ''}><span>${l}</span></label>`;
  const cc = (k, l) => `<label class="ro"><input type="checkbox" data-in="defC" data-k="${k}" ${d[k] ? 'checked' : ''}><span>${l}</span></label>`;
  return `<div class="grid" style="gap:16px">
    <section class="card"><div class="fl" style="justify-content:space-between;align-items:center"><h2>기본 통계 옵션</h2><div class="fl" style="gap:6px"><button class="btn sm" data-act="defReset">처음 값으로</button><button class="btn sm pri" data-act="go" data-v="stats">통계 화면에서 바꾸기</button></div></div>
      <p style="margin:8px 0 4px"><b>${esc(optShort(Object.assign({ baseMode: 'grad', dept: '' }, d)))}</b></p>
      <p class="small muted">${esc(optText(Object.assign({ baseMode: 'grad', dept: '' }, d)))}</p>
      <p class="small muted">요약 · 학생 화면의 졸업 기준 통계 · 인쇄가 이 값을 써요. 바꾸려면 통계 화면에서 옵션을 고른 뒤 ‘이 옵션을 기본값으로 저장’을 누르세요.</p></section>
    <section class="card"><h2>기수별 졸업일</h2><p class="small muted">통계 기준일이에요. 날짜 없는 학교 자료 기록도 이 날짜로 봐요(월말).</p>
      <div class="grid" style="gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${gis.map((g) => `<label class="f"><span>${g}기</span><input class="in" type="date" data-in="setGrad" data-g="${g}" value="${esc(st.grad[g] || '')}"></label>`).join('')}</div></section>
    <section class="card"><h2>산학부 공식 숫자</h2><p class="small muted">${esc(st.officialSource || '')} — 요약·통계 화면 비교용</p>
      <div class="tbox"><table class="t num"><thead><tr><th>기수</th><th>졸업</th><th>취업</th><th>공공</th><th>대기업</th><th>중소·중견</th><th>진학·입대·가업</th></tr></thead><tbody>
      ${gis.map((g) => { const o = st.official[g] || {}; return `<tr><td>${g}기</td>${['grad', 'emp', 'pub', 'big', 'sme', 'other'].map((k) => `<td><input class="in" style="width:72px;padding:4px 6px" type="text" inputmode="numeric" maxlength="4" data-num data-in="setOff" data-g="${g}" data-k="${k}" value="${o[k] ?? ''}" aria-label="${g}기 ${k}"></td>`).join('')}</tr>`; }).join('')}
      </tbody></table></div></section></div>`;
}
function mgChk() {
  const db = S.db, c = checkItems(), all = checkItems(true), hid = (k) => all[k].length - c[k].length;
  const li = (txt, n, btn, k) => `<li><span>${txt}${hid(k) ? ` <span class="small muted">(확인함 ${hid(k)})</span>` : ''}</span><span class="fl" style="gap:6px;align-items:center">${n ? btn + `<button class="btn sm" data-act="chkHide" data-k="${k}" title="지금 있는 것은 확인했어요. 새로 생기면 다시 세요">확인함</button>` : '<span class="nil">없음</span>'}${hid(k) ? `<button class="btn sm" data-act="chkShow" data-k="${k}">다시 보기</button>` : ''}</span></li>`;
  return `<section class="card raised" style="max-width:760px"><h2 style="margin-bottom:10px">확인할 것</h2><ul class="list-plain chk">
    ${li('규모가 빈 업체', c.nosize.length, `<button class="btn sm" data-act="goComp" data-f="nosize">${c.nosize.length}곳</button>`, 'nosize')}
    ${li('같은 학생·업체·구분이 겹치는 기록', c.dup.length, `<button class="btn sm" data-act="goLedger" data-f="dup">${c.dup.length}건</button>`, 'dup')}
    ${li('날짜가 하나도 없는 기록', c.nodate.length, `<button class="btn sm" data-act="goLedger" data-f="nodate">${c.nodate.length}건</button>`, 'nodate')}
    ${li('업체 목록에 없는 업체명 기록', c.nocomp.length, `<button class="btn sm" data-act="goLedger" data-f="nocomp">${c.nocomp.length}건</button>`, 'nocomp')}
    ${c.cur.map((g) => `<li><span>${g}기 진행 중 (${esc(db.settings.grad[g] || '')} 졸업 예정)</span><button class="btn sm" data-act="goGi" data-gi="${g}">학생 ${db.students.filter((s) => s.gi === g).length}명</button></li>`).join('')}
  </ul><p class="small muted" style="margin:10px 0 0">버튼을 누르면 해당 기록이나 업체만 걸러서 보여 줘요. 고칠 필요가 없으면 ‘확인함’을 누르세요. 새로 생긴 것만 다시 세요. 진행 중 기수는 안내용이라 메뉴 숫자에는 세지 않아요.</p></section>`;
}
function mgLog() {
  const db = S.db, q = (S.mgq || '').trim();
  const L = q ? db.log.filter((l) => l.msg.includes(q) || l.t.includes(q)) : db.log;
  return `<section class="card"><div class="fl" style="justify-content:space-between;align-items:flex-end"><h2>바뀐 기록 <span class="small muted" style="font-weight:400">${L.length}건</span></h2>
      <label class="f" style="flex:0 1 300px"><span>찾기</span><input class="in" id="mgQ" data-in="mgQ" type="search" value="${esc(S.mgq || '')}" placeholder="이름 · 업체 · 날짜"></label></div>
    <div class="tbox" data-keep="logBox" style="max-height:calc(100vh - 260px);margin-top:10px"><table class="t fixed"><colgroup><col style="width:160px"><col></colgroup><thead><tr><th>시각</th><th class="wrap">내용</th></tr></thead><tbody>${L.slice(0, 1000).map((l) => `<tr><td class="muted small">${esc(l.t.slice(0, 16).replace('T', ' '))}</td><td class="wrap" style="text-align:left">${esc(l.msg)}</td></tr>`).join('') || '<tr><td colspan="2" class="empty">없어요</td></tr>'}</tbody></table></div></section>`;
}
function mgFile() {
  const conn = S.handle ? (S.perm ? `<span class="ok">연결됨</span> · ${esc(S.fileName)}` : `<span class="warn">연결 끊김</span> · ${esc(S.fileName)}`) : '<span class="warn">연결 안 됨</span> (브라우저에만 저장 중)';
  return `<div class="grid g2">
    <section class="card"><h2>데이터 파일 <span class="small muted" style="font-weight:400">지금 쓰는 파일</span></h2><p>${conn}</p>
      <p class="small muted">고칠 때마다 이 파일에 자동으로 저장돼요. 프로그램을 다시 열면 ‘다시 연결’을 한 번 눌러 주세요.</p>
      <div class="fl">${S.handle && !S.perm ? '<button class="btn pri" data-act="reconnect">다시 연결</button>' : ''}<button class="btn" data-act="openFile">다른 데이터 파일 열기</button><button class="btn" data-act="saveAs" title="지금 자료를 새 파일로 저장하고 앞으로 그 파일에 저장해요">새 파일로 옮기기</button></div>
      ${FS_OK ? '' : '<p class="small warn">이 브라우저는 파일 자동 저장을 지원하지 않아요. 크롬·엣지를 쓰거나 백업 파일을 내려받아 주세요.</p>'}</section>
    <section class="card"><h2>되돌리기 <span class="small muted" style="font-weight:400">예전 상태로</span></h2>
      <h3 style="margin-top:4px">자동 보관본 <span class="small muted" style="font-weight:400">하루 1번 · 자료 올리기 전 · 14개까지 · 이 컴퓨터 브라우저에만</span></h3>
      <ul class="list-plain" style="margin-top:6px">${S.snaps.map((k) => `<li><span>${esc(k.slice(5))}</span><button class="btn sm" data-act="restoreSnap" data-k="${esc(k)}">이 때로 되돌리기</button></li>`).join('') || '<li class="muted">아직 없어요</li>'}</ul>
      <h3 style="margin-top:14px">백업 파일 <span class="small muted" style="font-weight:400">다른 곳에 따로 보관할 때</span></h3>
      <div class="fl" style="margin-top:6px"><button class="btn" data-act="exportJson">백업 파일 내려받기</button><button class="btn" data-act="importJson" title="백업 파일 내용으로 지금 자료를 바꿔요(바꾸기 전 자료는 자동으로 내려받아요)">백업 파일로 되돌리기</button></div></section></div>`;
}
ACT.chkHide = (el) => { const k = el.dataset.k, st = S.db.settings; st.chkSeen = Object.assign({}, st.chkSeen || {}); st.chkSeen[k] = [...new Set((st.chkSeen[k] || []).concat(checkItems(true)[k].map(chkKey)))]; changed(`확인할 것 '${k}' 확인함`); render(); };
ACT.chkShow = (el) => { const st = S.db.settings; st.chkSeen = Object.assign({}, st.chkSeen || {}); delete st.chkSeen[el.dataset.k]; changed(); render(); };
ACT.mgTab = async (el) => { S.mg = el.dataset.t; if (S.mg === 'file') await loadSnaps(); render(); };
INP.mgQ = (el) => { S.mgq = el.value; render(); };
const _go0 = ACT.go;
ACT.go = async (el) => { if (el.dataset.v === 'settings') await loadSnaps(); _go0(el); };
ACT.exportJson = () => downloadJson();
ACT.importJson = () => { $('#fileIn').dataset.mode = 'import'; $('#fileIn').click(); };
ACT.restoreSnap = async (el) => {
  const k = el.dataset.k;
  ask('보관본으로 되돌리기', `<p>${esc(k.slice(5))} 보관본으로 지금 자료를 바꿀까요?<br><span class="small muted">바꾸기 전 지금 자료를 백업 파일로 내려받아요.</span></p>`, '되돌리기', async () => {
    downloadJson(`취업통계_되돌리기전_${today().replace(/-/g, '')}.json`);
    const d = await IDB.get(k); S.db = checkData(d); log(`보관본 ${k.slice(5)}로 되돌림`); index(); statCache = {}; await saveNow(); render(); toast('되돌렸어요');
  }, true);
};
function defSet(k, v) { const d = (S.db.settings.statDefault = Object.assign({}, S.db.settings.statDefault || {})); d[k] = v; S.so = null; S.soSaved = null; IDB.del('statOpt').catch(() => {}); changed(`기본 통계 옵션: ${k} → ${v}`); render(); }
INP.defR = (el) => defSet(el.dataset.k, el.value);
INP.defC = (el) => defSet(el.dataset.k, el.checked);
INP.defV = (el) => defSet(el.dataset.k, Math.max(0, Math.min(24, +el.value || 0)));
ACT.defReset = () => { S.db.settings.statDefault = {}; S.so = null; S.soSaved = null; IDB.del('statOpt').catch(() => {}); changed('기본 통계 옵션을 처음 값으로'); render(); };
INP.setGrad = (el) => { S.db.settings.grad[el.dataset.g] = el.value; changed(`${el.dataset.g}기 졸업일 → ${el.value}`); };
INP.setOff = (el) => { const o = S.db.settings.official; const g = el.dataset.g; o[g] = o[g] || {}; o[g][el.dataset.k] = el.value === '' ? null : +el.value; changed(); };

// ---- 이벤트 연결 · 시작 ----
document.addEventListener('click', (e) => {
  if (S.msOpen && !e.target.closest('.ms')) { S.msOpen = null; if (!e.target.closest('[data-act]')) { render(); return; } }
  const el = e.target.closest('[data-act]'); if (!el) { return; }
  const f = ACT[el.dataset.act]; if (f) f(el, e);
});
const onIn = (e) => {
  const el = e.target.closest('[data-in]'); if (!el) return;
  const isSel = el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date';
  if ((e.type === 'change') !== isSel) return;
  // 한글 조합 중(받침 입력 전)에는 화면을 다시 그리지 않고, 조합이 끝나면 처리
  if (e.isComposing && !IME_LIVE.includes(el.dataset.in)) return;
  const f = INP[el.dataset.in]; if (f) f(el, e);
};
const IME_LIVE = ['ff', 'acComp', 'upComp'];
document.addEventListener('input', onIn); document.addEventListener('change', onIn);
document.addEventListener('compositionend', (e) => { const el = e.target.closest && e.target.closest('[data-in]'); if (!el || IME_LIVE.includes(el.dataset.in)) return; const f = INP[el.dataset.in]; if (f) f(el, e); });
async function start() {
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = '.json,application/json'; fi.id = 'fileIn'; fi.hidden = true; document.body.appendChild(fi);
  fi.onchange = () => readFileInput(fi, (d, name) => {
    if (fi.dataset.mode === 'import') { fi.dataset.mode = ''; downloadJson(`취업통계_가져오기전_${today().replace(/-/g, '')}.json`); loadDb(d, `백업 가져오기: ${name}`); toast('백업을 가져왔어요'); }
    else { S.fileName = name; loadDb(d, `데이터 파일 불러오기: ${name}`); }
  });
  try {
    const d0 = await withTimeout(IDB.get('db'), 3000), h0 = d0 === TIMEOUT ? TIMEOUT : await withTimeout(IDB.get('handle'), 3000);
    if (d0 === TIMEOUT || h0 === TIMEOUT) { S.idbStuck = true; console.warn('브라우저 저장소가 3초 넘게 대답 없음'); }
    const d = d0 === TIMEOUT ? null : d0, h = h0 === TIMEOUT ? null : h0;
    if (h) { S.handle = h; S.fileName = h.name; S.perm = await verifyPerm(h, false); }
    if (d) { S.db = migrate(checkData(d)); index(); const gis = [...new Set(d.students.map((s) => s.gi))].sort((a, b) => a - b); S.st.gi = gis.filter((g) => d.settings.grad[g] && d.settings.grad[g] <= today()).pop() || gis[0]; S.savedAt = d.savedAt; }
  } catch (e) { console.error(e); }
  render();
}
start();

