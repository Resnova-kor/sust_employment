// ===== 전체 기록(원장 표 · 읽기 전용) =====
const LG_COLS = [
  { k: 'gi', label: '기수', w: 58, get: (x) => x.s.gi }, { k: 'dept', label: '학과', w: 90, get: (x) => DEPTS.indexOf(x.s.dept) },
  { k: 'cls', label: '반', w: 46, get: (x) => x.s.cls }, { k: 'no', label: '번호', w: 56, get: (x) => x.s.no }, { k: 'name', label: '이름', w: 76, get: (x) => x.s.name },
  { k: 'kind', label: '구분', w: 124, get: (x) => KINDS.indexOf(x.r.kind) }, { k: 'fin', label: '현재 최종', w: 82, get: (x) => S.db._fin[x.r.id] || '' },
  { k: 'comp', label: '기업명(진학은 학교명)', w: 230, get: (x) => x.r.company }, { k: 'size', label: '규모', w: 84, get: (x) => (compInfo(x.r.company) || {}).size || '' },
  { k: 'type', label: '유형', w: 132, get: (x) => (compInfo(x.r.company) || {}).type || '' }, { k: 'ind', label: '업종', w: 116, get: (x) => (compInfo(x.r.company) || {}).industry || '' },
  { k: 'start', label: '실습시작', w: 100, get: (x) => x.r.start }, { k: 'end', label: '실습종료', w: 100, get: (x) => x.r.end }, { k: 'emp', label: '취업일', w: 100, get: (x) => x.r.emp },
  { k: 'result', label: '실습결과', w: 82, get: (x) => x.r.result }, { k: 'abroad', label: '해외', w: 140, get: (x) => x.r.abroad }, { k: 'etype', label: '고용형태', w: 82, get: (x) => x.r.empType },
  { k: 'basis', label: '근거', w: 82, get: (x) => x.r.basis }, { k: 'note', label: '비고', w: 230, wrap: true, get: (x) => x.r.note }];
// 졸업 기준 취업처(기본 통계 옵션) — '현재 최종'과 다를 때 안내
let gradMapC = null;
function gradMap() { const key = JSON.stringify(statDef());
  if (gradMapC && gradMapC.k === key && gradMapC.ref === S.db._st) return gradMapC.m;
  const gis = [...new Set(S.db.students.map((x) => x.gi))].filter((g) => S.db.settings.grad[g] && S.db.settings.grad[g] < today());
  const m = {}; for (const t of ENG.stat(S.db, gis, statDef()).T) m[t.sid] = t; gradMapC = { k: key, m, ref: S.db._st }; return m; }
function gradTip(sid, fin) { if (!fin) return ''; const t = gradMap()[sid]; if (!t) return ` data-tip="${esc('<b>현재 최종</b> = 지금까지 취업 기록 중 가장 늦은 것<br><span>졸업 전 기수라 졸업 기준 통계는 아직 없어요</span>')}"`;
  return ` data-tip="${esc(`<b>현재 최종</b> = 지금까지 취업 기록 중 가장 늦은 것<br>졸업 기준(통계·인쇄): ${t.path === '취업' ? `<b>${esc(t.company || '업체 미기재')}</b>${t.detail ? ` (${esc(t.detail)})` : ''}` : esc(t.path)}`)}"`; }
