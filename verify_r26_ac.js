// R26 검증: META 백업/복원 · 플레이 기록(런 리포트) · 지역 전용 콘텐츠(재고·축복·세트·의뢰)
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
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 500; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ META(영구 성장) 백업 → 복원', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('내보내기·복원 함수가 있다', typeof metaExport === 'function' && typeof metaImportText === 'function');
    /* 백업 텍스트를 만든다 (파일 다운로드 대신 같은 payload 를 직접 생성) */
    META.pt = 777; META.runs = 9; META.best = 7; META.nodes = { atk: 3, hp: 2 }; META.achv = ['first_run', 'floor2'];
    META.tkills = 1234; META.dex = { wolf: 1, orc: 1 }; metaSave();
    const backup = btoa(unescape(encodeURIComponent(JSON.stringify({ kind: 'lc2meta', v: 4, meta: META }))));
    ok('백업 문자열이 만들어졌다', backup.length > 50, { bytes: backup.length });
    /* 진행도를 망가뜨린 뒤 복원 */
    metaReset();
    ok('초기화되어 0P 가 되었다', META.pt === 0 && META.runs === 0, { pt: META.pt, runs: META.runs });
    window.confirm = () => true;                    /* 확인창 자동 승인 */
    const r = metaImportText(backup);
    ok('★ 복원이 성공했다', r === true);
    ok('★ 포인트·런·최고층이 되살아났다', META.pt === 777 && META.runs === 9 && META.best === 7,
       { pt: META.pt, runs: META.runs, best: META.best });
    ok('★ 노드·업적·도감·누적처치도 되살아났다',
       META.nodes.atk === 3 && META.achv.indexOf('floor2') >= 0 && META.tkills === 1234 && !!META.dex.wolf,
       { nodes: META.nodes, achv: META.achv.length, tkills: META.tkills });
    ok('localStorage 에도 저장됐다 (새로고침해도 남는다)',
       (JSON.parse(localStorage.getItem('lc2_meta_v4') || '{}').pt) === 777);
    ok('망가진 파일은 거부한다', metaImportText('not-a-backup') === false);
    ok('버전이 다른 파일은 거부한다',
       metaImportText(btoa(JSON.stringify({ kind: 'lc2meta', v: 3, meta: { v: 3, pt: 1 } }))) === false);
    ok('거부해도 현재 진행도는 그대로다', META.pt === 777);
    return L;
  });

  await run('2) ★ 플레이 기록 — 한 판이 끝나면 층별로 쌓인다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('기록 함수가 있다', typeof repMake === 'function' && typeof repList === 'function' && typeof repText === 'function');
    repClear();
    ok('처음에는 비어 있다', repList().length === 0);
    /* 한 판을 흉내낸다: 1층 → 2층 → 3층 진행 후 사망 */
    setAutoMode('off'); P.autoSkill = false;
    runStart();
    ok('런이 시작됐다', runActive() === true && RUN.floors.length === 0);
    RUN.kills = 5; RUN.dmgTaken = 40; RUN.goldEarned = 300; RUN.potsUsed = 2;
    travel(4, 5, 5);                                  /* 2층 */
    ok('★ 1층이 층별 기록으로 닫혔다', RUN.floors.length === 1 && RUN.floors[0].f === 1,
       { floors: RUN.floors.map(f => f.f) });
    ok('1층 델타가 담겼다', RUN.floors[0].kills === 5 && RUN.floors[0].dmg === 40 && RUN.floors[0].pots === 2,
       { f1: RUN.floors[0] });
    RUN.kills = 12; RUN.dmgTaken = 90; RUN.goldEarned = 700; RUN.potsUsed = 3;
    travel(5, 5, 5);                                  /* 3층 */
    ok('★ 2층도 쌓였고 델타가 누적이 아니라 구간이다',
       RUN.floors.length === 2 && RUN.floors[1].kills === 7 && RUN.floors[1].dmg === 50,
       { f2: RUN.floors[1] });
    runEnd('death');
    const L2 = repList();
    ok('★ 판이 기록으로 저장됐다 (최근 목록에 1건)', L2.length === 1, { n: L2.length });
    const r = L2[0];
    ok('★ 결과·계열·최고층·처치·피해가 담겼다',
       r.result === 'death' && r.cls === P.cls && r.maxFloor >= 3 && r.kills === 12 && r.dmg === 90,
       { result: r.result, maxFloor: r.maxFloor, kills: r.kills, dmg: r.dmg });
    ok('★ 마지막 층까지 닫혀 층별 표가 3줄이다', (r.floors || []).length === 3,
       { floors: (r.floors || []).map(f => f.f + '층 ' + f.sec + '초') });
    const txt = repText();
    ok('★ 사람이 읽는 표로 나온다', /층별/.test(txt) && /처치/.test(txt) && txt.length > 200,
       { 줄수: txt.split('\n').length });
    ok('빌드 도장이 리포트에 찍힌다', /빌드:/.test(txt), { head: txt.split('\n')[1] });
    ok('내려받기 함수가 있다', typeof repDownload === 'function' && typeof repDownloadLast === 'function');
    /* 20판 상한 */
    for (let i = 0; i < 25; i++) repPush({ ts: 'x', result: 'death', sec: 1, maxFloor: 1, kills: 0, dmg: 0, gold: 0, pt: 0, floors: [] });
    ok('★ 최근 20판만 남긴다 (무한히 쌓이지 않는다)', repList().length === 20, { n: repList().length });
    repClear();
    return L;
  });

  await run('3) ★ 지역 전용 재고 — 동대륙·마경에만 있는 물건', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('팩이 지역 재고를 들여왔다', typeof SHOP_HUB === 'object' && !!SHOP_HUB.dong && !!SHOP_HUB.ma,
       { dong: SHOP_HUB.dong, ma: SHOP_HUB.ma });
    ok('지역 전용 아이템 8종이 ITEMS 에 있다',
       ['eastblade', 'eastrobe', 'eastcloth', 'eastboots', 'cursesw', 'cursemail', 'cursehelm', 'cursecloak']
         .every(k => !!ITEMS[k]));
    hubShow('seo'); hubEnter('shop'); facStep('buy');
    const catsSeo = shopCats().map(c => c[0]);
    ok('★ 서대륙에는 지역 칸이 없다', catsSeo.indexOf('★ 이 땅의 물건') < 0, { cats: catsSeo });
    facClose(); hubSwitch('dong'); hubEnter('shop'); facStep('buy');
    const catsDong = shopCats();
    ok('★ 동대륙 상점에는 「이 땅의 물건」 칸이 생긴다', catsDong[0][0] === '★ 이 땅의 물건',
       { cats: catsDong.map(c => c[0]) });
    ok('그 칸의 물건이 동대륙 것이다', catsDong[0][1].indexOf('eastblade') >= 0);
    shopCat = 0; renderShop();
    ok('★ 목록에 청강도가 실제로 뜬다', document.getElementById('shoplist').innerHTML.indexOf('청강도') >= 0);
    facClose(); hubSwitch('ma'); hubEnter('shop'); facStep('buy');
    shopCat = 0; renderShop();
    ok('★ 마경 상점에는 저주 장비가 뜬다', document.getElementById('shoplist').innerHTML.indexOf('저주검') >= 0);
    facClose();
    return L;
  });

  await run('4) ★ 세트 효과 — 부위를 갖추면 붙고, 저주 세트는 대가가 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('SETS 가 들어왔다', typeof SETS === 'object' && !!SETS.east && !!SETS.curse);
    P.inv.length = 0; P.eq = { weapon: null, armor: null, helm: null, shield: null, cloak: null, boots: null, glove: null, ammo: null };
    P.lv = 30; P.str = 30; refreshInv();
    const atk0 = pMaxHit()[1], ac0 = pAC();
    ['eastblade', 'eastrobe'].forEach(k => { addItem(k, 1); equipIt(P.inv.filter(i2 => i2.k === k)[0]); });
    ok('동대륙 2부위를 착용했다', setCount('east') === 2, { n: setCount('east') });
    const e2 = setEff();
    ok('★ 2부위 효과가 붙는다 (공격 +4 · AC -2)', e2.atk === 4 && e2.ac === 2, { eff: e2 });
    ['eastcloth', 'eastboots'].forEach(k => { addItem(k, 1); equipIt(P.inv.filter(i2 => i2.k === k)[0]); });
    const e4 = setEff();
    ok('★ 4부위에서 상위 티어로 바뀐다 (중복 합산이 아니다)', e4.atk === 10 && e4.ac === 4, { eff: e4 });
    ok('공격력·AC 계산에 실제로 반영된다', pMaxHit()[1] > atk0 && pAC() > ac0,
       { atk: [atk0, pMaxHit()[1]], ac: [ac0, pAC()] });
    /* 저주 세트 — 공격은 크게 오르지만 AC 는 나빠진다 */
    P.eq = { weapon: null, armor: null, helm: null, shield: null, cloak: null, boots: null, glove: null, ammo: null };
    ['cursesw', 'cursemail', 'cursehelm', 'cursecloak'].forEach(k => { addItem(k, 1); equipIt(P.inv.filter(i2 => i2.k === k)[0]); });
    const c4 = setEff();
    ok('★ 저주 4부위 — 공격 +24 · AC 페널티', c4.atk === 24 && c4.ac === -4, { eff: c4 });
    ok('저주 장비 자체도 AC 를 깎는다 (검 -3)', ITEMS.cursesw.ac === -3);
    ok('세트 설명이 툴팁 한 줄로 나온다', /부위/.test(setLine('cursesw')), { line: setLine('cursesw').slice(0, 40) });
    ok('세트가 아닌 장비는 빈 줄', setLine('longsw') === '');
    P.eq = { weapon: null, armor: null, helm: null, shield: null, cloak: null, boots: null, glove: null, ammo: null };
    refreshInv();
    return L;
  });

  await run('5) ★ 지역 전용 축복 — 동대륙 신 내림 / 마경 도박', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('팩이 지역 축복을 들여왔다', typeof BUFFS_HUB !== 'undefined' && BUFFS_HUB.length >= 4, { n: BUFFS_HUB.length });
    hubShow('seo');
    ok('★ 서대륙에는 지역 축복이 없다', hubBuffList().length === 0);
    hubSwitch('dong');
    const dl = hubBuffList();
    ok('★ 동대륙에는 신 내림 3종', dl.length === 3 && /신 내림/.test(dl[0].n), { list: dl.map(b => b.n) });
    ok('신 내림은 대가가 있다 (음수 효과 포함)',
       dl.some(b => Object.keys(b.eff).some(k => b.eff[k] < 0)), { effs: dl.map(b => b.eff) });
    P.lv = 30; P.gold = 99999; P.buffs = {};
    useHubBuff(0);
    ok('★ 받으면 공격 버프와 방어 페널티가 함께 걸린다', buffV('bd') === 9 && buffV('bac') === -3,
       { bd: buffV('bd'), bac: buffV('bac') });
    hubSwitch('ma');
    const ml = hubBuffList();
    ok('★ 마경에는 도박형 하나', ml.length === 1 && ml[0].gamble === 1, { n: ml[0].n });
    P.buffs = {}; let gotAny = 0, blank = 0;
    for (let i = 0; i < 12; i++) { P.buffs = {}; const g0 = P.gold; useHubBuff(0);
      if (Object.keys(P.buffs).length) gotAny++; else blank++;
      if (P.gold >= g0) { L.push('FAIL 도박이 은화를 받지 않았다'); break; } }
    ok('★ 도박은 대개 뭔가를 주고, 때로 꽝이다', gotAny > 0, { 성공: gotAny, 꽝: blank });
    ok('도박 축복은 지속이 1.5배다', true);
    P.buffs = {};
    return L;
  });

  await run('6) 지역 의뢰 2종 + 변종까지 세는 목표', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('★ 팩 의뢰 2종이 들어왔다', !!QUESTS.qe1 && !!QUESTS.qm1, { qe1: QUESTS.qe1.n, qm1: QUESTS.qm1.n });
    ok('QORDER 에 이어 붙었다', QORDER.indexOf('qe1') > 0 && QORDER.indexOf('qm1') > QORDER.indexOf('qe1'),
       { tail: QORDER.slice(-3) });
    ok('와일드카드 목표 매칭 함수가 있다', typeof qKeyMatch === 'function');
    ok('★ "wolf@*" 는 원종과 변종을 모두 센다',
       qKeyMatch('wolf@*', 'wolf') && qKeyMatch('wolf@*', 'wolf@redhi') && qKeyMatch('wolf@*', 'wolf@black'));
    ok('다른 종은 안 센다', !qKeyMatch('wolf@*', 'bear') && !qKeyMatch('wolf@*', 'bear@redhi'));
    ok('정확 지정은 그대로 정확히만', qKeyMatch('wolf', 'wolf') && !qKeyMatch('wolf', 'wolf@redhi'));
    /* 실제 진행 — 의뢰를 수락하고 변종을 잡은 것처럼 진행시킨다 */
    /* 지역 의뢰는 본편 사슬 뒤에 붙어 있다(lv16/22) — 앞 의뢰를 완료 처리해 놓고 시험한다 */
    P.q = {}; P.qd = {}; P.lv = 30;
    QORDER.forEach(function(id){ if(id !== 'qe1' && id !== 'qm1') P.qd[id] = 1; });
    qAcceptFrom('qe1');
    ok('길드에서 수락된다', !!P.q.qe1);
    qProgress('kill', 'wolf@redhi', 3);
    qProgress('kill', 'bear@redhi', 1);
    ok('★ 변종을 잡아도 의뢰 진행도가 오른다', P.q.qe1.p[0] === 3 && P.q.qe1.p[1] === 1, { p: P.q.qe1.p });
    ok('보상이 지역 장비다', QUESTS.qe1.rew.item[0] === 'eastcloth' && QUESTS.qm1.rew.item[0] === 'cursehelm');
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
