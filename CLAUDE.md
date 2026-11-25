# 취업 통계 관리 프로그램 — Claude Code 인수인계

서울도시과학기술고 산학협력부 졸업생 취업 통계 웹앱. 사용자는 개발 비전공·초보이므로 **설명은 쉬운 말로, 큰 변경 전에는 단계 계획을 먼저 보여 주고 승인받을 것.** 답변은 한국어.

## 현재 상태 (2026-11-25 기준 v4.5)
- 앱 파일: `취업통계_v4.5.html` (약 1.2MB, 하나의 HTML에 JS·CSS·엑셀 부품(xlsx-js-style 1.2.0)·교표/로고(data URI) 모두 포함. `src/`에서 빌드한 결과물)
- 데이터 원본: `취업통계_데이터.json` — **이 파일이 원본. 절대 덮어쓰거나 구조를 바꾸지 말 것.** 손대야 하면 먼저 `참고자료\` 에 날짜 붙은 복사본을 만든 뒤 진행.
- 사용 방법: HTML을 크롬·엣지로 열기 → '데이터 파일 열기'로 JSON 선택 → 그 파일에 자동 저장(File System Access API). 브라우저 IndexedDB에도 저장, 하루 1번 보관본 14일.
- 글꼴: 오프라인이라 맑은 고딕. 색: 학교 디자인 시스템 A 클래식(네이비 #2a2357).
- 화면 시안(claude.ai Design): https://claude.ai/artifact/1CXbMdZSR7LDpEaxPiogUi

## 소스 구조와 빌드 (2026-11-25 소스 분리 완료)
**이제 원본은 `src/`** 이다. HTML은 빌드 결과물이므로 HTML을 직접 고치지 말고 `src/`를 고친 뒤 빌드한다.
- `src/template.html` — HTML 뼈대. `@@style@@`·`@@vendor@@`·`@@app@@` 자리에 아래 파일이 들어감, `__VER__` = 버전
- `src/style.css` — 화면 스타일 전체
- `src/vendor/xlsx-js-style.js` — 엑셀 부품(SheetJS, 고치지 않음)
- `src/js/` — 앱 코드. v4.4 안의 `// =====` 구역 주석 경계대로 나눔. 합치는 순서는 `build.py`의 `JS_ORDER`
  engine.js(통계 엔진) → core.js(기본 도구·저장·IndexedDB·데이터·화면 도구·표 정렬·statDef·optShort·fmtTel, `APP_VERSION`, `LOGO_E/LOGO_L`) → shell.js(틀·메뉴·요약) → sumcharts.js(요약 그래프 A~D) → students.js(학생·기록 입력) → ledger.js(전체 기록) → companies.js(업체) → upload.js(HIFIVE 자료 올리기) → stats.js(통계) → print.js(인쇄·서식 엑셀) → settings.js(관리·이벤트 연결·시작)
  - 여러 파일이 하나의 `<script>`로 이어 붙는다. 그래서 다른 파일에서 선언한 함수·변수를 그대로 쓴다(모듈 아님).
- `src/assets/` — emblem.png(192px)·lockup.png(900px). 빌드 때 `__LOGO_E__`/`__LOGO_L__` 자리에 data URI로 들어감
- 빌드: `python build.py 4.5` → `취업통계_v4.5.html` 생성(같은 이름이 있으면 멈춤). `python build.py 4.4 --check` → 기존 파일과 바이트 비교
- 검증 기록: `python build.py 4.4 --check` 결과 원본 v4.4와 완전히 같음(1,277,629 바이트, sha256 18da2746…a3f4). 브라우저에서 열었을 때 오류 없음
- git: `*.json`, `참고자료/`, 빌드된 `취업통계_v*.html`은 .gitignore로 기록에서 뺌. **데이터 파일·참고자료는 원격 저장소(GitHub 등)에 올리지 말 것 — 학생 개인정보.**

## 버전 규칙
- 새 버전은 `취업통계_v4.5.html` 처럼 **새 파일로** 만든다. 이전 버전 HTML은 지우지 않음.
- 데이터 JSON은 새로 만들지 않는다(사용자 PC의 파일 그대로 사용).

## 화면 구성 (왼쪽 메뉴 순서)
요약 – 통계 – 전체 기록 – 학생 – 업체 – 인쇄·엑셀 – 관리
- 요약: 위 4칸(전체 취업률 / 졸업생 수(+재학) / 기록 건수 / 등록 업체), 그래프 모양 전환 [표 · A 세로 막대 · B 선+비율 · C 카드 · D 전체 진로] (localStorage 'sumView'), 분야별/규모별
- 통계: 옵션 패널, 기수별·학과별·업체별, 숫자 누르면 명단, 엑셀. '이 옵션을 기본값으로 저장'(기준일=졸업일일 때만). 기준일 '오늘(현재)' 선택 시 인정 0개월·마지막 기록대로·퇴사입대 반영으로 자동 변경
- 전체 기록: 읽기 전용. 줄 누르면 그 학생 화면으로 이동해 해당 기록 노란 강조. 고치기는 학생 화면에서만
- 업체: 규모 SIZES = 대기업·중견·중소·공공·해외·기타·학교
- 인쇄·엑셀: 기수별 취업처(세로)·기업별 명단, A4 미리보기. 인쇄는 항상 기본 통계 옵션
- 관리: 자료 올리기(HIFIVE) → 통계 기준 → 확인할 것 → 바뀐 기록 → 데이터 파일·백업

