/* R32 검증: 계열별 노드판 + 스킬 구매 일원화 + 소환·벽·장판·순간이동 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [], all = [];

  async function open(cls) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    page.on('pageerror', e => errors.push('[' + cls + '] ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('[' + cls + '] ' + m.text()); });
    await page.goto(url);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { try { META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {} });
    try { await page.locator('text=건너뛰기').first().click({ timeout: 1200 }); } catch (e) {}
    for (let i = 0; i < 3; i++) { try { await page.mouse.click(700, 420); } catch (e) {} await page.waitForTimeout(150); }
    await page.evaluate(c => { pickCls = c; if (!P) startGame();
      const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none'; }, cls);
    await page.waitForTimeout(800);
    /* 필드로 나가서 몹을 치운다 — 스킬 시전 검사용 무대 */
    await page.evaluate(() => {
      if (RUN) { RUN.live = false; RUN = null; }
      travel(0, 10, 9); hubShow('seo'); hubDepart();
      document.querySelectorAll('.panel,.overlay').forEach(el => { if (el.id !== 'game') el.style.display = 'none'; });
      const z = world[curZ];
      z.mobs.length = 0; if (z.fnpc) z.fnpc.length = 0; z.def.npcs.length = 0;
      P.hp = P.mhp; P.mp = P.mmp = 999; P.dest = null; P.tgt = null;
    });
    await page.waitForTimeout(300);
    return page;
  }
  const run = async (page, title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  /* ---------- 1) 계열마다 다른 판 ---------- */
  const pk = await open('k');
  await run(pk, '1) 계열별 노드판', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const names = c => { const old = P.cls; P.cls = c; const r = metaTree().map(t => t.n); P.cls = old; return r; };
    const K = names('k'), E = names('e'), M = names('m');
    ok('기사 판 = 뿌리·검·방패·저울', K.join() === '뿌리,검(劍),방패(盾),저울(秤)', K);
    ok('정령 판 = 뿌리·활·숲·저울', E.join() === '뿌리,활(弓),숲(林),저울(秤)', E);
    ok('마도 판 = 뿌리·술·보·저울', M.join() === '뿌리,술(術),보(步),저울(秤)', M);
    ok('★ 세 판이 서로 다르다', K.join() !== E.join() && E.join() !== M.join());
    /* 판에 적힌 id 가 전부 실재하는가 — 오타 노드는 판에서 조용히 사라진다 */
    const bad = [];
    ['k','e','m'].forEach(c => { const old = P.cls; P.cls = c;
      metaTree().forEach(t => t.ids.forEach(id => { if (!metaNode(id) && !skillDef(id)) bad.push(c + ':' + id); }));
      P.cls = old; });
    ok('★ 판의 모든 id 가 실재(노드 또는 스킬)', bad.length === 0, bad);
    /* 계열 스킬은 자기 판에만 있어야 한다 */
    const leak = [];
    ['k','e','m'].forEach(c => { const old = P.cls; P.cls = c;
      metaTree().forEach(t => t.ids.forEach(id => {
        const own = skillDef(id) ? skillOwner(id) : null;
        if (own && own !== c) leak.push(c + '판에 ' + own + '스킬 ' + id);
      })); P.cls = old; });
    ok('★ 남의 계열 스킬이 판에 섞이지 않았다', leak.length === 0, leak);
    /* 전 계열 스킬이 어느 판에든 들어가 있는가 — 빠지면 영원히 못 배운다 */
    const miss = [];
    ['k','e','m'].forEach(c => { const old = P.cls; P.cls = c;
      const ids = {}; metaTree().forEach(t => t.ids.forEach(i => ids[i] = 1));
      SKILLS[c].forEach(sk => { if (!ids[sk.id]) miss.push(c + ':' + sk.id); });
      P.cls = old; });
    ok('★ 모든 계열 스킬이 판에 실려 있다(습득 불가 스킬 0)', miss.length === 0, miss);
    return L;
  });

  /* ---------- 2) 구매 일원화 ---------- */
  const pe = await open('e');
  await run(pe, '2) 스킬 구매 일원화 (정령마법사)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('레벨 해금은 폐지', typeof skLvGated === 'function' && skLvGated('esnipe') === false);
    P.lv = 30;
    ok('★ 레벨 30 이어도 안 사면 못 쓴다', skKnown('esnipe') === false, { lv: P.lv, sklv: skLv('esnipe') });
    ok('모든 정령 스킬에 값이 붙어 있다', SKILLS.e.every(s => (s.cost || 0) > 0),
       SKILLS.e.map(s => s.id + ':' + s.cost));
    META.pt = 9000;
    /* esnipe 는 선행(공격력 노드)이 있다 — 선행 없이 사려 하면 막혀야 한다(그게 트리다) */
    ok('★ 선행 없이는 못 산다', metaBuySkill('esnipe') === false && skLv('esnipe') === 0);
    metaBuy('atk');
    const bought = metaBuySkill('esnipe');
    ok('★ 노드에서 사면 즉시 습득', bought === true && skKnown('esnipe') === true, { lv: skLv('esnipe') });
    const before = META.pt;
    ok('강화 단계가 있다(2·3단)', skNextCost(skillDef('esnipe')) !== null, { next: skNextCost(skillDef('esnipe')) });
    metaBuySkill('esnipe');
    ok('강화 구매로 단계 상승', skLv('esnipe') === 2 && META.pt < before, { lv: skLv('esnipe') });
    ok('★ 남의 계열 스킬은 못 산다', metaBuySkill('smash') === false && skLv('smash') === 0);
    return L;
  });

  /* ---------- 3) 정령마법사 도구 — 소환·벽·후퇴 ---------- */
  await run(pe, '3) 카이팅 도구 (소환수 · 가시덩굴 벽 · 후퇴 사격)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[curZ];
    META.pt = 5000;
    ['spwolf','thorn','bstep'].forEach(id => { META.sk[id] = 1; });
    const idx = id => { const l = mySkills(); for (let i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; };
    /* 소환 */
    conjClearAll();
    P.cd = {}; P.mp = 999;
    castSkill(idx('spwolf'));
    const sumN = z.fnpc.filter(n => n.k === 'sum_wolf' && !n.dead).length;
    ok('★ 소환수가 섰다', sumN >= 1, { n: sumN });
    const s0 = z.fnpc.filter(n => n.k === 'sum_wolf')[0];
    ok('소환수는 아군 진영', s0 && s0.fac === 'player', s0 && s0.fac);
    ok('소환수는 마물을 적으로 본다', s0 && isFoe(s0.fac, 'monster') === true);
    ok('소환수에 수명이 있다', s0 && s0.life > T, s0 && Math.round((s0.life - T) * 10) / 10);
    ok('그릴 시트가 있다(늑대 시트 재사용 · 새 에셋 0)', !!mobSheetName(s0), mobSheetName(s0));
    /* 벽 */
    const obs0 = z.obs.length;
    P.fx = 10; P.fy = 9; P.face = 0; P.cd = {};
    /* 벽을 세울 빈 자리를 확보 */
    for (let yy = 8; yy <= 12; yy++) for (let xx = 8; xx <= 12; xx++) z.g[yy][xx] = 0;
    castSkill(idx('thorn'));
    const put = z.obs.length - obs0;
    ok('★ 임시 벽이 섰다', put >= 1, { 세운칸: put, CONJ: CONJ.length });
    const c0 = CONJ[0];
    ok('벽 칸이 실제로 막힌다', c0 && blocked(z, c0.x, c0.y) === true);
    ok('벽에 수명이 있다', c0 && c0.t > T, c0 && Math.round((c0.t - T) * 10) / 10);
    ok('★ 원래 벽이던 칸에는 안 세운다(지형 구멍 방지)', (() => {
      const bx = 1, by = 1; z.g[by][bx] = 1;
      const n0 = CONJ.length; conjPut(z, bx, by, 'thorn', 5);
      return CONJ.length === n0 && z.g[by][bx] === 1;
    })());
    ok('★ 만료되면 길이 다시 열린다', (() => {
      const cc = CONJ[0]; if (!cc) return false;
      const x = cc.x, y = cc.y;
      cc.t = T - 1; conjTick(0.016);
      return blocked(z, x, y) === false;
    })());
    /* 후퇴 사격 */
    conjClearAll();
    P.fx = 10; P.fy = 9; P.cd = {}; P.mp = 999;
    const fx0 = P.fx, fy0 = P.fy;
    P.tgt = null; P.face = 0;
    castSkill(idx('bstep'));
    const moved = Math.abs(P.fx - fx0) + Math.abs(P.fy - fy0);
    ok('★ 후퇴 사격이 실제로 물러난다', moved > 0.5, { 이동: Math.round(moved * 10) / 10 });
    ok('후퇴 직후 짧은 무적', P.evadeT > T);
    return L;
  });

  /* ---------- 4) 마도학자 도구 — 순간이동·결계·장판 ---------- */
  const pm = await open('m');
  await run(pm, '4) 거리 관리 도구 (순간이동 · 빙결 결계 · 장판)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[curZ];
    ['blink','iceward','flamef','mirror'].forEach(id => { META.sk[id] = 1; });
    const idx = id => { const l = mySkills(); for (let i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; };
    conjClearAll();
    /* 순간이동 — 빈 들판 한복판에서 */
    const H = z.def.h, W = z.def.w;
    for (let yy = 5; yy < Math.min(20, H - 1); yy++) for (let xx = 5; xx < Math.min(20, W - 1); xx++) z.g[yy][xx] = 0;
    P.fx = 10; P.fy = 9; P.face = 0; P.cd = {}; P.mp = 999; P.tgt = null; P.dest = null;
    const bx = P.fx, by = P.fy;
    castSkill(idx('blink'));
    const d = Math.sqrt((P.fx - bx) * (P.fx - bx) + (P.fy - by) * (P.fy - by));
    ok('★ 순간이동이 거리를 만든다', d > 2.5, { 이동: Math.round(d * 10) / 10 });
    ok('도착 지점은 통행 가능', blocked(z, P.fx, P.fy) === false);
    ok('도착 순간 짧은 무적', P.evadeT > T);
    ok('★ 벽 너머로는 못 간다', (() => {
      P.fx = 10; P.fy = 9; P.face = 0; P.cd = {};
      const lim = Math.min(16, z.def.h - 2);
      for (let k = 10; k <= lim; k++) z.g[k][10] = 1;           /* 남쪽을 통째로 막는다 */
      castSkill(idx('blink'));
      const okk = P.fy <= 9.99 && blocked(z, P.fx, P.fy) === false;
      for (let k = 10; k <= lim; k++) z.g[k][10] = 0;
      return okk;
    })());
    /* 결계 */
    P.fx = 10; P.fy = 9; P.face = 0; P.cd = {}; P.mp = 999;
    const ob0 = z.obs.length;
    castSkill(idx('iceward'));
    ok('★ 빙결 결계가 통로를 끊는다', z.obs.length > ob0 && CONJ.length > 0,
       { 세운칸: z.obs.length - ob0 });
    ok('결계 그림 종류가 그려진다(빈 캔버스 아님)', (() => {
      const cv = objSprite('icepil', 1);
      return cv && cv.width > 0 && !objEmpty(cv);
    })());
    ok('가시덩굴 그림도 그려진다', (() => { const cv = objSprite('thorn', 1); return cv && !objEmpty(cv); })());
    /* 장판 */
    conjClearAll();
    P.cd = {}; P.mp = 999;
    z.mobs.length = 0;
    const dummy = { k:'wolf', d:MOBS.wolf, fx:P.fx + 1.5, fy:P.fy, hx:P.fx + 1.5, hy:P.fy,
                    hp:9999, mhp:9999, dead:false, rt:0, tgt:null, na:0, stun:0, slow:0, face:0, anim:0, mv:-9, atkT:-9, ph:0 };
    z.mobs.push(dummy);
    P.tgt = dummy;
    castSkill(idx('flamef'));
    ok('★ 장판이 깔린다', PFIELD.length === 1, { n: PFIELD.length });
    const hp0 = dummy.hp;
    PFIELD[0].next = T - 1; pfieldTick();
    ok('★ 장판이 밟은 적을 태운다', dummy.hp < hp0, { 피해: hp0 - dummy.hp });
    ok('장판에 수명이 있다', PFIELD[0].t > T, Math.round((PFIELD[0].t - T) * 10) / 10);
    /* 잔상 */
    P.cd = {}; P.mp = 999;
    castSkill(idx('mirror'));
    const mir = z.fnpc.filter(n => n.k === 'sum_mirror' && !n.dead);
    ok('★ 잔상이 소환된다', mir.length >= 1, { n: mir.length });
    ok('잔상은 마도학자 시트로 그려진다', mir[0] && mobSheetName(mir[0]) === 'pc_wiz', mir[0] && mobSheetName(mir[0]));
    return L;
  });

  /* ---------- 5) 청소 · 자동 조건 ---------- */
  await run(pm, '5) 층 이동 청소 · 자동 스킬 조건', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const z = world[curZ];
    P.cd = {}; P.mp = 999;
    const idx = id => { const l = mySkills(); for (let i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; };
    P.fx = 10; P.fy = 9; P.face = 0;
    for (let yy = 8; yy <= 12; yy++) for (let xx = 8; xx <= 12; xx++) z.g[yy][xx] = 0;
    castSkill(idx('iceward')); castSkill(idx('mirror'));
    const hadWall = CONJ.length, hadSum = SUMS.length;
    const wx = CONJ[0] ? CONJ[0].x : null, wy = CONJ[0] ? CONJ[0].y : null;
    conjClearAll();
    ok('★ 청소하면 벽·소환·장판이 전부 사라진다',
       hadWall > 0 && hadSum > 0 && CONJ.length === 0 && SUMS.length === 0 && PFIELD.length === 0,
       { 벽:hadWall, 소환:hadSum });
    ok('★ 청소 뒤 그 칸이 다시 통행 가능(유령 벽 없음)', wx === null || blocked(z, wx, wy) === false);
    /* 자동 조건 — 도구는 상황을 가린다 */
    const dummy = { k:'wolf', d:MOBS.wolf, fx:P.fx + 6, fy:P.fy, hp:100, mhp:100, dead:false, tgt:null, na:0, stun:0, slow:0 };
    const near = { k:'wolf', d:MOBS.wolf, fx:P.fx + 1.2, fy:P.fy, hp:100, mhp:100, dead:false, tgt:null, na:0, stun:0, slow:0 };
    const sk = id => skillDef(id);
    P.cd = {}; P.mp = 999;          /* 쿨·마나 때문에 조건 판정이 가려지지 않게 초기화 */
    ok('★ 멀리 있는 적에게는 벽을 세우지 않는다', autoSkillOk(sk('iceward'), z, dummy) === false);
    P.cd = {}; P.mp = 999;
    ok('붙은 적에게는 벽을 세운다', autoSkillOk(sk('iceward'), z, near) === true);
    P.cd = {}; P.mp = 999;
    ok('★ 순간이동은 붙었을 때만 자동', autoSkillOk(sk('blink'), z, dummy) === false && autoSkillOk(sk('blink'), z, near) === true);
    ok('소환은 곁에 없을 때만', (() => {
      conjClearAll();
      P.cd = {}; P.mp = 999;
      const a = autoSkillOk(sk('mirror'), z, near);
      P.cd = {}; P.mp = 999; castSkill(idx('mirror'));
      P.cd = {}; P.mp = 999;
      const b = autoSkillOk(sk('mirror'), z, near);
      return a === true && b === false;
    })());
    conjClearAll();
    return L;
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
