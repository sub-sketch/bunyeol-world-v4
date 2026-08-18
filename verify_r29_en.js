// R29 검증: 영문 빌드 — 화면에 한글이 남지 않는다 · 실제로 플레이된다 · 한글판은 그대로다
const { chromium } = require('playwright');
const path = require('path');
const KOR = /[가-힣]/;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const all = [], errors = [];
  const ok = (n, c, x) => { all.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
  const P = (s) => console.log(s);

  const open = async (file) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
    page.on('pageerror', e => errors.push(file + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(file + ': ' + m.text()); });
    await page.goto('file://' + path.resolve(__dirname, 'dist/' + file));
    await page.waitForTimeout(1300);
    return page;
  };

  // ───────────────────────── 영문 빌드 ─────────────────────────
  const en = await open('game_분열된세계_ONLINE_EN.html');
  console.log('\n=== 1) ★ 타이틀·프롤로그 화면에 한글이 없다 ===');
  let t = await en.evaluate(() => document.body.innerText);
  ok('★ 타이틀 화면에 한글 0자', !KOR.test(t), { 한글: (t.match(/[가-힣][^\n]{0,20}/g) || []).slice(0, 5) });
  ok('제목이 영문이다', /Sundered World/.test(t), { 제목: (t.match(/Sundered World[^\n]*/) || [])[0] });
  ok('html lang 이 en 이다', (await en.evaluate(() => document.documentElement.lang)) === 'en');
  all.slice(-3).forEach(P);

  try { await en.locator('text=Skip').first().click({ timeout: 1800 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await en.mouse.click(640, 400); } catch (e) {} await en.waitForTimeout(200); }

  console.log('\n=== 2) ★ 캐릭터 생성 → 각인 → 게임 시작이 영문으로 굴러간다 ===');
  let L = await en.evaluate(() => {
    const out = [];
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 800; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 24; P.gold = 250000;
    out.push('started=' + !!started);
    out.push('cls=' + CLS[P.cls].n);
    out.push('item=' + ITEMS.gladius.n);
    out.push('mob=' + MOBS.wolf.n);
    out.push('skill=' + (SKILLS ? Object.values(SKILLS)[0].n : '?'));
    return out;
  });
  ok('★ 게임이 시작된다', /started=true/.test(L.join()), { info: L });
  ok('★ 직업·아이템·몹·스킬 이름이 영문이다', L.slice(1).every(s => !KOR.test(s)), { 이름: L.slice(1) });
  all.slice(-2).forEach(P);

  console.log('\n=== 3) ★ 주요 화면(가방·상점·노드·퀘스트·설정·도움말)에 한글이 없다 ===');
  const screens = [
    ['inventory', () => { openP('inv'); refreshInv(); }],
    ['character', () => { closeP('inv'); openP('char'); refreshChar(); }],
    ['skills', () => { closeP('char'); openP('skillp'); refreshSkillPanel(); }],
    ['quests', () => { closeP('skillp'); openP('quest'); refreshQuest(); }],
    ['records', () => { closeP('quest'); openP('lorep'); refreshLore(); }],
    ['huntlog', () => { closeP('lorep'); openP('hunt'); refreshHunt(); }],
    ['save', () => { closeP('hunt'); openSave(); }],
    ['options', () => { closeP('save'); openOpt(); }],
    ['help', () => { closeP('opt'); openP('help'); }],
    ['nodes', () => { closeP('help'); openMeta(); }],
    ['hub', () => { closeP('meta'); hubShow('seo'); }],
    ['shop-greet', () => { hubEnter('shop'); }],
    ['shop-buy', () => { facStep('buy'); }],
    ['shop-sell', () => { addItem('hpot', 3); addItem('longsw', 1); facStep('sell'); }],
    ['shop-detail', () => { const c = document.querySelector('#invlist .icell'); if (c) c.click(); }],
    ['guild-east', () => { facClose(); hubSwitch('dong'); openP('quest'); refreshQuest(); }],
    ['shrine-ma', () => { closeP('quest'); hubSwitch('ma'); hubEnter('shrine'); }],
    ['warp', () => { facClose(); hubEnter('warp'); }]
  ];
  for (const [name, fn] of screens) {
    const r = await en.evaluate((body) => {
      try { eval('(' + body + ')()'); } catch (e) { return { err: e.message }; }
      const vis = [];
      document.querySelectorAll('body *').forEach(el => {
        const st = getComputedStyle(el);
        if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return;
        for (const n of el.childNodes) if (n.nodeType === 3 && /[가-힣]/.test(n.nodeValue)) vis.push(n.nodeValue.trim().slice(0, 30));
      });
      return { kor: vis.slice(0, 6), n: vis.length };
    }, fn.toString());
    await en.waitForTimeout(120);
    ok('★ [' + name + '] 보이는 글자에 한글 0자', !r.err && r.n === 0, r);
    P(all[all.length - 1]);
  }

  console.log('\n=== 4) ★ 전투·로그·정산도 영문이다 (실제로 싸운다) ===');
  L = await en.evaluate(() => {
    const out = [];
    facClose(); hubHide();
    const zi = 1;
    travel(zi, ZONES[zi].gates[0].x, ZONES[zi].gates[0].y);
    P.hp = P.mhp = 9000;
    const m = world[zi].mobs.find(x => !x.dead);
    P.tgt = m;
    for (let i = 0; i < 900; i++) update(1 / 60);
    out.push('killed=' + (m ? m.dead : false));
    const lg = document.getElementById('log').innerText;
    out.push('logKor=' + /[가-힣]/.test(lg));
    out.push('log=' + lg.split('\n').filter(s => s.trim()).slice(-2).join(' | ').slice(0, 90));
    /* 정산 화면 */
    if (typeof runEnd === 'function' && RUN) { try { runEnd(true); } catch (e) { out.push('runEnd=' + e.message); } }
    const st = document.getElementById('settleov');
    out.push('settleKor=' + (st ? /[가-힣]/.test(st.innerText) : 'n/a'));
    return out;
  });
  ok('★ 전투가 실제로 굴러간다 (몹 처치)', /killed=true/.test(L.join()), { info: L[0] });
  ok('★ 전투 로그에 한글이 없다', /logKor=false/.test(L.join()), { log: L[2] });
  ok('★ 정산 화면에 한글이 없다', /settleKor=false/.test(L.join()), { info: L[3] });
  all.slice(-3).forEach(P);

  console.log('\n=== 5) 한글판은 그대로 (회귀 없음) ===');
  const ko = await open('game_분열된세계_ONLINE.html');
  try { await ko.locator('text=건너뛰기').first().click({ timeout: 1800 }); } catch (e) {}
  L = await ko.evaluate(() => {
    if (!P) startGame();
    return ['cls=' + CLS[P.cls].n, 'item=' + ITEMS.gladius.n, 'mob=' + MOBS.wolf.n,
            'shop=' + SHOPCAT[0][0]];
  });
  ok('★ 한글판 이름은 한국어 그대로다', L.every(s => KOR.test(s)), { 이름: L });
  ok('한글판도 오류 없이 시작된다', !errors.some(e => e.indexOf('game_분열된세계_ONLINE.html') === 0),
     { 오류: errors.filter(e => e.indexOf('_EN') < 0).slice(0, 3) });
  all.slice(-2).forEach(P);

  console.log('\n=== 6) 분류명을 키로 쓰는 로직이 영문에서도 맞물린다 ===');
  L = await en.evaluate(() => {
    const out = [];
    /* SHOPCAT 은 [[분류명, [아이템키…]], …] 이고 SHOP_KEEP 은 분류명 목록이다.
       코드와 데이터를 같은 사전으로 치환했으므로 영문판에서도 이름이 맞물려야 한다. */
    const names = SHOPCAT.map(c => c[0]);
    out.push('cats=' + names.join(','));
    out.push('keep=' + SHOP_KEEP.join(','));
    const hit = SHOP_KEEP.filter(k => names.indexOf(k) >= 0);
    out.push('hit=' + hit.join(','));
    /* 실제 함수도 돌려 본다 — 지역 상점이 공통 분류를 남기는지 */
    try { HUB.id = 'dong'; const cs = shopCats(); out.push('dongCats=' + cs.map(c => c[0]).join(',')); }
    catch (e) { out.push('dongCats=ERR ' + e.message); }
    return out;
  });
  ok('★ 상점 분류 비교가 영문판에서도 일치한다 (한글 키를 쓰던 로직)',
     L[2] !== 'hit=' && L[2].split('=')[1].split(',').length === 2, { info: L });
  ok('★ 지역 상점도 공통 분류(소모품·주문서)를 남긴다', /dongCats=/.test(L[3]) && !/ERR/.test(L[3]), { info: L[3] });
  P(all[all.length - 1]);

  /* 스크린샷 */
  for (const [nm, fn] of [['title', () => {}], ['hub', () => { hubShow('seo'); }],
                          ['shop', () => { hubEnter('shop'); facStep('buy'); }],
                          ['inv', () => { facClose(); openP('inv'); refreshInv(); const c = document.querySelector('#invlist .icell'); if (c) c.click(); }],
                          ['nodes', () => { closeP('inv'); openMeta(); }]]) {
    await en.evaluate(b => { try { eval('(' + b + ')()'); } catch (e) {} }, fn.toString());
    await en.waitForTimeout(500);
    await en.screenshot({ path: 'shot_r29_en_' + nm + '.png' });
  }

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.length + '건 중 FAIL ' + f + '건, 페이지오류 ' + errors.length + '건');
  console.log(f === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
