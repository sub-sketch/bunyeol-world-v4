/* 스킬 구매 해금·강화 검증 */
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
    pickCls = 'k'; document.getElementById('pname').value = '해금자';
    startGame(); if (typeof endIntro === 'function') endIntro();
    if (!markHas()) markApply('blade');
    document.getElementById('markov').style.display = 'none';
  });
  await page.waitForTimeout(900);
  const out = {};

  out['①맨몸시작'] = await page.evaluate(() => {
    P.lv = 30; refreshQuick();
    const q = document.getElementById('quick').innerHTML;
    const logEl = document.getElementById('lg') || document.body;
    castSkill(0);
    return {
      퀵바에스킬없음: q.indexOf('일 섬') < 0 && q.indexOf('광 전') < 0,
      시전차단: !P.cd.smash,
      상점에스킬줄: (openMeta(), document.getElementById('metalist').innerHTML.indexOf('습득 60P') >= 0)
    };
  });

  out['②습득'] = await page.evaluate(() => {
    META.pt = 1000;
    metaBuy('atk');                    /* 노드판: 공격력이 일섬의 선행 노드 */
    const ok = metaBuySkill('smash');
    refreshQuick();
    return { 구매성공: ok, skLv: skLv('smash'),
      퀵바등장: document.getElementById('quick').innerHTML.indexOf('일 섬') >= 0,
      잔여P: META.pt };
  });

  out['③강화가피해에반영'] = await page.evaluate(() => {
    /* 몹 소환 후 일섬 — 1단(2.4배) vs 3단(3.2배) 실측 */
    const z = world[curZ], d = MOBS.wolf || Object.values(MOBS)[0];
    function hitOnce(){
      const m = { d:d, hp:99999, mhp:99999, fx:P.fx+1.0, fy:P.fy, x:Math.round(P.fx+1), y:Math.round(P.fy), na:0, anim:0 };
      z.mobs.push(m); P.tgt = m; P.mp = 99; P.cd = {};
      castSkill(0);
      const dealt = 99999 - m.hp;
      m.dead = true; z.mobs.pop(); P.tgt = null;
      return dealt;
    }
    const t = [];
    for(let i=0;i<40;i++) t.push(hitOnce());
    META.sk.smash = 3;
    const t3 = [];
    for(let i=0;i<40;i++) t3.push(hitOnce());
    const avg = a => a.reduce((x,y)=>x+y,0)/a.length;
    return { 일단평균: +avg(t).toFixed(1), 삼단평균: +avg(t3).toFixed(1),
      배율비: +(avg(t3)/avg(t)).toFixed(2), 기대: '약 1.33 (3.2/2.4)' };
  });

  out['④강화기절시간'] = await page.evaluate(() => {
    META.sk.stun = 3;
    const sk = SKILLS.k.filter(s=>s.id==='stun')[0];
    return { 원본: sk.dur, 적용후: skMod(sk).dur };
  });

  out['⑤자동사냥연동'] = await page.evaluate(() => {
    META.sk = { smash: 1 };
    const z = world[curZ], d = Object.values(MOBS)[0];
    const m = { d:d, hp:200, mhp:200, fx:P.fx+1.0, fy:P.fy, x:Math.round(P.fx+1), y:Math.round(P.fy), na:0, anim:0 };
    z.mobs.push(m); P.tgt = m; P.mp = 99; P.cd = {}; P.autoSkill = true;
    const used = autoCastSkill(z, m);
    const usedSmash = !!P.cd.smash;
    META.sk = {};
    P.cd = {};
    const used2 = autoCastSkill(z, m);
    m.dead = true; z.mobs.pop(); P.tgt = null;
    return { 해금시사용: used && usedSmash, 미해금시침묵: !used2 };
  });

  out.frameErr = await page.evaluate(() => frameErr);
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
