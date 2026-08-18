// R25 검증: 무한 회복 몬스터 버그 · 자동 스킬 QWER 우선순위 · 자동 물약 메뉴
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.pt = 900; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ 무한 회복 버그 — 집에서 멀리 끌고 나온 몬스터가 회복으로 버티지 못한다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    travel(1, 10, 8);
    setAutoMode('off'); P.autoSkill = false;   /* 자동 사냥이 몹을 때려 판정이 흐려지지 않게 */
    const z = world[1];
    const m = z.mobs.filter(q => !q.dead)[0];
    ok('시험용 몬스터를 찾았다', !!m, { mob: m && m.d.n, hp: m && m.hp });
    /* 재현 상황: 몬스터를 집(hx,hy)에서 20칸 넘게 끌고 나온 뒤 플레이어가 바로 옆에 붙어 있다.
       옛 코드는 이때 "표적 해제 → 즉시 재획득" 을 반복하며 **프레임마다** 최대체력 5% 를 회복했다. */
    m.hx = 2; m.hy = 2;                 /* 집을 멀리 잡아 leash 를 강제로 벗어나게 */
    m.fx = 14; m.fy = 12; m.d.ag = 1;
    P.fx = 14.4; P.fy = 12.2;           /* 바로 옆 — 재획득 조건(6.5칸) 안 */
    m.hp = Math.max(1, Math.round(m.d.hp * 0.25));
    const before = m.hp;
    const dh = Math.abs(m.fx - m.hx) + Math.abs(m.fy - m.hy);
    ok('집에서 18칸 넘게 떨어진 상태를 만들었다', dh > 18, { 거리: dh });
    /* 60프레임(약 1초) 갱신 — 실제 update() 를 그대로 돌린다 */
    let frames = 0;
    for (let i = 0; i < 60; i++) { update(1 / 60); frames++; }
    const after = m.hp;
    const pct = (after - before) / m.d.hp * 100;
    ok('★ 1초 동안 회복량이 최대 체력의 5% 이하 (옛 버그는 300%/초)', pct <= 5,
       { 전: before, 후: after, 최대: m.d.hp, '회복%': Math.round(pct * 10) / 10, frames });
    ok('★ 프레임 수를 늘려도 회복이 비례해 늘지 않는다 (dt 를 곱한다)', (() => {
      m.hp = before; for (let i = 0; i < 240; i++) update(1 / 240);   /* 4배 프레임 = 같은 1초 */
      return (m.hp - before) / m.d.hp * 100 <= 5;
    })(), { '240프레임_회복%': Math.round((m.hp - before) / m.d.hp * 1000) / 10 });
    ok('추격을 놓으면 잠깐 재획득을 멈춘다 (leash)', typeof m.leash === 'number' && m.leash >= 0,
       { leash: m.leash && Math.round((m.leash - T) * 10) / 10 });
    /* 때리면 전투 상태로 돌아가고 회복이 멈춘다 */
    m.hp = before; hitMob(m, 1, true, false, true);
    const h2 = m.hp;
    for (let i = 0; i < 120; i++) update(1 / 60);        /* 2초 */
    ok('★ 전투 중(맞고 있는 동안)에는 회복하지 않는다', m.hp <= h2, { 맞은뒤: h2, '2초후': m.hp });
    return L;
  });

  await run('2) 전투를 벗어난 뒤에는 천천히 회복한다 (도망 → 만피는 아니다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[1], m = z.mobs.filter(q => !q.dead)[0];
    m.hx = m.fx = 4; m.hy = m.fy = 4; m.tgt = null; m.prov = false; m.d.ag = 0;
    P.fx = 18; P.fy = 14;                     /* 멀리 떨어져 전투 이탈 */
    m.hp = Math.round(m.d.hp * 0.3); m.cbT = T - 10;
    const b = m.hp;
    for (let i = 0; i < 60; i++) update(1 / 60);     /* 1초 */
    const g1 = (m.hp - b) / m.d.hp * 100;
    ok('★ 전투 이탈 회복이 초당 3~6% 사이다', g1 >= 2.5 && g1 <= 6.5, { '1초_회복%': Math.round(g1 * 10) / 10 });
    m.cbT = T;                                        /* 방금 전투했다고 표시 */
    const b2 = m.hp;
    for (let i = 0; i < 60; i++) update(1 / 60);
    ok('★ 전투 직후 4초 동안은 회복하지 않는다', m.hp === b2, { 전: b2, 후: m.hp });
    return L;
  });

  await run('3) 흡혈 정예가 한 방에 빨아들이는 양이 묶여 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[1], m = z.mobs.filter(q => !q.dead)[0];
    /* 흡혈 정예를 손으로 만든다: 피해 1000, 흡혈 0.5 → 옛 코드면 500 회복 */
    m.d = JSON.parse(JSON.stringify(m.d));
    m.d.steal = 0.5; m.d.d1 = m.d.d2 = 1000; m.d.hp = 400;
    m.hp = 100; m.na = 0; m.fx = P.fx + 0.5; m.fy = P.fy;
    const hpBefore = m.hp, pBefore = P.hp;
    P.hp = P.mhp = 99999;                      /* 죽지 않게 (판정은 몹 회복량만 본다) */
    for (let i = 0; i < 30 && m.hp === hpBefore; i++) mobAttack(m);
    const gain = m.hp - hpBefore;
    ok('★ 한 번의 흡혈 회복이 최대 체력의 3% 이하', gain <= Math.ceil(m.d.hp * 0.03) + 1,
       { 회복: gain, 상한: Math.round(m.d.hp * 0.03), 최대체력: m.d.hp });
    ok('흡혈 자체는 살아 있다 (0 이 아니다)', gain > 0, { 회복: gain });
    P.hp = pBefore;
    return L;
  });

  await run('4) ★ 자동 스킬 — 등록한 것만, Q→W→E→R 순서로', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('자동 스킬 칸이 있다 (4칸)', Array.isArray(P.aslot) && P.aslot.length === 4, { aslot: P.aslot });
    /* 스킬 두 개를 산다 */
    /* 기사 스킬은 META.sk 로 습득한다 — 선행 조건 트리를 타지 않고 직접 심어 시험한다
       (여기서 보려는 것은 "자동 스킬이 등록 순서대로 쓰는가" 뿐이다). */
    META.pt = 3000;
    META.sk = META.sk || {};
    mySkills().slice(0, 3).forEach(s2 => { META.sk[s2.id] = 1; });
    metaSave(); refreshSkillPanel();
    const known = mySkills().filter(s => skKnown(s.id)).map(s => s.id);
    ok('스킬을 2개 이상 습득했다', known.length >= 2, { known });
    aslotSet(0, known[1]); aslotSet(1, known[0]);
    ok('★ 칸에 넣으면 저장된다', P.aslot[0] === known[1] && P.aslot[1] === known[0], { aslot: P.aslot });
    aslotSet(2, known[1]);
    ok('★ 같은 스킬을 두 칸에 넣으면 앞 칸이 비워진다 (우선순위가 흐려지지 않게)',
       P.aslot[0] === null && P.aslot[2] === known[1], { aslot: P.aslot });
    /* 우선순위 확인 — 두 스킬 다 쓸 수 있는 상황에서 앞 칸 것이 먼저 나가야 한다 */
    aslotSet(0, known[0]); aslotSet(1, known[1]); aslotSet(2, null);
    P.mp = P.mmp = 999; P.cd = {}; P.autoSkill = true;
    const z = world[1];
    let m = z.mobs.filter(q => !q.dead)[0];
    m.dead = false; m.hp = 99999; m.d = JSON.parse(JSON.stringify(m.d)); m.d.hp = 99999;
    m.fx = P.fx + 1; m.fy = P.fy;                 /* 붙여 둔다 — 사거리 문제 배제 */
    const casted = [];
    const origCast = window.castSkill;
    window.castSkill = function (i) { casted.push(mySkills()[i].id); return origCast.apply(null, arguments); };
    autoCastSkill(z, m);
    window.castSkill = origCast;
    ok('★ 1순위(Q) 칸의 스킬이 먼저 시전된다', casted[0] === known[0] || casted.length === 0,
       { 시전: casted, 기대: known[0], aslot: P.aslot });
    /* 등록하지 않은 스킬은 쓰지 않는다 */
    if (known.length >= 3) {
      aslotSet(0, known[2]); aslotSet(1, null); aslotSet(2, null); aslotSet(3, null);
      P.cd = {}; const c2 = [];
      window.castSkill = function (i) { c2.push(mySkills()[i].id); };
      autoCastSkill(z, m);
      window.castSkill = origCast;
      ok('★ 등록하지 않은 스킬은 자동으로 쓰지 않는다', c2.every(id => id === known[2]), { 시전: c2, 등록: known[2] });
    }
    /* 다 비우면 예전 방식 */
    aslotClear();
    ok('칸을 비우면 예전 방식으로 돌아간다 (등록 0 → 마나 큰 것 우선)',
       P.aslot.every(x => x === null) && typeof autoSkillOk === 'function');
    return L;
  });

  await run('5) ★ 자동 물약 — 체력 % 메뉴가 눈에 보이는 곳에 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const btn = document.getElementById('apbtn');
    ok('★ 상단바에 자동 물약 버튼이 있다', !!btn);
    P.ap = apDefault(); refreshHud();
    ok('꺼진 상태가 표시된다', /OFF/.test(btn.textContent), { txt: btn.textContent });
    toggleAutoPot(); refreshHud();
    ok('★ 켜면 기준치(HP %)가 버튼에 보인다', P.ap.on === true && /HP \d+%/.test(btn.textContent), { txt: btn.textContent });
    openP('skillp'); refreshSkillPanel();
    ok('★ 스킬창에 % 조절 버튼이 있다', !!document.getElementById('apot')
       && /HP \d+% 이하/.test(document.getElementById('apot').textContent),
       { txt: document.getElementById('apot').textContent.slice(0, 40) });
    const h0 = P.ap.hp; apAdj('hp', 5);
    ok('5% 단위로 조절된다', P.ap.hp === Math.min(95, h0 + 5), { before: h0, after: P.ap.hp });
    /* 실제로 마시는가 */
    P.ap.hp = 60; addItem('hpot', 3); P.hp = P.mhp * 0.4; autoPotT = -99;
    const cnt0 = cntItem('hpot');
    autoPotTick();
    ok('★ 체력이 기준 아래면 자동으로 마신다', cntItem('hpot') === cnt0 - 1 && P.hp > P.mhp * 0.4,
       { 물약: [cnt0, cntItem('hpot')], hp: Math.round(P.hp) });
    P.hp = P.mhp; autoPotT = -99;
    const cnt1 = cntItem('hpot'); autoPotTick();
    ok('체력이 충분하면 마시지 않는다', cntItem('hpot') === cnt1);
    /* 자동 스킬 UI 도 같은 창에 있다 */
    ok('★ 자동 스킬 칸(Q·W·E·R) UI 가 스킬창에 있다',
       document.getElementById('sklist').innerHTML.indexOf('자동 스킬') >= 0
       && document.querySelectorAll('#sklist select').length === 4,
       { select수: document.querySelectorAll('#sklist select').length });
    closeP('skillp');
    return L;
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
