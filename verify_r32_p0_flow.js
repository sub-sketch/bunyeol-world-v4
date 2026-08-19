/* R32 T-P0-2 기능 검증 — 보스 처치 순서를 바꿔가며 실제 killMob() 을 호출한다.
   지난 라운드에 "실기기 확인 필요"로 넘긴 항목(1부 갈림길 / 2부 보스 먼저 / 3부 잡몹 마지막)을
   정적 검사가 아니라 게임 함수 호출로 확인한다.
   실행: CHROME_PATH=... GAME_HTML=... node verify_r32_p0_flow.js */
const { chromium } = require('playwright');
const FILE = process.env.GAME_HTML || require('path').resolve(__dirname, '..', 'dist', 'game_분열된세계_ONLINE_배포.html');
const EXE = process.env.CHROME_PATH || undefined;

const R = [];
const ok = (n, pass, note) => R.push({ n, pass: !!pass, note: note || '' });

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto('file://' + FILE.replace(/\\/g, '/'));
  await page.waitForTimeout(1800);

  /* 공통 하네스: 특정 층의 존을 준비하고 호출을 계수한다 */
  await page.evaluate(() => {
    window.__harness = function (floor, metaSetup) {
      if (typeof introOn !== 'undefined' && introOn) endIntro();
      P = newPlayer('흐름검증', 'k'); started = true; deadFlag = false;
      metaLoad(); metaSetup(META);
      var z = null, k;
      for (k in FLOOR_OF) if (FLOOR_OF[k] === floor) z = parseInt(k, 10);
      runBegin();                       /* 몹 전부 부활 + RUN 생성 */
      curZ = z; P.zone = z;
      document.getElementById('settleov').style.display = 'none';
      document.getElementById('frewov').style.display = 'none';
      var W = world[z];
      window.__c = { settle: 0, actChoice: 0, clsUnlock: 0, ending: 0, runEnd: [] };
      window.__real = { settle: showSettle, actChoice: showActChoice, clsUnlock: showClassUnlock,
                        ending: (typeof playEnding === 'function') ? playEnding : null, runEnd: runEnd };
      window.showSettle    = function (r, sc) { window.__c.settle++; return window.__real.settle(r, sc); };
      window.showActChoice = function () { window.__c.actChoice++; };
      window.showClassUnlock = function (after) { window.__c.clsUnlock++; if (after) after(); };
      window.playEnding    = function (after) { window.__c.ending++; if (after) after(); return true; };
      window.runEnd        = function (res) { window.__c.runEnd.push(res); return window.__real.runEnd(res); };
      return { zone: z, mobs: W.mobs.map(function (m) { return { k: m.k, boss: !!m.d.boss, mini: !!m.d.mini }; }),
               need: floorNeed(W), total: W.mobs.length };
    };
    window.__restore = function () {
      showSettle = window.__real.settle; showActChoice = window.__real.actChoice;
      showClassUnlock = window.__real.clsUnlock; runEnd = window.__real.runEnd;
      if (window.__real.ending) playEnding = window.__real.ending;
    };
    window.__killBoss = function () {
      var W = world[curZ], i;
      for (i = 0; i < W.mobs.length; i++) if (W.mobs[i].d.boss && !W.mobs[i].dead) { killMob(W.mobs[i], P); return W.mobs[i].k; }
      return null;
    };
    window.__killRest = function () {
      var W = world[curZ], i, n = 0;
      for (i = 0; i < W.mobs.length; i++) if (!W.mobs[i].dead) { killMob(W.mobs[i], P); n++; }
      return n;
    };
  });

  /* ---------- ① 1부 5층 — 보스가 유일한 몹. 첫 클리어면 계열해금→갈림길, 정산은 안 뜬다 ---------- */
  const a = await page.evaluate(async () => {
    const info = window.__harness(5, function (M) { delete M.clear1; delete M.clear2; delete M.clear3; });
    window.__killBoss();
    const mid = { cleared: floorCleared(world[curZ]), settle: window.__c.settle };
    await new Promise(r => setTimeout(r, 1200));
    const out = { info, mid, c: JSON.parse(JSON.stringify(window.__c)), clear1: META.clear1, live: runActive() };
    window.__restore();
    return out;
  });
  ok('1부 5층 구성 = 보스 1마리', a.info.total === 1 && a.info.mobs[0].boss === true, JSON.stringify(a.info));
  ok('1부 클리어 기록(clear1)', a.clear1 === 1);
  ok('1부 — 계열 해금 → 갈림길이 뜬다', a.c.clsUnlock === 1 && a.c.actChoice === 1, JSON.stringify(a.c));
  ok('1부 — 정산창이 뜨지 않는다 (P0-2 핵심)', a.c.settle === 0 && a.c.runEnd.length === 0, JSON.stringify(a.c));
  ok('1부 — 런은 계속 살아 있다(더 깊이 갈 수 있다)', a.live === true);

  /* ---------- ② 2부 8층 — 보스를 먼저 잡고 잡몹을 남긴다 ---------- */
  const b = await page.evaluate(async () => {
    const info = window.__harness(8, function (M) { M.clear1 = 1; delete M.clear2; delete M.clear3; });
    window.__killBoss();
    await new Promise(r => setTimeout(r, 1200));
    const afterBoss = { cleared: floorCleared(world[curZ]), c: JSON.parse(JSON.stringify(window.__c)),
                        clear2: META.clear2, live: runActive(),
                        alive: world[curZ].mobs.filter(function (m) { return !m.dead; }).length };
    const killed = window.__killRest();                       /* 잡몹 마저 처치 */
    await new Promise(r => setTimeout(r, 1200));
    const afterAll = { cleared: floorCleared(world[curZ]), c: JSON.parse(JSON.stringify(window.__c)),
                       clear2: META.clear2, live: runActive() };
    window.__restore();
    return { info, afterBoss, killed, afterAll };
  });
  ok('2부 8층 구성 실측(R34c 100% 전멸 → 4마리 전부, need 4)', b.info.total === 4 && b.info.need === 4, JSON.stringify(b.info));
  ok('보스만 잡으면 층이 안 열린다', b.afterBoss.cleared === false && b.afterBoss.alive === 3, JSON.stringify(b.afterBoss));
  ok('★ 보스만 잡았을 때 정산창이 뜨지 않는다 (예전 버그)', b.afterBoss.c.settle === 0 && b.afterBoss.c.runEnd.length === 0, JSON.stringify(b.afterBoss.c));
  ok('★ 보스만 잡았을 때 clear2 가 기록되지 않는다', b.afterBoss.clear2 === undefined || b.afterBoss.clear2 === 0, 'clear2=' + b.afterBoss.clear2);
  ok('잡몹 마저 잡으면 clear2 가 기록된다', b.afterAll.clear2 === 1, 'clear2=' + b.afterAll.clear2);
  ok('잡몹 마저 잡으면 갈림길이 뜬다(정산 아님)', b.afterAll.c.actChoice === 1 && b.afterAll.c.settle === 0, JSON.stringify(b.afterAll.c));
  ok('2부 — 런은 계속 살아 있다', b.afterAll.live === true);

  /* ---------- ③ 3부 11층 — 잡몹을 마지막에 잡는다 (재클리어: 엔딩 없이 정산) ---------- */
  const c = await page.evaluate(async () => {
    const info = window.__harness(11, function (M) { M.clear1 = 1; M.clear2 = 1; M.clear3 = 1; });
    window.__killBoss();                                      /* 보스 먼저 */
    await new Promise(r => setTimeout(r, 1000));
    const afterBoss = { cleared: floorCleared(world[curZ]), c: JSON.parse(JSON.stringify(window.__c)), live: runActive() };
    window.__killRest();                                      /* 잡몹이 마지막 일격 */
    await new Promise(r => setTimeout(r, 1400));
    const afterAll = { c: JSON.parse(JSON.stringify(window.__c)), live: runActive(),
                       settleShown: document.getElementById('settleov').style.display };
    window.__restore();
    return { info, afterBoss, afterAll };
  });
  ok('3부 11층 구성 실측(R34c 100% 전멸 → 4마리 전부, need 4)', c.info.total === 4 && c.info.need === 4, JSON.stringify(c.info));
  ok('3부 — 보스만 잡은 단계에서는 정산 없음', c.afterBoss.c.settle === 0 && c.afterBoss.live === true, JSON.stringify(c.afterBoss));
  ok('★ 잡몹이 마지막 일격이어도 런이 끝난다 (예전엔 안 끝났음)', c.afterAll.c.runEnd.length === 1 && c.afterAll.c.runEnd[0] === 'clear', JSON.stringify(c.afterAll.c));
  ok('3부 — 정산창이 실제로 표시된다', c.afterAll.c.settle === 1 && c.afterAll.settleShown === 'block', JSON.stringify(c.afterAll));
  ok('3부 재클리어 — 엔딩은 재생하지 않는다', c.afterAll.c.ending === 0, 'ending=' + c.afterAll.c.ending);

  /* ---------- ④ 3부 최초 클리어 — 잡몹이 마지막 일격이어도 엔딩이 먼저 ---------- */
  const d = await page.evaluate(async () => {
    window.__harness(11, function (M) { M.clear1 = 1; M.clear2 = 1; delete M.clear3; });
    window.__killBoss();
    window.__killRest();
    await new Promise(r => setTimeout(r, 1400));
    const out = { c: JSON.parse(JSON.stringify(window.__c)), clear3: META.clear3, endSeen: META.endSeen };
    window.__restore();
    return out;
  });
  ok('3부 최초 클리어 — clear3 기록 + 엔딩 재생', d.clear3 === 1 && d.c.ending === 1, JSON.stringify(d));
  ok('엔딩 감상 플래그(META.endSeen) 세워짐', d.endSeen === 1, 'endSeen=' + d.endSeen);
  ok('엔딩 뒤 정산으로 런 종료', d.c.runEnd.length === 1 && d.c.settle === 1, JSON.stringify(d.c));

  /* ---------- ⑤ 밀도 옵션별 보스층 구성 (부록 A 표 검산) ---------- */
  const dens = await page.evaluate(() => {
    const out = {};
    [1, 1.6, 2.2, 3].forEach(function (dv) {
      OPT.density = dv; rebuildWorld();
      let z = null, k;
      for (k in FLOOR_OF) if (FLOOR_OF[k] === 8) z = parseInt(k, 10);
      const W = world[z];
      out[dv] = { total: W.mobs.length, need: floorNeed(W), 전멸필요: floorNeed(W) === W.mobs.length };
    });
    OPT.density = 1.6; rebuildWorld();
    return out;
  });
  ok('★ R34c — 밀도 무관 100% 전멸 필요 (need === total, 남기고 넘어갈 수 없음)',
     ['1','1.6','2.2','3'].every(function(k){ return dens[k].전멸필요 === true; }), JSON.stringify(dens));

  R.push({ n: 'JS 오류(pageerror/console.error)', pass: errs.length === 0, note: errs.slice(0, 6).join(' | ') });

  const pass = R.filter(r => r.pass).length;
  console.log('\n===== R32 P0-2 흐름 검증 (killMob 실호출) =====');
  R.forEach(r => console.log((r.pass ? ' PASS ' : '*FAIL*') + ' ' + r.n + (r.note ? '   — ' + r.note : '')));
  console.log(`\n${pass}/${R.length} PASS, ${R.length - pass} FAIL`);
  await browser.close();
  process.exit(R.length - pass === 0 ? 0 : 1);
})();
