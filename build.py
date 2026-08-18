# -*- coding: utf-8 -*-
"""
분열된 세계 ONLINE - 빌드 스크립트
---------------------------------
data/*.json (콘텐츠) + src/*.js (로직) + shell/template.html (껍데기)
                    -> dist/game_분열된세계_ONLINE.html (단일 파일)

사용법:
    python build.py                 # 빌드
    python build.py --check         # 빌드 + node 문법검사(node 있을 때)
    python build.py --out "경로.html"
    python build.py --music         # 실제 음원(mp3) 내장 빌드 (용량 커짐)
    python build.py --folder        # 폴더 산출물(dist_game/) — 에셋 분리, 웹 배포용
    python build.py --lang en --strict   # 영문 빌드 + 미번역이 남으면 실패(배포용)

개발은 여러 파일로, 배포는 한 파일로. GAS 웹앱 배포 방식은 그대로 유지됩니다.
"""
import json, os, sys, io, subprocess, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
SRC  = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")

# 콘텐츠 JSON -> 전역 var 선언으로 변환할 파일 목록(순서 무관)
DATA_FILES = ["balance.json", "items.json", "classes.json",
              "monsters.json", "variants.json", "zones.json", "story.json", "npcs.json", "lang.json",
              "revelations.json", "footprint.json", "acts.json", "hubs.json"]

def log(msg):
    # 콘솔 출력에 특수기호 사용 금지(cp949 대응)
    print(msg)


# ============================================================================
# 확장팩(DLC) 병합 — R19a
#   팩은 data/pack_*.json 하나로 들어온다. **본편 데이터 파일은 절대 수정하지 않는다.**
#   그래서 팩 파일을 지우면 본편이 원상복구된다(되돌리기가 파일 하나 삭제로 끝난다).
#
#   팩 파일 모양:
#     { "_pack": {"id":"pack_makyeong", "n":"마경 지대", "owned":true},
#       "merge": { "ACTS":[...], "ZONES":[...], "MOBS":{...}, "FOOTPRINT":{...} } }
#
#   병합 규칙 — 배열은 뒤에 붙이고(append), 객체는 키를 덮어쓴다(update).
#   ★ ZONES 는 append 이므로 팩 존의 번호는 '본편 존 수'부터 시작한다.
#     팩의 ACTS.floors 가 그 번호를 정확히 가리켜야 하며, 어긋나면 아래 정합성 검사가 잡는다.
# ============================================================================
def load_packs():
    out = []
    if not os.path.isdir(DATA):
        return out
    for fn in sorted(os.listdir(DATA)):
        if not (fn.startswith("pack_") and fn.endswith(".json")):
            continue
        with io.open(os.path.join(DATA, fn), encoding="utf-8") as f:
            obj = json.load(f)
        meta = obj.get("_pack") or {}
        pid = meta.get("id") or fn[:-5]
        owned = bool(meta.get("owned", True))
        out.append({"file": fn, "id": pid, "n": meta.get("n", pid),
                    "owned": owned, "base_zones": meta.get("base_zones"),
                    "merge": obj.get("merge") or {}})
    return out


def merge_packs(data, packs):
    """data = {키: 값} (전 데이터 파일을 합친 것). 소유한 팩만 병합한다."""
    for p in packs:
        if not p["owned"]:
            log("  [팩] %-18s 미소유 — 병합 안 함" % p["id"])
            continue
        # T-P1-9 안전장치 — 팩 존 번호 검증.
        # ZONES 는 append 결합이라 팩 존의 번호가 '본편 존 수'부터 시작한다. 본편에서 존을 하나
        # 삭제/삽입하면 팩의 floors·gates 번호가 통째로 밀리는데, 범위 밖이면 validate_data 가
        # 잡지만 **한 칸 밀려 다른 유효 존을 가리키면 조용히 통과**한다(엉뚱한 층으로 워프).
        # 그래서 팩이 "내가 전제한 본편 존 수"를 스스로 선언하게 하고, 다르면 여기서 멈춘다.
        bz = p.get("base_zones")
        if bz is not None and "ZONES" in p["merge"]:
            cur = len(data.get("ZONES") or [])
            if cur != bz:
                raise SystemExit(
                    "  [팩 오류] %s: 본편 존 수가 달라졌습니다 (팩 전제 %d개 / 현재 %d개)\n"
                    "    ZONES 는 뒤에 붙는 방식이라 팩의 floors·gates 번호가 전부 밀립니다.\n"
                    "    본편 존을 추가/삭제했다면 팩의 존 번호와 _pack.base_zones 를 함께 고치십시오."
                    % (p["id"], bz, cur))
        elif "ZONES" in p["merge"]:
            log("  [팩 경고] %s: _pack.base_zones 선언이 없습니다 — 존 번호 밀림을 검사할 수 없습니다" % p["id"])
        added = []
        for key, val in p["merge"].items():
            if key not in data:
                data[key] = val
                added.append("%s(신규)" % key)
            elif isinstance(data[key], list) and isinstance(val, list):
                base_n = len(data[key])
                data[key] = data[key] + val
                added.append("%s +%d(시작번호 %d)" % (key, len(val), base_n))
            elif isinstance(data[key], dict) and isinstance(val, dict):
                # 팩이 들여온 변종에는 출처를 찍어 둔다(_pack -> 몹의 vp).
                # 팩 해제 시 그 변종만 골라내거나, 검증에서 "팩이 준 것"을 찾는 데 쓴다.
                if key == "VARIANT":
                    for vk in val:
                        if isinstance(val[vk], dict):
                            val[vk]["_pack"] = p["id"]
                data[key].update(val)
                added.append("%s +%d" % (key, len(val)))
            else:
                raise SystemExit("  [팩 오류] %s: %s 타입이 본편과 다릅니다" % (p["id"], key))
        log("  [팩] %-18s 병합: %s" % (p["id"], ", ".join(added) if added else "없음"))
    return data


