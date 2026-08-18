# -*- coding: utf-8 -*-
"""공장 산출물 재슬라이스 (API 비용 0)
   모델이 준 불규칙 격자를 사람이 눈으로 확인한 대로 잘라 MOB_FILES 규격으로 다시 굽는다.
   · 마젠타 키잉: 색조(hue)로 판정 — 어두운 마젠타 격자선/외곽 잔재까지 잡는다.
   · 배율: 밴드마다 원본 크기가 달라서 밴드별로 '몸 높이'를 재서 48px 로 맞춘다.
     몸 높이 = 발끝 ~ (행 폭이 최대폭의 22% 이상이 되는 첫 행) — 활·지팡이처럼 얇게 솟은
     부분을 자동으로 무시한다(그래서 대기↔공격 전환 시 몸 크기가 튀지 않는다).
   · 가로 정렬: 발(하단 20%)의 중앙을 셀 중앙에 둔다 — 무기가 옆으로 뻗어도 몸이 안 밀린다.
"""
from PIL import Image
import numpy as np, os

R = "/mnt/user-data/uploads/소설관련/게임프로젝트/스프라이트공장/raw"
OUT = "/tmp/cls/out"
CW = 688
TARGET = 48

def load(nm):
    return np.array(Image.open(os.path.join(R, nm, "v1.png")).convert("RGB")).astype(np.int16)

def keyed(a):
    r, g, b = a[:, :, 0].astype(float), a[:, :, 1].astype(float), a[:, :, 2].astype(float)
    mn, mx = np.minimum(r, b), np.maximum(r, b)
    sym = np.abs(r - b) < 0.45 * np.maximum(mx, 1)          # 마젠타는 r≈b
    lim = np.where(mx < 130, 0.45, 0.62) * mn               # 어두운 쪽은 더 엄격히
    mag = sym & (mx > 22) & (g < lim)
    al = np.where(mag, 0.0, 255.0)
    return np.dstack([a.astype(float), al])

def bbox(rgba):
    m = rgba[:, :, 3] > 8
    if m.sum() < 40: return None
    ys, xs = np.nonzero(m)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def crop(rgba):
    b = bbox(rgba); x0, y0, x1, y1 = b
    return rgba[y0:y1, x0:x1]

def body_h(c):
    """얇게 솟은 무기를 무시한 '몸 높이'"""
    m = c[:, :, 3] > 8
    w = m.sum(axis=1)
    if w.max() < 3: return c.shape[0]
    thr = w.max() * 0.22
    idx = np.nonzero(w >= thr)[0]
    return int(m.shape[0] - idx[0]) if len(idx) else c.shape[0]

def resize_rgba(rgba, w, h):
    a = rgba[:, :, 3:4] / 255.0
    pm = np.dstack([rgba[:, :, :3] * a, rgba[:, :, 3:4]])
    im = Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.BOX)
    o = np.array(im).astype(float)
    al = o[:, :, 3:4]
    rgb = np.where(al > 0.5, o[:, :, :3] / np.maximum(al / 255.0, 1e-6), 0)
    # 알파 이진화 — 기존 시트(기사·오크)가 모두 알파 0/255 뿐이다.
    # 반투명을 남기면 언프리멀티플라이가 저알파 픽셀 색을 과포화시켜 '마젠타 잔재'처럼 보인다.
    al = np.where(al >= 128, 255.0, 0.0)
    rgb = np.where(al > 0, rgb, 0)
    return np.dstack([np.clip(rgb, 0, 255), al])

BANDC = {}
def bandclean(img, band):
    """모델이 셀 사이에 그려 넣은 순검정 구분선(가로/세로)을 지운다 —
       스프라이트에는 밴드 전체를 관통하는 순검정 1px 줄이 있을 수 없다."""
    key = (id(img), band)
    if key in BANDC: return BANDC[key]
    y0, y1 = band
    b = img[y0:y1].copy()
    op = b[:, :, 3] > 8
    dark = op & (b[:, :, :3].max(axis=2) < 14)
    h, w = op.shape
    colbad = dark.sum(axis=0) > 0.80 * h
    rowbad = dark.sum(axis=1) > 0.80 * w
    b[:, colbad, 3] = 0
    b[rowbad, :, 3] = 0
    BANDC[key] = (b, y0)
    return BANDC[key]

