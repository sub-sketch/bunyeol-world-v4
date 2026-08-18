// R28 검증: 가방 개편 — 왼쪽 부위별 큰 아이콘(사람 모양) · 오른쪽 아이콘 4열 격자 · 클릭 상세 · 정렬
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
    try { META.mark = 'blade'; META.clear1 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 20; P.gold = 90000;
  });
  await page.waitForTimeout(400);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ 왼쪽 — 부위별 자리에 큰 아이콘 (사람 모양 배치)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ['gladius', 'leather', 'helmet', 'wshield', 'ocloak', 'boots', 'glove'].forEach(k => { if (ITEMS[k]) addItem(k, 1); });
    /* 있는 것만 골라 채운다 — 아이템 키가 바뀌어도 검증이 깨지지 않게 */
    P.inv.forEach(it => { if (SLOTN[ITEMS[it.k].t] && !P.eq[ITEMS[it.k].t] && canUse(it.k)) equipIt(it); });
    openP('inv');
    const doll = document.getElementById('eqdoll');
    ok('부위 자리판(#eqdoll)이 있다', !!doll);
    const cells = [...doll.querySelectorAll('.dcell')];
    ok('★ 8개 부위가 모두 자리를 차지한다', cells.length === SLOTS.length, { 자리: cells.length, 부위: SLOTS.length });
    ok('★ 부위 이름이 자리마다 붙어 있다',
       ['투구', '갑옷', '무기', '방패', '망토', '부츠', '장갑', '화살'].every(n => doll.innerHTML.indexOf(n) >= 0));
    /* 사람 모양 = 격자 좌표가 서로 다른 행/열에 흩어져 있다 (한 줄 나열이 아니다) */
    const pos = cells.map(c => getComputedStyle(c).gridRowStart + ':' + getComputedStyle(c).gridColumnStart);
    const rows = new Set(pos.map(p => p.split(':')[0])), cols = new Set(pos.map(p => p.split(':')[1]));
    ok('★ 자리가 여러 행·열로 흩어져 있다 (한 줄 나열 아님)', rows.size >= 3 && cols.size >= 3,
       { 행: rows.size, 열: cols.size });
    const helm = cells.find(c => /투구/.test(c.textContent));
    const boots = cells.find(c => /부츠/.test(c.textContent));
    ok('★ 투구가 부츠보다 위에 있다 (사람 모양)',
       helm.getBoundingClientRect().y < boots.getBoundingClientRect().y,
       { 투구y: Math.round(helm.getBoundingClientRect().y), 부츠y: Math.round(boots.getBoundingClientRect().y) });
    const ico = doll.querySelector('.dslot .ico');
    const w = ico ? Math.round(ico.getBoundingClientRect().width) : 0;
    ok('★ 착용 아이콘이 40px 이상으로 커졌다 (예전 24~26px)', w >= 40, { 아이콘폭: w });
    const filled = cells.filter(c => c.querySelector('.ico')).length;
    ok('★ 착용 중인 것이 그 부위 자리에 들어가 있다', filled >= 3, { 채워진자리: filled });
    const wcell = cells.find(c => /무기/.test(c.querySelector('.dsl').textContent));
    ok('★ 자리에 물건 이름도 적힌다', P.eq.weapon ? wcell.textContent.indexOf(ITEMS[P.eq.weapon.k].n) >= 0 : true,
       { 무기칸: wcell.textContent.trim() });
    ok('은화·AC 요약이 아래에 남아 있다', /은화/.test(document.getElementById('eqtot').textContent)
       && /Armor Class/.test(document.getElementById('eqtot').textContent));
    return L;
  });

  await run('2) ★ 오른쪽 — 아이콘만 4열 격자로 쭉', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    addItem('hpot', 7); addItem('mpot', 3); addItem('dagger', 1);
    refreshInv();
    const box = document.getElementById('invlist');
    const st = getComputedStyle(box);
    ok('★ 목록이 격자다 (예전에는 한 줄씩 쭉)', st.display === 'grid');
    const cols = st.gridTemplateColumns.trim().split(/\s+/).length;
    ok('★ 4열이다', cols === 4, { 열: cols, raw: st.gridTemplateColumns });
    const cells = [...box.querySelectorAll('.icell')];
    ok('아이콘 칸이 여러 개 생겼다', cells.length >= 4, { 칸: cells.length });
    /* 위에서 아래로 = 첫 줄 4칸은 같은 y, 다섯 번째는 아래로 내려간다 */
    if (cells.length >= 5) {
      const y1 = Math.round(cells[0].getBoundingClientRect().y), y4 = Math.round(cells[3].getBoundingClientRect().y),
            y5 = Math.round(cells[4].getBoundingClientRect().y);
      ok('★ 4칸이 한 줄, 다섯 번째부터 아랫줄', y1 === y4 && y5 > y1, { y1: y1, y4: y4, y5: y5 });
    }
    const ico = box.querySelector('.icell .ico');
    ok('★ 목록 아이콘도 36px 이상', Math.round(ico.getBoundingClientRect().width) >= 36,
       { 아이콘폭: Math.round(ico.getBoundingClientRect().width) });
    ok('★ 칸에 글씨 설명이 붙어 있지 않다 (아이콘만)',
       cells.every(c => c.textContent.replace(/[+\d착]/g, '').trim() === ''),
       { 예: cells.slice(0, 4).map(c => c.textContent.trim()) });
    const st2 = cells.find(c => c.querySelector('.icq'));
    ok('★ 여러 개는 수량 숫자가 붙는다', !!st2, { 수량표시: st2 && st2.querySelector('.icq').textContent });
    const eqd = cells.filter(c => c.classList.contains('eqd'));
    ok('★ 장착 중인 것은 따로 표시된다', eqd.length >= 1, { 장착칸: eqd.length });
    ok('마우스를 올리면 이름이 뜬다 (title)', /./.test(cells[0].title), { title: cells[0].title.slice(0, 40) });
    return L;
  });

  await run('3) ★ 누르면 오른쪽에 자세히 — 시설 밖(가방 단독)에서도 뜬다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('시설 화면은 닫혀 있다 (필드/마을에서 가방만 연 상태)',
       document.getElementById('facov').style.display !== 'block');
    const cells = [...document.querySelectorAll('#invlist .icell')];
    const wc = cells.find(c => /검|도|칼|Dagger|dagger/.test(c.title)) || cells[0];
    wc.click();
    const fi = document.getElementById('facinfo');
    ok('★ 상세 패널이 뜬다', fi.style.display === 'block' && fi.innerHTML.length > 40);
    const r = fi.getBoundingClientRect();
    ok('★ 화면 오른쪽 중앙이다', r.x > innerWidth * 0.5 && r.y > 20 && r.bottom <= innerHeight + 1,
       { x: Math.round(r.x), vw: innerWidth });
    ok('★ 가방 패널에 가려지지 않는다 (그 자리를 누르면 상세가 잡힌다)',
       fi.contains(document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + 14))),
       { hit: (document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + 14)) || {}).className });
    ok('★ 고른 칸에 표시가 남는다', wc.classList.contains('on'));
    ok('이름·수치가 크게 적힌다', !!fi.querySelector('.fitop b') && !!fi.querySelector('.fistat'),
       { 이름: fi.querySelector('.fitop b').textContent });
    const btn = [...fi.querySelectorAll('.ib')].map(b => b.textContent.replace(/\s/g, ''));
    ok('★ 장착/사용 버튼이 상세 패널에 있다', btn.some(t => /장착|해제|사용/.test(t)), { 버튼: btn });
    /* 실제로 장착까지 되는가 */
    const before = P.eq.weapon;
    const eb = [...fi.querySelectorAll('.ib')].find(b => /장\s*착/.test(b.textContent));
    if (eb) eb.click();
    ok('★ 상세 패널에서 장착이 처리된다', !eb || P.eq.weapon !== before, { 바뀜: P.eq.weapon !== before });
    return L;
  });

  await run('4) 물약은 상세에서 바로 사용 · 정렬 버튼 유지', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    P.hp = Math.max(1, P.mhp - 60);
    const cells = [...document.querySelectorAll('#invlist .icell')];
    const pc = cells.find(c => /회복제|물약/.test(c.title));
    ok('물약 칸을 찾았다', !!pc, { title: pc && pc.title.slice(0, 24) });
    pc.click();
    const fi = document.getElementById('facinfo');
    const ub = [...fi.querySelectorAll('.ib')].find(b => /사\s*용/.test(b.textContent));
    ok('★ 물약 상세에는 「사용」이 있다', !!ub);
    const hp0 = P.hp; if (ub) ub.click();
    ok('★ 눌러서 실제로 마셔진다', P.hp > hp0, { before: Math.round(hp0), after: Math.round(P.hp) });
    /* 정렬 */
    addItem('hpot', 1); addItem('dagger', 1); addItem('mpot', 1);
    sortInv();
    const ord = P.inv.map(it => ITEMS[it.k].t);
    const rank = { weapon: 0, armor: 1, helm: 2, shield: 3, cloak: 4, boots: 5, glove: 6, ammo: 7, potion: 8, scroll: 9 };
    let sorted = true; for (let i = 1; i < ord.length; i++) if ((rank[ord[i - 1]] === undefined ? 99 : rank[ord[i - 1]]) > (rank[ord[i]] === undefined ? 99 : rank[ord[i]])) sorted = false;
    ok('★ 「정렬」이 종류별로 묶어 준다', sorted, { 순서: ord });
    ok('정렬 버튼이 가방 창에 있다',
       [...document.querySelectorAll('#inv .ib')].some(b => /정렬/.test(b.textContent)));
    ok('가방 창이 화면 안에 들어온다 (넓어진 2단 구성)',
       document.getElementById('inv').getBoundingClientRect().right <= innerWidth + 1,
       { right: Math.round(document.getElementById('inv').getBoundingClientRect().right), vw: innerWidth });
    return L;
  });

  await run('5) 강화 주문서 흐름 — 칸을 누르면 상세에서 강화', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    facInfoClear();
    const sk = Object.keys(ITEMS).find(k => ITEMS[k].ench === 'weapon');
    ok('무기 강화 주문서가 있다', !!sk, { key: sk });
    addItem(sk, 4);
    const sit = P.inv.find(it => it.k === sk);
    useIt(sit);
    ok('★ 강화 대기 안내가 뜬다', document.getElementById('enchhint').style.display === 'block' && !!enchState);
    const cells = [...document.querySelectorAll('#invlist .icell')];
    const wc = cells.find(c => ITEMS[P.inv[cells.indexOf(c)] ? P.inv[cells.indexOf(c)].k : 'hpot'].t === 'weapon');
    /* 무기 칸을 찾는다 — 격자 순서는 P.inv 순서와 같다 */
    ok('무기 칸을 찾았다', !!wc);
    const e0 = P.inv[cells.indexOf(wc)].e || 0;
    wc.click();
    /* R30 — 칸을 누르면 곧바로 강화되지 않고 **가운데 확인창**이 뜬다
       (대표 지시: 일괄 강화 옵션이 사라졌고 확인 버튼이 오른쪽 끝이라 불편했다).
       그래서 여기서 확인 버튼을 눌러 준다. */
    const fi = document.getElementById('facinfo');
    ok('★ 확인창이 화면 가운데로 뜬다', fi.style.display === 'block' && fi.className === 'mid',
       { cls: fi.className });
    const btns = [...fi.querySelectorAll('.ib')].map(b2 => b2.textContent.replace(/\s+/g, ''));
    ok('★ 확인창에 「안전구간까지 일괄」이 있다', btns.some(t => /까지/.test(t)), { 버튼: btns });
    const one = [...fi.querySelectorAll('.ib')].find(b2 => /강화\s*\(1장\)/.test(b2.textContent));
    if (one) one.click();
    return L.concat(['(강화 연출은 비동기 — 다음 단계에서 확인)', 'INFO 강화전=' + e0]);
  });
  await page.waitForTimeout(2200);
  await run('5b) 강화 결과', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const anyE = P.inv.some(it => (it.e || 0) > 0) || SLOTS.some(s => P.eq[s] && (P.eq[s].e || 0) > 0);
    ok('★ 칸을 눌러서 강화가 진행됐다 (+1 이상)', anyE);
    ok('강화가 끝나면 안내가 사라진다', document.getElementById('enchhint').style.display === 'none');
    return L;
  });

  /* 스크린샷 — 가방 단독 / 상점 판매(시설 도킹) */
  await page.evaluate(() => { facInfoClear(); openP('inv'); const c = document.querySelector('#invlist .icell'); if (c) c.click(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot_r28_1_가방_격자.png' });
  await page.evaluate(() => { closeP('inv'); hubShow('seo'); hubEnter('shop'); });
  await page.waitForTimeout(900);
  await page.evaluate(() => { facStep('sell'); const c = document.querySelector('#invlist .icell'); if (c) c.click(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot_r28_2_상점_판매격자.png' });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + f + '건, 페이지오류 ' + errors.length + '건');
  console.log(f === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
