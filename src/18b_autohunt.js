/* ================= v4 — 자동 사냥 =================
   로그라이트로 바뀌면서 "한 마리씩 클릭"은 루프의 속도를 죽인다.
   조작은 **어디로 갈지**와 **무엇을 쓸지**만 남기고, 평타 걸기는 기계에 넘긴다.

   3단계
     off    끄기 — 기존처럼 직접 클릭
     react  반격만 — 나를 때린 놈만 (기존 autoCounter 동작)
     hunt   자동 사냥 — 사거리 안 적을 먼저 잡고, 죽으면 다음 놈으로 자동 연결

   자동 스킬(P.autoSkill)은 따로 켠다.
   쿨·마나가 되면 조건에 맞는 스킬을 자동 시전한다.
   ★ 이게 "빌드에 따라 사냥 속도가 달라진다"를 눈에 보이게 만드는 지점이다 —
     광역기를 든 빌드는 뭉친 적을 쓸고, 단일기 빌드는 하나씩 빠르게 녹인다.

   플레이어가 직접 클릭한 이동 목적지(P.dest)는 자동 사냥보다 우선한다.
   도망칠 자유를 뺏으면 안 된다.
   ============================================================================ */
var AUTO_R = 6.5;        /* 자동 탐색 반경(타일) */
var AUTO_MODES = ["off", "react", "hunt"];
var AUTO_LABEL = {off:"자동 꺼짐", react:"자동 반격", hunt:"자동 사냥"};

function autoMode(){
  if(!P) return "hunt";
  if(P.autoMode) return P.autoMode;
  /* 구 필드(autoCounter) 에서 승계 */
  return (P.autoCounter === false) ? "off" : "hunt";
}
function setAutoMode(m){
  P.autoMode = m;
  P.autoCounter = (m !== "off");
  log(TX("auto.mode", AUTO_LABEL[m]), "#ffb27a");
  refreshHud();
}
function cycleAuto(){
  var i = AUTO_MODES.indexOf(autoMode());
  setAutoMode(AUTO_MODES[(i + 1) % AUTO_MODES.length]);
}
function toggleAutoSkill(){
  P.autoSkill = !P.autoSkill;
  log(TX(P.autoSkill ? "auto.skillOn" : "auto.skillOff"), "#ffb27a");
  refreshHud();
}

/* 적으로 칠 대상 목록 — 몹 + 적대 필드NPC */
function autoFoes(z){
  var out = [], i;
  for(i = 0; i < z.mobs.length; i++) if(!z.mobs[i].dead) out.push(z.mobs[i]);
  if(z.fnpc) for(i = 0; i < z.fnpc.length; i++){
    var n = z.fnpc[i];
    if(!n.dead && isFoe(P.fac || "player", n.fac)) out.push(n);
  }
  return out;
}

/* 대상 고르기.
   ① 이미 나를 때리고 있는 놈(위협 우선)  ② 그다음 가까운 놈
   같은 조건이면 HP 가 적은 쪽 — 하나씩 확실히 끊는 편이 총 피해를 줄인다. */
function autoPick(z, huntMode){
  var foes = autoFoes(z), best = null, bestScore = 1e9, i;
  for(i = 0; i < foes.length; i++){
    var f = foes[i], d = distE(P, f);
    if(d > AUTO_R) continue;
    var attackingMe = (f.tgt === P);
    if(!huntMode && !attackingMe) continue;      /* react 모드는 반격만 */
    var score = d + (attackingMe ? -3 : 0) + (f.hp / Math.max(1, f.mhp || (f.d && f.d.hp) || 1)) * 0.8;
    if(score < bestScore){ bestScore = score; best = f; }
  }
  return best;
}

/* 자동 스킬 — 쿨·마나·사거리가 되는 것 중 '가장 비싼' 것을 쓴다.
   비싼 것 = 대체로 강한 것. 광역기는 주변에 2마리 이상일 때만. */
