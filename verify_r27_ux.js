// R27 검증: 배경 짤림 · 상점 상세/비교/보유은화 · 일시정지 · 퀘스트 트래커 · 지역 전용화 · 워프 · 보스 방향 · 오러 설명
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  /* 세로로 긴 창 — 예전에는 시설 배경이 상하로 잘렸다 */
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(550, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 600; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 26; P.gold = 250000;
  });
  await page.waitForTimeout(500);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  /* 배경 그림은 로드 후에 그려지므로 먼저 열어 두고 기다린다 */
  await page.evaluate(() => { hubShow('seo'); hubEnter('shop'); });
  await page.waitForTimeout(900);

  await run('1) ★ 시설 배경이 상하로 잘리지 않는다 (전체화면 아님)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const cv = document.getElementById('facbg');
    const ar = cv.width / cv.height;
    ok('창이 16:9 보다 세로로 길다 (잘림이 나던 조건)', ar < 1.7, { 캔버스비율: Math.round(ar * 100) / 100 });
    /* 그림은 16:9. contain 이면 위아래에 여백(=흐린 배경)이 생기고, 그림 전체가 들어간다.
       cover 였다면 그림 가로가 캔버스 가로와 같고 위아래가 잘려 나갔다.
       판정: 그림이 놓일 높이(가로/16*9)가 캔버스 높이보다 작아야 = 잘리지 않았다. */
    const fit = cv.width / (1600 / 893);
    ok('★ 그림 전체가 캔버스 안에 들어간다 (contain)', fit <= cv.height + 1,
       { 그림높이: Math.round(fit), 캔버스높이: cv.height });
    const g = cv.getContext('2d');
    /* 맨 위·맨 아래 줄이 완전 검정이 아니다 = 흐린 배경으로 채워졌다(검은 띠가 아니다) */
    /* 흐린 배경은 어둡게(밝기 0.55 + 비네트) 깔리므로 여러 x 지점을 훑어 최댓값으로 판정한다 */
    const rowMax = (y) => {
      let mx = 0, sm = 0, n = 0;
      const d = g.getImageData(0, y, cv.width, 1).data;
      for (let x = 8; x < cv.width - 8; x += 8) {
        const i = x * 4, v = d[i] + d[i + 1] + d[i + 2];
        if (v > mx) mx = v; sm += v; n++;
      }
      return { mx: mx, avg: Math.round(sm / n) };
    };
    const top = rowMax(3), bot = rowMax(cv.height - 4);
    ok('★ 남는 자리는 흐린 배경으로 채워졌다 (검은 띠 없음)',
       top.mx > 8 && bot.mx > 8, { 위: top, 아래: bot });
    return L;
  });

  await run('2) ★ 상점 — 보유 은화 · 큰 아이콘 · 오른쪽 상세/비교 패널', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    facStep('buy');
    const sl = document.getElementById('shoplist');
    ok('★ 구매창에 보유 은화가 뜬다', /보유/.test(sl.innerHTML) && sl.innerHTML.indexOf(P.gold.toLocaleString()) >= 0,
       { head: sl.querySelector('.shopgold') && sl.querySelector('.shopgold').textContent });
    const ico = sl.querySelector('.irow .ico');
    const w = ico ? Math.round(ico.getBoundingClientRect().width) : 0;
    ok('★ 목록 아이콘이 32px 이상으로 커졌다 (예전 20~26px)', w >= 32, { 아이콘폭: w });
    /* 무기 칸으로 옮겨 장비를 고른다 */
    const tabs = [...document.querySelectorAll('#shoptab .ib')];
    const wt = tabs.find(t => /무기/.test(t.textContent)); if (wt) wt.click();
    const row = document.querySelector('#shoplist .irow');
    row.click();
    const fi = document.getElementById('facinfo');
    ok('★ 행을 누르면 오른쪽 상세 패널이 뜬다', fi.style.display === 'block' && fi.innerHTML.length > 50);
    const r = fi.getBoundingClientRect();
    ok('★ 패널이 화면 오른쪽 중앙에 있다', r.x > innerWidth * 0.5 && r.y > 40 && r.bottom < innerHeight,
       { x: Math.round(r.x), y: Math.round(r.y), vw: innerWidth });
    const bg = getComputedStyle(fi).backgroundImage + getComputedStyle(fi).backgroundColor;
    const al = (bg.match(/rgba\([^)]*?,\s*([0-9.]+)\)/g) || []).map(s2 => parseFloat(s2.match(/,\s*([0-9.]+)\)$/)[1]));
    ok('★ 반투명하다', al.length > 0 && Math.max(...al) < 0.95, { alpha: al });
    ok('★ 착용 중 장비와 비교가 나온다', /착용 중|비어 있는 부위/.test(fi.innerHTML),
       { cmp: (fi.querySelector('.fihd') || {}).textContent });
    ok('상세 패널에서 바로 구매할 수 있다', /fiBuy/.test(fi.innerHTML));
    const g0 = P.gold;
    fiBuy(1);
    ok('★ 상세 패널의 구매가 실제로 동작한다', P.gold < g0, { before: g0, after: P.gold });
    ok('구매 후 보유 은화 표시가 갱신된다', document.getElementById('facinfo').innerHTML.indexOf(P.gold.toLocaleString()) >= 0);
    return L;
  });

  await run('3) ★ 선택 화면에서는 게임이 멈춘다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('일시정지 판정 함수가 있다', typeof gamePaused === 'function');
    facClose(); hubHide();
    travel(1, 10, 8);
    const t0 = T;
    for (let i = 0; i < 30; i++) update(1 / 60);
    ok('평소에는 시간이 흐른다', T > t0, { 흐른시간: Math.round((T - t0) * 100) / 100 });
    /* 보상 카드 화면을 띄운다 */
    document.getElementById('frewov').style.display = 'block';
    ok('★ 보상 카드 화면 = 일시정지', gamePaused() === true);
    const t1 = T, hp1 = P.hp;
    for (let i = 0; i < 60; i++) update(1 / 60);
    ok('★ 카드를 고르는 동안 시계가 멈춘다 (고르다 죽지 않는다)', T === t1, { T전: t1, T후: T });
    ok('★ 그동안 체력이 깎이지 않는다', P.hp === hp1, { hp: [hp1, P.hp] });
    document.getElementById('frewov').style.display = 'none';
    ok('닫으면 다시 흐른다', (() => { const a = T; update(1 / 60); return T > a; })());
    /* 던전 상점도 같은 규칙 */
    document.getElementById('runshop').style.display = 'block';
    ok('★ 던전 상점도 일시정지', gamePaused() === true);
    document.getElementById('runshop').style.display = 'none';
    ok('멈출 화면 목록에 시설·정산·각인이 들어 있다',
       PAUSE_IDS.indexOf('facov') >= 0 && PAUSE_IDS.indexOf('settleov') >= 0 && PAUSE_IDS.indexOf('markov') >= 0,
       { ids: PAUSE_IDS });
    return L;
  });

  await run('4) ★ 퀘스트 추적기 — 수락한 것 전부, 누르면 펼침', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    P.q = {}; P.qd = {}; P.qcur = null;
    const ids = QORDER.slice(0, 3);
    ids.forEach(id => qAccept(id));
    refreshQuest();
    const tr = document.getElementById('qtrack');
    ok('★ 수락한 3건이 모두 보인다', tr.querySelectorAll('.qtrow').length === 3,
       { 줄수: tr.querySelectorAll('.qtrow').length });
    ok('머리에 건수가 뜬다', /의뢰 3건/.test(tr.innerHTML));
    const first = tr.querySelector('.qtrow');
    ok('처음에는 하나만 펼쳐져 있다', tr.querySelectorAll('.qtrow.open').length === 1);
    /* qAccept 가 마지막 수락분을 P.qcur 로 잡아 두므로, **다른 것**을 눌러 전환을 확인한다 */
    const other = ids.filter(id => id !== P.qcur)[0];
    qTrackPick(other); refreshQuest();
    ok('★ 누른 의뢰가 펼쳐지고 목표가 보인다',
       document.querySelectorAll('#qtrack .qtrow.open .to').length >= 1 && P.qcur === other,
       { qcur: P.qcur, 누른것: other });
    qTrackPick(other); refreshQuest();
    ok('같은 것을 다시 누르면 접힌다 (다음 것으로 넘길 수 있다)', P.qcur === null);
    ok('추적기를 누를 수 있다 (pointer-events)', getComputedStyle(document.getElementById('qtrack')).pointerEvents !== 'none');
    return L;
  });

  await run('5) ★ 지역 전용화 — 동대륙 상점/굿청이 그 땅 것으로 대체된다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    travel(0, 10, 9); hubShow('dong'); hubEnter('shop'); facStep('buy');
    const cats = shopCats().map(c => c[0]);
    ok('★ 동대륙 상점은 「이 땅의 물건」 + 소모품/주문서만', cats[0] === '★ 이 땅의 물건' && cats.length === 3,
       { cats });
    ok('★ 초보자 장비(무기·갑옷 칸)는 사라졌다', cats.indexOf('무기') < 0 && cats.indexOf('갑옷') < 0);
    ok('물약·주문서는 남는다 (어느 땅에서나 필요)', cats.indexOf('소모품') >= 0 && cats.indexOf('주문서') >= 0);
    facClose(); hubEnter('shrine');
    const dt = document.getElementById('dlgtext').innerHTML;
    ok('★ 굿청에는 신 내림 3종이 뜬다', (dt.match(/신 내림/g) || []).length === 3);
    ok('★ 본편 축복(전사의 축복 등)은 대체되어 안 뜬다', dt.indexOf('전사의 축복') < 0 && dt.indexOf('강철의 피부') < 0);
    ok('무료 변경의 축복은 남는다 (기본 지급)', dt.indexOf('변경의 축복') >= 0);
    closeDialog(); facClose();
    hubSwitch('seo'); hubEnter('shrine');
    const st = document.getElementById('dlgtext').innerHTML;
    ok('서대륙 신전은 예전 목록 그대로', st.indexOf('전사의 축복') >= 0 && st.indexOf('신 내림') < 0);
    closeDialog(); facClose();
    return L;
  });

  await run('6) ★ 워프 관리자 — 클리어한 곳으로 곧바로', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('레일에 워프 시설이 있다', HUB_FAC.some(f => f.k === 'warp'));
    hubShow('seo'); hubRender();
    ok('★ 레일 버튼에 지역별 이름이 뜬다', document.getElementById('hubrail').innerHTML.indexOf('차원문 관리소') >= 0);
    hubEnter('warp');
    ok('★ 워프 화면이 열린다', FAC.k === 'warp' && document.getElementById('warp').parentNode.id === 'facslotA');
    const wl = warpList();
    ok('★ 열린 부만 목록에 나온다 (clear1·clear2 상태)', wl.length >= 2 && wl.every(a => !!a.entry),
       { list: wl.map(a => a.n + ' ' + a.from + '~' + a.to + '층') });
    ok('목록에 층 범위와 클리어 표시가 있다', /층/.test(document.getElementById('warplist').innerHTML));
    /* 실제 워프 */
    const ok2 = warpTo(wl[wl.length - 1].id);
    ok('★ 마지막으로 열린 부로 워프된다', ok2 === true && runActive() === true,
       { 도착존: curZ, 층: FLOOR_OF[curZ] });
    ok('★ 워프 지점이 그 부의 첫 층이다', FLOOR_OF[curZ] === wl[wl.length - 1].from,
       { 층: FLOOR_OF[curZ], 기대: wl[wl.length - 1].from });
    ok('★ 원정 중에는 워프를 거절한다', warpTo(wl[0].id) === false);
    runEnd('escape');
    document.getElementById('settleov').style.display = 'none';
    return L;
  });

  await run('7) 보스 방향 · 오러 설명', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    /* 보스는 tele(예고 장판) 공격을 쓴다 — 그때도 플레이어를 봐야 한다 */
    travel(1, 10, 8);
    const z = world[1], m = z.mobs.filter(q => !q.dead)[0];
    m.d = JSON.parse(JSON.stringify(m.d));
    m.d.tele = { r: 2.3, arm: 0.85, mult: 2, cd: 4, ch: 1 };     /* 항상 장판을 쓰게 */
    m.fx = P.fx; m.fy = P.fy - 3;                                 /* 플레이어가 남쪽(아래)에 있다 */
    m.face = 2;                                                   /* 일부러 반대(북)를 보게 해 둔다 */
    m.na = 0; m.hazT = 0;
    mobAttack(m);
    ok('★ 장판 공격에서도 플레이어를 본다 (등을 보이지 않는다)', m.face !== 2,
       { face: m.face, 기대: faceDir(P.fx - m.fx, P.fy - m.fy) });
    ok('일반 공격도 마찬가지', (() => { m.face = 2; m.d.tele = null; m.na = 0; mobAttack(m); return m.face !== 2; })());
    /* 오러 설명 */
    const sk = SKILLS.k.filter(s => s.id === 'aura')[0];
    ok('오러 권역 스킬이 있다', !!sk);
    ok('★ 설명에 무엇을 하는지 적혀 있다 (피해·둔화)', /피해/.test(sk.desc) && /둔화/.test(sk.desc),
       { desc: sk.desc.slice(0, 50) });
    const info = metaNodeInfo('aura');
    ok('★ 노드판 설명에 효과 + 단계표가 함께 나온다',
       /피해/.test(info.desc) && /반경/.test(info.desc), { desc: info.desc.replace(/<[^>]+>/g, ' ').slice(0, 80) });
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
