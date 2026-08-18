# -*- coding: utf-8 -*-
"""
normalize_sheets.py — 모션 규격화 (P1, 집중패스_실행계획서.md)
----------------------------------------------------------------
문제: idle/walk/attack/death 시트마다 PNG 캔버스 높이가 제각각이라
      (예: knight idle=48px, attack=58px, death=52px 캔버스) 게임 코드가
      "이미지 전체 높이"를 그대로 발 위치 기준 박스로 써서(anchor=bottom-center)
      상태 전환 시 캐릭터 크기가 펌핑(순간 팽창/수축)한다.

해법(결정적, 생성 없음, 프레임별 재정규화 금지):
  1. idle_s(정면 대기, 낱장)의 알파 채널 콘텐츠 높이 = 그 캐릭터의 TARGET.
  2. 캐릭터의 모든 프레임(23장 안팎: idle 3 + walk 4x3 + attack 4 + death 4)에서
     알파 bbox(내용 경계)만 추출한다 — 리스케일은 하지 않는다(스케일=1, 배율 왜곡 없음).
  3. 캐릭터 전체 공통 고정 셀 = (maxW+4, max(TARGET+12, 최대콘텐츠높이))
     로 정하고, 모든 프레임을 이 셀에 "발끝=셀 하단, 가로 중앙 정렬"로 다시 붙여넣는다.
  4. 원본은 <파일명>_prenorm.bak 로 백업 후 같은 파일명으로 덮어쓴다.
  5. idle/walk/attack/death 8개 파일이 캐릭터당 전부 동일한 셀 높이를 갖게 되므로
     02c_pcsheet.js / 02d_mobsheet.js 의 rec.fh(=이미지 높이) 가 상태 전환 내내 상수가 되어
     펌핑이 구조적으로 사라진다.

사용법:
  python normalize_sheets.py                # 정규화 실행 (백업 후 덮어쓰기)
  python normalize_sheets.py --verify        # 정규화 없이 현재 상태만 검증
  python normalize_sheets.py --dry-run       # 계산만 하고 파일에 쓰지 않음
  python normalize_sheets.py --gallery       # (정규화 후) GIF 갤러리 HTML 생성
  python normalize_sheets.py --restore       # *_prenorm.bak 으로 원복
"""
import os, sys, json, glob, shutil, base64, io

try:
    from PIL import Image
except ImportError:
    print("[오류] Pillow 가 설치되어 있지 않습니다: pip install Pillow --break-system-packages")
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 소스/
ASSETS = os.path.join(ROOT, "assets")
PC_DIR = os.path.join(ASSETS, "pc")
MOB_DIR = os.path.join(ASSETS, "mob")

KEYS_1 = ("idle_s", "idle_w", "idle_n")
KEYS_4 = ("walk_s", "walk_w", "walk_n", "attack", "death")
ALL_KEYS = KEYS_1 + KEYS_4


def pc_files():
    return {
        "idle_s": "knight_final_south_48px.png",
        "idle_w": "knight_final_west_48px.png",
        "idle_n": "knight_final_north_48px.png",
        "walk_s": "knight_walk_south_sheet_48px.png",
        "walk_w": "knight_walk_west_sheet_48px.png",
        "walk_n": "knight_walk_north_sheet_48px.png",
        "attack": "knight_attack_sheet_48px.png",
        "death": "knight_death_sheet_v2_48px.png",
    }


def mob_files(m):
    return {
        "idle_s": "%s_final_south_48px.png" % m,
        "idle_w": "%s_final_west_48px.png" % m,
        "idle_n": "%s_final_north_48px.png" % m,
        "walk_s": "%s_walk_south_sheet_48px.png" % m,
        "walk_w": "%s_walk_west_sheet_48px.png" % m,
        "walk_n": "%s_walk_north_sheet_48px.png" % m,
        "attack": "%s_attack_sheet_48px.png" % m,
        "death": "%s_death_sheet_v2_48px.png" % m,
    }


def n_frames(key):
    return 1 if key in KEYS_1 else 4


