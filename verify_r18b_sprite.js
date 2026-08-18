// R18b 검증: 계열별 시트 배정 (R31f 개정 — e·m 은 전용 시트를 갖게 되어 런타임 색 변경이 사라졌다)
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const errors = [], all = [];

  async function open(cls) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push('[' + cls + '] ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('[' + cls + '] ' + m.text()); });
    await page.goto(url);
    await page.waitForTimeout(1100);
    try { await page.locator('text=건너뛰기').first().click({ timeout: 1500 }); } catch (e) {}
    for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
    await page.evaluate(c => { pickCls = c; if (!P) startGame();
      const mk = document.getElementById('markov'); if (mk) mk.style.display = 'none'; }, cls);
    await page.waitForTimeout(900);
    return page;
  }
  const run = async (page, title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  // ---------- 1) 배정표 + 에셋 재사용 ----------
  const pk = await open('k');
  await run(pk, '1) 계열별 시트 배정', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('SPRITE 배정표 3계열', SPRITE && Object.keys(SPRITE).length === 3, { keys: Object.keys(SPRITE || {}) });
    ok('기사는 전용 시트(pc)', SPRITE.k.src === 'pc' && !SPRITE.k.dh);
    ok('e·m 은 전용 계열 시트', SPRITE.e.src === 'mob:pc_elf' && SPRITE.m.src === 'mob:pc_wiz',
       { e: SPRITE.e.src, m: SPRITE.m.src });
    // ★ R31f — 전용 시트를 그렸으므로 색 변경(dh)이 필요 없다
    ok('★ 전용 시트라 색 변경값이 0', !SPRITE.e.dh && !SPRITE.m.dh, { e: SPRITE.e.dh, m: SPRITE.m.dh });
    ok('★ 배정한 시트가 MOBSHEET 에 있다',
       !!MOBSHEET[SPRITE.e.src.slice(4)] && !!MOBSHEET[SPRITE.m.src.slice(4)]);
    ok('재사용 시트가 PC 와 같은 8종 키 구조', (() => {
      const need = PCS.need, w = MOBSHEET[SPRITE.m.src.slice(4)];
      return need.every(k => typeof w[k] === 'string');
    })(), { keys: Object.keys(MOBSHEET[SPRITE.m.src.slice(4)]) });
    ok('FOOTPRINT 에 세 시트 실측값 존재',
       FOOTPRINT.knight > 0 && FOOTPRINT[SPRITE.e.src.slice(4)] > 0 && FOOTPRINT[SPRITE.m.src.slice(4)] > 0,
       { knight: FOOTPRINT.knight, e: FOOTPRINT[SPRITE.e.src.slice(4)], m: FOOTPRINT[SPRITE.m.src.slice(4)] });
    // 기사 회귀
    ok('★ 기사는 여전히 시트로 그려진다(회귀)', pcUseSheet() === true, { cls: PCS.cls });
    ok('기사 그림자 이름 = knight', pcSheetFootName() === 'knight');
    ok('기사 시트는 색 변경 없음(원본 Image 그대로)', PCS.img.idle_s.img instanceof HTMLImageElement);
    return L;
  });

  // ---------- 2) 마도학자 ----------
  const pm = await open('m');
  await run(pm, '2) 마도학자 — 전용 시트(pc_wiz)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('마도학자 생성', P.cls === 'm');
    ok('★ 예전엔 기사만 시트였다 — 이제 시트로 그려진다', pcUseSheet() === true);
    ok('배정된 계열 시트가 로드됨', PCS.cls === 'm' && PCS.loaded === PCS.need.length, { cls: PCS.cls, loaded: PCS.loaded });
    ok('그림자 이름이 계열 시트를 따라간다', pcSheetFootName() === 'pc_wiz', { n: pcSheetFootName() });
    ok('★ 전용 시트는 색 변경 없이 원본 그대로 쓴다', PCS.img.idle_s.img instanceof HTMLImageElement);
    // 8종 전부 준비
    ok('8종 시트 전부 준비', PCS.need.every(k => PCS.img[k] && PCS.img[k].ok));
    return L;
  });

  await run(pm, '3) 전용 시트 품질 — 8역할·프레임수·접지·마젠타 잔재', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    function pixels(img) {
      const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      return { d: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
    }
    const need = PCS.need;
    ok('8역할 전부 준비', need.every(k => PCS.img[k] && PCS.img[k].ok), { loaded: PCS.loaded });
    // 걷기·공격·사망은 가로 4프레임, 대기는 1프레임
    const frames = {};
    need.forEach(k => { const r = PCS.img[k]; if (r) frames[k] = r.n; });
    ok('★ 프레임 수 규격(대기1 / 걷기·공격·사망4)',
       frames.idle_s === 1 && frames.walk_s === 4 && frames.attack === 4 && frames.death === 4, frames);
    // 캔버스 높이가 역할마다 같아야 발 위치가 안 튄다(정규화 규칙)
    const hs = need.map(k => PCS.img[k].fh);
    ok('★ 역할별 캔버스 높이 편차 4px 이내(크기 펌핑 방지)', Math.max.apply(null, hs) - Math.min.apply(null, hs) <= 4, { hs: hs });
    // 발 접지 — 대기 남 프레임의 맨 아랫줄에 픽셀이 있어야 한다
    const P0 = pixels(PCS.img.idle_s.img);
    let bottom = 0, magenta = 0, opaque = 0;
    for (let x = 0; x < P0.w; x++) { const i = ((P0.h - 1) * P0.w + x) * 4; if (P0.d[i + 3] > 8) bottom++; }
    for (let i = 0; i < P0.d.length; i += 4) {
      if (P0.d[i + 3] < 8) continue; opaque++;
      const r = P0.d[i], g = P0.d[i + 1], b = P0.d[i + 2];
      /* 진짜 배경색(마젠타 ≈ 255,0,255) 잔재만 잡는다.
         '보라 계열 옷'을 잡지 않도록 임계를 높게 둔다 — 마도학자 로브가 자수정색이라
         느슨한 기준(r>120&&b>120&&g<min*0.62)으로는 정상 픽셀 75개가 걸렸다(헛FAIL). */
      if (r > 205 && b > 205 && g < 70 && Math.abs(r - b) < 26) magenta++;
    }
    ok('★ 발이 셀 하단에 접지', bottom > 0, { bottomPx: bottom });
    ok('★ 마젠타(배경색) 잔재 없음', magenta === 0, { magenta: magenta, opaque: opaque });
    return L;
  });

  // ---------- 4) 정령마법사 ----------
  const pe = await open('e');
  await run(pe, '4) 정령마법사 — 전용 시트(pc_elf)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('정령마법사 생성', P.cls === 'e');
    ok('★ 시트로 그려진다', pcUseSheet() === true);
    ok('그림자 이름 = pc_elf', pcSheetFootName() === 'pc_elf');
    ok('색 변경 없이 원본 시트', PCS.img.idle_s.img instanceof HTMLImageElement);
    ok('8종 전부 준비', PCS.need.every(k => PCS.img[k] && PCS.img[k].ok));
    // ⚠ 가죽 갈색(H8) 이 초록으로 튀던 결함 — 난색 보호대가 0°를 감싸는지
    ok('★ 난색 보호대가 0° 를 감싼다(가죽 반점 결함 방지)',
       TINT_KEEP_H1 > TINT_KEEP_H2, { H1: Math.round(TINT_KEEP_H1 * 360), H2: Math.round(TINT_KEEP_H2 * 360) });
    return L;
  });

  // ★ 시트 로드는 비동기다(img.onload). 전환 직후 같은 블록에서 검사하면 아직 null 이라
  //   제품이 정상인데도 FAIL 이 난다(처음 이렇게 짜서 헛FAIL 3건을 봤다).
  //   전환 → 준비될 때까지 대기 → 검사 순서를 지키고, 대기 시간도 같이 잰다.
  await run(pe, '5) 계열 전환 시 시트 교체 (로드 대기 포함)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    function waitReady(limit) {
      return new Promise(res => {
        const t0 = performance.now();
        (function tick() {
          if (pcSheetReady() || performance.now() - t0 > (limit || 2000)) return res(Math.round(performance.now() - t0));
          setTimeout(tick, 8);
        })();
      });
    }
    async function swap(cls) { P.cls = cls; pcUseSheet(); return await waitReady(); }
    return (async () => {
      const before = PCS.cls;
      let ms = await swap('m');
      ok('★ 계열이 바뀌면 그 계열 시트로 다시 읽는다', PCS.cls === 'm' && pcSheetReady(), { before: before, after: PCS.cls, 대기ms: ms });
      ok('마도학자도 전용 시트(원본 Image)', PCS.img.idle_s.img instanceof HTMLImageElement);
      ms = await swap('k');
      ok('기사로 되돌리면 기사 시트', PCS.cls === 'k' && pcSheetReady(), { 대기ms: ms });
      ok('기사 시트는 색 변경 안 됨(원본 Image)', PCS.img.idle_s.img instanceof HTMLImageElement);
      ms = await swap('e');
      ok('다시 정령마법사로 복귀', PCS.cls === 'e' && PCS.img.idle_s.img instanceof HTMLImageElement, { 대기ms: ms });
      // ★ 체감 문제 — 계열 시트가 늦게 올라오면 런 시작에 절차 생성이 잠깐 보인다
      ok('★ 시트 준비까지 200ms 이내(런 시작 깜빡임 방지)', ms <= 200, { 대기ms: ms });
      // 변신 중에는 시트를 쓰지 않는다(변신체 시트 없음)
      P.tf = Object.keys(TFS)[0];
      ok('★ 변신 중에는 시트를 쓰지 않는다(기존 동작 유지)', pcUseSheet() === false, { tf: P.tf });
      P.tf = null;
      ok('변신 해제 후 복귀', pcUseSheet() === true);
      return L;
    })();
  });

  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.join('\n') : '(0건)');
  const fails = all.filter(l => l.startsWith('FAIL'));
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + fails.length + '건, 페이지오류 ' + errors.length + '건');
  console.log(fails.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
})();
