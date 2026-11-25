// ===== v4 인쇄 · 서식 엑셀 =====
S.pr = null;
function pr() {
  if (!S.pr) { const d = soDefault(); S.pr = { kind: 'gi', gi: d.gis[d.gis.length - 1] || 1, gis: d.gis.slice(), src: 'def' }; }
  return S.pr;
}
const DLIGHT = { 산업설비: '#DDEBF7', 공정플랜트: '#E2EFDA', 전기통신: '#FCE4D6', 시설물건설: '#E4DFEC' };
const DDARK = { 산업설비: '#1F4E79', 공정플랜트: '#375623', 전기통신: '#843C0C', 시설물건설: '#3F2A56' };
const PGRP = ['공공', '대기업', '중견', '중소', '해외·기타'];
function grpOfComp(name) {
  const c = compInfo(name); if (!c) return '해외·기타';
  if (['공기업·공공기관', '공무원', '군(부사관)'].includes(c.type) || c.size === '공공') return '공공';
  return ['대기업', '중견', '중소'].includes(c.size) ? c.size : '해외·기타';
}
function prOpt() {
  const p = pr();
  return Object.assign(statDef(), { baseMode: 'grad', base: '' });
}
function cutOf(gi, o) { const b = o.base || S.db.settings.grad[gi]; if (!b) return ''; const x = new Date(b + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + Math.floor((+o.months || 0) * 30.5)); return x.toISOString().slice(0, 10); }
const recD = (r) => r.emp || r.est || r.start || '';
// 학생별 정리: 최종(취업·실습만), 이전 취업처, 기타 진로
function prData(gis, o) {
  const res = ENG.stat(S.db, gis, o), T = res.T.filter((t) => t.target);
  const rec = new Map(S.db.records.map((r) => [r.id, r]));
  const ent = [];   // {s, gi, comp, kind:'emp'|'prac'|'prev', note}
  const etc = [];   // {s, path, note}
  for (const t of T) {
    const s = stu(t.sid), cut = cutOf(t.gi, o), last = rec.get(t.rec);
    if (t.path === '취업' && t.detail !== '가업승계') {
      ent.push({ s, gi: t.gi, comp: t.company || '(업체 미기재)', kind: t.detail === '실습만' ? 'prac' : 'emp' });
      // 이직 전 취업처 · 다른 곳에서 한 실습 → 취소선(인원에는 안 셈)
      const seen = new Set([t.company]);
      for (const r of S.db._bySid[t.sid] || []) {
        if (r.id === t.rec || !r.company || seen.has(r.company)) continue;
        const isEmp = t.detail !== '실습만' && ENG.EMP.includes(r.kind) && recD(r) && recD(r) <= cut;
        const isPrac = (r.kind === '현장실습' || r.kind === '채용전환') && (!r.start || r.start <= cut);
        if (isEmp || isPrac) { seen.add(r.company); ent.push({ s, gi: t.gi, comp: r.company, kind: 'prev' }); }
      }
    } else {
      const p = t.detail === '가업승계' || t.path === '가업승계' ? '가업승계' : t.path;
      etc.push({ s, gi: t.gi, path: p, note: p === '진학' && last && last.company ? last.company : (p === '가업승계' && t.company ? t.company : (last && last.note ? last.note : '')) });
    }
  }
  return { T, ent, etc, o };
}
const dTag = (d) => `<span class="pd" style="background:${DLIGHT[d]};color:${DDARK[d]}">${ABBR[d]}</span>`;
function nameList(list) {
  const cur = list.filter((e) => e.kind === 'emp').sort((a, b) => stuCmp(a.s, b.s)), pr_ = list.filter((e) => e.kind === 'prac').sort((a, b) => stuCmp(a.s, b.s)), pv = list.filter((e) => e.kind === 'prev').sort((a, b) => stuCmp(a.s, b.s));
  const nm = (e) => `<span class="nm" style="color:${DDARK[e.s.dept]}">${esc(e.s.name)}</span>`;
  return [cur.map(nm).join(', '), pr_.length ? pr_.map((e, i) => (i === 0 ? `<span class="nm"><i class="pp">실습</i> ${nm(e)}</span>` : nm(e))).join(', ') : '', pv.length ? pv.map((e) => `<s class="nm">${nm(e)}</s>`).join(', ') : ''].filter(Boolean).join(', ');
}
// ---- 기수별 취업처 ----
function sheetGi(gi, o) {
  const D = prData([gi], o), first = S.db.students.find((s) => s.gi === gi) || { year: gi + 2017 };
  const byG = {}; for (const e of D.ent) { const g = e.comp === '(업체 미기재)' ? '해외·기타' : grpOfComp(e.comp); ((byG[g] = byG[g] || {})[e.comp] = byG[g][e.comp] || []).push(e); }
  const cnt = (arr) => arr.filter((e) => e.kind !== 'prev').length;
  const T = D.T, n = T.length, emp = T.filter((t) => t.path === '취업').length, c = (p) => T.filter((t) => t.path === p).length;
  const go = c('진학'), army = c('입대'), d = n - (o.denom === 'excl' ? go + army : 0);
  // 위 요약
  const sumRows = PGRP.map((g) => { const cs = byG[g] || {}; const all = Object.values(cs).flat(); return [g, Object.keys(cs).filter((k) => cnt(cs[k])).length, cnt(all), all.filter((e) => e.kind === 'prac').length]; });
  const tot = sumRows.reduce((a, r) => [a[0], a[1] + r[1], a[2] + r[2], a[3] + r[3]], ['합계', 0, 0, 0]);
  const paths = [['진학', go], ['입대', army], ['가업승계', D.etc.filter((x) => x.path === '가업승계').length], ['취업·진학 준비', c('취업·진학 준비')], ['기타(제외인정)', c('기타')], ['기록 없음', c('기록 없음')]];
  const head = `<div class="ph"><img class="plogo" src="${LOGO_L}" alt=""><h1>마이스터고 ${gi}기 취업처 <span>(${first.year}학년도 3학년 · ${first.year + 1}년 졸업)</span></h1>
    <div class="leg">${DEPTS.map((x) => `${dTag(x)} ${x}`).join(' ')} &nbsp; <b>굵게</b> = 취업 · <i class="pp">실습</i> = 실습만 · <s>취소선</s> = 이직 전·다른 곳 실습(인원 제외)</div></div>
    <div class="ptop"><table class="pt"><thead><tr><th>분류</th><th>업체 수</th><th>인원</th><th>실습만</th></tr></thead><tbody>${sumRows.map((r) => `<tr><td class="l">${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3] || ''}</td></tr>`).join('')}<tr class="tt"><td class="l">합계</td><td>${tot[1]}</td><td><b>${tot[2]}</b></td><td>${tot[3] || ''}</td></tr></tbody></table>
      <table class="pt"><thead><tr><th colspan="4">진로 (기준일 ${esc(cutOf(gi, o))})</th></tr></thead><tbody>
        <tr><td class="l"><b>졸업 대상</b></td><td><b>${n}</b></td><td class="l"><b>취업</b></td><td><b>${emp}</b></td></tr>
        ${[0, 2, 4].map((i) => `<tr><td class="l">${paths[i][0]}</td><td>${paths[i][1] || '–'}</td><td class="l">${paths[i + 1][0]}</td><td>${paths[i + 1][1] || '–'}</td></tr>`).join('')}</tbody></table>
      <table class="pt rate"><thead><tr><th>취업률</th></tr></thead><tbody><tr><td><span class="small">${o.denom === 'excl' ? '대상 − 진학 − 입대' : '졸업 대상 전체'}</span><b>${pct(d ? emp / d : 0)}</b></td></tr>
        <tr><td><span class="small">${o.denom === 'excl' ? '졸업 대상 전체' : '대상 − 진학 − 입대'}</span><b>${pct((o.denom === 'excl' ? n : n - go - army) ? emp / (o.denom === 'excl' ? n : n - go - army) : 0)}</b></td></tr></tbody></table></div>
    <p class="pnote">· ${esc(optText(Object.assign({ dept: '' }, o)))}<br>· 인원 = 최종 취업처 기준(실습만 포함)</p>`;
  // 본문
  let body = '';
  const grpBlock = (g, rowsHtml, nrows) => `<tbody class="pg">${rowsHtml.map((r, i) => `<tr>${i === 0 ? `<td class="cat" rowspan="${nrows}">${[...g].join('<br>')}</td>` : ''}${r}</tr>`).join('')}</tbody>`;
  for (const g of PGRP) {
    const cs = byG[g]; if (!cs) continue;
    const names = Object.keys(cs).sort((a, b) => cnt(cs[b]) - cnt(cs[a]) || (a < b ? -1 : 1));
    const rows = [];
    for (const nmc of names) {
      const ds = DEPTS.filter((x) => cs[nmc].some((e) => e.s.dept === x)); const ci = compInfo(nmc) || {};
      ds.forEach((dd, i) => rows.push(`${i === 0 ? `<td class="cm" rowspan="${ds.length}">${esc(nmc)}</td><td class="ind" rowspan="${ds.length}">${esc(ci.industry || '')}</td><td class="nn" rowspan="${ds.length}">${cnt(cs[nmc]) || ''}</td>` : ''}<td class="dp" style="background:${DLIGHT[dd]};color:${DDARK[dd]}">${ABBR[dd]}</td><td class="nl">${nameList(cs[nmc].filter((e) => e.s.dept === dd))}</td>`));
    }
    body += grpBlock(g, rows, rows.length);
  }
  const ETC = ['진학', '가업승계', '입대', '취업·진학 준비', '기타', '기록 없음'];
  const rows = [];
  for (const p of ETC) {
    const arr = D.etc.filter((x) => x.path === p); if (!arr.length) continue;
    const ds = DEPTS.filter((x) => arr.some((e) => e.s.dept === x));
    const lab = p === '기타' ? '기타(제외인정)' : p === '가업승계' && o.gaup ? '가업승계 (취업으로 셈)' : p;
    ds.forEach((dd, i) => rows.push(`${i === 0 ? `<td class="cm" rowspan="${ds.length}">${esc(lab)}</td><td class="ind" rowspan="${ds.length}"></td><td class="nn" rowspan="${ds.length}">${arr.length}</td>` : ''}<td class="dp" style="background:${DLIGHT[dd]};color:${DDARK[dd]}">${ABBR[dd]}</td><td class="nl">${arr.filter((e) => e.s.dept === dd).sort((a, b) => stuCmp(a.s, b.s)).map((e) => `<span style="color:${DDARK[dd]}">${esc(e.s.name)}${e.note && (p === '진학' || p === '가업승계') ? `<span class="nt">[${esc(e.note)}]</span>` : ''}</span>`).join(', ')}</td>`));
  }
  if (rows.length) body += grpBlock('기타', rows, rows.length);
  return `<section class="sheet">${head}<table class="pm"><colgroup><col style="width:7mm"><col style="width:36mm"><col style="width:17mm"><col style="width:10.5mm"><col style="width:10.5mm"><col></colgroup>
    <thead><tr><th></th><th>업체</th><th>업종</th><th>인원</th><th>학과</th><th>명단</th></tr></thead>${body}</table></section>`;
}
// ---- 기업별 명단 ----
function compGrpKey(name, mode) { if (mode === 'ind') { const c = compInfo(name); return (c && c.industry) || '기타'; } return name === '(업체 미기재)' ? '해외·기타' : grpOfComp(name); }
const compGrps = (mode) => (mode === 'ind' ? INDS : PGRP);
function sheetComp(gis, o) {
  const p = pr(), mode = p.cgrp || 'size', D = prData(gis, o), byG = {};
  for (const e of D.ent) { const g = compGrpKey(e.comp, mode); ((byG[g] = byG[g] || {})[e.comp] = byG[g][e.comp] || []).push(e); }
  const cnt = (arr) => arr.filter((e) => e.kind !== 'prev').length;
  let out = '';
  for (const g of compGrps(mode)) {
    const cs = byG[g]; if (!cs || (p.cgOff || []).includes(g)) continue;
    const names = Object.keys(cs).sort((a, b) => cnt(cs[b]) - cnt(cs[a]) || (a < b ? -1 : 1));
    const all = Object.values(cs).flat();
    const rows = names.map((n) => { const ci = compInfo(n) || {}, list = cs[n];
      const lines = gis.filter((gg) => list.some((e) => e.gi === gg)).map((gg) => `<div class="gl"><b>${gg}기</b><span>${DEPTS.filter((dd) => list.some((e) => e.gi === gg && e.s.dept === dd)).map((dd) => `${dTag(dd)} ${nameList(list.filter((e) => e.gi === gg && e.s.dept === dd))}`).join(' &nbsp;')}</span></div>`).join('');
      return `<tr><td class="cm">${esc(n)}</td><td>${esc(ci.size || '')}</td><td class="ind">${esc(ci.industry || '')}</td><td class="nn">${cnt(list)}</td>${gis.map((gg, i) => `<td class="gc ${i % 2 ? 'z' : ''}">${cnt(list.filter((e) => e.gi === gg)) || ''}</td>`).join('')}<td class="nl">${lines}</td></tr>`; }).join('');
    out += `<section class="sheet ${out ? 'brk' : ''}"><div class="ph"><img class="plogo" src="${LOGO_L}" alt=""><h1>기업별 취업자 — ${g} <span>${names.filter((k) => cnt(cs[k])).length}곳 · ${cnt(all)}명 · ${gis[0]}~${gis[gis.length - 1]}기</span></h1>
      <div class="leg">${DEPTS.map((x) => `${dTag(x)} ${x}`).join(' ')} &nbsp; <i class="pp">실습</i> = 실습만 · <s>취소선</s> = 이직 전·다른 곳 실습(인원 제외) · 인원 많은 순</div></div>
      <table class="pm pc"><colgroup><col style="width:30mm"><col style="width:10mm"><col style="width:15mm"><col style="width:8mm">${gis.map(() => '<col style="width:4.6mm">').join('')}<col></colgroup>
      <thead><tr><th rowspan="2">업체</th><th rowspan="2">규모</th><th rowspan="2">업종</th><th rowspan="2">인원</th><th colspan="${gis.length}">기수별 인원</th><th rowspan="2">명단</th></tr><tr>${gis.map((gg, i) => `<th class="gc ${i % 2 ? 'z' : ''}">${gg}</th>`).join('')}</tr></thead>
      <tbody>${rows}<tr class="tt"><td class="cm">${g} 합계</td><td></td><td></td><td class="nn">${cnt(all)}</td>${gis.map((gg, i) => `<td class="gc ${i % 2 ? 'z' : ''}">${cnt(all.filter((e) => e.gi === gg)) || ''}</td>`).join('')}<td></td></tr></tbody></table>
      <p class="pnote">· ${esc(optText(Object.assign({ dept: '' }, o)))}</p></section>`;
  }
  return out || '<section class="sheet"><p>고른 묶음에 취업자가 없어요</p></section>';
}
// ---- 화면 ----
VIEWS.print = () => {
  const p = pr(), o = prOpt(), all = [...new Set(S.db.students.map((s) => s.gi))].sort((a, b) => a - b);
  const gis = p.gis.slice().sort((a, b) => a - b);
  const sheet = p.kind === 'gi' ? sheetGi(p.gi, o) : (gis.length ? sheetComp(gis, o) : '<section class="sheet"><p>기수를 골라 주세요</p></section>');
  return `<div class="statw prw"><aside class="opt noprint" aria-label="인쇄 설정"><h2>인쇄·엑셀</h2>
      <fieldset><legend>인쇄할 것</legend><label class="ro"><input type="radio" name="pk" data-in="prK" value="gi" ${p.kind === 'gi' ? 'checked' : ''}><span>기수별 취업처</span></label><label class="ro"><input type="radio" name="pk" data-in="prK" value="comp" ${p.kind === 'comp' ? 'checked' : ''}><span>기업별 명단</span></label></fieldset>
      ${p.kind === 'gi' ? `<fieldset><legend>기수</legend><select class="in" data-in="prGi">${opts(all.map((g) => [g, `${g}기`]), p.gi)}</select></fieldset>`
        : `<fieldset><legend>기수</legend><div class="gis">${all.map((g) => `<label class="gchip ${gis.includes(g) ? 'on' : ''}"><input type="checkbox" data-in="prGis" value="${g}" ${gis.includes(g) ? 'checked' : ''}>${g}기</label>`).join('')}</div></fieldset>
        <fieldset><legend>묶는 기준</legend><label class="ro"><input type="radio" name="pcg" data-in="prCg" value="size" ${(p.cgrp || 'size') === 'size' ? 'checked' : ''}><span>규모별</span></label><label class="ro"><input type="radio" name="pcg" data-in="prCg" value="ind" ${p.cgrp === 'ind' ? 'checked' : ''}><span>업종별</span></label>
          <div class="gis cgs">${compGrps(p.cgrp || 'size').map((g) => { const on = !(p.cgOff || []).includes(g); return `<label class="gchip ${on ? 'on' : ''}"><input type="checkbox" data-in="prCgOn" value="${esc(g)}" ${on ? 'checked' : ''}>${esc(g)}</label>`; }).join('')}</div></fieldset>`}
      <fieldset><legend>통계 기준</legend><p class="small" style="margin:0"><b>기본 통계 옵션</b> · ${esc(optShort(Object.assign({ baseMode: 'grad', dept: '' }, o)))}</p>
        <a href="#" class="small" data-act="go" data-v="stats">통계 화면에서 바꾸기 ›</a></fieldset>
      <button class="btn pri" data-act="prPrint">인쇄 · PDF 저장</button>
      <p class="small muted" style="margin:0">PDF: 인쇄 창 › 대상 ‘PDF로 저장’<br>A4 세로 · ‘배경 그래픽’ 켜기</p>
      <hr style="border:0;border-top:1px solid var(--line);width:100%">
      <h3>엑셀</h3><button class="btn" data-act="exLedger">원장 엑셀 내보내기</button><span class="small muted">통계표 엑셀은 통계 화면에서 저장해요</span>
    </aside><main class="sm pvw">${sheet}</main></div>`;
};
INP.prK = (el) => { pr().kind = el.value; render(); };
INP.prGi = (el) => { pr().gi = +el.value; render(); };
INP.prCg = (el) => { const p = pr(); p.cgrp = el.value; p.cgOff = []; render(); };
INP.prCgOn = (el) => { const p = pr(); p.cgOff = (p.cgOff || []).filter((g) => g !== el.value); if (!el.checked) p.cgOff.push(el.value); render(); };
INP.prS = (el) => { pr().src = el.value; render(); };
INP.prGis = (el) => { const p = pr(), g = +el.value; p.gis = el.checked ? [...new Set(p.gis.concat([g]))] : p.gis.filter((x) => x !== g); render(); };
ACT.prPrint = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };

