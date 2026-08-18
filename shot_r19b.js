// R19b 변종 색 확대 시제품 — 원종/핏빛/흑암을 6배로 나란히 굽는다.
// R18b 교훈: 색 변경은 반드시 '확대해서' 봐야 한다. 수치만 보면 항상 괜찮아 보인다.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(1500);

  const dataUrl = await page.evaluate(async () => {
    const SPECIES = ['wolf', 'gob', 'bear', 'orc', 'skel', 'zombie', 'spartoi', 'vamp', 'dk'];
    const Z = 5, CELL = 52 * Z, PAD = 8;
    const cv = document.createElement('canvas');
    cv.width = PAD + 3 * (CELL + PAD);
    cv.height = 30 + SPECIES.length * (CELL + PAD);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#141019'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = 'bold 13px sans-serif'; g.fillStyle = '#cfc6a8';
    ['원종', '핏빛(red)', '흑암(black)'].forEach((t, i) => g.fillText(t, PAD + i * (CELL + PAD) + 4, 18));

    const wait = async () => { for (let i = 0; i < 60; i++) { let all = true; SPECIES.forEach(s => { if (!(MSH.set[s] && MSH.set[s].ok)) all = false; }); if (all) return; await new Promise(r => setTimeout(r, 100)); } };
    await wait();

    SPECIES.forEach((sp, row) => {
      const y = 30 + row * (CELL + PAD);
      [null, '@red', '@black'].forEach((suf, col) => {
        const key = suf ? sp + suf : sp;
        let nm = key;
        if (suf) { mobVariantEnsure(key); }
        const rec = MSH.set[nm];
        const x = PAD + col * (CELL + PAD);
        g.fillStyle = '#1d1826'; g.fillRect(x, y, CELL, CELL);
        if (!rec || !rec.ok) { g.fillStyle = '#f66'; g.fillText('없음', x + 6, y + 20); return; }
        const r = rec.img.idle_s || rec.img.idle_w;
        g.drawImage(r.img, 0, 0, r.fw, r.fh,
          x + Math.round((CELL - r.fw * Z) / 2), y + CELL - r.fh * Z, r.fw * Z, r.fh * Z);
        g.font = '11px sans-serif'; g.fillStyle = '#8a8068';
        g.fillText((MOBS[key] && MOBS[key].n) || key, x + 4, y + CELL - 3);
        g.font = 'bold 13px sans-serif';
      });
    });
    return cv.toDataURL('image/png');
  });

  const fs = require('fs');
  fs.writeFileSync(path.resolve(__dirname, 'shot_r19b_변종_확대.png'),
    Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('saved shot_r19b_변종_확대.png');
  await browser.close();
})();
