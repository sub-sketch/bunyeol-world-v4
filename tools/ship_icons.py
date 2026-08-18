# -*- coding: utf-8 -*-
r"""ship_icons.py — R24 아이템 그림 아이콘 출하 (격자 시트 → 아이템별 PNG)

공장이 뽑은 4x4(또는 NxM) 아이콘 시트를 잘라 게임에 넣는다.
  raw/icon_set1/v1.png  ->  assets/ui/item/hpot.png, hpot2.png, ... (48x48 RGBA)

  python tools/ship_icons.py <시트PNG> <아이템키,아이템키,...> [--cols 4] [--rows 4] [--size 48]
  python tools/ship_icons.py <시트PNG> --set icon_set1        # 아래 SETS 에 적어 둔 목록 사용

왜 별도 스크립트인가: 공장의 process.py 는 **몹 시트**(방향·보행 프레임)를 도트화하는 도구다.
아이콘은 프레임이 아니라 독립된 그림 16장이고, 파일 이름이 곧 아이템 키여야 한다(build.py 의
itemart_block 이 파일명을 키로 읽는다). 그래서 자르기·마젠타 제거·정사각 맞춤만 하는 얇은 도구를 둔다.

마젠타 제거: 아이콘에는 발광(글로우)이 있어서 배경과 섞인 반투명 띠가 생긴다. 그래서
"마젠타다/아니다" 로 딱 끊지 않고 magenta-ness = min(R,B) - G 로 재서
  d >= HI  -> 완전 투명
  LO<d<HI  -> 그만큼 알파를 깎고(부드러운 경계) 남은 색에서 마젠타 성분(스필)을 빼 준다
이렇게 하지 않으면 아이콘 테두리에 분홍 실이 남는다.
"""
import os, sys, io, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, "assets", "ui", "item")

# 시트별 셀 순서 — 프롬프트에 적은 순서와 **정확히 같아야** 한다.
SETS = {
    "icon_set1": ["hpot", "hpot2", "mpot", "mpot2",
                  "brave", "torch", "lantern", "antidote",
                  "bandage", "stew", "ret", "tscroll",
                  "wscroll", "ascroll", "bwscroll", "dtscroll"],
}

HI, LO = 95, 28          # magenta-ness 임계 (0~255)

def cut(sheet, keys, cols, rows, size, out_dir, verbose=True):
    from PIL import Image
    import numpy as np
    im = Image.open(sheet).convert("RGB")
    W, H = im.size
    cw, ch = W // cols, H // rows
    if not os.path.isdir(out_dir):
        os.makedirs(out_dir)
    made = []
    for idx, key in enumerate(keys):
        if not key or key == "_":
            continue
        r, c = idx // cols, idx % cols
        cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        a = np.asarray(cell).astype(np.int16)
        R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
        d = np.minimum(R, B) - G                       # 마젠타 정도
        alpha = np.clip((HI - d) * 255.0 / (HI - LO), 0, 255).astype(np.uint8)
        # 스필(분홍 물듦) 제거 — 경계 픽셀의 R,B 를 G 쪽으로 끌어당긴다
        spill = np.clip(d, 0, None)
        R2 = np.clip(R - spill * 0.85, 0, 255)
        B2 = np.clip(B - spill * 0.85, 0, 255)
        rgba = np.dstack([R2, G, B2, alpha]).astype(np.uint8)
        cut_im = Image.fromarray(rgba, "RGBA")
        bb = cut_im.split()[3].point(lambda v: 255 if v > 24 else 0).getbbox()
        if bb:
            cut_im = cut_im.crop(bb)
        # 정사각형으로 패딩한 뒤 한 번에 축소 — 비율이 안 망가진다
        s = max(cut_im.size)
        sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        sq.paste(cut_im, ((s - cut_im.width) // 2, (s - cut_im.height) // 2))
        icon = sq.resize((size, size), Image.LANCZOS)
        path = os.path.join(out_dir, key + ".png")
        icon.save(path, "PNG", optimize=True)
        made.append((key, os.path.getsize(path)))
        if verbose:
            print("  %-10s cell %2d  -> assets/ui/item/%s.png  (%d B)" % (key, idx + 1, key, made[-1][1]))
    print("\n%d종 출하 (%.0f KB). 이제 python build.py --release 만 하면 내장됩니다."
          % (len(made), sum(m[1] for m in made) / 1024.0))
    return made

def main(argv):
    if len(argv) < 2:
        print(__doc__); return 1
    sheet = argv[1]
    cols = rows = 4; size = 48; keys = None
    i = 2
    while i < len(argv):
        if argv[i] == "--set":
            keys = SETS[argv[i + 1]]; i += 2
        elif argv[i] == "--cols":
            cols = int(argv[i + 1]); i += 2
        elif argv[i] == "--rows":
            rows = int(argv[i + 1]); i += 2
        elif argv[i] == "--size":
            size = int(argv[i + 1]); i += 2
        else:
            keys = argv[i].split(","); i += 1
    if not keys:
        print("[중단] 아이템 키 목록이나 --set 이 필요합니다"); return 1
    cut(sheet, keys, cols, rows, size, OUT)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
