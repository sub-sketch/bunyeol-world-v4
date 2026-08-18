// R28 검증: 동대륙 맵 재구성 — 산길(ridge)·협곡(canyon)·산정(terrace) 형태 · 연결성 · 보이지 않는 벽 없음
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /지형물/.test(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 28; P.mhp = 4000; P.hp = 4000;
  });
  await page.waitForTimeout(400);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) ★ 동대륙 세 층이 서로 다른 형태로 깎였다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const east = [];
    ZONES.forEach((z, i) => { if (/동대륙/.test(z.name)) east.push(i); });
    ok('★ 동대륙 존이 3개다', east.length === 3, { 존: east.map(i => ZONES[i].name) });
    const kinds = east.map(i => ZONES[i].layout);
    ok('★ 층마다 형태(layout)가 다르다', new Set(kinds).size === 3, { 형태: kinds });
    ok('★ 서대륙 존에는 layout 이 없다 (본편 무수정)',
       ZONES.filter(z => !/동대륙|마경/.test(z.name)).every(z => !z.layout));
    /* 형태가 실제로 다른가 — 걸을 수 있는 칸의 모양을 숫자로 비교한다 */
    const sig = east.map(i => {
      const w = world[i], g = w.g, def = w.def;
      let open = 0, rowOpen = [], colOpen = [];
      for (let y = 0; y < def.h; y++) { let c = 0; for (let x = 0; x < def.w; x++) if (!g[y][x]) { c++; open++; } rowOpen.push(c); }
      for (let x = 0; x < def.w; x++) { let c = 0; for (let y = 0; y < def.h; y++) if (!g[y][x]) c++; colOpen.push(c); }
      const bands = rowOpen.filter(c => c > def.w * 0.5).length;      /* 넓은 가로 띠 개수 */
      return { name: def.name, layout: def.layout, open: open, ratio: Math.round(open / (def.w * def.h) * 100), bands: bands };
    });
    L.push('INFO ' + JSON.stringify(sig));
    ok('★ 세 층 모두 걸을 수 있는 칸이 20~70% (통째 개활지도, 막힌 층도 아니다)',
       sig.every(s => s.ratio >= 20 && s.ratio <= 70), { 비율: sig.map(s => s.ratio) });
    const terr = sig.find(s => s.layout === 'terrace');
    ok('★ 산정(terrace)은 넓은 가로 단이 여러 개다 (계단식)', terr.bands >= 2, { 단: terr.bands });
    const ridge = sig.find(s => s.layout === 'ridge');
    ok('★ 산길(ridge)은 통째 개활지가 아니다 (외길)', ridge.ratio <= 55, { 비율: ridge.ratio });
    return L;
  });

  await run('2) ★ 연결성 — 문·몬스터·기록물까지 걸어서 닿는다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const east = []; ZONES.forEach((z, i) => { if (/동대륙/.test(z.name)) east.push(i); });
    east.forEach(zi => {
      const w = world[zi], g = w.g, def = w.def;
      /* 첫 번째 문에서 물이 퍼지듯 채운다 */
      const st = [[def.gates[0].x, def.gates[0].y]];
      const seen = {}; seen[st[0][0] + ',' + st[0][1]] = 1;
      while (st.length) {
        const [x, y] = st.pop();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
          if (nx < 0 || ny < 0 || nx >= def.w || ny >= def.h) return;
          if (seen[k] || g[ny][nx]) return;
          seen[k] = 1; st.push([nx, ny]);
        });
      }
      const gateOk = def.gates.every(gt => seen[gt.x + ',' + gt.y]);
      ok('★ [' + def.name + '] 모든 문에 닿는다', gateOk,
         { 문: def.gates.map(gt => gt.label + (seen[gt.x + ',' + gt.y] ? ' ○' : ' ✕')) });
      const live = w.mobs.filter(m => !m.dead);
      const reach = live.filter(m => seen[Math.floor(m.fx) + ',' + Math.floor(m.fy)]).length;
      ok('★ [' + def.name + '] 몬스터가 모두 닿는 자리에 있다', reach === live.length,
         { 닿음: reach, 전체: live.length });
      const walk = Object.keys(seen).length;
      let openAll = 0;
      for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) if (!g[y][x]) openAll++;
      ok('[' + def.name + '] 갇힌 섬(닿지 않는 빈 칸)이 거의 없다', walk >= openAll * 0.9,
         { 닿는칸: walk, 빈칸: openAll });
    });
    return L;
  });

  await run('3) ★ 보이지 않는 벽 없음 — 막힌 칸은 모두 그림이 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const east = []; ZONES.forEach((z, i) => { if (/동대륙/.test(z.name)) east.push(i); });
    east.forEach(zi => {
      const w = world[zi], g = w.g, def = w.def, has = {};
      w.obs.forEach(o => { has[o.x + ',' + o.y] = o.k; });
      let ghost = 0, touch = 0;
      for (let y = 1; y < def.h - 1; y++) for (let x = 1; x < def.w - 1; x++) {
        if (!g[y][x]) continue;
        const near = !g[y - 1][x] || !g[y + 1][x] || !g[y][x - 1] || !g[y][x + 1];
        if (!near) continue;                       /* 안쪽 암반 — 손이 닿지 않는다 */
        touch++;
        if (!has[x + ',' + y]) ghost++;
      }
      ok('★ [' + def.name + '] 길에 닿은 벽은 전부 눈에 보인다', ghost === 0, { 유령벽: ghost, 길가벽: touch });
      const kinds = {};
      w.obs.forEach(o => { kinds[o.k] = (kinds[o.k] || 0) + 1; });
      ok('★ [' + def.name + '] 대나무가 실제로 섰다', (kinds['bamboo'] || 0) >= 3, { 종류: kinds });
      /* 대표 지시: "동대륙에 대나무만 배치, 집모양 타일은 제거 요망" */
      ok('★ [' + def.name + '] 집모양(기와집) 타일이 없다', !kinds['house_wx'], { 기와집: kinds['house_wx'] || 0 });
      ok('[' + def.name + '] 석등도 두지 않았다 (대나무·절벽만)', !kinds['lantern'], { 석등: kinds['lantern'] || 0 });
    });
    return L;
  });

  await run('4) 걸어 다닐 수 있다 — 실제로 이동해 본다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const east = []; ZONES.forEach((z, i) => { if (/동대륙/.test(z.name)) east.push(i); });
    const zi = east[0], def = ZONES[zi];
    travel(zi, def.gates[0].x, def.gates[0].y);
    ok('★ 6층으로 이동했다', curZ === zi, { 층: ZONES[curZ].name });
    ok('시작 자리가 걸을 수 있는 칸이다', !blocked(world[zi], P.fx, P.fy), { x: P.fx, y: P.fy });
    /* 목적지를 마당으로 잡고 60초분(=3600프레임) 걸어 본다 */
    const tgt = world[zi].mobs.length ? world[zi].mobs[0] : null;
    if (tgt) {
      P.dest = { x: tgt.fx, y: tgt.fy };
      const d0 = Math.hypot(P.fx - tgt.fx, P.fy - tgt.fy);
      for (let i = 0; i < 2400; i++) update(1 / 60);
      const d1 = Math.hypot(P.fx - tgt.fx, P.fy - tgt.fy);
      ok('★ 목표(몬스터)에게 실제로 다가간다 — 막힌 길이 아니다', d1 < d0,
         { 전: Math.round(d0 * 10) / 10, 후: Math.round(d1 * 10) / 10 });
    }
    ok('층 안에 갇히지 않았다 (문 좌표가 걸을 수 있다)',
       def.gates.every(gt => !blocked(world[zi], gt.x, gt.y)));
    return L;
  });

  /* 스크린샷 3장 — 산길 / 협곡 / 산정 */
  const east = await page.evaluate(() => { const e = []; ZONES.forEach((z, i) => { if (/동대륙/.test(z.name)) e.push(i); }); return e; });
  const nm = ['1_산길', '2_협곡', '3_산정'];
  for (let i = 0; i < east.length; i++) {
    await page.evaluate(zi => {
      const def = ZONES[zi];
      if (typeof hubHide === 'function') hubHide();
      ['hubov', 'facov', 'inv', 'quest', 'save', 'facinfo'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
      travel(zi, def.gates[0].x, def.gates[0].y);
      P.hp = P.mhp;
      if (typeof setAutoMode === 'function') setAutoMode('off');
    }, east[i]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: 'shot_r28_east_' + nm[i] + '.png' });
  }

  console.log('\n=== 페이지 오류 / 지형물 경고 ===');
  console.log(errors.length ? errors.slice(0, 8).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + f + '건, 오류 ' + errors.length + '건');
  console.log(f === 0 && errors.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
