// P3 시각 확인용 스크린샷 — 계시 3택 화면 / 문신 보유 상태(HUD 아이콘·발광·등급 표기)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(url);
  await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(200); }
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  try { await page.locator('input').first().fill('계시검증'); } catch (e) {}
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000, force: true }); } catch (e) {}
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    if (!P) startGame();
    const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none';
  });
  await page.waitForTimeout(400);

  // --- 1) 계시 3택 화면 ---
  await page.evaluate(() => {
    deadFlag = false; hitstopClear();
    travel(1, 12, 10);
    RUN.live = true; RUN.revs = {};
    // 첫 화면 그대로 보기 위해 후보를 고정한다(빛·검신·무신 각 1종)
    const want = ['rv_ward', 'rv_edge', 'rv_dodge'];
    const orig = REVELATIONS.slice();
    REVELATIONS.length = 0;
    want.forEach(id => REVELATIONS.push(orig.filter(r => r.id === id)[0]));
    showRevelation();
    REVELATIONS.length = 0; orig.forEach(r => REVELATIONS.push(r));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const m=document.getElementById('markov'); if(m) m.style.display='none'; });
  await page.screenshot({ path: 'shot_r6c_1_계시3택.png' });

  // --- 2) 심화 표기가 붙은 3택 ---
  await page.evaluate(() => {
    RUN.revs = { rv_ward: 1, rv_edge: 1 };
    const want = ['rv_ward', 'rv_edge', 'rv_dodge'];
    const orig = REVELATIONS.slice();
    REVELATIONS.length = 0;
    want.forEach(id => REVELATIONS.push(orig.filter(r => r.id === id)[0]));
    showRevelation();
    REVELATIONS.length = 0; orig.forEach(r => REVELATIONS.push(r));
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const m=document.getElementById('markov'); if(m) m.style.display='none'; });
  await page.screenshot({ path: 'shot_r6c_2_심화표기.png' });

  // --- 3) 문신 4개 보유 상태 (HUD 아이콘 + 캐릭터 발광 + 등급 괄호 표기) ---
  await page.evaluate(() => {
    document.getElementById('frewov').style.display = 'none';
    RUN.revs = { rv_edge: 2, rv_haste: 1, rv_ward: 1, rv_step: 1 };
    refreshHud();
  });
  await page.waitForTimeout(900);
  await page.evaluate(() => { const m=document.getElementById('markov'); if(m) m.style.display='none'; });
  await page.screenshot({ path: 'shot_r6c_3_문신보유.png' });


  // --- 4) 문신 발광 오버레이 클로즈업 (마을 = 몹 없는 곳에서 0/2/4개 비교) ---
  const box = await page.$eval('#game', el => { const r = el.getBoundingClientRect();
    return {x:r.x, y:r.y, w:r.width, h:r.height}; });
  const clip = { x: box.x + box.w/2 - 90, y: box.y + box.h*0.52 - 95, width: 180, height: 150 };
  for (const [tag, revs] of [['0개', {}], ['2개', {rv_edge:1, rv_haste:1}], ['4개', {rv_edge:2, rv_haste:1, rv_exec:1, rv_chain:1}]]) {
    await page.evaluate((r) => {
      RUN.live = false;                  // 먼저 꺼야 travel(0)이 runEnd("escape")로 정산창을 띄우지 않는다
      travel(0, 10, 9); RUN.revs = r;
      document.getElementById('settleov').style.display = 'none';
      document.getElementById('frewov').style.display = 'none';
      P.tgt = null; P.dest = null; refreshHud();
    }, revs);
    await page.waitForTimeout(700);
    await page.evaluate(() => { const m=document.getElementById('markov'); if(m) m.style.display='none'; });
    await page.screenshot({ path: 'shot_r6c_4_발광_' + tag + '.png', clip: clip });
  }

  const info = await page.evaluate(() => ({
    문신수: revCount(),
    발광색: revGlowColor(),
    등급표기: document.getElementById('gradelbl').textContent,
    HUD아이콘: document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length,
    공격력: pMaxHit(),
    이동속도배율: pMS()
  }));
  console.log(JSON.stringify(info, null, 1));
  console.log('페이지 오류: ' + (errors.length ? errors.join('\n') : '0건'));
  await browser.close();
})();
