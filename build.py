"""취업 통계 프로그램 빌드: src/ 의 파일들을 HTML 하나로 합칩니다.

사용법 (이 폴더에서):
  python build.py 4.5            → 취업통계_v4.5.html 새로 만들기 (같은 이름 파일이 있으면 멈춤)
  python build.py 4.4 --check    → 만들지 않고, 기존 취업통계_v4.4.html 과 글자 하나까지 같은지 비교
  python build.py 시험 --out tests/out/app.html → 검사용으로 정한 곳에 만들기(덮어씀, 버전 파일 아님)

파이썬 기본 기능만 씁니다(따로 설치할 것 없음).
"""
import base64
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')

# 앱 코드 합치는 순서 (바꾸면 동작이 달라질 수 있음)
JS_ORDER = [
    'engine.js',     # 통계 엔진
    'core.js',       # 기본 도구 · 저장 · 데이터 · 화면 도구 · 표 정렬
    'shell.js',      # 틀 · 메뉴 · 요약
    'sumcharts.js',  # 요약 그래프(A~D · 표)
    'students.js',   # 학생 화면 · 기록 입력
    'ledger.js',     # 전체 기록(읽기 전용)
    'companies.js',  # 업체
    'upload.js',     # HIFIVE 자료 올리기
    'stats.js',      # 통계 화면
    'print.js',      # 인쇄 · 서식 엑셀
    'settings.js',   # 관리(설정) · 이벤트 연결 · 시작
]


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8', newline='') as f:
        text = f.read().replace('\r\n', '\n')   # 윈도 줄바꿈이 섞여도 같은 결과
    return text[:-1] if text.endswith('\n') else text


def data_uri(rel):
    with open(os.path.join(SRC, rel), 'rb') as f:
        return 'data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii')


def build(ver):
    app = '\n'.join(read('js/' + name) for name in JS_ORDER)
    app = app.replace('__VER__', ver)
    app = app.replace('__LOGO_E__', data_uri('assets/emblem.png'))
    app = app.replace('__LOGO_L__', data_uri('assets/lockup.png'))
    html = read('template.html').replace('__VER__', ver)
    for key, val in (('@@style@@', read('style.css')), ('@@vendor@@', read('vendor/xlsx-js-style.js')), ('@@app@@', app)):
        assert html.count(key) == 1, key + ' 자리가 template.html 에 한 번만 있어야 합니다'
        html = html.replace(key, val, 1)
    return html + '\n'


def main(argv):
    out_arg = argv[argv.index('--out') + 1] if '--out' in argv and argv.index('--out') + 1 < len(argv) else None
    args = [a for a in argv if not a.startswith('--') and a != out_arg]
    if len(args) != 1:
        print(__doc__)
        return 2
    ver = args[0].lstrip('vV')
    out = os.path.join(ROOT, f'취업통계_v{ver}.html')
    html = build(ver)
    data = html.encode('utf-8')

    if '--check' in argv:
        if not os.path.exists(out):
            print(f'비교할 파일이 없습니다: {os.path.basename(out)}')
            return 1
        with open(out, 'rb') as f:
            old = f.read()
        if old == data:
            print(f'같음 ✔  {os.path.basename(out)} 와 빌드 결과가 완전히 같습니다 ({len(data):,} 바이트)')
            return 0
        n = next((i for i, (a, b) in enumerate(zip(old, data)) if a != b), min(len(old), len(data)))
        line = old[:n].count(b'\n') + 1
        print(f'다름 ✘  {line}번째 줄 근처부터 다릅니다 (기존 {len(old):,} / 빌드 {len(data):,} 바이트)')
        return 1

    if out_arg:   # 검사용: 정한 곳에 덮어쓰기
        os.makedirs(os.path.dirname(os.path.abspath(out_arg)), exist_ok=True)
        with open(out_arg, 'wb') as f:
            f.write(data)
        print(f'만듦(검사용): {out_arg} ({len(data):,} 바이트)')
        return 0
    if os.path.exists(out):
        print(f'이미 있는 파일이라 멈춥니다: {os.path.basename(out)}  (이전 버전은 지우지 않는 규칙)')
        return 1
    with open(out, 'wb') as f:
        f.write(data)
    print(f'만듦: {os.path.basename(out)} ({len(data):,} 바이트)')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