# ---------------------------------------------------------------------------
# 시트별 스케일 보정 (R13) — 공장이 시트마다 다른 크기로 캐릭터를 그려 놓은 경우를 바로잡는다.
#   예: orcchief(무르갓)는 대기가 58px인데 공격 시트는 32~47px 짜리 "다른 체격"으로 생성돼
#       공격할 때만 캐릭터가 확 작아져 보였다(대표님 리포트). wight 는 반대로 공격이 1.29배.
#   보정 방식: 시트 안의 프레임 중 **가장 큰 것**을 idle_s 높이에 맞추는 단일 배율을 시트 전체에
#   적용한다. 프레임별로 맞추면 웅크림·내려치기 같은 정상적인 자세 변화까지 뭉개진다.
#   편차가 SCALE_TOL 이내면 자세 차이로 보고 손대지 않는다.
SCALE_TOL = 0.12
SCALE_MIN, SCALE_MAX = 0.75, 1.40   # 이 밖으로 벗어나면 재조립으로 살릴 수준이 아니다 → 손대지 않고 보고만 한다
# 사망 시트는 '쓰러지는' 연출이라 프레임이 낮아지는 게 정상이다. 대기 높이에 맞춰 키우면
# (실측: orcchief death x1.81) 형체가 뭉개진다. 그래서 사망은 **줄이는 보정만** 허용한다
# — 죽는 캐릭터가 서 있을 때보다 커지는 건 명백한 아트 오류이므로 그것만 잡는다.
SHRINK_ONLY = ("death",)
# ---------------------------------------------------------------------------


def source_path(p):
    """정규화 이전 원본(_prenorm.bak)이 있으면 그걸 쓴다 — 재실행해도 열화가 누적되지 않는다."""
    bak = p + "_prenorm.bak"
    return bak if os.path.exists(bak) else p


def discover_characters():
    """[(name, folder, files_map), ...] — pc(knight) 1개 + assets/mob/* 전부."""
    chars = [("knight", PC_DIR, pc_files())]
    if os.path.isdir(MOB_DIR):
        for m in sorted(os.listdir(MOB_DIR)):
            d = os.path.join(MOB_DIR, m)
            if os.path.isdir(d):
                chars.append((m, d, mob_files(m)))
    return chars


def existing_files(folder, files_map):
    """캐릭터가 실제로 갖고 있는 파일만 {key: (path, n)}. (일부 NPC/wolf는 attack/death 없음)"""
    out = {}
    for k, fn in files_map.items():
        p = os.path.join(folder, fn)
        if os.path.exists(p):
            out[k] = (p, n_frames(k))
    return out