# ============================================================================
# 몹 변종 전개 — R19b
#   대표 지시: "몬스터는 재사용하면서 색상만 변경, 일반 늑대 / 붉은 늑대 / 검은 늑대".
#
#   data/variants.json 의 VARIANT 한 줄을 **완전한 MOBS 항목**으로 펼친다.
#   런타임이 아니라 빌드에서 펼치는 이유:
#     1) 정합성 검사(validate_data)가 변종도 같이 본다 — 존 스폰에 'wolf@red' 를 적어도 검증된다.
#     2) 기존 코드가 한 줄도 바뀌지 않는다. 스폰(06_world.js)·전투·드롭은 MOBS[키] 만 보므로
#        변종이 '그냥 또 하나의 몹'이 된다. 런타임 전개로 하면 초기화 순서에 얽힌다.
#   색만 시트 이름을 못 찾으므로 vb(원종 시트) / vt(색 보정) 두 항목을 심어 준다 —
#   02d_mobsheet.js 가 이걸 보고 원본 시트를 캔버스에 다시 칠해 캐시한다.
#
#   ★ FOOTPRINT 도 같이 복사한다. 그림자 폭은 시트 이름으로 조회하는데(shadowR) 변종 키는
#     그 표에 없어서, 안 넣으면 변종만 그림자가 폴백 값으로 바뀌어 발이 떠 보인다.
# ============================================================================
VAR_MUL_FIELDS = {"hp": "hp", "dmg": ("d1", "d2"), "xp": "xp", "sp": "sp"}

def expand_variants(data):
    lines = data.get("VARLINE") or {}
    vars_ = data.get("VARIANT") or {}
    if not vars_:
        return data
    mobs = data.setdefault("MOBS", {})
    foot = data.setdefault("FOOTPRINT", {})
    err, made = [], 0
    for vk in sorted(vars_.keys()):
        v = vars_[vk]
        if "@" not in vk:
            err.append("변종 키 '%s' 에 @ 가 없음 (반드시 '원종@접미' 형태 — 도감 합산이 깨진다)" % vk)
            continue
        base_k = v.get("base") or vk.split("@")[0]
        base = mobs.get(base_k)
        if base is None:
            err.append("변종 '%s' 의 원종 '%s' 이 MOBS 에 없음" % (vk, base_k))
            continue
        if vk in mobs:
            err.append("변종 '%s' 가 이미 MOBS 에 있음 (원종 표와 이름이 겹친다)" % vk)
            continue
        ln = lines.get(v.get("line")) or {}
        if v.get("line") and not ln:
            err.append("변종 '%s' 의 계보 '%s' 가 VARLINE 에 없음" % (vk, v.get("line")))
            continue
        mul = dict(ln.get("mul") or {}); mul.update(v.get("mul") or {})
        add = dict(ln.get("add") or {}); add.update(v.get("add") or {})
        tint = dict(ln.get("tint") or {}); tint.update(v.get("tint") or {})

        m = json.loads(json.dumps(base))          # 깊은 복사 — 원종을 절대 건드리지 않는다
        m["n"] = v.get("n") or (ln.get("n", "") + " " + base.get("n", "")).strip()
        for key, fields in VAR_MUL_FIELDS.items():
            if key not in mul:
                continue
            for f in ((fields,) if isinstance(fields, str) else fields):
                if f in m and isinstance(m[f], (int, float)):
                    m[f] = int(round(m[f] * mul[key])) if f != "sp" else round(m[f] * mul[key], 3)
        for f, dv in add.items():                 # lv / ac 처럼 '더하는' 값
            if f in m and isinstance(m[f], (int, float)):
                m[f] = m[f] + dv
        for f in ("hp", "d1", "d2", "xp"):        # 배수로 0 이 되면 몹이 망가진다
            if f in m and isinstance(m[f], int) and m[f] < 1:
                m[f] = 1
        if m.get("d2", 0) < m.get("d1", 0):
            m["d2"] = m["d1"]
        # 출혈·중독 피해도 공격 배수를 따른다 — 수치 하나만 안 오르면 변종이 약하게 느껴진다
        if "dmg" in mul:
            for st in ("bleed", "poison"):
                if isinstance(m.get(st), dict) and isinstance(m[st].get("dmg"), (int, float)):
                    m[st]["dmg"] = max(1, int(round(m[st]["dmg"] * mul["dmg"])))
        if "gold" in mul:
            for dr in m.get("drops") or []:
                if dr and dr[0] == "adena" and len(dr) >= 3:
                    dr[1] = max(1, int(round(dr[1] * mul["gold"])))
                    dr[2] = max(dr[1], int(round(dr[2] * mul["gold"])))
        m["vb"] = base_k                          # 시트 원종 (02d_mobsheet.js)
        m["vt"] = tint                            # 색 보정
        if v.get("_pack"):
            m["vp"] = v["_pack"]                  # 이 변종을 들여온 확장팩
        mobs[vk] = m
        if base_k in foot:
            foot[vk] = foot[base_k]
        made += 1
    if err:
        log("  [변종 오류] %d건 — 빌드를 중단합니다:" % len(err))
        for e in err:
            log("    - " + e)
        raise SystemExit(1)
    log("  몹 변종 전개: %d종 (원종 %d종 + 변종 %d종 = %d종, 에셋 추가 0)"
        % (made, len(mobs) - made, made, len(mobs)))
    return data


