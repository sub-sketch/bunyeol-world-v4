/* 논타겟 검증 — 장판이 실제로 아프고, 회피가 실제로 피하는가 */
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
    if (typeof endIntro === 'function') endIntro();
    pickCls = 'k'; document.getElementById('pname').value = '회피자';
    startGame(); if (typeof endIntro === 'function') endIntro();
    if (typeof markHas === 'function' && !markHas()) { META.mark = 'blade'; document.getElementById('markov').style.display = 'none'; }
  });
  await page.waitForTimeout(900);

  const out = {};

  /* 0) 해금 전에는 회피가 나가지 않는가 */
  out['⓪해금전'] = await page.evaluate(() => {
    META.nodes = {};
    const e0 = P.evadeT || 0;
    tryDash();
    const blocked = (P.evadeT || 0) === e0 && !(P.dashUntil > T);
    META.nodes = { dash: 1 };                     /* 이후 시험을 위해 해금 */
    const q = document.getElementById('quick');
    refreshQuick();
    return { 해금전차단: blocked, 해금후퀵바회피: q.innerHTML.indexOf('회피') >= 0 };
  });

  /* 1) 장판을 밟고 서 있으면 맞는가 */
  out['①밟고있으면피해'] = await page.evaluate(() => {
    P.hp = P.mhp; P.dest = null; P.tgt = null;
    const hp0 = P.hp;
    hazardAdd(P.fx, P.fy, 1.6, 0.05, 30, '시험장판');
    const n0 = hazards.length;
    return new Promise(res => setTimeout(() => res({
      장판생성: n0 === 1, 피해: hp0 - P.hp, 기대: '30 - AC보정', frameErr: frameErr
    }), 400));
  });

  /* 2) Space 회피 무적이면 안 맞는가 */
  out['②회피하면무피해'] = await page.evaluate(() => {
    P.hp = P.mhp; P.dashCd = 0;
    const hp0 = P.hp, x0 = P.fx, y0 = P.fy;
    hazardAdd(P.fx, P.fy, 6.0, 0.05, 30, '시험장판');   /* 이동으로는 못 벗어나는 크기 */
    tryDash();
    const dashed = P.evadeT > T;
    return new Promise(res => setTimeout(() => res({
      회피발동: dashed, 피해: hp0 - P.hp,
      이동거리: Math.hypot(P.fx - x0, P.fy - y0).toFixed(2)
    }), 400));
  });

  /* 3) 쿨다운 중에는 회피가 안 나가는가 */
  out['③쿨다운'] = await page.evaluate(() => {
    P.dashCd = T + 2.5;
    const e0 = P.evadeT || 0;
    tryDash();
    return { 재발동차단: (P.evadeT || 0) === e0, 남은쿨: (P.dashCd - T).toFixed(1) };
  });

  /* 4) 몹이 실제로 장판을 까는가 — tele 몹 강제 소환 후 관찰 */
  out['④몹장판'] = await page.evaluate(() => {
    P.hp = P.mhp;
    const z = world[curZ];
    const d = MOBS.orcwar;                       /* tele 보유 몹 */
    const m = { d: d, hp: d.hp, mhp: d.hp, fx: P.fx + 1.2, fy: P.fy, x: Math.round(P.fx + 1.2), y: Math.round(P.fy), na: 0, teleCd: 0, anim: 0 };
    z.mobs.push(m);
    let made = 0;
    for (let i = 0; i < 40 && !made; i++) { if (tryTeleAttack(m)) made = 1; m.teleCd = 0; }
    const h = hazards[hazards.length - 1];
    z.mobs.pop();
    const out2 = { 장판사용: !!made, 반경: h && h.r, 피해수치: h && h.dmg, 평타범위: d.d1 + '~' + d.d2 };
    hazards.length = 0;
    return out2;
  });

  /* 5) tele 데이터 보유 몹 명단 */
  out['⑤tele몹'] = await page.evaluate(() =>
    Object.keys(MOBS).filter(k => MOBS[k].tele)
      .map(k => k + '(r' + MOBS[k].tele.r + '/예고' + MOBS[k].tele.arm + 's/x' + MOBS[k].tele.mult + ')'));

  out.frameErr = await page.evaluate(() => frameErr);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