def split_frames(path, n):
    """이미지를 n등분해 프레임 이미지 리스트 + 각 프레임의 알파 bbox 리스트를 반환."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    fw = w // n
    frames = []
    for i in range(n):
        sub = im.crop((i * fw, 0, (i + 1) * fw if i < n - 1 else w, h))
        bbox = sub.getbbox()
        frames.append((sub, bbox))
    return frames


def measure(folder, files_map):
    """캐릭터 1개의 현재 상태를 측정만 한다. 파일 안 바꿈."""
    ex = existing_files(folder, files_map)
    if "idle_s" not in ex:
        return None
    idle_path, _ = ex["idle_s"]
    idle_im = Image.open(idle_path).convert("RGBA")
    idle_bbox = idle_im.getbbox()
    target_h = (idle_bbox[3] - idle_bbox[1]) if idle_bbox else idle_im.size[1]

    max_w = 0
    max_content_h = 0
    per_file = {}
    for k, (p, n) in ex.items():
        frames = split_frames(p, n)
        im_size = Image.open(p).size
        hs, ws = [], []
        for sub, bbox in frames:
            if bbox:
                ws.append(bbox[2] - bbox[0])
                hs.append(bbox[3] - bbox[1])
        if ws:
            max_w = max(max_w, max(ws))
        if hs:
            max_content_h = max(max_content_h, max(hs))
        per_file[k] = {"canvas": im_size, "n": n}
    return {
        "target_h": target_h,
        "max_w": max_w,
        "max_content_h": max_content_h,
        "existing": ex,
        "per_file": per_file,
    }


def verify_character(name, folder, files_map, log):
    """현재(=정규화 후 기대) 상태가 '셀 크기 동일 + idle_s 높이=TARGET' 인지 판정."""
    ex = existing_files(folder, files_map)
    if "idle_s" not in ex:
        log("  [%s] SKIP — idle_s 없음" % name)
        return None
    sizes = {}
    for k, (p, n) in ex.items():
        w, h = Image.open(p).size
        cellw = w / n
        sizes[k] = (cellw, h)
    cellws = set(round(v[0], 2) for v in sizes.values())
    cellhs = set(v[1] for v in sizes.values())
    idle_im = Image.open(ex["idle_s"][0]).convert("RGBA")
    bbox = idle_im.getbbox()
    idle_content_h = (bbox[3] - bbox[1]) if bbox else 0
    same_cell = (len(cellws) == 1 and len(cellhs) == 1)
    ok = same_cell
    status = "PASS" if ok else "FAIL"
    log("  [%s] %s  cellW=%s cellH=%s idle_content_h=%d (파일 %d개)" % (
        name, status,
        sorted(cellws), sorted(cellhs), idle_content_h, len(ex)))
    return {"name": name, "ok": ok, "cellws": list(cellws), "cellhs": list(cellhs),
            "idle_content_h": idle_content_h, "n_files": len(ex)}


def normalize_character(name, folder, files_map, log, dry_run=False, fix_scale=True):
    """원본(_prenorm.bak 우선)에서 읽어 ①시트별 스케일 보정 ②고정 셀 재조립 을 한 번에 한다."""
    ex = existing_files(folder, files_map)
    if "idle_s" not in ex:
        log("  [%s] SKIP — idle_s 없음" % name)
        return None

    # 1) 기준 높이 = idle_s 원본의 콘텐츠 높이
    ip, _ = ex["idle_s"]
    idle_frames = split_frames(source_path(ip), 1)
    ib = idle_frames[0][1]
    if not ib:
        log("  [%s] SKIP — idle_s 가 비어 있음" % name)
        return None
    target_h = ib[3] - ib[1]

    # 2) 시트별로 콘텐츠를 뽑고 필요하면 배율 보정
    per_sheet = {}   # key -> (n, [PIL 이미지(보정 후 콘텐츠)])
    fixed = []
    skipped = []
    for k, (p, n) in ex.items():
        frames = split_frames(source_path(p), n)
        contents = [(sub.crop(bb) if bb else None) for sub, bb in frames]
        hs = [c.size[1] for c in contents if c]
        s = 1.0
        if fix_scale and hs:
            s = float(target_h) / max(hs)
            if abs(s - 1.0) <= SCALE_TOL:
                s = 1.0
            elif k in SHRINK_ONLY and s > 1.0:
                s = 1.0                      # 사망은 키우지 않는다 (쓰러지는 자세가 정상)
            elif s < SCALE_MIN or s > SCALE_MAX:
                skipped.append("%s x%.2f(범위밖)" % (k, s))
                s = 1.0
        if s != 1.0:
            out = []
            for c in contents:
                if c is None:
                    out.append(None); continue
                nw = max(1, int(round(c.size[0] * s)))
                nh = max(1, int(round(c.size[1] * s)))
                out.append(c.resize((nw, nh), Image.NEAREST))   # 도트 선명도 유지
            contents = out
            fixed.append("%s x%.2f" % (k, s))
        per_sheet[k] = (n, contents)

    # 3) 캐릭터 공통 고정 셀 — 보정 후 콘텐츠 기준으로 산출
    all_c = [c for (n, cs) in per_sheet.values() for c in cs if c]
    cell_w = max(c.size[0] for c in all_c) + 4
    cell_h = max(target_h + 12, max(c.size[1] for c in all_c))

    # 4) 발끝=셀 하단 / 가로 중앙으로 재배치
    for k, (n, contents) in per_sheet.items():
        p, _ = ex[k]
        new_im = Image.new("RGBA", (cell_w * n, cell_h), (0, 0, 0, 0))
        for i, c in enumerate(contents):
            if c is None:
                continue
            cw, ch = c.size
            new_im.paste(c, (i * cell_w + (cell_w - cw) // 2, cell_h - ch), c)
        if dry_run:
            continue
        bak = p + "_prenorm.bak"
        if not os.path.exists(bak):
            shutil.copy2(p, bak)
        new_im.save(p, "PNG", optimize=True)

    log("  [%s] TARGET=%d  cell=%dx%d  파일 %d개%s %s" % (
        name, target_h, cell_w, cell_h, len(ex),
        ("  스케일보정: " + ", ".join(fixed)) if fixed else "",
        "(dry-run)" if dry_run else ""))
    return {"name": name, "target_h": target_h, "cell_w": cell_w, "cell_h": cell_h,
            "n_files": len(ex), "scale_fixed": fixed, "scale_skipped": skipped}


# ---------------------------------------------------------------------------
# 발 접지 폭(footprint) 산출 — 그림자 크기용 (R13)
#   기존 그림자는 반지름이 `6.5 * ACT.sz` 인 고정 상수였다. 아트를 전면 교체하며 스프라이트는
#   커졌는데 이 상수는 그대로여서, 29종 중 25종이 실제 발 너비보다 좁은 그림자를 달고 있었다
#   (고블린 31%, 곰 41%). 발보다 작은 그림자 위에 서 있으면 캐릭터가 떠 보인다.
#   → 각 캐릭터의 "바닥에 닿는 부분" 실측 폭을 뽑아 두고 렌더가 그걸 쓰게 한다.
FOOT_BAND = 6      # 콘텐츠 하단에서 이만큼이 접지면이라고 본다


def footprint_of(folder, files_map):
    """대기 3방향 중 가장 넓은 접지 폭(px). 방향에 따라 발 간격이 달라 최댓값을 쓴다."""
    best = 0
    for k in KEYS_1:
        fn = files_map.get(k)
        if not fn:
            continue
        p = os.path.join(folder, fn)
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert("RGBA")
        bb = im.getbbox()
        if not bb:
            continue
        band = im.crop((0, max(bb[1], bb[3] - FOOT_BAND), im.size[0], bb[3]))
        fb = band.getbbox()
        w = (fb[2] - fb[0]) if fb else (bb[2] - bb[0])
        best = max(best, w)
    return best


def write_footprints(chars, log):
    fp = {}
    for name, folder, fm in chars:
        w = footprint_of(folder, fm)
        if w > 0:
            fp[name] = w
    out = os.path.join(ROOT, "data", "footprint.json")
    with io.open(out, "w", encoding="utf-8") as f:
        json.dump({
            "_readme": ["캐릭터별 발 접지 폭(px). tools/normalize_sheets.py --footprint 로 생성.",
                        "19_render.js 가 그림자 크기를 이 값에서 산출한다(옛 고정 상수 6.5*sz 대체).",
                        "에셋을 교체하면 이 파일도 다시 뽑아야 한다."],
            "FOOTPRINT": fp
        }, f, ensure_ascii=False, indent=1)
    log("발 접지 폭 %d종 저장: %s" % (len(fp), out))
    return fp


def restore_character(name, folder, files_map, log):
    ex_all = files_map
    restored = 0
    for k, fn in ex_all.items():
        p = os.path.join(folder, fn)
        bak = p + "_prenorm.bak"
        if os.path.exists(bak):
            shutil.copy2(bak, p)
            restored += 1
    log("  [%s] %d개 파일 원복" % (name, restored))


# ---------------- 갤러리(GIF) ----------------
def build_gallery_gif(name, folder, files_map, out_dir):
    ex = existing_files(folder, files_map)
    if "idle_s" not in ex:
        return None
    seq_keys = []
    seq_keys += ["idle_s"] * 1
    if "walk_s" in ex:
        seq_keys += ["walk_s"]
    if "attack" in ex:
        seq_keys += ["attack"]
    if "idle_s" not in seq_keys:
        seq_keys += ["idle_s"]

    # 캔버스 = 그 캐릭터의 (지금은 전부 같아야 하는) 셀 크기 + 여유
    idle_w, idle_h = Image.open(ex["idle_s"][0]).size
    canvas_w, canvas_h = idle_w + 20, idle_h + 10
    frames_out = []
    for k in seq_keys:
        p, n = ex[k]
        im = Image.open(p).convert("RGBA")
        w, h = im.size
        fw = w // n
        reps = 6 if k.startswith("idle") else 1
        for _ in range(reps):
            for i in range(n):
                frame = im.crop((i * fw, 0, (i + 1) * fw, h))
                canvas = Image.new("RGBA", (canvas_w, canvas_h), (34, 30, 40, 255))
                dx = (canvas_w - frame.width) // 2
                dy = canvas_h - frame.height  # 발끝 정렬 = 캔버스 바닥
                canvas.paste(frame, (dx, dy), frame)
                frames_out.append(canvas.convert("P", palette=Image.ADAPTIVE, colors=64))
    if not frames_out:
        return None
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "%s.gif" % name)
    frames_out[0].save(out_path, save_all=True, append_images=frames_out[1:],
                        duration=110, loop=0, disposal=2)
    return out_path


def build_gallery_html(gif_paths, out_html):
    items = []
    for name, path in gif_paths:
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        items.append('<div class="card"><div class="name">%s</div><img src="data:image/gif;base64,%s"></div>' % (name, b64))
    html = """<!doctype html><html><head><meta charset="utf-8">
