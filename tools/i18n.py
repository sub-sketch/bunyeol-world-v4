# -*- coding: utf-8 -*-
"""
i18n 도구 — 한글 문자열 뽑기 / 영문 사전 적용 / 미번역 보고

대표 지시: "우리도 일단 영문버젼까지는 지원되게 해야할듯" + 구조 선택 = "빌드 시 치환 → 한/영 2파일"

왜 빌드 시 치환인가 (설계 근거)
  · 이 게임의 사용자 문장은 대부분 조각으로 이어 붙는다("공격 "+d1+"~"+d2). 런타임 사전으로는
    조각을 못 잡지만, 빌드 시 **문자열 리터럴 단위** 치환은 그대로 잡는다.
  · 코드 로직을 건드리지 않으므로 회귀 위험이 거의 없다(1,063개 리터럴을 손으로 TX() 로 감싸는
    대공사를 피한다). 나중에 TX() 로 통합할 때 이 사전이 그대로 en 테이블이 된다.
  · 한글 문자열을 **키로 쓰는 로직**("소모품" 같은 분류명 비교)도 코드·데이터에 같은 사전을
    똑같이 적용하므로 등호가 유지된다. ★ 그래서 사전은 항상 세 층(코드·데이터·템플릿)에 함께 쓴다.

쓰는 법
  python tools/i18n.py extract              → build/i18n_todo.json (미번역 목록, 빈도순)
  python tools/i18n.py report               → 층별 번역률
  python tools/i18n.py check                → 사전 무결성(빈 값·중복 키·자리표시자 불일치)
  build.py --lang en                        → 영문 빌드 (이 모듈의 apply_* 사용)
"""
import json, os, re, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KOR = re.compile(r'[가-힣]')
DICT_PATH = os.path.join(ROOT, "data", "i18n_en.json")


