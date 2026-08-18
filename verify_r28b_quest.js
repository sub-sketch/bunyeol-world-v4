// R28 검증: 지역별 퀘스트 사슬(동대륙에 오면 새 의뢰) · 캐릭터 내보내기 잠금 + 변조 검사
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE.html');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [], all = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const dl = [];
  page.on('download', d => dl.push(d.suggestedFilename()));
  await page.goto(url);
  await page.waitForTimeout(1300);
  try { await page.locator('text=건너뛰기').first().click({ timeout: 1600 }); } catch (e) {}
  for (let i = 0; i < 3; i++) { try { await page.mouse.click(640, 400); } catch (e) {} await page.waitForTimeout(180); }
  await page.evaluate(() => {
    try { META.mark = 'blade'; META.clear1 = 1; META.clear2 = 1; metaSave(); } catch (e) {}
    if (!P) startGame();
    ['markov', 'frewov', 'allocov'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    P.lv = 30; P.gold = 300000;
  });
  await page.waitForTimeout(400);
  const run = async (title, fn) => {
    const L = await page.evaluate(fn);
    console.log('\n=== ' + title + ' ==='); L.forEach(l => console.log(l)); all.push(...L);
  };

  await run('1) 지역마다 사슬이 따로 있다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('★ 지역별 사슬 함수가 있다', typeof qChain === 'function' && typeof qRegOf === 'function');
    const seo = qChain('seo'), dong = qChain('dong'), ma = qChain('ma');
    ok('★ 서대륙 사슬은 본편 이야기다', seo.length >= 8 && seo.indexOf('q1') === 0, { 서대륙: seo.length });
    ok('★ 동대륙 사슬이 따로 있다', dong.length >= 4 && dong.every(q => qRegOf(q) === 'dong'), { 동대륙: dong });
    ok('★ 마경 사슬이 따로 있다', ma.length >= 4 && ma.every(q => qRegOf(q) === 'ma'), { 마경: ma });
    ok('세 사슬은 겹치지 않는다',
       new Set(seo.concat(dong, ma)).size === seo.length + dong.length + ma.length);
    ok('★ 동대륙 1번 의뢰는 서대륙 완료와 무관하게 열린다 (레벨만 보면 됨)',
       !P.qd['q8'] && qAvail(dong[0]) === true, { 첫의뢰: QUESTS[dong[0]].n, 서대륙8번완료: !!P.qd['q8'] });
    ok('★ 동대륙 2번은 동대륙 1번을 끝내야 열린다',
       qAvail(dong[1]) === false && /「/.test(qBlockReason(dong[1])) && qBlockReason(dong[1]).indexOf(QUESTS[dong[0]].n) >= 0,
       { 이유: qBlockReason(dong[1]) });
    return L;
  });

  await run('2) ★ 동대륙 길드 게시판 — 새 의뢰로 갈린다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    hubShow('seo');
    refreshQuest();
    const seoHtml = document.getElementById('qlist').innerHTML;
    ok('서대륙 게시판에는 본편 의뢰가 뜬다', /문신을 증명하라|잿빛 고블린|접경의 초소/.test(seoHtml));
    ok('★ 서대륙 게시판에 동대륙 의뢰가 섞이지 않는다',
       seoHtml.indexOf('산문의 시험') < 0 && seoHtml.indexOf('객잔의 국솥') < 0);
    hubSwitch('dong');
    refreshQuest();
    const dongHtml = document.getElementById('qlist').innerHTML;
    ok('★ 동대륙에 오면 게시판이 그 지역 의뢰로 바뀐다', /산문의 시험/.test(dongHtml), { 첫줄: (dongHtml.match(/class="qt">([^<]+)/) || [])[1] });
    ok('★ 동대륙 게시판에 본편 의뢰가 남아 있지 않다',
       dongHtml.indexOf('문신을 증명하라') < 0 && dongHtml.indexOf('세금 수레') < 0);
    ok('★ 간판이 산문(山門)이다', /산문/.test(dongHtml));
    ok('지역 이름이 게시판 머리에 붙는다', /동대륙/.test(dongHtml));
    ok('★ 완료 집계도 그 지역 기준이다 (분모가 전체가 아니다)',
       !/\/ ?1[3-9]\)/.test(dongHtml), { 집계: (dongHtml.match(/완료한 이야기 \([^)]+\)/) || [])[0] || '(없음)' });
    return L;
  });

  await run('3) 동대륙 의뢰를 실제로 받고 끝낸다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const dong = qChain('dong');
    qAcceptFrom(dong[0]);
    ok('★ 수락된다', !!P.q[dong[0]]);
    /* 목표를 채운다 — 변종(붉은 늑대)도 세어지는지 같이 본다 */
    const Q = QUESTS[dong[0]];
    Q.obj.forEach(o => { if (o.t === 'kill') for (let i = 0; i < o.n; i++) qProgress('kill', o.k.replace('@*', '@redhi'), 1);
                         if (o.t === 'collect') addItem(o.k, o.n); });
    ok('★ 변종 처치도 목표에 세어진다 (wolf@redhi → wolf@*)', qReady(dong[0]), { 진행: P.q[dong[0]].p });
    const g0 = P.gold;
    qTurnInFrom(dong[0]);
    ok('★ 보고 처리 + 보상', !!P.qd[dong[0]] && P.gold > g0, { 은화증가: P.gold - g0 });
    ok('★ 다음 동대륙 의뢰가 열린다', qAvail(qChain('dong')[1]) === true, { 다음: QUESTS[qChain('dong')[1]].n });
    /* 서대륙으로 돌아가면 본편 사슬은 그대로다 */
    qAcceptFrom(qChain('dong')[1]);
    hubSwitch('seo'); refreshQuest();
    const h = document.getElementById('qlist').innerHTML;
    ok('★ 서대륙 게시판은 다른 지역 진행 건을 안내만 한다 (섞지 않는다)',
       /다른 지역 의뢰/.test(h) && /동대륙/.test(h), { 안내: (h.match(/다른 지역 의뢰[^<]*/) || [])[0] });
    ok('본편 의뢰도 여전히 받을 수 있다', qAvail('q1') || !!P.q['q1'] || !!P.qd['q1']);
    return L;
  });

  await run('4) 추적기 — 받은 의뢰는 지역이 달라도 전부 보인다', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    qAcceptFrom('q1');
    refreshQuest();
    const t = document.getElementById('qtrack').innerHTML;
    ok('★ 서대륙·동대륙 것이 함께 뜬다',
       t.indexOf(QUESTS['q1'].n) >= 0 && t.indexOf(QUESTS[qChain('dong')[1]].n) >= 0,
       { 추적기: (t.match(/qtrow[^>]*>([^<]+)/g) || []).slice(0, 4) });
    return L;
  });

  await run('5) ★ 캐릭터 내보내기 잠금 (서버 전용 정책)', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    ok('★ 서버는 아직 꺼져 있다 (SRV.on=false)', typeof SRV === 'object' && SRV.on === false);
    ok('★ 보관 준비 상태가 아니다', charStoreReady() === false);
    fileSave();
    const lg = document.getElementById('log') ? document.getElementById('log').innerHTML : '';
    ok('★ 왜 막혔는지 알려 준다 (핵 우려 안내)', /잠겨 있습니다/.test(lg), { 로그: (lg.match(/[^>]*잠겨 있습니다[^<]*/) || [])[0] });
    ok('★ 대신 영구 성장(.meta) 백업을 안내한다', /영구 성장 내보내기/.test(lg));
    ok('버튼에 자물쇠 표시가 남는다',
       /🔒/.test(document.getElementById('charstore').textContent), { 버튼: document.getElementById('charstore').textContent });
    ok('영구 성장 내보내기는 그대로 열려 있다', typeof metaExport === 'function');
    /* 서버를 켜면 열린다 — 실제 전송은 하지 않는다(주소 없음) */
    SRV.on = true; SRV.url = 'https://example.invalid/api/char';
    ok('★ 서버를 켜면 보관이 열린다', charStoreReady() === true);
    refreshSlots();
    ok('★ 버튼 이름도 서버 보관으로 바뀐다', /보관 \(/.test(document.getElementById('charstore').textContent),
       { 버튼: document.getElementById('charstore').textContent });
    SRV.on = false; SRV.url = '';
    return L;
  });

  await run('6) ★ 변조 검사 — 손으로 고친 저장은 거부', () => {
    const L = []; const ok = (n, c, x) => L.push((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? ' :: ' + JSON.stringify(x) : ''));
    const raw = packSave(), sealed = savSeal(raw);
    ok('서명이 붙는다', sealed.indexOf('~') > 0 && sealed !== raw);
    ok('★ 원본은 통과한다', savOpen(sealed).ok === true && savOpen(sealed).state === 'sealed');
    /* 은화를 손으로 부풀린 저장 만들기 */
    const s = JSON.parse(decodeURIComponent(escape(atob(raw))));
    s.gold = 999999999;
    const hacked = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
    const forged = hacked + '~' + sealed.split('~').pop();     /* 서명은 그대로 붙여 위조 */
    ok('★ 내용을 고치면 서명이 안 맞아 거부된다', savOpen(forged).ok === false && savOpen(forged).state === 'tampered');
    const g0 = P.gold;
    applyLoad(forged);
    ok('★ 위조 저장은 불러오지 않는다 (은화가 그대로)', P.gold === g0, { 은화: P.gold });
    ok('서명 없는 옛 파일은 그대로 받아 준다 (호환)', savOpen(raw).ok === true && savOpen(raw).state === 'legacy');
    /* 슬롯 저장/불러오기는 정상 */
    P.gold = 12345; saveSlot(2, true);
    P.gold = 1; loadSlot(2);
    ok('★ 슬롯 저장·불러오기는 그대로 된다 (서명 포함)', P.gold >= 12345, { 은화: P.gold });
    return L;
  });

  await page.evaluate(() => { hubSwitch('dong'); openP('quest'); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot_r28_3_동대륙_의뢰판.png' });
  await page.evaluate(() => { closeP('quest'); openSave(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot_r28_4_보관정책.png' });

  console.log('\n=== 내려받기 시도 ===');
  console.log(dl.length ? ('★ 파일이 내려갔다(정책 위반): ' + dl.join(', ')) : '(없음 — 정책대로 막혔다)');
  console.log('\n=== 페이지 오류 ===');
  console.log(errors.length ? errors.slice(0, 6).join('\n') : '(0건)');
  const f = all.filter(l => l.startsWith('FAIL')).length;
  console.log('\n=== 최종 판정 ===');
  console.log('검증 ' + all.filter(l => /^(PASS|FAIL)/.test(l)).length + '건 중 FAIL ' + f + '건, 페이지오류 ' + errors.length + '건, 내려받기 ' + dl.length + '건');
  console.log(f === 0 && errors.length === 0 && dl.length === 0 ? 'ALL PASS' : 'FAIL');
  await browser.close();
})();
