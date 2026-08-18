// R22 검증: 길드 의뢰 게시판 — 걸어다니는 성읍 없이 수락·보고가 되는가
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
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
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const e = document.getElementById('markov'); if (e) e.style.display = 'none'; });

  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) 게시판이 뜨고, 수락 가능한 의뢰가 보인다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('guildBoardHtml / qAcceptFrom / qTurnInFrom 존재',
       typeof guildBoardHtml === 'function' && typeof qAcceptFrom === 'function' && typeof qTurnInFrom === 'function');
    openP('quest');
    const el = document.getElementById('qlist');
    ok('★ 퀘스트 패널이 게시판으로 그려진다', el.innerHTML.indexOf('의뢰 게시판') >= 0);
    const open1 = QORDER.filter(q => qAvail(q));
    ok('첫 의뢰가 수락 가능 상태', open1.length >= 1, { 수락가능: open1 });
    ok('★ 수락 버튼이 있다', el.innerHTML.indexOf('qAcceptFrom') >= 0);
    ok('잠긴 의뢰는 조건이 보인다', el.innerHTML.indexOf('아직 열리지 않은 의뢰') >= 0
       && el.innerHTML.indexOf('먼저') + el.innerHTML.indexOf('이상') > -2);
    ok('스포일러 방지 — 잠긴 것 중 이름은 2개까지', (el.innerHTML.match(/🔒/g) || []).length <= 2,
       { 잠김표시: (el.innerHTML.match(/🔒/g) || []).length });
    return L;
  });

  await run('2) ★ NPC 없이 수락된다 (걸어다니는 성읍을 안 거친다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const id = QORDER.filter(q => qAvail(q))[0];
    ok('대화창은 닫혀 있다(NPC를 만나지 않았다)', document.getElementById('dlg').style.display !== 'block');
    const before = Object.keys(P.q).length;
    qAcceptFrom(id);
    ok('★ 게시판에서 수락되어 진행 중으로 들어갔다', !!P.q[id] && Object.keys(P.q).length === before + 1,
       { id: id, 진행중: Object.keys(P.q) });
    const el = document.getElementById('qlist');
    ok('게시판에 진행 중 칸이 생겼다', el.innerHTML.indexOf('진행 중') >= 0 && el.innerHTML.indexOf('qTurnInFrom') >= 0);
    ok('같은 의뢰가 게시판(수락 가능)에서는 빠졌다', qAvail(id) === false);
    return L;
  });

  await run('3) ★ 조건을 채우면 게시판에서 보고된다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const id = Object.keys(P.q)[0], Q = QUESTS[id];
    ok('아직 완료 불가 — 보고를 눌러도 안 넘어간다', qReady(id) === false);
    qTurnInFrom(id);
    ok('★ 조건 미달이면 완료되지 않는다(가드)', !!P.q[id] && !P.qd[id]);
    /* 목표를 강제로 채운다 */
    Q.obj.forEach((o, i) => { P.q[id].p[i] = o.n; });
    ok('완료 가능 상태', qReady(id) === true);
    const g0 = P.gold, x0 = P.xp, lv0 = P.lv;
    qTurnInFrom(id);
    ok('★ 게시판에서 보고 완료', !P.q[id] && !!P.qd[id], { done: id });
    ok('보상이 들어왔다(은화)', P.gold > g0, { gold: [g0, P.gold] });
    ok('경험치도 들어왔다', P.xp > x0 || P.lv > lv0, { xp: [x0, P.xp], lv: [lv0, P.lv] });
    openP('quest');
    ok('완료 목록에 올라갔다', document.getElementById('qlist').innerHTML.indexOf('완료한 이야기') >= 0);
    const nx = QORDER.filter(q => qAvail(q))[0];
    ok('★ 다음 의뢰가 게시판에 열렸다(사슬이 이어진다)', !!nx, { 다음: nx });
    return L;
  });

  await run('4) NPC 대화 경로도 그대로 산다 (이행 기간 · 같은 상태를 본다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const nx = QORDER.filter(q => qAvail(q))[0], giver = QUESTS[nx].giver;
    const nq = npcQuest(giver);
    ok('★ 의뢰인 NPC 는 여전히 같은 의뢰를 준다(상태가 하나다)', nq[0] === nx && nq[1] === 'give',
       { npc: giver, npcQuest: nq });
    /* 게시판에서 수락한 뒤 NPC 쪽 모드가 바뀌는지 */
    qAcceptFrom(nx);
    const nq2 = npcQuest(giver);
    ok('게시판에서 수락하면 NPC 쪽도 진행 중으로 바뀐다', nq2[0] === nx && nq2[1] === 'prog', { npcQuest: nq2 });
    return L;
  });

  await run('5) 거점 허브의 「길드」 버튼이 이 화면을 연다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    closeP('quest');
    hubShow('dong');
    hubEnter('guild');
    const q = document.getElementById('quest');
    ok('★ 허브 레일에서 길드 화면이 열린다', q.style.display === 'block');
    const el = document.getElementById('qlist');
    ok('★ 지역 간판이 동대륙 것으로 나온다', el.innerHTML.indexOf('산문') >= 0,
       { sign: (el.innerHTML.match(/<b>([^<]+)<\/b>/) || [])[1] });
    hubSwitch('seo'); hubEnter('guild');
    ok('지역을 바꾸면 간판도 바뀐다', document.getElementById('qlist').innerHTML.indexOf('수비대') >= 0);
    ok('의뢰 내용은 지역과 무관하게 같다(기능은 하나)',
       document.getElementById('qlist').innerHTML.indexOf('진행 중') >= 0);
    return L;
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 5).join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
