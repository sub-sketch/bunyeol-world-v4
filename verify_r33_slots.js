/* ─────────────────────────────────────────────────────────────
   R33 에셋 슬롯 검증 — 음악 8슬롯 매핑·폴백, 컷신 그림 슬롯
     node verify_r33_slots.js
   set GAME_HTML=경로   set CHROME_PATH=크롬경로
   ───────────────────────────────────────────────────────────── */
const { chromium } = require('playwright');
const FILE = process.env.GAME_HTML || require('path').resolve(__dirname, '..', 'dist', 'game_분열된세계_ONLINE_배포.html');
const EXE = process.env.CHROME_PATH || undefined;

const R = [];
const ok = (n, pass, note) => R.push({ n, pass: !!pass, note: note || '' });

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  await page.goto('file://' + FILE.replace(/\\/g, '/'));
  await page.waitForTimeout(1800);

  /* ---------- 1. 슬롯 상수 ---------- */
  const base = await page.evaluate(() => ({
    haveSrc: Object.keys(typeof MUSICSRC !== 'undefined' ? MUSICSRC : {}),
    mapKeys: Object.keys(typeof MUSICMAP !== 'undefined' ? MUSICMAP : {}),
    fallKeys: Object.keys(typeof MUSICFALL !== 'undefined' ? MUSICFALL : {}),
    hasResolve: typeof musicResolve === 'function',
    prolog: Object.keys(typeof PROLOGART !== 'undefined' ? PROLOGART : {})
  }));
  ok('musicResolve 존재', base.hasResolve);
  ok('MUSICMAP 8슬롯 등록', ['intro','town','field','dun','dun2','dun3','boss','ending']
      .every(k => base.mapKeys.indexOf(k) >= 0), base.mapKeys.join(','));
  ok('내장된 음원', base.haveSrc.length > 0, base.haveSrc.join(',') || '(없음 — --music 없이 빌드됨)');

  /* ---------- 2. 존마다 어떤 곡이 실제로 재생되는가 ---------- */
  const zones = await page.evaluate(() => {
    const out = [];
    for (let z = 0; z < ZONES.length; z++) {
      const song = ZONES[z].song;
      const mapped = MUSICMAP.hasOwnProperty(song) ? MUSICMAP[song] : '(미등록→field)';
      const resolved = musicResolve(MUSICMAP.hasOwnProperty(song) ? MUSICMAP[song] : 'field');
      out.push({ z, song, mapped, resolved });
    }
    return out;
  });
  const unmapped = zones.filter(z => z.mapped.indexOf('미등록') >= 0);
  ok('모든 존의 song 키가 MUSICMAP 에 등록됨', unmapped.length === 0,
     unmapped.map(z => `z${z.z}:${z.song}`).join(',') || '전부 등록');

  const silent = zones.filter(z => z.resolved === null && z.song !== 'town');
  ok('마을 외에 무음으로 떨어지는 존 없음', silent.length === 0,
     silent.map(z => `z${z.z}:${z.song}`).join(',') || '없음');

  /* ---------- 3. 폴백 사슬 — 있는 곡은 자기 자신, 없는 곡만 대체 ---------- */
  const fall = await page.evaluate(() => ({
    dun2: musicResolve('dun2'), dun3: musicResolve('dun3'),
    boss: musicResolve('boss'), ending: musicResolve('ending'),
    town: musicResolve('town'), dun: musicResolve('dun'),
    intro: musicResolve('intro'), field: musicResolve('field'),
    silentIntent: musicResolve('')
  }));
  /* 각 슬롯은 자기 곡이 있으면 자기 자신, 없으면 MUSICFALL 대체곡. town 만 대체 없이 무음. */
  const has = k => base.haveSrc.indexOf(k) >= 0;
  const expect = k => k === 'town' ? (has('town') ? 'town' : null)
                    : has(k) ? k
                    : (k === 'ending' ? (has('intro') ? 'intro' : null) : (has('dun') ? 'dun' : null));
  const trackFails = ['dun2','dun3','boss','ending','town','dun','intro','field']
        .filter(k => fall[k] !== expect(k));
  ok('모든 슬롯이 상태대로 해결 (있으면 자기 곡 / 없으면 대체 / town 무음)',
     trackFails.length === 0,
     trackFails.length ? trackFails.map(k=>k+':'+fall[k]+'(예상 '+expect(k)+')').join(', ') : JSON.stringify(fall));
  ok('의도된 무음("")은 그대로 통과', fall.silentIntent === '');

  /* ---------- 4. 곡을 빼면 대체곡으로, 되넣으면 자기 곡으로 (폴백 동작의 핵심) ---------- */
  const swap = await page.evaluate(() => {
    /* 실제로 지웠다 되넣으며 확인한다 — 어떤 곡이 들어와 있든 결과가 일관되도록 */
    const hadDun2 = MUSICSRC.dun2, hadDun = MUSICSRC.dun;
    if (!MUSICSRC.dun) MUSICSRC.dun = 'data:audio/mpeg;base64,AAAA';   /* 대체 기준곡 보장 */
    const backup = MUSICSRC.dun2; delete MUSICSRC.dun2;
    const without = musicResolve('dun2');                 /* dun2 없음 → dun 으로 */
    MUSICSRC.dun2 = 'data:audio/mpeg;base64,AAAA';
    const withIt = musicResolve('dun2');                  /* dun2 있음 → dun2 */
    if (hadDun2 === undefined) delete MUSICSRC.dun2; else MUSICSRC.dun2 = hadDun2;
    if (hadDun === undefined) delete MUSICSRC.dun; else MUSICSRC.dun = hadDun;
    return { without, withIt };
  });
  ok('dun2 를 빼면 dun 으로 폴백, 되넣으면 dun2',
     swap.without === 'dun' && swap.withIt === 'dun2', JSON.stringify(swap));

  /* ---------- 5. 컷신 그림 슬롯 ---------- */
  const cut = await page.evaluate(() => {
    const endKeys = ENDING.map(s => s.sc);
    return {
      prologCount: Object.keys(PROLOGART).length,
      endingWired: endKeys.map(k => ({ k, hasImg: !!PROLOGART[k], hasPainter: typeof ISC[k] === 'function' }))
    };
  });
  ok('프롤로그 그림 6장 유지', cut.prologCount === 6, 'PROLOGART ' + cut.prologCount + '장');
  ok('엔딩 5장면 전부 절차 생성 painter 보유(그림 없어도 동작)',
     cut.endingWired.every(e => e.hasPainter), JSON.stringify(cut.endingWired));

  /* ---------- 6. 엔딩이 ending 트랙을 요청하는가 ---------- */
  const endTrack = await page.evaluate(() => {
    const src = playEnding.toString();
    return { asksEnding: /music:\s*"ending"/.test(src) };
  });
  ok('playEnding 이 ending 트랙을 요청', endTrack.asksEnding);

  /* ---------- 7. T-P1-6 백그라운드 전환 시 소리 정지 ---------- */
  const bg = await page.evaluate(async () => {
    const res = {};
    res.hasSuspend = typeof musicSuspend === 'function' && typeof musicResume === 'function';
    if (!res.hasSuspend) return res;
    started = true;
    OPT.bgm = true; applySound();
    MUS.unlocked = true;
    musicPlay('field', true);
    res.beforeCur = MUS.cur; res.beforeBgm = BGM.on;
    musicSuspend();
    res.hidCur = MUS.cur; res.hidBgm = BGM.on; res.hidAC = (typeof AC !== 'undefined' && AC) ? AC.state : 'none';
    musicResume();
    await new Promise(r => setTimeout(r, 60));
    res.backCur = MUS.cur; res.backBgm = BGM.on;
    /* ★ BGM 을 꺼 둔 사용자의 설정을 복귀가 무시하지 않는가 */
    OPT.bgm = false; applySound();
    musicSuspend(); musicResume();
    res.bgmOffRespected = (BGM.on === false);
    OPT.bgm = true; applySound();
    /* 언락 전이면 복귀가 재생을 강제하지 않는가 */
    MUS.unlocked = false;
    musicSuspend(); musicResume();
    res.noForceUnlock = (MUS.unlocked === false);
    MUS.unlocked = true;
    return res;
  });
  ok('musicSuspend/musicResume 존재 (T-P1-6)', bg.hasSuspend);
  ok('숨기면 트랙 정지 + 칩튠 정지', bg.hidCur === null && bg.hidBgm === false,
     JSON.stringify({ before: bg.beforeCur, hidden: bg.hidCur, bgm: bg.hidBgm, ac: bg.hidAC }));
  ok('복귀하면 곡이 다시 걸린다', bg.backCur === 'field', 'cur=' + bg.backCur);
  ok('★ BGM 꺼 둔 설정을 복귀가 무시하지 않는다', bg.bgmOffRespected === true);
  ok('★ 복귀가 오디오 언락을 다시 요구하지 않는다', bg.noForceUnlock === true);

  /* ---------- 8. R34 계시 되짚기 (노드 재분배) ---------- */
  const rs = await page.evaluate(() => {
    const res = {};
    res.has = typeof metaRespec === 'function' && typeof metaRespecRefund === 'function';
    if (!res.has) return res;
    P = newPlayer('되짚기', 'k'); started = true;
    metaLoad();
    META.nodes = {}; META.sk = {}; META.spent = 0; META.pt = 100000; META.respec = 0;
    P.gold = 50000;

    /* 실제 구매 함수로 노드를 찍는다 */
    metaBuy('dash');                     /* 50 */
    metaBuy('hp'); metaBuy('hp');        /* 60 + 140 */
    metaBuy('atk');                      /* 70 */
    const nodeSpent = 50 + 60 + 140 + 70;
    res.nodeSpent = nodeSpent;
    res.spentAfterNodes = META.spent;

    /* ★ 스킬 구매분을 흉내낸다 — META.spent 에는 스킬도 함께 쌓인다.
       spent 전액을 환급하면 이 500P 가 공짜로 복제된다(설계 함정). */
    META.sk['__testskill'] = 1; META.spent += 500;
    res.spentTotal = META.spent;

    res.refund = metaRespecRefund();
    res.mhpBefore = P.mhp;

    const ptBefore = META.pt, goldBefore = P.gold;
    res.ok1 = metaRespec();
    res.ptGain = META.pt - ptBefore;
    res.goldPaid1 = goldBefore - P.gold;
    res.nodesLeft = Object.keys(META.nodes).length;
    res.skillKept = !!META.sk['__testskill'];
    res.spentAfter = META.spent;
    res.respecCount = META.respec;
    res.mhpAfter = P.mhp;

    /* 2회차 — 이제는 유료 */
    metaBuy('hp');
    const gold2 = P.gold;
    res.cost2 = metaRespecCost();
    res.ok2 = metaRespec();
    res.goldPaid2 = gold2 - P.gold;

    /* 던전 안에서는 막히는가 */
    metaBuy('hp');
    runBegin();
    res.blockedInRun = (metaRespec() === false);
    RUN = null;

    META.sk = {};
    return res;
  });
  ok('metaRespec / metaRespecRefund 존재 (R34)', rs.has);
  ok('환급액 = 실제 찍은 노드 비용과 일치', rs.refund === rs.nodeSpent,
     JSON.stringify({ refund: rs.refund, nodeSpent: rs.nodeSpent, spentTotal: rs.spentTotal }));
  ok('★ 스킬 구매분(500P)은 환급되지 않는다 (포인트 복제 차단)',
     rs.ptGain === rs.nodeSpent, 'ptGain=' + rs.ptGain + ' (노드분 ' + rs.nodeSpent + ')');
  ok('★ 스킬은 그대로 남는다', rs.skillKept === true);
  ok('노드가 전부 풀린다', rs.nodesLeft === 0);
  ok('spent 가 노드분만큼만 줄어든다', rs.spentAfter === 500, 'spent=' + rs.spentAfter);
  ok('노드 HP 보너스가 실제로 되돌아간다', rs.mhpAfter < rs.mhpBefore,
     JSON.stringify({ before: rs.mhpBefore, after: rs.mhpAfter }));
  ok('첫 회는 무료', rs.goldPaid1 === 0, 'paid=' + rs.goldPaid1);
  ok('2회차부터 은화 8,000 차감', rs.cost2 === 8000 && rs.goldPaid2 === 8000,
     JSON.stringify({ cost: rs.cost2, paid: rs.goldPaid2 }));
  ok('되짚기 횟수 기록', rs.respecCount === 1);
  ok('★ 탐험(런) 중에는 되짚기 거부', rs.blockedInRun === true);

  /* ---------- 9. R34b 게이트 목적지 (모든 존의 출구가 유효 존을 가리키는가) ---------- */
  const gate = await page.evaluate(() => {
    const bad = [];
    for (let z = 0; z < ZONES.length; z++) {
      for (const g of (ZONES[z].gates || [])) {
        if (!(g.to >= 0 && g.to < ZONES.length)) bad.push('존'+z+'→'+g.to+'(범위밖)');
      }
    }
    /* 각 부 첫 필드(6·9)의 '뒤로 나가는' 문이 마을(존0)로 가는가 — 예전 버그: 존5/존8 */
    const backGate = (z) => {
      const gs = ZONES[z].gates || [];
      let min = null;
      for (const g of gs) if (min === null || g.x < min.x) min = g;   /* 가장 왼쪽 문 = 복귀문 */
      return min ? min.to : null;
    };
    return { bad, z6back: backGate(6), z9back: backGate(9), z1back: backGate(1) };
  });
  ok('모든 존 게이트가 유효 존을 가리킨다', gate.bad.length === 0, gate.bad.join(', ') || '전부 유효');
  ok('★ 동대륙 첫 필드(존6) 복귀문 → 마을(존0)', gate.z6back === 0, '→존' + gate.z6back);
  ok('★ 마경 첫 필드(존9) 복귀문 → 마을(존0)', gate.z9back === 0, '→존' + gate.z9back);
  ok('1부 첫 필드(존1) 복귀문도 마을(회귀 확인)', gate.z1back === 0, '→존' + gate.z1back);

  /* ---------- 10. R34b 거점별 배경음악 ---------- */
  const hub = await page.evaluate(() => {
    const res = { hasHubMusic: typeof hubMusic === 'function', hubs: {} };
    if (typeof HUBS !== 'undefined') for (const h of HUBS) res.hubs[h.id] = h.song || null;
    /* 각 거점의 song 이 실제로 어떤 트랙으로 해결되는가 */
    res.resolved = {};
    for (const id of ['seo','dong','ma']) {
      const h = (typeof HUBS !== 'undefined') ? HUBS.find(x => x.id === id) : null;
      res.resolved[id] = h ? musicResolve(MUSICMAP[h.song] || h.song || 'town') : null;
    }
    /* 거점 전환이 실제로 음악을 바꾸는가 — hubMusic 을 직접 불러 MUS.want 를 본다 */
    if (res.hasHubMusic && typeof MUS !== 'undefined') {
      MUS.unlocked = true;
      HUB.id = 'seo'; hubMusic(); res.wantSeo = MUS.want;
      HUB.id = 'dong'; hubMusic(); res.wantDong = MUS.want;
      HUB.id = 'ma'; hubMusic(); res.wantMa = MUS.want;
    }
    return res;
  });
  ok('hubMusic 함수 존재 (R34b)', hub.hasHubMusic);
  ok('거점 3곳에 song 키 부여됨', hub.hubs.seo === 'town' && hub.hubs.dong === 'town_dong' && hub.hubs.ma === 'town_ma', JSON.stringify(hub.hubs));
  ok('거점 전환이 음악 요청을 바꾼다 (want 값)',
     hub.wantSeo === 'town' && hub.wantDong === 'town_dong' && hub.wantMa === 'town_ma',
     JSON.stringify({ seo: hub.wantSeo, dong: hub.wantDong, ma: hub.wantMa }));
  /* 거점곡이 있으면 자기 자신으로, 없으면 서대륙 town 으로 해결되어야 한다(어느 쪽이든 어긋나면 실패). */
  const hasDong = base.haveSrc.indexOf('town_dong') >= 0;
  const hasMa = base.haveSrc.indexOf('town_ma') >= 0;
  ok('거점곡 해결 상태 정상 (있으면 자기 곡 / 없으면 town)',
     hub.resolved.dong === (hasDong ? 'town_dong' : 'town') &&
     hub.resolved.ma === (hasMa ? 'town_ma' : 'town'),
     JSON.stringify({ resolved: hub.resolved, hasDong, hasMa }));

  R.push({ n: 'JS 오류(pageerror/console.error)', pass: errs.length === 0, note: errs.slice(0, 5).join(' | ') });

  console.log('\n===== R33 에셋 슬롯 검증 =====');
  console.log('존별 재생 트랙:');
  zones.forEach(z => console.log(`  존 ${String(z.z).padStart(2)} · song=${(z.song||'').padEnd(6)} → ${String(z.resolved)}`));
  console.log('');
  R.forEach(r => console.log((r.pass ? ' PASS ' : '*FAIL*') + ' ' + r.n + (r.note ? '   — ' + r.note : '')));
  const pass = R.filter(r => r.pass).length;
  console.log(`\n${pass}/${R.length} PASS, ${R.length - pass} FAIL`);
  await browser.close();
  process.exit(R.length - pass === 0 ? 0 : 1);
})();