VIEWS.ledger = () => {
  const db = S.db, L = S.lg;
  const gis = [...new Set(db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const q = (L.q || '').trim(), nq = norm(q);
  let rows = db.records.map((r) => ({ r, s: stu(r.sid) })).filter((x) => x.s);
  if (L.gi.length) rows = rows.filter((x) => L.gi.includes(String(x.s.gi)));
  if (L.dept.length) rows = rows.filter((x) => L.dept.includes(x.s.dept));
  const wide = L.allRec && L.kind.length;
  if (wide) { const sids = new Set(rows.filter((x) => L.kind.includes(x.r.kind) && (!L.basis.length || L.basis.includes(x.r.basis))).map((x) => x.s.id)); rows = rows.filter((x) => sids.has(x.s.id)); }
  else {
    if (L.kind.length) rows = rows.filter((x) => L.kind.includes(x.r.kind));
    if (L.basis.length) rows = rows.filter((x) => L.basis.includes(x.r.basis));
  }
  if (L.special) { const ids = new Set(specialRecs(L.special).map((r) => r.id)); rows = rows.filter((x) => ids.has(x.r.id)); }
  if (q) rows = rows.filter((x) => x.s.name.includes(q) || (x.s.alias || '').includes(q) || norm(x.r.company).includes(nq) || (x.r.note || '').includes(q) || (x.r.abroad || '').includes(q) || x.s.id.includes(q));
  const order = new Map(); sortRecs(db.records).forEach((r, i) => order.set(r.id, i));
  rows.sort((a, b) => stuCmp(a.s, b.s) || order.get(a.r.id) - order.get(b.r.id));
  rows = sortRows(rows, LG_COLS, L);
  const MAX = 600, shown = rows.slice(0, MAX);
  const filtered = !!(L.q || L.gi.length || L.dept.length || L.kind.length || L.basis.length || L.special || L.sk);
  return `<div class="head"><div class="fl" style="align-items:baseline;gap:var(--sp-4)"><h1>전체 기록</h1>
        <span class="cnt"><b>${rows.length.toLocaleString()}</b>건 조회${rows.length !== db.records.length ? ` <span class="muted">/ 전체 ${db.records.length.toLocaleString()}건</span>` : ''}</span></div>
      <p class="muted" style="width:100%;margin:0">찾아보기용 표 · 줄을 누르면 그 학생 화면으로 가서 고칠 수 있어요${rows.length > MAX ? ` · 앞의 ${MAX}건만 표시(거르기로 좁혀 보세요)` : ''}</p></div>
    <div class="fl" style="margin-bottom:var(--sp-4)">
      <label class="f" style="flex:2 1 220px"><span>찾기</span><input class="in" id="lgQ" data-in="lgQ" type="search" value="${esc(L.q)}" placeholder="이름 · 업체 · 비고 · 해외"></label>
      ${msel('lg', 'gi', '기수', gis.map((g) => [g, g + '기']))}
      ${msel('lg', 'dept', '학과', DEPTS.map((d) => [d, d]))}
      ${msel('lg', 'kind', '구분', KINDS.map((k) => [k, k]))}
      <label class="ro allrec ${L.kind.length ? '' : 'off'}" title="고른 구분의 기록이 있는 학생이면 다른 구분 기록도 함께 보여요"><input type="checkbox" data-in="lgAll" ${L.allRec ? 'checked' : ''} ${L.kind.length ? '' : 'disabled'}><span>그 학생의<br>모든 기록</span></label>
      ${msel('lg', 'basis', '근거', [['HIFIVE', 'HIFIVE'], ['직접입력', '직접입력']])}
      ${L.special ? `<span class="chip">${SPECIAL_L[L.special]}만</span>` : ''}
      <button class="btn" style="align-self:flex-end" data-act="lgReset" ${filtered ? '' : 'disabled'}>초기화</button>
    </div>
    <div class="tbox" data-keep="lgBox" style="max-height:calc(100vh - 210px)"><table class="t num fixed" style="width:${LG_COLS.reduce((t, c) => t + c.w, 0)}px">${sortHead(LG_COLS, L, 'lgSort')}
      <tbody>${shown.map(({ r, s }) => { const c = compInfo(r.company) || {}; const fin = db._fin[r.id] || '';
        return `<tr class="click ${fin === '이전' ? 'prev' : ''} ${wide ? (L.kind.includes(r.kind) ? 'hit' : 'dim') : ''}" data-act="lgOpen" data-id="${esc(r.id)}" title="${esc(s.name)} 학생 화면으로"><td>${s.gi}기</td><td>${deptTag(s.dept)}</td><td class="r">${s.cls}</td><td class="r">${s.no}</td><td>${esc(s.name)}</td><td>${esc(r.kind)}</td><td${gradTip(s.id, fin)}>${fin}</td>
        <td class="cn" title="${esc(r.company)}">${esc(r.company)}</td><td>${esc(c.size || '')}</td><td>${esc(c.type || '')}</td><td>${esc(c.industry || '')}</td><td>${esc(r.start)}</td><td>${esc(r.end)}</td><td>${esc(r.emp)}</td><td>${esc(r.result)}</td><td title="${esc(r.abroad)}">${esc(r.abroad)}</td><td>${esc(r.empType)}</td>
        <td class="${r.basis === 'HIFIVE' ? 'ok' : 'muted'}" style="font-weight:400">${esc(r.basis)}</td><td class="wrap">${esc(r.note)}</td></tr>`; }).join('') || '<tr><td colspan="19" class="empty">맞는 기록이 없어요</td></tr>'}</tbody></table></div>`;
};
INP.lgQ = (el) => { S.lg.q = el.value; render(); };
ACT.lgSort = (el) => { toggleSort(S.lg, el.dataset.k); render(); };
INP.lgAll = (el) => { S.lg.allRec = el.checked; render(); };
ACT.lgReset = () => { S.lg = lgInit(); S.msOpen = null; render(); };
ACT.lgOpen = (el) => { const r = S.db.records.find((x) => x.id === el.dataset.id); if (!r) return; const s = stu(r.sid);
  S.view = 'students'; S.st.gi = s.gi; S.st.grp = ''; S.st.q = ''; S.st.sel = s.id; S.st.form = null; S.st.hl = r.id; render();
  const c = document.querySelector('.rec.hl'); if (c) c.scrollIntoView({ block: 'center' }); };

