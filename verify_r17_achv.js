// R17 검증: 업적 20종 + 마물 도감/계열 클리어(수집 요소) + 구버전 세이브 호환
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });

  await page.goto(url);
  await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(200); }
  const boot = await page.evaluate(() => {
    if (!P) { try { startGame(); } catch (e) { return 'startGame 예외: ' + e.message; } }
    const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none';
    return P ? ('P 생성됨 lv' + P.lv + ' ' + P.cls) : 'P 없음';
  });
  console.log('부트스트랩: ' + boot);
  await page.waitForTimeout(400);

  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ===');
    L.forEach(l => console.log(l));
    return L;
  };

  let all = [];

  // ---------- 1) 업적 정의 무결성 ----------
  all = all.concat(await run('1) 업적 20종 정의', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    ok('ACHV 20종', ACHV.length === 20, { n: ACHV.length });
    const ids = ACHV.map(a => a.id);
    ok('id 중복 없음', new Set(ids).size === ids.length);
    ok('모든 항목에 이름·점수·설명(d)', ACHV.every(a => a.n && a.p > 0 && a.d));
    ok('모든 test 가 함수', ACHV.every(a => typeof a.test === 'function'));
    // 난이도 순서 = 점수 오름차순이어야 nextGoalLine 안내가 자연스럽다
    let asc = true, prev = 0, bad = null;
    ACHV.forEach(a => { if (a.p < prev) { asc = false; bad = bad || a.id; } prev = a.p; });
    ok('점수 오름차순(난이도 순)', asc, bad ? { 어긋난항목: bad } : undefined);
    ok('기존 5종 id 보존(구버전 달성 기록 유지)',
      ['first_run', 'floor2', 'floor3', 'kill20', 'boss'].every(i => ids.indexOf(i) >= 0));
    const tot = ACHV.reduce((s, a) => s + a.p, 0);
    L.push('INFO 업적 총점 ' + tot + 'P (기존 280P)');
    return L;
  }));

  // ---------- 2) 모든 test 가 예외 없이 돈다 ----------
  all = all.concat(await run('2) test 안전성 — 빈 런/가득찬 런', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    const bare = { maxFloor: 1, kills: 0, dmgTaken: 0, goldEarned: 0, revs: {}, noHitCount: 0, result: 'death' };
    let err = null;
    ACHV.forEach(a => { try { a.test(bare); } catch (e) { err = a.id + ': ' + e.message; } });
    ok('★ 빈 런에서 20종 전부 예외 없음', !err, err || undefined);
    const full = { maxFloor: 5, kills: 99, dmgTaken: 0, goldEarned: 9999, revs: { rv_edge: 2 }, noHitCount: 5, result: 'clear' };
    err = null;
    ACHV.forEach(a => { try { a.test(full); } catch (e) { err = a.id + ': ' + e.message; } });
    ok('★ 만렙 런에서 20종 전부 예외 없음', !err, err || undefined);
    // 빈 런으로는 아무것도 달성되면 안 된다(first_run 제외)
    const got = ACHV.filter(a => { try { return a.test(bare); } catch (e) { return false; } }).map(a => a.id);
    ok('빈 런 달성은 first_run 뿐', got.length === 1 && got[0] === 'first_run', { got: got });
    return L;
  }));

  // ---------- 3) 마물 도감 ----------
  all = all.concat(await run('3) 마물 도감(수집)', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    META.dex = {};
    /* R19b 이후: MOBS 에는 색변경 변종(wolf@red 등)이 함께 들어 있다. 도감은 변종을 원종으로
       합쳐 세므로 분모도 원종만이다 — 여기서 전체 키 수와 비교하면 제품이 옳은데도 FAIL 이 난다. */
    const BASE_MOBS = Object.keys(MOBS).filter(k => k.indexOf('@') < 0);
    ok('도감 총수 = 원종 몹 정의 수 (변종 제외)', metaDexTotal() === BASE_MOBS.length,
       { total: metaDexTotal(), 원종: BASE_MOBS.length, 변종: Object.keys(MOBS).length - BASE_MOBS.length });
    ok('시작은 0종', metaDexCount() === 0);
    metaMarkDex('wolf');
    ok('처치 기록 1종', metaDexCount() === 1, { dex: Object.keys(META.dex) });
    metaMarkDex('wolf');
    ok('★ 같은 종 중복 기록 안 됨', metaDexCount() === 1);
    metaMarkDex('wolf@red');
    ok('★ 변종(wolf@red)은 원종으로 합산 — 여전히 1종', metaDexCount() === 1, { dex: Object.keys(META.dex) });
    metaMarkDex('gob');
    ok('다른 종은 정상 추가', metaDexCount() === 2);
    metaMarkDex(null); metaMarkDex('');
    ok('빈 키는 무시', metaDexCount() === 2);
    // 전부 채우면 dex_all 성립
    for (const k in MOBS) metaMarkDex(k);
    const achDexAll = ACHV.filter(a => a.id === 'dex_all')[0];
    ok('전종 기록 시 「마물 도감 완성」 성립', achDexAll.test({}), { count: metaDexCount(), total: metaDexTotal() });
    return L;
  }));

  // ---------- 4) 계열 클리어 ----------
  all = all.concat(await run('4) 계열 클리어 기록', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    META.clsClear = {};
    const a = ACHV.filter(x => x.id === 'cls_all')[0];
    ok('시작은 0계열, 업적 미달성', metaClsClearCount() === 0 && !a.test({}));
    metaMarkClsClear('k'); metaMarkClsClear('k');
    ok('★ 같은 계열 중복 안 늘어남', metaClsClearCount() === 1, { n: metaClsClearCount() });
    metaMarkClsClear('e');
    ok('2계열에서는 아직 미달성', metaClsClearCount() === 2 && !a.test({}));
    metaMarkClsClear('m');
    ok('3계열 전부 → 「세 계열」 달성', a.test({}), { cls: Object.keys(META.clsClear) });
    return L;
  }));

  // ---------- 5) 무결한 층 카운트 ----------
  all = all.concat(await run('5) 무결한 층(noHitCount)', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    RUN = { live: true, t0: 0, floor: 1, maxFloor: 1, kills: 0, dmgTaken: 0, goldEarned: 0,
            noHitFloor: true, noHitCount: 0, achieved: [], revs: {}, rew: {} };
    const z0 = curZ; curZ = 1;
    runOnFloorClear();
    ok('안 맞고 정리 → 무결한 층 1', RUN.noHitCount === 1, { n: RUN.noHitCount });
    runOnFloorClear(); runOnFloorClear();
    ok('★ 같은 층 재호출로 중복 안 셈', RUN.noHitCount === 1, { n: RUN.noHitCount });
    // 맞은 뒤 다른 층 정리
    curZ = 2; RUN.noHitFloor = true; runOnHurt(5);
    ok('피격 시 noHitFloor 해제', RUN.noHitFloor === false);
    runOnFloorClear();
    ok('★ 맞은 층은 안 셈 — 여전히 1', RUN.noHitCount === 1, { n: RUN.noHitCount });
    // 다시 무결하게
    curZ = 3; RUN.noHitFloor = true; runOnFloorClear();
    ok('새 층 무결 → 2', RUN.noHitCount === 2, { n: RUN.noHitCount });
    const a1 = ACHV.filter(x => x.id === 'nohit1')[0], a3 = ACHV.filter(x => x.id === 'nohit3')[0];
    ok('「무결한 층」 달성 / 「그림자처럼」 미달성', a1.test(RUN) && !a3.test(RUN));
    curZ = 4; RUN.noHitFloor = true; runOnFloorClear();
    ok('3개째 → 「그림자처럼」 달성', a3.test(RUN), { n: RUN.noHitCount });
    curZ = z0; RUN = null;
    return L;
  }));

  // ---------- 6) ★ 구버전(v4) 세이브 호환 — 영구 성장이 날아가지 않는가 ----------
  all = all.concat(await run('6) ★ 구버전 세이브 호환 (dex/clsClear 없는 저장)', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    // R16 이전 포맷 그대로 — dex/clsClear 키가 아예 없다
    const legacy = { v: 4, pt: 1234, spent: 500, nodes: { hp: 3, atk: 2 }, sk: {}, skComp: 0,
                     achv: ['first_run', 'floor2'], runs: 7, best: 4, tkills: 250, mark: 'blade', clear1: 1 };
    localStorage.setItem('lc2_meta_v4', JSON.stringify(legacy));
    const loaded = metaLoad();
    ok('★ 구버전 저장을 읽어들임(전멸하지 않음)', loaded === true);
    /* R32 — 계열 스킬이 구매형으로 통합되면서, 이관 전 저장본은 한 번만 보상 포인트를 받는다.
       그러니 "그대로"가 아니라 "원금 + 보상(≤400P)" 이 맞는 기대값이다. 원금이 깎이지 않는 것이 핵심. */
    const comp32 = META.pt - 1234;
    ok('★ 포인트 보존(원금 유지 + R32 이관 보상)', META.pt >= 1234 && comp32 <= 400,
       { pt: META.pt, 보상: comp32 });
    ok('★ 이관은 한 번만 — 다시 읽어도 또 주지 않는다', (() => {
      const before = META.pt; metaSave(); metaLoad(); return META.pt === before;
    })(), { pt: META.pt });
    ok('★ 노드 보존', META.nodes.hp === 3 && META.nodes.atk === 2, { nodes: META.nodes });
    ok('★ 기존 업적 기록 보존', META.achv.length === 2 && metaHasAchv('floor2'), { achv: META.achv });
    ok('★ 누적 처치 보존', META.tkills === 250);
    ok('★ 1부 클리어 기록 보존', META.clear1 === 1);
    ok('신규 dex 는 빈 값으로 폴백', META.dex && metaDexCount() === 0, { dex: META.dex });
    ok('신규 clsClear 도 빈 값으로 폴백', META.clsClear && metaClsClearCount() === 0);
    // 신규 필드가 붙은 뒤 저장 → 재로드해도 유지되는가
    metaMarkDex('wolf'); metaMarkClsClear('k'); metaSave();
    META.dex = {}; META.clsClear = {}; META.pt = 0;
    metaLoad();
    ok('★ 저장 후 재로드 — 도감/계열 유지', metaDexCount() === 1 && metaClsClearCount() === 1 && META.pt >= 1234,
       { dex: metaDexCount(), cls: metaClsClearCount(), pt: META.pt });
    return L;
  }));

  // ---------- 7) UI ----------
  all = all.concat(await run('7) 업적/도감 화면', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    META.dex = { wolf: 1 }; META.achv = ['first_run'];
    let ha = '', hd = '';
    try { ha = metaAchvList(); hd = metaDexList(); } catch (e) { L.push('FAIL 렌더 예외: ' + e.message); return L; }
    ok('업적 20개 전부 렌더', (ha.match(/★|☆/g) || []).length >= 20, { marks: (ha.match(/★|☆/g) || []).length });
    ok('달성은 ★, 미달성은 ☆', ha.indexOf('★ 첫 걸음') >= 0 && ha.indexOf('☆ 2층 도달') >= 0);
    ok('미달성 항목에 조건 설명 노출', ha.indexOf('2층에 발을 딛는다') >= 0);
    // 도감은 반드시 도감 출력(hd)만 본다 — 업적 이름 "이름을 잃은 기사 격파" 가
    // 보스 이름 MOBS.dk.n 을 통째로 포함하고 있어, 합쳐서 검색하면 오탐이 난다.
    ok('도감 — 잡은 종은 이름', hd.indexOf(MOBS.wolf.n) >= 0);
    ok('★ 도감 — 안 잡은 종은 ??? 로 가려짐', hd.indexOf('???') >= 0 && hd.indexOf(MOBS.dk.n) < 0,
       { '???': hd.indexOf('???') >= 0, '보스이름노출': hd.indexOf(MOBS.dk.n) >= 0 });
    const hidden = Object.keys(MOBS).filter(k => k.indexOf('@') < 0 && !META.dex[k]).length;   /* R19b 변종 제외 */
    ok('★ 미획득 종 수 = ??? 개수', (hd.match(/\?\?\?/g) || []).length === hidden, { hidden: hidden });
    try { renderMeta(); ok('메타 화면 전체 렌더 무오류', true); } catch (e) { ok('메타 화면 전체 렌더 무오류', false, e.message); }
    const el = document.getElementById('metalist');
    /* R20b — 화면이 [노드] / [업적·도감] 탭으로 갈렸다(대표 지시). 그래서 업적·도감은
       그 탭으로 바꾼 뒤에 봐야 한다. 대신 **수치줄은 두 탭에 다 있어야** 한다 — 그게 지시의 핵심이다. */
    metaTab('node');
    const hNode = document.getElementById('metalist').innerHTML;
    ok('[노드] 탭에는 노드판이 있다', hNode.indexOf('mboard') >= 0);
    ok('★ [노드] 탭에도 수치줄이 있다', hNode.indexOf('업적 ') >= 0 && hNode.indexOf('도감 ') >= 0);
    metaTab('achv');
    const hAchv = document.getElementById('metalist').innerHTML;
    ok('메타 화면에 도감 섹션 존재 ([업적·도감] 탭)', hAchv.indexOf('마물 도감') >= 0);
    ok('메타 화면에 업적 목록 존재 ([업적·도감] 탭)', hAchv.indexOf('☆') >= 0);
    ok('★ [업적·도감] 탭에도 같은 수치줄이 남아 있다', hAchv.indexOf('업적 ') >= 0 && hAchv.indexOf('도감 ') >= 0);
    metaTab('node');
    return L;
  }));

  // ---------- 8) 실제 런 정산에서 업적이 지급되는가 ----------
  all = all.concat(await run('8) 정산 연동', () => {
    const L = []; const ok = (n, c, x) => { L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : '')); };
    META.achv = []; META.pt = 0; META.dex = {}; META.clsClear = {}; META.runs = 0;
    RUN = { live: true, t0: T - 60, floor: 3, maxFloor: 3, kills: 25, dmgTaken: 10, goldEarned: 100,
            noHitFloor: false, noHitCount: 1, achieved: [], revs: { rv_edge: 1 }, rew: {} };
    const sc = runScore(RUN);
    const got = sc.newA.map(a => a.id);
    ok('정산에서 신규 업적 추출', got.length > 0, { got: got });
    ok('조건 맞는 것만 — floor3 포함, floor4 제외', got.indexOf('floor3') >= 0 && got.indexOf('floor4') < 0, { got: got });
    ok('무결한 층 1개 → nohit1 포함', got.indexOf('nohit1') >= 0);
    ok('★ 아직 못 딴 nohit3 는 제외', got.indexOf('nohit3') < 0);
    ok('업적 점수가 총점에 반영', sc.total > (3 * PT_PER_FLOOR + 25 * PT_PER_KILL), { total: sc.total });
    // 두 번째 정산에서 같은 업적이 또 나오면 안 된다
    sc.newA.forEach(a => metaMarkAchv(a.id));
    const sc2 = runScore(RUN);
    ok('★ 이미 딴 업적은 재지급 안 됨', sc2.newA.length === 0, { again: sc2.newA.map(a => a.id) });
    ok('nextGoalLine 동작', typeof nextGoalLine() === 'string' && nextGoalLine().length > 0);
    RUN = null;
    return L;
  }));

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
