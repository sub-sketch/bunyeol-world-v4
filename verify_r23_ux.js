// R23 검증: 노드판 확대 · 상점 2단(겹침) · 시설 배경 · 필드 보이지 않는 벽 · 변신 개편
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
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.pt = 400; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(600);

  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) 노드판이 화면을 거의 꽉 채우고 글자가 커졌다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    openMeta();
    const box = document.getElementById('meta'), r = box.getBoundingClientRect();
    ok('★ 노드창 가로가 화면의 90% 이상', r.width >= innerWidth * 0.9, { w: Math.round(r.width), vw: innerWidth });
    ok('★ 노드창 세로가 화면의 85% 이상', r.height >= innerHeight * 0.85, { h: Math.round(r.height), vh: innerHeight });
    ok('판 좌표계도 같이 커졌다 (MB_R 24 / MB_ROW 82)', MB_R === 24 && MB_ROW === 82, { MB_R, MB_ROW, MB_W });
    const nd = document.querySelector('#metalist .mnd');
    const ndr = nd.getBoundingClientRect();
    ok('★ 노드 원이 48px (옛 34px)', Math.round(ndr.width) === 48, { w: Math.round(ndr.width) });
    const img = nd.querySelector('img');
    ok('★ 노드 아이콘이 30px (옛 20px)', Math.round(img.getBoundingClientRect().width) === 30);
    // dataURL 이라 naturalWidth 는 로드 전이면 0 이다 — PNG 헤더(IHDR)에서 직접 폭을 읽는다
    const bin = atob(metaIcoUrl('sword', '#fff').split(',')[1]);
    const pw = (bin.charCodeAt(16) << 24) | (bin.charCodeAt(17) << 16) | (bin.charCodeAt(18) << 8) | bin.charCodeAt(19);
    ok('아이콘 원본 캔버스도 2배(40px)로 구워졌다 — 확대해도 흐려지지 않는다', pw === 40, { pngWidth: pw });
    const cs = getComputedStyle(document.querySelector('#metalist .mtpt'));
    ok('★ 포인트 글자 20px 이상', parseFloat(cs.fontSize) >= 20, { fontSize: cs.fontSize });
    metaSelect(document.querySelector('#metalist .mnd').getAttribute('onclick').match(/'([^']+)'/)[1]);
    const ts = getComputedStyle(document.querySelector('#metalist .mstitle'));
    const ds = getComputedStyle(document.querySelector('#metalist .msdesc'));
    ok('★ 설명 제목 18px 이상 · 본문 13px 이상', parseFloat(ts.fontSize) >= 18 && parseFloat(ds.fontSize) >= 13,
       { title: ts.fontSize, desc: ds.fontSize });
    // 노드가 서로 겹치지 않는가 (원 48px → 중심 간 44px 이상이어야 한다)
    let worst = 9999, pair = null;
    document.querySelectorAll('#metalist .mboard').forEach(b => {
      const ns = [...b.querySelectorAll('.mnd')].map(e => {
        const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, n: e.title };
      });
      for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
        const d = Math.hypot(ns[i].x - ns[j].x, ns[i].y - ns[j].y);
        if (d < worst) { worst = d; pair = [ns[i].n, ns[j].n]; }
      }
    });
    ok('★ 노드끼리 겹치지 않는다 (중심 간 44px 이상)', worst >= 44, { 최소간격: Math.round(worst), pair });
    ok('탭(노드 / 업적·도감)은 그대로다', document.querySelectorAll('#metalist .mtab').length === 2);
    closeP('meta');
    return L;
  });

  await run('2) ★ 상점 — 인사말 → 구매/판매 선택 → 목록 (R24), 창은 반투명', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    hubShow('seo');
    hubEnter('shop');
    ok('시설 화면이 열렸다', document.getElementById('facov').style.display === 'block' && FAC.k === 'shop');
    // ── 1단계: 인사말
    ok('★ 처음에는 인사 단계다', FAC.step === 'greet');
    const talk = document.getElementById('factalk');
    ok('★ 인사말 창이 떴다', talk.style.display === 'block' && talk.className === 'greet');
    ok('★ 서대륙 특색 대사 (추위를 뚫고 온 …)', /추위를 뚫고/.test(talk.innerHTML), { line: talk.textContent.slice(0, 40) });
    ok('★ 구매하기 / 판매하기 버튼이 있다',
       /구 매 하 기/.test(talk.innerHTML) && /판 매 하 기/.test(talk.innerHTML));
    ok('★ 인사 단계에서는 창이 그림을 가리지 않는다 (도킹된 패널 0)',
       document.getElementById('facslotA').children.length === 0
       && document.getElementById('shop').parentNode.id !== 'facslotA');
    // ── 2단계: 구매
    facStep('buy');
    const sh = document.getElementById('shop');
    ok('★ 구매를 고르면 구매 목록만 뜬다', FAC.step === 'buy' && sh.parentNode.id === 'facslotA'
       && document.getElementById('inv').parentNode.id !== 'facslotB');
    ok('구매 목록이 채워졌다', document.getElementById('shoplist').children.length > 3);
    const a = sh.getBoundingClientRect();
    ok('★ 목록이 화면의 60% 이하 — 배경 그림(주인)이 보인다', a.width <= innerWidth * 0.6,
       { listW: Math.round(a.width), vw: innerWidth });
    const bg = getComputedStyle(sh).backgroundImage + getComputedStyle(sh).backgroundColor;
    const alphas = (bg.match(/rgba\([^)]*?,\s*([0-9.]+)\)/g) || []).map(s2 => parseFloat(s2.match(/,\s*([0-9.]+)\)$/)[1]));
    ok('★ 창이 반투명하다 (불투명 1.0 이 아니다)', alphas.length > 0 && Math.max(...alphas) < 0.95,
       { alpha: alphas });
    ok('목록 단계에서는 대사가 한 줄 띠로 접힌다', talk.className === 'bar' && /구매/.test(talk.innerHTML));
    // ── 3단계: 판매
    addItem('hpot', 3); addItem('longsw', 1);
    facStep('sell');
    ok('★ 판매를 고르면 판매 가능 목록이 뜬다', FAC.step === 'sell'
       && document.getElementById('inv').parentNode.id === 'facslotA'
       && document.getElementById('shop').parentNode.id !== 'facslotA');
    ok('★ 목록에 "판매 가능 목록" 안내가 있다', /판매 가능 목록/.test(document.getElementById('invlist').innerHTML));
    const eqName = P.eq.weapon ? ITEMS[P.eq.weapon.k].n : null;
    ok('★ 장착 중인 장비는 판매 목록에서 빠진다',
       !eqName || document.getElementById('invlist').innerHTML.indexOf(eqName + ' [장착]') < 0, { 장착: eqName });
    /* R27 가방 개편 — 목록은 아이콘 격자(.icell)가 되었고, 낱개 판매 버튼은
       아이콘을 누르면 뜨는 오른쪽 상세 패널(#facinfo)로 옮겨졌다. */
    const cells = [...document.querySelectorAll('#invlist .icell')];
    ok('★ 판매 목록이 아이콘 격자로 뜬다', cells.length > 0, { 칸: cells.length });
    cells[0].click();
    const sell = [...document.querySelectorAll('#facinfo .ib')].filter(b2 => /^판\s*매/.test(b2.textContent));
    ok('★ 판매 버튼이 보인다 (shopOpen 유지)', shopOpen === true && sell.length > 0, { 판매버튼: sell.length });
    ok('판매 목록에는 순서이동(▲▼) 버튼이 없다 — 행동이 하나로 좁혀졌다',
       [...document.querySelectorAll('#invlist .mvb')].length === 0);
    /* ★ 겹침의 실질 판정 — 그 자리를 실제로 누르면 그 버튼이 잡히는가.
       예전 겹침 버그에서는 위에 덮인 창이 잡혀 클릭이 상점 창으로 먹혔다.
       (판매 후에는 refreshInv 가 목록을 다시 그려 버튼이 교체되므로 **판매 전에** 확인한다.) */
    const rect = sell.length ? sell[0].getBoundingClientRect() : null;
    const hitEl = rect ? document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) : null;
    ok('★ 판매 버튼 자리를 누르면 판매 버튼이 잡힌다 (가려지지 않았다)',
       !!rect && rect.width > 0 && hitEl === sell[0], { hit: hitEl && hitEl.textContent });
    const goldBefore = P.gold;
    if (sell.length) sell[0].click();
    ok('★ 판매가 실제로 처리된다 (은화 증가)', P.gold > goldBefore, { before: goldBefore, after: P.gold });
    return L;
  });

  await run('3) 시설마다 배경이 갈리고, 간판은 지역을 따라간다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const cv = document.getElementById('facbg');
    ok('배경 캔버스가 화면 크기로 잡혔다', cv.width > 600 && cv.height > 400, { w: cv.width, h: cv.height });
    const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
    let uniq = {}, n = 0;
    for (let i = 0; i < d.length; i += 4 * 997) { uniq[d[i] + ',' + d[i + 1] + ',' + d[i + 2]] = 1; n++; }
    ok('★ 배경이 그려졌다 (단색이 아니다)', Object.keys(uniq).length > 8, { 표본: n, 색수: Object.keys(uniq).length });
    ok('그림 파일 규칙이 있다 (fac_<지역>_<시설>.jpg)', facArtName('seo', 'shop') === 'fac_seo_shop.jpg');
    ok('그림 없는 시설은 절차 배경으로 폴백한다 (인벤토리·노드)', typeof HUBART === 'object' && !HUBART['fac_seo_inv.jpg']);
    ok('★ 서대륙 간판 = 성읍 잡화상', document.getElementById('facname').innerHTML.indexOf('성읍 잡화상') >= 0);
    facClose();
    hubSwitch('dong'); hubEnter('shop');
    ok('★ 동대륙에서는 간판이 산길 객잔으로 바뀐다', document.getElementById('facname').innerHTML.indexOf('산길 객잔') >= 0,
       { sign: (document.getElementById('facname').innerHTML.match(/<b>([^<]+)<\/b>/) || [])[1] });
    ok('주인·대사도 함께 나온다', /가객/.test(document.getElementById('facname').innerHTML));
    ok('★ 인사말도 지역을 따라간다 (동대륙 = 산을 넘어오셨구려)',
       /산을 넘어오셨구려/.test(document.getElementById('factalk').innerHTML));
    facClose(); hubSwitch('ma'); hubEnter('shop');
    ok('★ 마경 인사말 (죽으러 가는 길에 …)', /죽으러 가는 길/.test(document.getElementById('factalk').innerHTML));
    ok('★ 시설 그림 9장이 실제로 들어갔다',
       ['fac_seo_shop.jpg','fac_dong_shop.jpg','fac_ma_shop.jpg','fac_seo_shrine.jpg','fac_dong_shrine.jpg',
        'fac_ma_shrine.jpg','fac_seo_guild.jpg','fac_dong_guild.jpg','fac_ma_guild.jpg']
         .every(f => !!HUBART[f]),
       { 내장: Object.keys(HUBART).length });
    facClose(); hubSwitch('dong');
    facClose();
    hubEnter('node');
    ok('★ 노드도 시설 화면으로 들어간다', FAC.k === 'node' && document.getElementById('meta').parentNode.id === 'facslotA');
    ok('한 칸만 쓰는 시설은 1단 (노드는 폭 제한 해제 = wide)',
       /(^| )one( |$)/.test(document.getElementById('facdock').className)
       && /wide/.test(document.getElementById('facdock').className)
       && document.getElementById('facslotB').style.display === 'none',
       { cls: document.getElementById('facdock').className });
    const mw = document.getElementById('meta').getBoundingClientRect().width;
    ok('★ 노드판이 시설 화면에서도 폭을 다 쓴다 (계열 4개가 안 잘린다)', mw >= innerWidth * 0.9,
       { metaW: Math.round(mw), vw: innerWidth });
    facClose();
    hubEnter('guild');
    ok('길드도 시설 화면 + 게시판', FAC.k === 'guild' && document.getElementById('qlist').innerHTML.indexOf('의뢰 게시판') >= 0);
    facClose();
    ok('★ 닫으면 패널이 제자리로 돌아간다 (도킹 흔적 없음)',
       document.getElementById('shop').parentNode.id !== 'facslotA'
       && document.getElementById('inv').classList.contains('fdock') === false
       && document.getElementById('facov').style.display === 'none');
    ok('허브는 그대로 열려 있다', HUB.open === true);
    return L;
  });

  await run('4) ★ 필드에 보이지 않는 벽이 없다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const rep = [];
    let ghosts = 0, fields = 0;
    world.forEach((z, zi) => {
      const def = z.def;
      if (def.rooms !== false || def.cross) return;   /* 필드만 */
      /* R28 — 동대륙은 layout(산길·협곡·계단)으로 **일부러 절벽을 세운** 지형이다.
         개활지 규칙(그림 없는 칸은 통행 가능)을 적용하면 길 구조가 사라진다.
         그 층의 "길에 닿은 벽은 전부 보인다 / 모든 문·몹에 닿는다" 는 verify_r28c_east.js 가 본다. */
      if (def.layout) return;
      fields++;
      const seen = {};
      z.obs.forEach(o => { seen[o.x + ',' + o.y] = o.k; });
      let bad = 0, blocked = 0, open = 0;
      for (let y = 1; y < def.h - 1; y++) for (let x = 1; x < def.w - 1; x++) {
        if (z.g[y][x]) { blocked++; if (!seen[x + ',' + y]) bad++; } else open++;
      }
      ghosts += bad;
      rep.push({ z: zi, n: def.name, 막힌칸: blocked, 유령벽: bad, 통행률: Math.round(open / (open + blocked) * 100) + '%' });
    });
    ok('필드 존을 찾았다', fields >= 2, { 필드수: fields });
    ok('★ 그림 없이 막는 칸(보이지 않는 벽)이 0개', ghosts === 0, rep);
    ok('필드 통행률이 90% 이상 — 편하게 돌아다닐 수 있다',
       rep.every(r => parseInt(r.통행률) >= 90), rep.map(r => r.n + ' ' + r.통행률));
    // 던전은 손대지 않았는지 (구조가 유지돼야 한다)
    const dun = world.filter(z => z.def.rooms === true);
    ok('던전 벽 구조는 그대로 (방을 나누는 벽이 남아 있다)',
       dun.length > 0 && dun.every(z => {
         let b = 0; for (let y = 1; y < z.def.h - 1; y++) for (let x = 1; x < z.def.w - 1; x++) if (z.g[y][x]) b++;
         return b > 20;
       }), { 던전수: dun.length });
    return L;
  });

  await run('5) ★ 변신 개편 — 지속 10~15분 · 보스 해금 · 외형/능력치 선택 · 노란 띠', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const durs = {}; Object.keys(TFS).forEach(k => durs[k] = TFS[k].dur);
    ok('★ 모든 변신 지속이 10~15분(600~900초)', Object.keys(TFS).every(k => TFS[k].dur >= 600 && TFS[k].dur <= 900), durs);
    ok('지속시간을 분으로 읽어 준다', tfDurText(900) === '15분' && tfDurText(660) === '11분', { s900: tfDurText(900), s660: tfDurText(660) });
    // 보스 해금
    P.tfUnlock = [];
    ok('보스 변신은 처음에 목록에 없다', (() => { openTf(); return document.getElementById('tflist').innerHTML.indexOf('무르갓') < 0; })());
    ok('중간보스(무르갓)도 tfkey 를 갖는다 = 잡으면 열린다', MOBS.orcchief.tfkey === 'orcchief' && !!TFS.orcchief);
    ok('변종도 같은 형상을 연다 (원종 데이터 복사)', !MOBS['orcchief@redhi'] || MOBS['orcchief@redhi'].tfkey === 'orcchief');
    unlockTf('orcchief'); unlockTf('dk'); openTf();
    ok('★ 해금하면 목록에 뜬다', document.getElementById('tflist').innerHTML.indexOf('무르갓') >= 0);
    // 외형 / 능력치 선택창
    tfAsk('orcchief');
    const ask = document.getElementById('tflist').innerHTML;
    ok('★ 외형/능력치를 묻는 창이 뜬다', /외형까지 바꾼다/.test(ask) && /능력치만 습득한다/.test(ask));
    // 능력치만
    applyTf('orcchief', false);
    const clsAct = ACT[CLS[P.cls].act];
    ok('★ 능력치만 — 내 계열 외형 유지', P.tfSkin === false && actorOf() === clsAct && tfSkinOn() === false);
    ok('능력치는 그대로 얹힌다 (변신 보정이 들어간다)', pAC() <= 10 && pMaxHit()[1] > 0, { ac: pAC(), hit: pMaxHit() });
    const dmgSkinOff = pMaxHit()[1];
    // 외형까지
    applyTf('orcchief', true);
    ok('★ 외형까지 — 액터가 마수 것으로 바뀐다', P.tfSkin === true && actorOf() === ACT[TFS.orcchief.act] && tfSkinOn() === true);
    ok('★ 능력치는 두 방식이 완전히 같다', pMaxHit()[1] === dmgSkinOff, { 능력치만: dmgSkinOff, 외형까지: pMaxHit()[1] });
    ok('남은 시간이 10~15분 사이로 흐른다', tfRemain() > 590 && tfRemain() <= 900, { 남은초: tfRemain() });
    // 시트 + 노란 띠
    const sheetOk = !!(typeof MSH !== 'undefined' && MSH.set[TFS.orcchief.act] && MSH.set[TFS.orcchief.act].ok);
    ok('변신체 몹 시트가 로드돼 있다 (옛 픽셀 드로잉 아님)', sheetOk, { sheet: TFS.orcchief.act });
    if (sheetOk) {
      const cv = tfRimFrame(TFS.orcchief.act, 'idle_s', 0);
      ok('★ 테두리 프레임이 구워진다', !!cv && cv.width > 2);
      const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
      let yellow = 0, other = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 40) continue;
        if (d[i] > 210 && d[i + 1] > 170 && d[i + 1] < 235 && d[i + 2] < 120) yellow++; else other++;
      }
      ok('★ 노란 띠가 실제로 둘러졌다', yellow > 20, { 노란픽셀: yellow });
      ok('★ 본체는 원색 그대로다 (전체를 노랗게 칠하지 않았다)', other > yellow * 2, { 원색픽셀: other, 노란픽셀: yellow });
      ok('시트 그리기 함수가 성공한다', drawTfSheet(TFS.orcchief.act, P, 100, 100, 1) === true);
    }
    P.tf = null; P.tfT = 0; closeP('tf');
    ok('해제하면 원래대로', actorOf() === clsAct && tfSkinOn() === false);
    ok('★ 저장/복구에 외형 선택이 남는다', (() => {
      P.tf = 'orcchief'; P.tfT = T + 700; P.tfSkin = false;
      /* packSave 는 base64(JSON) 문자열을 돌려준다 — 풀어서 확인한다 */
      const s = JSON.parse(decodeURIComponent(escape(atob(packSave()))));
      if (!(s.tf === 'orcchief' && s.tfSkin === false && s.tfR > 600)) return false;
      P.tf = null; P.tfSkin = true;
      s.tfSkin = false; unpackBuffs(s.bf);
      P.tf = s.tf; P.tfT = T + s.tfR; P.tfSkin = s.tfSkin !== false;   /* 17_save.js 의 복구 규칙과 동일 */
      return P.tfSkin === false && tfSkinOn() === false && P.tf === 'orcchief';
    })());
    P.tf = null; P.tfT = 0; P.tfSkin = true;
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