## 데이터 구조 — app:'chuieop-stats', format:1
- students[{id, gi, year, dept, cls, no, name, gender, hifiveNo, status, alias, memo}]
- records[{id, sid, kind, company, field, start, end, emp, est, result, abroad, empType, empForm, basis, note, pracNo, bizNo, surveyOnly, schoolAdded, detail, updated}]
- companies[{name, alias[], group, bizNo, size, type, industry, memo}]
- settings{grad, official, officialSource, depts, deptAbbr, upKeep[], statDefault{months, mode, prac, glob, gaup, ignoreAfter, unit, denom}, chkSeen}, log[{t,msg}]
- 참고: 사용자 데이터의 statDefault.mode는 'latest'로 저장돼 있음

## 통계 규칙
- 같은 날짜면 현장실습 → 진로 → 취업 순. 날짜 없는 실습 = 3학년 9월 1일. school 옵션은 항상 true
- 분야 = type이 공공이면 공공, 아니면 업종(교통·운송·시설관리·공공행정·교육은 기타)
- 기본값 1~8기 취업 인원: 112·118·120·114·106·83·71·69 (엔진 수정 후 이 숫자가 바뀌면 반드시 사용자에게 알릴 것)
- 그래프 색(dataviz 검증): 공공 #2a78d6, 건설·EPC #eb6834, 엔지니어링 #1baf7a, 제조 #eda100, 전기 #6250d6, 검사 #e87ba4, 기타 #b4b1c6

## 꼭 지킬 구현 원칙
- 한글 입력: 조합 중(isComposing)에는 처리하지 않고 compositionend에서 처리
- render()는 innerHTML 통째 교체 대신 morphInto(바뀐 부분만). INPUT type/name이 다르면 새로 바꿈
- html{overflow-y:scroll} 유지(가로 폭 흔들림 방지)
- 서식: 표 가운데 정렬·열 너비 고정(비고·별칭은 왼쪽), 줄무늬·묶음 머리줄·세로선, 열 이름 정렬 ▲▼, 학생 순서 산설·공정·전기·건설
- 표현: '현장실습'만 한 경우 '실습', 취소선 = 이직 전·다른 곳 실습

## 화면(UI/UX) 공통 규칙
글씨·여백·버튼 높이 단계, 통일성·가독성, 표·창·알림 규칙은 아래 문서를 따른다. 이 파일과 다르면 이 파일이 우선.
@docs/UI_UX_규칙.md

## 결정사항 (다시 묻지 않을 것)
- **크기 단계는 이 앱에 맞게 정한다**: 공통 문서의 글씨·여백·버튼 높이 값을 그대로 따르지 않는다. 이 앱의 화면 구성·쓰임새에 맞는 값을 정해 이 파일에 적고 그것을 따른다(아직 안 정함 → 남은 일 2단계). — 앱마다 목적과 읽기 좋은 크기가 달라서 (2026-11-25)
- 표 안 작은 버튼은 버튼 높이 규칙의 예외: 통계 표의 숫자 버튼(누르면 명단, 20px), 열 제목 정렬 버튼(20px). — 키우면 표 줄이 두꺼워져 한 화면에 보이는 줄이 줄어서
- 버튼끼리 붙은 고르기 묶음은 '버튼 사이 4px' 규칙의 예외: 요약 그래프 모양 전환, 분야별/규모별. — 붙어 있어야 '하나만 고른다'가 보여서
- 숫자 입력 칸은 `type="number"`를 쓰지 않고 `type="text" inputmode="numeric" data-num`(숫자 아닌 글자는 core.js가 바로 지움). — 마우스 휠로 값이 모르게 바뀌는 실수 방지 (v4.5)
- 지우기(기록·학생·업체)는 확인 창 없이 바로 지우고 알림에 [되돌리기]. 확인 창(`ask`)은 되돌리기 어려운 일(보관본으로 되돌리기, 파일 내용으로 불러오기, 기본 옵션 저장)에만. (v4.5)
- 알림은 되돌리기 있든 없든 모두 4초. 창은 `modal()`이 머리 닫기(X)를 자동으로 넣고 Esc로 닫힌다. Enter = 실행은 아직 안 넣음(업체 자동 완성 칸과 겹칠 수 있어 따로 확인 필요). (v4.5)
- 정렬 화살표는 정렬 중인 열에만(▲▼), 나머지 열은 마우스를 올리면 ↕. 자리는 비워 둬서 폭이 안 바뀜. (v4.5)

## 남은 일
- 사용하면서 나오는 수정 요청 반영
- 화면 규칙 2단계: 이 앱의 크기 단계(글씨·여백·버튼 높이·표 제목 줄)를 정해 위 결정사항에 적고, CSS 변수 한곳에 둔 뒤 화면을 맞춤. 바꾸기 전·후 캡처를 사용자에게 보여 주고 승인받기
- 화면 규칙 3단계: 자동 검사 스크립트(Playwright)와 익명 가짜 데이터를 저장소에 넣기(실제 학생 데이터 금지)
- 지우기 버튼 문구: 지금 '지우기' 유지 중. 공통 문서 용어('삭제'·'휴지통으로')로 바꿀지 사용자 결정 대기
- 공공 판단 로직(⑤): 확인 결과 어긋난 곳 없어 보류 — 사용자 결정 대기
- 기록 정리가 끝나면 산학부 공식 숫자 빼기(사용자가 요청하면)
