# -*- coding: utf-8 -*-
"""R34 — 계시 되짚기(노드 재분배) 신규 문자열 17종의 영문 번역 추가.
   용어는 기존 사전을 따른다: 계시=revelation, 은화=silver, 업적포인트=P, 성소=shrine, 노드=node."""
import json, collections, sys

SRC = "data/i18n_en.json"
OUT = "/tmp/i18n_r34_new.json"

ADD = collections.OrderedDict([
    ("<span style='color:#8fd18f'>첫 회 무료</span>",
     "<span style='color:#8fd18f'>first time free</span>"),
    ("노드를 전부 풀고 <b style='color:#ffd24a'>",
     "Unbinds every node and returns <b style='color:#ffd24a'>"),
    ("P</b>를 돌려받습니다 · 스킬·업적은 그대로",
     "P</b> · skills and achievements are untouched"),
    ("되짚을 노드가 없습니다", "no nodes to retrace"),
    ("\">계시 되짚기</span>", "\">Retrace the Revelation</span>"),
    ("\" onclick=\"respecAsk(this)\">되짚기</button>",
     "\" onclick=\"respecAsk(this)\">Retrace</button>"),
    ("\">되짚기</button>", "\">Retrace</button>"),
    ("정말 되짚을까요?", "Retrace for certain?"),
    ("탐험 중에는 계시를 되짚을 수 없습니다. 거점으로 돌아가십시오.",
     "You cannot retrace a revelation mid-descent. Return to a settlement first."),
    ("아직 되짚을 노드가 없습니다.", "There are no nodes to retrace yet."),
    ("은화가 부족합니다 — ", "Not enough silver - "),
    ("개 더 필요합니다.", " more needed."),
    ("<b>계시를 되짚었습니다.</b> 노드가 전부 풀리고 업적포인트 <b>",
     "<b>The revelation is retraced.</b> Every node is unbound and <b>"),
    ("P</b>가 돌아왔습니다.", "P</b> has been returned to you."),
    ("성소에 은화 ", "You offered "),
    ("개를 바쳤습니다.", " silver to the shrine."),
    ("첫 되짚기는 값을 받지 않습니다.", "The first retracing is taken without payment."),
])

d = json.load(open(SRC, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
en = d["en"]
before = len(en)
added, skipped = 0, []
for k, v in ADD.items():
    if k in en:
        skipped.append(k); continue
    en[k] = v; added += 1
open(OUT, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1) + "\n")
chk = json.load(open(OUT, encoding="utf-8"))["en"]
print("before %d -> after %d (added %d, skipped %d)" % (before, len(chk), added, len(skipped)))
missing = [k for k in ADD if k not in chk]
print("검산 - 누락:", missing if missing else "없음")
sys.exit(0 if not missing else 1)
