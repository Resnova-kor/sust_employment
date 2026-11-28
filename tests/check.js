// 취업 통계 자동 검사 (화면 규칙 · 동작 · 빈 화면 대비)
//
// 사용법(저장소 폴더에서):
//   node tests/check.js                       → 지금 src/로 tests/out/app.html을 만들어 검사
//   node tests/check.js 취업통계_v4.7.html     → 정한 HTML 파일을 검사
// 필요한 것: Node + Playwright(클라우드 세션에는 깔려 있음), Python(빌드용)
// 결과: 화면에 요약, tests/out/report.txt에 자세히, tests/out/screens/에 화면 캡처(1920 폭). 위반·실패가 있으면 종료 코드 1.
//
// 크기 단계는 src/style.css 맨 위 :root 변수(--fs-*, --sp-*, --h-*)를 페이지에서 읽어서 쓴다 → 값을 바꾸면 검사도 따라간다.
// 예외는 아래 EXC에 모아 둔다(CLAUDE.md '결정사항'과 맞출 것).
// 데이터는 tests/fake_data.js의 익명 가짜 데이터만 쓴다. 실제 학생 데이터(*.json)는 쓰지 않는다.
'use strict';
const path = require('path'), fs = require('fs'), http = require('http'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const makeData = require('./fake_data.js');

const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'out');
const WIDTHS = [[1280, 720], [1920, 950]];

// ---- 예외(결정사항) ----
const EXC = {
  smallBtn: 'button.nb, th button.sort',            // 표 안 숫자·정렬 버튼: 20px 허용
  smallBtnH: 20,
  joinedGroup: '.seg2',                              // 붙은 고르기 묶음: 버튼 사이 4px 규칙 예외
  headFont: { 'table.sumt': '--fs-xs' },             // 통계 표: 열 제목 12px
  headTall: ['table.sumg'],                          // 요약 표: 눈금이 들어 있어 제목 줄이 높음
  headWrapNarrow: ['table.sumt'],                    // 좁은 화면에서 두 줄 허용(높이 36 이상)
  skip: '.pvw, svg',                                 // 인쇄 미리보기·그래프 내부는 크기 검사 제외(그래프 글자는 따로)
};

// ---- 검사할 화면(창 포함) ----
const stu1 = `S.st.sel=S.db.students.find(s=>s.gi===S.st.gi).id`;
const SCREENS = [
  ['요약-표', `S.view='summary';S.sumView='tbl'`], ['요약-A', `S.view='summary';S.sumView='A'`], ['요약-B', `S.view='summary';S.sumView='B'`],
  ['요약-C', `S.view='summary';S.sumView='C'`], ['요약-D', `S.view='summary';S.sumView='D'`],
  ['통계', `S.view='stats'`], ['통계-명단', `S.view='stats';render();document.querySelector('button.nb').click()`],
  ['전체기록', `S.view='ledger'`], ['학생', `S.view='students';${stu1}`], ['학생-기록입력', `S.view='students';${stu1};S.st.form=blankRec(S.st.sel)`],
  ['업체', `S.view='companies';S.cp.sel=''`], ['업체-선택', `S.view='companies';S.cp.sel=S.db.companies[3].name`], ['인쇄', `S.view='print'`],
  ['관리-올리기', `S.view='settings';S.mg='up'`], ['관리-기준', `S.view='settings';S.mg='opt'`], ['관리-확인', `S.view='settings';S.mg='chk'`],
  ['관리-바뀐기록', `S.view='settings';S.mg='log'`], ['관리-파일', `S.view='settings';S.mg='file'`],
  ['창-학생수정', `S.view='students';${stu1};render();ACT.editStu()`, 1], ['창-학생추가', `S.view='students';render();ACT.newStu()`, 1],
  ['창-새업체', `render();newCompModal('새업체',()=>{})`, 1], ['창-업체합치기', `S.view='companies';S.cp.sel='쓰지않는업체';render();ACT.cpMerge()`, 1],
  ['창-확인', `S.view='stats';render();ask('기본 통계 옵션 저장','<p>지금 옵션을 기본값으로 저장할까요?</p>','저장',()=>{})`, 1],
];

