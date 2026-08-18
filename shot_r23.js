// R23 실기 스크린샷: 노드판 전체화면 · 상점 2단 · 시설 배경 3지역 · 변신(노란 띠) · 필드
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
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 900; META.runs = 12; META.best = 9; META.tkills = 640; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  const shot = async (name, fn, wait) => {
    if (fn) await page.evaluate(fn);
    await page.waitForTimeout(wait || 700);
    await page.screenshot({ path: 'shot_r23_' + name + '.png' });
    console.log('shot_r23_' + name + '.png');
  };

  // 1) 노드판 — 화면 꽉 차게 + 노드 하나 선택
  await shot('1_노드판', () => {
    hubShow('seo'); hubEnter('node');
    const first = document.querySelector('#metalist .mnd[onclick*="atk"]') || document.querySelector('#metalist .mnd');
    if (first) metaSelect(first.getAttribute('onclick').match(/'([^']+)'/)[1]);
  });
  // 2) 상점 — 좌측 상점 / 우측 인벤토리
  await shot('2_상점2단', () => {
    facClose();
    addItem('longsw', 1); addItem('hpot', 8); addItem('mpot', 4); addItem('wscroll', 2);
    hubEnter('shop');
  });
  // 3) 동대륙 상점 (간판·배경이 갈린다)
  await shot('3_상점_동대륙', () => { facClose(); hubSwitch('dong'); hubEnter('shop'); });
  // 4) 마경 신전
  await shot('4_신전_마경', () => { facClose(); hubSwitch('ma'); hubEnter('shrine'); });
  // 5) 길드 (게시판)
  await shot('5_길드_마경', () => { closeDialog(); facClose(); hubEnter('guild'); });
  // 6) 변신 선택창
  await shot('6_변신선택', () => {
    facClose(); hubSwitch('seo'); hubHide();
    P.tfUnlock = []; unlockTf('orcchief'); unlockTf('dk');
    openTf(); tfAsk('orcchief');
  });
  // 7) 변신 외형 (노란 테두리 띠) — 필드에서
  await shot('7_변신_노란띠', () => {
    closeP('tf');
    travel(1, 10, 8);
    applyTf('orcchief', true);
    P.face = 0; P.anim = 0;
  }, 1200);
  // 8) 능력치만 변신 — 외형 유지
  await shot('8_변신_능력치만', () => { applyTf('orcchief', false); }, 900);
  // 9) 필드 — 보이지 않는 벽 제거 (동대륙 산길)
  await shot('9_필드_산길', () => { P.tf = null; P.tfT = 0; travel(6, 4, 8); }, 1200);
  await browser.close();
})();
