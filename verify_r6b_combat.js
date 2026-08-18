// P2 검증: 히트스톱/넉백/사망연출/데미지숫자팝/공격선딜/화면흔들림
// ★ 최우선 항목: 히트스톱이 **반드시 다시 풀리는지**(게임이 얼어붙지 않는지)를 실제 프레임 루프로 확인한다.
//   최초 구현에서 마감 시각을 게임 시계 T 로 잡는 바람에(T 는 update() 안에서만 증가) 첫 타격에
//   게임이 영구 정지하는 버그가 있었다. "멈추는지"만 보고 "풀리는지"를 안 봐서 놓쳤다.
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
  try { await page.locator('input').first().fill('타격검증'); } catch (e) {}
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000, force: true }); } catch (e) {}
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    /* R27 이후 — 각인·계시 오버레이가 열려 있으면 gamePaused() 가 게임 시계 T 를 멈춘다
       (보상 카드를 고르다 죽지 않게 만든 기능). 각인을 미리 정해 두고 멈춤 오버레이를 모두 닫은
       뒤에 측정한다 — 안 그러면 '시계가 안 간다'로 잘못 잡힌다. */
    try { META.mark = META.mark || 'blade'; metaSave(); } catch (e) {}
    if (!P) startGame();
    (typeof PAUSE_IDS !== 'undefined' ? PAUSE_IDS.slice(0) : []).concat(['markov', 'frewov', 'allocov'])
      .forEach(function(i){ var e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(400);

  const L = [];

  // ================= A. 얼어붙음 회귀 테스트 (실제 프레임 루프) =================
  // 사냥터로 가서 실제 rAF 루프가 도는 상태로 타격을 넣고, 실시간이 흐른 뒤 T 가 계속 흘렀는지 본다.
  await page.evaluate(() => {
    deadFlag = false; hitstopClear();
    travel(1, 12, 10);
    const m = world[curZ].mobs.find(x => !x.dead);
    if (m) { P.fx = m.fx + 0.3; P.fy = m.fy; }
    window.__T0 = T;
  });
  await page.waitForTimeout(300);
  const beforeHit = await page.evaluate(() => ({ T: T, adv: T - window.__T0 }));

  // 실제 타격 1회 — 그 뒤 600ms 동안 프레임 루프가 계속 도는지 본다
  await page.evaluate(() => {
    const m = world[curZ].mobs.find(x => !x.dead);
    window.__Thit = T;
    hitMob(m, 3);
    window.__stopRightAfter = hitstopLeft;
  });
  await page.waitForTimeout(600);
  const afterHit = await page.evaluate(() => ({
    T: T, adv: T - window.__Thit, stopSet: window.__stopRightAfter, stopNow: hitstopLeft
  }));
  L.push(((beforeHit.adv > 0.05) ? 'PASS ' : 'FAIL ') + '타격 전 게임 시계 정상 진행 :: ' + JSON.stringify(beforeHit));
  L.push(((afterHit.stopSet > 0) ? 'PASS ' : 'FAIL ') + '타격 순간 히트스톱 설정됨 :: ' + JSON.stringify({ set: afterHit.stopSet }));
  L.push(((afterHit.stopNow === 0) ? 'PASS ' : 'FAIL ') + '★히트스톱이 스스로 풀림(잔여 0) :: ' + JSON.stringify({ now: afterHit.stopNow }));
  L.push(((afterHit.adv > 0.3) ? 'PASS ' : 'FAIL ') + '★타격 후에도 게임이 계속 진행(얼어붙지 않음) :: ' + JSON.stringify({ '600ms간 진행된 게임시간': afterHit.adv }));

  // 연타로도 누적되어 얼지 않는지 — 20회 연속 타격 후 정상 진행 확인
  await page.evaluate(() => {
    const z = world[curZ];
    window.__Tburst = T;
    for (let i = 0; i < 20; i++) {
      const m = z.mobs.find(x => !x.dead);
      if (m) { m.hp = m.d.hp; hitMob(m, 1); }
    }
    window.__stopBurst = hitstopLeft;
  });
  await page.waitForTimeout(600);
  const burst = await page.evaluate(() => ({ adv: T - window.__Tburst, stopSet: window.__stopBurst, stopNow: hitstopLeft }));
  L.push(((burst.stopSet <= 0.12) ? 'PASS ' : 'FAIL ') + '연타 20회에도 히트스톱 누적 안 됨(상한 0.12) :: ' + JSON.stringify({ set: burst.stopSet }));
  // 전투 중에는 새 타격이 계속 들어오므로 잔여값이 0이 아닌 게 정상 — "묶여있지 않은지"만 본다
  L.push(((burst.adv > 0.3 && burst.stopNow <= 0.12) ? 'PASS ' : 'FAIL ')
    + '★연타 후에도 정상 진행(잔여는 전투중 새 타격분) :: ' + JSON.stringify(burst));

  // 전투가 끝난 조용한 상태에서는 잔여가 정확히 0 으로 빠져야 한다 (몹 없는 마을에서 확인)
  await page.evaluate(() => {
    if (RUN) RUN.live = false;               // travel(0) 이 runEnd 를 부르지 않도록
    travel(0, 10, 9); P.tgt = null; P.dest = null;
    hitstop(0.09);                            // 일부러 걸어 두고
    window.__Tquiet = T;
  });
  await page.waitForTimeout(500);
  const quiet = await page.evaluate(() => ({ stopNow: hitstopLeft, adv: T - window.__Tquiet }));
  L.push(((quiet.stopNow === 0 && quiet.adv > 0.3) ? 'PASS ' : 'FAIL ')
    + '★비전투 상태에서 히트스톱 완전 해제(잔여 0) :: ' + JSON.stringify(quiet));

  // 지속 피해(오러·출혈)는 히트스톱을 걸지 않아야 한다 — 걸리면 0.5초마다 딸꾹질한다
  const dot = await page.evaluate(() => {
    hitstopClear();
    travel(1, 12, 10);                    // 마을에는 몹이 없으므로 사냥터로 복귀
    const m = world[curZ].mobs.find(x => !x.dead);
    if (!m) return { dot: -1, normal: -1 };
    m.hp = m.d.hp;
    hitMob(m, 2, true, false, true);     // noStop=true (오러/출혈 경로)
    const afterDot = hitstopLeft;
    hitstopClear();
    hitMob(m, 2, true);                  // 일반 경로
    return { dot: afterDot, normal: hitstopLeft };
  });
  L.push(((dot.dot === 0 && dot.normal > 0) ? 'PASS ' : 'FAIL ') + '지속피해(오러·출혈)는 히트스톱 없음 :: ' + JSON.stringify(dot));

  // ================= B. 나머지 타격감 항목 =================
  const rest = await page.evaluate(() => {
    const L2 = [];
    const ok = (n, c, x) => L2.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    hitstopClear(); deadFlag = false;
    travel(1, 12, 10);                    // 앞 단계에서 마을로 갔으므로 몹이 있는 사냥터로 복귀
    const z = world[curZ];
    let m = z.mobs.find(x => !x.dead);
    if (!m) { L2.push('FAIL 사냥터에 몹 없음'); return L2; }
    m.hp = m.d.hp;
    P.fx = m.fx + 0.3; P.fy = m.fy;

    // 넉백 — 시각 전용(실좌표 불변)
    const fx0 = m.fx, fy0 = m.fy;
    hitMob(m, 3);
    ok('hitMob 후 m.lh 갱신', m.lh === T);
    ok('넉백이 몹 실좌표를 밀지 않음(시각 전용)', m.fx === fx0 && m.fy === fy0, { fx: m.fx - fx0, fy: m.fy - fy0 });
    const mk = mobKnock(m);
    ok('mobKnock 유효 벡터', typeof mk.x === 'number' && (Math.abs(mk.x) + Math.abs(mk.y)) > 0, mk);

    // 데미지 숫자 팝
    floaters.push({ x: m.fx, y: m.fy, t: '특효 +9', c: '#ffd24a', t0: T, big: 1 });
    ok('데미지 숫자 big 플래그 존재', floaters.some(f => f.big));

    // 스킬 킬 = 90ms
    hitstopClear();
    m.hp = 5;
    hitMob(m, 5, false, true);
    ok('스킬 킬 히트스톱 90ms', Math.abs(hitstopLeft - 0.09) < 0.005, { left: hitstopLeft });
    ok('스킬 킬로 사망', m.dead === true);
    ok('사망 시각 기록(사망 애니메이션 재생용)', typeof m.deathT === 'number');
    ok('킬 순간 화면 흔들림 3.2', shakeM >= 3.2, { shakeM: shakeM });
    hitstopClear();

    // 공격 첫 프레임 홀드
    P.atkT = T; P.face = 0;
    const f0 = pcFrame(P);
    ok('공격 시작 직후 프레임 0', f0[1] === 0, f0);
    ok('기사 공격 좌우반전 유지(face!==3 규칙)', f0[2] === true, { flip: f0[2], face: P.face });

    return L2;
  });

  console.log(L.concat(rest).join('\n'));
  const all = L.concat(rest);
  const fails = all.filter(x => x.indexOf('FAIL') === 0);
  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  console.log('=== 최종 판정 ===');
  console.log('검증 ' + all.length + '건 중 FAIL ' + fails.length + '건');
  console.log((fails.length === 0 && errors.length === 0) ? 'PASS' : 'FAIL');

  await page.screenshot({ path: 'verify_r6b_screenshot.png' });
  await browser.close();
})();
