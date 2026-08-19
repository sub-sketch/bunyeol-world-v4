/* ================= v4 로그라이트 — 메타(영구 성장) =================
   런은 저장하지 않는다. 저장하는 것은 이 META 하나뿐이다.

   세이브 v4
     { v:4, pt, spent, nodes:{hp:0..N, atk, def}, achv:[id], runs, best }
   v3 이하는 거부한다 (구조가 완전히 다르다).

   R1 노드는 스탯 3종 x 3단계뿐이다. 30노드 확장은 R3.
   ================================================================== */
var META_KEY = "lc2_meta_v4";

var META = { v:4, pt:0, spent:0, nodes:{}, sk:{}, skComp:0, achv:[], runs:0, best:0, tkills:0, mark:null, clear1:0, dex:{}, clsClear:{}, alloc:{}, migr32:0, respec:0 };

/* ---------- 스킬 해금 (v3 계획서 §2 이행 ②) ----------
   레벨 해금은 폐지되었다. 스킬은 전부 포인트로 산다 — 순서가 곧 빌드다. */
function skLv(id){ return (META.sk && META.sk[id]) || 0; }
/* ---------- 습득 판정 (R18) ----------
   기사(k) — 영구 성장 상점에서 구매한다(META.sk). 트리에 노드로 박혀 있고 선행 조건도 있다.
   그 외 계열 — **캐릭터 레벨로 해금**한다. 마법사가 주문 없이 시작하면 그냥 나쁜 궁수라서,
   계열 정체성이 되는 스킬을 포인트 벽 뒤에 둘 수 없다. 두 계열 자체가 1부 클리어 해금이라
   이미 충분한 관문을 지났다.
   ★ 해금 레벨은 반드시 15 이하로 둘 것 — 5층 완주 전멸이 실측 레벨 15다(lvsim 측정).
     18·20 처럼 잡으면 그 스킬은 게임에서 영원히 못 쓴다(기존 ntouch 18 / fball 20 이 그랬다). */
/* ---------- R32 습득 판정 — 세 계열 모두 '노드에서 산다' 로 일원화 ----------
   대표 지시: "레벨업하면 자동으로 스킬 배워지는 구성이라 기사랑 육성하는 방식이 일원화가 안되어있음
             / 각 캐릭마다 노드는 다르게 설정하고 배워서 올리는 구조로 해야될듯"
   ★ 예전 규칙(기사=구매 / 나머지=레벨 해금)을 버렸다. 레벨 해금은 "선택이 없는 성장"이라
     계열마다 빌드가 갈리지 않았다. 이제 순서가 곧 빌드다 — 세 계열 같은 규칙.
   ※ 기존 저장본 배려는 metaMigrate32() 가 한다(포인트 보상). */
function skKnown(id){ return skLv(id) > 0; }
/* 레벨 해금 계열인가 — 이제 없다. 스킬 패널은 늘 "미습득 · NP" 를 보여 준다.
   (함수는 남긴다: 09_charskill.js·검증본이 존재 여부를 보고 분기한다) */
function skLvGated(id){ return false; }

/* 한 번만 도는 이관 — 예전에는 정령마법사·마도학자가 레벨만 올리면 스킬이 열렸다.
   그 규칙을 없앤 순간 기존 플레이어는 쓰던 스킬을 잃는다. 잃은 만큼을 포인트로 돌려준다:
   해금가 총합의 절반(상한 400P)을 한 번 지급하고, 어떤 스킬을 살지는 본인이 고르게 한다. */
function metaMigrate32(){
  if(META.migr32) return 0;
  META.migr32 = 1;
  var give = 0;
  if((META.runs || 0) > 0 || META.clear1){        /* 이미 플레이해 본 저장본에만 보상 */
    var cls, i, l;
    for(cls in SKILLS){
      if(cls === "k") continue;
      l = SKILLS[cls];
      for(i = 0; i < l.length; i++) give += (l[i].cost || 100);
    }
    give = Math.min(400, Math.round(give / 2 / 10) * 10);
    META.pt += give;
  }
  metaSave();
  if(give && typeof log === "function")
    log("계열 스킬이 <b>노드 구매</b>로 통합되었습니다 — 되돌려받은 포인트 <b>" + give + "P</b>로 원하는 순서대로 배우십시오.", "#ffd24a");
  return give;
}

/* 강화 단계를 반영한 스킬 정의 — 1단은 원본 그대로, 2·3단은 up[] 을 덮어쓴다 */
function skMod(sk){
  var l = skLv(sk.id);
  if(l <= 1 || !sk.up) return sk;
  var o = {}, k, i;
  for(k in sk) o[k] = sk[k];
  for(i = 0; i < l - 1 && i < sk.up.length; i++){ var u = sk.up[i]; for(k in u) o[k] = u[k]; }
  return o;
}

/* 다음 구매 가격 — 미습득이면 해금가, 습득했으면 다음 강화가, 만렙이면 null */
function skNextCost(sk){
  var lv = skLv(sk.id);
  if(lv === 0) return sk.cost || 100;
  if(sk.ucost && lv - 1 < sk.ucost.length) return sk.ucost[lv - 1];
  return null;
}

/* 상점에서 살 수 있는 스킬은 **기사 것만**이다 — 트리(META_TREE)에 노드로 박혀 있고 선행 조건도
   기사 기준으로 짜여 있다. 다른 계열은 레벨 해금이라 여기 오지 않는다(skKnown 참고). */
function metaBuySkill(id){
  /* R32 — 전 계열 스킬을 산다. 예전엔 SKILLS.k 만 뒤져서 정령·마도 노드를 눌러도 아무 일이 없었다.
     ★ 남의 계열 스킬은 못 산다 — 판에 안 뜨지만, 세이브 편집/이관 경로로 id 가 들어올 수 있다. */
  var sk = skillDef(id);
  if(!sk) return false;
  var own = skillOwner(id);
  if(own && P && P.cls && own !== P.cls){ log("다른 계열의 스킬입니다.", "#888"); return false; }
  var lv = skLv(id), c = skNextCost(sk);
  if(lv === 0){
    var q = metaReqInfo(id);
    if(!q.ok){ log("잠겨 있습니다 — " + q.why, "#f88"); return false; }
  }
  if(c === null){ log(TX("meta.maxed", sk.n), "#888"); return false; }
  if(META.pt < c){ log(TX("meta.poor", c - META.pt), "#f88"); return false; }
  META.pt -= c; META.spent += c;
  META.sk[id] = lv + 1;
  metaSave();
  sfx("lvl"); if(P) spark(P.fx, P.fy, "#9fe2ff", 16, 1.6);
  log(lv === 0 ? TX("meta.skill", sk.n) : TX("meta.skillup", sk.n, lv), "#9fe2ff");
  renderMeta(); refreshQuick(); refreshSkillPanel();
  if(typeof buildPad==="function")buildPad();   /* 모바일 패드에 새 버튼 반영 */
  return true;
}

/* 노드 정의 — id, 이름, 단계별 가격, 단계당 효과.
   가격은 "3~4런이면 노드 1개"를 기준으로 잡았다. R3 에서 실측 조정한다. */