// ---- 페이지 안에서 재는 함수 ----
function measure(arg) {
  const { modal, EXC } = arg;
  const R = modal ? document.querySelector('.modal') : document.querySelector('#app');
  if (!R) return { v: [['화면', '열리지 않음']] };
  const css = getComputedStyle(document.documentElement);
  const varsOf = (names) => names.map((n) => parseFloat(css.getPropertyValue(n))).filter((x) => !isNaN(x));
  const FS = varsOf(['--fs-xs', '--fs-sm', '--fs-md', '--fs-lg', '--fs-xl', '--fs-2xl', '--fs-num']);
  const SP = [0, 1, 2].concat(varsOf(['--sp-1', '--sp-2', '--sp-3', '--sp-4', '--sp-5', '--sp-6', '--sp-7']));
  const BH = varsOf(['--h-lg', '--h-md', '--h-sm']);
  const v = []; const add = (cat, msg) => v.push([cat, msg]);
  const vis = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (e) => e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].join('.') : '') + (e.parentElement && !e.classList.length ? ` (${e.parentElement.tagName.toLowerCase()}${e.parentElement.classList[0] ? '.' + e.parentElement.classList[0] : ''} 안)` : '');
  const r1 = (x) => Math.round(x * 10) / 10;
  if (!FS.length || !SP.length || !BH.length) add('설정', 'style.css :root에서 크기 단계 변수를 못 읽음');
  for (const e of R.querySelectorAll('*')) {
    if (!vis(e)) continue;
    const inSkip = e.closest(EXC.skip), cs = getComputedStyle(e);
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const f = r1(parseFloat(cs.fontSize));
    if (hasText && (!inSkip || e.tagName === 'text' && !e.closest('.pvw')) && !FS.includes(f)) add('글씨', `${name(e)} ${f}px "${e.textContent.trim().slice(0, 16)}"`);
    if (!inSkip) {
      for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap']) {
        const x = parseFloat(cs[p]); if (isNaN(x)) continue; const a = Math.abs(r1(x));
        if (a > 40 || SP.includes(a)) continue;
        if ((p === 'marginLeft' || p === 'marginRight') && cs.marginLeft === cs.marginRight) continue;   // 가운데 맞춤(auto)
        add('여백', `${name(e)} ${p} ${a}px`); break;
      }
      if (e.matches('button, .btn, select, input.in')) {
        const h = Math.round(e.getBoundingClientRect().height);
        if (!BH.includes(h) && !(e.matches(EXC.smallBtn) && h === EXC.smallBtnH)) add('버튼 높이', `${name(e)} ${h}px "${e.textContent.trim().slice(0, 12)}"`);
      }
      if (e.matches('button, td, th, .chip, .stt') && e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0 && !e.hasAttribute('title') && !e.closest('[title]'))
        add('글자 잘림', `${name(e)} "${e.textContent.trim().slice(0, 20)}"`);
    }
  }
  // 같은 줄 버튼: 높이 같게 · 사이 4px 이상 · 글씨 같게(.on/.pri/.danger 강조는 예외)
  for (const p of R.querySelectorAll('*')) {
    if (p.closest(EXC.skip)) continue;
    const bs = [...p.children].filter((c) => c.matches('button, .btn') && vis(c));
    for (let i = 1; i < bs.length; i++) {
      const a = bs[i - 1].getBoundingClientRect(), b = bs[i].getBoundingClientRect(); if (Math.abs(a.top - b.top) > 2) continue;
      if (!p.matches(EXC.joinedGroup) && b.left - a.right < 4 && b.left - a.right > -1) add('붙은 버튼', `${name(bs[i])} 사이 ${Math.round(b.left - a.right)}px`);
      if (Math.round(a.height) !== Math.round(b.height) && !p.matches(EXC.joinedGroup)) add('같은 줄 높이', `${name(bs[i])} ${Math.round(a.height)} vs ${Math.round(b.height)}px`);
      const x = getComputedStyle(bs[i - 1]), y = getComputedStyle(bs[i]);
      if (!bs[i - 1].matches('.on,.pri,.danger') && !bs[i].matches('.on,.pri,.danger') && (x.fontSize !== y.fontSize || x.fontWeight !== y.fontWeight)) add('이웃 서식', `${name(bs[i])} ${x.fontSize}/${x.fontWeight} vs ${y.fontSize}/${y.fontWeight}`);
    }
  }
  // 표: 열 제목 줄 모양 · 제목과 칸 정렬
  const sunken = getComputedStyle(document.documentElement).getPropertyValue('--sunken').trim();
  for (const t of R.querySelectorAll('table')) {
    if (!vis(t) || t.closest(EXC.skip)) continue;
    const tk = 'table' + (t.classList.length ? '.' + [...t.classList].join('.') : ''), is = (sel) => t.matches(sel);
    const hr = [...t.querySelectorAll('thead tr')].pop();
    if (hr) {
      const th = hr.children[0], c = getComputedStyle(th), h = Math.round(hr.getBoundingClientRect().height);
      const fsVar = Object.keys(EXC.headFont).find(is), want = parseFloat(css.getPropertyValue(fsVar ? EXC.headFont[fsVar] : '--fs-sm'));
      if (parseFloat(c.fontSize) !== want) add('표 제목 줄', `${tk} 글씨 ${c.fontSize} (기대 ${want}px)`);
      if (Number(c.fontWeight) < 600) add('표 제목 줄', `${tk} 굵기 ${c.fontWeight}`);
      const hmd = parseFloat(css.getPropertyValue('--h-md'));
      if (!EXC.headTall.some(is) && (EXC.headWrapNarrow.some(is) ? h < hmd : h !== hmd)) add('표 제목 줄', `${tk} 높이 ${h}px (기대 ${hmd}px)`);
      const bg = document.createElement('i'); bg.style.color = sunken; document.body.appendChild(bg); const want2 = getComputedStyle(bg).color; bg.remove();
      if (c.backgroundColor !== want2) add('표 제목 줄', `${tk} 바탕 ${c.backgroundColor}`);
    }
    const br = t.querySelector('tbody tr');
    if (hr && br && hr.children.length === br.children.length) [...hr.children].forEach((h, i) => { const a1 = getComputedStyle(h).textAlign, a2 = getComputedStyle(br.children[i]).textAlign; if (a1 !== a2) add('표 정렬', `${tk} [${h.textContent.trim().slice(0, 8)}] 제목 ${a1} / 칸 ${a2}`); });
  }
  const ox = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (ox > 0) add('가로 넘침', `페이지가 ${ox}px 넘침`);
  return { v };
}

