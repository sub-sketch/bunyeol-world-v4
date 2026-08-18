/* 특효 무기 + 검 스위칭 검증 */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve('dist/game_분열된세계_ONLINE.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    try { localStorage.removeItem('lc2_meta_v4'); } catch(e){}
    if (typeof endIntro === 'function') endIntro();
    pickCls = 'k'; document.getElementById('pname').value = '스위처';
    startGame(); if (typeof endIntro === 'function') endIntro();
    if (!markHas()) markApply('blade');
    document.getElementById('markov').style.display = 'none';
  });
  await page.waitForTimeout(900);
  const out = {};

  out['①특효무기_기본공격감소'] = await page.evaluate(() => {
    const base = pMaxHit().join('~');
    addItem('longsw', 1, 0, { f:'undead', b:10, m:3 });
    const it = P.inv[P.inv.length-1];
    const old = P.eq.weapon;
    P.eq.weapon = it;
    const withOpt = pMaxHit().join('~');
    const info = itemInfo(it);
    P.eq.weapon = old;
    return { 무옵장검: (P.eq.weapon=it, 0) || '', 특효장검공격: withOpt, 툴팁: info.replace(/<[^>]+>/g,'') };
  });

  out['②특효발동'] = await page.evaluate(() => {
    /* 언데드(skel)에게는 +10, 야생(wolf)에게는 없음 */
    const z = world[curZ];
    function avgHit(mobK, n){
      const d = MOBS[mobK];
      let sum = 0, cnt = 0;
      for(let i=0;i<n;i++){
        const m = { d:d, hp:99999, mhp:99999, fx:P.fx+1.0, fy:P.fy, x:0, y:0, na:0, anim:0 };
        z.mobs.push(m); P.na = 0;
        playerAttack(m, 1);
        const dealt = 99999 - m.hp;
        if(dealt > 0){ sum += dealt; cnt++; }
        m.dead = true; z.mobs.pop();
      }
      return cnt ? sum/cnt : 0;
    }
    const vsUndead = avgHit('skel', 60);
    const vsWild = avgHit('wolf', 60);
    return { 대언데드평균: +vsUndead.toFixed(1), 야생평균: +vsWild.toFixed(1),
      차이: +(vsUndead-vsWild).toFixed(1), 기대: '약 +10 (특효) ± ac차' };
  });

  out['③스위칭잠금'] = await page.evaluate(() => {
    META.nodes = {};
    const before = P.eq.weapon.k;
    swapWeapon();
    return { 잠금중교체안됨: P.eq.weapon.k === before };
  });

  out['④스위칭해금'] = await page.evaluate(() => {
    META.nodes = { wswap: 1 };   /* 1단 = 2자루 */
    P.swapCd = 0;
    const w1 = P.eq.weapon;
    swapWeapon();
    const w2 = P.eq.weapon;
    P.swapCd = 0;
    swapWeapon();
    const w3 = P.eq.weapon;
    const inCd = (P.swapCd > T);
    swapWeapon();               /* 쿨 중 — 바뀌면 안 됨 */
    return { 교체됨: w1 !== w2, 순환복귀: w1 === w3, 풀크기: weaponPool().length,
      쿨중차단: P.eq.weapon === w3 && inCd };
  });

  out['⑤자동교체'] = await page.evaluate(() => {
    META.nodes = { wswap: 2 };
    P.autoSwap = true; P.swapCd = 0;
    /* 무옵 무기 장착 → 언데드 표적 → 특효 무기로 자동 교체되는가 */
    const plain = P.inv.filter(x => ITEMS[x.k].t==='weapon' && !x.opt)[0];
    P.eq.weapon = plain;
    const m = { d: MOBS.skel, hp:100, mhp:100, fx:P.fx+1, fy:P.fy, na:0, anim:0 };
    autoSwapFor(m);
    const swapped = P.eq.weapon.opt && P.eq.weapon.opt.f === 'undead';
    P.autoSwap = false;
    return { 자동교체발동: !!swapped };
  });

  out.frameErr = await page.evaluate(() => frameErr);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
