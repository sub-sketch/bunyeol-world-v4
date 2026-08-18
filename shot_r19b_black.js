// 흑암(black) 계보 후보 비교 — 1차 시제품에서 '너무 어두워 안 보인다'가 확인됐다.
// 던전 바닥색 위에 올려놓고 후보 4개를 비교한다(가독성은 배경 대비로 판단해야 한다).
const { chromium } = require('playwright');
const path = require('path');

const CANDS = [
  { n: 'A 현재 dv.50 ds.60', t: { hset: 250, ds: 0.60, dv: 0.50, tone: { h: 250, s: 0.25 } } },
  { n: 'B dv.66 ds.90 s.38', t: { hset: 252, ds: 0.90, dv: 0.66, tone: { h: 252, s: 0.38 } } },
  { n: 'C dv.72 ds1.1 s.45', t: { hset: 254, ds: 1.10, dv: 0.72, tone: { h: 254, s: 0.45 } } },
  { n: 'D dv.60 ds1.3 s.55', t: { hset: 256, ds: 1.30, dv: 0.60, tone: { h: 256, s: 0.55 } } },
];

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(1600);

  const dataUrl = await page.evaluate(async (CANDS) => {
    const SPECIES = ['wolf', 'orc', 'skel', 'zombie', 'dk'];
    const Z = 4, CELL = 52 * Z, PAD = 6;
    const cv = document.createElement('canvas');
    cv.width = PAD + (CANDS.length + 1) * (CELL + PAD);
    cv.height = 26 + SPECIES.length * (CELL + PAD);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    /* 실제 던전 바닥에 가까운 색 — 대비를 이 위에서 봐야 한다 */
    g.fillStyle = '#2a2432'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = 'bold 12px sans-serif'; g.fillStyle = '#e8d36e';
    ['원종'].concat(CANDS.map(c => c.n)).forEach((t, i) => g.fillText(t, PAD + i * (CELL + PAD) + 3, 16));

    for (let i = 0; i < 60; i++) { let all = true; SPECIES.forEach(s => { if (!(MSH.set[s] && MSH.set[s].ok)) all = false; }); if (all) break; await new Promise(r => setTimeout(r, 100)); }

    SPECIES.forEach((sp, row) => {
      const y = 26 + row * (CELL + PAD);
      const base = MSH.set[sp], r = base && (base.img.idle_s || base.img.idle_w);
      if (!r) return;
      const put = (col, img) => {
        const x = PAD + col * (CELL + PAD);
        g.fillStyle = '#332c3d'; g.fillRect(x, y, CELL, CELL);
        g.drawImage(img, 0, 0, r.fw, r.fh, x + Math.round((CELL - r.fw * Z) / 2), y + CELL - r.fh * Z, r.fw * Z, r.fh * Z);
      };
      put(0, r.img);
      CANDS.forEach((c, ci) => put(ci + 1, tintMobImage(r.img, c.t)));
    });
    return cv.toDataURL('image/png');
  }, CANDS);

  require('fs').writeFileSync(path.resolve(__dirname, 'shot_r19b_흑암_후보.png'),
    Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved shot_r19b_흑암_후보.png');
  await browser.close();
})();
