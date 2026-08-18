// R19b 검증: 몹 색변경 변종(42종) + 도감 회귀 방지 + 스탯 배분 고정
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
  await page.waitForTimeout(1200);

  const run = async (title, fn, arg) => {
    const L = await page.evaluate(fn, arg);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  // ---------------------------------------------------------------- 1) 데이터 전개
  await run('1) 변종 전개 — 원종 재사용, 에셋 0개 추가', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const keys = Object.keys(MOBS), base = keys.filter(k => k.indexOf('@') < 0), va = keys.filter(k => k.indexOf('@') >= 0);
    ok('원종 14종 유지', base.length === 14, { 원종: base.length });
    /* 팩이 설치돼 있으면 팩 변종이 더해진다 — 본편 기준(28/42)은 팩이 없을 때의 값이다. */
    const packed = Object.keys(PACK_OWNED || {}).length;
    ok('★ 원종마다 변종 2종 이상 (원종당 2회 재사용 — 대표 지시)',
       base.every(b => va.filter(k => k.split('@')[0] === b).length >= 2),
       { 부족: base.filter(b => va.filter(k => k.split('@')[0] === b).length < 2) });
    ok('★ 본편 변종 28종' + (packed ? ' + 팩 변종' : ''), packed ? va.length >= 28 : va.length === 28,
       { 변종: va.length, 설치된팩: packed });
    ok('★ 합계 42종' + (packed ? ' + 팩' : ''), packed ? keys.length >= 42 : keys.length === 42,
       { 합계: keys.length });
    ok('★ 에셋(시트) 수는 그대로 — 변종은 MOBSHEET 에 없다',
       Object.keys(MOBSHEET).every(k => k.indexOf('@') < 0), { 시트수: Object.keys(MOBSHEET).length });
    ok('대표가 예로 든 3종이 그대로 있다',
       MOBS.wolf.n === '서리늑대' && MOBS['wolf@red'].n === '붉은 늑대' && MOBS['wolf@black'].n === '검은 늑대',
       [MOBS.wolf.n, MOBS['wolf@red'].n, MOBS['wolf@black'].n]);
    ok('★ 원종이 오염되지 않았다(깊은 복사)',
       MOBS.wolf.hp === 30 && MOBS.wolf.lv === 2 && MOBS.wolf.vt === undefined && MOBS.wolf.vb === undefined);
    ok('변종마다 vb(원종 시트) / vt(색 보정) 가 심겨 있다',
       va.every(k => MOBS[k].vb && MOBS[k].vt && (MOBS[k].vt.hset !== undefined || MOBS[k].vt.dv !== undefined)));
    ok('변종의 원종이 모두 실재', va.every(k => !!MOBS[MOBS[k].vb]));
    return L;
  });

  await run('2) 수치 배수 — 계보 하나만 고치면 28종이 함께 움직인다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const w = MOBS.wolf, r = MOBS['wolf@red'], b = MOBS['wolf@black'];
    ok('핏빛 = 약하고 아프다 (hp↓ 공격↑)', r.hp < w.hp && r.d2 > w.d2, { hp: [w.hp, r.hp], d2: [w.d2, r.d2] });
    ok('흑암 = 단단하다 (hp↑ AC↑)', b.hp > w.hp && b.ac > w.ac, { hp: [w.hp, b.hp], ac: [w.ac, b.ac] });
    ok('레벨이 올라간다 (핏빛 +2 / 흑암 +4)', r.lv === w.lv + 2 && b.lv === w.lv + 4, { lv: [w.lv, r.lv, b.lv] });
    ok('경험치도 함께 오른다', r.xp > w.xp && b.xp > r.xp, { xp: [w.xp, r.xp, b.xp] });
    ok('★ 출혈 피해도 공격 배수를 따른다(수치 하나만 안 오르면 약해 보인다)',
       MOBS['bear@red'].bleed.dmg > MOBS.bear.bleed.dmg, { bleed: [MOBS.bear.bleed.dmg, MOBS['bear@red'].bleed.dmg] });
    ok('★ 은화 드롭도 함께 오른다', MOBS['wolf@black'].drops[0][2] > MOBS.wolf.drops[0][2],
       { adena: [MOBS.wolf.drops[0].slice(1, 3), MOBS['wolf@black'].drops[0].slice(1, 3)] });
    const bad = Object.keys(MOBS).filter(k => MOBS[k].hp < 1 || MOBS[k].d2 < MOBS[k].d1 || MOBS[k].xp < 1);
    ok('배수로 망가진 항목 없음 (hp>=1 · d2>=d1 · xp>=1)', bad.length === 0, { 이상: bad });
    ok('보스/중간보스 플래그도 물려받는다', MOBS['dk@black'].boss === 1 && MOBS['orcchief@red'].mini === 1);
    ok('사거리·상태이상 같은 특성도 물려받는다',
       MOBS['orcarch@black'].rng === MOBS.orcarch.rng && !!MOBS['zombie@red'].poison);
    return L;
  });

  // ---------------------------------------------------------------- 3) 도감 회귀
  await run('3) 도감 — 변종이 늘어도 "도감 완성"이 막히지 않는다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('★ 도감 총수는 원종 14종 (변종 제외)', metaDexTotal() === 14, { total: metaDexTotal() });
    META.dex = {};
    metaMarkDex('wolf@red');
    ok('★ 변종을 잡아도 원종 칸에 기록된다', !!META.dex.wolf && !META.dex['wolf@red'], { dex: META.dex });
    metaMarkDex('wolf@black');
    ok('같은 원종의 다른 변종은 중복 기록 안 됨', metaDexCount() === 1, { count: metaDexCount() });
    const html = metaDexList();
    ok('도감 목록에 변종 이름이 섞이지 않는다', html.indexOf('붉은 늑대') < 0 && html.indexOf('검은 늑대') < 0);
    ok('원종 이름은 보인다', html.indexOf('서리늑대') >= 0);
    Object.keys(MOBS).forEach(k => metaMarkDex(k));
    const achv = ACHV.filter(a => a.id === 'dex_all')[0];
    ok('★ 원종 14종을 다 잡으면 "마물 도감 완성" 이 달성 가능하다', achv.test({}) === true,
       { count: metaDexCount(), total: metaDexTotal() });
    META.dex = {}; metaSave();
    return L;
  });

  // ---------------------------------------------------------------- 4) 색 변경
  await run('4) 색 변경 — 원본 시트를 다시 칠해 캐시한다', async () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const avg = (rec, key) => {
      const r = rec.img[key]; const cv = document.createElement('canvas');
      cv.width = r.img.width || r.img.naturalWidth; cv.height = r.img.height || r.img.naturalHeight;
      const g = cv.getContext('2d'); g.drawImage(r.img, 0, 0);
      const p = g.getImageData(0, 0, cv.width, cv.height).data;
      let R = 0, G = 0, B = 0, n = 0;
      for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 8) continue; R += p[i]; G += p[i + 1]; B += p[i + 2]; n++; }
      return { r: R / n, g: G / n, b: B / n, n: n, v: (R + G + B) / (3 * n) };
    };
    for (let i = 0; i < 80; i++) { if (MSH.set.wolf && MSH.set.wolf.ok && MSH.set.skel && MSH.set.skel.ok) break; await new Promise(r => setTimeout(r, 100)); }
    ok('원종 시트 로드됨', MSH.set.wolf.ok === true);
    const beforeAvg = avg(MSH.set.wolf, 'idle_s');

    ok('★ 변종 시트가 구워진다', mobVariantEnsure('wolf@red') === true);
    ok('MSH.set 에 변종이 등록되고 필요 키가 다 있다',
       !!MSH.set['wolf@red'] && Object.keys(MSH.set['wolf@red'].img).length === Object.keys(MSH.set.wolf.img).length,
       { keys: Object.keys(MSH.set['wolf@red'].img).length });
    ok('원종 이미지 객체를 공유하지 않는다(별도 캔버스)',
       MSH.set['wolf@red'].img.idle_s.img !== MSH.set.wolf.img.idle_s.img);
    ok('프레임 규격(fw/fh/n)은 원종과 동일', MSH.set['wolf@red'].img.idle_s.fw === MSH.set.wolf.img.idle_s.fw
       && MSH.set['wolf@red'].img.walk_s.n === MSH.set.wolf.img.walk_s.n);

    const red = avg(MSH.set['wolf@red'], 'idle_s');
    ok('★ 실제 픽셀이 붉어졌다 (R 이 G·B 를 앞선다)', red.r > red.g * 1.4 && red.r > red.b * 1.4,
       { 원종: [beforeAvg.r | 0, beforeAvg.g | 0, beforeAvg.b | 0], 핏빛: [red.r | 0, red.g | 0, red.b | 0] });
    ok('불투명 픽셀 수는 그대로(실루엣 보존)', red.n === beforeAvg.n, { px: [beforeAvg.n, red.n] });

    mobVariantEnsure('wolf@black');
    const blk = avg(MSH.set['wolf@black'], 'idle_s');
    ok('★ 흑암은 어두워졌다', blk.v < beforeAvg.v * 0.9, { 명도: [beforeAvg.v | 0, blk.v | 0] });
    ok('★ 그래도 배경(어두운 던전)과 구분될 밝기는 남았다 — 너무 어두우면 안 보인다',
       blk.v > 40, { 명도: blk.v | 0 });
    ok('흑암은 푸른 쪽으로 기울었다', blk.b > blk.r, { rgb: [blk.r | 0, blk.g | 0, blk.b | 0] });

    ok('★ 원종은 훼손되지 않았다(다시 재 보아도 같다)', Math.abs(avg(MSH.set.wolf, 'idle_s').v - beforeAvg.v) < 0.01);
    const first = MSH.set['wolf@red'].img.idle_s.img;
    mobVariantEnsure('wolf@red');
    ok('★ 두 번째 호출은 캐시를 쓴다(매 프레임 다시 굽지 않는다)',
       MSH.set['wolf@red'].img.idle_s.img === first);

    // 무채색 몹(백골병 뼈) — 색조만 돌리면 아무 일도 안 일어난다. tone 이 필요한 케이스.
    const sBefore = avg(MSH.set.skel, 'idle_s');
    mobVariantEnsure('skel@red');
    const sRed = avg(MSH.set['skel@red'], 'idle_s');
    /* ★ 판정은 R 의 절대값이 아니라 R/B 비율로 봐야 한다 — 뼈는 이미 밝아서(V 가 최대)
       채도를 올리면 R 은 그대로 있고 G·B 가 내려가며 붉어진다. R 이 오를 거라 가정하면
       제품이 옳은데도 FAIL 이 난다(실제로 1차 실행에서 이 착각으로 오탐이 났다). */
    ok('★ 무채색(뼈)도 착색된다 — tone 이 있어야 회색이 물든다',
       (sRed.r / sRed.b) > (sBefore.r / sBefore.b) * 1.3 && sRed.r > sRed.b * 1.3,
       { 원종비율: +(sBefore.r / sBefore.b).toFixed(2), 핏빛비율: +(sRed.r / sRed.b).toFixed(2),
         원종: [sBefore.r | 0, sBefore.g | 0, sBefore.b | 0], 핏빛: [sRed.r | 0, sRed.g | 0, sRed.b | 0] });
    return L;
  });

  // ---------------------------------------------------------------- 5) 실제 플레이 통합
  await page.evaluate(() => {
    try { META.mark = 'blade'; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const e = document.getElementById('markov'); if (e) e.style.display = 'none'; });

  await run('5) 실제 스폰·렌더·처치 — 변종이 "그냥 또 하나의 몹"인가', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    travel(1, 10, 11);
    const z = world[1];
    z.mobs.length = 0;
    const mk = (k, x, y) => { const d = MOBS[k]; z.g[y][x] = 0;
      const m = { k: k, d: d, fx: x, fy: y, hx: x, hy: y, hp: d.hp, dead: false, rt: 0, tgt: null, na: 0,
        stun: 9999, slow: 0, goal: null, gt: 0, lh: -99, face: 0, anim: 0, mv: -9, atkT: -9, ph: 0,
        prov: false, tdmg: 0, pdmg: 0 };
      z.mobs.push(m); return m; };
    const mb = mk('wolf@black', 6, 10), mr = mk('wolf@red', 7, 10);
    ok('★ 변종이 존에 스폰된다(코드 수정 없이 데이터만으로)', z.mobs.length === 2);
    ok('★ 렌더가 변종 시트를 고른다', mobSheetName(mb) === 'wolf@black' && mobSheetName(mr) === 'wolf@red',
       [mobSheetName(mb), mobSheetName(mr)]);
    ok('그림자 폭도 원종 값을 물려받았다(발이 뜨지 않는다)',
       FOOTPRINT['wolf@red'] === FOOTPRINT.wolf, { foot: [FOOTPRINT.wolf, FOOTPRINT['wolf@red']] });
    ok('실제로 그려진다(drawMobSheet 성공)', drawMobSheet('wolf@red', mr, 100, 100, 1) === true);
    META.dex = {};
    const xp0 = P.xp, lv0 = P.lv;
    killMob(mb); killMob(mr);
    ok('★ 처치가 정상 처리된다', mb.dead === true && mr.dead === true);
    ok('경험치가 들어온다', P.xp > xp0 || P.lv > lv0, { xp: [xp0, P.xp], lv: [lv0, P.lv] });
    ok('도감은 원종 1칸만 채워진다', metaDexCount() === 1 && !!META.dex.wolf, { dex: META.dex });
    ok('이름표에 변종 이름이 나온다', MOBS['wolf@black'].n === '검은 늑대');
    return L;
  });

  // ---------------------------------------------------------------- 6) 스탯 배분 고정
  await run('6) 스탯 배분 고정 (대표 지시: 캐릭터 변경 아니면 고정)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('allocRecall / allocRemember / allocClamp 존재',
       typeof allocRecall === 'function' && typeof allocRemember === 'function' && typeof allocClamp === 'function');
    // (1) 기사로 배분하고 기억
    pickCls = 'k'; ALLOC = { str: 3, dex: 2, con: 1, int: 0, wis: 0 };
    allocRemember('k');
    ok('★ 시작 시 배분이 META 에 계열별로 기억된다', !!META.alloc && META.alloc.k.str === 3 && META.alloc.k.dex === 2,
       { alloc: META.alloc });
    // (2) 새로 시작 — 같은 계열이면 그대로 복원
    ALLOC = { str: 0, dex: 0, con: 0, int: 0, wis: 0 };
    allocRecall('k');
    ok('★ 새로 시작해도 같은 계열이면 배분이 그대로다 (다시 찍지 않는다)',
       ALLOC.str === 3 && ALLOC.dex === 2 && ALLOC.con === 1, { ALLOC: ALLOC });
    ok('남은 포인트도 맞게 계산된다', allocLeft() === ALLOC_POOL - 6, { left: allocLeft() });
    // (3) 계열을 바꾸면 그 계열 것으로
    allocRecall('m');
    ok('★ 계열을 바꾸면 그 계열의 배분(처음이면 0)으로 갈린다',
       ALLOC.str === 0 && ALLOC.dex === 0 && allocLeft() === ALLOC_POOL, { ALLOC: ALLOC });
    ALLOC = { str: 0, dex: 0, con: 0, int: 4, wis: 4 }; allocRemember('m');
    allocRecall('k');
    ok('기사로 돌아오면 기사 배분이 돌아온다', ALLOC.str === 3 && ALLOC.int === 0, { ALLOC: ALLOC });
    allocRecall('m');
    ok('마도학자로 가면 마도학자 배분이 돌아온다', ALLOC.int === 4 && ALLOC.wis === 4, { ALLOC: ALLOC });
    // (4) 저장값을 그대로 믿지 않는다
    /* ★ allocRecall 은 metaLoad() 로 저장소를 다시 읽는다 — 메모리만 고치면 그 값은 버려진다.
       (1차 실행에서 이걸 놓쳐 '클램프가 안 먹는다'는 오탐이 났다.) 반드시 저장까지 해야 검증된다. */
    META.alloc.k = { str: 99, dex: 99, con: 99, int: 99, wis: 99 }; metaSave();
    allocRecall('k');
    ok('★ 초과 저장값은 상한(POOL·CAP)으로 재단된다 — 공짜 스탯 방지',
       allocLeft() === 0 && Math.max(ALLOC.str, ALLOC.dex, ALLOC.con, ALLOC.int, ALLOC.wis) <= ALLOC_CAP,
       { ALLOC: ALLOC, left: allocLeft() });
    META.alloc.k = { str: -5, dex: 1.7, con: null, int: 0, wis: 0 }; metaSave();
    allocRecall('k');
    ok('음수·소수·null 도 안전하게 정리된다', ALLOC.str === 0 && ALLOC.dex === 1 && ALLOC.con === 0, { ALLOC: ALLOC });
    // (5) 실제 캐릭터에 반영되는가
    META.alloc = {}; pickCls = 'k'; ALLOC = { str: 5, dex: 0, con: 3, int: 0, wis: 0 };
    const baseStr = CLS.k.str, baseHp = CLS.k.hp;
    startGame();
    ok('★ 배분이 캐릭터 스탯에 실제로 들어간다', P.str === baseStr + 5, { str: [baseStr, P.str] });
    ok('CON 배분이 HP 로 들어간다(+3/점)', P.mhp >= baseHp + 9, { mhp: P.mhp });
    ok('P.alloc 스냅샷도 남는다(사망 후 복원용)', P.alloc.str === 5 && P.alloc.con === 3, { snap: P.alloc });
    ok('★ 시작하면 자동으로 기억된다', META.alloc.k.str === 5 && META.alloc.k.con === 3, { alloc: META.alloc });
    return L;
  });

  // ---------------------------------------------------------------- 7) UI 안내
  await run('7) 배분 화면 안내 — "왜 이미 찍혀 있지?" 를 막는다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    document.getElementById('charov').style.display = 'block';
    showCharSel();
    ok('캐릭터 선택 화면이 지난 배분을 불러온다', ALLOC.str === 5 && ALLOC.con === 3, { ALLOC: ALLOC });
    buildStatAlloc();
    const h = document.getElementById('statalloc').innerHTML;
    ok('★ "지난 배분을 그대로 불러왔습니다" 안내가 뜬다', h.indexOf('지난 배분') >= 0);
    ok('초기화 버튼은 그대로 동작', (function () { allocReset(); return allocLeft() === ALLOC_POOL; })());
    allocRecall('k');
    ok('초기화해도 저장값은 남아 있다(다시 불러올 수 있다)', ALLOC.str === 5, { ALLOC: ALLOC });
    document.getElementById('charov').style.display = 'none';
    return L;
  });

  // ---------------------------------------------------------------- 8) 확장팩이 변종을 들여올 수 있나
  await run('8) 확장팩 변종 (data/pack_*.json 이 있을 때만)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const packed = Object.keys(PACK_OWNED || {});
    if (!packed.length) { L.push('(설치된 팩이 없어 건너뜀 — 팩을 넣고 다시 돌리면 검증된다)'); return L; }
    /* 어느 팩이 깔려 있든 통하도록 — build.py 가 팩 변종에 vp(출처 팩)를 찍어 둔다. */
    const pvKeys = Object.keys(MOBS).filter(k => MOBS[k].vp);
    ok('★ 팩이 들여온 변종이 MOBS 에 있다', pvKeys.length > 0,
       { 팩변종: pvKeys.map(k => MOBS[k].n + '(' + MOBS[k].vp + ')') });
    const pk = pvKeys[0], pv = MOBS[pk], base = MOBS[pv.vb];
    ok('팩 변종도 원종 시트를 쓴다', !!base && !!pv.vt, { 원종: pv.vb });
    ok('팩 변종도 계보 배수를 받았다', pv.hp !== base.hp && pv.lv > base.lv,
       { hp: [base.hp, pv.hp], lv: [base.lv, pv.lv] });
    ok('★ 팩 존 스폰에 변종을 적어도 빌드가 통과했다(정합성 검사 대상)',
       ZONES.slice(6).some(z => (z.spawns || []).some(s => s[0].indexOf('@') > 0)),
       { spawns: ZONES[6].spawns.map(s => s[0]) });
    ok('★ 팩 변종도 색이 구워진다', mobVariantEnsure(pk) === true, { key: pk });
    ok('도감 총수는 여전히 원종만', metaDexTotal() === Object.keys(MOBS).filter(k => k.indexOf('@') < 0).length,
       { total: metaDexTotal() });
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
