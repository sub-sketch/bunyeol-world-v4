// R24 실기 스크린샷: 상점 인사말(3지역) · 구매 목록 · 판매 목록 · 신전 · 길드 (시설 그림 9장 반영)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => console.log('ERR ' + e.message));
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 700; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    addItem('longsw', 1); addItem('hpot', 9); addItem('mpot', 4); addItem('wscroll', 2); addItem('dagger', 1);
  });
  await page.waitForTimeout(500);
  const shot = async (name, fn, wait) => {
    if (fn) await page.evaluate(fn);
    await page.waitForTimeout(wait || 800);
    await page.screenshot({ path: 'shot_r24_' + name + '.png' });
    console.log('shot_r24_' + name + '.png');
  };

  await shot('1_상점_인사_서대륙', () => { hubShow('seo'); hubEnter('shop'); });
  await shot('2_상점_구매목록', () => { facStep('buy'); });
  await shot('3_상점_판매목록', () => { facStep('sell'); });
  await shot('4_상점_인사_동대륙', () => { facClose(); hubSwitch('dong'); hubEnter('shop'); });
  await shot('5_상점_구매_동대륙', () => { facStep('buy'); });
  await shot('6_상점_인사_마경', () => { facClose(); hubSwitch('ma'); hubEnter('shop'); });
  await shot('7_신전_마경', () => { facClose(); hubEnter('shrine'); });
  await shot('8_길드_서대륙', () => { closeDialog(); facClose(); hubSwitch('seo'); hubEnter('guild'); });
  await shot('9_신전_서대륙', () => { closeDialog(); facClose(); hubEnter('shrine'); });
  await browser.close();
})();