var META_NODES = [
  /* 뿌리 */
  {id:"dash", n:"회피술",  desc:"[Space] 도약 회피 해금 · 0.3초 무적", cost:[50], max:1, per:0, unlock:true},
  {id:"dashcd", n:"회피 연마", desc:"회피 쿨 2.5 → 2.1 → 1.8초", cost:[120, 260], max:2, per:0},
  {id:"dashlen", n:"도약 거리", desc:"회피 거리 2.6 → 3.4타일", cost:[180], max:1, per:0},
  {id:"wswap", n:"검 스위칭", desc:"[Tab] 무기 교체 해금 · 1단 2자루, 2단 3자루", cost:[110, 240], max:2, per:0, unlock:true},
  {id:"mspd", n:"이동 속도", desc:"이동 속도 +5%", cost:[90, 200, 400], max:3, per:5},
  /* 검(劍) — 죽이는 속도 */
  {id:"atk", n:"공격력",   desc:"공격 최소·최대 +2", cost:[70, 160, 300, 520, 800], max:5, per:2},
  {id:"aspd", n:"공격 속도", desc:"공격 속도 +4%",   cost:[110, 240, 480], max:3, per:4},
  {id:"mmp", n:"마나",     desc:"최대 MP +8",       cost:[60, 140, 280], max:3, per:8},
  {id:"mregen", n:"마나 재생", desc:"MP 재생 +25%",  cost:[80, 180, 360], max:3, per:25},
  {id:"bdur", n:"버프 지속", desc:"버프 지속시간 +20%", cost:[120, 280], max:2, per:20},
  {id:"beff", n:"버프 효율", desc:"버프 효과량 +15%",  cost:[150, 340], max:2, per:15},
  {id:"execute", n:"처형", desc:"HP 15% 이하 적에게 피해 +30%", cost:[260], max:1, per:0},
  /* 방패(盾) — 버티는 힘 */
  {id:"hp",  n:"생명력",   desc:"최대 HP +12",      cost:[60, 140, 260, 440, 700], max:5, per:12},
  {id:"def", n:"방어",     desc:"AC +1",            cost:[80, 180, 340], max:3, per:1},
  {id:"hregen", n:"체력 재생", desc:"HP 재생 +25%",  cost:[80, 180, 360], max:3, per:25},
  {id:"shield", n:"쉴드 생성", desc:"층 진입마다 보호막 15 — HP보다 먼저 깎인다", cost:[220], max:1, per:0},
  {id:"shieldup", n:"쉴드 강화", desc:"보호막 +10/단", cost:[180, 380], max:2, per:10},
  {id:"undying", n:"불굴",  desc:"런당 1회, 치명상 시 HP 30%로 버틴다", cost:[400], max:1, per:0},
  /* 저울(秤) — 시작·운·경제 */
  {id:"gold0", n:"노잣돈", desc:"런 시작 은화 +100", cost:[70, 160], max:2, per:100},
  {id:"potbag", n:"물약 가방", desc:"런 시작 체력 물약 +3", cost:[110], max:1, per:3},
  {id:"drop", n:"드랍률", desc:"아이템 드랍률 +10%", cost:[130, 300], max:2, per:10},
  {id:"silver", n:"은화 감식", desc:"은화 획득 +10%", cost:[100, 240], max:2, per:10},
  {id:"eye3", n:"눈썰미", desc:"층 보상 2택 → 3택", cost:[300], max:1, per:0},
  {id:"interest", n:"정산 이자", desc:"런 정산 포인트 +10%", cost:[350], max:1, per:0},
  {id:"merchant", n:"상인의 연", desc:"던전 상인 등장률 2배", cost:[180], max:1, per:0},
  {id:"enchp", n:"강화 확률", desc:"안전 초과 강화 성공률 +8%", cost:[200, 440], max:2, per:8},
  {id:"charm", n:"수호의 부적", desc:"충전형 — 장비 파괴를 1회 막고 소진 (재구매 가능)", cost:[150], max:99, per:0, charge:true},
  /* ---- R32 계열 전용 노드 ----
     정령마법사(활·숲) / 마도학자(술·보) 가 "고를 것"을 갖도록 도구 지속·범위를 키우는 노드를 둔다.
     수치는 스킬 쪽 강화(ucost)와 겹치지 않게 **지속·거리** 만 건드린다 — 피해는 스킬 단계로. */
  {id:"arng",    n:"사거리 연마", desc:"원거리 사거리 +0.5타일", cost:[140, 300], max:2, per:0.5},
  {id:"petdur",  n:"정령 결속",  desc:"소환 지속 +3초", cost:[130, 280], max:2, per:3},
  {id:"conjdur", n:"결계 유지",  desc:"세운 벽·결계 지속 +3초", cost:[120, 260], max:2, per:3},
  {id:"blinkcd", n:"보법",       desc:"순간이동 재사용 -1.0초", cost:[150, 320], max:2, per:1},
  {id:"hazr",    n:"장판 확장",  desc:"장판 반경 +0.4타일", cost:[140, 300], max:2, per:0.4}
];

/* 해금형 노드 보유 여부 — 회피술 등 '있다/없다' 노드 */
function metaOwned(id){ return metaLv(id) > 0; }

function metaNode(id){ var i; for(i=0;i<META_NODES.length;i++) if(META_NODES[i].id===id) return META_NODES[i]; return null; }
function metaLv(id){ return (META.nodes && META.nodes[id]) || 0; }
function metaBonus(id){ var d = metaNode(id); return d ? metaLv(id) * d.per : 0; }
function metaHasAchv(id){ return META.achv.indexOf(id) >= 0; }
function metaMarkAchv(id){ if(!metaHasAchv(id)) META.achv.push(id); }
function metaAddPoints(p){ META.pt += p; }
function metaBumpRuns(){
  META.runs++;
  if(RUN && RUN.maxFloor > META.best) META.best = RUN.maxFloor;
}

/* ---------- R17 마물 도감 · 계열 클리어 기록 (수집 요소) ----------
   도감은 "처치해 본 종"을 영구로 남긴다. 런이 끝나도, 죽어도 지워지지 않는다 —
   영구 성장(META)과 같은 급의 수집물이라 사망 정산에서 건드리지 않는다. */
function metaMarkDex(k){
  if(!k) return;
  k = String(k).split("@")[0];               /* 변종(wolf@red)은 원종으로 합쳐 센다 */
  if(!META.dex) META.dex = {};
  if(META.dex[k]) return;
  META.dex[k] = 1;
  metaSave();
  if(typeof log === "function" && typeof MOBS !== "undefined" && MOBS[k])
    log("도감 기록 — <b>" + MOBS[k].n + "</b>  (" + metaDexCount() + "/" + metaDexTotal() + ")", "#9fe2ff");
}
function metaDexCount(){ var n = 0, k; for(k in (META.dex || {})) n++; return n; }
function metaDexTotal(){
  if(typeof MOBS === "undefined") return 0;
  /* ★ R19b: 변종(wolf@red)은 원종으로 합쳐 세므로 분모에서도 빼야 한다.
     안 빼면 도감 총수가 14 -> 42 로 뛰는데 기록은 14종까지만 되어
     "마물 도감 완성"(dex_all) 업적이 영구히 달성 불가가 된다. */
  var n = 0, k; for(k in MOBS) if(k.indexOf("@") < 0) n++; return n;
}
/* 계열(클래스)별 1부 클리어 기록 — "세 계열" 업적용 */
function metaMarkClsClear(c){
  if(!c) return;
  if(!META.clsClear) META.clsClear = {};
  if(META.clsClear[c]) return;
  META.clsClear[c] = 1;
}
function metaClsClearCount(){ var n = 0, k; for(k in (META.clsClear || {})) n++; return n; }

function metaNextCost(id){
  var d = metaNode(id), lv = metaLv(id);
  if(!d) return null;
  if(d.charge) return d.cost[0];             /* 충전형 — 몇 개든 같은 값 */
  if(lv >= d.max) return null;
  return d.cost[lv];
}

