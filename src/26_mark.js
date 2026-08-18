/* ================= v4 — 각인 의식 (신규 생성 1회) =================
   세계관: 계시받은 자는 인구의 백에 하나. 그대는 이제 막 문신을 얻은 최하급 계시자.
   기사는 빛·검신(무신/글라디우스) 계열이고 문양은 '검과 저울'이다.
   그 문양이 어느 쪽으로 기울어 새겨졌는가 — 그것이 각인 계열이다.

   설계 원칙 (이유가 있는 제약이다)
     ① 보정은 **메타 노드 1단계보다 작게** 둔다.
        메타 상점이 몇 런 만에 이 차이를 덮는다 → "20런 뒤엔 취향 문제"가 저절로 성립.
     ② 직업을 가르지 않는다. 기사 단일 유지. 빌드 다양성은 런 내 선택에서 나온다.
     ③ 영구 잠김이 아니다. R3 문신 성장축이 붙으면 여기가 그 출발점이 된다.

   저장: META.mark (v4 세이브에 포함). 신규 시작 시 없으면 의식을 띄운다.
   ================================================================== */

var MARKS = {
  blade: {
    id:"blade", n:"검(劍)의 각인", sign:"기울어진 검",
    line:"베어야 할 것을 먼저 본다.",
    desc:"공격 +1 · 은화 40 · 체력 물약 3",
    atk:1, hp:0, gold:40,
    items:[["hpot",3]]
  },
  shield: {
    id:"shield", n:"방패(盾)의 각인", sign:"세워진 검",
    line:"지켜야 할 것을 먼저 본다.",
    desc:"최대 HP +8 · 은화 40 · 체력 물약 3, 붕대 2",
    atk:0, hp:8, gold:40,
    items:[["hpot",3],["bandage",2]]
  },
  scale: {
    id:"scale", n:"저울(秤)의 각인", sign:"수평의 저울",
    line:"값을 먼저 헤아린다.",
    desc:"은화 180 · 체력 물약 2, 해독초 1, 횃불 1",
    atk:0, hp:0, gold:180,
    items:[["hpot",2],["antidote",1],["torch",1]]
  }
};

/* 문항 — 성읍의 사제가 각인 전에 묻는다. 보기 순서는 고정(검/방패/저울)이 아니라
   문항마다 섞어 둔다. 순서로 답을 유추하지 못하게. */
var MARK_Q = [
  { q:"성문 밖에서 비명이 들린다. 그대의 몸이 먼저 한 일은.",
    a:[["검을 뽑았다.","blade"],
       ["소리 난 쪽과 성문 사이에 섰다.","shield"],
       ["몇 명인지부터 셌다.","scale"]] },

  { q:"스승은 낡은 검 한 자루를 남겼다. 그대는 그것을.",
    a:[["대장간에 맡겨 값을 물었다.","scale"],
       ["갈아서 허리에 찼다.","blade"],
       ["벽에 걸어 두고 매일 보았다.","shield"]] },

  { q:"문신이 처음 발색하던 밤, 가장 먼저 떠오른 얼굴은.",
    a:[["나를 두고 간 자.","blade"],
       ["내 뒤에 있던 자.","shield"],
       ["나에게 빚진 자.","scale"]] },

  { q:"동료 셋과 좁은 통로에 몰렸다. 그대의 자리는.",
    a:[["가장 앞.","blade"],
       ["가장 뒤.","shield"],
       ["빠져나갈 길이 보이는 쪽.","scale"]] },

  { q:"검과 저울 중 하나만 새길 수 있다면.",
    a:[["검. 저울은 검이 이긴 뒤에 든다.","blade"],
       ["둘 다. 한쪽으로 기울면 사람이 죽는다.","shield"],
       ["저울. 검은 저울이 정한 뒤에 든다.","scale"]] }
];

var MARKSTATE = { i:0, tally:{blade:0, shield:0, scale:0} };

function markOf(){ return (META && META.mark) ? MARKS[META.mark] : null; }
function markHas(){ return !!markOf(); }

/* ---------- 의식 진행 ---------- */
function markStart(){
  MARKSTATE = { i:0, tally:{blade:0, shield:0, scale:0} };
  document.getElementById("markov").style.display = "block";
  markRenderQ();
}

