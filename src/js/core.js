// ===== 기본 도구 · 저장 =====
const APP_VERSION = 'v__VER__';
const FORMAT = 1;
const KINDS = ['현장실습', '채용전환', '취업', '진학', '입대', '가업승계', '취업·진학 준비', '기타'];
const SIZES = ['대기업', '중견', '중소', '공공', '해외·기타', '학교'];
const TYPES = ['사기업', '공기업·공공기관', '공무원', '군(부사관)', '해외기업', '교육·연계기관', '학교(진학)'];
const INDS = ['건설·EPC', '엔지니어링·설계', '제조', '전기·에너지', '검사·안전·환경', '교통·운송', '시설관리', '공공행정', '교육', '기타'];
const STATUS = ['재학중', '졸업', '자퇴', '전학', '전과(반이동)'];
const DEPTS = ['산업설비', '공정플랜트', '전기통신', '시설물건설'];
const ABBR = { 산업설비: '산설', 공정플랜트: '공정', 전기통신: '전기', 시설물건설: '건설' };
const DCLS = { 산업설비: 'd1', 공정플랜트: 'd2', 전기통신: 'd3', 시설물건설: 'd4' };

const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const nowIso = () => { const d = new Date(); return `${today()}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; };
const pct = (x) => (x * 100).toFixed(1) + '%';
const norm = (s) => String(s || '').toLowerCase().replace(/\(주\)|㈜|주식회사|\s|[().·,-]/g, '');
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const S = { db: null, view: 'summary', handle: null, fileName: '', perm: false, dirty: false, savedAt: '', st: { gi: 0, grp: '', q: '', sel: '', form: null }, lg: null, cp: { q: '', size: [], type: [], ind: [], blank: false, sel: '', sort: 'name' }, mg: 'up', msOpen: null };
function lgInit() { return { gi: [], dept: [], kind: [], basis: [], q: '', special: '', sk: '', sd: 1 }; }
S.lg = lgInit();

// ---- IndexedDB ----
const IDB = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('chuieop-stats', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('kv', mode); const st = t.objectStore('kv'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return {
    get: (k) => tx('readonly', (s) => s.get(k)), set: (k, v) => tx('readwrite', (s) => s.put(v, k)), del: (k) => tx('readwrite', (s) => s.delete(k)),
    keys: () => tx('readonly', (s) => s.getAllKeys()),
  };
})();

// ---- 데이터 ----
function checkData(d) {
  if (!d || d.app !== 'chuieop-stats' || !Array.isArray(d.students) || !Array.isArray(d.records) || !Array.isArray(d.companies)) throw new Error('취업통계 데이터 파일이 아니에요');
  d.settings = d.settings || {}; d.settings.grad = d.settings.grad || {}; d.settings.official = d.settings.official || {}; d.log = d.log || [];
  return d;
}
// 데이터 손질: 쓰지 않는 '글로벌현장학습(국가)' 업체 지우기, 졸업일 없는 기수 채우기
function migrate(d) {
  const used = new Set(d.records.map((r) => r.company));
  const rm = d.companies.filter((c) => /^글로벌현장학습/.test(c.name) && !used.has(c.name));
  if (rm.length) { d.companies = d.companies.filter((c) => !rm.includes(c)); (d.log = d.log || []).unshift({ t: nowIso(), msg: `쓰지 않는 업체 ${rm.length}곳 정리: ${rm.map((c) => c.name).join(', ')}` }); }
  if (d.settings && d.settings.statDefault) delete d.settings.statDefault.school;
  { const na = d.companies.filter((c) => c.size === '해당없음'); if (na.length) { na.forEach((c) => (c.size = '학교')); (d.log = d.log || []).unshift({ t: nowIso(), msg: `업체 규모 '해당없음' → '학교' (${na.length}곳: ${na.map((c) => c.name).join(', ')})` }); } }
  return d;
}
function index() {
  { const g = S.db.settings.grad; for (const s of S.db.students) if (!g[s.gi]) g[s.gi] = `${s.year + 1}-02-28`; }
  const db = S.db;
  db._st = new Map(db.students.map((s) => [s.id, s]));
  db._cm = new Map(db.companies.map((c) => [c.name, c]));
  db._fin = ENG.finals(db);
  db._bySid = {}; for (const r of db.records) (db._bySid[r.sid] = db._bySid[r.sid] || []).push(r);
  db._cnt = {}; for (const r of db.records) if (r.company) db._cnt[r.company] = (db._cnt[r.company] || 0) + 1;
}
function log(msg) { S.db.log.unshift({ t: nowIso(), msg }); if (S.db.log.length > 500) S.db.log.length = 500; }
function changed(msg) { if (msg) log(msg); index(); S.dirty = true; queueSave(); }
let saveTimer = null;
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 800); renderFoot(); }
function plain() { const o = {}; for (const k of Object.keys(S.db)) if (!k.startsWith('_')) o[k] = S.db[k]; return o; }
async function saveNow() {
  const d = plain(); d.savedAt = nowIso(); S.db.savedAt = d.savedAt; d.app = 'chuieop-stats'; d.format = FORMAT;
  try { await IDB.set('db', d); } catch (e) { console.error(e); }
  // 하루 1번 보관본(14일)
  try {
    const key = 'snap:' + today(); const ks = (await IDB.keys()).filter((k) => String(k).startsWith('snap:')).sort();
    if (!ks.includes(key)) { await IDB.set(key, d); for (const k of ks.slice(0, Math.max(0, ks.length + 1 - 14))) await IDB.del(k); }
  } catch (e) { console.error(e); }
  if (S.handle && S.perm) {
    try { const w = await S.handle.createWritable(); await w.write(JSON.stringify(d)); await w.close(); S.dirty = false; S.savedAt = d.savedAt; }
    catch (e) { S.perm = false; toast('데이터 파일에 저장하지 못했어요. 관리 › 데이터 파일에서 다시 연결해 주세요'); }
  } else S.savedAt = d.savedAt;
  renderFoot();
}
async function verifyPerm(h, ask) {
  if (!h || !h.queryPermission) return false;
  const o = { mode: 'readwrite' };
  if ((await h.queryPermission(o)) === 'granted') return true;
  if (ask && (await h.requestPermission(o)) === 'granted') return true;
  return false;
}
const FS_OK = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
const PICK = { types: [{ description: '취업통계 데이터', accept: { 'application/json': ['.json'] } }] };
async function openDataFile() {
  if (!FS_OK) { $('#fileIn').click(); return; }
  try {
    const [h] = await showOpenFilePicker(PICK);
    const d = checkData(JSON.parse(await (await h.getFile()).text()));
    S.handle = h; S.fileName = h.name; S.perm = await verifyPerm(h, true);
    await IDB.set('handle', h); loadDb(d, `데이터 파일 열기: ${h.name}`);
  } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
}
async function saveAsFile() {
  if (!FS_OK) { downloadJson(); return; }
  try {
    const h = await showSaveFilePicker(Object.assign({ suggestedName: '취업통계_데이터.json' }, PICK));
    S.handle = h; S.fileName = h.name; S.perm = true; await IDB.set('handle', h); await saveNow(); toast('데이터 파일에 연결했어요'); render();
  } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
}
async function reconnect() {
  if (!S.handle) { openDataFile(); return; }
  S.perm = await verifyPerm(S.handle, true); if (!S.perm) { render(); return; }
  let f = null; try { f = checkData(JSON.parse(await (await S.handle.getFile()).text())); } catch (e) { f = null; }
  const ft = (f && f.savedAt) || '', bt = S.db.savedAt || '';
  if (f && ft > bt) {
    ask('데이터 파일이 더 최근이에요', `<p>데이터 파일: <b>${esc(ft.replace('T', ' '))}</b><br>이 브라우저: ${esc(bt.replace('T', ' '))}</p><p class="small muted">다른 컴퓨터에서 고친 내용이 파일에 있어요. 파일 내용으로 불러올까요? (지금 브라우저 자료는 백업 파일로 내려받아요)</p>`, '파일로 불러오기', () => { downloadJson(`취업통계_브라우저자료_${today().replace(/-/g, '')}.json`); loadDb(migrate(f), '다시 연결: 데이터 파일 내용으로 불러옴'); toast('데이터 파일 내용으로 불러왔어요'); });
    render(); return;
  }
  await saveNow(); toast('다시 연결했어요'); render();
}
function downloadJson(name) {
  const d = plain(); d.savedAt = nowIso();
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' }));
  a.download = name || `취업통계_백업_${today().replace(/-/g, '').slice(2)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function readFileInput(input, cb) {
  const f = input.files && input.files[0]; if (!f) return;
  f.text().then((t) => { try { cb(checkData(JSON.parse(t)), f.name); } catch (e) { toast(e.message); } input.value = ''; });
}
function loadDb(d, msg) {
  S.db = migrate(d); if (msg) log(msg); index();
  const gis = [...new Set(d.students.map((s) => s.gi))].sort((a, b) => a - b);
  if (!S.st.gi) S.st.gi = gis.filter((g) => d.settings.grad[g] && d.settings.grad[g] <= today()).pop() || gis[gis.length - 1];
  saveNow(); render();
}

// ---- 화면 도구 ----
let toastT = null;
function toast(m, undo) {
  const t = $('#toast'); t.innerHTML = esc(m) + (undo ? ' <button id="undoBtn">되돌리기</button>' : ''); t.classList.add('on'); t.classList.toggle('act', !!undo);
  if (undo) $('#undoBtn').onclick = () => { t.classList.remove('on', 'act'); undo(); };
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on', 'act'), 4000);   // 알림은 모두 4초
}
function modal(html, opts = {}) {
  closeModal();
  const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.id = 'modalBg';
  bg.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true"><button class="mx" data-act="closeModal" aria-label="닫기" title="닫기 (Esc)">×</button>${html}</div>`;
  bg.addEventListener('mousedown', (e) => { if (e.target === bg && !opts.sticky) closeModal(); });
  document.body.appendChild(bg); const f = bg.querySelector('[autofocus], input, select, button:not(.mx)'); if (f) f.focus();
  return bg;
}
function closeModal() { const m = $('#modalBg'); if (m) m.remove(); }
// 창은 Esc로 닫기(한글 조합 중이면 무시)
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !e.isComposing && $('#modalBg')) { e.preventDefault(); e.stopImmediatePropagation(); closeModal(); } }, true);
// 숫자만 받는 칸(data-num): 숫자 아닌 글자는 바로 지움 — type=number는 마우스 휠로 값이 바뀌어서 쓰지 않음
document.addEventListener('input', (e) => { const el = e.target; if (el.matches && el.matches('input[data-num]')) { const v = el.value.replace(/\D/g, ''); if (v !== el.value) el.value = v; } }, true);
function ask(title, body, okLabel, onOk, danger) {
  modal(`<h2>${esc(title)}</h2><div>${body}</div><div class="acts"><button class="btn" data-act="closeModal">취소</button><button class="btn ${danger ? 'danger' : 'pri'}" id="askOk">${esc(okLabel)}</button></div>`);
  $('#askOk').onclick = () => { closeModal(); onOk(); };
}
const ACT = { closeModal };   // data-act 처리기
const INP = {};               // data-in 처리기(input/change)
function opts(list, val, blank) { return (blank != null ? `<option value="">${esc(blank)}</option>` : '') + list.map((x) => { const [v, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join(''); }
function deptTag(d) { return `<span class="dept ${DCLS[d] || ''}">${esc(d)}</span>`; }
function kindChip(k) { return `<span class="chip k-${esc(k)}">${esc(k)}</span>`; }
function stu(sid) { return S.db._st.get(sid); }
function grpOf(s) { return `${ABBR[s.dept] || s.dept}${s.cls}`; }
function stuLabel(s) { return `${s.gi}기 ${grpOf(s)}-${pad2(s.no)} ${s.name}`; }
function recDate(r) { return r.kind === '현장실습' || r.kind === '채용전환' ? (r.start || r.emp || r.est) : (r.emp || r.est || r.start); }
function sortRecs(list) {
  const t = { 현장실습: 0, 채용전환: 1, 취업: 2 };
  return list.slice().sort((a, b) => { const da = recDate(a) || '9', db_ = recDate(b) || '9'; return da < db_ ? -1 : da > db_ ? 1 : (t[a.kind] ?? 3) - (t[b.kind] ?? 3); });
}
function compInfo(name) { return S.db._cm.get(name); }

// ---- 표 머리 정렬(열 이름 누르면 오름차순 → 내림차순 → 원래 순서) ----
function sortRows(rows, cols, st) {
  const c = cols.find((x) => x.k === st.sk); if (!c) return rows;
  const d = st.sd || 1;
  return rows.map((x, i) => [c.get(x), i, x]).sort((a, b) => {
    const va = a[0], vb = b[0], ea = va === '' || va == null, eb = vb === '' || vb == null;
    if (ea || eb) return ea === eb ? a[1] - b[1] : ea ? 1 : -1;   // 빈칸은 항상 아래
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'ko', { numeric: true });
    return r * d || a[1] - b[1];
  }).map((x) => x[2]);
}
function sortHead(cols, st, act) {
  return `<colgroup>${cols.map((c) => `<col style="width:${c.w}px">`).join('')}</colgroup><thead><tr>${cols.map((c) => {
    const on = st.sk === c.k, ar = on ? (st.sd === -1 ? '▼' : '▲') : '↕';
    return `<th class="${c.wrap ? 'wrap' : ''}" aria-sort="${on ? (st.sd === -1 ? 'descending' : 'ascending') : 'none'}"><button class="sort ${on ? 'on' : ''}" data-act="${act}" data-k="${c.k}">${esc(c.label)}<span class="ar${on ? '' : ' off'}" aria-hidden="true">${ar}</span></button></th>`; }).join('')}</tr></thead>`;
}
function toggleSort(st, k) { if (st.sk !== k) { st.sk = k; st.sd = 1; } else if (st.sd === 1) st.sd = -1; else { st.sk = ''; st.sd = 1; } }
// 학생 순서: 기수 → 학과(산설·공정·전기·건설) → 반 → 번호
const stuKey = (s) => [s.gi, DEPTS.indexOf(s.dept), s.cls, s.no];
function stuCmp(a, b) { const x = stuKey(a), y = stuKey(b); for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }

// 기본 통계 옵션: 설정에서 정한 값(데이터 파일에 저장) → 없으면 프로그램 기본값
const DEF_KEYS = ['months', 'mode', 'prac', 'glob', 'gaup', 'ignoreAfter', 'unit', 'denom'];
function statDef() { const d = (S.db && S.db.settings.statDefault) || {}; const o = Object.assign({}, ENG.DEFAULT); for (const k of DEF_KEYS) if (d[k] !== undefined) o[k] = d[k]; o.school = true; return o; }
function statDefFix(o) { o.school = true; return o; }
const pathLabel = (t) => (t ? (t.path === '취업' ? '취업' + (t.detail && t.detail !== '취업' ? `(${t.detail})` : '') : t.path) : '');

const LOGO_E = '__LOGO_E__', LOGO_L = '__LOGO_L__';

function optShort(o) {
  const d0 = Object.assign({}, ENG.DEFAULT), diff = [];
  if (o.mode !== d0.mode) diff.push('현재 상태 기준'); if (!o.prac) diff.push('현장실습만 제외'); if (!o.glob) diff.push('글로벌 제외'); if (!o.gaup) diff.push('가업승계 제외');
  if (!o.ignoreAfter) diff.push('퇴사·입대 반영'); if (o.unit === 'record') diff.push('업체: 기록마다'); if (o.denom === 'excl') diff.push('분모: 대상−진학−입대'); if (o.dept) diff.push(o.dept);
  return `${o.baseMode === 'date' && o.base ? o.base : o.baseMode === 'today' ? `오늘(${today()})` : '졸업일'} + ${o.months}개월${diff.length ? ' · ' + diff.join(' · ') : ''}`;
}
function fmtTel(v) { const d = String(v || '').replace(/\D/g, ''); if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`; if (d.length === 10) return d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`; if (d.length === 9 && d.startsWith('02')) return `02-${d.slice(2, 5)}-${d.slice(5)}`; return v || ''; }