/* ================= R34 계시 되짚기 (노드 재분배) =================
   대표 지시: "성소가서 돈주고 노드를 새로 찍을수있게 / 어느 캐릭터든 골드를 일정 소모하여
              자유롭게 스타일 편집할 수 있게".
   확정 사항 — 초기화 대상은 **노드판만**(스탯 8P 는 건드리지 않는다),
              비용은 **첫 회 무료 + 이후 은화 고정**.

   ★ 환급액은 META.spent 를 쓰지 않고 **지금 찍혀 있는 노드에서 되계산**한다.
     META.spent 에는 스킬 구매분(metaBuySkill)이 함께 쌓인다. 노드만 밀면서 spent 전액을
     돌려주면 스킬에 쓴 포인트까지 되돌아와 **포인트가 복제된다**(무한 증식 경로).
     실제로 찍힌 노드의 값만 돌려주는 것이 유일하게 안전하다.
   ★ 비용 계산은 metaNextCost 와 같은 규칙을 따라야 한다 — 충전형(charge)은 몇 개든 cost[0].
     한쪽만 고치면 살 때와 돌려받을 때 값이 어긋난다. 두 함수를 붙여 둔 이유다.
   ★ 스킬(META.sk)·업적·도감·각인은 그대로 둔다. */
var META_RESPEC_COST = 8000;                 /* 첫 회는 무료, 그 다음부터 이 값(은화) */

function metaRespecRefund(){
  var sum = 0, i, j, d, lv;
  for(i = 0; i < META_NODES.length; i++){
    d = META_NODES[i]; lv = metaLv(d.id);
    if(lv <= 0) continue;
    if(d.charge){ sum += lv * (d.cost[0] || 0); continue; }   /* 충전형 — 개당 같은 값 */
    for(j = 0; j < lv; j++) sum += (d.cost[j] || 0);
  }
  return sum;
}
function metaRespecCost(){ return (META.respec || 0) === 0 ? 0 : META_RESPEC_COST; }
function metaRespecFree(){ return metaRespecCost() === 0; }

function metaRespec(){
  if(!P){ return false; }
  /* 던전 안에서는 못 한다 — 런 도중 노드가 사라지면 그 판의 계산(쉴드·회피 해금 등)이 뒤틀린다.
     성소는 거점에만 있으므로 정상 경로로는 닿지 않지만, 방어선을 둔다. */
  if(typeof runActive === "function" && runActive()){
    log("탐험 중에는 계시를 되짚을 수 없습니다. 거점으로 돌아가십시오.", "#f88");
    return false;
  }
  var refund = metaRespecRefund(), cost = metaRespecCost();
  if(refund <= 0){ log("아직 되짚을 노드가 없습니다.", "#888"); return false; }
  if(P.gold < cost){
    log("은화가 부족합니다 — " + (cost - P.gold).toLocaleString() + "개 더 필요합니다.", "#f88");
    return false;
  }
  P.gold -= cost;
  META.nodes = {};
  META.pt += refund;
  META.spent = Math.max(0, (META.spent || 0) - refund);
  META.respec = (META.respec || 0) + 1;
  metaSave();
  metaApplyToPlayer();                        /* HP/MP 증분이 여기서 되돌아간다 */
  if(P.hp > P.mhp) P.hp = P.mhp;
  if(P.mp > P.mmp) P.mp = P.mmp;
  sfx("lvl"); if(typeof spark === "function") spark(P.fx, P.fy, "#c9a6ff", 26, 2.2);
  log("<b>계시를 되짚었습니다.</b> 노드가 전부 풀리고 업적포인트 <b>" + refund.toLocaleString() + "P</b>가 돌아왔습니다.", "#c9a6ff");
  if(cost > 0) log("성소에 은화 " + cost.toLocaleString() + "개를 바쳤습니다.", "#a89c86");
  else log("첫 되짚기는 값을 받지 않습니다.", "#a89c86");
  if(typeof renderMeta === "function") renderMeta();
  if(typeof refreshHud === "function") refreshHud();
  if(typeof refreshChar === "function") refreshChar();
  if(typeof refreshQuick === "function") refreshQuick();
  if(typeof buildPad === "function") buildPad();
  return true;
}

function metaBuy(id){
  var d = metaNode(id), c = metaNextCost(id);
  if(!d) return false;
  if(metaLv(id) === 0){
    var q = metaReqInfo(id);
    if(!q.ok){ log("잠겨 있습니다 — " + q.why, "#f88"); return false; }
  }
  if(c === null){ log(TX("meta.maxed", d.n), "#888"); return false; }
  if(META.pt < c){ log(TX("meta.poor", c - META.pt), "#f88"); return false; }
  META.pt -= c; META.spent += c;
  META.nodes[id] = metaLv(id) + 1;
  metaSave();
  metaApplyToPlayer();
  sfx("ench"); spark(P.fx, P.fy, "#ffd24a", 14, 1.5);
  log(TX("meta.bought", d.n, metaLv(id)), "#ffd24a");
  renderMeta(); refreshHud(); refreshChar(); refreshQuick();
  if(typeof buildPad==="function")buildPad();
  return true;
}

/* 메타 보너스를 P 에 반영. 런 시작 전·구매 후·불러오기 후에 부른다.
   HP 는 레벨업이 P.mhp 를 직접 올리므로 '증분'으로만 더한다.
   (절대값으로 덮으면 레벨업분이 날아간다 — 07_state.js 는 손대지 않는다.) */
function metaApplyToPlayer(){
  if(!P) return;
  var want = metaBonus("hp"), had = P.metaHpApplied || 0, d = want - had;
  if(d !== 0){
    P.mhp += d;
    P.hp = Math.max(1, Math.min(P.mhp, P.hp + Math.max(0, d)));
    P.metaHpApplied = want;
  }
  var wantM = metaBonus("mmp"), hadM = P.metaMpApplied || 0, dm = wantM - hadM;
  if(dm !== 0){
    P.mmp += dm;
    P.mp = Math.max(0, Math.min(P.mmp, P.mp + Math.max(0, dm)));
    P.metaMpApplied = wantM;
  }
  P.metaAtk = metaBonus("atk");
  P.metaAc  = metaBonus("def");
}

/* ---------- 저장 ---------- */
function metaSave(){
  try{ localStorage.setItem(META_KEY, JSON.stringify(META)); }catch(e){}
}
function metaLoad(){
  var raw = null;
  try{ raw = localStorage.getItem(META_KEY); }catch(e){}
  /* R35 수리 — 저장본이 없다 = 신규 계정. 이관할 옛 진행이 없으므로 이관 완료로 표시한다.
     예전엔 그냥 반환해서 migr32 가 0 인 채로 첫 저장이 되었고, 그 다음 로드에서
     metaMigrate32() 의 (META.runs>0) 조건이 충족되어 신규 플레이어가 400P 를 받았다. */
  if(!raw){ META.migr32 = 1; return false; }
  try{
    var o = JSON.parse(raw);
    if(!o || o.v !== 4) return false;      /* v3 이하 거부 */
    META.pt    = o.pt || 0;
    META.spent = o.spent || 0;
    META.nodes = o.nodes || {};
    META.sk    = o.sk || {};
    META.skComp = o.skComp || 0;
    META.achv  = o.achv || [];
    META.runs  = o.runs || 0;
    META.best  = o.best || 0;
    META.tkills = o.tkills || 0;
    META.mark  = o.mark || null;
    META.clear1 = o.clear1 || 0;
    /* R17 추가분 — 구버전(v4) 저장에는 없다. 빈 값으로 폴백하므로 버전을 올리지 않는다.
       ★ 여기에 필드를 더할 때도 반드시 `|| 기본값` 폴백을 쓸 것. v 를 올리면 키 이름
       (META_KEY="lc2_meta_v4")이 바뀌어 기존 영구 성장이 통째로 사라진다. */
    META.dex      = o.dex || {};
    META.clsClear = o.clsClear || {};
    /* R19b 추가분 — 계열별 마지막 스탯 배분(대표 지시: 새로 시작할 때 배분을 고정). */
    META.alloc    = o.alloc || {};
    /* R32 — 계열 스킬 구매 일원화 이관 플래그(+보상). 없으면 이 저장본은 아직 이관 전이다. */
    META.migr32   = o.migr32 || 0;
    /* R34 — 노드 되짚기(성소) 횟수. 첫 회는 무료라 이 값이 0 인지로 판단한다. */
    META.respec   = o.respec || 0;
    if(typeof metaMigrate32 === "function") metaMigrate32();
    return true;
  }catch(e){ return false; }
}
function metaReset(){
  META = { v:4, pt:0, spent:0, nodes:{}, sk:{}, skComp:0, achv:[], runs:0, best:0, tkills:0, mark:null, clear1:0, dex:{}, clsClear:{}, alloc:{}, migr32:1, respec:0 };
  if(P){ P.markHpApplied=0; P.markAtk=0; P.markGiven=false; }
  metaSave(); metaApplyToPlayer(); renderMeta(); refreshHud();
  log("메타 진행도를 초기화했습니다.", "#f88");
}

