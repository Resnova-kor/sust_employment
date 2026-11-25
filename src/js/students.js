// ===== 학생 화면 · 기록 입력 =====
let statCache = {};
const _changed0 = changed;
changed = function (msg) { statCache = {}; _changed0(msg); };   // eslint-disable-line no-global-assign
function stuStat(gi, grad) {   // grad: 졸업 기준(기본 통계 옵션) / 아니면 현재 상태(오늘까지 모든 기록)
  const key = (grad ? 'g' : 'n') + gi;
  if (!statCache[key]) { const o = Object.assign(statDef(), grad ? {} : { base: today(), months: 0 }); const r = ENG.stat(S.db, [gi], o); statCache[key] = new Map(r.T.map((t) => [t.sid, t])); }
  return statCache[key];
}
function stuTag(s) {
  const t = stuStat(s.gi).get(s.id); if (!t) return ['', ''];
  if (t.path === '취업') return t.detail === '실습만' ? ['실습만', 'sub'] : t.detail === '가업승계' ? ['가업', 'sub'] : ['취업', 'emp'];
  if (t.path === '기록 없음') return ['', ''];
  if (t.path === '취업·진학 준비') return ['준비', 'prep'];
  return [t.path, 'off'];
}

VIEWS.students = () => {
  const db = S.db, st = S.st;
  const gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const q = st.q.trim();
  let list = q ? db.students.filter((s) => s.name.includes(q) || (s.alias || '').includes(q) || s.id.includes(q)) : db.students.filter((s) => s.gi === st.gi && (!st.grp || grpOf(s) === st.grp));
  list = list.slice().sort(stuCmp);
  const grps = [...new Set(db.students.filter((s) => s.gi === st.gi).sort(stuCmp).map(grpOf))];
  const gName = (s) => `${s.dept} ${s.cls}반`;
  let lastG = '';
  const li = list.map((s) => { const g = q ? '' : grpOf(s); const head = !q && !st.grp && g !== lastG ? `<li><div class="grp ${DCLS[s.dept]}">${esc(gName(s))} <span>${list.filter((x) => grpOf(x) === g).length}명</span></div></li>` : ''; lastG = g;
    const [tag, tc] = stuTag(s); const out = !ENG.target(s);
    return `${head}<li><button class="${st.sel === s.id ? 'on' : ''}" data-act="pickStu" data-id="${esc(s.id)}"><span>${q ? `${s.gi}기 ${esc(grpOf(s))}-` : ''}${s.no}. ${esc(s.name)}${out ? ' <span class="small muted">(' + esc(s.status) + ')</span>' : ''}</span>${tag ? `<span class="stt ${tc}">${esc(tag)}</span>` : ''}</button></li>`; }).join('');
  const s = st.sel ? stu(st.sel) : null;
  return `<div class="three">
    <section class="pane list" aria-label="학생 목록">
      <div class="fl" style="justify-content:space-between"><h2>학생</h2><button class="btn sm" data-act="newStu">+ 학생</button></div>
      <label class="f"><span class="small muted" style="font-weight:400">이름 찾기(모든 기수)</span><input class="in" id="stQ" data-in="stQ" type="search" value="${esc(st.q)}" placeholder="이름 · 다른이름 · 학생ID"></label>
      <div class="fl" style="flex-wrap:nowrap"><select class="in" style="flex:1" aria-label="기수" data-in="stGi">${opts(gis.map((g) => { const y = (db.students.find((x) => x.gi === g) || {}).year; return [g, `${g}기`]; }), st.gi)}</select>
        <select class="in" style="flex:1" aria-label="반" data-in="stGrp">${opts(grps, st.grp, '전체 반')}</select></div>
      ${!q && st.grp && list[0] ? `<div class="grp-sel ${DCLS[list[0].dept]}">${esc(gName(list[0]))} · ${list.length}명</div>` : `<div class="small muted">${list.length}명</div>`}
      <div class="stt-legend"><span class="small muted">현재 상태</span><span class="stt emp">취업</span><span class="stt sub">실습만·가업</span><span class="stt prep">준비</span><span class="stt off">진학·입대</span></div>
      <ul data-keep="stList">${li || '<li class="empty">학생이 없어요</li>'}</ul>
    </section>
    <section class="pane main">${s ? stuCard(s) : '<div class="empty" style="margin-top:20vh">왼쪽에서 학생을 고르세요</div>'}</section>
    <aside class="pane form" aria-label="기록 입력">${s ? (st.form ? recForm() : `<h2>기록</h2><button class="btn pri" data-act="newRec">+ 기록 추가</button>`) : ''}</aside>
  </div>`;
};
function stuCard(s) {
  const db = S.db, recs = sortRecs(db._bySid[s.id] || []), tg = ENG.target(s);
  const t = stuStat(s.gi).get(s.id), tg2 = stuStat(s.gi, true).get(s.id), gd = S.db.settings.grad[s.gi] || '';
  const d0 = statDef(), cut = gd ? (() => { const x = new Date(gd + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + Math.floor(d0.months * 30.5)); return x.toISOString().slice(0, 10); })() : '';
  const why = t && tg2 && t.path !== tg2.path ? (t.path === '취업' && tg2.path !== '취업' ? `취업 기록이 통계 기준일(${cut}) 뒤에 있어요` : `통계 기준일(${cut}) 뒤의 기록이 반영되지 않았어요`) : '';
  const st2 = gd && gd < today() ? `<div class="pstat"><span class="pv"><span class="k">현재</span><b>${esc(pathLabel(t) || '-')}</b>${t && t.company ? ` <span class="muted">${esc(t.company)}</span>` : ''}
      </span><span class="pv"><span class="k">졸업 기준 통계</span><b>${esc(pathLabel(tg2) || '-')}</b> <span class="small muted">(졸업일 ${esc(gd)} + ${d0.months}개월)</span></span>${why ? `<div class="small warn" style="font-weight:400">${esc(why)}</div>` : ''}</div>`
    : `<div class="pstat"><span class="pv"><span class="k">현재</span><b>${esc(pathLabel(t) || '-')}</b>${t && t.company ? ` <span class="muted">${esc(t.company)}</span>` : ''} <span class="small muted">(졸업 전 · ${esc(gd)} 졸업 예정)</span></span></div>`;
  return `<div class="fl" style="justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <div><div class="small muted meta1"><span>${s.gi}기 (${s.year}학년도)</span><span>${deptTag(s.dept)} ${s.cls}반 ${s.no}번</span><span>${esc(s.gender)}</span><span>식별번호 ${esc(s.hifiveNo || '-')}</span><span>${esc(s.id)}</span></div>
      <h1 style="font-size:24px">${esc(s.name)} ${s.alias ? `<span class="small muted" style="font-weight:400">다른이름 ${esc(s.alias)}</span>` : ''}</h1>
      ${s.memo ? `<div class="small muted">메모: ${esc(s.memo)}</div>` : ''}</div>
      <div class="fl" style="align-items:center"><span class="chip ${tg ? 'ok' : 'no'}">${tg ? '졸업 대상' : esc(s.status)}</span>
      <button class="btn" data-act="editStu">학생 정보 수정</button></div></div>
    ${st2}
    <h2 style="margin-bottom:10px">기록 (시간 순) <span class="small muted" style="font-weight:400">${recs.length}건</span></h2>
    ${recs.map(recCard).join('') || '<div class="empty card">기록이 없어요</div>'}`;
}
function recCard(r) {
  const c = compInfo(r.company), fin = S.db._fin[r.id], prac = r.kind === '현장실습' || r.kind === '채용전환';
  const f = [];
  const add = (k, v) => { if (v) f.push(`<div><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`); };
  if (prac && (r.start || r.end)) add('실습 기간', `${r.start || '?'} ~ ${r.end || '?'}`);
  add('취업일', r.emp);
  if (!r.emp && !r.start && r.est) add('날짜', `미기재 (통계 기준 ${r.est})`);
  add('실습결과', r.result); add('고용형태', r.empType); add('해외', r.abroad); add('실습분야', r.field);
  const tags = c ? [c.size, c.type, c.industry].filter(Boolean).map((x) => `<span class="ctag">${esc(x)}</span>`).join('') : '';
  const nm = r.company || (r.kind === '진학' ? '(학교 미기재)' : (['취업·진학 준비', '입대', '기타'].includes(r.kind) ? '' : '(업체 미기재)'));
  return `<article class="rec ${fin === '최종' ? 'final' : ''} ${fin === '이전' ? 'prevr' : ''} ${S.st.hl === r.id ? 'hl' : ''}">
    <div class="rtop"><div class="fl" style="gap:8px;align-items:center">${kindChip(r.kind)}${fin ? `<span class="fin ${fin === '최종' ? 'f1' : 'f0'}">${fin}</span>` : ''}</div>
      <div class="fl" style="gap:10px;align-items:center"><span class="basis ${r.basis === 'HIFIVE' ? 'h' : 'm'}">${esc(r.basis)}</span><button class="btn sm" data-act="editRec" data-id="${esc(r.id)}">수정</button></div></div>
    ${nm ? `<div class="rname"><span class="cname">${esc(nm)}</span>${tags}</div>` : ''}
    ${f.length ? `<div class="facts">${f.join('')}</div>` : ''}
    ${r.note ? `<div class="rnote">${esc(r.note)}</div>` : ''}
    ${detGrid(r)}
  </article>`;
}
function detGrid(r) {
  const d = r.detail || {}; const it = [];
  const add = (k, v, wide) => { if (v) it.push(`<div class="${wide ? 'w2' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`); };
  add('실습장소', d['실습장소'], true); if (d['기업주소'] && d['기업주소'] !== d['실습장소']) add('기업주소', d['기업주소'], true);
  add('기업구분', d['기업구분']); add('근로자 수', d['상시근로자수'] ? d['상시근로자수'] + '명' : ''); add('등록일', d['현장실습 등록일']);
  add('담당자', d['실습담당자']); add('연락처', fmtTel(d['실습담당자연락처']));
  add('수당', [d['수당구분'], d['수당']].filter(Boolean).join(' ')); add('실습 기간', d['실습주'] ? `${d['실습주']}주 · ${d['실습시간'] || '?'}시간` : '');
  add('전공 적합', d['전공적합여부']); add('만족도', d['만족도']); add('순회지도', d['순회지도 전체건수'] ? d['순회지도 전체건수'] + '회' : ''); add('현장실습번호', r.pracNo);
  return it.length ? `<dl class="det">${it.join('')}</dl>` : '';
}
ACT.pickStu = (el) => { S.st.sel = el.dataset.id; S.st.form = null; S.st.hl = ''; render(); };
INP.stQ = (el) => { S.st.q = el.value; render(); };
INP.stGi = (el) => { S.st.gi = +el.value; S.st.grp = ''; S.st.q = ''; render(); };
INP.stGrp = (el) => { S.st.grp = el.value; render(); };