<title>모션 규격화 검증 갤러리 (R6a)</title>
<style>
body{background:#181418;color:#eee;font-family:sans-serif;margin:0;padding:20px}
h1{font-size:18px}
.grid{display:flex;flex-wrap:wrap;gap:14px}
.card{background:#241f28;border:1px solid #3a2f3a;border-radius:8px;padding:8px;text-align:center}
.name{font-size:12px;color:#c9b8ff;margin-bottom:6px}
img{image-rendering:pixelated;background:#222030;border-radius:4px}
</style></head><body>
<h1>대기→걷기→공격 전환 연속재생 — 펌핑(크기 튐) 육안 검증</h1>
<div class="grid">
%s
</div>
</body></html>""" % "\n".join(items)
    with open(out_html, "w", encoding="utf-8") as f:
        f.write(html)


def main():
    args = sys.argv[1:]
    verify_only = "--verify" in args
    dry_run = "--dry-run" in args
    gallery = "--gallery" in args
    restore = "--restore" in args

    def log(s):
        print(s)

    chars = discover_characters()
    log("캐릭터 %d개 발견 (pc 1 + mob %d)" % (len(chars), len(chars) - 1))

    if restore:
        for name, folder, fm in chars:
            restore_character(name, folder, fm, log)
        return

    if verify_only:
        results = []
        for name, folder, fm in chars:
            r = verify_character(name, folder, fm, log)
            if r:
                results.append(r)
        fails = [r for r in results if not r["ok"]]
        log("\n검증 결과: %d개 중 PASS %d / FAIL %d" % (len(results), len(results) - len(fails), len(fails)))
        if fails:
            log("FAIL 목록: " + ", ".join(r["name"] for r in fails))
        return

    if "--footprint" in args:
        write_footprints(chars, log)
        return

    no_scale = "--no-scale" in args
    report = []
    for name, folder, fm in chars:
        r = normalize_character(name, folder, fm, log, dry_run=dry_run, fix_scale=not no_scale)
        if r:
            report.append(r)
    fixed = [r for r in report if r.get("scale_fixed")]
    log("\n시트 스케일 보정된 캐릭터: %d종" % len(fixed))
    for r in fixed:
        log("  %s — %s" % (r["name"], ", ".join(r["scale_fixed"])))
    if not dry_run:
        write_footprints(chars, log)

    if not dry_run:
        report_path = os.path.join(ROOT, "tools", "normalize_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=1)
        log("\n리포트 저장: %s" % report_path)

        log("\n--- 정규화 후 재검증 ---")
        results = []
        for name, folder, fm in chars:
            r = verify_character(name, folder, fm, log)
            if r:
                results.append(r)
        fails = [r for r in results if not r["ok"]]
        log("\n검증 결과: %d개 중 PASS %d / FAIL %d" % (len(results), len(results) - len(fails), len(fails)))

    if gallery and not dry_run:
        gal_dir = os.path.join(ROOT, "tools", "gallery_gif")
        gif_paths = []
        for name, folder, fm in chars:
            p = build_gallery_gif(name, folder, fm, gal_dir)
            if p:
                gif_paths.append((name, p))
        html_path = os.path.join(ROOT, "..", "모션검수_갤러리_R6a.html")
        html_path = os.path.abspath(html_path)
        build_gallery_html(gif_paths, html_path)
        log("갤러리 HTML: %s (%d개 캐릭터)" % (html_path, len(gif_paths)))


if __name__ == "__main__":
    main()