/* ---------- 상점 UI (R1: 단순 리스트) ---------- */
function openMeta(){ openP("meta"); renderMeta(); }

/* ================= 노드판 — 세 줄기 트리 보드 =================
   하위 노드를 사야 상위가 열린다. 일부는 조건(누적 처치·최고 층) 해금.
   MAX = 포인트가 닿는 데까지 몰아 찍기. */
/* ---------- R32 계열별 노드판 ----------
   대표 지시: "마도 정령 둘다 새로 만들면 노드는 새로 짜서 스킬도 배우는 방식으로 가야지 /
             레벨업하면 자동으로 스킬 배워지는 구성이라 기사랑 육성하는 방식이 일원화가 안되어있음 /
             각 캐릭마다 노드는 다르게 설정하고 배워서 올리는 구조로 해야될듯"

   ★ 예전엔 판이 하나(기사 기준)였고, 정령마법사·마도학자는 레벨업하면 스킬이 저절로 열렸다.
     그래서 두 계열은 "고를 것이 없는" 계열이었다 — 빌드가 없으니 노드판을 볼 이유도 없었다.
     이제 세 계열이 같은 규칙(포인트로 산다)을 쓰고, 줄기 구성만 계열마다 다르다.

   구성 규칙
     뿌리·저울(秤) = 세 계열 공용 (회피·이동·경제 — 계열과 무관한 생존/살림)
     가운데 두 줄기 = 계열 전용. 그 계열 스킬은 전부 여기에 노드로 박힌다.
       기사   검(劍) 죽이는 속도 · 방패(盾) 버티는 힘
       정령   활(弓) 사거리·연사   · 숲(林) 소환·벽·이탈  ← 카이팅 도구
       마도   술(術) 주문 화력     · 보(步) 순간이동·결계·장판 ← 거리 관리 도구 */
var META_TREE_COMMON_ROOT = {n:"뿌리", c:"#e8d36e", ids:["dash", "dashcd", "dashlen", "mspd"]};
var META_TREE_COMMON_SCALE = ["gold0", "potbag", "drop", "silver", "eye3", "interest", "merchant", "enchp", "charm"];

var META_TREE_CLS = {
  k: [
    {n:"검(劍)",  c:"#ff9a6a", ids:["atk", "aspd", "execute", "wswap", "smash", "berserk", "whirl", "mmp", "mregen", "bdur", "beff"]},
    {n:"방패(盾)",c:"#9fe2ff", ids:["hp", "def", "hregen", "stun", "bash", "shield", "shieldup", "undying"]},
    {n:"저울(秤)",c:"#c9a6ff", ids:["warcry", "knife", "aura"].concat(META_TREE_COMMON_SCALE)}
  ],
  e: [
    {n:"활(弓)",  c:"#c8f0ff", ids:["atk", "aspd", "arng", "esnipe", "triple", "rain", "windst", "pin", "execute"]},
    {n:"숲(林)",  c:"#8fd18f", ids:["spwolf", "petdur", "thorn", "conjdur", "bstep", "eskin", "firewep", "ntouch"]},
    {n:"저울(秤)",c:"#c9a6ff", ids:["hp", "def", "hregen"].concat(META_TREE_COMMON_SCALE)}
  ],
  m: [
    {n:"술(術)",  c:"#d8b0ff", ids:["mmp", "mregen", "ebolt", "light", "chain", "fball", "beam", "mstop"]},
    {n:"보(步)",  c:"#9fe2ff", ids:["blink", "blinkcd", "iceward", "conjdur", "flamef", "hazr", "mirror", "mward", "heal"]},
    {n:"저울(秤)",c:"#c9a6ff", ids:["hp", "def", "hregen"].concat(META_TREE_COMMON_SCALE)}
  ]
};

/* 지금 보여 줄 판 — 캐릭터가 없으면(타이틀에서 열면) 기사 판을 보여 준다 */
function metaClsNow(){
  var c = (typeof P !== "undefined" && P && P.cls) ? P.cls : "k";
  return META_TREE_CLS[c] ? c : "k";
}
function metaTree(){
  return [META_TREE_COMMON_ROOT].concat(META_TREE_CLS[metaClsNow()]);
}
/* 옛 이름 호환 — 다른 모듈/검증본이 META_TREE 를 직접 읽는 곳이 있다 */
var META_TREE = metaTree();

/* ================= R20 노드판 — 원형 노드 + 연결선 + 옆 설명 패널 =================
   대표 지시(참고 이미지 첨부): "노드는 이런 느낌으로 재구성. 클릭시 설명이 좌우측으로 뜨는 방식."
   예전 판은 **글자 카드 세로 목록**이었다 — 노드마다 이름·설명·단계바·버튼이 전부 펼쳐져 있어
   28노드 + 스킬이 한 화면에 글자로 쏟아졌고, 계층은 왼쪽 세로선(들여쓰기)으로만 표현됐다.
   이제 노드는 **아이콘 원**이고, 선행 관계는 **연결선**으로, 설명은 **고른 노드 하나만 옆 패널**에 띄운다.

   ★ 아이콘을 이모지·기호 글자로 하지 않았다. 이 게임은 Gulim 계열 폰트를 쓰는 도트 화면이라
     글리프가 없으면 두부(□)로 나오고, 되는지 여부가 기기마다 다르다. 그래서 아이템 아이콘
     (04_icons.js)과 같은 방식으로 **작은 캔버스에 직접 그려** dataURL 로 캐시한다 — 폰트와 무관하고
     도트 톤도 맞는다. */
