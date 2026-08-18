/* A군 검증 — 실제 게임 루프를 헤드리스로 돌려 확인한다.
   node verify.js  (playwright 필요) */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.goto('file://' + path.resolve('dist/game_분열된세계_ONLINE.html'));
  await page.waitForTimeout(600);

  // 캐릭터 생성 → 게임 진입
  const started = await page.evaluate(() => {
    try {
      pickCls = 'k';
      document.getElementById('pname').value = '검증기사';
      startGame();
    } catch (e) { return 'ERR:' + e.message + '\n' + e.stack; }
    return started;
  });
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    const out = {};
    out.started = typeof started !== 'undefined' ? started : null;
    out.playerLv = P && P.lv;

    // 1) 보스 HP
    out.dkHp = MOBS.dk.hp;
    out.dkTfkey = MOBS.dk.tfkey;

    // 2) 마을 음악 = 무음
    out.townTrack = MUSICMAP.town;
    out.townResolved = (function () { setMusicZone('town'); return MUS.cur; })();
    out.fieldResolved = (function () { setMusicZone('field'); return MUS.want; })();

    // 3) 변신 영구 해금
    out.tfUnlockInit = JSON.stringify(P.tfUnlock);
    out.unlockRet = unlockTf('dk');
    out.unlockAgain = unlockTf('dk');
    out.tfUnlockAfter = JSON.stringify(P.tfUnlock);
    out.tfUnlockedFn = tfUnlocked('dk');

    // 4) 세이브 왕복
    const blob = packSave ? packSave() : null;
    const decoded = blob ? decodeURIComponent(escape(atob(blob))) : '';
    out.saveVer = decoded ? JSON.parse(decoded).v : null;
    out.savedHasTfUnlock = decoded.indexOf('tfUnlock') >= 0;
    // 구버전 세이브 거부 확인
    const old = btoa(unescape(encodeURIComponent(JSON.stringify({v:2,cls:'k',name:'구버전',lv:5,xp:0,hp:10,mhp:10,mp:1,mmp:1,str:1,dex:1,con:1,int:1,wis:1,gold:0,inv:[]}))));
    const lvBefore = P.lv;
    applyLoad(old);
    out.oldSaveRejected = (P.lv === lvBefore && P.name !== '구버전');

    // 5) 광원 소모품
    out.torch = ITEMS.torch ? ITEMS.torch.n + '/' + ITEMS.torch.lit + '/' + ITEMS.torch.litdur : 'MISSING';
    out.lantern = ITEMS.lantern ? ITEMS.lantern.n + '/' + ITEMS.lantern.lit : 'MISSING';
    addItem('torch', 2);
    const before = buffV('blit');
    const it = P.inv.filter(x => x.k === 'torch')[0];
    useIt(it);
    out.litBefore = before;
    out.litAfter = buffV('blit');
    out.litRemain = buffRemain('blit');

    // 6) 귀환 단축키 함수 존재 + ret 아이템 탐색
    out.hasReturnFn = typeof useReturnScroll === 'function';
    addItem('ret', 1);
    out.retCount = P.inv.filter(x => x.k === 'ret').length;

    // === B군 ===
    // 변신 지속시간
    P.lv = 40;
    applyTf('goblin');
    out.tfSet = P.tf; out.tfRemain = tfRemain(); out.tfDur = TFS.goblin.dur;
    P.tfT = T - 1; tfTick();
    out.tfAfterExpire = P.tf;

    // 축복 덮어쓰기 방지 + 일괄 수령
    P.buffs = {}; P.gold = 999999;
    applyBuff('강한축복', 600, {bd: 4}, true);
    applyBuff('약한축복', 60, {bd: 1}, true);
    out.bdKeptStrong = buffV('bd');                 // 4 여야 정상 (전에는 1로 떨어졌다)
    P.buffs = {};
    const goldBefore = P.gold;
    out.blessAllCost = blessAllCost();
    useAllBuffs();
    out.blessAllApplied = Object.keys(P.buffs).length;
    out.blessAllSpent = goldBefore - P.gold;

    // 독 / 출혈
    P.hp = P.mhp = 500;
    out.zombiePoison = JSON.stringify(MOBS.zombie.poison);
    out.wolfBleed = JSON.stringify(MOBS.wolf.bleed);
    dotApply('poison', {ch: 1, dmg: 7, ivl: 0.01, dur: 30}, '시병');
    out.poisonOn = dotHas('poison');
    const hpBefore = P.hp;
    for (let i = 0; i < 5; i++) { P.dot.poison.next = T - 1; dotTick(); }
    out.poisonTicked = hpBefore - P.hp;
    // 도트로는 죽지 않는다
    P.hp = 3; P.dot.poison.dmg = 999;
    P.dot.poison.next = T - 1; dotTick();
    out.poisonFloorHp = P.hp;
    // 해독
    addItem('antidote', 1);
    useIt(P.inv.filter(x => x.k === 'antidote')[0]);
    out.poisonAfterCure = dotHas('poison');
    out.antidoteConsumed = P.inv.filter(x => x.k === 'antidote').length === 0;
    // 붕대
    dotApply('bleed', {ch: 1, dmg: 3, ivl: 2, dur: 20}, '늑대');
    addItem('bandage', 1);
    useIt(P.inv.filter(x => x.k === 'bandage')[0]);
    out.bleedAfterCure = dotHas('bleed');

    // i18n
    out.tx = TX('dot.poison.cure');
    out.txMissing = TX('없는키입니다');
    out.txArgs = TX('tf.on', '고블린', 300);

    // 세이브 왕복 (변신 잔여 + 도트)
    P.tf = 'orc'; P.tfT = T + 123;
    dotApply('bleed', {ch: 1, dmg: 5, ivl: 2, dur: 40}, 'x');
    const b2 = packSave();
    const d2 = JSON.parse(decodeURIComponent(escape(atob(b2))));
    out.saveTfR = d2.tfR; out.saveDot = JSON.stringify(d2.dot);

    // 7) 클릭 마커 — P.dest 에 t0 가 붙는지
    gameTap(700, 450);
    out.destHasT0 = !!(P.dest && typeof P.dest.t0 === 'number');

    // 8) NPC 분리 반경 상수가 반영됐는지는 런타임으로 간접 확인
    out.zoneCount = world ? world.length : null;
    return out;
  });

  // 프레임을 실제로 여러 번 돌려 렌더 예외를 잡는다 (클릭 마커 렌더 포함)
  await page.waitForTimeout(1500);
  const frameErrs = await page.evaluate(() => (typeof frameErr !== 'undefined' ? frameErr : 'n/a'));

  // 던전으로 이동해 조명 렌더 경로까지 태운다
  await page.evaluate(() => { try { travel(2, 12, 12); } catch (e) {} });
  await page.waitForTimeout(1200);
  const frameErrs2 = await page.evaluate(() => (typeof frameErr !== 'undefined' ? frameErr : 'n/a'));
  const dunMusic = await page.evaluate(() => MUS.want);

  console.log(JSON.stringify({ ...r, frameErrAfterTown: frameErrs, frameErrAfterDun: frameErrs2, dunMusic, errs }, null, 1));
  await browser.close();
})();