# ============================================================================
# 데이터 정합성 검사 — R19a
#   확장팩에서 제일 흔한 사고는 코드 버그가 아니라 **오타**다(몹 이름·존 번호).
#   예전엔 검사가 없어서 존재하지 않는 몹 이름이 그대로 출하되고 런타임에서 터졌다
#   (고장 주입 실험에서 확인: 빌드 통과 -> 플레이 중 "Cannot read properties of undefined").
#   여기서 잡으면 "출하 후 크래시"가 "빌드 실패"로 내려온다.
# ============================================================================
def validate_data(data):
    err, warn = [], []
    zones = data.get("ZONES") or []
    mobs = data.get("MOBS") or {}
    acts = data.get("ACTS") or []
    items = data.get("ITEMS") or {}

    # 1) 존: 스폰 몹 이름 · 게이트 목적지 · 좌표 범위
    for zi, z in enumerate(zones):
        w, h = z.get("w", 0), z.get("h", 0)
        for s in z.get("spawns") or []:
            if s[0] not in mobs:
                err.append("존%d(%s) 스폰 몹 '%s' 이 MOBS 에 없음" % (zi, z.get("name", "?"), s[0]))
        for g in z.get("gates") or []:
            if not (0 <= g.get("to", -1) < len(zones)):
                err.append("존%d 게이트 목적지 %s 가 존 범위(0~%d) 밖" % (zi, g.get("to"), len(zones) - 1))
            if not (0 <= g.get("x", -1) < w and 0 <= g.get("y", -1) < h):
                err.append("존%d 게이트 좌표(%s,%s) 가 맵(%dx%d) 밖" % (zi, g.get("x"), g.get("y"), w, h))
        for s in z.get("spawns") or []:
            if len(s) >= 4 and not (0 <= s[2] < w and 0 <= s[3] < h):
                err.append("존%d 스폰 좌표(%s,%s) 가 맵(%dx%d) 밖" % (zi, s[2], s[3], w, h))
        # 지형 테마 — 없으면 조용히 grass 로 폴백해서 "왜 던전이 초원색이지?" 가 된다
        if data.get("THEME") and z.get("theme") not in (data.get("THEME") or {}):
            err.append("존%d(%s) 테마 '%s' 가 THEME 에 없음 (초원색으로 조용히 폴백된다)"
                       % (zi, z.get("name", "?"), z.get("theme")))

    # 1-b) 게이트 도착 좌표가 목적지의 다른 문 위면 **즉시 되돌아간다**
    #   문은 0.65타일 안에 들어오면 자동 발동한다(18_update.js). 그래서 A->B 의 도착점을
    #   B 의 되돌아가는 문 칸에 그대로 찍으면 도착하자마자 A 로 튕긴다 — 층을 못 넘는다.
    #   본편 데이터는 이걸 알고 한 칸 비켜 찍어 두었는데(존1 게이트 tx,ty=2,3 / 존2 문 2,2),
    #   확장팩을 쓰다 실제로 이 실수를 냈다(예시 팩 초안). 그래서 검사로 고정한다.
    for zi, z in enumerate(zones):
        for g in z.get("gates") or []:
            to = g.get("to", -1)
            if not (0 <= to < len(zones)):
                continue
            for g2 in zones[to].get("gates") or []:
                if abs(g.get("tx", -99) - g2.get("x", 99)) < 0.66 and abs(g.get("ty", -99) - g2.get("y", 99)) < 0.66:
                    err.append("존%d 게이트 도착점(%s,%s) 이 존%d 의 문(%s,%s) 위 — 도착 즉시 튕긴다"
                               % (zi, g.get("tx"), g.get("ty"), to, g2.get("x"), g2.get("y")))

    # 2) 몹: 아트(act) 존재 · 필수 수치
    for k, m in mobs.items():
        for need in ("n", "hp", "d1", "d2", "xp"):
            if need not in m:
                err.append("몹 '%s' 에 필수 항목 %s 없음" % (k, need))
        if m.get("fam") and data.get("FACTION") and m["fam"] not in ("wild", "demon", "undead"):
            warn.append("몹 '%s' 계열 '%s' 이 특효 판정 3종(wild/demon/undead) 밖" % (k, m["fam"]))
        # 2-b) 변종(R19b): 원종 시트가 없으면 색을 바꿀 대상이 없다 — 원종과 똑같이 보인다
        if m.get("vt"):
            if not os.path.isdir(os.path.join(ROOT, "assets", "mob", m.get("vb", ""))):
                warn.append("변종 '%s' 의 원종 시트 assets/mob/%s 가 없어 색 변경이 적용되지 않음"
                            " (절차 생성 폴백 — 원종과 같은 모습)" % (k, m.get("vb")))
            if not (m["vt"].get("hset") is not None or m["vt"].get("dh") or m["vt"].get("tone")
                    or m["vt"].get("dv", 1) != 1 or m["vt"].get("ds", 1) != 1):
                warn.append("변종 '%s' 의 색 보정이 비어 있어 원종과 구분되지 않음" % k)

    # 3) 부(ACT): 층->존 유효 · 층 번호 겹침 · 보스층 존재 · 선행 flag 존재
    seen_floor, flags = {}, set(a.get("clearFlag") for a in acts)
    for a in acts:
        fl = a.get("floors") or {}
        if not fl:
            err.append("부 '%s' 에 floors 가 없음" % a.get("id"))
        for k, zi in fl.items():
            if not (0 <= zi < len(zones)):
                err.append("부 '%s' %s층이 없는 존 %s 을 가리킴 (존 0~%d)" % (a.get("id"), k, zi, len(zones) - 1))
            if k in seen_floor:
                err.append("층 번호 %s 가 부 '%s' 와 '%s' 에 겹침" % (k, seen_floor[k], a.get("id")))
            seen_floor[k] = a.get("id")
        if str(a.get("boss")) not in fl:
            err.append("부 '%s' 의 보스층 %s 가 floors 에 없음" % (a.get("id"), a.get("boss")))
        if a.get("req") and a.get("req") not in flags:
            err.append("부 '%s' 의 선행 조건 '%s' 를 내주는 부가 없음" % (a.get("id"), a.get("req")))
        ent = a.get("entry") or {}
        if not (0 <= ent.get("z", -1) < len(zones)):
            err.append("부 '%s' 진입 존 %s 가 존 범위 밖" % (a.get("id"), ent.get("z")))

    # 4) 스킬: 해금 레벨 상한 (5층 완주 실측 레벨 15 — 넘으면 영원히 못 쓰는 스킬이 된다)
    for cls, lst in (data.get("SKILLS") or {}).items():
        if cls == "k":
            continue                      # 기사는 상점 구매라 레벨 무관
        for s in lst:
            if s.get("lv", 1) > 15:
                err.append("스킬 '%s'(%s계열) 해금 레벨 %s 는 도달 불가 (상한 15)" % (s.get("id"), cls, s.get("lv")))

    # 5) 시작 장비가 실제 아이템인가
    for cls, c in (data.get("CLS") or {}).items():
        for k in c.get("start") or []:
            if items and k not in items:
                err.append("계열 '%s' 시작 장비 '%s' 이 ITEMS 에 없음" % (cls, k))

    for w in warn:
        log("  [정합성 경고] " + w)
    if err:
        log("  [정합성 오류] %d건 — 빌드를 중단합니다:" % len(err))
        for e in err:
            log("    - " + e)
        raise SystemExit(1)
    log("  데이터 정합성 검사 통과 (존 %d · 몹 %d · 부 %d)" % (len(zones), len(mobs), len(acts)))