function autoCastSkill(z, m){
  if(!P.autoSkill || !m || m.dead) return false;
  var list = mySkills(), i, bestI = -1, bestMp = -1;
  /* ================= R25 자동 스킬 우선순위 (대표 지시) =================
     "자동사용 스킬세팅도 쓸것만 넣어놓고 돌릴수있는구조로. 예를들면 qwer 4개만 등록해서
      쓰고싶은것만 쓸수있는구조로 두고, 우선순위로 q->w->e->r 순서로 사용할수있도록"
     → P.aslot = [스킬id 4칸] (Q·W·E·R). 등록된 것만 쓰고, **적힌 순서대로** 첫 번째로
       조건이 맞는 것을 쓴다. 한 칸도 안 채웠으면 예전 방식(마나 큰 것 우선)으로 돌아간다 —
       기존 세이브가 갑자기 스킬을 안 쓰게 되면 안 되므로. */
  /* ===== R30 칸마다 자동/수동 (대표 지시) =====
     "필요한 1개만 자동, 나머진 수동으로 할 수도 있고 이렇게 지정 자동화가 필요한듯"
     → P.aauto[i] 가 false 인 칸은 **자동으로 쓰지 않는다**(키로는 그대로 쓴다).
       자동 칸이 하나도 없으면 자동 시전은 아무것도 하지 않는다 — '전부 수동'이 뜻대로 동작한다. */
  var reg = (P.aslot || []);
  var flags = (P.aauto && P.aauto.length === 4) ? P.aauto : [true, true, true, true];
  var slots = [];
  for(i = 0; i < reg.length; i++) if(reg[i] && flags[i] !== false) slots.push(reg[i]);
  if(reg.filter(function(x){ return !!x; }).length && !slots.length) return false;   /* 전부 수동 */
  if(slots.length){
    for(i = 0; i < slots.length; i++){
      var si = -1, j;
      for(j = 0; j < list.length; j++) if(list[j].id === slots[i]) si = j;
      if(si < 0) continue;
      if(!autoSkillOk(list[si], z, m)) continue;
      castSkill(si);
      return true;
    }
    return false;                     /* 등록한 것들이 다 안 되면 평타로 때린다 */
  }
  for(i = 0; i < list.length; i++){
    var sk = list[i];
    if(!skKnown(sk.id)) continue;
    if(T < (P.cd[sk.id] || 0)) continue;
    if(P.mp < sk.mp) continue;
    if(sk.type === "heal" && P.hp > P.mhp * 0.55) continue;      /* 아쉬울 때만 */
    /* R18 버프 절약 — 예전엔 bd(공격력)만 봐서, AC/공속 버프가 걸려 있어도 계속 덮어썼다.
       버프가 주는 실제 키를 보고 그게 살아 있으면 아낀다. */
    if(sk.type === "buff"){
      var have = (sk.bd && buffV("bd") > 0) || (sk.bac && buffV("bac") > 0) || (sk.bhs && buffV("bhs") > 0);
      if(have) continue;
      if(!sk.bd && !sk.bac && !sk.bhs && buffV("bd") > 0) continue;
    }
    /* R18 신규 타입(chain/beam)도 사거리 판정을 받는다 — 안 넣으면 사거리 밖에서 헛시전한다 */
    if(autoToolOk(sk, z, m) === false) continue;                 /* R32 계열 도구 조건 */
    if(["melee","stun","bolt","multi","aoe","chain","beam"].indexOf(sk.type) >= 0){
      var rq = sk.rng ? sk.rng : ((sk.type === "melee" || sk.type === "stun") ? 1.6 : pRange() + 0.6);
      if(distE(P, m) > rq) continue;
      if(sk.type === "aoe" && autoNear(z, m, 2.2) < 2) continue; /* 광역기는 뭉쳤을 때만 */
      if(sk.type === "chain" && autoNear(z, m, sk.jump || 3.2) < 2) continue;  /* 연쇄는 옮겨갈 적이 있을 때만 */
      if(sk.type === "beam" && autoNear(z, m, 2.0) < 2) continue;              /* 관통은 줄이 섰을 때만 */
    }
    if(sk.mp > bestMp){ bestMp = sk.mp; bestI = i; }
  }
  if(bestI < 0) return false;
  castSkill(bestI);
  return true;
}
/* 스킬 하나가 지금 쓸 수 있는 상태인지 — 우선순위 경로와 옛 경로가 **같은 규칙**을 쓰게
   조건을 함수로 빼 두었다(두 곳에 따로 적으면 한쪽만 고쳐지는 사고가 난다). */
/* ===== R32 계열 도구(소환·벽·장판·순간이동·후퇴)의 자동 사용 조건 =====
   이들은 대상 지정이 필요 없어서 조건을 안 걸면 쿨마다 그냥 나간다 — 마나를 허비하고
   벽은 내 사선까지 막는다. "쓸 만한 상황" 만 통과시킨다. 수동 칸으로 두면 언제든 키로 쓴다.
   반환: true=써도 된다 / false=지금은 아니다 / null=도구가 아니다(기존 판정으로 넘긴다) */
