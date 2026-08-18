/* Phase R1 게이트 — 코어 루프 3회를 실제 게임 루프로 돌린다.
   진입 → 사망 → 정산 → 구매 → 재진입.  node verify_r1.js */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('file://' + path.resolve('dist/game_분열된세계_ONLINE.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    if (typeof endIntro === 'function') endIntro();
    pickCls = 'k';
    document.getElementById('pname').value = 'R1검증';
    startGame();
    if (typeof endIntro === 'function') endIntro();
    try { localStorage.removeItem('lc2_meta_v4'); } catch (e) {}
    metaReset();
  });
  await page.waitForTimeout(700);

  const report = { loops: [], errs: [] };

  for (let i = 1; i <= 3; i++) {
    const loop = { n: i };

    // 1) 진입
    loop.enter = await page.evaluate(() => {
      const ok = runStart();
      return { ok, zone: P.zone, floor: RUN && RUN.floor, live: runActive() };
    });
    await page.waitForTimeout(500);

    // 2) 층 진행 (2층까지) + 처치 누적
    await page.evaluate((deeper) => {
      // 몹을 몇 마리 잡아 처치 수를 만든다 (killMob 정식 경로)
      const z = world[curZ];
      z.mobs.filter(m => !m.dead).slice(0, 6).forEach(m => { m.pdmg = m.tdmg = 1; killMob(m); });
      if (deeper) travel(4, 12, 12);
    }, i >= 2);
    await page.waitForTimeout(400);

    loop.mid = await page.evaluate(() => ({ floor: RUN && RUN.floor, max: RUN && RUN.maxFloor, kills: RUN && RUN.kills }));

    // 3) 사망
    await page.evaluate(() => {
      P.gold = 1234;              // 런 골드가 정산 후 사라지는지 확인용
      P.hp = 1;
      const z = world[curZ];
      const m = z.mobs.filter(x => !x.dead)[0] || { d: MOBS.wolf, fx: P.fx, fy: P.fy };
      playerDie(m);
    });
    await page.waitForTimeout(1200);

    loop.settle = await page.evaluate(() => ({
      overlayShown: document.getElementById('settleov').style.display === 'block',
      bodyHasPoints: document.getElementById('settlebody').innerHTML.indexOf('업적포인트') >= 0,
      hasNextGoal: document.getElementById('settlebody').innerHTML.indexOf('다음 목표') >= 0
                   || document.getElementById('settlebody').innerHTML.indexOf('상점 노드') >= 0,
      pt: META.pt, runs: META.runs, best: META.best, achv: META.achv.slice()
    }));

    // 4) 마을 귀환
    await page.evaluate(() => settleClose());
    await page.waitForTimeout(500);
    loop.town = await page.evaluate(() => ({
      zone: P.zone, gold: P.gold, runNull: RUN === null, hpFull: P.hp === P.mhp,
      overlayHidden: document.getElementById('settleov').style.display === 'none'
    }));

    // 5) 메타 구매 (살 수 있으면)
    loop.buy = await page.evaluate(() => {
      const before = { pt: META.pt, mhp: P.mhp, atk: pMaxHit().slice(), ac: pAC() };
      const bought = [];
      ['hp', 'atk', 'def'].forEach(id => { if (metaBuy(id)) bought.push(id); });
      return { before, bought, after: { pt: META.pt, mhp: P.mhp, atk: pMaxHit().slice(), ac: pAC() },
               nodes: JSON.stringify(META.nodes) };
    });

    // 6) 저장 왕복
    loop.save = await page.evaluate(() => {
      metaSave();
      const raw = localStorage.getItem('lc2_meta_v4');
      const snap = JSON.parse(raw);
      META.pt = -999;                       // 일부러 망가뜨린 뒤 로드로 복구되는지
      const ok = metaLoad();
      return { ok, ver: snap.v, ptRestored: META.pt === snap.pt, nodes: JSON.stringify(META.nodes) };
    });

    report.loops.push(loop);
  }

  // v3 세이브 거부 확인
  report.v3Rejected = await page.evaluate(() => {
    try { localStorage.setItem('lc2_meta_v4', JSON.stringify({ v: 3, pt: 99999 })); } catch (e) {}
    META.pt = 0;
    const loaded = metaLoad();
    const res = { loaded, pt: META.pt };
    localStorage.removeItem('lc2_meta_v4');
    return res;
  });

  report.frameErr = await page.evaluate(() => (typeof frameErr !== 'undefined' ? frameErr : 'n/a'));
  report.errs = errs;
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})();
