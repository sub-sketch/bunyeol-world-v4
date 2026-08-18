// R28b 검증: 마경 바닥 깔개(검은 늪·해골 부스러기·시체) — 막지 않는다 · 마경에만 깔린다
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /지형물|decal/.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; META.clear3 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 34; P.mhp = 6000; P.hp = 6000;
  });
  await page.waitForTimeout(400);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ 마경 세 층 바닥에 늪·뼈·시체가 깔렸다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const ab = []; ZONES.forEach((z, i) => { if (/마경/.test(z.name)) ab.push(i); });
    ok('★ 마경 존이 3개다', ab.length === 3, { 존: ab.map(i => ZONES[i].name) });
    ok('★ 세 층 모두 바닥 깔개(fdec)가 지정됐다',
       ab.every(i => Array.isArray(ZONES[i].fdec) && ZONES[i].fdec.length >= 3),
       { 깔개: ab.map(i => (ZONES[i].fdec || []).map(f => f[0])) });
    ok('★ 종류가 검은 늪 · 해골 부스러기 · 시체다',
       ab.every(i => {
         const k = ZONES[i].fdec.map(f => f[0]);
         return k.indexOf('bog') >= 0 && k.indexOf('skullbits') >= 0 && k.indexOf('corpse') >= 0;
       }));
    ok('★ 깊어질수록 늪이 진해진다 (9층 < 10층 < 11층 밀도)',
       ZONES[ab[0]].fdecp < ZONES[ab[1]].fdecp && ZONES[ab[1]].fdecp < ZONES[ab[2]].fdecp,
       { 밀도: ab.map(i => ZONES[i].fdecp) });
    ok('★ 그림이 실제로 만들어진다 (빈 캔버스가 아니다)',
       ['bog', 'skullbits', 'corpse'].every(k => {
         const cv = decalSprite(k, 0);
         return cv && cv.width > 10 && !objEmpty(cv);
       }), { 크기: ['bog', 'skullbits', 'corpse'].map(k => decalSprite(k, 0).width) });
    ok('서대륙·동대륙 바닥에는 깔지 않았다 (마경만의 분위기)',
       ZONES.filter(z => !/마경/.test(z.name)).every(z => !z.fdec));
    return L;
  });

  await run('2) ★ 깔개는 길을 막지 않는다 (바닥 그림이라 걸리지 않는다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const ab = []; ZONES.forEach((z, i) => { if (/마경/.test(z.name)) ab.push(i); });
    /* 깔개를 뺀 상태와 넣은 상태의 충돌 격자가 완전히 같은가 */
    const zi = ab[1];
    const before = world[zi].g.map(r => r.join('')).join('|');
    const keep = ZONES[zi].fdec;
    delete ZONES[zi].fdec;
    world[zi] = buildZone(zi);
    const noDec = world[zi].g.map(r => r.join('')).join('|');
    ZONES[zi].fdec = keep;
    world[zi] = buildZone(zi);
    const after = world[zi].g.map(r => r.join('')).join('|');
    ok('★ 깔개가 있든 없든 충돌 격자가 같다', before === noDec && noDec === after,
       { 같음: before === noDec && noDec === after });
    ok('★ 깔개가 오브젝트(obs)로 들어가지 않았다',
       world[zi].obs.every(o => ['bog', 'skullbits', 'corpse'].indexOf(o.k) < 0),
       { 종류: Array.from(new Set(world[zi].obs.map(o => o.k))) });
    /* 실제로 걸어 본다 — 깔개가 많은 층을 60초분 이동 */
    const def = ZONES[zi];
    travel(zi, def.gates[0].x, def.gates[0].y);
    if (typeof setAutoMode === 'function') setAutoMode('off');
    const tgt = world[zi].mobs.length ? world[zi].mobs[0] : null;
    if (tgt) {
      P.dest = { x: tgt.fx, y: tgt.fy };
      const d0 = Math.hypot(P.fx - tgt.fx, P.fy - tgt.fy);
      for (let i = 0; i < 2400; i++) update(1 / 60);
      const d1 = Math.hypot(P.fx - tgt.fx, P.fy - tgt.fy);
      ok('★ 깔개 위를 그대로 걸어 다닌다', d1 < d0, { 전: Math.round(d0 * 10) / 10, 후: Math.round(d1 * 10) / 10 });
    }
    return L;
  });

  await run('3) 화면에 실제로 그려진다 (문 표시는 묻지 않는다)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const ab = []; ZONES.forEach((z, i) => { if (/마경/.test(z.name)) ab.push(i); });
    const zi = ab[2], def = ZONES[zi];
    if (typeof hubHide === 'function') hubHide();
    travel(zi, def.gates[0].x, def.gates[0].y);
    if (typeof applyBuff === 'function') applyBuff('검수용 광원', 600, { blit: 8 });
    /* 그리기 호출을 세어 본다 */
    let calls = 0;
    const orig = decalSprite;
    window.decalSprite = function (k, v) { calls++; return orig(k, v); };
    render();
    window.decalSprite = orig;
    ok('★ 한 화면에 깔개가 여러 장 그려진다', calls >= 5, { 그린수: calls });
    /* ★ 문 칸 제외를 실제로 확인한다 — 밀도를 1(=모든 칸)로 올려도 문 칸은 비어 있어야 한다 */
    const keepP = def.fdecp;
    def.fdecp = 1;
    const gateFree = def.gates.every(g => fdecAt(world[zi], g.x, g.y) === null);
    let floorAll = 0, decAll = 0;
    for (let y = 1; y < def.h - 1; y++) for (let x = 1; x < def.w - 1; x++) {
      if (world[zi].g[y][x]) continue;
      floorAll++;
      if (fdecAt(world[zi], x, y)) decAll++;
    }
    def.fdecp = keepP;
    ok('★ 문 좌표는 깔개에서 제외된다 (밀도 1에서도 비어 있다)', gateFree,
       { 문: def.gates.map(g => g.label + '=' + fdecAt(world[zi], g.x, g.y)) });
    ok('★ 밀도 1이면 (문 말고) 바닥 전부에 깔린다 — 규칙이 밀도를 그대로 따른다',
       decAll >= floorAll - def.gates.length, { 바닥: floorAll, 깔림: decAll });
    ok('벽 칸에는 절대 깔리지 않는다',
       (() => { for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++)
                  if (world[zi].g[y][x] && fdecAt(world[zi], x, y)) return false;
                return true; })());
    ok('원래 밀도로 돌아왔다', def.fdecp === keepP, { 밀도: def.fdecp });
    return L;
  });

  await page.evaluate(() => {
    ['hubov', 'facov', 'inv', 'quest', 'save', 'facinfo'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shot_r28_abyss_옥좌.png' });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + f + '건, 오류 ' + errors.length + '건');
  console.log(f === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