var MICO = {};
function metaIcoUrl(kind, col){
  var key = kind + "|" + col, u = MICO[key];
  if(u) return u;
  /* ★ R23 — 노드판을 화면 꽉 차게 키우면서 아이콘도 같이 커져야 한다(대표 지시: "눈에 확 들어오는
     폰트로 키워서"). 그림 코드는 20x20 좌표로 짜여 있으므로 **좌표를 고치지 않고** 캔버스만
     2배로 늘리고 scale(2) 를 걸어 그린다 — 픽셀 정수배 확대라 흐려지지 않는다(선명한 도트 유지). */
  var MZ = 2, cv = document.createElement("canvas"); cv.width = 20*MZ; cv.height = 20*MZ;
  var g = cv.getContext("2d"); g.imageSmoothingEnabled = false; g.scale(MZ, MZ);
  var L = "rgba(255,255,255,.9)", D = "rgba(0,0,0,.5)";
  function R(x,y,w,h,c){ g.fillStyle=c; g.fillRect(x,y,w,h); }
  switch(kind){
    case "sword":                                        /* 검 — 대각선. 수직으로 그리면 20px 에서
                                                            가드와 날이 붙어 ⊥ 로 읽힌다(실측). */
      for(var si=0; si<8; si++) R(6+si, 11-si, 2, 2, si>4?L:col);
      R(4,12,3,2,col); R(6,14,2,2,col);                  /* 가드 */
      R(2,14,4,4,D); break;                              /* 손잡이 */
    case "rage":                                         /* 광전사 — 불꽃 */
      R(9,2,2,3,L); R(7,5,6,3,col); R(6,8,8,4,col); R(5,12,10,4,col); R(7,16,6,1,D);
      R(8,9,2,4,L); break;
    case "whirl":                                        /* 회전베기 — 도는 화살 */
      R(6,3,8,2,col); R(4,5,2,3,col); R(14,5,2,3,col); R(4,11,2,3,col); R(14,11,2,3,col);
      R(6,15,8,2,col); R(14,2,3,2,L); R(16,4,2,3,L); break;
    case "speed":                                        /* 이중 화살 — 속도 */
      R(4,5,2,10,col); R(6,7,2,6,col); R(8,9,2,2,L);
      R(11,5,2,10,col); R(13,7,2,6,col); R(15,9,2,2,L); break;
    case "heart":                                        /* 심장 — 생명 */
      R(4,6,5,4,col); R(11,6,5,4,col); R(4,10,12,3,col); R(6,13,8,2,col);
      R(8,15,4,2,col); R(5,7,2,2,L); break;
    case "shield":                                       /* 방패 */
      R(4,3,12,2,col); R(4,5,12,6,col); R(5,11,10,3,col); R(7,14,6,2,col);
      R(9,16,2,1,D); R(6,5,2,5,L); break;
    case "burst":                                        /* 충격 — 기절·방패치기 */
      R(9,2,2,5,col); R(9,13,2,5,col); R(2,9,5,2,col); R(13,9,5,2,col);
      R(6,6,2,2,col); R(12,6,2,2,col); R(6,12,2,2,col); R(12,12,2,2,col);
      R(8,8,4,4,L); break;
    case "coin":                                         /* 은화 */
      R(7,3,6,2,col); R(5,5,10,2,col); R(4,7,12,6,col); R(5,13,10,2,col); R(7,15,6,2,col);
      R(9,7,2,6,D); R(6,6,2,2,L); break;
    case "drop":                                         /* 물방울 — 마나 */
      R(9,2,2,4,col); R(7,6,6,3,col); R(5,9,10,5,col); R(7,14,6,2,col);
      R(7,8,2,4,L); break;
    case "up":                                           /* 상승 — 버프 */
      R(9,3,2,14,col); R(7,5,2,3,col); R(11,5,2,3,col); R(5,7,2,3,col); R(13,7,2,3,col);
      R(9,3,1,13,L); break;
    case "boot":                                         /* 회피·도약 — 잔상 남기며 튀는 모양 */
      R(2,9,3,2,col); R(6,9,3,2,col);                     /* 잔상 */
      R(11,5,2,2,col); R(13,7,2,2,col); R(15,9,2,2,L); R(13,11,2,2,col); R(11,13,2,2,col); break;
    case "swap":                                         /* 교체 — 반대 방향 화살 두 개 */
      R(3,6,10,2,col); R(11,4,2,2,col); R(13,6,2,2,L); R(11,8,2,2,col);
      R(7,12,10,2,col); R(5,10,2,2,col); R(3,12,2,2,L); R(5,14,2,2,col); break;
    case "eye":                                          /* 눈썰미 */
      R(3,8,14,4,col); R(5,7,10,1,col); R(5,12,10,1,col);
      R(8,8,4,4,D); R(9,9,2,2,L); break;
    case "ring":                                         /* 오러 — 권역 */
      R(6,4,8,2,col); R(4,6,2,8,col); R(14,6,2,8,col); R(6,14,8,2,col);
      R(9,9,2,2,L); break;
    case "wave":                                         /* 외침 */
      R(4,4,2,12,col); R(7,6,2,8,col); R(10,8,2,4,col); R(13,9,2,2,L); break;
    case "knife":                                        /* 투척 단검 */
      R(12,3,2,8,col); R(12,3,1,8,L); R(10,11,6,2,col); R(12,13,2,4,D); break;
    case "potion":
      R(8,2,4,2,col); R(9,4,2,2,col); R(5,6,10,10,col); R(6,8,2,6,L); R(5,16,10,1,D); break;
    case "charm":                                        /* 부적 */
      R(9,2,2,3,col); R(5,5,10,3,col); R(6,8,8,7,col); R(9,15,2,2,D); R(7,9,2,4,L); break;
    /* ---- R32 계열 도구 아이콘 ----
       ★ 20x20 도트 안에서 서로 구분되는 실루엣만 쓴다. 비슷하게 그리면 판에서 다 같아 보인다
         (첫 시제품은 새 노드가 전부 기본 마름모로 나와 활·소환·결계가 구분되지 않았다). */
    case "bow":                                          /* 활 — 왼쪽 활대 + 시위 + 화살 */
      R(5,3,2,2,col); R(4,5,2,10,col); R(5,15,2,2,col);
      R(7,4,1,12,L);                                     /* 시위 */
      R(8,9,9,2,col); R(15,8,2,4,L); break;              /* 화살대 + 촉 */
    case "paw":                                          /* 소환수 — 발자국 */
      R(5,4,3,3,col); R(9,3,3,3,col); R(13,5,3,3,col);
      R(6,9,9,6,col); R(8,11,5,2,L); break;
    case "vine":                                         /* 가시덩굴 벽 */
      R(4,14,12,2,D);
      R(6,6,2,8,col); R(10,4,2,10,col); R(14,8,2,6,col);
      R(4,8,2,2,L); R(12,6,2,2,L); R(16,10,2,2,L); break;
    case "ice":                                          /* 결계 — 얼음 기둥 셋 */
      R(4,10,3,7,col); R(9,5,3,12,col); R(14,9,3,8,col);
      R(5,11,1,4,L); R(10,7,1,7,L); R(15,10,1,4,L); break;
    case "flame":                                        /* 장판 — 바닥 불 */
      R(3,14,14,3,D);
      R(6,8,2,6,col); R(9,5,2,9,col); R(12,9,2,5,col);
      R(9,7,1,4,L); R(6,10,1,2,L); break;
    case "port":                                         /* 순간이동 — 사라지는 잔상 */
      R(3,4,2,12,col); R(6,6,2,8,col); R(9,8,2,4,col);
      R(13,3,2,2,L); R(15,7,2,2,L); R(13,11,2,2,L); R(15,15,2,2,L); break;
    default:                                             /* 기본 — 마름모 */
      R(9,3,2,2,col); R(7,5,6,2,col); R(5,7,10,6,col); R(7,13,6,2,col); R(9,15,2,2,col);
      R(8,7,2,4,L);
  }
  u = cv.toDataURL("image/png"); MICO[key] = u; return u;
}
/* 노드 -> 아이콘 배정. 없으면 계열 기본값(아래 METREE_ICO). 새 노드를 넣으면 여기 한 줄. */
var META_ICO = {
  dash:"boot", dashcd:"boot", dashlen:"boot", wswap:"swap", mspd:"speed",
  atk:"sword", aspd:"speed", execute:"knife", smash:"burst", berserk:"rage", whirl:"whirl",
  mmp:"drop", mregen:"drop", bdur:"up", beff:"up",
  hp:"heart", def:"shield", hregen:"heart", stun:"burst", bash:"burst",
  shield:"shield", shieldup:"shield", undying:"heart",
  warcry:"wave", knife:"knife", aura:"ring",
  gold0:"coin", potbag:"potion", drop:"coin", silver:"coin", eye3:"eye",
  interest:"coin", merchant:"coin", enchp:"up", charm:"charm",
  /* ---- R32 계열 전용 노드·스킬 ----
     스킬 id 도 여기서 아이콘을 받는다(판에서는 노드와 스킬이 같은 원으로 그려진다). */
  arng:"bow", petdur:"paw", conjdur:"vine", blinkcd:"port", hazr:"flame",
  esnipe:"bow", triple:"bow", rain:"wave", windst:"speed", pin:"knife",
  spwolf:"paw", thorn:"vine", bstep:"boot", eskin:"shield", firewep:"up", ntouch:"heart",
  ebolt:"burst", light:"burst", chain:"wave", fball:"flame", beam:"wave", mstop:"ring",
  blink:"port", iceward:"ice", flamef:"flame", mirror:"port", mward:"shield", heal:"heart"
};

