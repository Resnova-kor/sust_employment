// ===== 통계 엔진 (work/stats.py 와 같은 규칙) =====
const ENG = (() => {
  const EMP = ['취업', '채용전환'], QUIT = ['취업·진학 준비', '입대'];
  const PUBT = ['공기업·공공기관', '공무원', '군(부사관)'];
  const AFTER_F = ['취업·진학 준비', '진학', '입대', '가업승계', '기타'];
  const DEFAULT = { base: '', months: 1, mode: 'any', prac: true, glob: true, ignoreAfter: true, gaup: true, school: true, unit: 'student', denom: 'all' };
  const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const target = (s) => !['전학', '자퇴', '전과(반이동)'].includes(s.status);

  // 기록마다 날짜·제외 표시 계산
  function prep(db) {
    const st = new Map(db.students.map((s) => [s.id, s]));
    const R = db.records.map((r, i) => {
      const s = st.get(r.sid); const gi = s ? s.gi : +r.sid.slice(0, 2);
      const sd = r.kind === '현장실습' ? '' : (r.emp || r.est || r.start || `${gi + 2018}-02-28`);
      const date = r.kind === '현장실습' ? (r.start || `${gi + 2017}-09-01`) : sd;
      return { r, i, gi, sd, date, glob: (r.abroad || '').startsWith('글로벌') };
    });
    const empMin = {};
    for (const x of R) if (EMP.includes(x.r.kind) && x.sd) { if (!empMin[x.r.sid] || x.sd < empMin[x.r.sid]) empMin[x.r.sid] = x.sd; }
    for (const x of R) {
      const k = x.r.kind;
      x.excl = !!((k === '입대' || (x.r.surveyOnly && AFTER_F.includes(k))) && x.sd && empMin[x.r.sid] && empMin[x.r.sid] <= x.sd);
    }
    return R;
  }
  function cls(db, name) {
    const c = name && db._cmap ? db._cmap.get(name) : null;
    if (!c) return { size: '', type: '', industry: '', part: '' };
    const part = PUBT.includes(c.type) ? '공공' : (c.size === '대기업' ? '대기업' : (['중견', '중소'].includes(c.size) ? '중견·중소' : '해외·기타'));
    return { size: c.size, type: c.type, industry: c.industry, part };
  }
  // 반환 { T: 학생별, R: 업체 집계용 기록 }
  function stat(db, gis, opt) {
    const o = Object.assign({}, DEFAULT, opt || {});
    db._cmap = new Map(db.companies.map((c) => [c.name, c]));
    let all = prep(db); if (!o.school) all = all.filter((x) => !x.r.schoolAdded);
    const T = [], RR = [];
    for (const g of gis) {
      const b = o.base || db.settings.grad[g]; if (!b) continue;
      const cut = addDays(b, Math.floor(o.months * 30.5));
      let h = all.filter((x) => x.gi === g && x.date && x.date <= cut);
      h = h.filter((x) => !(x.r.kind === '현장실습' && (x.date > b || (x.glob && !o.glob))));
      if (o.ignoreAfter) {
        const first = {};
        for (const x of h) if (EMP.includes(x.r.kind) || x.r.kind === '현장실습') { if (!first[x.r.sid] || x.date < first[x.r.sid]) first[x.r.sid] = x.date; }
        h = h.filter((x) => !(QUIT.includes(x.r.kind) && first[x.r.sid] && x.date >= first[x.r.sid]) && !x.excl);
      }
      if (!o.prac) h = h.filter((x) => x.r.kind !== '현장실습');
      const rk = (x) => (x.r.kind === '현장실습' ? 0 : EMP.includes(x.r.kind) ? 2 : 1);   // 같은 날이면 실습 → 진로 → 취업 순(취업률 높은 쪽)
      h.sort((a, c) => (a.date < c.date ? -1 : a.date > c.date ? 1 : rk(a) - rk(c) || a.i - c.i));
      const by = {}; for (const x of h) (by[x.r.sid] = by[x.r.sid] || []).push(x);
      for (const s of db.students.filter((s) => s.gi === g)) {
        const r = by[s.id] || [];
        const emp = r.filter((x) => EMP.includes(x.r.kind) || (x.r.kind === '가업승계' && o.gaup));
        let last = null;
        if (o.mode === 'any' && emp.length) last = emp[emp.length - 1];
        else if (o.mode === 'any' && r.some((x) => x.r.kind === '현장실습')) { const p = r.filter((x) => x.r.kind === '현장실습'); last = p[p.length - 1]; }
        else if (r.length) last = r[r.length - 1];
        const k = last ? last.r.kind : '';
        let j = ({ 채용전환: '취업', 현장실습: '취업' })[k] || k;
        if (k === '가업승계' && o.gaup) j = '취업';
        const detail = j === '취업' ? (({ 채용전환: '채용전환', 현장실습: '실습만', 가업승계: '가업승계' })[k] || k) : '';
        const comp = last ? (last.r.company || '') : '';
        const tg = target(s);
        T.push(Object.assign({ sid: s.id, gi: g, dept: s.dept, name: s.name, target: tg, path: j || '기록 없음', detail, company: comp, rec: last ? last.r.id : '' }, j === '취업' ? cls(db, comp) : cls(db, '')));
        if (j === '취업' && tg) {
          const rr = (o.unit === 'record' && emp.length) ? emp : [last];
          for (const x of rr) RR.push(Object.assign({ sid: s.id, gi: g, dept: s.dept, company: x.r.company || '', final: x === last }, cls(db, x.r.company || '')));
        }
      }
    }
    return { T, R: RR, opt: o };
  }
  function summary(res) {
    const o = res.opt, rows = [];
    const gis = [...new Set(res.T.map((t) => t.gi))].sort((a, b) => a - b);
    for (const g of gis) {
      const t = res.T.filter((x) => x.gi === g && x.target), e = t.filter((x) => x.path === '취업'), r = res.R.filter((x) => x.gi === g);
      const cnt = (f) => t.filter(f).length;
      const d = t.length - (o.denom === 'excl' ? cnt((x) => x.path === '진학' || x.path === '입대') : 0);
      rows.push({ gi: g, n: t.length, emp: e.length, conv: e.filter((x) => x.detail === '채용전환').length, pracOnly: e.filter((x) => x.detail === '실습만').length,
        gaupEmp: e.filter((x) => x.detail === '가업승계').length,
        pub: r.filter((x) => x.part === '공공').length, big: r.filter((x) => x.part === '대기업').length, sme: r.filter((x) => x.part === '중견·중소').length,
        etc: r.filter((x) => x.part === '해외·기타' || x.part === '').length,
        go: cnt((x) => x.path === '진학'), army: cnt((x) => x.path === '입대'), gaup: cnt((x) => x.path === '가업승계'), prep: cnt((x) => x.path === '취업·진학 준비'),
        other: cnt((x) => x.path === '기타'), none: cnt((x) => x.path === '기록 없음'), rate: d ? e.length / d : 0 });
    }
    return rows;
  }
  // 이직구분: 학생의 취업 기록 중 가장 늦은 것 = 최종
  function finals(db) {
    const R = prep(db), best = {};
    for (const x of R) if (EMP.includes(x.r.kind)) {
      const k = (x.r.emp || x.r.start || x.r.est || x.sd) + '|' + String(x.i).padStart(6, '0');
      if (!best[x.r.sid] || k > best[x.r.sid].k) best[x.r.sid] = { k, id: x.r.id };
    }
    const out = {}; for (const x of R) if (EMP.includes(x.r.kind)) out[x.r.id] = best[x.r.sid].id === x.r.id ? '최종' : '이전';
    return out;
  }
  return { stat, summary, finals, prep, target, DEFAULT, EMP };
})();