PC_FILES = {
    "idle_s":"knight_final_south_48px.png",  "idle_w":"knight_final_west_48px.png",
    "idle_n":"knight_final_north_48px.png",
    "walk_s":"knight_walk_south_sheet_48px.png", "walk_w":"knight_walk_west_sheet_48px.png",
    "walk_n":"knight_walk_north_sheet_48px.png",
    "attack":"knight_attack_sheet_48px.png",  "death":"knight_death_sheet_v2_48px.png",
}
def pcsheet_block(external=False):
    """assets/pc/*.png -> PCSHEET. 파일이 없으면 빈 객체 -> drawHum 폴백.
       external=True 면 base64 대신 상대경로를 넣는다 (폴더 배포용).
       로더(02c_pcsheet.js)는 img.src 에 그대로 넣으므로 둘 다 그대로 동작한다."""
    import base64
    pdir = os.path.join(ROOT, "assets", "pc")
    parts, total = [], 0
    for key, fn in PC_FILES.items():
        p = os.path.join(pdir, fn)
        if not os.path.exists(p):
            log("  [경고] 기사 에셋 없음: " + fn); continue
        raw = open(p, "rb").read(); total += len(raw)
        if external:
            parts.append('%s:"assets/pc/%s"' % (key, fn))
        else:
            parts.append('%s:"data:image/png;base64,%s"' % (key, base64.b64encode(raw).decode("ascii")))
    if parts:
        log("  assets/pc      %d개 / %.0f KB%s" % (len(parts), total / 1024.0,
                                                   "  (외부 파일 참조)" if external else "  (내장)"))
    return "var PCSHEET = {" + ",".join(parts) + "};"

def titleart_block(external=False):
    """assets/ui/title.jpg -> TITLEART (시작 화면 배경). 없으면 빈 문자열 -> 기존 그라디언트 유지."""
    import base64
    p = os.path.join(ROOT, "assets", "ui", "title.jpg")
    if not os.path.exists(p):
        return 'var TITLEART = "";'
    raw = open(p, "rb").read()
    log("  assets/ui/title.jpg  %.0f KB%s" % (len(raw) / 1024.0, "  (외부 파일 참조)" if external else "  (내장)"))
    if external:
        return 'var TITLEART = "assets/ui/title.jpg";'
    return 'var TITLEART = "data:image/jpeg;base64,%s";' % base64.b64encode(raw).decode("ascii")

def itemart_block(external=False):
    """assets/ui/item/<아이템키>.png -> ITEMART. R24 아이템 그림 아이콘.
       대표 지시: "아이템들 아이콘들도 그림 뽑아서 만들도록하자".
       파일 이름이 곧 아이템 키다(hpot.png -> ITEMS.hpot). 04_icons.js 가 있으면 그림,
       없으면 지금까지의 절차 아이콘을 쓴다 — **한 벌씩 나눠 출하해도 화면이 깨지지 않는다.**
       ★ 아이콘은 40px 안팎의 작은 PNG 라 장당 2~4KB 다. 72종을 다 넣어도 ~200KB.
         (배경 일러스트와 달리 크기를 걱정할 필요가 없다.)"""
    import base64
    idir = os.path.join(ROOT, "assets", "ui", "item")
    if not os.path.isdir(idir):
        return "var ITEMART = {};"
    parts, total = [], 0
    for fn in sorted(os.listdir(idir)):
        ext = os.path.splitext(fn)[1].lower()
        if ext not in (".png", ".webp"):
            continue
        key = os.path.splitext(fn)[0]
        p2 = os.path.join(idir, fn)
        raw = open(p2, "rb").read(); total += len(raw)
        mime = "image/webp" if ext == ".webp" else "image/png"
        if external:
            parts.append('"%s":"assets/ui/item/%s"' % (key, fn))
        else:
            parts.append('"%s":"data:%s;base64,%s"' % (key, mime, base64.b64encode(raw).decode("ascii")))
    if parts:
        log("  assets/ui/item/*      %d종 / %.0f KB%s" % (len(parts), total / 1024.0,
            "  (외부 파일 참조)" if external else "  (내장)"))
    return "var ITEMART = {" + ",".join(parts) + "};"