function autoToolOk(sk, z, m){
  if(!sk) return null;
  if(sk.type === "summon")
    return !(typeof sumCount === "function" && sumCount() > 0);      /* 이미 곁에 있으면 아낀다 */
  if(sk.type === "wall")
    return distE(P, m) <= 3.0;                                       /* 붙었을 때만 — 멀면 사선만 막는다 */
  if(sk.type === "field"){
    if(distE(P, m) > pRange() + 0.6) return false;
    return autoNear(z, m, sk.r || 2.2) >= 2;                         /* 둘 이상 겹쳤을 때 값이 나온다 */
  }
  if(sk.type === "blink" || sk.type === "bstep")
    return isRanged() && distE(P, m) <= 1.9;                         /* 이탈기 — 근접을 당했을 때만 */
  return null;
}
function autoSkillOk(sk, z, m){
  if(!sk || !skKnown(sk.id)) return false;
  if(T < (P.cd[sk.id] || 0)) return false;
  if(P.mp < sk.mp) return false;
  if(sk.type === "heal" && P.hp > P.mhp * 0.55) return false;
  if(sk.type === "buff"){
    var have = (sk.bd && buffV("bd") > 0) || (sk.bac && buffV("bac") > 0) || (sk.bhs && buffV("bhs") > 0);
    if(have) return false;
    if(!sk.bd && !sk.bac && !sk.bhs && buffV("bd") > 0) return false;
  }
  var tool = autoToolOk(sk, z, m);
  if(tool !== null) return tool;
  if(["melee","stun","bolt","multi","aoe","chain","beam"].indexOf(sk.type) >= 0){
    var rq = sk.rng ? sk.rng : ((sk.type === "melee" || sk.type === "stun") ? 1.6 : pRange() + 0.6);
    if(distE(P, m) > rq) return false;
    if(sk.type === "aoe" && autoNear(z, m, 2.2) < 2) return false;
    if(sk.type === "chain" && autoNear(z, m, sk.jump || 3.2) < 2) return false;
    if(sk.type === "beam" && autoNear(z, m, 2.0) < 2) return false;
  }
  return true;
}
/* 자동 스킬 칸 지정 — 같은 스킬을 두 칸에 넣으면 앞의 칸을 비운다(중복은 우선순위를 흐린다) */
function aslotSet(i, id){
  if(!P) return;
  if(!P.aslot) P.aslot = [null, null, null, null];
  var j;
  if(id) for(j = 0; j < 4; j++) if(j !== i && P.aslot[j] === id) P.aslot[j] = null;
  P.aslot[i] = id || null;
  if(typeof refreshSkillPanel === "function") refreshSkillPanel();
  if(typeof refreshQuick === "function") refreshQuick();
}
/* 칸의 자동/수동 전환 */
function aautoSet(i, on){
  if(!P) return;
  if(!P.aauto || P.aauto.length !== 4) P.aauto = [true, true, true, true];
  P.aauto[i] = !!on;
  var n = P.aslot && P.aslot[i] ? (SKILLS[P.aslot[i]] ? SKILLS[P.aslot[i]].n : P.aslot[i]) : ("칸 " + (i + 1));
  log("<b>" + n + "</b> — " + (on ? "자동 사용" : "수동 전용(키로만)"), on ? "#9fe2ff" : "#a89c86");
  if(typeof refreshSkillPanel === "function") refreshSkillPanel();
}
function aslotClear(){
  if(!P) return;
  P.aslot = [null, null, null, null];
  P.aauto = [true, true, true, true];
  if(typeof log === "function") log("자동 스킬 칸을 비웠습니다 — 습득한 스킬을 마나 큰 것부터 씁니다.", "#888");
  if(typeof refreshSkillPanel === "function") refreshSkillPanel();
}
function autoNear(z, m, r){
  var foes = autoFoes(z), n = 0, i;
  for(i = 0; i < foes.length; i++){
    var dx = foes[i].fx - m.fx, dy = foes[i].fy - m.fy;
    if(dx*dx + dy*dy <= r*r) n++;
  }
  return n;
}

/* update() 에서 매 프레임 호출. 기존 자동반격 블록을 대체한다. */
function autoHuntTick(z, dt){
  if(!P || deadFlag) return;
  var mode = autoMode();
  if(mode === "off") return;

  /* 대상이 죽었으면 바로 다음 놈으로 — 이 연결이 사냥 속도를 만든다 */
  if(P.tgt && P.tgt.dead) P.tgt = null;

  if(!P.tgt && !P.dest){
    var pick = autoPick(z, mode === "hunt");
    if(pick){
      P.tgt = pick;
      if(P._acLast !== pick){
        P._acLast = pick;
        if(mode === "react") log(TX("auto.counter", pick.d.n), "#ffb27a");
      }
    }
  }
  if(P.tgt && !P.tgt.dead && distE(P, P.tgt) <= pRange() + 0.4){
    autoSwapFor(P.tgt);                    /* 자동 무기 교체 (기본 꺼짐, 해금 필요) */
    autoCastSkill(z, P.tgt);
  }
}
