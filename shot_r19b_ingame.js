// R19b — 실제 게임 화면(실제 배율·실제 바닥색)에서 변종 가독성 확인.
// 확대 시제품은 색을 고르는 데 쓰고, 최종 판정은 반드시 이 화면에서 한다.
const { chromium } = require('playwright');
const path = require('path');

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
    /* 각인 의식이 화면을 덮으므로 미리 각인을 정해 둔다(스크린샷 전용) */
    try { META.mark = 'blade'; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const e = document.getElementById('markov'); if (e) e.style.display = 'none'; });

  const place = async (zone, keys) => await page.evaluate((a) => {
    const [zone, keys] = a;
    travel(zone, 10, 11);
    const z = world[zone];
    z.mobs.length = 0;
    if (z.fnpc) z.fnpc.length = 0;          /* 필드 NPC 가 시야를 가린다 — 비교 샷에서는 치운다 */
    keys.forEach((k, i) => {
      const d = MOBS[k], x = 4 + i, y = 13 - i;
      z.g[y][x] = 0;
      z.mobs.push({ k: k, d: d, fx: x, fy: y, hx: x, hy: y, hp: d.hp, dead: false, rt: 0, tgt: null,
        na: 0, stun: 9999, slow: 0, goal: null, gt: 0, lh: -99, face: 0, anim: 0, mv: -9, atkT: -9,
        ph: 0, prov: false, tdmg: 0, pdmg: 0 });
    });
    P.fx = 15; P.fy = 13; P.dest = null; P.tgt = null;
    return z.mobs.map(m => m.d.n + ' Lv' + m.d.lv + ' HP' + m.d.hp);
  }, [zone, keys]);

  let names = await place(1, ['wolf', 'wolf@red', 'wolf@black', 'gob', 'gob@red', 'gob@black']);
  console.log('필드(서리들녘): ' + names.join(' | '));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shot_r19b_1_필드_늑대.png' });

  names = await place(4, ['skel', 'skel@red', 'skel@black', 'zombie', 'zombie@red', 'zombie@black']);
  console.log('던전(4층): ' + names.join(' | '));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shot_r19b_2_던전_언데드.png' });

  console.log('페이지 오류: ' + (errs.length ? errs.slice(0, 3).join(' / ') : '0건'));
  await browser.close();
})();
