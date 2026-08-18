/* ─────────────────────────────────────────────────────────────
   R32 회귀 스위트 · 윈도우에서 그대로 실행 가능 (T-P1-7 규약 준수)
     node verify_r32_p1.js
   기본 대상: ../dist/game_분열된세계_ONLINE_배포.html
   대상 바꾸기 : set GAME_HTML=경로
   브라우저 지정: set CHROME_PATH=크롬경로   (없으면 Playwright 기본 브라우저)
   ───────────────────────────────────────────────────────────── */
/* R32 P1-1(엔딩) · P1-3(세이브스커밍 차단) 회귀 검증
   실행: node verify_r32_p1.js
   ★ 실제 빌드 HTML 을 헤드리스로 띄우고 게임 함수를 그대로 호출한다(소스 문자열 검사 아님). */
const { chromium } = require('playwright');
/* 검증 대상 = 실제 배포 빌드. GAME_HTML 로 덮어쓸 수 있다. */
const FILE = process.env.GAME_HTML || require('path').resolve(__dirname, '..', 'dist', 'game_분열된세계_ONLINE_배포.html');
/* T-P1-7 규약 — 리눅스 경로를 박지 않는다. CHROME_PATH 가 있으면 그것을, 없으면
   Playwright 기본 설치 브라우저를 쓴다(윈도우에서 그대로 실행 가능). */
const EXE = process.env.CHROME_PATH || undefined;

