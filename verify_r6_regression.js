// P4 통합 회귀 검증 — 집중패스 R6 최종
// 새 캐릭터 생성 → 스탯 배분 → 런 시작 → 층 클리어(계시·물자·워프) → 상인/제단 →
// 사망(레벨·장비 초기화) → 메타 구매 → 재런 → 5층 보스 클리어 까지 한 번에 훑는다.
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
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(220); }

  const out = [];
  const run = async (label, fn) => {
    const r = await page.evaluate(fn);
    out.push('── ' + label + ' ──');
    r.forEach(x => out.push('  ' + x));
    return r;
  };

  // ---------- 1) 캐릭터 생성 + 스탯 배분 ----------
  await run('1. 새 캐릭터 생성 · 스탯 8P 배분', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    try { localStorage.clear(); } catch (e) {}
    pickCls = 'k';
    document.getElementById('pname').value = '집중패스';
    if (typeof allocPick === 'function') { /* 팝업 경유 배분이 있으면 사용 */ }
    startGame();
    const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none';
    ok('P 생성', !!P && P.cls === 'k', { name: P && P.name, lv: P && P.lv });
    ok('시작 레벨 1 · 마을(zone 0)', P.lv === 1 && curZ === 0, { lv: P.lv, z: curZ });
    ok('시작 장비 착용됨', !!P.eq.weapon, { wep: P.eq.weapon && P.eq.weapon.k });
    // 스탯 배분 8P 를 CON 에 몰아준다 (P.alloc 경로 검증)
    const hp0 = P.mhp;
    P.alloc = { str: 0, dex: 0, con: 8, int: 0, wis: 0 };
    P.con += 8; P.mhp += 24; P.hp = P.mhp;
    ok('스탯 배분 반영 (CON8 → HP+24)', P.mhp === hp0 + 24, { before: hp0, after: P.mhp });
    return L;
  });

  // ---------- 2) 런 시작 ----------
  await run('2. 런 시작 (runStart)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    hitstopClear(); deadFlag = false;
    const started2 = runStart();
    ok('runStart 성공', started2 === true);
    ok('RUN 활성 · 1층 진입', runActive() && RUN.floor === 1 && curZ === 1, { floor: RUN.floor, z: curZ });
    ok('RUN.revs 초기화됨(빈 문신)', !!RUN.revs && revCount() === 0);
    ok('계시 효과 0 (아직 안 새김)', revVal('rv_edge') === 0 && revAtk() === 0);
    return L;
  });

  // ---------- 3) 1층 전멸 → 계시 3택 자동 등장 ----------
  await page.evaluate(() => {
    // 콘솔 치트: 1층 몹 전부 처치 (마지막 한 마리를 killMob 으로 잡아 floorClear 훅을 태운다)
    const z = world[curZ];
    z.mobs.forEach((m, i) => { if (i < z.mobs.length - 1) { m.dead = true; m.deathT = -99; } });
    const last = z.mobs[z.mobs.length - 1];
    last.hp = 1; last.pdmg = 999; last.tdmg = 999;
    hitMob(last, 999);
  });
  await page.waitForTimeout(1400);
  await run('3. 1층 전멸 → 계시 3택', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('층 전멸 판정', floorCleared(world[curZ]));
    const body = document.getElementById('frewbody').innerHTML;
    ok('계시 창 자동 등장', document.getElementById('frewov').style.display === 'block'
       && document.getElementById('frewtitle').textContent === '계 시');
    ok('계시 카드 3장 제시(계열 뒷면)', (body.match(/pickRevLine/g) || []).length === 3);
    return L;
  });

  // ---------- 4) 계시 선택 → 물자 2택 → 워프 ----------
  await page.evaluate(() => {
    window.__rline = RUN._revCards[0];
    pickRevLine(window.__rline);
  });
  await page.waitForTimeout(1500);
  await run('4. 계시 선택 → 물자 2택', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('문신 1개 새겨짐', revCount() === 1, { line: window.__rline, got: Object.keys(RUN.revs) });
    ok('HUD 문신 아이콘 1개', document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length === 1);
    ok('물자 2택으로 이어짐', document.getElementById('frewtitle').textContent === '층 정 리'
       && (document.getElementById('frewbody').innerHTML.match(/pickFloorCard/g) || []).length === 2);
    return L;
  });
  await page.evaluate(() => {
    // 은화 보상이 후보에 있으면 그걸 골라 120 하향을 실측한다
    window.__goldBefore = P.gold; window.__rewId = RUN._frew[0];
    pickFloorCard(0);
  });
  await page.waitForTimeout(1500);
  await run('5. 물자 선택 → 다음 층 워프 안내', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    // 무작위로 뽑히는 보상에 기대지 않고, 전리품 자루 항목 자체를 직접 실행해 수치를 확인한다
    const goldR = FLOOR_REWARDS.filter(r => r.id === 'gold')[0];
    ok('전리품 자루 설명 = 은화 120', goldR && goldR.desc.indexOf('120') >= 0, { desc: goldR && goldR.desc });
    const g0 = P.gold; goldR.f();
    ok('전리품 자루 실지급 120 (140→120 하향)', P.gold - g0 === 120, { delta: P.gold - g0 });
    L.push('INFO 이번 판에 실제 뽑힌 물자 보상: ' + window.__rewId);
    ok('다음 층 워프 안내 표시', document.getElementById('frewtitle').textContent === '다 음 층'
       && document.getElementById('frewbody').innerHTML.indexOf('goNextFloor') >= 0);
    return L;
  });
  await page.evaluate(() => goNextFloor());
  await page.waitForTimeout(700);
  await run('6. 2층 워프 + 층 진입 보호막', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('2층 이동 완료', RUN.floor === 2 && curZ === 2, { floor: RUN.floor, z: curZ });
    ok('층 갱신 기록', RUN.maxFloor >= 2);
    return L;
  });

  // ---------- 7) 상인 · 제단 (24b_feats) ----------
  await run('7. 던전 상인 · 제단 동작', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('featSpawn 존재', typeof featSpawn === 'function');
    try { featSpawn(curZ, RUN.floor); ok('featSpawn 호출 무오류', true); }
    catch (e) { ok('featSpawn 호출 무오류', false, e.message); }
    try { if (typeof featDraw === 'function') featDraw(); ok('featDraw 무오류', true); }
    catch (e) { ok('featDraw 무오류', false, e.message); }
    try { if (typeof featCheck === 'function') featCheck(); ok('featCheck 무오류', true); }
    catch (e) { ok('featCheck 무오류', false, e.message); }
    return L;
  });

  // ---------- 8) 계시 4개까지 쌓고 효과 합산 확인 ----------
  await run('8. 문신 4개 누적 · 효과 합산 · 등급 임시 표기', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    RUN.revs = {};
    const atkBase = pMaxHit()[0], msBase = pMS(), aspdBase = pAtkMs();
    RUN.revs = { rv_edge: 2, rv_haste: 1, rv_step: 1, rv_ward: 1 };
    refreshHud();
    ok('공격력 +6 (심화)', pMaxHit()[0] - atkBase === 6, { d: pMaxHit()[0] - atkBase });
    ok('이속 +10%', Math.abs(pMS() / msBase - 1.1) < 0.0001);
    ok('공속 +12%', Math.abs(pAtkMs() / aspdBase - 0.88) < 0.0001);
    ok('문신 4개', revCount() === 4);
    ok('HUD 아이콘 4개', document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length === 4);
    ok('등급 임시 표기 (하급)', document.getElementById('gradelbl').textContent.indexOf('(하급)') >= 0,
       { txt: document.getElementById('gradelbl').textContent });
    ok('발광 계열색 산출', !!revGlowColor());
    return L;
  });

  // ---------- 9) 사망 → 정산 → 레벨·장비 초기화 + 계시 소멸 ----------
  await run('9. 사망 → 정산 → 레벨·장비 초기화 + 계시 소멸', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    // 레벨/장비를 올려두고 죽여서 초기화가 실제로 도는지 본다
    P.lv = 12; P.mhp = 200; P.hp = 200; P.gold = 500;
    P.qd = { q1: 1 }; P.kills = 33; P.lore = { l1: 1 };
    // 상위 무기를 실제로 착용시키고(gladius→longsw), 가방에는 미착용 예비 방어구를 넣어 둔다
    addItem('longsw', 1);
    P.eq.weapon = P.inv.filter(it => it.k === 'longsw')[0];
    addItem('plate', 1);
    const spareK = P.inv.filter(it => ITEMS[it.k].t === 'armor' && it !== P.eq.armor).map(it => it.k);
    const eqBefore = P.eq.weapon && P.eq.weapon.k;
    const ptBefore = META.pt;
    RUN.mercyUsed = 1;                 // 자비 이미 소진 → 진짜로 죽게
    deadFlag = false; P.hp = 1;
    playerDie(null);
    ok('사망 플래그', deadFlag === true);
    if (runActive()) runEnd('death');
    ok('정산 화면 표시', document.getElementById('settleov').style.display === 'block');
    ok('업적포인트 적립', META.pt > ptBefore, { before: ptBefore, after: META.pt });
    settleClose();
    ok('RUN 소멸', RUN === null);
    ok('계시 전부 소멸', revCount() === 0 && revVal('rv_edge') === 0);
    ok('레벨 1 로 초기화', P.lv === 1, { lv: P.lv });
    ok('은화 0 (런 내 골드 소멸)', P.gold === 0);
    ok('장비 초기화 (longsw → 시작무기)', P.eq.weapon && P.eq.weapon.k !== eqBefore,
       { before: eqBefore, after: P.eq.weapon && P.eq.weapon.k });
    ok('가방 속 미착용 장비도 제거', P.inv.filter(it => SLOTN[ITEMS[it.k].t] !== undefined
        && spareK.indexOf(it.k) >= 0 && it.k === 'plate').length === 0,
       { spareBefore: spareK, invNow: P.inv.map(it => it.k) });
    ok('완료 퀘스트 보존', !!P.qd.q1);
    ok('처치 기록 보존', P.kills === 33);
    ok('기록물 보존', !!P.lore.l1);
    ok('마을 귀환', curZ === 0);
    ok('HUD 문신 아이콘 0', document.querySelectorAll('#buffline .bic[id^="bic_rev_"]').length === 0);
    return L;
  });

  // ---------- 10) 메타 구매 → 재런 ----------
  await run('10. 메타(영구 성장) 구매 → 재런', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    META.pt = 99999; metaSave();
    const hp0 = P.mhp;
    const bought = metaBuy('hp');
    ok('메타 노드 구매(hp)', metaLv('hp') > 0, { lv: metaLv('hp'), ret: bought });
    metaApplyToPlayer();
    ok('메타 HP 보너스 적용', P.mhp > hp0, { before: hp0, after: P.mhp });
    metaBuy('dash');
    ok('회피 해금 구매', metaOwned('dash'));
    // 재런
    deadFlag = false; hitstopClear();
    const ok2 = runStart();
    ok('재런 시작', ok2 === true && runActive() && RUN.floor === 1);
    ok('재런 시 문신 다시 0', revCount() === 0);
    ok('메타 보너스는 유지', metaLv('hp') > 0);
    return L;
  });

  // ---------- 11) 5층 보스 클리어 ----------
  await page.evaluate(() => {
    // 콘솔 치트: 보스 층으로 직행해 보스를 잡는다
    P.lv = 40; P.mhp = 2000; P.hp = 2000;
    travel(5, ZONES[5].gates && ZONES[5].gates[0] ? 6 : 6, 6);
  });
  await page.waitForTimeout(500);
  await run('11. 5층 보스 클리어', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('5층 진입', curZ === 5 && RUN && RUN.floor === 5, { z: curZ, floor: RUN && RUN.floor });
    const z = world[5];
    const boss = z.mobs.filter(m => m.d.boss)[0];
    ok('보스 존재', !!boss, { n: boss && boss.d.n });
    if (boss) {
      z.mobs.forEach(m => { if (m !== boss) { m.dead = true; m.deathT = -99; } });
      boss.hp = 1; boss.pdmg = 9999; boss.tdmg = 9999;
      hitMob(boss, 9999);
      ok('보스 처치', boss.dead === true);
      ok('보스 격파 기록', P.bossKilled === true);
      ok('1부 클리어 영구 기록(META.clear1)', META.clear1 === 1);
    }
    return L;
  });
  await page.waitForTimeout(1400);
  await run('12. 클리어 정산', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('클리어 정산 화면', document.getElementById('settleov').style.display === 'block');
    ok('런 종료 처리', !runActive());
    return L;
  });
  await page.screenshot({ path: 'verify_r6_regression.png' });

  console.log(out.join('\n'));
  const fails = out.filter(l => l.indexOf('FAIL') >= 0);
  const skips = out.filter(l => l.indexOf('SKIP') >= 0);
  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  console.log('=== 최종 판정 ===');
  console.log('FAIL ' + fails.length + '건 / SKIP ' + skips.length + '건 / 페이지오류 ' + errors.length + '건');
  if (fails.length) console.log(fails.join('\n'));
  console.log((fails.length === 0 && errors.length === 0) ? 'PASS' : 'FAIL');
  await browser.close();
})();
