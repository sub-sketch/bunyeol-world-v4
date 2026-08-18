// R19c — 서륙 팩 6개 존 실기 스크린샷. 지형색(동대륙 돌색 / 마경 남색)과
// 그 위에 올라간 변종 몹의 가독성을 실제 배율에서 확인한다.
const { chromium } = require('playwright');
const path = require('path');

const SHOTS = [
  [6,  'shot_r19c_1_동대륙_산길.png',   '동대륙 잿빛 산길 (돌색 · 핏빛 정예)'],
  [7,  'shot_r19c_2_동대륙_협곡.png',   '동대륙 붉은 협곡 (중간보스 카르갓)'],
  [8,  'shot_r19c_3_동대륙_보스.png',   '산정 봉인단 (보스 핏빛 파수꾼)'],
  [9,  'shot_r19c_4_마경_입구.png',     '마경 남빛 입구 (남색 · 심연 변종)'],
  [10, 'shot_r19c_5_마경_심층.png',     '마경 심층 (중간보스 베르갓)'],
  [11, 'shot_r19c_6_마경_옥좌.png',     '심연의 옥좌 (최종보스 심연의 왕)'],
];

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1800 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(200); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const e = document.getElementById('markov'); if (e) e.style.display = 'none'; });

  for (const [z, file, desc] of SHOTS) {
    const info = await page.evaluate((z) => {
      const zn = world[z];
      /* 몹을 얼려 둔다 — 비교 샷에서 달려들면 화면 밖으로 나간다 */
      zn.mobs.forEach(m => { m.stun = 9999; m.ag = 0;  m.d = Object.assign({}, m.d, {d1:0, d2:0, bleed:null, poison:null}); });
      P.mhp = 99999; P.hp = 99999;          /* 스크린샷용 — 구경하다 죽지 않게 */
      /* 플레이어를 몹 무리 근처로 옮긴다 */
      const alive = zn.mobs.filter(m => !m.dead);
      const t = alive[Math.floor(alive.length / 2)] || { fx: Math.floor(ZONES[z].w / 2), fy: Math.floor(ZONES[z].h / 2) };
      travel(z, Math.round(t.fx), Math.round(t.fy));
      P.dest = null; P.tgt = null; P.path = null;
      return { name: ZONES[z].name, theme: ZONES[z].theme, floor: FLOOR_OF[z],
               act: (actOfZone(z) || {}).n,
               mobs: alive.map(m => m.d.n + ' Lv' + m.d.lv + '/' + m.d.hp).join(', ') };
    }, z);
    await page.waitForTimeout(900);
    await page.evaluate(() => { const e = document.getElementById('frewov'); if (e) e.style.display = 'none'; });
    await page.screenshot({ path: file });
    console.log(info.floor + '층 ' + info.name + ' [' + info.theme + '] — ' + info.act);
    console.log('      ' + info.mobs);
  }
  console.log('페이지 오류: ' + (errs.length ? errs.slice(0, 3).join(' / ') : '0건'));
  await browser.close();
})();