/* 해금 조건 — node: 하위 노드 1단 이상 / kills: 누적 처치 / best: 최고 도달 층 */
var META_REQ = {
  dashcd:  {node:"dash"},
  dashlen: {node:"dash"},
  wswap:   {node:"dash"},
  smash:   {node:"atk"},
  berserk: {node:"smash", kills:100},
  whirl:   {node:"smash"},
  aspd:    {node:"atk"},
  execute: {node:"aspd", kills:250},
  mregen:  {node:"mmp"},
  beff:    {node:"bdur"},
  def:     {node:"hp"},
  hregen:  {node:"hp"},
  stun:    {node:"def"},
  bash:    {node:"stun"},
  shieldup:{node:"shield"},
  shield:  {node:"def"},
  undying: {node:"shield", best:3},
  warcry:  {best:3},
  knife:   {node:"warcry"},
  aura:    {best:4},
  eye3:    {node:"drop"},
  interest:{best:3},
  enchp:   {node:"silver"},
  charm:   {node:"enchp"},
  /* ---- R32 계열 전용 선행 ---- */
  arng:    {node:"aspd"},
  esnipe:  {node:"atk"},
  triple:  {node:"esnipe"},
  rain:    {node:"triple", best:3},
  windst:  {node:"aspd"},
  pin:     {node:"arng"},
  spwolf:  {},
  petdur:  {node:"spwolf"},
  thorn:   {node:"spwolf"},
  conjdur: {node:"thorn"},
  bstep:   {node:"thorn"},
  eskin:   {node:"hp"},
  firewep: {node:"eskin"},
  ntouch:  {node:"firewep", best:3},
  ebolt:   {node:"mmp"},
  light:   {node:"ebolt"},
  chain:   {node:"light"},
  fball:   {node:"light", best:3},
  beam:    {node:"fball", best:4},
  mstop:   {node:"chain"},
  blink:   {},
  blinkcd: {node:"blink"},
  iceward: {node:"blink"},
  flamef:  {node:"iceward"},
  hazr:    {node:"flamef"},
  mirror:  {node:"iceward", best:3},
  mward:   {node:"hp"},
  heal:    {node:"mward"}
};

/* ---------- 스킬 정의 조회 (R18) ----------
   ★ 예전엔 SKILLS.k(기사)만 뒤졌다. 그래서 정령마법사·마도학자 스킬은 skillDef 가 null →
   metaBuySkill 실패 → skKnown false → castSkill 이 "상점에서 습득" 으로 막아,
   두 계열이 스킬을 하나도 쓸 수 없었다. 이제 전 계열을 뒤진다.
   기사 스킬은 영구 성장 상점 구매(META.sk), 나머지 계열은 레벨 해금이다 — skKnown 참고. */
function skillOwner(id){
  var c, l, i;
  for(c in SKILLS){ l = SKILLS[c]; for(i = 0; i < l.length; i++) if(l[i].id === id) return c; }
  return null;
}
function skillDef(id){
  var c, l, i;
  for(c in SKILLS){ l = SKILLS[c]; for(i = 0; i < l.length; i++) if(l[i].id === id) return l[i]; }
  return null;
}
function isSkillId(id){ return !!skillDef(id); }
function anyLv(id){ return isSkillId(id) ? skLv(id) : metaLv(id); }
function nameOf(id){ var d=metaNode(id); if(d) return d.n; var s=skillDef(id); return s?s.n:id; }

function metaReqInfo(id){
  var r = META_REQ[id];
  if(!r) return {ok:true, why:""};
  if(r.node && anyLv(r.node) < 1) return {ok:false, why:"「" + nameOf(r.node) + "」 먼저"};
  if(r.kills && (META.tkills||0) < r.kills)
    return {ok:false, why:"누적 처치 " + r.kills + " (지금 " + (META.tkills||0) + ")"};
  if(r.best && (META.best||0) < r.best)
    return {ok:false, why:r.best + "층 도달 (최고 " + (META.best||0) + "층)"};
  return {ok:true, why:""};
}

/* 몰아 찍기 — 포인트가 닿는 데까지 */
function metaBuyMax(id){
  var n = 0;
  while(n < 12 && metaBuy(id)) n++;
}

/* 손가락(터치) 기기에서는 노드 카드 글씨·버튼을 확대한다 — 데스크톱 크기 그대로면
   모바일에서 상하위 노드 구분이 잘 안 보이고 버튼도 누르기 어렵다는 리포트 반영. */
function metaTouchUI(){
  try{ return (window.matchMedia && window.matchMedia("(pointer:coarse)").matches) || document.body.classList.contains("mobile"); }
  catch(e){ return false; }
}

/* 선행 관계(META_REQ.node)만 부모-자식으로 삼아 트리를 만든다.
   ★ 이 함수는 옛 목록 렌더러와 함께 지웠다가 되살렸다 — metaLayout 이 여기에 의존한다
     (지운 직후 노드판이 "metaBuildTree is not defined" 로 통째로 죽었다). 삭제 전 참조 확인 필수. */
function metaBuildTree(ids){
  var idSet = {}, childrenOf = {}, roots = [], i, id, r, p;
  for(i = 0; i < ids.length; i++) idSet[ids[i]] = true;
  for(i = 0; i < ids.length; i++){
    id = ids[i]; r = META_REQ[id];
    p = (r && r.node && idSet[r.node]) ? r.node : null;
    if(p){ (childrenOf[p] = childrenOf[p] || []).push(id); }
    else roots.push(id);
  }
  return { childrenOf: childrenOf, roots: roots };
}

/* ---------- R20 노드판 본체 ----------
   계층 = 선행 관계(META_REQ.node) 깊이. 같은 깊이는 한 줄에 나란히 놓고, 부모-자식은 선으로 잇는다.
   좌표를 직접 계산해 절대배치 + SVG 선으로 그린다 — 표(table)나 들여쓰기로는 형제/부모가 안 읽힌다. */
var META_SEL = null;                     /* 지금 고른 노드 — 설명은 옆 패널에 뜬다 */
/* R23 — 노드판 확대 (대표 지시: "노드창 더 크게, 화면 거의 꽉차게, 노드 구성을 눈에 확 들어오는 폰트로").
   패널 자체는 template.html 에서 97vw x 94vh 로 키웠고, 여기서는 **판의 좌표계**를 같이 키운다.
   옛 값(124/52/17)은 680px 패널에 4계열을 밀어 넣기 위한 크기였다 — 노드 원이 34px 라 아이콘이 20px,
   글자는 10~11px 로 눌렸다. 이제 원 48px · 아이콘 30px 기준으로 넓힌다. */