// ---- 기록 입력 칸 ----
const PRAC_K = ['현장실습', '채용전환'], EMP_K = ['채용전환', '취업'];
function blankRec(sid) { return { id: '', sid, kind: '취업', company: '', field: '', start: '', end: '', emp: '', est: '', result: '', abroad: '', empType: '', empForm: '', basis: '직접입력', note: '', pracNo: '', bizNo: '', surveyOnly: false, schoolAdded: false, detail: {} }; }
ACT.newRec = () => { S.st.form = blankRec(S.st.sel); render(); setTimeout(() => { const e = $('#fComp'); if (e) e.focus(); }, 0); };
ACT.editRec = (el) => { const r = S.db.records.find((x) => x.id === el.dataset.id); S.st.hl = ''; S.st.form = JSON.parse(JSON.stringify(r)); render(); };
function recFields(f) {
  const isP = PRAC_K.includes(f.kind), isE = EMP_K.includes(f.kind), school = f.kind === '진학';
  const needComp = !['취업·진학 준비', '입대', '기타'].includes(f.kind) || f.company;
  return `<label class="f"><span>구분</span><select class="in" data-in="fKind">${opts(KINDS, f.kind)}</select></label>
    ${needComp ? `<div class="f ac"><label class="f" for="fComp"><span>${school ? '학교명' : '업체'}</span></label>
      <input class="in" id="fComp" data-in="acComp" autocomplete="off" value="${esc(f.company)}" placeholder="${school ? '예: 한국폴리텍대학' : '이름 일부를 치면 목록이 나와요 (예: 삼성)'}">
      <ul class="ac-list" id="acList" hidden></ul>
      <span class="small muted" id="compHint">${compHint(f)}</span></div>` : ''}
    ${isP ? `<div class="fl"><label class="f"><span>실습 시작일</span><input class="in" type="date" data-in="ff" data-k="start" value="${esc(f.start)}"></label><label class="f"><span>실습 종료일</span><input class="in" type="date" data-in="ff" data-k="end" value="${esc(f.end)}"></label></div>
      <label class="f"><span>실습분야</span><input class="in" data-in="ff" data-k="field" value="${esc(f.field)}"></label>` : ''}
    ${f.kind === '현장실습' ? `<label class="f"><span>실습결과</span><select class="in" data-in="ff" data-k="result">${opts(['실습완료', '복교'], f.result, '-')}</select></label>` : ''}
    ${isE || f.kind === '가업승계' ? `<div class="fl"><label class="f"><span>취업일</span><input class="in" type="date" data-in="ff" data-k="emp" value="${esc(f.emp)}"></label><label class="f"><span>고용형태</span><select class="in" data-in="ff" data-k="empType">${opts(['정규직', '계약직', '기타'], f.empType, '-')}</select></label></div>` : ''}
    ${!isP && !isE && f.kind !== '가업승계' ? `<label class="f"><span>날짜</span><input class="in" type="date" data-in="ff" data-k="emp" value="${esc(f.emp)}"><span class="small muted">비우면 졸업일로 봐요</span></label>` : ''}
    <label class="f"><span>해외</span><input class="in" data-in="ff" data-k="abroad" value="${esc(f.abroad)}" placeholder="글로벌(국가) 또는 해외근무"></label>
    <label class="f"><span>비고</span><input class="in" data-in="ff" data-k="note" value="${esc(f.note)}" placeholder="복교 사유: … / 제외인정: … / 준비: 취업·진학"></label>
    ${f.basis === 'HIFIVE' ? '<p class="small muted">HIFIVE에서 온 기록이에요. 고친 내용은 HIFIVE를 다시 올리면 HIFIVE 값으로 바뀔 수 있어요.</p>' : '<p class="small muted">직접입력 기록은 HIFIVE 자료를 다시 올려도 덮어쓰지 않아요.</p>'}`;
}
function recForm() {
  const f = S.st.form;
  return `<h2>${f.id ? '기록 수정' : '기록 추가'}</h2>${recFields(f)}
    <div class="fl"><button class="btn pri" style="flex:1" data-act="saveRec">저장</button><button class="btn" data-act="cancelRec">취소</button></div>
    ${f.id ? '<button class="btn danger sm" style="align-self:flex-start" data-act="delRec">이 기록 지우기</button>' : ''}`;
}
function compHint(f) {
  if (!f.company) return '';
  const c = compInfo(f.company);
  if (c) return `<span class="ok">등록된 업체</span> · ${esc([c.size, c.type, c.industry].filter(Boolean).join(' · '))}`;
  return f.kind === '진학' ? '학교명은 그대로 저장돼요' : '<span class="warn">목록에 없는 이름 — 저장할 때 새 업체로 등록해요</span>';
}
function curForm() { return S.st.form; }
INP.fKind = (el) => { const f = curForm(); f.kind = el.value; if (f.kind !== '현장실습') f.result = ''; render(); };
INP.ff = (el) => { curForm()[el.dataset.k] = el.value; };
ACT.cancelRec = () => { S.st.form = null; render(); };

