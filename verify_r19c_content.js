// R19c/R19d 검증: 서륙 팩(2부 동대륙 · 3부 마경) + 던전 벽 시인성 개편
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1300);

  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) 층 구성 — 1부 5층 + 2부 3층 + 3부 3층 = 11층', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('★ 부 3개', ACTS.length === 3, { ids: ACTS.map(a => a.id + '/' + a.pack) });
    ok('★ 층 1~11 이 빠짐없이 존재', (function () {
      for (var f = 1; f <= 11; f++) if (!FLOOR_OF_HAS(f)) return false; return true;
      function FLOOR_OF_HAS(f) { for (var z in FLOOR_OF) if (FLOOR_OF[z] === f) return true; return false; }
    })(), { FLOOR_OF: FLOOR_OF });
    ok('존 12개 (본편 6 + 팩 6)', ZONES.length === 12 && world.length === 12, { zones: ZONES.length });
    ok('2부는 6·7·8층 / 3부는 9·10·11층',
       JSON.stringify(Object.keys(ACTS[1].floors)) === '["6","7","8"]' &&
       JSON.stringify(Object.keys(ACTS[2].floors)) === '["9","10","11"]');
    ok('★ 층 번호가 겹치지 않는다', (function () {
      var seen = {}; var dup = false;
      ACTS.forEach(a => Object.keys(a.floors).forEach(f => { if (seen[f]) dup = true; seen[f] = 1; }));
      return !dup;
    })());
    ok('보스층: 8층 / 11층', isActBoss(8) && isActBoss(11) && !isActBoss(7) && !isActBoss(10));
    /* ★ isFinalBoss 는 **해금 상태에 따라 달라진다** — 다음 부가 아직 안 열렸으면 그 부의 보스가
       '지금 갈 수 있는 마지막'이다(그래서 갈림길 대신 정산으로 끝난다). 이게 의도된 동작이라
       두 상태를 모두 확인해야 한다. 1차 실행에서 클리어 플래그를 안 세우고 검사해 오탐이 났다. */
    META.clear1 = 1; META.clear2 = 1;
    ok('★ 다 해금된 상태: 최종 보스는 11층뿐',
       isFinalBoss(11) === true && isFinalBoss(8) === false && isFinalBoss(5) === false);
    META.clear2 = 0;
    ok('★ 3부 미해금 상태: 8층 보스가 그 시점의 마지막(정산으로 끝난다)', isFinalBoss(8) === true);
    META.clear1 = 1; META.clear2 = 1;
    return L;
  });

  await run('2) 색 배치 — 동대륙 = 1차 변경색(핏빛) / 마경 = 제일 어두운색(흑암)  [대표 지시]', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const spawnsOf = f => { let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
                            return ZONES[z].spawns.map(s => s[0]); };
    const east = [6, 7, 8].reduce((a, f) => a.concat(spawnsOf(f)), []);
    const abyss = [9, 10, 11].reduce((a, f) => a.concat(spawnsOf(f)), []);
    ok('동대륙(6~8층) 스폰이 전부 변종', east.every(k => k.indexOf('@') > 0), { east: east });
    ok('★ 동대륙은 붉은 계열 색조(hset 340~360)',
       east.every(k => { const t = MOBS[k].vt; return t && t.hset >= 340 && t.hset <= 360; }),
       { hset: east.map(k => MOBS[k].vt.hset) });
    ok('마경(9~11층) 스폰이 전부 변종', abyss.every(k => k.indexOf('@') > 0), { abyss: abyss });
    ok('★ 마경은 남빛 계열 색조(hset 240~260)',
       abyss.every(k => { const t = MOBS[k].vt; return t && t.hset >= 240 && t.hset <= 260; }),
       { hset: abyss.map(k => MOBS[k].vt.hset) });
    ok('★ 마경이 더 어둡다(명도 배수가 낮다)',
       Math.max.apply(null, abyss.map(k => MOBS[k].vt.dv === undefined ? 1 : MOBS[k].vt.dv)) <
       Math.min.apply(null, east.map(k => MOBS[k].vt.dv === undefined ? 1 : MOBS[k].vt.dv)),
       { 동대륙dv: east.map(k => MOBS[k].vt.dv)[0], 마경dv: abyss.map(k => MOBS[k].vt.dv)[0] });
    return L;
  });

  await run('3) 지형색 — 동대륙 돌색 / 마경 남색  [대표 지시]', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const themeOf = f => { let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k; return ZONES[z].theme; };
    const east = [6, 7, 8].map(themeOf), abyss = [9, 10, 11].map(themeOf);
    ok('테마가 THEME 에 다 있다(초원색 폴백 없음)', east.concat(abyss).every(t => !!THEME[t]),
       { east: east, abyss: abyss });
    ok('★ 동대륙 바닥은 돌색 — 채도 낮고(≤12) 색조는 난색(20~40)',
       east.every(t => THEME[t].a[1] <= 12 && THEME[t].a[0] >= 20 && THEME[t].a[0] <= 40),
       { hsl: east.map(t => THEME[t].a) });
    ok('★ 마경 바닥은 남색 — 색조 215~240, 채도 30 이상',
       abyss.every(t => THEME[t].a[0] >= 215 && THEME[t].a[0] <= 240 && THEME[t].a[1] >= 30),
       { hsl: abyss.map(t => THEME[t].a) });
    ok('마경이 동대륙보다 어둡다',
       Math.max.apply(null, abyss.map(t => THEME[t].a[2])) < Math.min.apply(null, east.map(t => THEME[t].a[2])),
       { 동대륙L: east.map(t => THEME[t].a[2]), 마경L: abyss.map(t => THEME[t].a[2]) });
    ok('★ 몹이 바닥에 묻히지 않는다 — 마경 몹 명도(0.76) > 바닥 명도',
       abyss.every(t => THEME[t].a[2] / 100 < 0.76 * 0.9), { 바닥L: abyss.map(t => THEME[t].a[2]) });
    ok('동대륙은 돌 지형 — 바위 비율이 기본(0.28)보다 높다',
       [6, 7, 8].every(f => { let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
                              return ZONES[z].rock > 0.28; }));
    return L;
  });

  await run('4) 문 — 도착 즉시 튕기지 않는가 (실측)', async () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    /* 문은 0.65타일 안에 들어오면 자동 발동한다. 도착점이 목적지의 다른 문 위면 되돌아간다. */
    const bad = [];
    ZONES.forEach((z, zi) => (z.gates || []).forEach(g => {
      (ZONES[g.to].gates || []).forEach(g2 => {
        if (Math.abs(g.tx - g2.x) < 0.66 && Math.abs(g.ty - g2.y) < 0.66)
          bad.push(zi + '->' + g.to + ' 도착(' + g.tx + ',' + g.ty + ')');
      });
    }));
    ok('★ 도착점이 목적지 문과 겹치는 곳 없음 (전 12존)', bad.length === 0, { 겹침: bad });
    if (!P) startGame();
    /* 대표적인 세 곳을 실제로 걸어(가만히 서서) 확인한다 */
    const probes = [[2, 3], [3, 4], [5, 6]];
    for (const [from, to] of probes) {
      const g = (ZONES[from].gates || []).filter(x => x.to === to)[0];
      if (!g) { L.push('(존' + from + '->' + to + ' 문 없음 — 갈림길 워프 전용, 건너뜀)'); continue; }
      travel(to, g.tx, g.ty);
      const z0 = curZ;
      await new Promise(r => setTimeout(r, 1500));           /* portLock 1초 + 여유 */
      ok('★ 존' + from + '→' + to + ' 도착 후 1.5초 가만히 있어도 그대로', curZ === z0,
         { 도착: z0, 현재: curZ });
    }
    return L;
  });

  await run('5) 해금 사슬 — 1부 → 2부 → 3부', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const [a1, a2, a3] = ACTS;
    META.clear1 = 0; META.clear2 = 0;
    ok('★ 1부 미클리어면 2부·3부 다 잠김', !actUnlocked(a2) && !actUnlocked(a3));
    ok('갈림길도 안 뜬다', nextAct(a1) === null);
    META.clear1 = 1;
    ok('★ 1부 클리어 → 2부만 열린다', actUnlocked(a2) && !actUnlocked(a3), { next: nextAct(a1).id });
    META.clear2 = 1;
    ok('★ 2부 클리어 → 3부가 열린다', actUnlocked(a3) && nextAct(a2) === a3, { next: nextAct(a2).id });
    ok('3부 다음은 없다(최종)', nextAct(a3) === null);
    ok('팩 미소유면 2부·3부가 통째로 빠진다', (function () {
      PACK_OWNED.pack_seoryuk = false;
      const only = actList().map(a => a.id);
      PACK_OWNED.pack_seoryuk = true;
      return only.length === 1 && only[0] === a1.id;
    })());
    return L;
  });

  await run('6) 난이도 — 층이 깊어질수록 세진다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    /* ★ '평균 HP' 로 재면 안 된다 — 늑대처럼 여러 마리 몰려나오는 잡몹이 평균을 끌어내려
       실제로는 더 힘든 층이 더 쉬운 층으로 계산된다(1차 실행에서 이 착각으로 오탐이 났다).
       층 난이도는 **총 HP(마리 수 × HP)** = 정리에 걸리는 시간으로 본다.
       보스층(5·8·11)은 잡몹을 적게 두고 보스에 무게를 싣는 설계라 이 비교에서 뺀다. */
    const BOSS_FLOORS = [5, 8, 11], total = [];
    for (let f = 1; f <= 11; f++) {
      let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
      const sp = ZONES[z].spawns.filter(s => !MOBS[s[0]].boss && !MOBS[s[0]].mini);
      total.push(sp.reduce((a, s) => a + MOBS[s[0]].hp * s[1], 0));
    }
    const norm = total.map((v, i) => BOSS_FLOORS.indexOf(i + 1) >= 0 ? null : v).filter(v => v !== null);
    let mono = true;
    for (let i = 1; i < norm.length; i++) if (norm[i] < norm[i - 1]) mono = false;
    ok('★ 층 총 HP 가 뒤로 갈수록 오른다 (보스층 제외)', mono,
       { 층별총HP: total, 비교대상: norm });
    ok('★ 6층(2부 첫 층)이 4층보다 힘들다 — 5층 보스를 깬 캐릭터가 내려오는 곳이다',
       total[5] > total[3], { '4층': total[3], '6층': total[5] });
    ok('★ 9층(3부 첫 층)이 7층보다 힘들다', total[8] > total[6], { '7층': total[6], '9층': total[8] });
    const bossHp = f => { let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
                          const b = ZONES[z].spawns.filter(s => MOBS[s[0]].boss)[0];
                          return b ? MOBS[b[0]].hp : 0; };
    ok('★ 보스도 5층 < 8층 < 11층', bossHp(5) < bossHp(8) && bossHp(8) < bossHp(11),
       { 보스HP: [bossHp(5), bossHp(8), bossHp(11)] });
    ok('중간보스가 7층·10층에 있다', [7, 10].every(f => {
      let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
      return ZONES[z].spawns.some(s => MOBS[s[0]].mini);
    }));
    ok('중간보스가 그 층 잡몹보다 세다', (function () {
      let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === 10) z = +k;
      const sp = ZONES[z].spawns, mini = sp.filter(s => MOBS[s[0]].mini)[0];
      const trash = Math.max.apply(null, sp.filter(s => !MOBS[s[0]].mini).map(s => MOBS[s[0]].hp));
      return MOBS[mini[0]].hp > trash;
    })());
    return L;
  });

  await run('7) 던전 벽 — 가로/세로/십자 + 갓돌 4종  [대표 지시: 두껍지 않게 시인성]', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const dun = [];
    ZONES.forEach((z, zi) => { if (z.theme.indexOf('dun') === 0) dun.push(zi); });
    ok('던전 존이 6개(본편 3 + 마경 3)', dun.length === 6, { dun: dun });
    const counts = dun.map(zi => {
      const c = {}; world[zi].obs.forEach(o => c[o.k] = (c[o.k] || 0) + 1); return c;
    });
    const n4 = c => ['wallh', 'wallv', 'wallx', 'wallcap'].map(k => c[k] || 0);
    ok('★ 가로·세로·갓돌 세 종류는 모든 던전 층에 쓰인다',
       counts.every(c => (c.wallh || 0) > 0 && (c.wallv || 0) > 0 && (c.wallcap || 0) > 0), { counts: counts });
    /* 교차(모서리)는 층 모양에 따라 0 일 수 있다 — 방을 넓히면 모서리가 줄어든다(실측: 보스층 0개).
       예전엔 여기에 횃불이 매달려 있어 조명이 사라지는 회귀가 있었고, 그래서 횃불을 벽 종류와 분리했다. */
    ok('★ 어느 한 종류도 70% 를 넘지 않는다', counts.every(c => {
      const a = n4(c), t = a.reduce((x, y) => x + y, 0);
      return Math.max.apply(null, a) / t < 0.7;
    }), { 비율: counts.map(c => { const a = n4(c), t = a.reduce((x, y) => x + y, 0);
          return { h: +(a[0] / t).toFixed(2), v: +(a[1] / t).toFixed(2),
                   x: +(a[2] / t).toFixed(2), cap: +(a[3] / t).toFixed(2) }; }) });
    ok('★ 모든 던전 층에 횃불이 3개 이상 — 조명 0개인 층이 없다',
       dun.every(zi => world[zi].obs.filter(o => o.torch).length >= 3),
       { 횃불수: dun.map(zi => world[zi].obs.filter(o => o.torch).length) });
    /* 실제 스프라이트 높이를 재서 '두껍지 않게' 를 수치로 확인한다 */
    const topOf = (kind) => {
      const cv = objSprite(kind, 0);
      const g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
      for (let y = 0; y < cv.height; y++)
        for (let x = 0; x < cv.width; x++)
          if (d[(y * cv.width + x) * 4 + 3] > 8) return { top: y, h: cv.height - y };
      return { top: cv.height, h: 0 };
    };
    const OS = (typeof PXS !== 'undefined') ? PXS : 1;
    const hv = topOf('wallv').h / OS, hh = topOf('wallh').h / OS;
    const hc = topOf('wallcap').h / OS, hx = topOf('wallx').h / OS, hp = topOf('pillar').h / OS;
    /* 옛 판: 세로 32 / 가로 30 / 교차 34 (갓돌은 없었고 그 자리에 세로·가로판이 섰다).
       기둥(pillar 36)은 이번에 손대지 않은 기존 오브젝트라 '옛 높이' 기준선으로 쓴다. */
    ok('★ 세로벽이 기둥보다 눈에 띄게 낮다 (옛 세로판 32px → 지금)', hv <= 26 && hv < hp * 0.75,
       { 세로벽: Math.round(hv), 기둥: Math.round(hp) });
    ok('★ 가로벽 21px 이하 (옛 30px)', hh <= 21, { 가로벽: Math.round(hh) });
    ok('★ 갓돌 16px 이하 — 뒤쪽 방·몹·상자가 가려지지 않는다', hc <= 16, { 갓돌: Math.round(hc) });
    ok('★ 갓돌은 세로벽의 65% 이하로 눕혀져 있다', hc <= hv * 0.65,
       { 비율: +(hc / hv).toFixed(2) });
    ok('네 종류가 갓돌<가로<세로<교차 순으로 높아진다(방향이 실루엣으로 읽힌다)',
       hc < hh && hh < hv && hv < hx,
       { 갓돌: Math.round(hc), 가로: Math.round(hh), 세로: Math.round(hv), 교차: Math.round(hx) });
    ok('★ 벽이 바닥보다 밝다 — 어두운 던전에서 벽선이 보인다', (function () {
      const cv = objSprite('wallv', 0), g = cv.getContext('2d');
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; s += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; }
      const wallV = s / n / 255, floorL = THEME[ZONES[dun[dun.length - 1]].theme].a[2] / 100;
      return wallV > floorL * 1.15;
    })());
    ok('★ 벽 칸은 여전히 통행 불가 — 겉모습만 바꿨다', (function () {
      const zi = dun[0], w = world[zi];
      return w.obs.filter(o => o.k.indexOf('wall') === 0).every(o => w.g[o.y][o.x] === 1);
    })());
    ok('필드(동대륙 산길)에는 벽판이 안 생긴다', (function () {
      let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === 6) z = +k;
      return world[z].obs.every(o => o.k.indexOf('wall') < 0);
    })());
    return L;
  });

  await run('8) 길이 막히지 않았나 — 진입점에서 보스까지 실제 경로', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const walk = (zi, sx, sy, tx, ty) => {
      const p = findPath(world[zi], sx, sy, tx, ty);
      return !!(p && p.length);
    };
    ACTS.forEach(a => {
      const e = a.entry, zi = e.z;
      ok('부 "' + a.n + '" 진입점이 걸을 수 있는 칸', world[zi].g[e.y][e.x] === 0, { entry: e });
      const fwd = (ZONES[zi].gates || []).filter(g => FLOOR_OF[g.to] > FLOOR_OF[zi])[0];
      if (fwd) ok('진입점 → 다음 층 문까지 길이 있다 (' + ZONES[zi].name + ')',
                  walk(zi, e.x, e.y, fwd.x, fwd.y), { gate: [fwd.x, fwd.y] });
      /* 보스층: 되돌아가는 문에서 보스까지 */
      let bz = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === a.boss) bz = +k;
      const back = (ZONES[bz].gates || [])[0];
      const boss = world[bz].mobs.filter(m => m.d.boss)[0];
      if (back && boss)
        ok('★ 보스층 문 → 보스까지 길이 있다 (' + ZONES[bz].name + ')',
           walk(bz, back.x, back.y, Math.round(boss.fx), Math.round(boss.fy)),
           { boss: boss.d.n });
    });
    return L;
  });

  await run('9) 기록물(LORE) — 새 층에도 읽을 것이 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const packLore = Object.keys(LORE).filter(k => LORE[k].z >= 6);
    ok('★ 팩이 기록물을 4개 들여왔다', packLore.length === 4, { lore: packLore.map(k => LORE[k].n) });
    ok('전부 걸을 수 있는 칸에 스냅됐다',
       packLore.every(k => { const l = LORE[k]; return world[l.z].g[l.y][l.x] === 0; }),
       { pos: packLore.map(k => [LORE[k].z, LORE[k].x, LORE[k].y]) });
    ok('본편 기록물 12개는 그대로', Object.keys(LORE).length - packLore.length === 12);
    return L;
  });

  await run('10) 실제 플레이 — 11층까지 걸어 들어가고 보스를 잡는다', async () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    META.clear1 = 1; META.clear2 = 1; metaSave();
    runStart();
    P.mhp = 999999; P.hp = 999999; P.str = 999;     /* 검증용 — 층 통과가 목적이다 */
    for (let f = 6; f <= 11; f++) {
      let z = -1; for (const k in FLOOR_OF) if (FLOOR_OF[k] === f) z = +k;
      travel(z, ZONES[z].gates[0].x, ZONES[z].gates[0].y);
      ok(f + '층 진입 — ' + ZONES[z].name, curZ === z && FLOOR_OF[curZ] === f);
      world[z].mobs.forEach(m => { if (!m.dead) killMob(m); });
      ok(f + '층 전멸 처리 무오류', world[z].mobs.every(m => m.dead));
    }
    ok('★ 3부 클리어 플래그 기록', !!META[ACTS[2].clearFlag], { flag: ACTS[2].clearFlag });
    ok('★ 도감은 원종으로만 센다(변종 43종이 늘어도 총수 14)', metaDexTotal() === 14,
       { total: metaDexTotal(), 전체몹: Object.keys(MOBS).length });
    return L;
  });

  // ---------------------------------------------------------------- 11) R19f 데이터 훅
  await run('11) 지형 표현을 데이터로 뺐다 (마을 석판 / 무협식 집 준비)', async () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    /* (1) 기본값이 예전과 같은가 — 값을 안 적은 기존 테마는 동작이 바뀌면 안 된다 */
    ok('기존 테마에는 slab/dark 값이 없다(폴백 경로를 탄다)',
       ['town', 'grass', 'camp', 'dun', 'dun2', 'dun3'].every(t => THEME[t].slab === undefined && THEME[t].dark === undefined));

    /* (2) 벽 칸이 실제로 검은 공백인가 — 화면 픽셀로 확인한다.
       던전(석판 모드)은 벽 자리가 배경색, 마을(기본)은 바닥 타일이 그려져 있어야 한다. */
    const cvEl = document.getElementById('game');
    /* ★ 한 칸만 찍어서 판정하면 안 된다 — 아래쪽 칸의 집·바위 스프라이트가 위로 25px 솟아
       그 칸의 표본 지점을 덮는다(1차 실행에서 마을 표본이 계속 바닥색으로 나온 원인).
       그래서 화면에 보이는 **모든 벽 칸 중심의 '어두움 비율'** 로 본다. */
    const darkRatio = async (zi) => {
      travel(zi, ZONES[zi].gates[0].x, ZONES[zi].gates[0].y);
      P.dest = null; P.tgt = null;
      await new Promise(r => setTimeout(r, 300));
      const zz = world[zi], c = camOff(), g = cvEl.getContext('2d');
      /* 아래쪽 칸의 스프라이트(집·바위)는 위로 25px 솟아 이 칸의 표본 지점을 덮는다.
         마을은 벽 칸 대부분에 집이 서 있어서, 겹칠 수 있는 칸에 지형물이 있으면 표본에서 뺀다.
         (그래야 '바닥 타일을 그렸는가' 만 순수하게 본다.) */
      const has = {};
      zz.obs.forEach(o => { has[o.x + ',' + o.y] = 1; });
      /* R28 — 지형물뿐 아니라 **서 있는 것들**(몹·NPC·플레이어·상자·기록물)도 위로 솟아 표본을 덮는다.
         이게 이 항목이 간헐적으로 FAIL 하던 원인이었다(실측: 벽 19칸 중 13~14칸만 검게 나옴).
         '바닥 타일을 그렸는가' 만 보려면 이런 칸도 표본에서 빼야 한다. */
      (zz.mobs || []).forEach(m => { if (!m.dead) has[Math.floor(m.fx) + ',' + Math.floor(m.fy)] = 1; });
      (zz.fnpc || []).forEach(m => { if (!m.dead) has[Math.floor(m.fx) + ',' + Math.floor(m.fy)] = 1; });
      (zz.def.npcs || []).forEach(nn => { has[nn.x + ',' + nn.y] = 1; });
      (zz.def.gates || []).forEach(gg => { has[gg.x + ',' + gg.y] = 1; });
      if (P) has[Math.floor(P.fx) + ',' + Math.floor(P.fy)] = 1;
      if (typeof LORE === 'object') for (const lk in LORE) { const l = LORE[lk]; if (l.z === zi) has[l.x + ',' + l.y] = 1; }
      (zz.items || []).forEach(it => { has[Math.floor(it.fx) + ',' + Math.floor(it.fy)] = 1; });
      const covered = (x, y) => [[0,0],[1,0],[0,1],[1,1],[2,0],[0,2]]
        .some(d => has[(x + d[0]) + ',' + (y + d[1])]);
      let n = 0, dark = 0;
      for (let y = 1; y < zz.def.h - 1; y++)
        for (let x = 1; x < zz.def.w - 1; x++) {
          if (!zz.g[y][x]) continue;
          if (covered(x, y)) continue;
          const sx = Math.round((x - y) * HW2 + c.ox), sy = Math.round((x + y) * HH2 + c.oy + 8);
          if (sx < 40 || sx > cvEl.width - 40 || sy < 40 || sy > cvEl.height - 60) continue;
          const d = g.getImageData(sx, sy, 1, 1).data;
          n++; if (d[0] + d[1] + d[2] < 40) dark++;
        }
      return { n: n, dark: dark, ratio: n ? +(dark / n).toFixed(2) : null };
    };
    const dunR = await darkRatio(4);
    /* R28 — 판정 기준을 "절대 0.8" 에서 "마을과 확실히 다르다" 로 바꿨다.
       이유(실측): 표본 지점은 카메라 위치에 따라 픽셀이 1~2px 움직이고, 옆 바닥판의 두께 띠(LIP)가
       벽 칸 위쪽을 조금 덮는다. 그래서 같은 빌드에서도 0.58~0.84 사이를 오갔다(이 항목이 간헐 FAIL 의 정체).
       "던전 벽은 비어 있고 마을 벽은 바닥이 그려진다" 는 차이는 그대로 잡는다. */
    ok('★ 던전 벽 칸은 검은 공백이다(바닥 타일이 안 그려진다)', dunR.n >= 5 && dunR.ratio >= 0.5,
       { 던전: dunR });
    const townR = await darkRatio(0);
    ok('마을 벽 칸은 예전처럼 바닥이 그려진다(기본값 유지)', townR.n >= 5 && townR.ratio <= 0.2,
       { 마을: townR });

    /* (3) THEME 한 줄로 마을을 석판 모드로 바꿀 수 있는가 — 참고 이미지 오면 이 한 줄만 켠다 */
    THEME.town.slab = true;
    const townSlab = await darkRatio(0);
    ok('★ THEME.town.slab = true 한 줄로 마을도 석판 구조가 된다',
       townSlab.ratio >= 0.5 && townSlab.ratio > townR.ratio + 0.4, { 마을_석판: townSlab, 기본: townR });
    delete THEME.town.slab;
    const townBack = await darkRatio(0);
    ok('되돌리면 원래대로', Math.abs(townBack.ratio - townR.ratio) < 0.2, { 복구: townBack });

    /* (4) obk — 지형물 종류를 존 데이터로 지정 */
    const zi = 6, keep = ZONES[zi].obk;   /* 지형물이 실제로 생기는 존(동대륙 산길) */
    ZONES[zi].obk = [['house', 1]];
    world[zi] = buildZone(zi);
    ok('★ obk 로 그 지역 지형물을 지정할 수 있다(무협식 집도 이렇게 붙인다)',
       world[zi].obs.length > 0 && world[zi].obs.every(o => o.k === 'house'),
       { 개수: world[zi].obs.length, 종류: Array.from(new Set(world[zi].obs.map(o => o.k))) });
    ZONES[zi].obk = [['house', 3], ['rock', 1]];
    world[zi] = buildZone(zi);
    const kinds = world[zi].obs.map(o => o.k);
    ok('가중치가 반영된다(집이 바위보다 많다)',
       kinds.filter(k => k === 'house').length > kinds.filter(k => k === 'rock').length,
       { house: kinds.filter(k => k === 'house').length, rock: kinds.filter(k => k === 'rock').length });
    /* obk 를 지우면 예전 규칙(바위/나무)으로 돌아가는가 — 존에 obk 가 있어도 확인할 수 있게
       일부러 지운 상태에서 본다(R28: 이 존의 실제 obk 는 대나무+바위다). */
    delete ZONES[zi].obk;
    world[zi] = buildZone(zi);
    ok('obk 를 지우면 예전 규칙으로 돌아간다',
       world[zi].obs.every(o => o.k === 'rock' || o.k === 'tree' || o.k.indexOf('wall') === 0),
       { 종류: Array.from(new Set(world[zi].obs.map(o => o.k))) });
    if (keep !== undefined) ZONES[zi].obk = keep;
    world[zi] = buildZone(zi);
    ok('존 데이터의 obk 를 되돌리면 그 지역 지형물로 복구된다',
       keep === undefined || world[zi].obs.some(o => o.k === keep[0][0]),
       { 복구: Array.from(new Set(world[zi].obs.map(o => o.k))) });

    /* (5) 오타 방어 — 없는 종류를 적으면 조용히 투명해지지 않는다 */
    const bad = objSprite('무협집없음', 0), rock = objSprite('rock', 0);
    ok('★ 없는 지형물 종류는 바위로 대체된다(투명한 벽 방지)',
       bad.width === rock.width && !objEmpty(bad), { empty: objEmpty(bad) });
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
