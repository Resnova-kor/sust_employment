// 검사용 익명 가짜 데이터 — 이름·업체·번호는 모두 지어낸 것(실제 학생 정보 없음).
// 같은 결과가 나오도록 난수 씨앗을 고정한다. 실제 데이터 파일(*.json)은 검사에 쓰지 않는다.
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(rnd() * a.length)];

const DEPTS = ['산업설비', '공정플랜트', '전기통신', '시설물건설'];
const SIZES = ['대기업', '중견', '중소', '공공', '해외·기타', '학교'];
const TYPES = ['사기업', '공기업·공공기관'];
const INDS = ['건설·EPC', '엔지니어링·설계', '제조', '전기·에너지', '검사·안전·환경', '교통·운송', '시설관리', '공공행정', '교육', '기타'];
const FAM = '가나다라마바사아자차카타파하'.split('');            // 실제 성씨를 흉내 내지 않은 가짜 첫 글자
const GIV = '온솔빛결별봄늘들새찬한윤결누리로'.split('');

function make() {
  seed = 7;
  const companies = [];
  for (let i = 0; i < 160; i++) {
    const size = pick(SIZES);
    companies.push({
      name: `가상업체${i + 1}${i % 9 === 0 ? ' 엔지니어링 주식회사 서울지사' : ''}`,   // 긴 이름: 말줄임(…) 검사용
      alias: i % 5 ? [] : [`가상${i + 1}`], group: i % 7 ? '' : '가상그룹', bizNo: '',
      size: i % 23 ? size : '', type: size === '공공' ? '공기업·공공기관' : pick(TYPES), industry: pick(INDS),
      memo: i % 11 ? '' : '메모 예시 문장',
    });
  }
  const students = [], records = [], grad = {};
  let rid = 1;
  for (let gi = 1; gi <= 10; gi++) grad[gi] = `${gi + 2018}-02-28`;
  for (let gi = 1; gi <= 10; gi++) for (const [di, dept] of DEPTS.entries()) for (let no = 1; no <= 30; no++) {
    const id = `S${gi}${di}${String(no).padStart(2, '0')}`, year = gi + 2017;
    students.push({ id, gi, year, dept, cls: di + 1, no, name: pick(FAM) + pick(GIV) + pick(GIV), gender: no % 3 ? '남' : '여', hifiveNo: '', status: gi >= 9 ? '재학' : '졸업', alias: '', memo: no % 13 ? '' : '메모' });
    const base = { field: '', end: '', est: '', result: '', abroad: '', empType: '', empForm: '', note: '', pracNo: '', bizNo: '', surveyOnly: false, schoolAdded: false, detail: '', updated: '' };
    if (rnd() < 0.8) records.push(Object.assign({}, base, { id: 'r' + rid++, sid: id, kind: '현장실습', company: pick(companies).name, start: `${year}-09-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`, emp: '', basis: 'HIFIVE' }));
    const k = rnd(), kind = k < 0.55 ? '취업' : k < 0.65 ? '채용전환' : k < 0.75 ? '진학' : k < 0.85 ? '입대' : '취업·진학 준비';
    if (gi <= 9) records.push(Object.assign({}, base, { id: 'r' + rid++, sid: id, kind, company: ['취업', '채용전환'].includes(kind) ? pick(companies).name : kind === '진학' ? '가상대학교' : '', start: '', end: rnd() < 0.15 ? `${year + 2}-06-30` : '', emp: `${year + 1}-0${1 + Math.floor(rnd() * 8)}-15`, empType: '정규직', basis: pick(['HIFIVE', '조사', '학교']), note: rnd() < 0.1 ? '비고 예시입니다 길게 적힌 비고 내용' : '', updated: '2026-11-01' }));
  }
  companies.push({ name: '쓰지않는업체', alias: [], group: '', bizNo: '', size: '중소', type: '사기업', industry: '제조', memo: '' });   // 지우기·합치기 검사용(기록 없음 — 기록을 다 만든 뒤 넣음)
  students.push({ id: 'ZZ-빈학생', gi: 8, year: 2025, dept: '산업설비', cls: 1, no: 99, name: '빈학생', gender: '남', hifiveNo: '', status: '졸업', alias: '', memo: '' });   // 지우기 검사용(기록 없음)
  const official = {};
  for (let gi = 1; gi <= 8; gi++) official[gi] = { grad: 120, emp: 100, pub: 20, big: 30, sme: 50 };
  return {
    app: 'chuieop-stats', format: 1, students, records, companies,
    settings: { grad, official, officialSource: '가상', depts: DEPTS, deptAbbr: { 산업설비: '산설', 공정플랜트: '공정', 전기통신: '전기', 시설물건설: '건설' }, upKeep: [], statDefault: { mode: 'latest' }, chkSeen: {} },
    log: [{ t: '2026-11-01T10:00:00', msg: '가상 기록' }],
  };
}
module.exports = make;
