// R24b 검증: 잡템 일괄 판매 · 스킬 우측 레일
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });   /* 넓은 화면 = 레일 켜짐 조건 */
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(800, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 400; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(600);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ 잡템 일괄 판매 — 규칙대로만 팔린다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    // 잡템(싼 장비) · 값비싼 장비 · 강화품 · 소모품 · 퀘스트템을 한 번에 넣는다
    P.inv.length = 0; P.eq = { weapon: null, armor: null, helm: null, shield: null, cloak: null, boots: null, glove: null, ammo: null };
    addItem('dagger', 1); addItem('ljacket', 1); addItem('sandal', 1);     // 잡템 (60/120/110)
    addItem('katana', 1);                                                   // 값비싼 장비 (17000)
    addItem('hpot', 5); addItem('wscroll', 2);                              // 소모품 — 절대 팔리면 안 된다
    addItem('gladius', 1);                                                  // 강화해서 제외될 것 (520)
    const gl = P.inv.filter(i2 => i2.k === 'gladius')[0]; gl.e = 3;
    const eqTarget = P.inv.filter(i2 => i2.k === 'ljacket')[0];
    refreshInv();
    ok('일괄 판매 함수가 있다', typeof junkList === 'function' && typeof sellJunk === 'function' && typeof junkSum === 'function');
    let j = junkList(false).map(i2 => i2.k);
    ok('★ 잡템 = 싼 장비만 (단검·가죽재킷·가죽샌달)', j.length === 3 && j.indexOf('dagger') >= 0 && j.indexOf('sandal') >= 0,
       { 잡템: j });
    ok('★ 소모품(물약·주문서)은 잡템이 아니다', j.indexOf('hpot') < 0 && j.indexOf('wscroll') < 0);
    ok('★ 강화한 장비(+3 그라디우스)는 제외', j.indexOf('gladius') < 0);
    ok('★ 값비싼 장비(일본도 17,000)는 잡템에서 제외', j.indexOf('katana') < 0);
    ok('「미장착 전부」에는 값비싼 것도 들어간다', junkList(true).map(i2 => i2.k).indexOf('katana') >= 0);
    // 장착한 것은 빠지는가
    equipIt(eqTarget);
    ok('★ 장착한 장비는 일괄 판매에서 빠진다', junkList(true).map(i2 => i2.k).indexOf('ljacket') < 0,
       { 장착: P.eq.armor && ITEMS[P.eq.armor.k].n });
    // 실제 판매
    const before = P.gold, list = junkList(false), sum = junkSum(list), n = list.length;
    ok('예상 금액이 계산된다', sum > 0, { 종수: n, 예상: sum });
    sellJunk(false);
    ok('★ 판매되어 은화가 정확히 늘었다', P.gold === before + sum, { before, after: P.gold, 기대: before + sum });
    ok('★ 잡템이 인벤토리에서 사라졌다', junkList(false).length === 0
       && P.inv.filter(i2 => i2.k === 'dagger').length === 0);
    ok('★ 소모품·강화품·장착품은 그대로 남았다',
       P.inv.filter(i2 => i2.k === 'hpot').length === 1 && P.inv.filter(i2 => i2.k === 'wscroll').length === 1
       && P.inv.filter(i2 => i2.k === 'gladius').length === 1 && !!P.eq.armor,
       { 남은것: P.inv.map(i2 => i2.k) });
    ok('아무것도 없으면 조용히 넘어간다 (오류 없음)', (() => { const g2 = P.gold; sellJunk(false); return P.gold === g2; })());
    return L;
  });

  await run('2) ★ 판매 화면에 일괄 판매 버튼이 붙는다 (두 번 눌러야 팔린다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    addItem('dagger', 1); addItem('sandal', 1);
    hubShow('seo'); hubEnter('shop'); facStep('sell');
    const btns = [...document.querySelectorAll('#invlist .ib')].filter(b => /일괄 판매|전부 판매/.test(b.textContent));
    ok('★ 버튼 2종(잡템 일괄 / 미장착 전부)이 있다', btns.length === 2, { 버튼: btns.map(b => b.textContent) });
    ok('★ 버튼에 종수와 예상 금액이 적혀 있다', /\(\d+종 · [\d,]+\)/.test(btns[0].textContent), { txt: btns[0].textContent });
    const g0 = P.gold;
    btns[0].click();
    ok('★ 한 번 누르면 확인만 묻는다 (아직 안 팔린다)', P.gold === g0 && /정말/.test(btns[0].textContent),
       { txt: btns[0].textContent, gold: P.gold });
    btns[0].click();
    ok('★ 두 번째 누름에 팔린다', P.gold > g0, { before: g0, after: P.gold });
    facClose();
    return L;
  });

  await run('3) ★ 스킬·물약이 우측 여백으로 옮겨진다 (하단에서 잘리지 않게)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    fitScale(); refreshQuick();
    const r = document.getElementById('srail'), q = document.getElementById('quick');
    ok('★ 넓은 화면에서는 우측 레일이 켜진다', RAIL_ON === true && r.className === 'on',
       { RAIL_ON, cls: r.className, vw: innerWidth });
    ok('★ 레일이 켜지면 하단 퀵바는 감춘다 (같은 버튼 두 벌 방지)', q.style.display === 'none');
    const rb = [...r.querySelectorAll('.qbtn')];
    ok('★ 레일에 물약·스킬 버튼이 다 들어갔다', rb.length >= 4, { 버튼수: rb.length });
    const rr = r.getBoundingClientRect(), wr = document.getElementById('wrap').getBoundingClientRect();
    ok('★ 레일이 게임 화면을 덮지 않는다 (여백에 있다)', rr.left >= wr.right - 1,
       { railLeft: Math.round(rr.left), wrapRight: Math.round(wr.right) });
    ok('★ 레일 버튼이 잘리지 않는다 (모두 화면 안)',
       rb.every(b => { const q2 = b.getBoundingClientRect(); return q2.right <= innerWidth + 1 && q2.bottom <= innerHeight + 1 && q2.width > 40; }),
       { 최대오른쪽: Math.max(...rb.map(b => Math.round(b.getBoundingClientRect().right))) });
    ok('레일 내용은 하단 퀵바와 같은 HTML 이다 (로직 중복 없음)',
       r.innerHTML.indexOf(q.innerHTML.slice(0, 60)) > 0 || q.innerHTML.length === 0);
    return L;
  });

  // 좁은 화면 — 레일이 꺼지고 하단 퀵바로 돌아가야 한다
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.waitForTimeout(400);
  await run('4) 좁은 화면에서는 예전처럼 하단 퀵바를 쓴다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    fitScale(); refreshQuick();
    const r = document.getElementById('srail'), q = document.getElementById('quick');
    ok('★ 여백이 좁으면 레일을 끈다', RAIL_ON === false && r.className !== 'on', { RAIL_ON, vw: innerWidth });
    ok('★ 하단 퀵바가 다시 보인다', q.style.display !== 'none');
    ok('레일이 화면에 남아 있지 않다', getComputedStyle(r).display === 'none');
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
