/* 각인 의식 검증 — 3계열이 실제로 다르게 시작되는가 + 신규 1회만 뜨는가 */
const { chromium } = require('playwright');
const path = require('path');

async function runMark(page, picks) {
  return await page.evaluate(async (picks) => {
    try { localStorage.removeItem('lc2_meta_v4'); } catch (e) {}
    metaReset();
    P = newPlayer('각인', 'k');
    CLS.k.start.forEach(k => addItem(k, ITEMS[k].t === 'potion' ? 5 : 1));
    P.gold = 0;
    metaApplyToPlayer();
    markStart();
    picks.forEach(i => markPick(i));
    const id = markDecide(MARKSTATE.tally);
    markApply(id);
    return {
      mark: META.mark, 이름: MARKS[id].n,
      공격: pMaxHit().join('~'), 최대HP: P.mhp, 은화: P.gold,
      소지품: P.inv.map(x => ITEMS[x.k].n + (x.q > 1 ? '×' + x.q : '')).join(', '),
      의식표시: document.getElementById('markov').style.display
    };
  }, picks);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve('dist/game_분열된세계_ONLINE.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    if (typeof endIntro === 'function') endIntro();
    pickCls = 'k'; document.getElementById('pname').value = '각인';
    startGame(); if (typeof endIntro === 'function') endIntro();
  });
  await page.waitForTimeout(900);

  const out = {};
  // 각 문항에서 특정 계열을 고르도록 보기 인덱스를 직접 계산
  const idxFor = await page.evaluate(() =>
    ['blade','shield','scale'].reduce((acc,id)=>{
      acc[id]=MARK_Q.map(q=>q.a.findIndex(a=>a[1]===id)); return acc;},{}));
  for (const id of ['blade','shield','scale']) out[id] = await runMark(page, idxFor[id]);

  // 동점 → 저울
  out['동점'] = await runMark(page, [idxFor.blade[0], idxFor.shield[1], idxFor.blade[2], idxFor.shield[3], idxFor.scale[4]]);

  // 신규 1회만: 각인 후 다시 시작해도 안 뜨는가
  out['재시작시'] = await page.evaluate(() => {
    const before = META.mark;
    metaLoad();
    return { 저장된각인: META.mark, 로드후유지: META.mark === before, markHas: markHas() };
  });

  out.frameErr = await page.evaluate(() => frameErr);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
