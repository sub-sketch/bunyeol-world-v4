# -*- coding: utf-8 -*-
"""R32 — 신규 한글 문자열 27종의 영문 번역을 data/i18n_en.json 에 추가한다.
   기존 항목은 건드리지 않는다(이미 있는 키는 덮어쓰지 않고 보고만 한다).
   용어는 기존 사전을 따른다: 계시/문신=revelation·sigil, 남빛=indigo, 명부=Register,
   봉인의 문=Sealed Gate, 건국기=the founding age, 초-진=Beyond-True, 신탁신=the oracle god.
   ★ L16 기록물의 기존 번역과 엔딩 5장면의 문장을 **글자 그대로 일치**시켜 회수가 영어에서도 성립하게 한다.
"""
import json, collections, io, sys, os

SRC = "data/i18n_en.json"
OUT = "/tmp/i18n_en_new.json"

ADD = collections.OrderedDict([
    # ── P0-1 에서 새로 생긴 안내 문구 조각 (기존 '변신 '/'종' 과 같은 조립 방식)
    ("자동스킬 ", "auto-skill "),
    ("칸", " slot(s)"),
    # ── P1-3 이탈 정산 안내
    ("<b>이전 탐험은 이탈로 처리되었습니다.</b> 던전 안에서 기록이 끊겼습니다.",
     "<b>Your previous descent was recorded as a withdrawal.</b> The record broke off inside the dungeon."),
    ("탐험 중 번 은화 <b>", "Silver earned during the descent, <b>"),
    ("</b>는 남지 않았습니다. 계시(문신)도 함께 사라졌습니다.",
     "</b>, did not remain. The revelations carved into your skin are gone with it."),
    ("계시(문신)는 사라졌습니다. 은화는 가져갔던 만큼 그대로 남았습니다.",
     "The revelations carved into your skin are gone. The silver you carried in remains untouched."),
    ("[컷신 후속 처리 실패]", "[cutscene follow-up failed]"),
    # ── P1-1 엔딩 5장면
    ("남빛이 걷힌다. 옥좌 앞에서, 마침내.",
     "The indigo draws back. Before the throne, at last."),
    ("갑주에는 이름이 없었다. 어깨의 문신 자리에는 흉터만 남아 있었다.",
     "The armour bore no name. Where the sigil should have sat on its shoulder, only a scar remained."),
    ("서쪽 것이었다 — 건국기 노스가드의 갑주.",
     "It was of the west — armour of Norsgard, from the founding age."),
    ("옥좌는 앉기 위한 자리가 아니었다. 문을 등지고 지키는 자리였다.",
     "The throne was never a seat for sitting. It was a post: back to the gate, standing guard."),
    ("이름이 지워진 기사는 한 사람이 아니었다.",
     "The knight whose name was erased was not one man."),
    ("한 사람은 문 앞에 남아 지켰고, 한 사람은 잠근 자를 따라 안으로 들어갔다.",
     "One stayed before the gate and guarded it. One followed the man who barred it, inward."),
    ("쐐기는 언제나 안쪽에서 박혀 있었다.",
     "The wedge had always been driven from the inside."),
    ("문 안에 있던 것은 마물이 아니었다.",
     "What lay beyond the gate was no monster."),
    ("대를 물릴수록 옅어지는 순리를 거스르고 태어난 사람 — 초-진(超-眞).",
     "A man born against the order that thins a gift with every generation — Beyond-True."),
    ("그는 신탁신을 건너뛰고, 창조주의 침묵을 곧바로 들었다.",
     "He passed over the oracle god and heard the silence of the Creator directly."),
    ("침묵을 들은 자는, 되돌릴 수 있게 된다.",
     "And one who has heard that silence becomes able to bring things back."),
    ("그는 잃은 것을 되돌리려 했다. 한 번이 아니라, 천 년 동안.",
     "He tried to bring back what he had lost. Not once, but for a thousand years."),
    ("그 파동이 위로 새어 성소의 뼈를 걷게 했다.",
     "That tremor leaked upward, and set the bones of the sanctuary walking."),
    ("잘못된 환원의 주인은 악의가 아니었다. 놓지 못한 손이었다.",
     "The author of the false return was not malice. It was a hand that could not let go."),
    ("그래서 그는 스스로를 세계에서 잘라 냈다 — 안에서 걸어 잠갔다.",
     "So he cut himself out of the world — and barred the gate from the inside."),
    # ★ L16 기록물의 기존 번역과 동일 문장
    ("열둘째 층은 없다. 아래로 내려가는 것이 아니라, 안으로 들어가는 것이다.",
     "There is no twelfth floor. You do not descend — you go inward."),
    ("계시는 살갗에 새겨진 문(門)이었다. 그대는 그것을 한 겹씩 열며 내려왔다.",
     "The revelation carved in your skin was a gate. You came down opening it, one layer at a time."),
    ("문은 아직 닫혀 있다. 그러나 이제, 안쪽이 그대의 이름을 안다.",
     "The gate is still closed. But now, what is inside knows your name."),
    ("서쪽은 아직 아무것도 모른다.",
     "The west knows nothing of this yet."),
    ("◆ 엔딩 감상", "◆ Watch the ending"),
])

d = json.load(open(SRC, encoding="utf-8"), object_pairs_hook=collections.OrderedDict)
en = d["en"]
before = len(en)
skipped, added = [], 0
for k, v in ADD.items():
    if k in en:
        skipped.append(k)
        continue
    en[k] = v
    added += 1
open(OUT, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1) + "\n")

chk = json.load(open(OUT, encoding="utf-8"))["en"]
print("before %d -> after %d (added %d, skipped %d)" % (before, len(chk), added, len(skipped)))
if skipped:
    print("이미 있던 키(덮어쓰지 않음):", skipped)
missing = [k for k in ADD if k not in chk]
print("검산 — 누락:", missing if missing else "없음")
sys.exit(0 if not missing else 1)
