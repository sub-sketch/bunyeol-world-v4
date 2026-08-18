# -*- coding: utf-8 -*-
"""
번역 배치 도우미 — 한글 원문을 다시 타이핑하지 않고 번호로 넣는다.

  python tools/i18n_batch.py ids                 → build/i18n_ids.json 재생성(미번역 목록에 번호 부여)
  python tools/i18n_batch.py list 0 120          → 0~119번 원문 출력 (번호 <TAB> 원문)
  python tools/i18n_batch.py put batch.json      → {"12":"English", ...} 를 사전에 병합
  python tools/i18n_batch.py left                → 남은 개수

★ 번호로 넣는 이유: 원문을 다시 적으면 한 글자만 달라도 키가 어긋나 조용히 미번역으로 남는다.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS = os.path.join(ROOT, "build", "i18n_ids.json")
DICT = os.path.join(ROOT, "data", "i18n_en.json")
TODO = os.path.join(ROOT, "build", "i18n_todo.json")


def load_ids():
    return json.load(open(IDS, encoding="utf-8"))


def cmd_ids():
    todo = json.load(open(TODO, encoding="utf-8"))
    ids = list(todo.keys())
    os.makedirs(os.path.dirname(IDS), exist_ok=True)
    json.dump(ids, open(IDS, "w", encoding="utf-8"), ensure_ascii=False)
    print("번호 부여 %d개" % len(ids))


def cmd_list(a, b):
    ids = load_ids()
    for i in range(a, min(b, len(ids))):
        print("%d\t%s" % (i, ids[i].replace("\n", "\\n")))


def cmd_put(path):
    ids = load_ids()
    add = json.load(open(path, encoding="utf-8"))
    d = json.load(open(DICT, encoding="utf-8"))
    en = d.setdefault("en", {})
    n = 0
    for k, v in add.items():
        i = int(k)
        if i < 0 or i >= len(ids):
            print("범위 밖 번호", k); continue
        if not isinstance(v, str):
            print("빈 번역", k); continue
        if v == "@":
            v = ""                      # 조사(을/를/이/가)처럼 영문에서 사라져야 하는 조각
        elif not v.strip():
            print("빈 번역", k); continue
        en[ids[i]] = v
        n += 1
    json.dump(d, open(DICT, "w", encoding="utf-8"), ensure_ascii=False, indent=1, sort_keys=True)
    print("병합 %d개 · 사전 총 %d개" % (n, len(en)))


def cmd_left():
    ids = load_ids()
    en = json.load(open(DICT, encoding="utf-8")).get("en", {})
    todo = [i for i, s in enumerate(ids) if s not in en]
    print("남은 %d개 / 전체 %d개 (첫 번호 %s)" % (len(todo), len(ids), todo[0] if todo else "-"))


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "left"
    if c == "ids":
        cmd_ids()
    elif c == "list":
        cmd_list(int(sys.argv[2]), int(sys.argv[3]))
    elif c == "put":
        cmd_put(sys.argv[2])
    else:
        cmd_left()
