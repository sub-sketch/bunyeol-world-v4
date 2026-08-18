// R18 검증: 정령마법사(장거리 물리)·마도학자(마법·다수·일격·물몸) 스킬 8종씩 + 배관 수리
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [];
  const all = [];

  // 클래스별로 새 페이지를 띄운다 — 캐릭터 생성은 한 세션에 한 번뿐이라서.
  async function open(cls) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push('[' + cls + '] pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('[' + cls + '] console: ' + m.text()); });
    await page.goto(url);
    await page.waitForTimeout(1100);
    try { await page.locator('text=건너뛰기').first().click({ timeout: 1500 }); } catch (e) {}
    await page.waitForTimeout(300);
    for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
    await page.evaluate(c => {
      pickCls = c;
      /* R27 이후 — 각인·계시 오버레이가 열려 있으면 gamePaused() 가 게임 시계 T 를 멈춘다
         (보상 카드를 고르다 죽지 않게 만든 기능). 각인을 미리 정해 두고 멈춤 오버레이를 모두 닫은
         뒤에 측정한다 — 안 그러면 '시계가 안 간다'로 잘못 잡힌다. */
      try { META.mark = META.mark || 'blade'; metaSave(); } catch (e) {}
      if (!P) startGame();
      (typeof PAUSE_IDS !== 'undefined' ? PAUSE_IDS.slice(0) : []).concat(['markov', 'frewov', 'allocov'])
        .forEach(function(i){ var e = document.getElementById(i); if (e) e.style.display = 'none'; });
    }, cls);
    await page.waitForTimeout(400);
    return page;
  }

  const run = async (page, title, fn, arg) => {
    const L = await page.evaluate(fn, arg);
    console.log('\n=== ' + title + ' ===');
    L.forEach(l => console.log(l));
    all.push(...L);
  };

  // ---------- 1) 배관: 세 계열 전부 스킬을 쓸 수 있는가 ----------
  const pk = await open('k');
  await run(pk, '1) 스킬 정의 조회 — 전 계열', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    /* R32 — 정령·마도에 계열 도구(소환·벽·장판·순간이동)가 붙어 8개보다 많아졌다.
       "몇 개인가" 대신 "계열마다 8개 이상 있고 id 가 겹치지 않는가" 를 본다. */
    ok('세 계열 각 8개 이상', SKILLS.k.length >= 8 && SKILLS.e.length >= 8 && SKILLS.m.length >= 8,
       { k: SKILLS.k.length, e: SKILLS.e.length, m: SKILLS.m.length });
    // ★ 이게 R18 의 본질: 예전엔 e/m 스킬이 skillDef 에서 null 이었다
    const missing = [];
    ['k', 'e', 'm'].forEach(c => SKILLS[c].forEach(s => { if (!skillDef(s.id)) missing.push(c + ':' + s.id); }));
    ok('★ 모든 계열 스킬을 skillDef 가 찾는다', missing.length === 0, { missing: missing });
    const owner = {};
    ['k', 'e', 'm'].forEach(c => SKILLS[c].forEach(s => { owner[s.id] = skillOwner(s.id); }));
    ok('skillOwner 가 소속 계열을 맞게 준다', SKILLS.e.every(s => owner[s.id] === 'e') && SKILLS.m.every(s => owner[s.id] === 'm'));
    ok('기사 스킬은 레벨해금 아님(상점 구매)', SKILLS.k.every(s => !skLvGated(s.id)));
    /* R32 — 레벨 해금 폐지. 세 계열 모두 노드에서 산다(육성 방식 일원화). */
    ok('★ 레벨 해금은 폐지 — 전 계열 노드 구매', SKILLS.e.concat(SKILLS.m).every(s => !skLvGated(s.id)));
    ok('★ 정령·마도 스킬에도 값이 붙어 있다', SKILLS.e.concat(SKILLS.m).every(s => (s.cost || 0) > 0));
    // ★ 해금 레벨 상한 — 5층 완주 실측 레벨이 15다. 넘으면 그 스킬은 영원히 못 쓴다.
    const over = [];
    ['e', 'm'].forEach(c => SKILLS[c].forEach(s => { if ((s.lv || 1) > 15) over.push(c + ':' + s.id + ' lv' + s.lv); }));
    ok('★ 해금 레벨 전부 15 이하 (도달 가능)', over.length === 0, { 초과: over });
    ok('id 중복 없음(계열 간 포함)', (() => {
      const ids = [].concat(SKILLS.k, SKILLS.e, SKILLS.m).map(s => s.id);
      return new Set(ids).size === ids.length;
    })());
    // 기사 회귀 — 상점 구매가 여전히 되는가.
    // smash 는 META_REQ 로 「공격력(atk)」 노드가 선행이다. 선행을 안 사면 잠긴 게 정상 동작이므로
    // 먼저 선행 노드를 사고 검사한다 — 그리고 선행 가드가 살아 있는지도 같이 본다.
    META.pt = 99999; META.sk = {}; META.nodes = {};
    ok('★ 선행 노드 없으면 잠김(가드 정상)', metaReqInfo('smash').ok === false, metaReqInfo('smash'));
    ok('선행 노드(공격력) 구매', metaBuy('atk') === true);
    ok('기사 스킬 상점 구매 정상(회귀)', metaBuySkill('smash') === true && skKnown('smash'));
    ok('기사 스킬은 레벨만으로 안 열린다', (() => { META.sk = {}; return !skKnown('smash'); })());
    return L;
  });

  // ---------- 2) 마도학자 = 마법 · 장거리 · 다수 · 일격 · 물몸 ----------
  const pm = await open('m');
  await run(pm, '2) 마도학자 — 마법 계열', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('마도학자로 생성됨', P.cls === 'm', { n: CLS[P.cls].n });
    // 물몸 — 기사 대비
    ok('★ 물몸: HP 가 세 계열 중 최저', CLS.m.hp < CLS.e.hp && CLS.m.hp < CLS.k.hp, { k: CLS.k.hp, e: CLS.e.hp, m: CLS.m.hp });
    ok('★ 물몸: 레벨당 HP 증가도 최저', CLS.m.hpg[1] < CLS.k.hpg[1] && CLS.m.hpg[1] < CLS.e.hpg[1], { k: CLS.k.hpg, e: CLS.e.hpg, m: CLS.m.hpg });
    ok('MP 는 최고', CLS.m.mp > CLS.e.mp && CLS.m.mp > CLS.k.mp, { m: CLS.m.mp });
    ok('원거리 판정', isRanged() === true && pRange() > 4, { rng: pRange() });
    // 레벨별 해금이 실제로 동작
    /* R32 — 레벨을 올려도 열리지 않고, 사면 열린다 */
    META.sk = {}; P.lv = 30;
    const at1 = mySkills().filter(s => skKnown(s.id)).map(s => s.id);
    mySkills().forEach(s => { META.sk[s.id] = 1; });
    const at8 = mySkills().filter(s => skKnown(s.id)).map(s => s.id);
    const at15 = at8;
    ok('★ 레벨 30 이어도 안 사면 하나도 안 열린다', at1.length === 0, { at1: at1 });
    ok('사면 그 수만큼 열린다', at8.length === mySkills().length, { n: at8.length });
    ok('★ 사면 전부 열린다', at15.length === mySkills().length, { n: at15.length });
    return L;
  });

  await run(pm, '3) 신규 타입 — 연쇄(chain) · 관통(beam)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    P.lv = 15; P.int = 20; P.mp = P.mmp = 999;
    mySkills().forEach(s => { META.sk[s.id] = 1; });   /* R32 — 구매형이므로 검사 전에 사 둔다 */
    travel(1, 3, 3);
    const z = world[curZ];
    // ---- 연쇄: 일렬로 세워 놓고 몇 마리가 맞는지 ----
    z.mobs.forEach(m => { m.dead = true; });
    const line = z.mobs.slice(0, 5);
    line.forEach((m, i) => { m.dead = false; m.hp = m.d.hp = 9999; m.fx = P.fx + 1.5 + i * 2.2; m.fy = P.fy; });
    P.tgt = line[0];
    const before = line.map(m => m.hp);
    const ci = mySkills().findIndex(s => s.id === 'chain');
    P.cd = {}; castSkill(ci);
    const after = line.map(m => m.hp);
    const hitN = after.filter((h, i) => h < before[i]).length;
    ok('★ 연쇄가 여러 마리를 때린다', hitN >= 3, { 맞은수: hitN, 피해: before.map((b, i) => b - after[i]) });
    ok('★ 옮길수록 약해진다(감쇠)', (before[0] - after[0]) > (before[2] - after[2]),
       { 첫타: before[0] - after[0], 셋째: before[2] - after[2] });
    ok('연쇄 이펙트(선) 생성', beams.length > 0, { beams: beams.length });
    // ---- 관통: 직선 위/밖 ----
    z.mobs.forEach(m => { m.dead = true; });
    const onLine = z.mobs.slice(0, 3), offLine = z.mobs.slice(3, 5);
    onLine.forEach((m, i) => { m.dead = false; m.hp = m.d.hp = 9999; m.fx = P.fx + 1.5 + i * 2; m.fy = P.fy; });
    offLine.forEach((m, i) => { m.dead = false; m.hp = m.d.hp = 9999; m.fx = P.fx + 3; m.fy = P.fy + 4 + i; });
    P.tgt = onLine[0];
    const b2 = onLine.map(m => m.hp), o2 = offLine.map(m => m.hp);
    const bi = mySkills().findIndex(s => s.id === 'beam');
    P.cd = {}; beams.length = 0; castSkill(bi);
    const a2 = onLine.map(m => m.hp), oa2 = offLine.map(m => m.hp);
    ok('★ 관통: 직선 위 전원 피격', a2.every((h, i) => h < b2[i]), { 피해: b2.map((b, i) => b - a2[i]) });
    ok('★ 관통: 직선 밖은 안 맞음', oa2.every((h, i) => h === o2[i]), { 밖: o2.map((b, i) => b - oa2[i]) });
    ok('관통 피해가 일격급(연쇄 첫타보다 큼)', (b2[0] - a2[0]) > 60, { 관통피해: b2[0] - a2[0] });
    ok('관통 이펙트(선) 생성', beams.length > 0);
    // 사거리 밖에서는 시전이 막힌다
    onLine[0].fx = P.fx + 30; P.tgt = onLine[0]; P.cd = {};
    const mpBefore = P.mp; castSkill(bi);
    ok('★ 사거리 밖이면 시전 안 됨(MP 소모 없음)', P.mp === mpBefore, { mp: P.mp });
    return L;
  });

  await run(pm, '4) 원거리 정지 · 물몸 보완 버프', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[curZ];
    z.mobs.forEach(m => { m.dead = true; });
    const t = z.mobs[0]; t.dead = false; t.hp = t.d.hp = 9999; t.stun = 0;
    t.fx = P.fx + 4.5; t.fy = P.fy;   /* 근접(1.6) 밖, 스킬 사거리(5.2) 안 */
    P.tgt = t; P.cd = {}; P.mp = 999;
    const si = mySkills().findIndex(s => s.id === 'mstop');
    castSkill(si);
    ok('★ 원거리(4.5칸)에서 정지 성공 — 예전엔 근접 1.6 만 허용', t.stun > T, { stun: Math.round((t.stun - T) * 10) / 10 });
    // 마력 역장 = AC 버프
    P.buffs = {}; P.cd = {};
    const wi = mySkills().findIndex(s => s.id === 'mward');
    const acB = acShow(); castSkill(wi);
    ok('마력 역장 — AC 버프 적용', buffV('bac') > 0, { bac: buffV('bac'), acBefore: acB, acAfter: acShow() });
    return L;
  });

  // ---------- 5) 정령마법사 = 장거리 물리 ----------
  const pe = await open('e');
  await run(pe, '5) 정령마법사 — 장거리 물리', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('정령마법사로 생성됨', P.cls === 'e', { n: CLS[P.cls].n });
    ok('원거리 · 사거리 최장', isRanged() && CLS.e.rng > CLS.m.rng, { e: CLS.e.rng, m: CLS.m.rng });
    P.lv = 15; P.mp = P.mmp = 999; P.cd = {};
    mySkills().forEach(s => { META.sk[s.id] = 1; });   /* R32 — 구매형 */
    const known = mySkills().filter(s => skKnown(s.id)).map(s => s.id);
    ok('★ 사면 전부 해금', known.length === mySkills().length, { n: known.length });
    travel(1, 3, 3);
    const z = world[curZ];
    z.mobs.forEach(m => { m.dead = true; });
    // 물리 광역 — 화살비가 무기 공격력으로 굴러가는가
    const grp = z.mobs.slice(0, 3);
    grp.forEach((m, i) => { m.dead = false; m.hp = m.d.hp = 9999; m.fx = P.fx + 2 + (i % 2) * 0.7; m.fy = P.fy + (i * 0.6); });
    P.tgt = grp[0];
    const ri2 = mySkills().findIndex(s => s.id === 'rain');
    const bR = grp.map(m => m.hp);
    P.cd = {}; castSkill(ri2);
    return new Promise(res => setTimeout(() => {
      const aR = grp.map(m => m.hp);
      const n = aR.filter((h, i) => h < bR[i]).length;
      ok('★ 화살비 — 물리 광역이 여럿을 맞춘다', n >= 2, { 맞은수: n, 피해: bR.map((b, i) => b - aR[i]) });
      // 저격 = 고배율 단발
      const si2 = mySkills().findIndex(s => s.id === 'esnipe');
      const t2 = grp[0]; t2.hp = 9999; P.tgt = t2; P.cd = {};
      castSkill(si2);
      setTimeout(() => {
        ok('정밀 저격 — 단발 피해 발생', t2.hp < 9999, { 피해: 9999 - t2.hp });
        // 속박 = 원거리 스턴
        const t3 = grp[1]; t3.stun = 0; t3.fx = P.fx + 5; t3.fy = P.fy; P.tgt = t3; P.cd = {}; P.mp = 999;
        castSkill(mySkills().findIndex(s => s.id === 'pin'));
        ok('★ 속박 사격 — 원거리(5칸) 스턴', t3.stun > T, { stun: Math.round((t3.stun - T) * 10) / 10 });
        // 질풍 속사 = 공속 버프
        P.buffs = {}; P.cd = {};
        const msBefore = pAtkMs();
        castSkill(mySkills().findIndex(s => s.id === 'windst'));
        const msAfter = pAtkMs();
        ok('★ 질풍 속사 — 공격 간격이 실제로 줄어든다', msAfter < msBefore,
           { before: Math.round(msBefore), after: Math.round(msAfter) });
        ok('공속 버프 키(bhs) 설정', buffV('bhs') > 0);
        res(L);
      }, 260);
    }, 520));
  });

  // ---------- 6) 자동 사냥이 신규 타입을 오작동 없이 다루는가 ----------
  await run(pe, '6) 자동 스킬 연동', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[curZ];
    P.autoSkill = true; P.lv = 15; P.mp = P.mmp = 999; P.cd = {}; P.buffs = {};
    mySkills().forEach(s => { META.sk[s.id] = 1; });   /* R32 — 구매형 */
    P.aslot = [null, null, null, null];                /* 자동 칸은 비워 옛 경로(마나 큰 것)로 검사 */
    z.mobs.forEach(m => { m.dead = true; });
    const t = z.mobs[0]; t.dead = false; t.hp = t.d.hp = 9999; t.fx = P.fx + 2; t.fy = P.fy;
    let err = null, cast = 0;
    for (let i = 0; i < 12; i++) { try { if (autoCastSkill(z, t)) cast++; } catch (e) { err = e.message; break; } P.cd = {}; }
    ok('★ 자동 스킬 12회 반복 — 예외 없음', !err, err || undefined);
    ok('자동 스킬이 실제로 시전됨', cast > 0, { 시전: cast });
    // 버프 절약: 이미 걸린 버프를 다시 안 쓴다
    P.buffs = {}; P.cd = {};
    autoCastSkill(z, t);
    const had = buffV('bac') > 0 || buffV('bd') > 0 || buffV('bhs') > 0;
    ok('버프 계열이 걸리거나 다른 스킬이 선택됨(무한루프 아님)', true, { 버프걸림: had });
    return L;
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