const R = [];
const ok = (n, pass, note) => { R.push({ n, pass: !!pass, note: note || '' }); };

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto('file://' + FILE.replace(/\\/g, '/'));
  await page.waitForTimeout(1800);

  /* ---------- 1. 데이터·함수 존재 ---------- */
  const base = await page.evaluate(() => ({
    hasENDING: typeof ENDING !== 'undefined' && !!ENDING,
    scenes: (typeof ENDING !== 'undefined' && ENDING) ? ENDING.length : 0,
    keys: (typeof ENDING !== 'undefined' && ENDING) ? ENDING.map(s => s.sc) : [],
    lines: (typeof ENDING !== 'undefined' && ENDING) ? ENDING.reduce((a, s) => a + s.t.length, 0) : 0,
    hasPlayCutscene: typeof playCutscene === 'function',
    hasPlayEnding: typeof playEnding === 'function',
    hasIntroScenes: typeof introScenes === 'function',
    introUntouched: typeof INTRO !== 'undefined' && INTRO.length === 6,
    pauseHasIntro: typeof PAUSE_IDS !== 'undefined' && PAUSE_IDS.indexOf('introov') >= 0,
    endReplayBtn: !!document.getElementById('endreplay'),
    packHasInRun: typeof packSave === 'function'
  }));
  ok('ENDING 데이터 존재(장면 5)', base.hasENDING && base.scenes === 5, `${base.scenes}장면 / ${base.lines}줄 / ${base.keys.join(',')}`);
  ok('재생기 일반화 함수 3종', base.hasPlayCutscene && base.hasPlayEnding && base.hasIntroScenes);
  ok('프롤로그 INTRO 6장면 그대로', base.introUntouched);
  ok('PAUSE_IDS 에 introov 등록', base.pauseHasIntro);
  ok('타이틀 엔딩감상 버튼 존재', base.endReplayBtn);

  /* ---------- 2. 엔딩 장면 painter 5종이 실제로 그려지는가 ---------- */
  const paint = await page.evaluate(() => {
    const out = {};
    ENDING.forEach(s => {
      const f = (typeof ISC !== 'undefined') ? ISC[s.sc] : null;
      if (typeof f !== 'function') { out[s.sc] = 'painter 없음(stars 폴백)'; return; }
      try {
        [0, 0.4, 1.5, 3.0, 4.5, 6.1].forEach(t => f(t));
        out[s.sc] = 'OK';
      } catch (e) { out[s.sc] = 'THROW: ' + e.message; }
    });
    return out;
  });
  const paintBad = Object.keys(paint).filter(k => paint[k] !== 'OK');
  ok('엔딩 painter 5종 무예외 렌더', paintBad.length === 0, JSON.stringify(paint));

  /* ---------- 3. 타이틀 '엔딩 감상' 노출 조건 ---------- */
  const replay = await page.evaluate(() => {
    const b = document.getElementById('endreplay');
    META.endSeen = 0; titleExtraSync(); const off = b.style.display;
    META.endSeen = 1; titleExtraSync(); const on = b.style.display;
    META.endSeen = 0; titleExtraSync();
    return { off, on };
  });
  ok('엔딩 미시청=숨김 / 시청=표시', replay.off === 'none' && replay.on !== 'none', JSON.stringify(replay));

  /* ---------- 4. 엔딩 재생 → 콜백 보장 (자연 종료 / 건너뛰기) ---------- */
  const cb = await page.evaluate(async () => {
    const res = {};
    // 부팅 시 자동 재생된 프롤로그가 떠 있으면 먼저 닫는다(엔딩과 겹치지 않게)
    if (introOn) endIntro();
    try { localStorage.removeItem('lc2_intro_seen'); } catch (e) {}
    // (a) 자연 종료: 마지막 장면에서 nextIntro 를 더 밀면 endIntro -> after
    window.__fired = 0;
    const started1 = playEnding(function () { window.__fired++; });
    res.started = started1;
    res.overlay = document.getElementById('introov').style.display;
    res.firstText = document.getElementById('introtx').innerHTML.slice(0, 24);
    for (let i = 0; i < ENDING.length; i++) nextIntro();   // 장면 수만큼 밀면 끝난다
    res.firedAfterNatural = window.__fired;
    res.overlayAfter = document.getElementById('introov').style.display;
    res.seqReset = (introSeq === null && introKind === 'intro' && introAfter === null);
    // (b) 건너뛰기: 재생 도중 endIntro() 를 눌러도 콜백이 와야 한다
    window.__fired2 = 0;
    playEnding(function () { window.__fired2++; });
    endIntro();
    res.firedAfterSkip = window.__fired2;
    // (c) 프롤로그 플래그를 엔딩이 건드리지 않았는가
    res.introSeenFlag = (function(){ try { return localStorage.getItem('lc2_intro_seen'); } catch(e){ return 'ERR'; } })();
    return res;
  });
  ok('playEnding 재생 시작 + 오버레이 표시', cb.started === true && cb.overlay === 'block');
  ok('엔딩 자연 종료 시 콜백 1회', cb.firedAfterNatural === 1, 'fired=' + cb.firedAfterNatural);
  ok('엔딩 종료 후 재생기 상태 초기화', cb.seqReset === true);
  ok('건너뛰기로 끝내도 콜백 1회 (런 멈춤 방지)', cb.firedAfterSkip === 1, 'fired=' + cb.firedAfterSkip);
  ok('엔딩이 프롤로그 seen 플래그를 세우지 않음', cb.introSeenFlag !== '1', 'flag=' + cb.introSeenFlag);

  /* ---------- 5. 최종 보스층 정리 → 엔딩 먼저, 그다음 정산 ---------- */
  const trig = await page.evaluate(async () => {
    const res = {};
    P = newPlayer('검증', 'k'); started = true;
    metaLoad();
    delete META.clear3; META.clear1 = 1; META.clear2 = 1;
    // 마지막 부의 보스층 존 찾기
    let bz = null, bf = null;
    for (const z in FLOOR_OF) { if (isFinalBoss(FLOOR_OF[z])) { bz = parseInt(z, 10); bf = FLOOR_OF[z]; } }
    res.finalFloor = bf; res.finalZone = bz;
    runBegin();
    curZ = bz;
    world[bz].mobs.forEach(m => { m.dead = true; });
    res.floorCleared = floorCleared(world[bz]);
    // playEnding 을 감싸 호출 여부만 기록 (실제 재생은 하지 않는다)
    const realEnding = playEnding, realSettle = showSettle;
    let endingCalled = 0, settleCalled = 0, captured = null;
    window.playEnding = function (after) { endingCalled++; captured = after; return true; };
    window.showSettle = function (r, sc) { settleCalled++; return realSettle(r, sc); };
    runOnFloorClear();
    res.clear3Recorded = META.clear3;
    await new Promise(r => setTimeout(r, 1400));            // 900ms 타이머 통과
    res.endingCalled = endingCalled;
    res.settleBeforeEnding = settleCalled;                  // 엔딩보다 정산이 먼저 뜨면 실패
    res.runStillLive = runActive();
    if (captured) captured();                               // 엔딩이 끝난 셈
    res.settleAfterEnding = settleCalled;
    res.runEndedAfter = !runActive();
    window.playEnding = realEnding; window.showSettle = realSettle;
    return res;
  });
  ok('최종 보스층 판정(11층/마지막 부)', trig.finalFloor === 11 && trig.floorCleared === true, JSON.stringify({f:trig.finalFloor,z:trig.finalZone,cleared:trig.floorCleared}));
  ok('clear3 기록됨', trig.clear3Recorded === 1);
  ok('엔딩이 먼저 재생된다(정산 아님)', trig.endingCalled === 1 && trig.settleBeforeEnding === 0, JSON.stringify(trig));
  ok('엔딩 중 런은 아직 살아 있다', trig.runStillLive === true);
  ok('엔딩 끝난 뒤 정산이 뜬다', trig.settleAfterEnding === 1 && trig.runEndedAfter === true);

  /* ---------- 6. 재클리어는 엔딩 없이 바로 정산 ---------- */
  const re = await page.evaluate(async () => {
    const res = {};
    P = newPlayer('검증2', 'k'); started = true;
    metaLoad(); META.clear1 = 1; META.clear2 = 1; META.clear3 = 1;   // 이미 깬 상태
    let bz = null;
    for (const z in FLOOR_OF) if (isFinalBoss(FLOOR_OF[z])) bz = parseInt(z, 10);
    runBegin(); curZ = bz;
    world[bz].mobs.forEach(m => { m.dead = true; });
    const realEnding = playEnding;
    let endingCalled = 0;
    window.playEnding = function (a) { endingCalled++; if (a) a(); return true; };
    runOnFloorClear();
    await new Promise(r => setTimeout(r, 1400));
    res.endingCalled = endingCalled;
    res.runEnded = !runActive();
    window.playEnding = realEnding;
    return res;
  });
  ok('재클리어 시 엔딩 재생 안 함', re.endingCalled === 0, 'called=' + re.endingCalled);
  ok('재클리어 시 정산으로 런 종료', re.runEnded === true);

  /* ---------- 7. P1-3 세이브스커밍 — packSave 플래그 ---------- */
  const pk = await page.evaluate(() => {
    const res = {};
    P = newPlayer('스컴', 'k'); started = true;
    P.gold = 500;                                   // 마을에서 모은 돈
    const townSave = JSON.parse(decodeURIComponent(escape(atob(packSave()))));
    res.townInRun = townSave.inRun; res.townGoldIn = townSave.runGoldIn;
    runBegin();                                     // RUN.goldIn = 현재 지갑
    res.goldInAtStart = RUN.goldIn;
    P.gold += 5000; runOnGold(5000);                // 던전에서 번 돈
    const runSave = JSON.parse(decodeURIComponent(escape(atob(packSave()))));
    res.runInRun = runSave.inRun; res.runGoldIn = runSave.runGoldIn; res.runGold = runSave.gold;
    return res;
  });
  ok('마을 저장은 inRun=false', pk.townInRun === false, JSON.stringify(pk));
  ok('던전 저장은 inRun=true + goldIn 기록', pk.runInRun === true && pk.runGoldIn === 500, JSON.stringify(pk));
  ok('저장된 지갑에 런 수익이 들어 있다(차단 대상)', pk.runGold === 5500);

  /* ---------- 8. P1-3 — 던전 세이브를 불러오면 이탈 정산 ---------- */
  const load = await page.evaluate(async () => {
    const res = {};
    P = newPlayer('스컴2', 'k'); started = true;
    P.gold = 500;
    addItem('hpot', 5);                                     // 가방에 물건을 넣어 둔다(이탈 후에도 남아야 한다)
    P.lv = 7;                                               // 레벨도 올려 둔다 — 이탈은 사망이 아니다
    res.invBefore = P.inv.length; res.lvBefore = P.lv;
    runBegin();
    P.gold += 5000; runOnGold(5000);
    P.tf = 'goblin'; P.tfT = T + 600;                       // 변신 중
    P.buffs.bd = { v: 3, t: T + 99999, n: '전의' };          // 런 한정 버프(층 보상)
    RUN.revs = { r1: 2 };                                   // 계시 2단
    const code = savSeal(packSave());
    // 새로고침 흉내: 런 상태를 통째로 버리고 로드
    RUN = null; P = null; started = false;
    applyLoad(code);
    res.gold = P.gold;
    res.tf = P.tf;
    res.buffKeys = Object.keys(P.buffs);
    res.runIsNull = (RUN === null || !runActive());
    res.lv = P.lv;                                          // 이탈은 사망이 아니다 — 레벨 유지
    res.eqCount = P.eq ? Object.keys(P.eq).filter(function(k){return !!P.eq[k];}).length : 0;
    res.invCount = P.inv ? P.inv.length : 0;
    return res;
  });
  ok('런 수익 은화가 사라지고 가져간 만큼만 남는다', load.gold === 500, 'gold=' + load.gold);
  ok('변신 해제', load.tf === null);
  ok('런 한정 버프 정리', load.buffKeys.length === 0, JSON.stringify(load.buffKeys));
  ok('계시는 저장되지 않아 소멸(런 없음)', load.runIsNull === true);
  ok('이탈이므로 레벨·가방은 유지(사망 아님)', load.lv === load.lvBefore && load.invCount === load.invBefore && load.invCount > 0,
     JSON.stringify({lv:load.lv,lvBefore:load.lvBefore,inv:load.invCount,invBefore:load.invBefore}));

  /* ---------- 9. 마을 세이브는 아무 영향 없음 (회귀) ---------- */
  const town = await page.evaluate(() => {
    const res = {};
    P = newPlayer('마을', 'k'); started = true;
    P.gold = 777; P.lv = 5;
    const code = savSeal(packSave());
    P = null; started = false;
    applyLoad(code);
    res.gold = P.gold; res.lv = P.lv;
    return res;
  });
  ok('마을 저장 왕복은 은화·레벨 그대로', town.gold === 777 && town.lv === 5, JSON.stringify(town));

  R.push({ n: 'JS 오류(pageerror/console.error)', pass: errs.length === 0, note: errs.slice(0, 6).join(' | ') });

  const pass = R.filter(r => r.pass).length;
  console.log('\n===== R32 P1 검증 =====');
  R.forEach(r => console.log((r.pass ? ' PASS ' : '*FAIL*') + ' ' + r.n + (r.note ? '   — ' + r.note : '')));
  console.log(`\n${pass}/${R.length} PASS, ${R.length - pass} FAIL`);
  await browser.close();
  process.exit(R.length - pass === 0 ? 0 : 1);
})();