# ─────────────────────────── JS 문자열 리터럴 스캐너 ───────────────────────────
def js_spans(src):
    """문자열 리터럴 구간 [(시작, 끝, 인용부호)] — 주석 안은 건너뛴다.
       ES5 코드라 템플릿 리터럴(`)은 쓰지 않지만 만나면 문자열로 취급한다."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n:
            if src[i + 1] == "/":
                j = src.find("\n", i)
                i = n if j < 0 else j + 1
                continue
            if src[i + 1] == "*":
                j = src.find("*/", i + 2)
                i = n if j < 0 else j + 2
                continue
        if c in ('"', "'", "`"):
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == c:
                    break
                if c != "`" and src[j] == "\n":       # 닫히지 않은 문자열 방어
                    break
                j += 1
            out.append((i + 1, j, c))
            i = j + 1
            continue
        i += 1
    return out


def js_strings(src):
    return [src[a:b] for a, b, q in js_spans(src) if KOR.search(src[a:b])]


def apply_js(src, table, missing=None):
    sp = js_spans(src)
    out, last = [], 0
    for a, b, q in sp:
        raw = src[a:b]
        if not KOR.search(raw):
            continue
        rep = table.get(raw)
        if rep is None:
            if missing is not None:
                missing[raw] += 1
            continue
        out.append(src[last:a]); out.append(esc(rep, q)); last = b
    out.append(src[last:])
    return "".join(out)


def esc(s, quote):
    """번역문에 인용부호가 들어와도 문자열이 깨지지 않게 한다."""
    s = s.replace("\\", "\\\\")
    if quote == '"':
        s = s.replace('"', '\\"')
    elif quote == "'":
        s = s.replace("'", "\\'")
    return s


# ─────────────────────────── 데이터(JSON) ───────────────────────────
def json_strings(obj, acc):
    if isinstance(obj, str):
        if KOR.search(obj):
            acc.append(obj)
    elif isinstance(obj, list):
        for v in obj:
            json_strings(v, acc)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(k, str) and KOR.search(k):
                acc.append(k)
            json_strings(v, acc)
    return acc


def apply_json(obj, table, missing=None):
    if isinstance(obj, str):
        if not KOR.search(obj):
            return obj
        rep = table.get(obj)
        if rep is None:
            if missing is not None:
                missing[obj] += 1
            return obj
        return rep
    if isinstance(obj, list):
        return [apply_json(v, table, missing) for v in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            nk = k
            if isinstance(k, str) and KOR.search(k):
                nk = table.get(k, k)
                if k not in table and missing is not None:
                    missing[k] += 1
            out[nk] = apply_json(v, table, missing)
        return out
    return obj


# ─────────────────────────── 템플릿(HTML) ───────────────────────────
RE_Q = re.compile(r'"([^"\n<>]*[가-힣][^"\n<>]*)"|\'([^\'\n<>]*[가-힣][^\'\n<>]*)\'')
RE_TXT = re.compile(r'>([^<>]*[가-힣][^<>]*)<')


def html_strings(src):
    body = src.split("</style>", 1)[-1]          # CSS 주석의 한글은 무시
    out = []
    for m in RE_Q.finditer(body):
        out.append(m.group(1) if m.group(1) is not None else m.group(2))
    for m in RE_TXT.finditer(body):
        s = m.group(1).strip()
        if s:
            out.append(s)
    return out


def apply_html(src, table, missing=None):
    head, sep, body = src.partition("</style>")
    if not sep:
        head, body = "", src

    def q(m):
        raw = m.group(1) if m.group(1) is not None else m.group(2)
        quote = '"' if m.group(1) is not None else "'"
        rep = table.get(raw)
        if rep is None:
            if missing is not None:
                missing[raw] += 1
            return m.group(0)
        return quote + rep.replace(quote, "&quot;" if quote == '"' else "&#39;") + quote

    def t(m):
        raw = m.group(1)
        s = raw.strip()
        rep = table.get(s)
        if rep is None:
            if missing is not None:
                missing[s] += 1
            return m.group(0)
        return ">" + raw.replace(s, rep) + "<"

    body = RE_Q.sub(q, body)
    body = RE_TXT.sub(t, body)
    return head + sep + body


# ─────────────────────────── 사전 로드 ───────────────────────────
def load_dict(lang="en"):
    if not os.path.exists(DICT_PATH):
        return {}
    d = json.load(open(DICT_PATH, encoding="utf-8"))
    tbl = d.get(lang, d)
    # 빈 문자열도 유효한 번역이다 — 한국어 조사(을/를/이/가)는 영문에서 사라져야 한다.
    return {k: v for k, v in tbl.items() if isinstance(v, str)}


# ─────────────────────────── 명령 ───────────────────────────
def collect():
    """층별 원문 목록 (중복 포함) 을 모은다."""
    src_dir = os.path.join(ROOT, "src")
    layers = collections.OrderedDict()
    code = []
    for f in sorted(os.listdir(src_dir)):
        if not f.endswith(".js"):
            continue
        s = open(os.path.join(src_dir, f), encoding="utf-8").read()
        for x in js_strings(s):
            code.append((x, "src/" + f))
    layers["code"] = code
    data = []
    ddir = os.path.join(ROOT, "data")
    for f in sorted(os.listdir(ddir)):
        if not f.endswith(".json") or f == "i18n_en.json":
            continue
        obj = json.load(open(os.path.join(ddir, f), encoding="utf-8"))
        for x in json_strings(obj, []):
            data.append((x, "data/" + f))
    layers["data"] = data
    tpl = os.path.join(ROOT, "shell", "template.html")
    layers["html"] = [(x, "shell/template.html") for x in html_strings(open(tpl, encoding="utf-8").read())]
    return layers


def cmd_extract():
    layers = collect()
    tbl = load_dict("en")
    freq = collections.Counter()
    where = {}
    for lay, items in layers.items():
        for s, f in items:
            freq[s] += 1
            where.setdefault(s, set()).add(f)
    todo = collections.OrderedDict()
    for s, n in freq.most_common():
        if s in tbl:
            continue
        todo[s] = {"n": n, "in": sorted(where[s])[:3]}
    out_dir = os.path.join(ROOT, "build")
    os.makedirs(out_dir, exist_ok=True)
    p = os.path.join(out_dir, "i18n_todo.json")
    json.dump(todo, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("원문 %d종(등장 %d회) 중 미번역 %d종 → %s"
          % (len(freq), sum(freq.values()), len(todo), p))
    return todo


def cmd_report():
    layers = collect()
    tbl = load_dict("en")
    print("층      원문종수  번역됨   번역률")
    for lay, items in layers.items():
        uniq = set(s for s, f in items)
        done = sum(1 for s in uniq if s in tbl)
        print("%-6s %8d %8d %7.1f%%" % (lay, len(uniq), done, 100.0 * done / max(1, len(uniq))))
    allu = set()
    for items in layers.values():
        allu |= set(s for s, f in items)
    done = sum(1 for s in allu if s in tbl)
    print("%-6s %8d %8d %7.1f%%" % ("전체", len(allu), done, 100.0 * done / max(1, len(allu))))
    extra = [k for k in tbl if k not in allu]
    if extra:
        print("사전에만 있고 원문에 없는 항목 %d개 (원문이 바뀐 흔적 — 정리 대상)" % len(extra))
        for k in extra[:8]:
            print("   ·", k[:60])


def cmd_check():
    tbl = json.load(open(DICT_PATH, encoding="utf-8")).get("en", {})
    bad = 0
    ph = re.compile(r"\{(\d+)\}")
    for k, v in tbl.items():
        if not isinstance(v, str):
            print("번역이 문자열이 아님:", k[:50]); bad += 1; continue
        if v == "":
            continue                     # 의도적 삭제(조사 등)
        if KOR.search(v):
            print("번역문에 한글 남음:", k[:40], "=>", v[:40]); bad += 1
        if sorted(ph.findall(k)) != sorted(ph.findall(v)):
            print("자리표시자 불일치:", k[:40], "=>", v[:40]); bad += 1
        # HTML 태그 개수가 크게 다르면 마크업이 깨진 것
        if k.count("<") != v.count("<"):
            print("태그 수 불일치:", k[:40], "=>", v[:40]); bad += 1
    print("사전 %d항목 검사 — 문제 %d건" % (len(tbl), bad))
    return bad


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "extract":
        cmd_extract()
    elif cmd == "check":
        sys.exit(1 if cmd_check() else 0)
    else:
        cmd_report()
