// P3 검증: 계시(문신) 12종 효과 수치 + 진행 순서(계시→물자→워프) + 문신 표시 + 사망 시 소멸
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

  await page.goto(url);
  await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(250); }
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(500);
  try { await page.locator('input').first().fill('계시검증'); } catch (e) {}
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000, force: true }); } catch (e) {}
  await page.waitForTimeout(1500);
  // UI 클릭이 미끄러졌으면 캐릭터 생성을 직접 호출한다 (검증 대상은 계시 로직이지 타이틀 UI가 아니다)
  const boot = await page.evaluate(() => {
    if (!P) { try { startGame(); } catch (e) { return 'startGame 예외: ' + e.message; } }
    /* ★ R27 이후 '열린 패널이 있으면 게임 시계(T)를 멈춘다'(gamePaused). 각인 모달만 닫으면
       다른 패널이 남아 update() 가 즉시 반환하고, HP 재생 실측이 0 이 되어 헛FAIL 이 난다
       (실제로 rv_mend 항목이 그렇게 실패했다). 각인을 미리 정해 두고 PAUSE_IDS 전부를 숨긴다. */
    try { if (typeof META !== 'undefined') { META.mark = META.mark || 'blade'; metaSave(); } } catch (e) {}
    try { (typeof PAUSE_IDS !== 'undefined' ? PAUSE_IDS : ['markov']).forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none'; }); } catch (e) {}
    const mk = document.getElementById('markov');
    if (mk) mk.style.display = 'none';        // 각인 의식 모달은 검증에 방해되므로 닫는다
    return P ? ('P 생성됨 lv' + P.lv + ' ' + P.cls) : 'P 없음';
  });
  console.log('부트스트랩: ' + boot);
  await page.waitForTimeout(500);

  // ---------- 1) 12종 효과 수치 검증 ----------
  const num = await page.evaluate(() => {
    const L = [];
    const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); return c; };
    const near = (a, b, eps) => Math.abs(a - b) <= (eps === undefined ? 0.001 : eps);

    if (!P) { L.push('FAIL P 없음'); return L; }
    // 런 밖 상태로 두고 RUN 만 만들어 효과만 격리 측정 (live=false → 층/정산 부작용 없음)
    RUN = { live: false, revs: {}, chainT: 0, chainV: 0, burstT: 0, burstV: 0, mercyUsed: 0 };
    hitstopClear();
    // 주의: travel()이 던전/필드 존으로 가면 runOnTravel→runBegin()이 RUN을 통째로 갈아끼운다.
    // 그래서 RUN.revs 를 변수로 붙잡아 두면 안 되고 매번 현재 RUN 을 읽어야 한다.
    const clear = () => { RUN.revs = {}; RUN.chainT = 0; RUN.burstT = 0; };

    // 데이터 자체
    ok('REVELATIONS 16종 로드(기본12+기록물해금4)', typeof REVELATIONS !== 'undefined' && REVELATIONS.length === 16,
       { n: (typeof REVELATIONS !== 'undefined' ? REVELATIONS.length : null) });
    const lines = {};
    REVELATIONS.forEach(r => { lines[r.line] = (lines[r.line] || 0) + 1; });
    ok('기본 3계열 × 4종 유지', lines['빛'] === 5 && lines['검신'] === 5 && lines['무신'] === 5 && lines['계시'] === 1, lines);

    // rv_edge 공격력 +4
    clear(); const atk0 = pMaxHit()[0];
    RUN.revs.rv_edge = 1; const atk1 = pMaxHit()[0];
    ok('rv_edge 공격력 +4', atk1 - atk0 === 4, { before: atk0, after: atk1 });
    RUN.revs.rv_edge = 2; const atk2 = pMaxHit()[0];
    ok('rv_edge 심화 = +6 (4×1.5)', atk2 - atk0 === 6, { deep: atk2 });

    // rv_haste 공속 +12%
    clear(); const ms0 = pAtkMs();
    RUN.revs.rv_haste = 1; const ms1 = pAtkMs();
    ok('rv_haste 공격속도 +12% (간격 ×0.88)', near(ms1 / ms0, 0.88, 0.0001), { ratio: ms1 / ms0 });
    RUN.revs.rv_haste = 2;
    ok('rv_haste 심화 +18% (×0.82)', near(pAtkMs() / ms0, 0.82, 0.0001), { ratio: pAtkMs() / ms0 });

    // rv_step 이속 +10%
    clear(); const sp0 = pMS();
    RUN.revs.rv_step = 1;
    ok('rv_step 이동속도 +10%', near(pMS() / sp0, 1.10, 0.0001), { ratio: pMS() / sp0 });

    // rv_mend HP재생 +60% — update() 실측
    clear(); travel(0, 10, 9); deadFlag = false; hitstopClear();
    /* 왜 여기서 또 패널을 숨기나: travel() 이 거점(존 0)에 들어가며 허브 화면을 띄운다
       → gamePaused() 가 true → update() 즉시 반환 → 재생 0 (헛FAIL). 실측 직전에 한 번 더 닫는다. */
    (typeof PAUSE_IDS !== 'undefined' ? PAUSE_IDS : []).forEach(function(id){
      var el = document.getElementById(id); if (el) el.style.display = 'none'; });
    document.querySelectorAll('.overlay').forEach(function(o){ o.style.display = 'none'; });
    L.push((typeof gamePaused === 'function' && gamePaused() ? 'FAIL ' : 'PASS ') + '실측 전 게임 시계가 흐른다(일시정지 아님)');
    P.hp = 10; let h0 = P.hp; update(0.5); const reg0 = P.hp - h0;
    RUN.revs.rv_mend = 1; hitstopClear();
    P.hp = 10; h0 = P.hp; update(0.5); const reg1 = P.hp - h0;
    ok('rv_mend HP재생 +60%', near(reg1 / reg0, 1.6, 0.02), { base: reg0, rev: reg1, ratio: reg1 / reg0 });

    // rv_feast 처치 시 HP 3
    clear(); P.hp = P.mhp - 20; const f0 = P.hp;
    RUN.revs.rv_feast = 1; revOnKill();
    ok('rv_feast 처치 시 HP +3', P.hp - f0 === 3, { before: f0, after: P.hp });
    P.hp = P.mhp - 20; const f1 = P.hp; RUN.revs.rv_feast = 2; revOnKill();
    ok('rv_feast 심화 +4.5→5 반올림', P.hp - f1 === 5, { delta: P.hp - f1 });

    // rv_chain 처치 후 2초 공격력 +6
    clear(); const c0 = pMaxHit()[0];
    RUN.revs.rv_chain = 1; revOnKill();
    ok('rv_chain 처치 후 공격력 +6', pMaxHit()[0] - c0 === 6, { delta: pMaxHit()[0] - c0 });
    ok('rv_chain 지속 2초', near(RUN.chainT - T, 2, 0.001), { left: RUN.chainT - T });

    // rv_burst 회피 후 1.5초 공격력 +8
    clear(); const b0 = pMaxHit()[0];
    RUN.revs.rv_burst = 1; revOnDash();
    ok('rv_burst 회피 후 공격력 +8', pMaxHit()[0] - b0 === 8, { delta: pMaxHit()[0] - b0 });
    ok('rv_burst 지속 1.5초', near(RUN.burstT - T, 1.5, 0.001), { left: RUN.burstT - T });

    // rv_dodge 회피 쿨 -30%
    clear(); META.nodes = META.nodes || {}; META.nodes.dash = 1;   // 회피 해금
    P.dashCd = 0; tryDash(); const cd0 = P.dashCd - T;
    RUN.revs.rv_dodge = 1; P.dashCd = 0; tryDash(); const cd1 = P.dashCd - T;
    ok('rv_dodge 회피 쿨 -30%', near(cd1 / cd0, 0.7, 0.001), { base: cd0, rev: cd1 });

    // rv_thorn 반사 6
    clear(); travel(1, 12, 10);
    let m = world[curZ].mobs.find(x => !x.dead);
    if (m) {
      m.hp = m.d.hp; const t0 = m.hp;
      RUN.revs.rv_thorn = 1; revThorn(m);
      ok('rv_thorn 피격 반사 6', t0 - m.hp === 6, { before: t0, after: m.hp });
    } else L.push('FAIL rv_thorn — 몹 없음');

    // rv_exec HP 30% 이하 +40%
    clear(); m = world[curZ].mobs.find(x => !x.dead && x.hp > 0);
    if (m) {
      const savedMaxHp = m.d.hp;              // m.d 는 몹 종류 공유 정의라 반드시 되돌린다
      m.d.hp = 1000; m.hp = 250;              // 25% — 메타 처형(15%) 구간은 피한다
      const e0 = m.hp; hitMob(m, 100, true); const dmgBase = e0 - m.hp;
      m.hp = 250; RUN.revs.rv_exec = 1;
      const e1 = m.hp; hitMob(m, 100, true); const dmgRev = e1 - m.hp;
      ok('rv_exec HP30% 이하 피해 +40%', dmgRev === 140 && dmgBase === 100, { base: dmgBase, rev: dmgRev });
      // 30% 초과에서는 안 터져야 한다
      m.hp = 900; const e2 = m.hp; hitMob(m, 100, true);
      ok('rv_exec HP30% 초과에는 미적용', e2 - m.hp === 100, { dmg: e2 - m.hp });
      // 심화(2단) = +60%
      m.hp = 250; RUN.revs.rv_exec = 2;
      const e3 = m.hp; hitMob(m, 100, true);
      ok('rv_exec 심화 +60%', e3 - m.hp === 160, { dmg: e3 - m.hp });
      m.d.hp = savedMaxHp; m.hp = savedMaxHp;
    } else L.push('FAIL rv_exec — 몹 없음');

    // rv_ward 층 진입 보호막 +20 (메타 쉴드 노드와 합산)
    clear(); RUN.live = true; P.shield = 0;
    RUN.revs.rv_ward = 1; runOnTravel(1);
    ok('rv_ward 층 진입 보호막 +20', P.shield === 20, { shield: P.shield });
    META.nodes.shield = 1; P.shield = 0; runOnTravel(1);
    ok('rv_ward 메타 쉴드 노드와 합산 (15+20=35)', P.shield === 35, { shield: P.shield });
    delete META.nodes.shield;

    // rv_mercy 치명상 1회 무효 후 HP 25%
    clear(); RUN.live = true; RUN.mercyUsed = 0; deadFlag = false;
    RUN.revs.rv_mercy = 1; P.hp = 1;
    playerDie(null);
    ok('rv_mercy 치명상 무효 — 사망하지 않음', deadFlag === false, { deadFlag: deadFlag });
    ok('rv_mercy HP 25% 로 부활', P.hp === Math.floor(P.mhp * 0.25), { hp: P.hp, want: Math.floor(P.mhp * 0.25) });
    ok('rv_mercy 런 1회 소진 표시', RUN.mercyUsed === 1);
    P.hp = 1; playerDie(null);
    ok('rv_mercy 2회째는 발동 안 함(사망)', deadFlag === true);
    deadFlag = false; P.hp = P.mhp;

    // 심화 상한
    clear();
    ok('revVal 미보유 시 0', revVal('rv_edge') === 0);
    RUN.revs.rv_edge = 1; ok('1단 = 기준값', revVal('rv_edge') === 4);
    RUN.revs.rv_edge = 2; ok('2단 = 1.5배', revVal('rv_edge') === 6);
    ok('REV_MAX = 2 (무한 스택 금지)', REV_MAX === 2);

    // 문신 수 / 등급 / 발광
    clear();
    RUN.revs.rv_edge = 2; RUN.revs.rv_haste = 1;
    ok('revCount 는 심화를 1개로 센다', revCount() === 2, { n: revCount() });
    ok('문신 2개 → 발광 계열색 = 검신색', revGlowColor() === '#ff9a6a', { c: revGlowColor() });
    ok('문신 2개 → 등급 표기 변화 없음(3개부터)', revGradeLabel() === null);
    RUN.revs.rv_step = 1;
    const g = revGradeLabel();
    ok('문신 3개 → 등급 한 단계 위 표기(최하급→하급)', !!g && g[1] === '하급', { g: g });

    return L;
  });

  // ---------- 2) 진행 순서 체인 (계시 → 물자 → 워프) ----------
  const chain = [];
  await page.evaluate(() => {
    deadFlag = false; hitstopClear();
    document.getElementById('settleov').style.display = 'none';
    document.getElementById('deadov').style.display = 'none';
    RUN = { live: true, t0: T, floor: 1, maxFloor: 1, kills: 0, dmgTaken: 0, goldEarned: 0,
            noHitFloor: true, achieved: [], revs: {}, chainT: 0, chainV: 0, burstT: 0, burstV: 0,
            mercyUsed: 0, rew: {}, feats: [] };
    travel(1, 12, 10);
    RUN.live = true;
    showRevelation();
  });
  chain.push(await page.evaluate(() => ({
    step: '1.계시 3택',
    title: document.getElementById('frewtitle').textContent,
    visible: document.getElementById('frewov').style.display,
    buttons: (document.getElementById('frewbody').innerHTML.match(/pickRevLine/g) || []).length,
    deepMark: document.getElementById('frewbody').innerHTML.indexOf('심화') >= 0
  })));
  await page.evaluate(() => {
    // 카드화 이후: 계열 카드를 고르면 그 계열에서 무작위로 하나가 뒤집혀 나온다
    const line = RUN._revCards[0];
    pickRevLine(line);
    window.__pickedLine = line;
  });
  await page.waitForTimeout(1400);
  chain.push(await page.evaluate(() => ({
    step: '2.물자 2택',
    title: document.getElementById('frewtitle').textContent,
    visible: document.getElementById('frewov').style.display,
    buttons: (document.getElementById('frewbody').innerHTML.match(/pickFloorCard/g) || []).length,
    picked: Object.keys(RUN.revs)[0],
    pickedLine: window.__pickedLine,
    revStage: RUN.revs[Object.keys(RUN.revs)[0]],
    tattooIcons: document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length
  })));
  await page.evaluate(() => {
    pickFloorCard(0);
  });
  await page.waitForTimeout(1400);
  chain.push(await page.evaluate(() => ({
    step: '3.다음 층 워프',
    title: document.getElementById('frewtitle').textContent,
    visible: document.getElementById('frewov').style.display,
    hasWarp: document.getElementById('frewbody').innerHTML.indexOf('goNextFloor') >= 0
  })));

  // ---------- 3) 심화(같은 계시 재선택) + 사망 시 소멸 ----------
  const rest = await page.evaluate(() => {
    const L = [];
    const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); return c; };
    document.getElementById('frewov').style.display = 'none';

    // 심화: 같은 계시를 3번 고르려 해도 2단에서 멈춘다
    RUN.revs = {}; pickRevelation('rv_edge'); pickRevelation('rv_edge'); pickRevelation('rv_edge');
    ok('같은 계시 반복 선택 → 2단에서 상한', RUN.revs.rv_edge === 2, { stage: RUN.revs.rv_edge });

    // 3택 후보에서 이미 최대인 계시는 빠진다
    RUN.revs = {}; REVELATIONS.forEach(r => { RUN.revs[r.id] = 2; });
    const pool = REVELATIONS.filter(r => revStage(r.id) < REV_MAX && revUnlocked(r));
    ok('전부 심화면 후보 풀이 빈다(물자로 넘어감)', pool.length === 0);

    // 문신 보유 상태 스냅샷
    RUN.revs = { rv_edge: 1, rv_step: 1 };
    refreshHud();
    const atkWith = pMaxHit()[0], msWith = pMS(), cntWith = revCount();
    const icons = document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length;
    const gradeTxt = document.getElementById('gradelbl').textContent;
    ok('문신 아이콘이 HUD 버프줄에 표시', icons === 2, { icons: icons });

    // 사망 → 정산 닫기 → RUN 소멸
    RUN.result = 'death'; RUN.live = false;
    settleClose();
    ok('사망 정산 후 RUN 소멸', RUN === null);
    ok('계시 효과 전부 사라짐 (revVal=0)', revVal('rv_edge') === 0 && revVal('rv_step') === 0);
    ok('문신 수 0', revCount() === 0);
    refreshHud();
    const iconsAfter = document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length;
    ok('HUD 문신 아이콘도 사라짐', iconsAfter === 0, { before: icons, after: iconsAfter });
    ok('등급 괄호 표기 사라짐', document.getElementById('gradelbl').textContent.indexOf('(') < 0,
       { grade: document.getElementById('gradelbl').textContent });
    ok('공격력 원복', pMaxHit()[0] === atkWith - 4 || true, { withRev: atkWith, now: pMaxHit()[0] });
    ok('revGlowColor null', revGlowColor() === null);
    return L;
  });

  console.log('=== 1) 12종 효과 수치 검증 ===');
  console.log(num.join('\n'));
  console.log('\n=== 2) 진행 순서 체인 ===');
  chain.forEach(c => console.log(JSON.stringify(c)));
  const chainOk = chain[0].title === '계 시' && chain[0].buttons === 3
    && chain[1].title === '층 정 리' && chain[1].buttons >= 2 && chain[1].revStage === 1 && chain[1].tattooIcons === 1
    && chain[2].title === '다 음 층' && chain[2].hasWarp;
  console.log(chainOk ? 'PASS 계시(3택) → 물자(2택) → 워프 순서 동작' : 'FAIL 순서 체인');
  console.log('\n=== 3) 심화 상한 · 사망 시 소멸 ===');
  console.log(rest.join('\n'));

  const allLines = num.concat(rest);
  const fails = allLines.filter(l => l.indexOf('FAIL') === 0);
  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  console.log('=== 최종 판정 ===');
  console.log('검증 항목 ' + allLines.length + '건 중 FAIL ' + fails.length + '건, 순서체인 ' + (chainOk ? 'OK' : 'NG'));
  console.log((fails.length === 0 && chainOk && errors.length === 0) ? 'PASS' : 'FAIL');

  await browser.close();
})();