// ---- 준비 ----
function buildApp() {
  const out = path.join(OUT, 'app.html');
  for (const py of ['python3', 'python']) {
    try { execFileSync(py, ['build.py', '시험', '--out', out], { cwd: ROOT, stdio: 'pipe' }); return out; } catch (e) { if (e.code !== 'ENOENT') throw new Error('빌드 실패: ' + (e.stderr || e.message)); }
  }
  throw new Error('Python을 찾지 못함(빌드용)');
}
function serve(dir) {   // 빈 화면 대비 검사용(가짜 파일 연결은 http 주소에서만 만들 수 있어서)
  const srv = http.createServer((q, s) => { const f = path.join(dir, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });
  const file = process.argv[2] ? path.resolve(process.argv[2]) : buildApp();
  if (!fs.existsSync(file)) { console.error('파일 없음: ' + file); process.exit(2); }
  const url = 'file://' + file, lines = [], fails = [];
  const log = (s) => { lines.push(s); console.log(s); };
  const ok = (c, m) => { log((c ? '  통과 ' : '  실패 ') + m); if (!c) fails.push(m); };
  log(`검사 대상: ${path.relative(ROOT, file)}`);
  const b = await chromium.launch();
  const _np = b.newPage.bind(b); b.newPage = async (o) => { const p = await _np(o); p.setDefaultTimeout(5000); return p; };

  // 1) 화면 규칙
  const agg = {};
  for (const [W, H] of WIDTHS) {
    const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('알림창: ' + d.message()); d.dismiss(); });
    await p.goto(url); await p.evaluate((d) => loadDb(d), makeData());
    for (const [nm, js, modal] of SCREENS) {
      await p.evaluate('closeModal();' + js + (modal ? '' : ';render();')); await p.waitForTimeout(150);
      const r = await p.evaluate(measure, { modal: !!modal, EXC });
      for (const [cat, msg] of r.v) { const k = cat + ' | ' + msg; (agg[k] = agg[k] || new Set()).add(nm + (W === 1280 ? '@1280' : '')); }
      if (W === 1920) await p.screenshot({ path: path.join(OUT, 'screens', nm + '.png') });
    }
    for (const e of errs) { const k = '오류 | ' + e; (agg[k] = agg[k] || new Set()).add(W + 'px'); }
    await p.close();
  }
  const keys = Object.keys(agg).sort();
  log(`\n[화면 규칙] 위반 ${keys.length}가지 (창 포함 ${SCREENS.length}개 화면 × 폭 ${WIDTHS.map((w) => w[0]).join('·')})`);
  for (const k of keys) { const s = [...agg[k]]; log(`  ${k}  ← ${s.slice(0, 5).join(', ')}${s.length > 5 ? ` 외 ${s.length - 5}` : ''}`); }
  if (keys.length) fails.push(`화면 규칙 위반 ${keys.length}가지`);

  // 2) 동작
  log('\n[동작]');
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 950 } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('dialog', (d) => { errs.push('알림창: ' + d.message()); d.dismiss(); });
    await p.goto(url); await p.evaluate((d) => loadDb(d), makeData());
    await p.evaluate(() => { S.view = 'students'; S.st.gi = 8; S.st.sel = 'ZZ-빈학생'; render(); ACT.editStu(); });
    ok(await p.isVisible('.modal .mx'), '창 머리에 닫기(X)');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id) === 'sGi', '창 열면 첫 칸에 포커스');
    await p.click('.modal .mx'); ok(!(await p.$('#modalBg')), 'X 누르면 창 닫힘');
    await p.evaluate(() => ACT.editStu()); await p.keyboard.press('Escape'); ok(!(await p.$('#modalBg')), 'Esc 누르면 창 닫힘');
    await p.evaluate(() => ACT.editStu()); await p.fill('#sCls', ''); await p.type('#sCls', 'a2b'); ok(await p.inputValue('#sCls') === '2', '숫자 칸: a2b → 2'); await p.keyboard.press('Escape');
    const n0 = await p.evaluate(() => S.db.students.length);
    await p.evaluate(() => ACT.editStu()); await p.click('#sDel');
    ok(await p.evaluate(() => S.db.students.length) === n0 - 1 && !(await p.$('#modalBg')), '학생 지우기: 확인 창 없이 바로');
    await p.click('#undoBtn'); ok(await p.evaluate(() => S.db._st.has('ZZ-빈학생') && S.st.sel === 'ZZ-빈학생'), '학생 되돌리기 → 그 학생 화면');
    const rid = await p.evaluate(() => { const r = S.db.records[5], s = S.db._st.get(r.sid); S.view = 'students'; S.st.gi = s.gi; S.st.sel = s.id; S.st.form = Object.assign({}, r); render(); return r.id; });
    await p.click('[data-act=delRec]'); ok(!(await p.$('#modalBg')) && await p.evaluate((id) => !S.db.records.some((r) => r.id === id), rid), '기록 지우기: 확인 창 없이 바로');
    await p.click('#undoBtn'); ok(await p.evaluate((id) => S.db.records[5].id === id, rid), '기록 되돌리기 → 원래 자리');
    await p.evaluate(() => { S.view = 'companies'; S.cp.sel = '쓰지않는업체'; render(); }); await p.click('[data-act=cpDel]');
    ok(!(await p.$('#modalBg')) && await p.evaluate(() => !S.db._cm.has('쓰지않는업체')), '업체 지우기: 확인 창 없이 바로');
    await p.click('#undoBtn'); ok(await p.evaluate(() => S.db._cm.has('쓰지않는업체')), '업체 되돌리기');
    await p.evaluate(() => toast('시험', () => {})); await p.waitForTimeout(3600); const on1 = await p.evaluate(() => $('#toast').classList.contains('on'));
    await p.waitForTimeout(700); ok(on1 && !(await p.evaluate(() => $('#toast').classList.contains('on'))), '알림 4초');
    await p.evaluate(() => { S.view = 'ledger'; S.lg.sk = 'gi'; S.lg.sd = 1; render(); });
    const ar = await p.$$eval('th button.sort .ar', (a) => a.filter((e) => getComputedStyle(e).visibility === 'visible').length);
    ok(ar === 1, `정렬 화살표는 정렬 중인 열에만 (보임 ${ar}개)`);
    await p.evaluate(() => { S.view = 'stats'; render(); }); const ms = 'input[data-k=months]';
    await p.fill(ms, '99'); await p.waitForTimeout(150); ok(await p.evaluate(() => so().months) === 24, '인정 기간 최대 24');
    ok(errs.length === 0, '동작 중 오류 없음 ' + errs.join(' / '));
    await p.close();
  } catch (e) { ok(false, '동작 검사가 중간에 멈춤: ' + String(e.message).split('\n')[0]); }

  // 3) 빈 화면 대비(크롬이 대답하지 않는 상황 흉내)
  log('\n[빈 화면 대비]');
  try {
    const srv = await serve(path.dirname(file)); const base = `http://127.0.0.1:${srv.address().port}/` + encodeURIComponent(path.basename(file));
    const run = async (patch) => {
      const ctx = await b.newContext(); const p = await ctx.newPage(); p.setDefaultTimeout(5000); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
      await p.goto(base); await p.evaluate(async (d) => { loadDb(d); const dir = await navigator.storage.getDirectory(); await IDB.set('handle', await dir.getFileHandle('가짜.json', { create: true })); await saveNow(); }, makeData());
      if (patch) await p.addInitScript(patch);
      const t0 = Date.now(); await p.reload();
      await p.waitForFunction(() => document.querySelector('#app') && document.querySelector('#app').innerHTML.length > 0, null, { timeout: 8000 }).catch(() => {});
      return { p, ctx, ms: Date.now() - t0, txt: (await p.innerText('#app')).replace(/\s+/g, ' '), errs };
    };
    let r = await run(() => { FileSystemHandle.prototype.queryPermission = () => new Promise(() => {}); });
    ok(r.ms < 4500 && r.txt.includes('연결 확인에 대답하지 않아요'), `파일 권한 확인 멈춤 → ${(r.ms / 1000).toFixed(1)}초에 화면 + 안내`);
    await r.p.evaluate(() => { window.__pk = 0; window.showOpenFilePicker = async () => { window.__pk++; throw Object.assign(new Error('x'), { name: 'AbortError' }); }; });
    await r.p.click('.connbar [data-act=openFile]'); await r.p.waitForTimeout(150); ok(await r.p.evaluate(() => window.__pk) === 1, '[데이터 파일 열기] → 파일 고르는 창');
    ok(r.errs.length === 0, '오류 없음 ' + r.errs.join(' / ')); await r.ctx.close();
    r = await run(() => { IDBFactory.prototype.open = function () { return {}; }; });
    ok(r.ms < 5000 && r.txt.includes('브라우저 저장소가 대답하지 않아'), `브라우저 저장소 멈춤 → ${(r.ms / 1000).toFixed(1)}초에 첫 화면 + 안내`);
    const t1 = Date.now(); await r.p.evaluate((d) => { loadDb(d); return saveNow(); }, makeData()); await r.p.evaluate(() => saveNow());
    ok(Date.now() - t1 < 4500 && await r.p.evaluate(() => !!S.savedAt), '저장소가 멈춰도 저장이 막히지 않음'); await r.ctx.close();
    r = await run(() => { FileSystemHandle.prototype.queryPermission = async () => 'granted'; });
    ok(r.ms < 1500 && !r.txt.includes('대답하지'), `정상일 때 바로 뜸(${(r.ms / 1000).toFixed(1)}초) · 안내 줄 없음`); await r.ctx.close();
    srv.close();
  } catch (e) { ok(false, '빈 화면 대비 검사가 중간에 멈춤: ' + String(e.message).split('\n')[0]); }
  await b.close();

  const passed = lines.filter((l) => l.startsWith('  통과')).length;
  log(`\n결과: ${fails.length ? '실패 ' + fails.length + '건' : '모두 통과'} (동작·대비 통과 ${passed}개)`);
  for (const f of fails) log('  ' + f);
  fs.writeFileSync(path.join(OUT, 'report.txt'), lines.join('\n') + '\n');
  console.log(`자세한 결과: ${path.relative(ROOT, path.join(OUT, 'report.txt'))} · 캡처: ${path.relative(ROOT, path.join(OUT, 'screens'))}/`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
