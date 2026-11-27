// ===== v2 HIFIVE 자료 올리기 =====
S.up = { stage: 'files', files: [], items: [], tab: 'new', comps: {}, result: null };
const FL = { abroad: '해외', kind: '구분', company: '업체', start: '실습 시작', end: '실습 종료', emp: '취업일', result: '실습결과', field: '실습분야', note: '비고', empType: '고용형태', empForm: '취업형태', name: '이름', hifiveNo: '식별번호', status: '학적상태', gender: '성별', pracNo: '현장실습번호' };
function hDate(x) {
  x = String(x || '').trim().replace(/\s/g, ''); if (!x) return '';
  let m = x.match(/^(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})\.?$/);
  if (m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`;
  m = x.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { const y = m[3].length === 2 ? 2000 + +m[3] : +m[3]; return `${y}-${pad2(+m[1])}-${pad2(+m[2])}`; }
  return '';
}
function hDept(t) {
  t = String(t || '');
  if (/^(산|설비|기계)/.test(t) || t.includes('산업설비') || t.includes('플랜트산업')) return '산업설비';
  if (t.includes('공정') || t.includes('운용') || t.includes('운영') || /^공/.test(t)) return '공정플랜트';
  if (t.includes('전기') || t.includes('통신') || /^전/.test(t)) return '전기통신';
  if (t.includes('건설') || t.includes('토건') || t.includes('시설물') || /^건/.test(t)) return '시설물건설';
  return '';
}
const sidOf = (gi, dept, cls, no) => `${pad2(gi)}-${ABBR[dept] || '?'}${+cls}-${pad2(+no)}`;

// ---- 파일 읽기 ----
async function readHifive(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const title = String((aoa[0] || [])[0] || ''); const head = (aoa[1] || []).map((h) => String(h).trim());
  const rows = aoa.slice(2).filter((r) => r.some((v) => String(v).trim() !== '')).map((r, i) => {
    const o = { _row: i + 3 }; head.forEach((h, j) => { const v = String(r[j] == null ? '' : r[j]).trim(); if (!h) return; if (!(h in o) || (!o[h] && v)) o[h] = v; }); return o;
  });
  const has = (k) => head.includes(k);
  const type = has('회원가입 식별번호') && has('회원가입여부') ? 'roster' : has('현장실습번호') ? 'prac' : has('취업여부') ? 'emp' : '';
  let year = +((title.match(/(\d{4})\s*학/) || file.name.match(/(\d{4})/) || [])[1] || 0);
  if (type === 'emp' && rows[0] && rows[0]['학년도']) year = +rows[0]['학년도'] || year;
  return { name: file.name, type, year, rows, title };
}
const TYPE_L = { roster: '회원가입 식별번호', prac: '현장실습 학생목록', emp: '학생자료(취업)' };
ACT.upPick = () => { $('#upIn').click(); };
async function upAddFiles(list) {
  for (const f of list) {
    try { const r = await readHifive(f); if (!r.type) r.err = 'HIFIVE 3종 파일이 아니에요'; else if (!r.year) r.err = '학년도를 찾지 못했어요'; S.up.files = S.up.files.filter((x) => x.name !== r.name).concat([r]); }
    catch (e) { S.up.files.push({ name: f.name, err: '읽지 못했어요: ' + e.message, rows: [] }); }
  }
  S.up.stage = 'files'; render();
}
ACT.upRemove = (el) => { S.up.files = S.up.files.filter((f) => f.name !== el.dataset.n); render(); };
ACT.upReset = () => { S.up = { stage: 'files', files: [], items: [], tab: 'new', comps: {}, result: null }; render(); };

// ---- 업체 찾기 ----
function cleanBiz(b) { b = String(b || '').replace(/\D/g, ''); return b.length !== 10 || /^0{4}/.test(b) || /^(\d)\1+$/.test(b) ? '' : b; }
function findComp(raw, biz) {
  const db = S.db, n = norm(raw); biz = cleanBiz(biz);
  if (!raw && !biz) return '';
  if (/^글로벌현장학습/.test(raw)) return null;   // 실제 실습 업체를 고르게 함
  if (db._cm.has(raw)) return raw;
  for (const c of db.companies) if (norm(c.name) === n || (c.alias || []).some((a) => norm(a) === n)) return c.name;
  if (biz.length === 10) { const hit = db.companies.filter((c) => c.bizNo === biz); if (hit.length === 1) return hit[0].name; }
  return null;
}
function compCands(raw, biz) {
  biz = cleanBiz(biz);
  const out = [], seen = new Set(), push = (c) => { if (c && !seen.has(c.name)) { seen.add(c.name); out.push(c); } };
  if (biz) S.db.companies.filter((c) => c.bizNo === biz).forEach(push);
  searchComp(raw, 6).forEach(push);
  const core = norm(raw).replace(/건설|엔지니어링|이엔씨|이앤씨|산업|기술|종합/g, '');
  if (core.length >= 2) searchComp(core, 6).forEach(push);
  return out.slice(0, 8);
}

// ---- 1단계: 파일 → 처음 보는 업체 ----
ACT.upNext = () => {
  const comps = {};
  for (const f of S.up.files) {
    if (f.err) continue;
    for (const r of f.rows) {
      let raw = '', biz = '';
      if (f.type === 'prac') { raw = r['기업명']; biz = r['사업자번호']; }
      else if (f.type === 'emp' && r['학년'] === '3' && r['취업여부'] === '예') { raw = r['취업처']; biz = r['취업처 사업자번호']; }
      if (!raw || findComp(raw, biz) !== null) continue;
      if (!comps[raw] && /^글로벌현장학습/.test(raw)) {
        const ctry = raw.replace(/^글로벌현장학습\s*\(?/, '').replace(/\)$/, '').trim(), cnt = {}, all = {};
        for (const x of S.db.records) if ((x.abroad || '').startsWith('글로벌') && x.company) { all[x.company] = (all[x.company] || 0) + 1; if (ctry && (x.abroad.includes(ctry) || x.abroad.includes(ctry.slice(0, 2)))) cnt[x.company] = (cnt[x.company] || 0) + 1; }
        const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
        const cands = Object.entries(all).sort((a, b) => b[1] - a[1]).map(([n]) => S.db._cm.get(n)).filter(Boolean);
        comps[raw] = { raw, biz: '', cands, choice: best ? best[0] : '__new', n: 0, glob: true };
      }
      if (!comps[raw]) { const c = compCands(raw, biz).filter((x) => !/^글로벌현장학습/.test(x.name)); comps[raw] = { raw, biz: cleanBiz(biz), cands: c, choice: c.length && norm(raw).length >= 2 && (norm(c[0].name).includes(norm(raw)) || norm(raw).includes(norm(c[0].name))) ? c[0].name : '__new', n: 0 }; }
      comps[raw].n++;
    }
  }
  S.up.comps = comps;
  if (Object.keys(comps).length) { S.up.stage = 'comp'; render(); } else buildItems();
};
INP.upComp = (el) => { S.up.comps[el.dataset.raw].choice = el.value; };
function compOf(raw, biz) { const f = findComp(raw, biz); if (f !== null) return f; const c = S.up.comps[raw]; return c ? (c.choice === '__new' ? raw : c.choice) : raw; }

// ---- 2단계: 바뀌는 내용 만들기 ----
function diffOf(old, nw, keys) { const d = []; for (const k of keys) { const a = old[k] || '', b = nw[k] || ''; if (a !== b) d.push([k, a, b]); } return d; }
function buildItems() {
  const db = S.db, items = [], newStu = new Map();
  const byNo = new Map(db.students.filter((s) => s.hifiveNo).map((s) => [s.hifiveNo, s]));
  const getStu = (id) => db._st.get(id) || newStu.get(id);
  const kept = new Set(db.settings.upKeep || []);
  let seq = 0; const add = (o) => {
    o.id = 'u' + (++seq);
    if (o.cat === 'chk' && o.key && kept.has(o.key)) { o.cat = 'same'; o.what = `${o.what} (전에 원장대로 두기로 함)`; delete o.apply; }
    o.on = !!o.apply && o.cat !== 'same'; items.push(o);
  };
  const files = S.up.files.filter((f) => !f.err).sort((a, b) => ({ roster: 0, emp: 1, prac: 2 })[a.type] - ({ roster: 0, emp: 1, prac: 2 })[b.type] || a.year - b.year);
  for (const f of files) {
    for (const r of f.rows) {
      const g = +(r['학년'] || 3); if (g !== 3) continue;
      const gi = f.year - 2017, dept = hDept(r['학과']), cls = +r['반'], no = +(r['학생번호'] || r['번호']);
      if (!dept || !cls || !no) continue;
      const pid = sidOf(gi, dept, cls, no);
      const src = `${f.year} ${TYPE_L[f.type]} ${r._row}행`;
      if (f.type === 'roster') {
        const s = db._st.get(pid), name = r['회원가입 이름'], hn = r['회원가입 식별번호'];
        if (!s) { const ns = { id: pid, gi, year: f.year, dept, cls, no, name, gender: '', hifiveNo: hn, status: '재학중', alias: '', memo: '' }; newStu.set(pid, ns);
          add({ cat: 'new', obj: 'student', sid: pid, label: `${gi}기 ${ABBR[dept]}${cls}-${pad2(no)} ${name}`, what: '새 학생', src, apply: () => { db.students.push(ns); } }); continue; }
        const nameDiff = name && norm(name) !== norm(s.name) && !norm(s.alias).includes(norm(name));
        const d = hn && hn !== s.hifiveNo ? [['hifiveNo', s.hifiveNo, hn]] : [];
        if (d.length) add({ cat: 'upd', obj: 'student', sid: pid, label: stuLabel(s), what: '학생 정보', diff: d, src, apply: () => { s.hifiveNo = hn; } });
        if (nameDiff) add({ cat: 'chk', obj: 'student', sid: pid, label: stuLabel(s), what: '학생 이름', cmp: [['이름', s.name, name]], why: '외국 이름 등 HIFIVE 표기가 원장과 달라요', key: `nm:${pid}:${name}`, src, choices: [['keep', '그대로 두기'], ['alias', '다른이름에 추가'], ['rename', `‘${name}’로 바꾸기`]], choice: 'keep',
          apply: (c) => { if (c === 'alias') s.alias = [s.alias, name].filter(Boolean).join(', '); if (c === 'rename') { s.alias = [s.alias, s.name].filter(Boolean).join(', '); s.name = name; } } });
        if (!d.length && !nameDiff) add({ cat: 'same', obj: 'student', sid: pid, label: stuLabel(s), what: '학생 정보', src });
      } else if (f.type === 'prac') {
        const hn = r['학생 식별변호'] || r['학생 식별번호'];
        const s = (hn && byNo.get(hn) && byNo.get(hn).gi === gi ? byNo.get(hn) : null) || getStu(pid);
        const label = s ? stuLabel(s) : `${gi}기 ${ABBR[dept]}${cls}-${pad2(no)} ${r['이름']}`;
        if (!s) { add({ cat: 'chk', obj: 'none', sid: pid, label, what: '학생 없음', cmp: [['학생', '(원장에 없음)', label]], why: '회원가입 식별번호 파일을 함께 올리거나 학생을 먼저 추가해 주세요', src, choices: [['skip', '건너뛰기']], choice: 'skip' }); continue; }
        const st = r['상태'] || '', conv = st.includes('채용전환');
        const why = ['업무 부적응', '회사의 요청', '단순변심'].find((k) => st.includes(k));
        const res = conv ? '' : (why || st.includes('복교') ? '복교' : (st.includes('실습완료') || st.includes('이수') ? '실습완료' : ''));
        const gm = String(r['기업명'] || '').match(/^글로벌현장학습\s*\(?([^)]*)\)?/);
        const comp = compOf(r['기업명'], r['사업자번호']);
        const det = {}; for (const k of ['기업구분', '실습장소', '기업주소', '상시근로자수', '실습담당자', '실습담당자연락처', '현장실습 등록일', '실습주', '실습시간', '수당구분', '수당', '전공적합여부', '만족도', '순회지도 전체건수']) if (r[k]) det[k] = r[k];
        const nw = { kind: conv ? '채용전환' : '현장실습', company: comp, field: r['실습분야'] || '', start: hDate(r['현장실습시작일']), end: hDate(r['실습종료일']) || hDate(r['현장실습종료일']), result: res,
          abroad: gm ? `글로벌(${gm[1] || '국가 미기재'})` : '', pracNo: r['현장실습번호'] || '', bizNo: String(r['사업자번호'] || '').replace(/\D/g, ''), note: why ? `복교 사유: ${why === '회사의 요청' ? '회사 요청' : why}` : '' };
        const ex = nw.pracNo && db.records.find((x) => x.pracNo === nw.pracNo);
        if (ex) {
          // 원장에서 정한 것은 지킴: 채용전환은 현장실습으로 내리지 않음, 다른 업체로 정한 것·끝난 실습의 채용전환은 확인으로
          const d = diffOf(ex, nw, ['start', 'end', 'field']).filter(([, , v]) => v);
          if (ex.kind !== '채용전환' && nw.result && nw.result !== ex.result) d.push(['result', ex.result, nw.result]);
          if (ex.kind !== '채용전환' && nw.note && !(ex.note || '').includes('복교 사유')) d.push(['note', ex.note, nw.note]);
          if (!ex.abroad && nw.abroad) d.push(['abroad', ex.abroad, nw.abroad]);
          let up = ex.kind === '현장실습' && nw.kind === '채용전환' && !ex.result;   // 진행 중이던 실습이 채용전환됨
          if (up) { d.push(['kind', ex.kind, '채용전환']); if (ex.result) d.push(['result', ex.result, '']); }
          const ask = [];
          if (ex.kind === '현장실습' && nw.kind === '채용전환' && !up) ask.push('HIFIVE는 채용전환(원장은 현장실습)');
          if (nw.company && ex.company && nw.company !== ex.company) ask.push(`HIFIVE 업체 ‘${nw.company}’(원장은 ‘${ex.company}’)`);
          const applyD = () => { for (const [k, , v] of d) ex[k] = k === 'note' ? [ex.note, v].filter(Boolean).join(' / ') : v; if (ex.kind === '채용전환') ex.result = ''; ex.detail = Object.assign({}, ex.detail, det); ex.updated = nowIso(); };
          if (d.length) add({ cat: 'upd', obj: 'record', sid: s.id, label: stuLabel(s), what: `${ex.kind} ${ex.company}`, diff: d, src, apply: applyD });
          if (ask.length) add({ cat: 'chk', obj: 'record', sid: s.id, label: stuLabel(s), what: `${ex.kind} ${ex.company}`, cmp: [(ex.kind === '현장실습' && nw.kind === '채용전환' && !up) ? ['구분', ex.kind, nw.kind] : null, (nw.company && ex.company && nw.company !== ex.company) ? ['업체', ex.company, nw.company] : null].filter(Boolean), why: '원장에서 따로 정한 기록이에요(실습 기간 구분·이직 처리 등). 원장대로 두기를 권해요', key: `p:${nw.pracNo}:${ask.join('|')}`, src,
            choices: [['keep', '원장대로 두기'], ['hifive', 'HIFIVE대로 바꾸기']], choice: 'keep',
            apply: (c) => { if (c !== 'hifive') return; if (nw.kind === '채용전환') { ex.kind = '채용전환'; ex.result = ''; } if (nw.company) ex.company = nw.company; ex.updated = nowIso(); } });
          if (!d.length && !ask.length) add({ cat: 'same', obj: 'record', sid: s.id, label: stuLabel(s), what: `${ex.kind} ${ex.company}`, src });
          continue;
        }
        const rec = Object.assign(blankRec(s.id), nw, { basis: 'HIFIVE', detail: det, updated: nowIso() });
        const man = (db._bySid[s.id] || []).find((x) => !x.pracNo && x.company === comp && ['현장실습', '채용전환'].includes(x.kind));
        if (man) add({ cat: 'chk', obj: 'record', sid: s.id, label: stuLabel(s), what: `${nw.kind} ${comp}`, cmp: [['기록', `${man.kind} ${man.company}${man.start ? ' ' + man.start : ''} (${man.basis})`, `${nw.kind} ${comp} ${nw.start || ''}`]], why: '같은 업체의 직접입력 기록이 이미 있어요', src,
          choices: [['merge', '합치기(빈칸만 채우고 현장실습번호 연결)'], ['add', '따로 추가'], ['skip', '건너뛰기']], choice: 'merge',
          apply: (c) => { if (c === 'add') { rec.id = uid('r'); db.records.push(rec); } if (c === 'merge') { for (const k of ['start', 'end', 'result', 'field', 'pracNo', 'bizNo']) if (!man[k]) man[k] = rec[k]; if (rec.kind === '채용전환') man.kind = '채용전환'; man.detail = Object.assign({}, rec.detail, man.detail); man.basis = 'HIFIVE'; man.updated = nowIso(); } } });
        else add({ cat: 'new', obj: 'record', sid: s.id, label: stuLabel(s), what: `${nw.kind} ${comp}`, info: `${nw.start} ~ ${nw.end}${res ? ' · ' + res : ''}`, src, apply: () => { rec.id = uid('r'); db.records.push(rec); } });
      } else if (f.type === 'emp') {
        const s = getStu(pid);
        const label = s ? stuLabel(s) : `${gi}기 ${ABBR[dept]}${cls}-${pad2(no)} ${r['이름']}`;
        const yn = r['취업여부'];
        if (!s) { if (yn === '예' || yn === '제외인정자') add({ cat: 'chk', obj: 'none', sid: pid, label, what: '학생 없음', cmp: [['학생', '(원장에 없음)', label]], why: '회원가입 식별번호 파일을 함께 올려 주세요', src, choices: [['skip', '건너뛰기']], choice: 'skip' }); continue; }
        // 학생 정보(성별·학적상태)
        const sd = []; const gen = (r['성별'] || '').replace('자', ''); if (gen && gen !== s.gender) sd.push(['gender', s.gender, gen]);
        if (sd.length) add({ cat: 'upd', obj: 'student', sid: s.id, label: stuLabel(s), what: '학생 정보', diff: sd, src, apply: () => { for (const [k, , v] of sd) s[k] = v; } });
        if (r['상태'] && r['상태'] !== s.status) { const nst = r['상태']; add({ cat: 'chk', obj: 'student', sid: s.id, label: stuLabel(s), what: '학적상태', cmp: [['학적상태', s.status, nst]], why: '학적상태는 명렬 기준으로 정한 값이에요', key: `st:${s.id}:${nst}`, src,
          choices: [['keep', '원장대로 두기'], ['hifive', `‘${nst}’로 바꾸기`]], choice: 'keep', apply: (c) => { if (c === 'hifive') s.status = nst; } }); }
        if (yn === '예') {
          const comp = compOf(r['취업처'], r['취업처 사업자번호']);
          const det = {}; for (const k of ['취업업종', '취업직무', '전공관련', '표준직업분류', '연봉']) if (r[k] && r[k] !== '0') det[k] = r[k];
          const nw = { emp: hDate(r['취업일']), empType: r['고용형태'] || '', empForm: r['취업형태'] || '' };
          const ex = (db._bySid[s.id] || []).find((x) => ['취업', '채용전환', '가업승계'].includes(x.kind) && x.company === comp);
          if (ex) {
            const man = ex.basis !== 'HIFIVE';
            const d = diffOf(ex, nw, ['emp', 'empType', 'empForm']).filter(([k, a]) => !man || !a);   // 직접입력은 빈칸만
            if (d.length) add({ cat: 'upd', obj: 'record', sid: s.id, label: stuLabel(s), what: `${ex.kind} ${comp}${man ? ' (직접입력 · 빈칸만)' : ''}`, diff: d, src, apply: () => { for (const [k, , v] of d) ex[k] = v; if (ex.emp) ex.est = ''; ex.detail = Object.assign({}, det, ex.detail); ex.updated = nowIso(); } });
            else add({ cat: 'same', obj: 'record', sid: s.id, label: stuLabel(s), what: `${ex.kind} ${comp}`, src });
          } else if ((db._bySid[s.id] || []).some((x) => x.kind === '가업승계' && !x.company)) {
            const gx = db._bySid[s.id].find((x) => x.kind === '가업승계' && !x.company);
            add({ cat: 'chk', obj: 'record', sid: s.id, label: stuLabel(s), what: '가업승계', cmp: [['기록', '가업승계 (업체명 없음)', `취업 ${comp}`]], why: 'HIFIVE 취업처가 가업일 수 있어요', key: `ga:${s.id}:${comp}`, src,
              choices: [['fill', '가업승계 기록에 업체명·취업일 채우기'], ['add', '취업 기록 따로 추가'], ['skip', '건너뛰기']], choice: 'fill',
              apply: (c) => { if (c === 'fill') { gx.company = comp; if (!gx.emp && nw.emp) { gx.emp = nw.emp; gx.est = ''; } gx.empType = gx.empType || nw.empType; gx.empForm = gx.empForm || nw.empForm; gx.updated = nowIso(); }
                if (c === 'add') db.records.push(Object.assign(blankRec(s.id), nw, { id: uid('r'), kind: '취업', company: comp, basis: 'HIFIVE', detail: det, updated: nowIso() })); } });
          } else {
            const rec = Object.assign(blankRec(s.id), nw, { kind: '취업', company: comp, basis: 'HIFIVE', bizNo: String(r['취업처 사업자번호'] || '').replace(/\D/g, ''), detail: det, updated: nowIso() });
            if (!rec.emp) rec.est = db.settings.grad[gi] || '';
            add({ cat: 'new', obj: 'record', sid: s.id, label: stuLabel(s), what: `취업 ${comp}`, info: `취업일 ${nw.emp || '-'} · ${nw.empType}`, src, apply: () => { rec.id = uid('r'); db.records.push(rec); } });
          }
        } else if (yn === '제외인정자') {
          const why = r['제외인정사유'] || ''; const kind = why.includes('군입대') ? '입대' : '기타';
          const note = `제외인정: ${why.includes('군입대') ? '병역' : why}`;
          const ex = (db._bySid[s.id] || []).find((x) => x.kind === kind && (x.note || '').includes('제외인정'));
          if (ex) add({ cat: 'same', obj: 'record', sid: s.id, label: stuLabel(s), what: `${kind} (${note})`, src });
          else { const rec = Object.assign(blankRec(s.id), { kind, note, basis: 'HIFIVE', est: db.settings.grad[gi] || '', updated: nowIso() });
            add({ cat: 'new', obj: 'record', sid: s.id, label: stuLabel(s), what: `${kind}`, info: note, src, apply: () => { rec.id = uid('r'); db.records.push(rec); } }); }
        }
      }
    }
  }
  S.up.items = items; S.up.stage = 'preview'; S.up.tab = ['new', 'upd', 'chk', 'same'].find((c) => items.some((i) => i.cat === c)) || 'new'; render();
}
ACT.upGo = (el) => { S.up.stage = el.dataset.s; render(); };
ACT.upToComp = () => { S.up.stage = Object.keys(S.up.comps).length ? 'comp' : 'files'; render(); };
ACT.upBuild = () => buildItems();
ACT.upTab = (el) => { S.up.tab = el.dataset.t; render(); };
INP.upOn = (el) => { const it = S.up.items.find((x) => x.id === el.dataset.id); it.on = el.checked; };
INP.upAll = (el) => { for (const it of S.up.items) if (it.cat === S.up.tab && it.apply) it.on = el.checked; render(); };
INP.upChoice = (el) => { const it = S.up.items.find((x) => x.id === el.dataset.id); it.choice = el.value; it.on = el.value !== 'skip' || !!it.key; const cb = document.querySelector(`input[data-in=upOn][data-id=${it.id}]`); if (cb) cb.checked = true; };

// ---- 3단계: 반영 ----
ACT.upApply = async () => {
  const db = S.db, on = S.up.items.filter((i) => i.on && i.apply && i.cat !== 'same');
  if (!on.length) { toast('반영할 줄을 골라 주세요'); return; }
  const d = new Date(); const key = `snap:${today()} ${pad2(d.getHours())}:${pad2(d.getMinutes())} 올리기 전`;
  try { const p = plain(); p.savedAt = nowIso(); await IDB.set(key, p); } catch (e) { console.error(e); }
  // 새 업체 등록(실제로 쓰는 것만)
  let nc = 0;
  for (const c of Object.values(S.up.comps)) if (c.choice === '__new' && !db._cm.has(c.raw)) { db.companies.push({ name: c.raw, alias: [], group: '', bizNo: c.biz, size: '', type: '', industry: '', memo: 'HIFIVE 올리기로 등록 — 분류 필요' }); nc++; }
  for (const c of Object.values(S.up.comps)) if (c.choice !== '__new' && !c.glob) { const t = db.companies.find((x) => x.name === c.choice); if (t && !(t.alias || []).includes(c.raw) && t.name !== c.raw) t.alias = (t.alias || []).concat([c.raw]); }
  index();
  const order = { student: 0, record: 1, none: 2 }; let n = { new: 0, upd: 0, chk: 0 };
  db.settings.upKeep = db.settings.upKeep || [];
  for (const it of on.slice().sort((a, b) => order[a.obj] - order[b.obj])) {
    try { it.apply(it.choice); n[it.cat]++; if (it.cat === 'chk' && it.key && ['keep', 'skip'].includes(it.choice) && !db.settings.upKeep.includes(it.key)) db.settings.upKeep.push(it.key); } catch (e) { console.error(e); }
  }
  const fl = S.up.files.filter((f) => !f.err).map((f) => `${f.year} ${TYPE_L[f.type]}`).join(', ');
  changed(`HIFIVE 올리기(${fl}): 새 ${n.new} · 바뀜 ${n.upd} · 확인 ${n.chk}${nc ? ` · 새 업체 ${nc}` : ''}`);
  S.up.result = { n, nc, key }; S.up.stage = 'done'; render();
};

// ---- 화면 ----
VIEWS.upload = () => {
  const U = S.up, steps = [['files', '1 파일 고르기'], ['comp', '2 처음 보는 업체'], ['preview', '3 미리보기'], ['done', '4 반영']];
  const can = { files: U.stage !== 'done', comp: U.stage === 'preview' && Object.keys(U.comps).length > 0, preview: false, done: false };
  const stepBar = `<ol class="steps" aria-label="진행 단계">${steps.map(([k, l]) => `<li>${can[k] && U.stage !== k ? `<button class="st" data-act="upGo" data-s="${k}">${l}</button>` : `<span class="st ${U.stage === k ? 'on' : ''}" ${U.stage === k ? 'aria-current="step"' : ''}>${l}</span>`}</li>`).join('<li class="arr" aria-hidden="true">›</li>')}</ol>`;
  let body = '';
  if (U.stage === 'files') {
    const ok = U.files.filter((f) => !f.err);
    body = `<div class="drop" id="upDrop"><p><b>HIFIVE에서 받은 파일을 여기에 끌어다 놓거나</b></p><button class="btn pri" data-act="upPick">파일 고르기</button>
        <p class="small muted">회원가입 식별번호 · 현장실습 학생목록 · 학생자료 — 여러 개를 한꺼번에 골라도 돼요. 3학년만 써요.</p></div>
      ${U.files.length ? `<div class="tbox" style="margin-top:var(--sp-4)"><table class="t"><colgroup><col style="width:38%"><col style="width:22%"><col style="width:12%"><col style="width:14%"><col style="width:14%"></colgroup><thead><tr><th>파일</th><th>종류</th><th>학년도</th><th>줄 수</th><th></th></tr></thead><tbody>
        ${U.files.map((f) => `<tr><td class="wrap">${esc(f.name)}</td><td>${f.err ? `<span class="err">${esc(f.err)}</span>` : esc(TYPE_L[f.type])}</td><td>${f.year || '-'}</td><td>${f.rows ? f.rows.length : '-'}</td><td><button class="btn sm" data-act="upRemove" data-n="${esc(f.name)}">빼기</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="fl" style="justify-content:flex-end;margin-top:var(--sp-4)"><button class="btn" data-act="upReset">처음부터</button><button class="btn pri" data-act="upNext" ${ok.length ? '' : 'disabled'}>다음</button></div>` : ''}`;
  } else if (U.stage === 'comp') {
    const cs = Object.values(U.comps).sort((a, b) => b.n - a.n);
    body = `<div class="card raised"><h2>처음 보는 업체명 ${cs.length}개</h2><p class="small muted">업체 목록에 없는 이름이에요. 같은 업체가 있으면 고르고, 없으면 ‘새 업체로 등록’(규모·유형은 나중에 업체 화면에서)을 두세요. 고른 업체에는 이 이름이 별칭으로 남아요.</p></div>
      <div class="tbox" style="margin-top:var(--sp-4)"><table class="t"><colgroup><col style="width:34%"><col style="width:14%"><col style="width:8%"><col style="width:44%"></colgroup><thead><tr><th>HIFIVE 업체명</th><th>사업자번호</th><th>줄 수</th><th>연결할 업체</th></tr></thead><tbody>
      ${cs.map((c) => `<tr><td><b>${esc(c.raw)}</b>${c.glob ? '<div class="small muted">글로벌현장학습 — 실제 실습 업체를 골라 주세요</div>' : ''}</td><td>${esc(c.biz)}</td><td>${c.n}</td><td><select class="in" style="width:100%" data-in="upComp" data-raw="${esc(c.raw)}">${opts([['__new', '+ 새 업체로 등록']].concat(c.cands.map((x) => [x.name, `${x.name}${x.bizNo && x.bizNo === c.biz ? ' (사업자번호 같음)' : ''}`])), c.choice)}</select></td></tr>`).join('')}
      </tbody></table></div>
      <div class="fl" style="justify-content:flex-end;margin-top:var(--sp-4)"><button class="btn" data-act="upGo" data-s="files">이전</button><button class="btn pri" data-act="upBuild">다음: 미리보기</button></div>`;
  } else if (U.stage === 'preview') {
    const C = { new: '새 기록', upd: '바뀐 기록', chk: '확인 필요', same: '같음' };
    const cnt = (c) => U.items.filter((i) => i.cat === c).length;
    const list = U.items.filter((i) => i.cat === U.tab), show = list.slice(0, 500);
    const act = list.filter((i) => i.apply), allOn = act.length && act.every((i) => i.on);
    const cb = (i) => (i.apply && i.cat !== 'same' ? `<input type="checkbox" aria-label="반영" data-in="upOn" data-id="${i.id}" ${i.on ? 'checked' : ''}>` : '<span class="muted" title="반영할 내용이 없어요">–</span>');
    const all = act.length && U.tab !== 'same' ? `<input type="checkbox" aria-label="모두 고르기" data-in="upAll" ${allOn ? 'checked' : ''}>` : '';
    const v = (x) => (x ? esc(x) : '<span class="muted">(빈칸)</span>');
    const NOTE = { new: '원장에 없는 기록이에요. 체크한 줄만 넣어요.', upd: '원장 기록의 값이 바뀌어요(전 → 후). 직접입력 기록은 빈칸만 채워요.', chk: '원장과 HIFIVE가 달라서 처리를 골라야 해요. ‘원장대로 두기’·‘건너뛰기’는 기억해서 다음에 묻지 않아요.', same: '원장과 같아서 바꿀 것이 없어요.' };
    let table;
    if (U.tab === 'chk') {
      table = `<table class="t fixed upt"><colgroup><col style="width:46px"><col style="width:190px"><col style="width:110px"><col style="width:22%"><col style="width:22%"><col></colgroup>
        <thead><tr><th>${all}</th><th>학생</th><th>다른 항목</th><th>원장</th><th>HIFIVE</th><th>처리</th></tr></thead><tbody>
        ${show.map((i) => { const c = i.cmp && i.cmp.length ? i.cmp : [['', '', '']];
          return `<tr class="chk1"><td rowspan="2">${cb(i)}</td><td>${esc(i.label)}</td><td>${c.map((x) => `<div>${esc(x[0])}</div>`).join('')}</td><td>${c.map((x) => `<div>${v(x[1])}</div>`).join('')}</td><td>${c.map((x) => `<div><b>${v(x[2])}</b></div>`).join('')}</td>
            <td>${i.choices ? `<select class="in" style="width:100%" data-in="upChoice" data-id="${i.id}">${opts(i.choices, i.choice)}</select>` : ''}</td></tr>
            <tr class="chk2"><td colspan="5" class="wrap small muted">${esc(i.why || '')}${i.what ? ` · 대상 기록: ${esc(i.what)}` : ''} · ${esc(i.src)}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">없어요</td></tr>'}</tbody></table>`;
    } else {
      table = `<table class="t fixed upt"><colgroup><col style="width:46px"><col style="width:200px"><col style="width:30%"><col><col style="width:220px"></colgroup>
        <thead><tr><th>${all}</th><th>학생</th><th>기록</th><th class="wrap">${U.tab === 'upd' ? '바뀌는 내용 (전 → 후)' : U.tab === 'new' ? '넣는 내용' : '내용'}</th><th>자료</th></tr></thead><tbody>
        ${show.map((i) => `<tr><td>${cb(i)}</td><td>${esc(i.label)}</td><td class="wrap">${esc(i.what)}</td>
          <td class="wrap">${i.diff ? i.diff.map(([k, a2, b2]) => `<div><span class="muted small">${esc(FL[k] || k)}</span> ${a2 ? `<span class="old">${esc(a2)}</span>` : '<span class="muted">(빈칸)</span>'} → <b>${v(b2)}</b></div>`).join('') : ''}${i.info ? esc(i.info) : ''}${i.cat === 'same' ? '<span class="muted">바뀐 것 없음</span>' : ''}</td>
          <td class="small muted wrap">${esc(i.src)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">없어요</td></tr>'}</tbody></table>`;
    }
    body = `<div class="fl" style="justify-content:space-between;align-items:center"><div class="fl" role="tablist">${Object.entries(C).map(([k, l]) => `<button class="btn ${U.tab === k ? 'pri' : (k === 'chk' && cnt(k) ? 'warnb' : '')}" role="tab" aria-selected="${U.tab === k}" data-act="upTab" data-t="${k}">${l} ${cnt(k)}</button>`).join('')}</div>
        <span class="small">반영할 줄 <b>${U.items.filter((i) => i.on && i.apply && i.cat !== 'same').length}</b>개</span></div>
      <p class="small muted" style="margin:var(--sp-3) 0 0">${NOTE[U.tab]}</p>
      <div class="tbox" style="margin-top:var(--sp-3);max-height:calc(100vh - 330px)" data-keep="upBox">${table}
        ${list.length > show.length ? `<div class="empty">${list.length - show.length}줄 더 있어요(체크 상태대로 함께 반영돼요)</div>` : ''}</div>
      <div class="fl" style="justify-content:space-between;margin-top:var(--sp-4)"><span class="small muted">반영하기 직전에 보관본을 남겨서 ‘데이터 파일·백업’ 탭에서 되돌릴 수 있어요.</span>
        <div class="fl"><button class="btn" data-act="upReset">취소</button><button class="btn pri" style="min-width:110px" data-act="upApply">반영</button></div></div>`;
  } else if (U.stage === 'done') {
    const r = U.result;
    body = `<div class="card raised"><h2>반영했어요</h2><p>새 기록 ${r.n.new}개 · 바뀐 기록 ${r.n.upd}개 · 확인 필요 ${r.n.chk}개${r.nc ? ` · 새 업체 ${r.nc}곳(업체 화면에서 규모·유형을 넣어 주세요)` : ''}</p>
      <p class="small muted">되돌리려면 ‘데이터 파일·백업’ 탭의 자동 보관본에서 ‘${esc(r.key.slice(5))}’을 고르세요.</p>
      <div class="fl"><button class="btn pri" data-act="upReset">다른 파일 올리기</button>${r.nc ? '<button class="btn" data-act="goComp" data-f="nosize">새 업체 분류하기</button>' : ''}</div></div>`;
  }
  return `<p class="muted" style="margin:0 0 var(--sp-4)">HIFIVE에서 내려받은 파일을 그대로 올리면, 반영하기 전에 바뀌는 내용을 먼저 보여 드려요</p>${stepBar}${body}`;
};
// 파일 고르기 · 끌어다 놓기
(function () {
  const fi = document.createElement('input'); fi.type = 'file'; fi.multiple = true; fi.accept = '.xls,.xlsx'; fi.id = 'upIn'; fi.hidden = true;
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(fi)); if (document.body) document.body.appendChild(fi);
  fi.onchange = () => { upAddFiles([...fi.files]); fi.value = ''; };
  document.addEventListener('dragover', (e) => { if (e.target.closest && e.target.closest('#upDrop')) { e.preventDefault(); e.target.closest('#upDrop').classList.add('over'); } });
  document.addEventListener('dragleave', (e) => { const d = e.target.closest && e.target.closest('#upDrop'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', (e) => { const d = e.target.closest && e.target.closest('#upDrop'); if (!d) return; e.preventDefault(); d.classList.remove('over'); upAddFiles([...e.dataTransfer.files]); });
})();