// ---- 업체 고르기(자동 완성) ----
let acSel = -1, acItems = [];
function searchComp(q, max = 12) {
  const n = norm(q); if (!n) return [];
  const out = [];
  for (const c of S.db.companies) {
    const hit = norm(c.name).includes(n) ? 0 : (c.alias || []).some((a) => norm(a).includes(n)) ? 1 : -1;
    if (hit >= 0) out.push([hit, norm(c.name).startsWith(n) ? 0 : 1, -(S.db._cnt[c.name] || 0), c]);
  }
  out.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || (a[3].name < b[3].name ? -1 : 1));
  return out.slice(0, max).map((x) => x[3]);
}
INP.acComp = (el) => {
  const f = curForm(); f.company = el.value; acSel = -1;
  const ul = $('#acList'); const q = el.value.trim();
  acItems = searchComp(q);
  if (!q || f.kind === '진학' && !acItems.length) { ul.hidden = true; $('#compHint').innerHTML = compHint(f); return; }
  const exact = acItems.some((c) => c.name === q);
  ul.innerHTML = acItems.map((c, i) => `<li data-i="${i}" data-act="acPick"><span>${esc(c.name)}${(c.alias || []).length && !norm(c.name).includes(norm(q)) ? ` <small>(${esc(c.alias.find((a) => norm(a).includes(norm(q))) || '')})</small>` : ''}</span><small>${esc([c.size, c.industry].filter(Boolean).join(' · '))}</small></li>`).join('')
    + (exact || f.kind === '진학' ? '' : `<li class="new" data-act="acNew">+ ‘${esc(q)}’ 새 업체로 등록</li>`);
  ul.hidden = false; $('#compHint').innerHTML = acItems.length ? '' : compHint(f);
};
ACT.acPick = (el) => { const c = acItems[+el.dataset.i]; const f = curForm(); f.company = c.name; const inp = $('#fComp'); inp.value = c.name; $('#acList').hidden = true; $('#compHint').innerHTML = compHint(f); };
ACT.acNew = () => { $('#acList').hidden = true; newCompModal(curForm().company, (c) => { const f = curForm(); f.company = c.name; const inp = $('#fComp'); if (inp) { inp.value = c.name; $('#compHint').innerHTML = compHint(f); } }); };
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'fComp') return; const ul = $('#acList'); if (!ul || ul.hidden) return;
  const lis = [...ul.querySelectorAll('li')]; if (!lis.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); acSel = (acSel + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis.forEach((l, i) => l.classList.toggle('hl', i === acSel)); }
  else if (e.key === 'Enter' && acSel >= 0) { e.preventDefault(); lis[acSel].click(); }
  else if (e.key === 'Escape') ul.hidden = true;
});
document.addEventListener('mousedown', (e) => { const ul = $('#acList'); if (ul && !ul.hidden && !e.target.closest('.ac')) ul.hidden = true; });