class F:
    def __init__(self, img, band, c, flip=False, half=None, lay=False):
        img, off = bandclean(img, band)
        y0, y1 = band
        y0, y1 = 0, y1 - off
        if half == "top": y1 = (y0 + y1) // 2
        elif half == "bot": y0 = (y0 + y1) // 2
        if isinstance(c, tuple): x0, x1 = c
        else: x0, x1 = c * CW, c * CW + CW
        r = img[y0:y1, x0:x1, :]
        if flip: r = r[:, ::-1, :]
        self.c = crop(r); self.lay = lay

def band_scale(img, band, cols=(0, 1, 2, 3)):
    hs = [body_h(F(img, band, c).c) for c in cols]
    return TARGET / float(np.median(hs))

def despeckle(c):
    """축소 뒤 남는 1~2px 부스러기(구분선 잔재 등)를 지운다 — 연결 성분 면적으로 판정"""
    m = (c[:, :, 3] > 8)
    lab = np.zeros(m.shape, int); cur = 0
    H, W = m.shape
    for y in range(H):
        for x in range(W):
            if not m[y, x] or lab[y, x]: continue
            cur += 1; st = [(y, x)]; lab[y, x] = cur; area = 0; cells = []
            while st:
                yy, xx = st.pop(); area += 1; cells.append((yy, xx))
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    ny, nx = yy+dy, xx+dx
                    if 0 <= ny < H and 0 <= nx < W and m[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur; st.append((ny, nx))
            if area <= 2:
                for yy, xx in cells: c[yy, xx, 3] = 0
    return c

def strip(frames, scale):
    small = []
    for f in frames:
        c = f.c
        s = (TARGET / float(c.shape[1])) if f.lay else scale
        small.append(resize_rgba(c, max(1, int(round(c.shape[1] * s))),
                                    max(1, int(round(c.shape[0] * s)))))
    def ax(c, lay):
        m = c[:, :, 3] > 8
        if lay:
            xs = np.nonzero(m.any(axis=0))[0]
        else:
            low = m[int(c.shape[0] * 0.8):]
            if low.sum() < 3: low = m
            xs = np.nonzero(low.any(axis=0))[0]
        return (xs.min() + xs.max()) / 2.0
    axs = [ax(c, f.lay) for c, f in zip(small, frames)]
    half = max(max(a, c.shape[1] - a) for a, c in zip(axs, small))
    cw = int(np.ceil(half)) * 2 + 4
    ch = max(c.shape[0] for c in small) + 2
    small = [despeckle(c) for c in small]
    out = np.zeros((ch, cw * len(small), 4))
    for i, c in enumerate(small):
        x = int(round(i * cw + cw / 2.0 - axs[i]))
        x = max(i * cw, min(x, (i + 1) * cw - c.shape[1]))
        y = ch - c.shape[0]
        out[y:y + c.shape[0], x:x + c.shape[1], :] = c
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")

NEED = {
 "idle_s": "{t}_final_south_48px.png", "idle_w": "{t}_final_west_48px.png",
 "idle_n": "{t}_final_north_48px.png", "walk_s": "{t}_walk_south_sheet_48px.png",
 "walk_w": "{t}_walk_west_sheet_48px.png", "walk_n": "{t}_walk_north_sheet_48px.png",
 "attack": "{t}_attack_sheet_48px.png", "death": "{t}_death_sheet_v2_48px.png"}
ORDER = ["idle_s","idle_w","idle_n","walk_s","walk_w","walk_n","attack","death"]

def emit(target, roles):
    """8역할을 굽고, **캔버스 높이를 하나로 맞춰** 저장한다.
       왜 높이를 맞추나: 이 프로젝트의 규격(tools/normalize_sheets.py, verify_r6a_normalize.js)이
       '한 캐릭터의 8역할은 셀 높이가 같아야 한다'다. 역할마다 높이가 다르면 상태 전환에서
       크기가 튀어 보이는 사고(펌핑)의 원인이 됐던 이력이 있어 검증본이 이를 강제한다.
       발끝은 이미 셀 하단에 맞춰 두었으므로 **위쪽만 투명으로 덧대면** 그림은 그대로다."""
    d = os.path.join(OUT, target); os.makedirs(d, exist_ok=True)
    print(target)
    made = []
    for k in ORDER:
        frames, sc = roles[k]
        made.append((k, strip(frames, sc), sc, len(frames)))
    H = max(im.height for _, im, _, _ in made)
    for k, im, sc, n in made:
        if im.height < H:
            pad = Image.new("RGBA", (im.width, H), (0, 0, 0, 0))
            pad.paste(im, (0, H - im.height))      # 발끝 = 셀 하단 유지
            im = pad
        im.save(os.path.join(d, NEED[k].format(t=target)))
        print("  %-7s %-9s scale=%.4f  %d프레임" % (k, "%dx%d" % im.size, sc, n))

# ================= 엘프(궁수) =================
ed, em = keyed(load("elf_dir")), keyed(load("elf_motion"))
EB0,EB1,EB2,EB4 = (176,1448),(1608,3040),(3184,3880),(4776,6192)
EM0,EM1 = (24,1440),(1704,3016)
s0 = band_scale(ed, EB0); s1 = band_scale(ed, EB1); s2 = band_scale(ed, EB2, (0,1,2))
s4 = band_scale(ed, EB4); sa = band_scale(em, EM0); sd = band_scale(em, EM1, (0,1))
emit("pc_elf", {
 "idle_s": ([F(ed,EB0,0)], s0),
 "idle_w": ([F(ed,EB0,1,flip=True)], s0),
 "idle_n": ([F(ed,EB0,3)], s0),
 "walk_s": ([F(ed,EB1,i) for i in range(4)], s1),
 # 밴드2 4번째 칸은 활을 당긴 자세라 걷기에 섞으면 튄다 → 중립·보폭A·중립·보폭B (RPG 4프레임 규약)
 "walk_w": ([F(ed,EB2,0,flip=True),F(ed,EB2,1,flip=True),
             F(ed,EB2,0,flip=True),F(ed,EB2,2,flip=True)], s2),
 "walk_n": ([F(ed,EB4,i) for i in range(4)], s4),
 "attack": ([F(em,EM0,i) for i in range(4)], sa),
 "death":  ([F(em,EM1,0), F(em,EM1,1),
             F(em,EM1,(1376,2064),half="bot",lay=True),
             F(em,EM1,(2064,2752),half="bot",lay=True)], sd)})

# ================= 마법사 =================
wd, wm = keyed(load("wiz_dir")), keyed(load("wiz_motion"))
WB0,WB2,WB3,WB4 = (80,752),(1656,3032),(3264,4600),(4784,6128)
WM0,WM1 = (360,1400),(1640,2312)
t0 = band_scale(wd, WB0); t2 = band_scale(wd, WB2); t3 = band_scale(wd, WB3)
t4 = band_scale(wd, WB4); ta = band_scale(wm, WM0); td = band_scale(wm, WM1, (0,1))
emit("pc_wiz", {
 "idle_s": ([F(wd,WB0,0)], t0),
 "idle_w": ([F(wd,WB0,1,flip=True)], t0),
 "idle_n": ([F(wd,WB0,3)], t0),
 "walk_s": ([F(wd,WB2,i) for i in range(4)], t2),
 "walk_w": ([F(wd,WB3,i,flip=True) for i in range(4)], t3),
 "walk_n": ([F(wd,WB4,i) for i in range(4)], t4),
 "attack": ([F(wm,WM0,i) for i in range(4)], ta),
 "death":  ([F(wm,WM1,0), F(wm,WM1,1),
             F(wm,WM1,2,lay=True), F(wm,WM1,3,lay=True)], td)})
