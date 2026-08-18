// R19a 검증: 부(ACT) 체계 + 확장팩 병합 + 정합성 검사 + 계열 해금 팝업 + 갈림길
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
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1800 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(200); }
  await page.evaluate(() => { if (!P) startGame(); const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none'; });
  await page.waitForTimeout(600);

  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) 부 체계 — 상수 하드코딩 해체', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('ACTS 가 데이터로 존재', Array.isArray(ACTS) && ACTS.length >= 1, { n: ACTS.length, ids: ACTS.map(a => a.id) });
    // ★ 예전엔 FLOOR_OF 가 {1:1..5:5} 상수였다 — 이제 ACTS 에서 파생된다
    ok('★ FLOOR_OF 가 ACTS 에서 파생됨', Object.keys(FLOOR_OF).length === ACTS.reduce((s, a) => s + Object.keys(a.floors).length, 0),
       { FLOOR_OF: FLOOR_OF });
    ok('★ FLOOR_FAM 중복선언에 덮이지 않음(팩 층 계열 생존)',
       ACTS.every(a => Object.keys(a.fam || {}).every(f => FLOOR_FAM[f] === a.fam[f])), { FLOOR_FAM: FLOOR_FAM });
    ok('RUN_ENTRY 는 첫 부의 진입점', RUN_ENTRY.z === ACTS[0].entry.z, { RUN_ENTRY: RUN_ENTRY });
    ok('actOfZone / actOfFloor 동작', actOfFloor(1).id === ACTS[0].id && actOfZone(ACTS[0].floors['1']).id === ACTS[0].id);
    ok('★ isActBoss 가 f===5 하드코딩을 대체', isActBoss(ACTS[0].boss) === true && isActBoss(1) === false);
    ok('floorFam 이 상한 없이 동작(옛 Math.min(5,..) 대체)',
       typeof floorFam(1) === 'string' && typeof floorFam(99) === 'string', { f1: floorFam(1), f99: floorFam(99) });
    return L;
  });

  await run('2) 확장팩 병합 — 2부가 실제로 붙었나', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('PACK_OWNED 플래그 생성', typeof PACK_OWNED === 'object', { PACK_OWNED: PACK_OWNED });
    const p2 = ACTS.filter(a => a.pack !== 'base');
    /* ★ 배포본에는 팩이 없다(당연하다). 팩 관련 절은 팩을 넣고 돌려야 검증된다 —
       예전엔 여기서 undefined 를 읽고 스크립트가 통째로 죽어, 앞 절 결과까지 못 봤다.
       data/pack_예시_2부.json.example 을 data/pack_test2.json 으로 복사하고 빌드하면 켜진다. */
    if (!p2.length) { L.push('(팩 미설치 — 2·3·5·6절 건너뜀. pack_예시_2부.json.example 을 pack_test2.json 으로 복사해 빌드하면 검증된다)'); return L; }
    ok('★ 팩 부가 병합됨', p2.length >= 1, { 팩부: p2.map(a => a.id + '/' + a.pack) });
    ok('★ 팩 존이 본편 뒤에 붙었다', ZONES.length > 6, { 존수: ZONES.length });
    ok('팩 부의 층이 본편과 겹치지 않음', (() => {
      const seen = {}; let dup = false;
      ACTS.forEach(a => Object.keys(a.floors).forEach(f => { if (seen[f]) dup = true; seen[f] = 1; }));
      return !dup;
    })());
    ok('팩 존이 실제로 월드에 생성됨', world.length === ZONES.length && !!world[6], { world: world.length });
    // 소유 게이팅
    const owned = actOwned(p2[0]);
    PACK_OWNED[p2[0].pack] = false;
    ok('★ 미소유로 바꾸면 그 부가 목록에서 빠진다', actList().every(a => a.id !== p2[0].id));
    PACK_OWNED[p2[0].pack] = owned;
    ok('소유 복구 시 다시 들어온다', actList().some(a => a.id === p2[0].id));
    return L;
  });

  await run('3) 해금 조건 — 1부 클리어 전에는 2부가 안 열린다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const a1 = ACTS[0], a2 = ACTS.filter(a => a.req === a1.clearFlag)[0];
    if (!a2) { L.push('(팩 미설치 — 건너뜀)'); return L; }
    META[a1.clearFlag] = 0;
    ok('★ 1부 미클리어면 2부 미해금', actUnlocked(a2) === false);
    ok('★ 그래서 갈림길도 안 뜬다(nextAct null)', nextAct(a1) === null);
    META[a1.clearFlag] = 1;
    ok('1부 클리어 후 2부 해금', actUnlocked(a2) === true && nextAct(a1) === a2);
    ok('마지막 부는 isFinalBoss', isFinalBoss(a2.boss) === true && isFinalBoss(a1.boss) === false);
    return L;
  });

  await run('4) 계열 해금 팝업 (대표님 지시)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('showClassUnlock 존재', typeof showClassUnlock === 'function');
    let chained = false;
    showClassUnlock(function () { chained = true; });
    const ov = document.getElementById('frewov'), body = document.getElementById('frewbody');
    ok('★ 팝업이 실제로 뜬다', ov.style.display === 'block');
    ok('두 계열이 카드로 보인다', body.innerHTML.indexOf(CLS.e.n) >= 0 && body.innerHTML.indexOf(CLS.m.n) >= 0);
    ok('★ "새 캐릭터를 만들 때" 안내 문구 포함', body.innerHTML.indexOf('새 캐릭터') >= 0);
    ok('기사는 목록에 없다(이미 열려 있음)', body.innerHTML.indexOf('>' + CLS.k.n + '<') < 0);
    closeClassUnlock();
    ok('닫으면 팝업 사라짐', ov.style.display === 'none');
    return new Promise(res => setTimeout(() => {
      ok('★ 닫은 뒤 다음 단계(갈림길)로 이어진다', chained === true);
      res(L);
    }, 420));
  });

  await run('5) 갈림길 — 정산 vs 더 깊이', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const a1 = ACTS[0];
    META[a1.clearFlag] = 1;
    const a2 = nextAct(a1);
    if (!a2) { L.push('(팩 미설치 — 건너뜀)'); return L; }
    runStart(); travel(a1.floors[String(a1.boss)], 3, 3);
    ok('1부 보스층 진입', FLOOR_OF[curZ] === a1.boss, { floor: FLOOR_OF[curZ] });
    showActChoice();
    const body = document.getElementById('frewbody');
    ok('★ 갈림길 창이 뜬다', document.getElementById('frewov').style.display === 'block');
    ok('더 깊이 / 정산 두 선택 제시', body.innerHTML.indexOf('더 깊이') >= 0 && body.innerHTML.indexOf('정산') >= 0);
    ok('다음 부 이름이 보인다', body.innerHTML.indexOf(a2.n) >= 0);
    // 더 깊이 — 레벨·계시를 안고 이어지는가
    P.lv = 15; const lvBefore = P.lv, revBefore = revCount();
    actGoDeeper();
    ok('★ 2부 진입 — 층이 이어진다', FLOOR_OF[curZ] === Math.min.apply(null, Object.keys(a2.floors).map(Number)),
       { floor: FLOOR_OF[curZ], zone: curZ });
    ok('★ 런이 끊기지 않았다(계속 진행 중)', runActive() === true);
    ok('★ 레벨이 그대로 이어진다', P.lv === lvBefore, { lv: P.lv });
    ok('계시(문신)도 유지', revCount() === revBefore);
    ok('부 판정이 2부로 바뀜', actOfZone(curZ).id === a2.id);
    return L;
  });

  await run('6) 2부 보스 클리어 → 최종', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const a2 = actOfZone(curZ);
    if (!a2 || a2.pack === 'base') { L.push('(팩 미설치 — 건너뜀)'); return L; }
    META[a2.clearFlag] = 0;
    travel(a2.floors[String(a2.boss)], 3, 3);
    ok('2부 보스층 진입', FLOOR_OF[curZ] === a2.boss);
    const z = world[curZ];
    z.mobs.forEach(m => { if (!m.dead) killMob(m); });
    ok('★ 2부 클리어 플래그 기록', !!META[a2.clearFlag], { flag: a2.clearFlag, v: META[a2.clearFlag] });
    /* 팩이 부를 2개 이상 들여올 수도 있다(서륙 팩 = 동대륙 + 마경). 그러면 이 부는 최종이 아니다.
       그래서 "무조건 null" 이 아니라 **목록의 마지막 부에서만 null** 인지를 본다. */
    var nx = nextAct(a2), last = actList()[actList().length - 1];
    ok(nx ? ('이 부 다음이 또 있다 — 갈림길이 이어진다 (' + nx.n + ')') : '최종 보스라 갈림길 없음',
       nx ? actUnlocked(nx) : true, { next: nx ? nx.id : null });
    ok('★ 마지막 부에서는 갈림길이 없다(정산으로 끝난다)', nextAct(last) === null,
       { last: last.id });
    return L;
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 4).join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