def hubart_block(external=False):
    """assets/ui/hub_*.jpg -> HUBART. 거점(허브) 배경화.
       R21: 27_hub.js 가 HUBS[].bg 에 적힌 파일명으로 HUBART 를 찾는다. 없으면 절차 배경으로 폴백.
       ★ 대표님이 PC 스프라이트 공장에서 그림을 뽑아 여기 넣으면 **데이터 한 줄로 붙는다**:
         ① assets/ui/hub_seo.jpg 처럼 파일을 넣고
         ② data/hubs.json 의 그 지역 "bg": "hub_seo.jpg" 로 적으면 끝.
       파일이 없으면 그냥 빈 객체다 — 지금처럼 절차 배경이 나온다."""
    import base64
    udir = os.path.join(ROOT, "assets", "ui")
    if not os.path.isdir(udir):
        return "var HUBART = {};"
    parts, total = [], 0
    for fn in sorted(os.listdir(udir)):
        # R23: 시설 화면 배경(fac_<지역>_<시설>.jpg)도 같은 HUBART 에 담는다.
        # 28_facroom.js 가 facArtName() 으로 이 이름을 찾는다 — 없으면 절차 실내 배경.
        if not (fn.startswith("hub_") or fn.startswith("fac_")):
            continue
        ext = os.path.splitext(fn)[1].lower()
        if ext not in (".jpg", ".jpeg", ".png"):
            continue
        p2 = os.path.join(udir, fn)
        raw = open(p2, "rb").read(); total += len(raw)
        mime = "image/png" if ext == ".png" else "image/jpeg"
        if external:
            parts.append('"%s":"assets/ui/%s"' % (fn, fn))
        else:
            parts.append('"%s":"data:%s;base64,%s"' % (fn, mime, base64.b64encode(raw).decode("ascii")))
    if parts:
        log("  assets/ui/hub_*·fac_* %d장 / %.0f KB%s" % (len(parts), total / 1024.0,
            "  (외부 파일 참조)" if external else "  (내장)"))
    else:
        log("  assets/ui/hub_*      없음 — 거점 배경은 절차 생성으로 표시됩니다")
    return "var HUBART = {" + ",".join(parts) + "};"

# R33 — 앞 6개는 프롤로그, 뒤 5개는 엔딩(R32 신설). 파일이 없으면 절차 생성 장면으로 폴백하므로
#       비어 있어도 게임은 그대로 돌아간다. assets/ui/prologue_{키}.jpg 를 넣는 순간 그림이 우선한다.
PROLOG_SCENES = ["stars", "tattoo", "map", "north", "seal", "you",
                 "e_throne", "e_twoknights", "e_silence", "e_wrongreturn", "e_inward"]
def prologart_block(external=False):
    """assets/ui/prologue_{장면}.jpg -> PROLOGART. 없는 장면은 기존 캔버스 연출로 폴백."""
    import base64
    parts, total = [], 0
    for sc in PROLOG_SCENES:
        p = os.path.join(ROOT, "assets", "ui", "prologue_%s.jpg" % sc)
        if not os.path.exists(p):
            continue
        raw = open(p, "rb").read(); total += len(raw)
        if external:
            parts.append('%s:"assets/ui/prologue_%s.jpg"' % (sc, sc))
        else:
            parts.append('%s:"data:image/jpeg;base64,%s"' % (sc, base64.b64encode(raw).decode("ascii")))
    if parts:
        log("  assets/ui/prologue  %d/%d장 / %.0f KB" % (len(parts), len(PROLOG_SCENES), total / 1024.0))
    miss = [s for s in PROLOG_SCENES if not os.path.exists(
        os.path.join(ROOT, "assets", "ui", "prologue_%s.jpg" % s))]
    if miss:
        log("  [컷신] 빈 슬롯 %d개: %s  → 절차 생성 장면으로 폴백" % (len(miss), ", ".join(miss)))
    return "var PROLOGART = {" + ",".join(parts) + "};"

MOB_FILES = {
    "idle_s":"{m}_final_south_48px.png",  "idle_w":"{m}_final_west_48px.png",
    "idle_n":"{m}_final_north_48px.png",
    "walk_s":"{m}_walk_south_sheet_48px.png", "walk_w":"{m}_walk_west_sheet_48px.png",
    "walk_n":"{m}_walk_north_sheet_48px.png",
    "attack":"{m}_attack_sheet_48px.png",  "death":"{m}_death_sheet_v2_48px.png",
}
def mobsheet_block(external=False):
    """assets/mob/{몹}/*.png -> MOBSHEET.
       스프라이트 공장(finalize.py)이 내놓는 game_ready/{몹}/ 을 그대로 복사해 넣으면 된다.
       폴더가 없으면 빈 객체 -> 전 몹이 기존 절차 생성으로 그려진다."""
    import base64
    mdir = os.path.join(ROOT, "assets", "mob")
    if not os.path.isdir(mdir):
        return "var MOBSHEET = {};"
    mobs, total, cnt = [], 0, 0
    for mob in sorted(os.listdir(mdir)):
        d = os.path.join(mdir, mob)
        if not os.path.isdir(d):
            continue
        parts = []
        for key, pat in MOB_FILES.items():
            fn = pat.format(m=mob)
            p2 = os.path.join(d, fn)
            if not os.path.exists(p2):
                continue
            if external:
                parts.append('%s:"assets/mob/%s/%s"' % (key, mob, fn))
            else:
                raw = open(p2, "rb").read(); total += len(raw)
                parts.append('%s:"data:image/png;base64,%s"' % (key, base64.b64encode(raw).decode("ascii")))
            cnt += 1
        if parts:
            mobs.append('"%s":{%s}' % (mob, ",".join(parts)))
            log("  assets/mob/%-10s %d개" % (mob, len(parts)))
    if mobs:
        log("  몹 시트 %d종 / 파일 %d개%s" % (len(mobs), cnt,
            "" if external else " / %.0f KB 내장" % (total/1024.0)))
    return "var MOBSHEET = {" + ",".join(mobs) + "};"