// ---- 서식 엑셀 ----
const XS = {
  head: { font: { bold: true, color: { rgb: 'FFFFFF' }, name: '맑은 고딕', sz: 10 }, fill: { fgColor: { rgb: '2A2357' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: 'D0D0D0' } }, bottom: { style: 'thin', color: { rgb: 'D0D0D0' } }, left: { style: 'thin', color: { rgb: 'D0D0D0' } }, right: { style: 'thin', color: { rgb: 'D0D0D0' } } } },
  cell: { font: { name: '맑은 고딕', sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'D9D6E2' } }, bottom: { style: 'thin', color: { rgb: 'D9D6E2' } }, left: { style: 'thin', color: { rgb: 'D9D6E2' } }, right: { style: 'thin', color: { rgb: 'D9D6E2' } } } },
  title: { font: { name: '맑은 고딕', sz: 14, bold: true, color: { rgb: '2A2357' } } },
  note: { font: { name: '맑은 고딕', sz: 9, color: { rgb: '524A71' } } },
};
function xSheet(title, note, head, rows, o = {}) {
  const aoa = [[title], [note || ''], [], head].concat(rows);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const R0 = 3;
  ws.A1.s = XS.title; if (ws.A2) ws.A2.s = XS.note;
  head.forEach((h, c) => { const a = XLSX.utils.encode_cell({ r: R0, c }); ws[a].s = XS.head; });
  rows.forEach((row, i) => row.forEach((v, c) => {
    const a = XLSX.utils.encode_cell({ r: R0 + 1 + i, c }); if (!ws[a]) ws[a] = { t: 's', v: '' };
    const st = JSON.parse(JSON.stringify(XS.cell));
    if ((o.left || []).includes(c)) st.alignment.horizontal = 'left';
    if ((o.wrap || []).includes(c)) st.alignment.wrapText = true;
    if (o.total && o.total(row)) { st.font.bold = true; st.fill = { fgColor: { rgb: 'ECEBF5' } }; }
    else if (o.zebra && i % 2) st.fill = { fgColor: { rgb: 'F4F3F8' } };
    if ((o.pct || []).includes(c) && typeof v === 'number') { ws[a].z = '0.0%'; }
    ws[a].s = st;
  }));
  ws['!cols'] = (o.widths || head.map(() => 11)).map((w) => ({ wch: w }));
  if (o.hidden) for (const c of o.hidden) ws['!cols'][c] = Object.assign(ws['!cols'][c] || {}, { hidden: true });
  ws['!rows'] = [{ hpt: 22 }, { hpt: 16 }, { hpt: 6 }, { hpt: 30 }];
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: R0, c: 0 }, e: { r: R0 + rows.length, c: head.length - 1 } }) };
  ws['!freeze'] = { xSplit: 0, ySplit: R0 + 1 };
  ws['!views'] = [{ state: 'frozen', ySplit: R0 + 1, topLeftCell: XLSX.utils.encode_cell({ r: R0 + 1, c: 0 }) }];
  if (o.merge !== false) ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(8, head.length - 1) } }, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.min(12, head.length - 1) } }];
  return ws;
}
ACT.exLedger = () => {
  const db = S.db, wb = XLSX.utils.book_new();
  const recs = db.records.map((r) => ({ r, s: stu(r.sid) })).filter((x) => x.s);
  const order = new Map(); sortRecs(db.records).forEach((r, i) => order.set(r.id, i));
  recs.sort((a, b) => stuCmp(a.s, b.s) || order.get(a.r.id) - order.get(b.r.id));
  const H = ['기수(학년도)', '학과', '반', '번호', '이름', '구분', '이직구분', '기업명(진학은 학교명)', '사업자번호', '규모', '유형', '업종', '실습분야', '현장실습시작일', '현장실습종료일', '취업일', '실습결과', '해외', '고용형태', '취업형태', '근거', '비고', '현장실습번호'];
  const rows = recs.map(({ r, s }) => { const c = compInfo(r.company) || {}; return [`${s.gi}기 (${s.year})`, s.dept, s.cls, s.no, s.name, r.kind, db._fin[r.id] || '', r.company, r.bizNo || c.bizNo || '', c.size || '', c.type || '', c.industry || '', r.field, r.start, r.end, r.emp, r.result, r.abroad, r.empType, r.empForm, r.basis, r.note, r.pracNo]; });
  XLSX.utils.book_append_sheet(wb, xSheet(`현장실습·취업 이력 원장 — ${rows.length}건`, `한 학생의 기록은 시간 순 · 이직구분: 최종 = 가장 최근 취업처, 이전 = 이직 전 · 실습결과: 현장실습 기록만 · 숨김 칸 W = 현장실습번호 · 내보낸 날 ${today()}`, H, rows,
    { widths: [11, 10, 4, 5, 8, 13, 8, 28, 12, 7, 12, 12, 12, 12, 12, 11, 9, 16, 9, 9, 9, 30, 10], left: [7, 21], wrap: [21], hidden: [22] }), '이력');
  const st = db.students.slice().sort(stuCmp).map((s) => [`${s.gi}기 (${s.year})`, s.dept, s.cls, s.no, s.name, s.gender, s.hifiveNo, s.status, ENG.target(s) ? '대상' : '제외', s.alias, s.memo]);
  XLSX.utils.book_append_sheet(wb, xSheet(`학생 명단 — ${st.length}명`, '졸업 대상 = 전학·자퇴·전과(반이동) 제외', ['기수(학년도)', '학과', '반', '번호', '이름', '성별', '회원가입 식별번호', '학적상태', '졸업 대상', '다른이름', '메모'], st, { widths: [11, 10, 4, 5, 8, 5, 14, 10, 8, 30, 40], left: [9, 10] }), '학생');
  const cp = db.companies.slice().sort((a, b) => (a.name < b.name ? -1 : 1)).map((c) => [c.name, (c.alias || []).join('; '), c.group, c.bizNo, c.size, c.type, c.industry, c.memo, db._cnt[c.name] || 0]);
  XLSX.utils.book_append_sheet(wb, xSheet(`업체 사전 — ${cp.length}곳`, '표준명은 법인격 포함 · 사명이 바뀌면 지금 이름', ['표준명', '별칭', '그룹', '사업자번호', '규모', '유형', '업종', '메모', '기록 수'], cp, { widths: [30, 46, 10, 12, 8, 14, 14, 50, 8], left: [0, 1, 7], wrap: [1, 7] }), '업체');
  XLSX.writeFile(wb, `현장실습_취업_원장_${today().replace(/-/g, '').slice(2)}.xlsx`); log('원장 엑셀 내보내기'); toast('원장 엑셀을 내려받았어요');
};
// 통계표 엑셀(서식)
ACT.soExcel = () => {
  const o = so(), run = statRun(), gis = o.gis.slice().sort((a, b) => a - b), wb = XLSX.utils.book_new(), note = optText(o), off = S.db.settings.official || {};
  const H = SCOLS.map((c) => c.l).concat(['취업률']);
  const rowsOf = (keys, keyOf, lab) => keys.map((k) => { const v = aggRow(run.T.filter((t) => keyOf(t) === k), run.R.filter((r) => keyOf(r) === k), o); return [lab(k)].concat(SCOLS.map((c) => v[c.k]), [v.rate]); })
    .concat([(() => { const v = aggRow(run.T, run.R, o); return ['합계'].concat(SCOLS.map((c) => v[c.k]), [v.rate]); })()]);
  const isTot = (r) => r[0] === '합계' || String(r[0]).endsWith('합계');
  const giRows = rowsOf(gis, (x) => x.gi, (g) => g + '기').map((r, i) => r.concat([(() => { const ks = i < gis.length ? [gis[i]] : gis; let e = 0, g = 0; for (const k of ks) { const x = off[k]; if (x && x.grad) { e += x.emp; g += x.grad; } } return !o.dept && g ? e / g : ''; })()]));
  XLSX.utils.book_append_sheet(wb, xSheet('기수별 취업 현황', note, ['기수'].concat(H, ['공식']), giRows, { pct: [H.length, H.length + 1], total: isTot, zebra: true, widths: [8].concat(H.map(() => 10), [10]) }), '기수별');
  XLSX.utils.book_append_sheet(wb, xSheet('학과별 취업 현황', note, ['학과'].concat(H), rowsOf(o.dept ? [o.dept] : DEPTS, (x) => x.dept, (d) => d), { pct: [H.length], total: isTot, zebra: true, widths: [12].concat(H.map(() => 10)) }), '학과별');
  const by = {}; for (const r of run.R) { const k = r.company || '(업체 미기재)'; (by[k] = by[k] || []).push(r); }
  const P = ['공공', '대기업', '중견·중소', '해외·기타'];
  const comp = []; for (const p of P) { const ns = Object.keys(by).filter((n) => (by[n][0].part || '해외·기타') === p).sort((a, b) => by[b].length - by[a].length); if (!ns.length) continue;
    ns.forEach((n) => comp.push([n, p, (compInfo(n) || {}).size || ''].concat(gis.map((g) => by[n].filter((r) => r.gi === g).length || ''), [by[n].length])));
    comp.push([`${p} 합계`, '', ''].concat(gis.map((g) => ns.reduce((t, n) => t + by[n].filter((r) => r.gi === g).length, 0)), [ns.reduce((t, n) => t + by[n].length, 0)])); }
  XLSX.utils.book_append_sheet(wb, xSheet('업체별 취업자', note, ['업체', '부문', '규모'].concat(gis.map((g) => g + '기'), ['합계']), comp, { total: isTot, left: [0], widths: [30, 10, 8].concat(gis.map(() => 6), [7]) }), '업체별');
  const list = run.T.slice().sort((a, b) => stuCmp(stu(a.sid), stu(b.sid))).map((t) => { const s = stu(t.sid); return [s.gi + '기', s.dept, s.cls, s.no, s.name, t.path, t.detail, t.company, t.size, t.type, t.industry]; });
  XLSX.utils.book_append_sheet(wb, xSheet('학생별 진로', note, ['기수', '학과', '반', '번호', '이름', '진로', '세부', '진로처', '규모', '유형', '업종'], list, { left: [7], zebra: true, widths: [6, 10, 4, 5, 8, 12, 9, 28, 8, 13, 13] }), '명단');
  XLSX.writeFile(wb, `취업통계_${today().replace(/-/g, '').slice(2)}.xlsx`); toast('통계표 엑셀을 내려받았어요');
};