var MB_W = 196, MB_ROW = 82, MB_R = 24;  /* 열 너비 · 줄 간격 · 노드 반지름 */

function metaNodeInfo(id){
  var isSk = isSkillId(id), o = {id:id, isSk:isSk};
  if(isSk){
    var sk = skillDef(id);
    o.lv = skLv(id); o.max = 1 + (sk.up ? sk.up.length : 0);
    o.cost = skNextCost(sk); o.n = sk.n;
    /* ★ R27 — 스킬 노드가 **무슨 스킬인지** 를 보여 주지 않았다(대표 리포트: "오러 권역은 어떤건지?
       내용이 없고 반경·지속시간만 뜸"). updesc 는 단계별 수치 변화표라, 그것만 띄우면
       처음 보는 사람은 이 스킬이 무엇을 하는지 알 수 없다. 설명 + 단계표를 같이 적는다. */
    o.desc = sk.desc || "";
    if(sk.updesc) o.desc += (o.desc ? '<div style="color:#8a8068;font-size:12px;margin-top:5px">단계 · ' : '') + sk.updesc + (o.desc ? '</div>' : '');
  }else{
    var d = metaNode(id);
    o.lv = metaLv(id); o.max = d.max; o.cost = metaNextCost(id); o.n = d.n; o.desc = d.desc;
    o.per = d.per; o.charge = d.charge;
  }
  var q = metaReqInfo(id);
  o.why = q.why; o.locked = (o.lv === 0 && !q.ok);
  o.can = !o.locked && o.cost !== null && META.pt >= o.cost;
  return o;
}

/* 깊이·줄 배치 계산 — 부모는 자식들의 가운데에 오도록 x 를 평균낸다(선이 꼬이지 않는다) */
function metaLayout(ids){
  var t = metaBuildTree(ids), depth = {}, order = [];
  t.roots.forEach(function(r){ (function walk(id, d){
    depth[id] = d; order.push(id);
    (t.childrenOf[id] || []).forEach(function(c){ walk(c, d + 1); });
  })(r, 0); });
  var rows = {}, maxD = 0;
  order.forEach(function(id){ var d = depth[id]; (rows[d] = rows[d] || []).push(id); if(d > maxD) maxD = d; });
  /* ★ 한 깊이에 노드가 많으면 **줄을 접어야** 한다. 예전(첫 시제품)엔 깊이 하나 = 한 줄로 두고
     간격만 좁혔더니, 저울 계열(뿌리 깊이에 6개)이 서로 겹쳐 아이콘이 포개졌다(스크린샷 확인).
     깊이는 유지하고 화면 줄만 나눈다 — 연결선은 실제 좌표로 그리므로 계층 표현은 그대로다. */
  var PER = 3, GAP = 58, pos = {}, d2, vrow = 0;   /* R23: 원이 34→48px 로 커졌으므로 간격도 36→58 */
  for(d2 = 0; d2 <= maxD; d2++){
    var row = rows[d2] || [], i2;
    for(i2 = 0; i2 < row.length; i2 += PER){
      var chunk = row.slice(i2, i2 + PER), n = chunk.length, yy = 22 + vrow * MB_ROW;
      chunk.forEach(function(id, k){
        pos[id] = { x: Math.round(MB_W / 2 + (k - (n - 1) / 2) * GAP), y: yy };
      });
      vrow++;
    }
  }
  return { pos: pos, depth: depth, childrenOf: t.childrenOf, order: order, h: 22 + vrow * MB_ROW };
}

function metaBranchHtml(tree){
  var L = metaLayout(tree.ids), pos = L.pos, col = tree.c;
  var svg = '<svg width="' + MB_W + '" height="' + L.h + '" style="position:absolute;left:0;top:0;pointer-events:none">';
  L.order.forEach(function(id){
    (L.childrenOf[id] || []).forEach(function(c){
      var a = pos[id], b = pos[c];
      if(!a || !b) return;
      var own = anyLv(id) > 0;                       /* 선행을 이미 샀으면 선을 밝게 — 열린 길이 보인다 */
      svg += '<line x1="' + a.x + '" y1="' + (a.y + MB_R) + '" x2="' + b.x + '" y2="' + (b.y - MB_R) + '" '
           + 'stroke="' + (own ? col : '#3a3450') + '" stroke-width="' + (own ? 2 : 1) + '" '
           + 'stroke-opacity="' + (own ? 0.75 : 0.5) + '"/>';
    });
  });
  svg += '</svg>';
  var nodes = '';
  L.order.forEach(function(id){
    var o = metaNodeInfo(id), p = pos[id];
    var cls = 'mnd' + (o.lv > 0 ? ' own' : '') + (o.locked ? ' lock' : (o.can ? ' can' : ''))
            + (META_SEL === id ? ' sel' : '');
    var ic = metaIcoUrl(META_ICO[id] || tree.ico || 'gem', o.lv > 0 ? col : '#6b6480');
    var pips = '';
    for(var i = 0; i < Math.min(o.max, 5); i++)
      pips += '<i style="background:' + (i < o.lv ? col : '#3a3450') + '"></i>';
    nodes += '<div class="' + cls + '" style="left:' + p.x + 'px;top:' + p.y + 'px;'
           + (o.lv > 0 ? 'border-color:' + col + ';' : '') + '" title="' + o.n + '" '
           + 'onclick="metaSelect(\'' + id + '\')">'
           + '<img src="' + ic + '" width="30" height="30" alt="">'
           + '<span class="mndp">' + pips + '</span>'
           + (o.locked ? '<span class="mndlk">🔒</span>' : '')
           + '</div>';
  });
  return '<div style="flex:0 0 ' + MB_W + 'px">'
       + '<div class="mbh" style="color:' + col + '">' + tree.n + '</div>'
       + '<div class="mboard" style="height:' + L.h + 'px">' + svg + nodes + '</div></div>';
}