# R33 — 음악 슬롯. 파일명(키) = 존의 song 키 = MUSICMAP 의 키. 셋을 같은 이름으로 통일해 둔다.
#   intro  타이틀·프롤로그   town  거점 3곳      field 필드
#   dun    1부 던전          dun2  2부 산중      dun3  3부 마경(남빛)
#   boss   보스층 3곳        ending 엔딩
MUSIC_SLOTS = ("intro", "town", "field", "dun", "dun2", "dun3", "boss", "ending")


def music_block(with_music, external=False):
    """assets/music/*.mp3 를 base64 로 묶어 MUSICSRC 전역으로 만든다.
       --music 없이 빌드하면 빈 객체 -> 게임이 자동으로 칩튠으로 폴백한다.

       R33 — 예전엔 실을 곡 목록이 ("intro","field","dungeon","town") 으로 **하드코딩**되어 있어서
       boss.mp3 를 넣어도 빌드가 쳐다보지 않았다. 이제 폴더에 있는 mp3 를 전부 싣고,
       MUSIC_SLOTS 중 빠진 것을 '빈 슬롯'으로 보고한다(그 구간은 칩튠으로 폴백).
       슬롯에 없는 이름의 mp3 도 싣는다 — 새 곡을 실험할 때 build.py 를 고치지 않아도 되게."""
    import base64
    mdir = os.path.join(ROOT, "assets", "music")
    if not with_music or not os.path.isdir(mdir):
        return "var MUSICSRC = {};", 0
    found = sorted(f[:-4] for f in os.listdir(mdir) if f.lower().endswith(".mp3"))
    parts, total = [], 0
    for key in found:
        p = os.path.join(mdir, key + ".mp3")
        raw = open(p, "rb").read(); total += len(raw)
        if external:
            parts.append('%s:"assets/music/%s.mp3"' % (key, key))
        else:
            parts.append('%s:"data:audio/mpeg;base64,%s"' % (key, base64.b64encode(raw).decode("ascii")))
        mark = " " if key in MUSIC_SLOTS else "+"      # + = 슬롯 목록에 없는 추가 곡
        log("  music/%-10s %7.0f KB %s" % (key + ".mp3", len(raw) / 1024.0, mark))
    missing = [k for k in MUSIC_SLOTS if k not in found]
    log("  [음악] %d/%d 슬롯 채움 (%.1f MB)" % (len(MUSIC_SLOTS) - len(missing), len(MUSIC_SLOTS), total / 1048576.0))
    if missing:
        log("  [음악] 빈 슬롯 %d개: %s  → 대체곡/무음으로 폴백 (05b_music.js MUSICFALL)" % (len(missing), ", ".join(missing)))
    return "var MUSICSRC = {" + ",".join(parts) + "};", total

# 배포본에서 강제로 되돌릴 값. data/balance.json 은 개발 편의를 위해 배수를 켜 둔 채 유지하고,
# --release 로 빌드할 때만 이 값으로 덮어쓴다. 파일을 앞뒤로 갈아엎다 되돌리기를 잊는 사고를 막는다.
RELEASE_BALANCE = {
    "GOLD_MULT": 1,
    "DROP_MULT": 1,
    "XP_MULT": 1,
    "TEST_GOLD": 0,
    "MOB_XP_MULT": 1,
}