function markRenderQ(){
  var s = MARKSTATE, body = document.getElementById("markbody");
  if(s.i >= MARK_Q.length){ markRenderResult(); return; }
  var Q = MARK_Q[s.i];
  var h = '<div style="color:#8a8068;font-size:11px;letter-spacing:2px;margin-bottom:6px">'
        + '각인 의식 · ' + (s.i+1) + ' / ' + MARK_Q.length + '</div>';
  h += '<div style="color:#e8e0d0;font-size:15px;line-height:1.7;margin-bottom:16px">' + Q.q + '</div>';
  Q.a.forEach(function(a, i){
    h += '<button class="bigbtn" style="display:block;width:100%;margin:6px 0;font-size:13px;'
       + 'padding:9px 14px;text-align:left;letter-spacing:0" '
       + 'onclick="markPick(' + i + ')">' + a[0] + '</button>';
  });
  body.innerHTML = h;
}

function markPick(i){
  var Q = MARK_Q[MARKSTATE.i];
  if(!Q || !Q.a[i]) return;
  MARKSTATE.tally[Q.a[i][1]]++;
  MARKSTATE.i++;
  sfx("pot");
  markRenderQ();
}

/* 동점이면 저울 — 어느 쪽으로도 기울지 않았다는 뜻이다. */
function markDecide(t){
  var best = "scale", bv = -1, k;
  for(k in t) if(t[k] > bv){ bv = t[k]; best = k; }
  var tied = 0;
  for(k in t) if(t[k] === bv) tied++;
  return tied > 1 ? "scale" : best;
}

function markRenderResult(){
  var id = markDecide(MARKSTATE.tally), M = MARKS[id];
  var body = document.getElementById("markbody");
  var h = '<div style="color:#8a8068;font-size:11px;letter-spacing:2px;margin-bottom:10px">'
        + '오른 어깨에 문신이 발색한다</div>';
  h += '<div style="color:#ffd24a;font-size:22px;letter-spacing:4px;margin-bottom:4px">' + M.n + '</div>';
  h += '<div style="color:#c9a6ff;font-size:12px;margin-bottom:14px">' + M.sign + '</div>';
  h += '<div style="color:#e8e0d0;font-size:14px;line-height:1.8;margin-bottom:16px">「' + M.line + '」</div>';
  h += '<div style="color:#9fe2ff;font-size:12px;margin-bottom:4px">' + M.desc + '</div>';
  h += '<div style="color:#7a7060;font-size:11px;line-height:1.6;margin-bottom:16px">'
     + '이 차이는 영구 성장이 쌓이면 곧 묻힙니다. 첫 걸음의 방향일 뿐입니다.</div>';
  h += '<button class="bigbtn" onclick="markApply(\'' + id + '\')">각인을 받는다</button>';
  h += '<div style="margin-top:8px"><span style="color:#6b6046;font-size:11px;cursor:pointer" '
     + 'onclick="markStart()">다시 답하기</span></div>';
  body.innerHTML = h;
  sfx("ench");
}

function markApply(id){
  var M = MARKS[id];
  if(!M) return;
  META.mark = id;
  metaSave();
  markApplyToPlayer();
  document.getElementById("markov").style.display = "none";
  log(TX("mark.done", M.n, M.line), "#ffd24a");
  spark(P.fx, P.fy, "#ffd24a", 20, 1.6);
  sfx("lvl");
  refreshHud(); refreshChar(); refreshInv();
}

/* P 에 반영. 메타와 같은 '증분' 방식 — 레벨업이 P.mhp 를 직접 올리므로. */
function markApplyToPlayer(){
  var M = markOf();
  if(!P || !M) return;
  var want = M.hp || 0, had = P.markHpApplied || 0, d = want - had;
  if(d !== 0){
    P.mhp += d;
    P.hp = Math.max(1, Math.min(P.mhp, P.hp + Math.max(0, d)));
    P.markHpApplied = want;
  }
  P.markAtk = M.atk || 0;
  if(!P.markGiven){                 /* 시작 지급은 한 번만 */
    P.markGiven = true;
    P.gold += (M.gold || 0);
    (M.items || []).forEach(function(it){ if(ITEMS[it[0]]) addItem(it[0], it[1]); });
  }
}