/* 고른 노드의 설명 — 좌우측 패널 (대표 지시: "클릭시 설명이 좌우측으로 뜨는 방식") */
function metaSideHtml(){
  var id = META_SEL;
  if(!id) return '<div class="msempty">노드를 누르면<br>여기에 설명이 나옵니다.</div>';
  var o = metaNodeInfo(id), col = "#e8d36e", i;
  metaTree().forEach(function(t){ if(t.ids.indexOf(id) >= 0) col = t.c; });
  var h = '<div class="mstitle" style="color:' + col + '">' + (o.locked ? '🔒 ' : '') + o.n + '</div>';
  h += '<div class="mspips">';
  for(i = 0; i < o.max && i < 12; i++)
    h += '<i style="background:' + (i < o.lv ? col : '#3a3450') + '"></i>';
  h += ' <b style="color:#8a8068;font-size:10px">' + o.lv + (o.charge ? '' : ' / ' + o.max) + '</b></div>';
  h += '<div class="msdesc">' + o.desc + '</div>';
  if(o.isSk){
    /* R32 — 판이 계열별로 갈렸으니 태그도 그 계열 이름을 쓴다("기사 계열 스킬" 고정 문구였다) */
    var own2 = (typeof skillOwner === "function") ? skillOwner(id) : null;
    var cn = (own2 && typeof CLS !== "undefined" && CLS[own2]) ? CLS[own2].n : "계열";
    h += '<div class="mstag">' + cn + ' 스킬</div>';
  }
  if(o.locked){
    h += '<div class="mslock">🔗 선행 조건 — ' + o.why + '</div>';
  }else if(o.cost === null){
    h += '<div class="msdone" style="color:' + col + '">완성</div>';
  }else{
    h += '<div class="mscost">비용 <b style="color:' + (o.can ? '#7CFC00' : '#ff8a6a') + '">' + o.cost + 'P</b>'
       + ' <span style="color:#6b6046">보유 ' + META.pt + 'P</span></div>';
    h += '<button class="ib' + (o.can ? '' : ' sell') + '" style="width:100%;margin-top:6px;padding:7px" '
       + 'onclick="' + (o.isSk ? 'metaBuySkill' : 'metaBuy') + '(\'' + id + '\')">'
       + (o.lv === 0 ? '습 득' : '강 화') + '</button>';
    if(!o.isSk && o.per > 0 && o.max - o.lv > 1 && o.can)
      h += '<button class="ib" style="width:100%;margin-top:4px;padding:5px;font-size:11px" '
         + 'onclick="metaBuyMax(\'' + id + '\')">닿는 데까지 (MAX)</button>';
  }
  return h;
}
/* 노드를 고른다 — 전체를 다시 그리지 않는다. 다시 그리면 패널 스크롤이 위로 튄다. */
function metaSelect(id){
  META_SEL = id;
  var side = document.getElementById("metaside");
  if(side) side.innerHTML = metaSideHtml();
  var els = document.querySelectorAll("#metalist .mnd"), i;
  for(i = 0; i < els.length; i++) els[i].classList.remove("sel");
  var cur = document.querySelector('#metalist .mnd[onclick*="\'' + id + '\'"]');
  if(cur) cur.classList.add("sel");
  if(typeof sfx === "function") sfx("click");
}

/* ---------- R20b 탭 분리 (대표 지시) ----------
   "노드와 업적칸은 좀 분리하거나 탭으로 전환하면서 봐도될듯. **수치만 양측탭에서** 볼수있게 구성."
   → 화면을 [노드] / [업적·도감] 두 탭으로 나누고, **수치줄(포인트·런·최고층·처치·업적·도감)은
     탭과 무관하게 항상 위에 남긴다.** 예전엔 노드판 아래로 업적 20줄 + 도감 14칸이 계속 붙어 있어
     노드를 보려면 그 밑을 다 지나쳐야 했고, 반대로 업적을 보려면 노드판을 지나쳐야 했다. */
var META_TAB = "node";
function metaTab(t){
  META_TAB = t;
  renderMeta();
  var box = document.getElementById("meta");
  if(box) box.scrollTop = 0;        /* 탭을 바꾸면 위에서부터 본다 */
  if(typeof sfx === "function") sfx("click");
}

function renderMeta(){
  var el = document.getElementById("metalist");
  if(!el) return;
  /* 스크롤 보존 — 노드를 사면 renderMeta 가 다시 그리는데, 그때 패널이 맨 위로 튀면
     방금 누른 노드가 화면에서 사라진다(구매 흐름이 끊긴다). */
  var box = document.getElementById("meta"), sc = box ? box.scrollTop : 0;

  /* ① 수치줄 — 두 탭 공통. 여기 있는 값은 탭을 바꿔도 늘 보인다. */
  var h = '<div class="mtop">'
        + '<span class="mtpt">' + META.pt + 'P</span>'
        + '<span class="mtsub">런 ' + META.runs + '회 · 최고 ' + META.best + '층 · 누적 처치 '
        + (META.tkills||0) + ' · 사용 ' + META.spent + 'P'
        + ' <span style="color:#6b6046">|</span> 업적 <b style="color:#c9a227">' + META.achv.length + '/' + ACHV.length + '</b>'
        + ' · 도감 <b style="color:#9fe2ff">' + metaDexCount() + '/' + metaDexTotal() + '</b></span></div>';
  var mk = markOf();
  if(mk) h += '<div class="mmark">각인 · <b>' + mk.n + '</b> <span>' + mk.desc + '</span></div>';
  h += '<div class="mgoal">' + nextGoalLine() + '</div>';

  /* ② 탭 */
  h += '<div class="mtabs">'
     + '<span class="mtab' + (META_TAB === "node" ? ' on' : '') + '" onclick="metaTab(\'node\')">노 드</span>'
     + '<span class="mtab' + (META_TAB === "achv" ? ' on' : '') + '" onclick="metaTab(\'achv\')">업적 · 도감</span>'
     + '</div>';

  /* ③ 탭 내용 */
  if(META_TAB === "node"){
    h += '<div class="mwrap"><div class="mcols">';
    metaTree().forEach(function(tree){ h += metaBranchHtml(tree); });
    h += '</div><div class="mside" id="metaside">' + metaSideHtml() + '</div></div>';
  }else{
    h += metaAchvList();
    h += metaDexList();
  }
  el.innerHTML = h;
  if(box) box.scrollTop = sc;
}

/* ---------- R17 업적 목록 ----------
   20종이 되면서 숫자 카운터만으로는 "뭘 더 해야 하는지"가 안 보인다.
   딴 것은 이름·점수를, 못 딴 것은 조건(d)을 흐리게 보여 준다 — 스포일러가 아니라 목표 제시. */
function metaAchvList(){
  var h = '<div style="margin-top:10px;border-top:1px solid #35304a;padding-top:8px">'
        + '<div style="color:#c9a227;font-size:11px;font-weight:bold;margin-bottom:4px">업적</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:4px">';
  ACHV.forEach(function(a){
    var got = metaHasAchv(a.id);
    h += '<div style="flex:1 1 46%;min-width:150px;font-size:10px;line-height:14px;'
       + 'border:1px solid ' + (got ? '#6a5c2a' : '#2e2a3e') + ';border-radius:4px;padding:3px 5px;'
       + 'background:' + (got ? 'rgba(201,162,39,.10)' : 'rgba(0,0,0,.18)') + '">'
       + '<span style="color:' + (got ? '#ffd24a' : '#6b6046') + '">' + (got ? '★' : '☆') + ' ' + a.n + '</span>'
       + '<span style="float:right;color:' + (got ? '#9a8f6a' : '#4e4a3e') + '">' + a.p + 'P</span>'
       + '<div style="color:' + (got ? '#7a7060' : '#565064') + ';clear:both">' + (a.d || '') + '</div>'
       + '</div>';
  });
  return h + '</div></div>';
}

/* ---------- R17 마물 도감 ----------
   처치해 본 종만 이름이 보인다. 안 잡아 본 종은 "???" 로 자리만 남겨
   "아직 못 본 게 몇 종 있다"는 것 자체가 목표가 되게 한다. */
function metaDexList(){
  if(typeof MOBS === "undefined") return '';
  var h = '<div style="margin-top:10px;border-top:1px solid #35304a;padding-top:8px">'
        + '<div style="color:#9fe2ff;font-size:11px;font-weight:bold;margin-bottom:4px">마물 도감</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:3px">';
  var k;
  for(k in MOBS){
    if(k.indexOf("@") >= 0) continue;          /* R19b 변종은 원종 칸에 합친다 */
    var got = !!(META.dex && META.dex[k]), d = MOBS[k];
    var col = d.boss ? '#ff6060' : (d.mini ? '#ffb060' : '#9fe2ff');
    h += '<div style="font-size:10px;padding:2px 6px;border-radius:3px;'
       + 'border:1px solid ' + (got ? '#2f4a58' : '#2a2636') + ';'
       + 'color:' + (got ? col : '#4e4a3e') + ';'
       + 'background:' + (got ? 'rgba(60,120,150,.12)' : 'transparent') + '">'
       + (got ? d.n : '???') + '</div>';
  }
  return h + '</div></div>';
}