function newCompModal(name, done) {
  modal(`<h2>새 업체 등록</h2>
    <label class="f"><span>표준명(법인격 포함)</span><input class="in" id="ncName" value="${esc(name)}" autofocus></label>
    <div class="fl"><label class="f"><span>규모</span><select class="in" id="ncSize">${opts(SIZES, '중소')}</select></label><label class="f"><span>유형</span><select class="in" id="ncType">${opts(TYPES, '사기업')}</select></label></div>
    <div class="fl"><label class="f"><span>업종</span><select class="in" id="ncInd">${opts(INDS, '건설·EPC')}</select></label><label class="f"><span>사업자번호</span><input class="in" id="ncBiz" placeholder="숫자 10자리"></label></div>
    <label class="f"><span>별칭(쉼표로 구분)</span><input class="in" id="ncAlias" placeholder="원래 적힌 이름, 약칭 등"></label>
    <div class="acts"><button class="btn" data-act="closeModal">취소</button><button class="btn pri" id="ncOk">등록</button></div>`);
  $('#ncOk').onclick = () => {
    const nm = $('#ncName').value.trim(); if (!nm) { toast('표준명을 넣어 주세요'); return; }
    if (S.db._cm.has(nm)) { toast('이미 있는 업체예요'); return; }
    const c = { name: nm, alias: $('#ncAlias').value.split(',').map((x) => x.trim()).filter(Boolean), group: '', bizNo: $('#ncBiz').value.replace(/\D/g, ''), size: $('#ncSize').value, type: $('#ncType').value, industry: $('#ncInd').value, memo: '' };
    S.db.companies.push(c); changed(`업체 등록: ${nm}`); closeModal(); toast(`${nm} 등록했어요`); done && done(c);
  };
}
// ---- 저장 · 지우기 ----
function saveRecord(f, after) {
  const db = S.db, s = stu(f.sid); if (!s) { toast('학생을 찾을 수 없어요'); return; }
  f.company = (f.company || '').trim();
  if (f.company && !db._cm.has(f.company) && f.kind !== '진학') { newCompModal(f.company, (c) => { f.company = c.name; saveRecord(f, after); }); return; }
  if (f.start && f.end && f.end < f.start) { toast('종료일이 시작일보다 빨라요'); return; }
  if (f.kind !== '현장실습') f.result = '';
  if (!PRAC_K.includes(f.kind)) { f.start = ''; f.end = ''; }
  f.est = (f.kind !== '현장실습' && !f.emp && !f.start) ? (f.est || db.settings.grad[s.gi] || '') : '';
  f.updated = nowIso();
  if (f.id) { const i = db.records.findIndex((x) => x.id === f.id); db.records[i] = f; changed(`기록 고침: ${stuLabel(s)} · ${f.kind} ${f.company}`); }
  else { f.id = uid('r'); db.records.push(f); changed(`기록 추가: ${stuLabel(s)} · ${f.kind} ${f.company}`); }
  toast('저장했어요'); after && after();
}
ACT.saveRec = () => saveRecord(S.st.form, () => { S.st.form = null; render(); });
function delRecord(id, after) {
  const db = S.db, r = db.records.find((x) => x.id === id), s = stu(r.sid);
  ask('기록 지우기', `<p>${esc(stuLabel(s))}의 <b>${esc(r.kind)} ${esc(r.company)}</b> 기록을 지울까요?<br><span class="small muted">하루 1번 보관본이 남아 있어서 관리 › 데이터 파일·백업에서 되돌릴 수 있어요.</span></p>`, '지우기', () => {
    const pos = db.records.findIndex((x) => x.id === id); db.records.splice(pos, 1); changed(`기록 지움: ${stuLabel(s)} · ${r.kind} ${r.company}`); after && after();
    toast('기록을 지웠어요', () => { S.db.records.splice(pos, 0, r); changed(`지운 기록 되돌림: ${stuLabel(s)} · ${r.kind} ${r.company}`); render(); });
  }, true);
}
ACT.delRec = () => delRecord(S.st.form.id, () => { S.st.form = null; render(); });

