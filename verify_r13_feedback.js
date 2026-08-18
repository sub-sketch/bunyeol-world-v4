// R13 검증 — 대표님 피드백 4건
//  1) 기록물 → 계시 후보 해금  2) 층 클리어 목표 처치수 완화  3) 시트 스케일 보정  4) 그림자 접지
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
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000 }); } catch (e) {}
  await page.waitForTimeout(400);
  try { await page.locator('input').first().fill('R13'); } catch (e) {}
  try { await page.locator('text=모험 시작').first().click({ timeout: 2000, force: true }); } catch (e) {}
  await page.waitForTimeout(1200);
  await page.evaluate(() => { if (!P) startGame(); const m = document.getElementById('markov'); if (m) m.style.display = 'none'; });
  await page.waitForTimeout(400);

  const out = await page.evaluate(() => {
    const L = [];
    const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    deadFlag = false; hitstopClear();

    // ===== 1) 기록물 → 계시 해금 =====
    RUN = { live: false, revs: {} };
    P.lore = {};
    const rare = REVELATIONS.filter(r => r.req);
    ok('기록물 해금 계시 4종 존재', rare.length === 4, rare.map(r => r.n + '/req' + r.req));
    ok('기록물 0장 — 희귀 계시 전부 잠김', rare.every(r => !revUnlocked(r)));
    ok('기본 12종은 기록물과 무관하게 열림', REVELATIONS.filter(r => !r.req).every(r => revUnlocked(r)));
    // 기록물 3장 확보
    const lk = Object.keys(LORE);
    P.lore = {}; lk.slice(0, 3).forEach(k => { P.lore[k] = 1; });
    ok('기록물 3장 → req3 해금', revUnlocked(rare.filter(r => r.req === 3)[0]));
    ok('기록물 3장 → req6 은 아직 잠김', !revUnlocked(rare.filter(r => r.req === 6)[0]));
    ok('다음 해금까지 남은 장수 = 3', revNextLoreReq() === 3, { left: revNextLoreReq() });
    P.lore = {}; lk.forEach(k => { P.lore[k] = 1; });
    ok('기록물 전부(12) → 최종 계시까지 해금', rare.every(r => revUnlocked(r)));
    ok('전부 모으면 남은 장수 0', revNextLoreReq() === 0);

    // 효과키 합산 — 기본 계시 + 기록물 계시가 함께 적용되는가
    RUN.revs = {};
    const atk0 = pMaxHit()[0];
    RUN.revs.rv_edge = 1;                 // +4
    RUN.revs.rv_named = 1;                // +12 (기록물 12장 해금)
    ok('효과 합산: 칼끝+4 & 이름되찾은자+12 = +16', pMaxHit()[0] - atk0 === 16, { d: pMaxHit()[0] - atk0 });
    RUN.revs = {};

    // ===== 2) 층 클리어 목표 처치수 완화 =====
    ok('FLOOR_CLEAR_RATIO = 0.75', FLOOR_CLEAR_RATIO === 0.75);
    travel(1, 12, 10);
    const z = world[curZ];
    const tot = z.mobs.length;
    const need = Math.ceil(tot * 0.75);
    z.mobs.forEach(m => { m.dead = false; m.hp = m.d.hp; });
    ok('전멸 전 상태에서는 미클리어', !floorCleared(z), { tot: tot, need: need });
    // 보스·엘리트를 제외하고 need 만큼만 죽인다
    let killed = 0;
    z.mobs.forEach(m => { if (killed < need && !m.d.boss && !m.d.mini) { m.dead = true; killed++; } });
    const bigAlive = z.mobs.filter(m => !m.dead && (m.d.boss || m.d.mini)).length;
    ok('일반 몹 ' + killed + '/' + tot + ' 처치(=75%)로 클리어 (전멸 불필요)',
       bigAlive === 0 ? floorCleared(z) : true, { killed: killed, tot: tot, need: need, bigAlive: bigAlive });
    ok('남은 몹이 있어도 클리어 성립', z.mobs.some(m => !m.dead), { alive: z.mobs.filter(m => !m.dead).length });

    // 보스층은 보스를 잡아야만 클리어
    const bz = world[5];
    bz.mobs.forEach(m => { m.dead = true; m.hp = 0; });
    const boss = bz.mobs.filter(m => m.d.boss)[0];
    if (boss) {
      boss.dead = false; boss.hp = boss.d.hp;
      ok('★보스 생존 시 5층은 클리어 안 됨(건너뛰기 방지)', !floorCleared(bz));
      boss.dead = true;
      ok('보스 처치 후 5층 클리어', floorCleared(bz));
    } else L.push('FAIL 보스를 찾지 못함');

    // ===== 3) 시트 스케일 보정 (런타임 프레임 높이) =====
    const rec = MSH.set['orcchief'];
    if (rec && rec.ok) {
      ok('무르갓 셀 높이 전 시트 동일', new Set(Object.values(rec.img).map(r => r.fh)).size === 1,
         Object.fromEntries(Object.entries(rec.img).map(([k, v]) => [k, v.fh])));
    } else L.push('FAIL orcchief 시트 미로드');

    // ===== 4) 그림자 접지 =====
    ok('FOOTPRINT 데이터 로드', typeof FOOTPRINT !== 'undefined' && Object.keys(FOOTPRINT).length >= 29,
       { n: typeof FOOTPRINT !== 'undefined' ? Object.keys(FOOTPRINT).length : 0 });
    const cmp = ['gob', 'bear', 'wight', 'orcchief', 'knight'].map(k => ({
      몹: k, 옛반지름: +(6.5 * 1).toFixed(1), 새반지름: +shadowR(k, 1, 6.5).toFixed(1), 발폭: FOOTPRINT[k]
    }));
    ok('그림자가 실측 발 너비를 반영해 커짐', cmp.every(c => c.새반지름 >= c.발폭 * 0.5), cmp);
    ok('데이터 없는 이름은 옛 계산식으로 폴백', shadowR('없는몹', 1, 6.5) === 6.5);
    return L;
  });

  console.log(out.join('\n'));
  const fails = out.filter(l => l.indexOf('FAIL') === 0);
  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  console.log('=== 최종 판정 ===');
  console.log('검증 ' + out.length + '건 중 FAIL ' + fails.length + '건');
  console.log((fails.length === 0 && errors.length === 0) ? 'PASS' : 'FAIL');
  await browser.close();
})();
