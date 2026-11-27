// ===== 업체 =====
VIEWS.companies = () => {
  const db = S.db, C = S.cp;
  const q = (C.q || '').trim(), nq = norm(q);
  const stuCnt = {}; for (const r of db.records) if (r.company) (stuCnt[r.company] = stuCnt[r.company] || new Set()).add(r.sid);
  let list = db.companies.slice();
  if (q) list = list.filter((c) => norm(c.name).includes(nq) || (c.alias || []).some((a) => norm(a).includes(nq)) || (c.bizNo || '').includes(q.replace(/\D/g, '') || '@'));
  if (C.blank) list = list.filter((c) => !c.size);
  if (C.size.length) list = list.filter((c) => C.size.includes(c.size));
  if (C.type.length) list = list.filter((c) => C.type.includes(c.type));
  if (C.ind.length) list = list.filter((c) => C.ind.includes(c.industry));
  const n = (c) => (stuCnt[c.name] ? stuCnt[c.name].size : 0);
  list.sort((a, b) => (norm(a.name) < norm(b.name) ? -1 : 1));
  const ALL = [{ k: 'name', label: '표준명', w: 230, get: (c) => norm(c.name), td: (c) => `<td title="${esc(c.name)}"><b>${esc(c.name)}</b></td>` },
    { k: 'size', label: '규모', w: 84, get: (c) => c.size, td: (c) => `<td>${esc(c.size)}</td>` }, { k: 'type', label: '유형', w: 120, get: (c) => c.type, td: (c) => `<td>${esc(c.type)}</td>` },
    { k: 'ind', label: '업종', w: 118, get: (c) => c.industry, td: (c) => `<td>${esc(c.industry)}</td>` }, { k: 'grp', label: '그룹', w: 80, get: (c) => c.group, td: (c) => `<td>${esc(c.group)}</td>` },
    { k: 'cnt', label: '학생', w: 56, get: (c) => n(c) || '', td: (c) => `<td class="num">${n(c) || ''}</td>` },
    { k: 'alias', label: '별칭', w: 240, wrap: true, get: (c) => (c.alias || []).join(', '), td: (c) => `<td class="wrap small muted">${esc((c.alias || []).join(', '))}</td>` }];
  const CP_COLS = C.sel ? ALL.filter((c) => !['grp', 'alias', 'type'].includes(c.k)) : ALL;
  list = sortRows(list, CP_COLS, C);
  const sel = C.sel && db._cm.get(C.sel);
  return `<div style="display:flex;gap:var(--sp-5);align-items:flex-start">
    <div style="flex:1;min-width:0">
      <div class="head"><div><h1>업체</h1><p class="muted">표준명은 법인격 포함 · 바뀐 사명은 지금 이름으로</p></div>
        <div class="fl"><span class="small muted">${list.length}곳</span><button class="btn pri" data-act="cpNew">+ 업체</button></div></div>
      <div class="fl" style="margin-bottom:var(--sp-4)">
        <label class="f" style="flex:2 1 220px"><span>찾기</span><input class="in" id="cpQ" data-in="cpQ" type="search" value="${esc(C.q)}" placeholder="이름 · 별칭 · 사업자번호"></label>
        ${msel('cp', 'size', '규모', SIZES.map((x) => [x, x]))}
        ${msel('cp', 'type', '유형', TYPES.map((x) => [x, x]))}
        ${msel('cp', 'ind', '업종', INDS.map((x) => [x, x]))}
        ${C.blank ? '<span class="chip" style="align-self:flex-end">규모가 빈 업체만</span>' : ''}
        <button class="btn" style="align-self:flex-end" data-act="cpReset" ${C.q || C.size.length || C.type.length || C.ind.length || C.blank ? '' : 'disabled'}>초기화</button>
      </div>
      <div class="tbox" data-keep="cpBox" style="max-height:calc(100vh - 210px)"><table class="t fixed" style="min-width:${CP_COLS.reduce((t, c) => t + c.w, 0)}px">${sortHead(CP_COLS, C, 'cpSort')}<tbody>
      ${list.map((c) => `<tr class="click ${C.sel === c.name ? 'sel' : ''}" data-act="cpPick" data-n="${esc(c.name)}">${CP_COLS.map((col) => col.td(c)).join('')}</tr>`).join('') || `<tr><td colspan="${CP_COLS.length}" class="empty">없어요</td></tr>`}
      </tbody></table></div>
    </div>
    ${sel ? `<aside class="card raised" style="width:360px;flex:0 0 360px;position:sticky;top:16px;max-height:calc(100vh - 32px);overflow:auto;display:flex;flex-direction:column;gap:var(--sp-3)">${compDetail(sel)}</aside>` : ''}
  </div>`;
};
function compDetail(c) {
  const db = S.db, recs = db.records.filter((r) => r.company === c.name);
  const byGi = {}; for (const r of recs) { const s = stu(r.sid); if (s) (byGi[s.gi] = byGi[s.gi] || []).push([s, r]); }
  return `<div class="fl" style="justify-content:space-between"><h2>업체 정보</h2><button class="btn sm" data-act="cpClose" aria-label="닫기">닫기</button></div>
    <label class="f"><span>표준명</span><input class="in" id="cName" value="${esc(c.name)}"></label>
    <div class="fl"><label class="f"><span>규모</span><select class="in" id="cSize">${opts(SIZES, c.size, c.size ? null : '(고르세요)')}</select></label><label class="f"><span>유형</span><select class="in" id="cType">${opts(TYPES, c.type, '-')}</select></label></div>
    <div class="fl"><label class="f"><span>업종</span><select class="in" id="cInd">${opts(INDS, c.industry, '-')}</select></label><label class="f"><span>그룹</span><input class="in" id="cGrp" value="${esc(c.group)}" placeholder="예: MAP 그룹"></label></div>
    <label class="f"><span>사업자번호</span><input class="in" id="cBiz" value="${esc(c.bizNo)}"></label>
    <label class="f"><span>별칭(쉼표로 구분)</span><textarea class="in" id="cAl" rows="2">${esc((c.alias || []).join(', '))}</textarea></label>
    <label class="f"><span>메모</span><input class="in" id="cMemo" value="${esc(c.memo)}"></label>
    <div class="fl"><button class="btn pri" style="flex:1" data-act="cpSave">저장</button><button class="btn" data-act="cpMerge">다른 업체로 합치기</button></div>
    ${recs.length ? '' : '<button class="btn danger sm" style="align-self:flex-start" data-act="cpDel">이 업체 지우기</button>'}
    <h3 style="margin-top:var(--sp-3)">이 업체 기록 ${recs.length}건</h3>
    ${Object.keys(byGi).sort((a, b) => a - b).map((g) => `<div><div class="small muted" style="font-weight:700">${g}기</div>${byGi[g].map(([s, r]) => `<div class="small"><a href="#" data-act="cpToStu" data-id="${esc(s.id)}">${esc(s.name)}</a> <span class="muted">${esc(grpOf(s))} · ${esc(r.kind)}${db._fin[r.id] === '이전' ? '(이전)' : ''}</span></div>`).join('')}</div>`).join('')}`;
}
INP.cpQ = (el) => { S.cp.q = el.value; render(); };
ACT.cpReset = () => { Object.assign(S.cp, { q: '', size: [], type: [], ind: [], blank: false }); S.msOpen = null; render(); };
ACT.cpSort = (el) => { toggleSort(S.cp, el.dataset.k); render(); };
ACT.cpPick = (el) => { S.cp.sel = el.dataset.n; render(); };
ACT.cpClose = () => { S.cp.sel = ''; render(); };
ACT.cpNew = () => newCompModal('', (c) => { S.cp.sel = c.name; render(); });
ACT.cpToStu = (el, e) => { e.preventDefault(); const s = stu(el.dataset.id); S.view = 'students'; S.st.gi = s.gi; S.st.grp = ''; S.st.q = ''; S.st.sel = s.id; S.st.form = null; render(); };
ACT.cpSave = () => {
  const db = S.db, c = db._cm.get(S.cp.sel), nm = $('#cName').value.trim();
  if (!nm) { toast('표준명을 넣어 주세요'); return; }
  if (nm !== c.name && db._cm.has(nm)) { toast('같은 이름의 업체가 있어요. 합치기를 쓰세요'); return; }
  const old = c.name;
  Object.assign(c, { name: nm, size: $('#cSize').value, type: $('#cType').value, industry: $('#cInd').value, group: $('#cGrp').value.trim(), bizNo: $('#cBiz').value.replace(/\D/g, ''), alias: $('#cAl').value.split(',').map((x) => x.trim()).filter(Boolean), memo: $('#cMemo').value.trim() });
  let moved = 0;
  if (nm !== old) { if (!c.alias.includes(old)) c.alias.push(old); for (const r of db.records) if (r.company === old) { r.company = nm; moved++; } }
  S.cp.sel = nm; changed(nm !== old ? `업체 이름 바꿈: ${old} → ${nm} (기록 ${moved}건)` : `업체 고침: ${nm}`); toast('저장했어요'); render();
};
ACT.cpDel = () => {
  const nm = S.cp.sel, pos = S.db.companies.findIndex((c) => c.name === nm), c = S.db.companies[pos]; if (!c) return;
  S.db.companies.splice(pos, 1); S.cp.sel = ''; changed(`업체 지움: ${nm}`); render();
  toast('업체를 지웠어요', () => { S.db.companies.splice(pos, 0, c); S.cp.sel = nm; changed(`지운 업체 되돌림: ${nm}`); render(); });
};
ACT.cpMerge = () => {
  const from = S.cp.sel;
  modal(`<h2>다른 업체로 합치기</h2><p><b>${esc(from)}</b>의 기록을 모두 고른 업체로 옮기고, 이 이름은 그 업체의 별칭으로 남겨요.</p>
    <label class="f"><span>합칠 업체</span><input class="in" id="mgQ" autofocus placeholder="이름 일부"></label><ul class="list-plain" id="mgList" style="max-height:260px;overflow:auto"></ul>
    <div class="acts"><button class="btn" data-act="closeModal">취소</button></div>`);
  const draw = () => { const items = searchComp($('#mgQ').value, 15).filter((c) => c.name !== from); $('#mgList').innerHTML = items.map((c) => `<li><span>${esc(c.name)} <span class="small muted">${esc(c.size)}</span></span><button class="btn sm" data-nm="${esc(c.name)}">여기로 합치기</button></li>`).join('');
    $('#mgList').querySelectorAll('button').forEach((b) => (b.onclick = () => doMerge(from, b.dataset.nm))); };
  $('#mgQ').oninput = draw;
};
function doMerge(from, to) {
  const db = S.db, a = db._cm.get(from), b = db._cm.get(to); let n = 0;
  for (const r of db.records) if (r.company === from) { r.company = to; n++; }
  b.alias = [...new Set((b.alias || []).concat([from], a.alias || []))].filter((x) => x !== to);
  if (!b.bizNo && a.bizNo) b.bizNo = a.bizNo;
  db.companies = db.companies.filter((c) => c.name !== from);
  closeModal(); S.cp.sel = to; changed(`업체 합침: ${from} → ${to} (기록 ${n}건)`); toast('합쳤어요'); render();
}

