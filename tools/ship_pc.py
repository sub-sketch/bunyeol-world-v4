# -*- coding: utf-8 -*-
"""
계열 전용 스프라이트 시트 출하 — 공장 산출물(game_ready/<이름>/) → assets/mob/<대상>/

왜 assets/mob 인가 (설계 근거)
  · 코드는 계열 시트를 두 경로로만 찾는다: "pc"(=assets/pc, 기사 전용) 또는 "mob:<이름>"(=assets/mob/<이름>).
  · 새 계열 시트를 assets/mob/pc_elf 처럼 넣으면 **코드 수정 0** 으로 붙는다
    (data/classes.json 의 SPRITE.<계열>.src 를 "mob:pc_elf" 로, dh 를 0 으로 되돌리면 끝).
  · 파일 이름 규칙은 build.py 의 MOB_FILES 와 같아야 한다 — 그래서 여기서 이름을 맞춰 준다.

쓰는 법
  python tools/ship_pc.py <원본폴더> <대상이름>
    예) python tools/ship_pc.py /tmp/factory/elf pc_elf
  확인만 하려면 --dry
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEED = {
    "final_south": "{t}_final_south_48px.png",
    "final_west":  "{t}_final_west_48px.png",
    "final_north": "{t}_final_north_48px.png",
    "walk_south":  "{t}_walk_south_sheet_48px.png",
    "walk_west":   "{t}_walk_west_sheet_48px.png",
    "walk_north":  "{t}_walk_north_sheet_48px.png",
    "attack":      "{t}_attack_sheet_48px.png",
    "death":       "{t}_death_sheet_v2_48px.png",
}
# 원본 파일명에서 역할을 알아내는 패턴 (공장 이름이 조금 달라도 잡히게)
PAT = [
    ("final_south", r"final_south|idle_south|_south_48"),
    ("final_west",  r"final_west|idle_west"),
    ("final_north", r"final_north|idle_north"),
    ("walk_south",  r"walk_south"),
    ("walk_west",   r"walk_west"),
    ("walk_north",  r"walk_north"),
    ("attack",      r"attack"),
    ("death",       r"death"),
]


def role_of(fn):
    low = fn.lower()
    if low.endswith(".bak") or "_prenorm" in low:
        return None
    if not low.endswith(".png"):
        return None
    # 걷기가 먼저 잡혀야 한다 — walk_south 가 final_south 패턴에도 걸리므로 순서를 지킨다
    for role, pat in [("walk_south", r"walk_south"), ("walk_west", r"walk_west"),
                      ("walk_north", r"walk_north"), ("attack", r"attack"), ("death", r"death"),
                      ("final_south", r"(final|idle)_south"), ("final_west", r"(final|idle)_west"),
                      ("final_north", r"(final|idle)_north")]:
        if re.search(pat, low):
            return role
    return None


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    src, target = sys.argv[1], sys.argv[2]
    dry = "--dry" in sys.argv
    if not os.path.isdir(src):
        print("원본 폴더가 없습니다: " + src)
        return 1
    found = {}
    for fn in sorted(os.listdir(src)):
        r = role_of(fn)
        if r and r not in found:
            found[r] = fn
    missing = [k for k in NEED if k not in found]
    print("찾은 파일 %d/8" % len(found))
    for k in NEED:
        print("  %-12s %s" % (k, found.get(k, "— 없음")))
    if missing:
        print("\n[경고] 빠진 역할: %s" % ", ".join(missing))
        print("       8개가 다 있어야 시트가 완성된다 — 없으면 그 동작만 절차 생성으로 폴백한다.")
    dst = os.path.join(ROOT, "assets", "mob", target)
    if dry:
        print("\n(확인만) → %s" % dst)
        return 0
    if not os.path.isdir(dst):
        os.makedirs(dst)
    n = 0
    for role, fn in found.items():
        out = os.path.join(dst, NEED[role].format(t=target))
        shutil.copy(os.path.join(src, fn), out)
        n += 1
    print("\n출하 %d개 → %s" % (n, dst))
    print("다음: ① python tools/normalize_sheets.py (앵커·발 접지 정규화)")
    print("      ② data/classes.json 의 SPRITE.<계열>.src 를 \"mob:%s\" 로, dh 를 0 으로" % target)
    print("      ③ python build.py --check")
    return 0


if __name__ == "__main__":
    sys.exit(main())