def build(out_path=None, check=False, with_music=False, external=False, release=False, lang="ko", strict=False):
    # ---------- 0) 언어 사전 (R29 영문판) ----------
    # 대표 지시: "우리도 일단 영문버젼까지는 지원되게 해야할듯" → 구조는 '빌드 시 치환, 한/영 2파일'.
    # 사전(data/i18n_en.json)을 **데이터·코드·템플릿 세 층에 똑같이** 적용한다. 세 층을 같은 사전으로
    # 바꾸므로 한글 문자열을 키로 쓰는 로직(분류명 비교 등)도 등호가 그대로 유지된다.
    i18n_tbl, i18n_miss = {}, None
    if lang != "ko":
        sys.path.insert(0, os.path.join(ROOT, "tools"))
        import i18n as I18N, collections as _c
        i18n_tbl = I18N.load_dict(lang)
        i18n_miss = _c.Counter()
        log("  [%s] 사전 %d항목 적용" % (lang, len(i18n_tbl)))
    # ---------- 1) 데이터 ----------
    chunks = []
    total_keys = 0
    merged = {}          # 전 데이터 파일을 합친 것 — 팩 병합·정합성 검사에 쓴다
    origin = {}          # 키 -> 어느 파일에서 왔는지 (출력 순서 유지용)
    for fn in DATA_FILES:
        path = os.path.join(DATA, fn)
        if not os.path.exists(path):
            # T-P1-9 안전장치 — 예전엔 경고만 찍고 빌드를 계속했다. 그런데 DATA_FILES 는
            # 전부 '없으면 게임이 성립하지 않는' 본편 데이터다(팩 pack_*.json 만 선택 사항이며
            # 그쪽은 load_packs 가 따로 다룬다). 빠진 채로 빌드가 성공하면 런타임에서 터진다.
            raise SystemExit("  [빌드 중단] 데이터 파일 없음: data/%s\n"
                             "    본편 데이터는 전부 필수입니다(확장팩 pack_*.json 만 선택)." % fn)
        with io.open(path, encoding="utf-8") as f:
            obj = json.load(f)
        if release and fn == "balance.json":
            changed = []
            for k, v in RELEASE_BALANCE.items():
                if k in obj and obj[k] != v:
                    changed.append("%s %s->%s" % (k, obj[k], v))
                obj[k] = v
            log("  [배포] 밸런스 원복: " + (", ".join(changed) if changed else "이미 원복 상태"))
        for k, v in obj.items():
            merged[k] = v
            origin.setdefault(fn, []).append(k)
        log("  data/%-15s %3d개 항목" % (fn, len(obj)))

    # ---------- 1-b) 확장팩 병합 + 정합성 검사 (R19a) ----------
    packs = load_packs()
    if packs:
        merge_packs(merged, packs)
    expand_variants(merged)          # R19b — 팩이 들여온 변종까지 함께 펼친다
    validate_data(merged)

    if i18n_miss is not None:
        merged = I18N.apply_json(merged, i18n_tbl, i18n_miss)

    for fn, keys in origin.items():
        chunks.append("/* ---- data/%s ---- */" % fn)
        for k in keys:
            chunks.append("var %s = %s;" % (k, json.dumps(merged[k], ensure_ascii=False)))
            total_keys += 1
    # 팩이 새로 들여온 키(본편에 없던 것)도 내보낸다
    known = set(k for ks in origin.values() for k in ks)
    extra = [k for k in merged if k not in known]
    if extra:
        chunks.append("/* ---- 확장팩 신규 키 ---- */")
        for k in extra:
            chunks.append("var %s = %s;" % (k, json.dumps(merged[k], ensure_ascii=False)))
            total_keys += 1
    # 팩 소유 플래그 — 코드(actOwned)가 이걸 본다.
    # 스팀 출시 때는 이 값을 Steamworks 의 DLC 소유 조회로 갈아끼운다(3-A 참고).
    chunks.append("/* ---- 확장팩 소유 상태 ---- */")
    chunks.append("var PACK_OWNED = %s;" % json.dumps(
        dict((p["id"], bool(p["owned"])) for p in packs), ensure_ascii=False))
    chunks.append("/* ---- assets/pc (base64, Phase 2: assets/ 분리 예정) ---- */")
    chunks.append(pcsheet_block(external))
    chunks.append("/* ---- assets/mob (Phase 2 몬스터 시트) ---- */")
    chunks.append(mobsheet_block(external))
    chunks.append("/* ---- assets/ui (타이틀 일러스트) ---- */")
    chunks.append(titleart_block(external))
    chunks.append(prologart_block(external))
    chunks.append("/* ---- assets/ui (거점 배경) ---- */")
    chunks.append(hubart_block(external))
    chunks.append("/* ---- assets/ui/item (아이템 그림 아이콘) ---- */")
    chunks.append(itemart_block(external))
    mblock, msize = music_block(with_music, external)
    chunks.append("/* ---- assets/music (base64) ---- */")
    chunks.append(mblock)
    data_block = "\n".join(chunks)

    # ---------- 2) 코드 ----------
    order_path = os.path.join(SRC, "_order.json")
    # T-P1-9 안전장치 — 예전엔 _order.json 이 없으면 파일명 알파벳순으로 폴백했다.
    # 그런데 실제 순서는 의도적 비정렬이다(18b_autohunt -> 18_update, 23_main 이 맨 뒤).
    # 즉 폴백은 **항상 오답**이고, 더 나쁜 건 빌드는 성공하고 런타임에서만 깨진다는 점이다.
    # 조용히 잘못된 빌드를 내보내느니 여기서 멈춘다.
    if not os.path.exists(order_path):
        raise SystemExit("  [빌드 중단] src/_order.json 이 없습니다.\n"
                         "    모듈 로드 순서는 이 파일이 진실이며 파일명 알파벳순과 다릅니다.\n"
                         "    (18b_autohunt -> 18_update, 23_main 이 맨 뒤)\n"
                         "    알파벳순으로 폴백하면 빌드는 성공하지만 런타임에서 깨집니다.")
    with io.open(order_path, encoding="utf-8") as f:
        order = json.load(f)
    code_parts = []
    for fn in order:
        path = os.path.join(SRC, fn)
        if not os.path.exists(path):
            log("  [경고] 소스 없음: " + fn); continue
        with io.open(path, encoding="utf-8") as f:
            body = f.read()
        if i18n_miss is not None:
            body = I18N.apply_js(body, i18n_tbl, i18n_miss)
        code_parts.append("/* ================= src/%s ================= */\n%s" % (fn, body))
    code_block = "\n".join(code_parts)
    log("  src 모듈 %d개 결합" % len(code_parts))

    # ---------- 3) 껍데기 ----------
    with io.open(os.path.join(ROOT, "shell", "template.html"), encoding="utf-8") as f:
        html = f.read()
    if i18n_miss is not None:
        html = I18N.apply_html(html, i18n_tbl, i18n_miss)
        html = html.replace('<html lang="ko">', '<html lang="%s">' % lang)
    stamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    banner = ("/* 빌드: %s  |  %s  |  이 파일은 build.py 산출물입니다. 직접 수정하지 말고 소스를 고치세요. */"
              % (stamp, "배포본 (밸런스 원복)" if release else "개발본 (테스트 배수 켜짐)"))
    # R26 — 플레이 기록 리포트가 어느 빌드에서 나온 것인지 적을 수 있게 상수로 심는다
    stamp_js = 'var BUILD_STAMP = "%s %s";' % (stamp, "배포본" if release else "개발본")
    html = html.replace("/*__DATA__*/", banner + "\n" + stamp_js + "\n" + data_block)
    html = html.replace("/*__CODE__*/", code_block)

    # ---------- 3.5) 번역 상태 보고 ----------
    # ★ 반드시 '출력' 앞이어야 한다. 뒤에 두면 --strict 로 중단해도 산출물 HTML 이 이미 디스크에
    #   쓰인 뒤라, 실패한 빌드가 정상 파일처럼 남는다(실측으로 확인하고 여기로 옮겼다).
    if i18n_miss is not None:
        # 미번역이 남아 있으면 몇 개인지, 어떤 것이 가장 자주 나오는지 즉시 알려 준다.
        # (조용히 한글이 섞여 나가는 것이 영문판에서 가장 흔한 사고다)
        tot = sum(i18n_miss.values())
        if tot:
            log("  [%s] 미번역 %d종(등장 %d회) — 상위: %s"
                % (lang, len(i18n_miss), tot,
                   " / ".join("%s(%d)" % (k[:18], n) for k, n in i18n_miss.most_common(5))))
        else:
            log("  [%s] 미번역 0 — 한글이 남지 않았습니다" % lang)
        # T-P1-9 안전장치 — --strict 는 미번역이 하나라도 남으면 빌드를 실패시킨다.
        # 배포 빌드에만 붙이면 "영문판에 한글이 섞여 나가는" 사고가 구조적으로 막힌다.
        if strict and tot:
            raise SystemExit("  [빌드 중단] --strict: %s 미번역 %d종(등장 %d회)이 남아 있습니다.\n"
                             "    산출물을 쓰지 않고 멈췄습니다.\n"
                             "    python tools/i18n.py extract 로 목록을 뽑아 data/i18n_en.json 을 채우십시오."
                             % (lang, len(i18n_miss), tot))

    # ---------- 4) 출력 ----------
    if not out_path:
        if not os.path.isdir(DIST):
            os.makedirs(DIST)
        out_path = os.path.join(DIST, "game_분열된세계_ONLINE%s%s.html"
                                % ("_EN" if lang == "en" else "", "_배포" if release else ""))
    with io.open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    log("  산출물: %s  (%,d bytes)".replace(",d", "d") % (out_path, len(html.encode("utf-8"))))

    # ---------- 5) 검사 ----------
    if check:
        # base64 음원은 문법검사에서 제외 (수 MB 문자열이라 느리기만 하다)
        js = "\n".join(c for c in chunks if "base64," not in c) + "\n" + code_block
        tmp = os.path.join(ROOT, "_syntax_check.js")
        with io.open(tmp, "w", encoding="utf-8") as f:
            f.write(js)
        try:
            r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
            if r.returncode == 0:
                log("  문법검사 통과")
            else:
                log("  문법검사 실패:\n" + (r.stderr or "")[:1200])
                return 1
        except Exception:
            log("  (node 가 없어 문법검사를 건너뜁니다)")
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)
    return 0

