// 접지(둥둥 뜸) 진단용 — 필드에서 몹들이 모인 곳을 확대 촬영한다
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url);
  await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(200); }
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  try { await page.locator('input').first().fill('접지'); } catch (e) {}
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000, force: true }); } catch (e) {}
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    if (!P) startGame();
    const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none';
  });
  await page.waitForTimeout(400);

  // 몹들을 플레이어 주변에 모아 세우고 정지시킨다(전투 흔들림 없이 접지만 본다)
  await page.evaluate(() => {
    deadFlag = false; hitstopClear();
    travel(1, 12, 10);
    if (RUN) RUN.live = false;
    P.tgt = null; P.dest = null; P.autoMode = 'off'; P.autoCounter = false;
    const z = world[curZ];
    const alive = z.mobs.filter(m => !m.dead);
    // 플레이어 앞쪽에 한 줄로 세운다
    alive.slice(0, 5).forEach((m, i) => {
      m.fx = P.fx - 2 + i * 1.6; m.fy = P.fy + 1.6;
      m.tgt = null; m.goal = null; m.gt = T + 999; m.mv = -9; m.atkT = -9; m.face = 0;
    });
    alive.slice(5).forEach(m => { m.fx = -99; m.fy = -99; });
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { ['markov','frewov','settleov','deadov'].forEach(id=>{const e=document.getElementById(id); if(e) e.style.display='none';}); });
  await page.waitForTimeout(200);
  const box = await page.$eval('#game', el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.screenshot({ path: 'shot_ground_full.png' });
  await page.screenshot({ path: 'shot_ground_zoom.png',
    clip: { x: box.x + box.w * 0.30, y: box.y + box.h * 0.34, width: box.w * 0.42, height: box.h * 0.30 } });
  console.log('저장 완료');
  await browser.close();
})();
