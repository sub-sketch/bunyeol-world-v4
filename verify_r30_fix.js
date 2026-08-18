// R30 검증: 옛 세이브 불러오기(조용한 실패 제거) · UI 배율 · 강화 확인창(가운데 + 일괄) · 배경 채움 밝기
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const all = [], errors = [];
  const ok = (n, c, x) => { all.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); console.log(all[all.length - 1]); };

  const boot = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', e => { if (!/atob/.test(e.message)) errors.push(e.message); });
    page.on('console', m => {
      if (m.type() !== 'error') return;
      /* '[불러오기 실패]' 는 이번 라운드에서 **일부러** 남기는 진단 로그다(망가진 세이브 시험) */
      if (/\[불러오기 실패\]/.test(m.text())) return;
      errors.push(m.text());
    });
    await page.goto(url);
    await page.waitForTimeout(1300);
    try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
    for (let i = 0; i < 3; i++) { try { await page.mouse.click(Math.round(w / 2), Math.round(h / 2)); } catch (e) {} await page.waitForTimeout(170); }
    await page.evaluate(() => {
      try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
      if (!P) startGame();
      ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    });
    return page;
  };

  /* ───────── 1) 옛 세이브가 조용히 실패하지 않는다 ───────── */
  console.log('\n=== 1) ★ 옛/깨진 세이브 — 살려서 불러오고, 무엇을 버렸는지 알려 준다 ===');
  const p1 = await boot(1400, 900);
  const L1 = await p1.evaluate(() => {
    const out = [];
    const mk = (mut) => {
      const s = { v:3, cls:'k', name:'test', lv:18, xp:1000, hp:200, mhp:200, mp:20, mmp:20,
        str:16,dex:12,con:14,int:8,wis:8, gold:5000, kills:100, bossKilled:false,
        q:{}, qd:{}, lore:{}, qcur:null, inv:[['hpot',3,0,''],['gladius',1,0,'weapon']] };
      mut(s); return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
    };
    const run = (label, code) => {
      started = false; P = null;
      const note = document.getElementById('loadnote');
      if (note) { note.style.display = 'none'; note.innerHTML = ''; }
      applyLoad(code);
      out.push({ label: label, started: !!started, name: P ? P.name : null,
                 note: note ? note.innerText.slice(0, 70) : '', noteShown: note ? note.style.display === 'block' : false });
    };
    run('없는 퀘스트를 진행 중', mk(s => { s.q = { qGONE_OLD: { p: [0] } }; s.qcur = 'qGONE_OLD'; }));
    run('없는 변신 형상', mk(s => { s.tf = 'no_such_mob'; s.tfR = 300; }));
    run('없는 완료기록 + 없는 아이템', mk(s => { s.qd = { qNOPE: 1 }; s.inv = [['no_item', 1, 0, ''], ['hpot', 1, 0, '']]; }));
    run('정상 세이브', mk(s => {}));
    run('망가진 문자열', 'not-a-real-save');
    return out;
  });
  L1.slice(0, 3).forEach(r => {
    ok('★ [' + r.label + '] 캐릭터가 열린다', r.started === true && r.name === 'test', { started: r.started });
    ok('★ [' + r.label + '] 무엇을 정리했는지 화면에 뜬다', r.noteShown && /정리/.test(r.note), { 안내: r.note });
  });
  ok('정상 세이브는 안내 없이 그냥 열린다', L1[3].started === true, { note: L1[3].note });
  ok('★ 진짜 못 읽는 데이터는 이유를 화면에 적는다 (조용히 실패 금지)',
     L1[4].noteShown === true && /읽지 못했습니다|저장 데이터/.test(L1[4].note), { 안내: L1[4].note });

  /* ───────── 2) UI 배율 ───────── */
  console.log('\n=== 2) ★ 큰 화면에서 UI가 커진다 (초광폭 2600x1007) ===');
  const p2 = await boot(2600, 1007);
  const L2 = await p2.evaluate(() => {
    hubShow('seo'); hubEnter('shop'); facStep('buy');
    const z = getComputedStyle(document.documentElement).getPropertyValue('--uiz').trim();
    const sh = document.getElementById('shop');
    const ico = document.querySelector('#shoplist .ico');
    const bg = document.getElementById('facbg');
    return { uiz: parseFloat(z), auto: (typeof uiZoom === 'function') ? uiZoom() : null,
             panelW: Math.round(sh.getBoundingClientRect().width),
             icoW: ico ? Math.round(ico.getBoundingClientRect().width) : 0,
             panelScrolls: sh.scrollHeight > sh.clientHeight + 2,
             canvas: [bg.width, bg.height], vw: innerWidth };
  });
  ok('★ 자동 배율이 1보다 크다 (초광폭)', L2.uiz > 1.1, { 배율: L2.uiz });
  ok('★ 패널이 실제로 커졌다 (560 → 700px 이상)', L2.panelW >= 700, { 패널폭: L2.panelW });
  ok('★ 아이콘도 함께 커졌다 (38 → 45px 이상)', L2.icoW >= 45, { 아이콘: L2.icoW });
  ok('★ 배경 캔버스 해상도는 그대로다 (zoom 이 그림을 흐리지 않는다)',
     L2.canvas[0] >= L2.vw - 2, { 캔버스: L2.canvas, 화면폭: L2.vw });
  ok('★ 목록이 넘치면 패널이 스크롤된다 (잘려서 안 보이지 않게)', L2.panelScrolls === true);
  const L2b = await p2.evaluate(() => {
    /* 수동 지정도 되는지 */
    optSet('uiz', 1); const a = getComputedStyle(document.documentElement).getPropertyValue('--uiz').trim();
    optSet('uiz', 1.5); const b = getComputedStyle(document.documentElement).getPropertyValue('--uiz').trim();
    optSet('uiz', 0); const c = getComputedStyle(document.documentElement).getPropertyValue('--uiz').trim();
    openOpt();
    return { 백퍼: a, 백오십: b, 자동: c,
             /* R31c — 배율은 '시설 화면 크기'로 좁혀졌다(틀 안쪽 패널은 「화면 배율」이 담당) */
             설정에있다: /시설 화면 크기/.test(document.getElementById('optbody').innerText) };
  });
  ok('★ 설정에서 시설 화면 크기를 고를 수 있다', L2b.설정에있다 === true, L2b);
  ok('수동 지정이 그대로 적용된다', parseFloat(L2b.백퍼) === 1 && parseFloat(L2b.자동) > 1, L2b);
  ok('1280x800 이하에서는 배율 1 (예전 화면 그대로)',
     (await (await boot(1280, 800)).evaluate(() => uiZoom())) === 1);

  /* ───────── 3) 강화 확인창 ───────── */
  console.log('\n=== 3) ★ 강화 — 가운데 확인창 + 안전구간 일괄 강화 ===');
  const p3 = await boot(1600, 950);
  const L3 = await p3.evaluate(() => {
    const out = {};
    const sk = Object.keys(ITEMS).find(k => ITEMS[k].ench === 'weapon');
    addItem(sk, 5); addItem('longsw', 1);
    const it = P.inv.find(x => ITEMS[x.k].t === 'weapon' && !isEquipped(x)) || P.inv.find(x => ITEMS[x.k].t === 'weapon');
    out.weapon = ITEMS[it.k].n;
    useIt(P.inv.find(x => x.k === sk));                    /* 주문서 사용 → 강화 대기 */
    out.hint = document.getElementById('enchhint').style.display;
    /* 격자에서 무기 칸 클릭 */
    const cells = [...document.querySelectorAll('#invlist .icell')];
    const idx = P.inv.indexOf(it);
    if (cells[idx]) cells[idx].click();
    const fi = document.getElementById('facinfo');
    out.panelShown = fi.style.display === 'block';
    out.mid = fi.className.indexOf('mid') >= 0;
    const r = fi.getBoundingClientRect();
    out.centerX = Math.round(r.x + r.width / 2); out.vw = innerWidth;
    out.btns = [...fi.querySelectorAll('.ib')].map(b => b.textContent.replace(/\s+/g, ' ').trim());
    out.enchLeft = it.e || 0;
    out.scrolls = (P.inv.find(x => x.k === sk) || {}).q || 0;
    return out;
  });
  ok('주문서를 쓰면 강화 대기 안내가 뜬다', L3.hint === 'block');
  ok('★ 격자에서 장비를 누르면 확인창이 뜬다 (예전엔 곧바로 한 장 소모됐다)', L3.panelShown === true);
  ok('★ 확인창이 화면 가운데다 (오른쪽 끝이 아니다)',
     L3.mid === true && Math.abs(L3.centerX - L3.vw / 2) < L3.vw * 0.12,
     { 중심x: L3.centerX, 화면중앙: Math.round(L3.vw / 2) });
  ok('★ 「안전 구간까지 일괄」 버튼이 있다', L3.btns.some(b => /까지/.test(b)), { 버튼: L3.btns });
  ok('단발 강화와 취소도 있다', L3.btns.some(b => /강화 \(1장\)/.test(b)) && L3.btns.some(b => /취소/.test(b)), { 버튼: L3.btns });
  /* 실제로 일괄 강화 실행 */
  await p3.evaluate(() => {
    const fi = document.getElementById('facinfo');
    const bulk = [...fi.querySelectorAll('.ib')].find(b => /까지/.test(b.textContent));
    if (bulk) bulk.click();
  });
  await p3.waitForTimeout(2600);
  const L3b = await p3.evaluate(() => {
    /* 강화 대상은 '미장착 무기'였다 — 장착 중인 무기와 헷갈리지 않게 최댓값으로 본다 */
    const ws = P.inv.filter(x => ITEMS[x.k].t === 'weapon');
    const w = ws.sort((a, b) => (b.e || 0) - (a.e || 0))[0];
    const sk = Object.keys(ITEMS).find(k => ITEMS[k].ench === 'weapon');
    return { e: w ? (w.e || 0) : -1, scrolls: (P.inv.find(x => x.k === sk) || {}).q || 0,
             busy: (typeof enchBusy !== 'undefined') ? enchBusy : null };
  });
  ok('★ 일괄 강화가 실제로 여러 단계 올린다 (+2 이상)', L3b.e >= 2, { 강화: '+' + L3b.e, 남은주문서: L3b.scrolls });
  ok('연출이 끝나면 잠금이 풀린다', L3b.busy === false, { busy: L3b.busy });

  /* ───────── 3-b) 장착 확인창이 가방 옆에 붙는다 ───────── */
  console.log('\n=== 3-b) ★ 장착 확인창이 손 가까이 (가방 바로 옆) ===');
  const L3c = await p3.evaluate(() => {
    facInfoClear();
    openP('inv'); refreshInv();
    const cells = [...document.querySelectorAll('#invlist .icell')];
    const idx = P.inv.findIndex(x => SLOTN[ITEMS[x.k].t] !== undefined);
    if (cells[idx]) cells[idx].click();
    const fi = document.getElementById('facinfo'), inv = document.getElementById('inv');
    const a = fi.getBoundingClientRect(), b = inv.getBoundingClientRect();
    /* 오른쪽이든 왼쪽이든 '가방에 붙어 있는가' 를 본다 */
    const gapR = Math.round(a.left - b.right), gapL = Math.round(b.left - a.right);
    return { cls: fi.className, gap: Math.min(Math.abs(gapR), Math.abs(gapL)),
             side: Math.abs(gapR) <= Math.abs(gapL) ? '오른쪽' : '왼쪽', shown: fi.style.display === 'block',
             btns: [...fi.querySelectorAll('.ib')].map(x => x.textContent.replace(/\s+/g, '')),
             vw: innerWidth, fiRight: Math.round(a.right) };
  });
  ok('★ 단독 가방에서는 상세창이 가방 바로 옆에 붙는다 (화면 끝이 아니다)',
     L3c.cls === 'near' && L3c.gap < 40, { 간격: L3c.gap, 쪽: L3c.side, 클래스: L3c.cls });
  ok('장착 버튼이 그 창에 있다', L3c.btns.some(b2 => /장착|해제/.test(b2)), { 버튼: L3c.btns });

  /* ───────── 3-c) 자동 스킬 칸마다 자동/수동 ───────── */
  console.log('\n=== 3-c) ★ 스킬 4칸 — 칸마다 자동/수동 지정 ===');
  const L3d = await p3.evaluate(() => {
    const out = {};
    try { META.pt = 3000; metaSave(); } catch (e) {}
    /* 스킬 두 개를 강제로 습득 상태로 만든다 */
    const ks = mySkills().slice(0, 2).map(s2 => s2.id);
    ks.forEach(id => { META.sk = META.sk || {}; META.sk[id] = 1; });
    try { metaSave(); } catch (e) {}
    refreshSkillPanel();
    out.known = mySkills().filter(s2 => skKnown(s2.id)).map(s2 => s2.id);
    aslotSet(0, out.known[0]); aslotSet(1, out.known[1] || out.known[0]);
    out.aslot = P.aslot.slice(0);
    /* 패널에 자동/수동 버튼이 있는가 */
    const rows = [...document.querySelectorAll('#sklist .skrow')];
    const toggles = rows.map(r => [...r.querySelectorAll('.ib')].map(b => b.textContent)).flat()
      .filter(t => /자동|수동/.test(t));
    out.toggles = toggles.length;
    /* 1번 칸만 자동, 2번은 수동 */
    aautoSet(0, true); aautoSet(1, false);
    out.aauto = P.aauto.slice(0);
    /* 자동 시전이 수동 칸을 건너뛰는가 — 1번 칸을 쿨다운으로 막고 확인 */
    P.mp = P.mmp = 999;
    const s1 = out.known[0], s2 = out.known[1];
    P.cd = P.cd || {};
    P.cd[s1] = T + 999;                      /* 자동 칸은 못 쓰게 막는다 */
    const fired = [];
    const orig = window.castSkill;
    window.castSkill = function (i) { fired.push(mySkills()[i].id); };
    const zi = 1; travel(zi, ZONES[zi].gates[0].x, ZONES[zi].gates[0].y);
    const m = world[zi].mobs.find(x => !x.dead);
    P.tgt = m;
    for (let i = 0; i < 5; i++) autoCastSkill(world[zi], m);
    window.castSkill = orig;
    out.fired = fired;
    return out;
  });
  ok('★ 칸마다 자동/수동 버튼이 있다 (4칸)', L3d.toggles >= 4, { 버튼수: L3d.toggles });
  ok('★ 지정이 저장된다', L3d.aauto[0] === true && L3d.aauto[1] === false, { aauto: L3d.aauto });
  ok('★ 수동으로 둔 칸은 자동에서 건너뛴다',
     L3d.fired.indexOf(L3d.aslot[1]) < 0, { 자동발동: L3d.fired, 수동칸: L3d.aslot[1] });

  /* ───────── 3-d) 퀵슬롯 자리 옵션 ───────── */
  console.log('\n=== 3-d) 퀵슬롯 자리 (자동/하단/우측) ===');
  const L3e = await p2.evaluate(() => {
    const st = () => ({ rail: document.getElementById('srail').className === 'on',
                        bottom: getComputedStyle(document.getElementById('quick')).display !== 'none' });
    optSet('qpos', 2); const right = st();
    optSet('qpos', 1); const bottom = st();
    optSet('qpos', 0); const auto = st();
    const q0 = document.getElementById('quick');
    const wrap = getComputedStyle(q0).flexWrap;
    return { right: right, bottom: bottom, auto: auto, wrap: wrap };
  });
  ok('★ 「우측」을 고르면 레일로 간다', L3e.right.rail === true && L3e.right.bottom === false, L3e.right);
  ok('★ 「하단」을 고르면 하단 퀵바로 온다', L3e.bottom.rail === false && L3e.bottom.bottom === true, L3e.bottom);
  /* R31c — 가로 스크롤은 철회했다(대표 지적: "밀어서 되는 인터페이스는 처음 봄").
     버튼이 많아 지저분하면 「퀵슬롯 자리 → 우측」으로 옮기는 것이 해법이다. */
  ok('하단 퀵바에 가로 스크롤이 없다', L3e.wrap === 'wrap', { flexWrap: L3e.wrap });

  /* ───────── 4) 배경 채움 밝기 ───────── */
  console.log('\n=== 4) ★ 남는 자리 채움이 검은 띠로 보이지 않는다 ===');
  const L4 = await p2.evaluate(() => {
    facClose(); hubShow('seo'); hubEnter('shop');
    return new Promise(res => setTimeout(() => {
      const cv = document.getElementById('facbg'), g = cv.getContext('2d');
      const row = (y) => { let mx = 0; const d = g.getImageData(0, y, cv.width, 1).data;
        for (let x = 8; x < cv.width - 8; x += 8) { const i = x * 4, v = d[i] + d[i+1] + d[i+2]; if (v > mx) mx = v; }
        return mx; };
      res({ left: row(Math.round(cv.height / 2)), top: row(4), bottom: row(cv.height - 5) });
    }, 900));
  });
  ok('★ 채움이 예전(합 25 수준)보다 밝다', L4.left >= 60, L4);

  /* ───────── 5) R31 — 거점 = 그 지역의 부 / 은화 보존 ───────── */
  console.log('\n=== 5) ★ 거점에서 나서면 그 지역 던전으로 · 마을 은화는 남는다 ===');
  const p5 = await boot(1400, 900);
  const L5 = await p5.evaluate(() => {
    const out = {};
    try { META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
    const depart = (reg) => {
      if (RUN) { RUN.live = false; RUN = null; }
      travel(0, 10, 9);
      hubShow(reg); hubDepart();
      return { zone: ZONES[curZ].name, floor: (typeof FLOOR_OF !== 'undefined') ? FLOOR_OF[curZ] : null };
    };
    out.seo = depart('seo');
    out.dong = depart('dong');
    out.ma = depart('ma');
    /* 아직 안 열린 부에서 나서면 이유를 알려 주고 열린 곳으로 넣는다 */
    if (RUN) { RUN.live = false; RUN = null; }
    travel(0, 10, 9);
    META.clear2 = 0; metaSave();
    hubShow('ma'); hubDepart();
    out.locked = { zone: ZONES[curZ].name, floor: (typeof FLOOR_OF !== 'undefined') ? FLOOR_OF[curZ] : null };
    META.clear2 = 1; metaSave();
    /* 은화 보존 */
    if (RUN) { RUN.live = false; RUN = null; }
    travel(0, 10, 9);
    P.gold = 50000;
    runStart();
    out.goldIn = RUN.goldIn;
    P.gold += 3000;
    RUN.result = 'clear';
    settleClose();
    out.afterSettle = P.gold;
    /* 던전에서 가져간 돈보다 많이 쓴 경우 — 실제로 줄어야 한다 */
    P.gold = 10000; runStart(); P.gold -= 4000; RUN.result = 'escape'; settleClose();
    out.spentMore = P.gold;
    return out;
  });
  ok('★ 서대륙 거점 → 1부(서리들녘 1층)', /서리들녘/.test(L5.seo.zone) && L5.seo.floor === 1, L5.seo);
  ok('★ 동대륙 거점 → 2부(잿빛 산길 6층)', /동대륙/.test(L5.dong.zone) && L5.dong.floor === 6, L5.dong);
  ok('★ 마경 거점 → 3부(남빛 입구 9층)', /마경/.test(L5.ma.zone) && L5.ma.floor === 9, L5.ma);
  ok('★ 아직 안 열린 부에서는 열린 마지막 부로 넣는다 (못 나가는 일 없음)',
     L5.locked.floor === 6 || L5.locked.floor === 1, L5.locked);
  ok('★ 마을에서 가져간 은화가 정산 후에도 남는다 (예전엔 0이 됐다)',
     L5.afterSettle === 50000, { 가져간돈: L5.goldIn, 정산후: L5.afterSettle });
  ok('★ 런에서 번 은화는 사라진다 (긴장 요소 유지)', L5.afterSettle < 53000, { 정산후: L5.afterSettle });
  ok('★ 던전에서 가져간 돈보다 많이 쓰면 그만큼 줄어 있다', L5.spentMore === 6000, { 남은돈: L5.spentMore });

  /* ───────── 6) R31d/e — 창이 제자리에 뜨는가 (타이틀 위 / 틀 안) ───────── */
  console.log('\n=== 6) ★ 창 자리 — 타이틀에서도, 게임 안에서도 화면 안에 뜬다 ===');
  const p6 = await browser.newPage({ viewport: { width: 2323, height: 1209 } });
  p6.on('pageerror', e => errors.push(e.message));
  await p6.goto(url); await p6.waitForTimeout(1400);
  try { await p6.locator('text=건너뛰기').first().click({ timeout: 1400 }); } catch (e) {}
  await p6.waitForTimeout(300);
  const L6 = await p6.evaluate(() => {
    const box = (id) => { const e = document.getElementById(id), r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + 20));
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left),
               right: Math.round(r.right), 화면안: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
               위에보임: !!(hit && e.contains(hit)), inlineTop: e.style.top }; };
    try { META.mark = 'blade'; metaSave(); } catch (e) {}
    const out = {};
    /* 타이틀 화면 — 오버레이(z-index 30) 위로 올라와야 한다 */
    openSave(); out.titleSave = box('save'); closeP('save');
    openOpt();  out.titleOpt  = box('opt');  closeP('opt');
    /* 게임 시작 후 — 원래 자리(인라인 좌표)로 돌아와야 한다 */
    if (!P) startGame();
    ['markov','frewov','allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    openOpt();  out.gameOpt  = box('opt');  closeP('opt');
    openSave(); out.gameSave = box('save'); closeP('save');
    openP('inv'); out.gameInv = box('inv'); closeP('inv');
    return out;
  });
  ok('★ 타이틀에서 「이어하기」 창이 화면 안에 뜨고 그림 위로 보인다',
     L6.titleSave.화면안 && L6.titleSave.위에보임, L6.titleSave);
  ok('★ 타이틀에서 「설정」 창도 화면 안에 뜬다', L6.titleOpt.화면안 && L6.titleOpt.위에보임, L6.titleOpt);
  ok('★ 게임 안에서 설정창이 제자리(위쪽 26px)로 돌아온다 — 아래로 흘러내리지 않는다',
     L6.gameOpt.inlineTop === '26px' && L6.gameOpt.화면안, L6.gameOpt);
  ok('게임 안 저장창·가방도 화면 안에 있다', L6.gameSave.화면안 && L6.gameInv.화면안,
     { save: L6.gameSave, inv: L6.gameInv });
  await p6.close();

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.length + '건 중 FAIL ' + f + '건, 페이지오류 ' + errors.length + '건');
  console.log(f === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