def build_folder(check=False, release=False):
    """스팀/Electron 배포용 폴더 산출물.
       에셋을 base64 로 말지 않고 파일 그대로 둔다 — 몹 스프라이트가 14종으로 늘면
       내장 방식은 HTML 이 수 MB 로 불어나고 빌드도 느려진다.
       주의: 외부 파일 참조라 index.html 을 그냥 더블클릭하면 브라우저 보안 정책에
             막힐 수 있다. 로컬 확인은 serve.py, 배포는 Electron 을 쓴다."""
    import shutil
    outdir = os.path.join(ROOT, "dist_game")
    if os.path.isdir(outdir):
        shutil.rmtree(outdir)
    os.makedirs(outdir)
    rc = build(out_path=os.path.join(outdir, "index.html"), check=check,
               with_music=True, external=True, release=release)
    src_assets = os.path.join(ROOT, "assets")
    if os.path.isdir(src_assets):
        shutil.copytree(src_assets, os.path.join(outdir, "assets"))
    n = sum(len(f) for _, _, f in os.walk(outdir))
    sz = sum(os.path.getsize(os.path.join(r, f))
             for r, _, fs in os.walk(outdir) for f in fs)
    log("  폴더 산출물: %s  (파일 %d개 / %.1f MB)" % (outdir, n, sz / 1048576.0))
    return rc

if __name__ == "__main__":
    args = sys.argv[1:]
    out = None
    if "--out" in args:
        out = args[args.index("--out") + 1]
    music = ("--music" in args)
    log("분열된 세계 ONLINE - 빌드 시작")
    release = ("--release" in args)
    lang = "ko"
    if "--lang" in args:
        lang = args[args.index("--lang") + 1]
    if release:
        log("  ※ 배포 모드 — 테스트 배수를 1로 되돌려 빌드합니다.")
    if "--folder" in args:
        rc = build_folder(check=("--check" in args), release=release)
    else:
        rc = build(out_path=out, check=("--check" in args), with_music=music, release=release,
                   lang=lang, strict=("--strict" in args))
    log("완료" if rc == 0 else "실패")
    sys.exit(rc)