// ---- 학생 정보 ----
function stuModal(s) {
  const isNew = !s; s = s || { gi: S.st.gi, dept: DEPTS[0], cls: 1, no: 1, name: '', gender: '남', status: '재학중', hifiveNo: '', alias: '', memo: '', year: (S.db.students.find((x) => x.gi === S.st.gi) || { year: S.st.gi + 2017 }).year };
  modal(`<h2>${isNew ? '학생 추가' : '학생 정보 수정'}</h2>
    <div class="fl"><label class="f"><span>기수</span><input class="in" id="sGi" type="number" min="1" value="${s.gi}"></label><label class="f"><span>학과</span><select class="in" id="sDept">${opts(DEPTS, s.dept)}</select></label>
      <label class="f"><span>반</span><input class="in" id="sCls" type="number" min="1" value="${s.cls}"></label><label class="f"><span>번호</span><input class="in" id="sNo" type="number" min="1" value="${s.no}"></label></div>
    <div class="fl"><label class="f"><span>이름</span><input class="in" id="sName" value="${esc(s.name)}" autofocus></label><label class="f"><span>성별</span><select class="in" id="sGen">${opts(['남', '여'], s.gender, '-')}</select></label>
      <label class="f"><span>학적상태</span><select class="in" id="sStat">${opts(STATUS, s.status)}</select></label></div>
    <div class="fl"><label class="f"><span>회원가입 식별번호</span><input class="in" id="sHi" value="${esc(s.hifiveNo)}"></label><label class="f"><span>다른이름</span><input class="in" id="sAl" value="${esc(s.alias)}"></label></div>
    <label class="f"><span>메모</span><input class="in" id="sMemo" value="${esc(s.memo)}"></label>
    <p class="small muted">학적상태가 자퇴·전학·전과(반이동)이면 졸업 대상에서 빠져요.</p>
    <div class="acts">${!isNew && !(S.db._bySid[s.id] || []).length ? '<button class="btn danger" id="sDel" style="margin-right:auto">학생 지우기</button>' : ''}<button class="btn" data-act="closeModal">취소</button><button class="btn pri" id="sOk">저장</button></div>`);
  if ($('#sDel')) $('#sDel').onclick = () => { S.db.students = S.db.students.filter((x) => x.id !== s.id); S.st.sel = ''; closeModal(); changed(`학생 지움: ${stuLabel(s)}`); render(); };
  $('#sOk').onclick = () => {
    const v = { gi: +$('#sGi').value, dept: $('#sDept').value, cls: +$('#sCls').value, no: +$('#sNo').value, name: $('#sName').value.trim(), gender: $('#sGen').value, status: $('#sStat').value, hifiveNo: $('#sHi').value.trim(), alias: $('#sAl').value.trim(), memo: $('#sMemo').value.trim() };
    if (!v.name || !v.gi || !v.cls || !v.no) { toast('기수·반·번호·이름을 넣어 주세요'); return; }
    const nid = `${pad2(v.gi)}-${ABBR[v.dept]}${v.cls}-${pad2(v.no)}`;
    if (nid !== s.id && S.db._st.has(nid)) { toast(`${nid} 학생이 이미 있어요`); return; }
    const y = (S.db.students.find((x) => x.gi === v.gi) || { year: v.gi + 2017 }).year;
    if (isNew) { S.db.students.push(Object.assign({ id: nid, year: y }, v)); S.st.gi = v.gi; S.st.sel = nid; changed(`학생 추가: ${v.gi}기 ${nid} ${v.name}`); }
    else {
      const old = s.id; Object.assign(s, v, { id: nid, year: s.gi === v.gi ? s.year : y });
      if (nid !== old) for (const r of S.db.records) if (r.sid === old) r.sid = nid;
      S.st.sel = nid; changed(`학생 고침: ${nid} ${v.name}${nid !== old ? ` (학생ID ${old} → ${nid})` : ''}`);
    }
    closeModal(); render();
  };
}
ACT.newStu = () => stuModal(null);
ACT.editStu = () => stuModal(stu(S.st.sel));

