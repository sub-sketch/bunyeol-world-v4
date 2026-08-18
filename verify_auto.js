/* 자동 사냥 검증 — "빌드에 따라 사냥 속도가 달라지는가"를 초당 피해(DPS)로 실측한다.
   처치 수는 몹 HP 가 커서 측정이 오래 걸린다. 실제로 달라지는 것은 DPS 다. */
const { chromium } = require('playwright');
const path = require('path');

async function trial(page, label, setup, secs) {
  return await page.evaluate(async ({ label, setup, secs }) => {
    RUN = null; deadFlag = false;
    metaReset();
    META.nodes = setup.atk ? { atk: setup.atk } : {};
    P.metaHpApplied = 0; metaApplyToPlayer();
    P.hp = P.mhp = 999999; P.mp = P.mmp = 99999;   // 죽지 않게 — 순수 화력만 본다
    P.lv = setup.lv; P.cd = {};
    P.autoMode = setup.mode; P.autoSkill = setup.skill;
    runStart();
    const z = world[curZ];
    const dmgNow = () => z.mobs.reduce((a, m) => a + (m.pdmg || 0), 0);
    const t0 = T, d0 = dmgNow();
    return await new Promise(res => {
      const iv = setInterval(() => {
        // 몹이 죽으면 되살려 표적을 끊기지 않게 (pdmg 는 유지되도록 리셋하지 않는다)
        z.mobs.forEach(m => { if (m.dead) { m.dead = false; m.hp = m.d.hp; m.rt = 0; } });
        if (T - t0 >= secs) {
          clearInterval(iv);
          const dt = T - t0, dd = dmgNow() - d0;
          res({ label, sec: +dt.toFixed(1), dmg: Math.round(dd), dps: +(dd / dt).toFixed(1),
                lv: P.lv, atkNode: metaLv('atk'), mode: autoMode(), skill: P.autoSkill,
                hit: pMaxHit().join('~') });
        }
      }, 60);
    });
  }, { label, setup, secs });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve('dist/game_분열된세계_ONLINE.html'));
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    if (typeof endIntro === 'function') endIntro();
    pickCls = 'k'; document.getElementById('pname').value = '속도측정';
    startGame(); if (typeof endIntro === 'function') endIntro();
    try { localStorage.removeItem('lc2_meta_v4'); } catch (e) {}
  });
  await page.waitForTimeout(600);

  const S = 12;
  const rows = [];
  rows.push(await trial(page, 'A 자동꺼짐',            { mode: 'off',   skill: false, lv: 12, atk: 0 }, S));
  rows.push(await trial(page, 'B 자동사냥 · 스킬 OFF', { mode: 'hunt',  skill: false, lv: 12, atk: 0 }, S));
  rows.push(await trial(page, 'C 자동사냥 · 스킬 ON',  { mode: 'hunt',  skill: true,  lv: 12, atk: 0 }, S));
  rows.push(await trial(page, 'D C + 공격노드 3단계',  { mode: 'hunt',  skill: true,  lv: 12, atk: 3 }, S));
  rows.push(await trial(page, 'E D + Lv26(스킬 전개)', { mode: 'hunt',  skill: true,  lv: 26, atk: 3 }, S));

  const frameErr = await page.evaluate(() => frameErr);
  console.log(JSON.stringify({ rows, frameErr, errs }, null, 1));
  await browser.close();
})();
