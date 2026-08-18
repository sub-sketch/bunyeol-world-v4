/* ================= v4 계시(啓示) — 런 중 문신 빌드 (집중패스 P3) =================
   층을 클리어하면 신탁이 계시 3택을 내리고, 고른 계시가 문신으로 몸에 새겨진다.
   런 한정 — 사망하면 RUN 과 함께 통째로 사라진다(RUN 은 저장되지 않는다).

   진행 순서 (기존 체인 앞에 계시가 끼어든다)
     층 전멸 → runOnFloorClear()
             → showRevelation()   계시 3택 (빌드)      ← 신규
             → showFloorReward()  물자 2택 (보급)      ← 기존
             → showNextFloor()    다음 층 워프 확인    ← 기존

   데이터: data/revelations.json -> 전역 REVELATIONS (build.py 가 var 로 주입)
   상태  : RUN.revs = { 계시id: 단계 }   단계 1 = 새김 / 2 = 심화(효과 1.5배, 최대)

   효과 배선 원칙 — 새 계산식을 만들지 않는다. 기존 지점에 revVal(id) 를 가산할 뿐이다.
     hp재생  18_update  P.hp 회복식        · 이속  07_state pMS()
     공속    07_state   pAtkMs()           · 공격력 07_state pMaxHit() (revAtk 경유)
     처형·성찬·연쇄 14_combat hitMob/killMob
     장막    24_run     runOnTravel 층 진입 쉴드 (메타 쉴드 노드와 합산)
     자비    14_combat  playerDie — 메타 '불굴' 바로 앞 (불굴과 별개로 각각 1회)
     회피 쿨·회피 반격 14c_hazard tryDash
     가시    14_combat  mobAttack 피해 적용 후
   ============================================================================ */

var REV_MAX = 2;          /* 심화 최대 단계 — 무한 스택 금지 */
var REV_DEEP_MULT = 1.5;  /* 심화 시 효과 배율 */
var REV_PICKS = 3;        /* 한 번에 제시하는 계시 수 */

function revList(){ return (typeof REVELATIONS !== "undefined" && REVELATIONS) ? REVELATIONS : []; }
function revDef(id){
  var L = revList(), i;
  for(i = 0; i < L.length; i++) if(L[i].id === id) return L[i];
  return null;
}
/* 이 계시를 몇 단으로 새겼는가. 런 밖(RUN=null)이면 언제나 0 — 사망 시 소멸이 여기서 보장된다. */
function revStage(id){
  if(!RUN || !RUN.revs) return 0;
  return RUN.revs[id] || 0;
}
function revHas(id){ return revStage(id) > 0; }
/* 효과 수치 — 안 가졌으면 0, 1단이면 기준값, 2단(심화)이면 1.5배.
   모든 배선 지점이 "가지고 있지 않으면 0" 이라는 성질에 기대므로 여기서만 판정한다. */
function revVal(id){
  var st = revStage(id);
  if(!st) return 0;
  var d = revDef(id);
  if(!d) return 0;
  return st >= 2 ? d.v * REV_DEEP_MULT : d.v;
}
/* 효과키(k) 기준 합산 — 같은 효과를 주는 계시를 여러 개 새길 수 있으므로 id 가 아니라 키로 더한다.
   (예: 「벼려진 칼끝」 +4 와 기록물 해금 「이름을 되찾은 자」 +12 를 함께 새기면 공격력 +16) */
function revSum(key){
  if(!RUN || !RUN.revs) return 0;
  var L = revList(), i, t = 0;
  for(i = 0; i < L.length; i++) if(L[i].k === key) t += revVal(L[i].id);
  return t;
}
/* 기록물 해금 — req 가 있는 계시는 기록물을 그만큼 모아야 3택 후보에 오른다 */
function revUnlocked(r){
  if(!r.req) return true;
  return (typeof loreCount === "function") && loreCount() >= r.req;
}
/* 다음 해금까지 남은 기록물 수(0이면 전부 해금) — 기록물 습득 로그에 쓴다 */
function revNextLoreReq(){
  var L = revList(), i, have = (typeof loreCount === "function") ? loreCount() : 0, best = 0;
  for(i = 0; i < L.length; i++){
    var q = L[i].req || 0;
    if(q > have && (best === 0 || q < best)) best = q;
  }
  return best ? best - have : 0;
}

/* 기록물을 주웠을 때 16_quest.js 가 부른다 — 이번 습득으로 새 계시가 열렸는지 알려 준다.
   기록물이 "읽고 끝"이 아니라 빌드 선택지를 넓히는 자원이 되게 하는 연결점이다. */
function revUnlockedByLore(){
  var have = (typeof loreCount === "function") ? loreCount() : 0;
  var L = revList(), i, opened = [];
  for(i = 0; i < L.length; i++) if(L[i].req === have) opened.push(L[i]);
  opened.forEach(function(r){
    log("★ 기록물이 " + have + "장 모였습니다 — 새 계시 <b style='color:" + r.c + "'>「" + r.n + "」</b>"
        + " <span style='color:#8a8068'>" + r.desc + "</span> 가 신탁의 선택지에 오릅니다.", "#c9a6ff");
    sfx("lvl");
  });
  if(!opened.length){
    var left = revNextLoreReq();
    if(left > 0) log("<span style='color:#6b6046'>기록물 " + left + "장을 더 모으면 새 계시가 열립니다.</span>", "#6b6046");
  }
}

/* 새긴 문신 수(심화는 같은 문신이 짙어진 것이므로 1개로 센다) */
function revCount(){
  if(!RUN || !RUN.revs) return 0;
  var k, n = 0;
  for(k in RUN.revs) if(RUN.revs[k] > 0) n++;
  return n;
}
/* 가장 많이 새긴 계열의 색 — 캐릭터 발광 오버레이에 쓴다 */
function revGlowColor(){
  if(!RUN || !RUN.revs) return null;
  var k, cnt = {}, col = {}, best = null, bestN = 0;
  for(k in RUN.revs){
    if(!RUN.revs[k]) continue;
    var d = revDef(k); if(!d) continue;
    cnt[d.line] = (cnt[d.line] || 0) + RUN.revs[k];
    col[d.line] = d.c;
    if(cnt[d.line] > bestN){ bestN = cnt[d.line]; best = d.line; }
  }
  return best ? col[best] : null;
}

/* ---------- 공격력 가산 (07_state pMaxHit 이 부른다) ----------
   벼려진 칼끝(상시) + 이어지는 참격(처치 후 2초) + 회피 반격(회피 후 1.5초).
   타이머는 RUN 에 두어 런이 끝나면 같이 사라지게 한다. */
function revAtk(){
  if(!RUN || !RUN.revs) return 0;
  var a = revSum("atk");
  if(RUN.chainT && T < RUN.chainT) a += RUN.chainV || 0;
  if(RUN.burstT && T < RUN.burstT) a += RUN.burstV || 0;
  return Math.round(a);
}
/* killMob 이 부른다 — 승리의 성찬(처치 회복) + 이어지는 참격(갱신형 버프) */
function revOnKill(){
  if(!RUN || !RUN.revs || !P) return;
  var heal = revSum("killheal");
  if(heal > 0 && P.hp < P.mhp){
    heal = Math.round(heal);
    P.hp = Math.min(P.mhp, P.hp + heal);
    floaters.push({x:P.fx, y:P.fy - 0.4, t:"+" + heal, c:"#ffd76e", t0:T});
  }
  var ch2 = revSum("chain");
  if(ch2 > 0){ RUN.chainT = T + 2; RUN.chainV = ch2; }   /* 갱신형 — 계속 잡으면 계속 유지 */
}
/* tryDash 가 부른다 — 회피 반격 */
function revOnDash(){
  if(!RUN || !RUN.revs) return;
  var b = revSum("burst");
  if(b > 0){ RUN.burstT = T + 1.5; RUN.burstV = b; }
}
/* mobAttack 이 피해를 입힌 뒤 부른다 — 가시 문신(반사) */
function revThorn(m){
  if(!RUN || !RUN.revs || !m || m.dead) return;
  var t = Math.round(revSum("thorn"));
  if(t <= 0) return;
  floaters.push({x:m.fx, y:m.fy - 0.5, t:"가시 " + t, c:"#9fe2ff", t0:T});
  hitMob(m, t, true);            /* 넉백 없음 — 반사는 밀어내지 않는다 */
}
/* playerDie 가 '불굴' 바로 앞에서 부른다 — 자비의 유예. 런 1회, 불굴과 별개. */
function revMercy(){
  if(!RUN || !RUN.revs || RUN.mercyUsed) return false;
  var pct = revSum("mercy");
  if(pct <= 0) return false;
  RUN.mercyUsed = 1;
  P.hp = Math.max(1, Math.floor(P.mhp * pct / 100));
  P.evadeT = T + 1.0;
  sfx("lvl"); shake(4, .4); spark(P.fx, P.fy, "#ffd76e", 24, 2.4);
  log("★ <b>자비의 유예</b> — 문신이 타들어가며 죽음을 미룹니다. (이번 런 1회)", "#ffd76e");
  floaters.push({x:P.fx, y:P.fy - 0.8, t:"자비!", c:"#ffd76e", t0:T, big:1});
  return true;
}

/* ---------- 이능 등급 임시 상승 (문신 3개마다 한 단계) ----------
   HUD 표기만 바꾼다 — P.lv 도 저장 데이터도 건드리지 않는다. */
function revGradeLabel(base){
  var n = revCount();
  if(n < 3) return null;
  var step = Math.floor(n / 3);
  var cur = 0, i;
  for(i = 0; i < GRADES.length; i++) if(P.lv >= GRADES[i][0]) cur = i;
  var up = Math.min(GRADES.length - 1, cur + step);
  if(up === cur) return null;
  return GRADES[up];
}

/* ---------- 계시 카드 3장 (frewov UI 재사용) ----------
   뒷면에는 **계열 문양만** 보인다. 고르면 그 계열 안에서 무작위로 하나가 뒤집혀 나온다.
   "무엇을 노릴지는 내가, 구체적으로 무엇을 받을지는 신탁이" — 빌드 방향성은 지키면서
   뽑는 재미를 얹는 구조다(전부 공개하면 메뉴 고르기가 되고, 전부 가리면 빌드가 사라진다).
   세계관상으로도 신탁은 메뉴가 아니라 어느 신께 청하느냐의 문제다. */
/* ---------- 계열 문양(각인) ----------
   프롤로그 일러스트(assets/ui/prologue_tattoo.jpg)의 어깨 각인 —— '검과 저울' —— 이
   **발광하는 선화**로 그려져 있다. 카드에도 한자 대신 같은 언어의 문양을 쓴다.
   그리는 법: 같은 path 를 두 번 긋는다. 굵고 옅게(후광) → 가늘고 밝게(심지).
   SVG 필터(feGaussianBlur)를 쓰지 않는 이유는 구형 모바일에서 비용·호환 문제가 있어서다.
   viewBox 는 32x32 고정이라 어느 크기로 넣어도 같은 비율로 나온다. */
var REV_SIGIL = {
  /* 빛 — 광륜. 둥근 후광에서 사방으로 빛살이 뻗는다 (가호·회복) */
  "빛": 'M16 9.5a6.5 6.5 0 1 0 .01 0'
      + 'M16 2.5v3.2M16 26.3v3.2M2.5 16h3.2M26.3 16h3.2'
      + 'M6.9 6.9l2.3 2.3M22.8 22.8l2.3 2.3M25.1 6.9l-2.3 2.3M9.2 22.8l-2.3 2.3',
  /* 검신 — 아래를 향한 검(일러스트의 그 검).
     ⚠ 1차 시안은 둥근 폼멜 + 휜 코등이 + 화살촉 끝이라 **닻으로 보였다**. 검신을 한 줄이 아니라
     끝으로 좁아지는 윤곽선으로 바꾸고, 폼멜을 원에서 가로막대로, 코등이를 넓고 평평하게 고쳤다. */
  "검신": 'M16 4.2v7.6'
        + 'M13.5 4.2h5'
        + 'M8.3 12.2Q16 14 23.7 12.2'
        + 'M13.4 12.5L14.7 22.6L16 27.9L17.3 22.6L18.6 12.5',
  /* 무신 — 스쳐 지나간 바람 (기동·회피).
     ⚠ 1차 시안은 시작점이 나란한 동심 호라 **와이파이 아이콘으로 보였다**. 시작점을 좌우로
     엇갈리게 밀어 대각선으로 흐르게 하고, 끝을 갈고리처럼 크게 말아 '지나간 자취'로 만들었다. */
  "무신": 'M4.2 9.6Q13 6.2 19.4 8.3q3.6 1.1 1.5 3.8'
        + 'M7.6 15.6Q16.4 12.5 22.9 14.7q3.2 1.1 1.3 3.6'
        + 'M11.2 21.5Q18.2 19.2 22.6 20.7',
  /* 물자 — 봉인. 무엇이 들었는지 모르는 꾸러미 (물자 카드 뒷면) */
  "물자": 'M16 4.2a11.8 11.8 0 1 0 .01 0'
        + 'M16 10.4L21.6 16L16 21.6L10.4 16Z',
  /* 계시 — 프롤로그 첫 장면의 그 별. 네 갈래 성휘와 가는 장광선 (신탁) */
  "계시": 'M16 2.6L18 13.4L28.8 16L18 18.6L16 29.4L14 18.6L3.2 16L14 13.4Z'
        + 'M8.4 8.4l3 3M23.6 23.6l-3-3M23.6 8.4l-3 3M8.4 23.6l3-3'
};
/* 문양 SVG 문자열. col 을 주면 그 색으로, 안 주면 currentColor 를 따른다. */
function revSigilSVG(line, size, col){
  var d = REV_SIGIL[line];
  if(!d) return "";
  var c = col || "currentColor", s = size || 32;
  return '<svg class="rsig" viewBox="0 0 32 32" width="' + s + '" height="' + s + '" aria-hidden="true">'
       + '<g fill="none" stroke="' + c + '" stroke-linecap="round" stroke-linejoin="round">'
       + '<path d="' + d + '" stroke-width="3.6" opacity="0.26"/>'   /* 후광 */
       + '<path d="' + d + '" stroke-width="1.5"/>'                  /* 심지 */
       + '</g></svg>';
}

var REV_LINES = [
  {line:"빛",   tag:"유지 · 회복",  c:"#ffd76e"},
  {line:"검신", tag:"공격",        c:"#ff9a6a"},
  {line:"무신", tag:"기동 · 회피",  c:"#9fe2ff"},
  {line:"계시", tag:"기록물의 끝",  c:"#c9a6ff"}
];
var REV_FLIP = 125;    /* 플립 반주기(ms) — 왕복 0.25초 */
var REV_READ = 620;    /* 뒤집힌 결과를 읽을 시간(ms) */

/* 아직 뽑을 수 있는 계시를 계열별로 모은다(최대 단계 도달분·기록물 미해금분 제외) */
function revPoolByLine(){
  var out = {}, L = revList(), i;
  for(i = 0; i < L.length; i++){
    var r = L[i];
    if(revStage(r.id) >= REV_MAX || !revUnlocked(r)) continue;
    (out[r.line] = out[r.line] || []).push(r);
  }
  return out;
}
function showRevelation(){
  if(!runActive() || deadFlag) return;
  var pools = revPoolByLine();
  var avail = REV_LINES.filter(function(d){ return pools[d.line] && pools[d.line].length; });
  if(!avail.length){ setTimeout(showFloorReward, 300); return; }   /* 전부 최대 — 물자로 넘어간다 */
  /* 계열을 섞어 최대 3장. 남은 계열이 3개 미만이면 있는 만큼만 깐다. */
  var picks = avail.slice(), i, j, t;
  for(i = picks.length - 1; i > 0; i--){ j = Math.floor(Math.random() * (i + 1)); t = picks[i]; picks[i] = picks[j]; picks[j] = t; }
  picks = picks.slice(0, REV_PICKS);
  RUN._revCards = picks.map(function(d){ return d.line; });   /* 검증·디버그용 */
  RUN._revBusy = 0;

  var h = '<div style="color:#6b6046;font-size:10px;margin-bottom:2px">한 장을 고른다</div><div class="rcrow">';
  picks.forEach(function(d){
    h += '<button class="rcard" id="rc_' + d.line + '" style="border-color:' + d.c + ';color:' + d.c + '" '
       + 'onclick="pickRevLine(\'' + d.line + '\')">'
       + '<span class="rcsym">' + revSigilSVG(d.line, 54, d.c) + '</span>'
       + '</button>';
  });
  h += '</div>';
  revTitle("계 시", "#c9a6ff");
  document.getElementById("frewbody").innerHTML = h;
  document.getElementById("frewov").style.display = "block";
  sfx("lvl");
}
/* 계열 카드를 고르면 — 그 계열 안에서 무작위로 하나를 뽑아 뒤집어 보여 준다 */
function pickRevLine(line){
  if(!RUN || RUN._revBusy) return;
  RUN._revBusy = 1;
  var pool = revPoolByLine()[line] || [];
  if(!pool.length){ RUN._revBusy = 0; return; }
  var r = pool[Math.floor(Math.random() * pool.length)];
  var el = document.getElementById("rc_" + line);
  var others = document.querySelectorAll("#frewbody .rcard");
  var k;
  for(k = 0; k < others.length; k++) if(others[k] !== el) others[k].classList.add("dim");
  if(!el){ pickRevelation(r.id); return; }

  sfx("pot");
  el.classList.add("flip");                     /* 접힌다 */
  setTimeout(function(){
    var st = revStage(r.id);
    el.style.borderColor = r.c; el.style.color = r.c;
    el.innerHTML = '<span class="rcsym">' + revSigilSVG(r.line, 22, r.c) + '</span>'
                 + '<span class="rcname">「' + r.n + '」</span>'
                 + '<span class="rcdesc">' + r.desc + '</span>'
                 + (st >= 1 ? '<span class="rctag" style="color:#ffd24a">심화 — 1.5배로 짙어진다</span>'
                            : '<span class="rctag" style="color:#8a8068">〈' + r.line + '〉</span>');
    el.classList.remove("flip");                /* 펴진다 = 공개 */
    el.classList.add("done");
    setTimeout(function(){ pickRevelation(r.id); }, REV_READ);
  }, REV_FLIP);
}

/* frewov 는 계시·물자·워프가 함께 쓰는 창이라 제목을 그때그때 바꿔 준다 */
function revTitle(txt, col){
  var e = document.getElementById("frewtitle");
  if(!e) return;
  e.textContent = txt;
  e.style.color = col || "#ffd24a";
}

function pickRevelation(id){
  var r = revDef(id);
  document.getElementById("frewov").style.display = "none";
  if(r && RUN){
    RUN.revs = RUN.revs || {};
    var st = Math.min(REV_MAX, (RUN.revs[id] || 0) + 1);
    RUN.revs[id] = st;
    /* 새김 연출 — 계열색 스파크 + 발광 링(revDraw 가 그린다) */
    RUN.revFxT = T; RUN.revFxC = r.c;
    sfx("buff"); shake(2.4, .3);
    spark(P.fx, P.fy, r.c, 26, 2.2);
    log("문신이 새겨집니다 — <b style='color:" + r.c + "'>「" + r.n + "」</b>"
        + (st >= 2 ? " <span style='color:#ffd24a'>(심화)</span>" : "")
        + " <span style='color:#8a8068'>" + r.desc + "</span>", r.c);
    var g = revGradeLabel();
    if(g) log("문신이 " + revCount() + "개 — 이능의 결이 <b style='color:" + g[2] + "'>" + g[1] + "</b> 수준으로 짙어집니다. (런 한정)", "#c9a6ff");
  }
  refreshHud(); refreshChar();
  setTimeout(showFloorReward, 500);   /* 계시(빌드) 다음 — 물자(보급) 2택 */
}

/* ---------- 새김 순간 발광 링 (render 가 부른다) ---------- */
function revDraw(){
  if(!RUN || !RUN.revFxT) return;
  var el = T - RUN.revFxT;
  if(el < 0 || el > 0.7) return;
  var s = toScreen(P.fx, P.fy), k = el / 0.7;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = RUN.revFxC || "#ffd76e";
  ctx.globalAlpha = (1 - k) * 0.75;
  ctx.lineWidth = 2;
  var rr = 6 + k * 26;
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 8, rr, rr * 0.5, 0, 0, 6.283); ctx.stroke();
  ctx.globalAlpha = (1 - k) * 0.4;
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, rr * 0.8, rr * 0.4, 0, 0, 6.283); ctx.stroke();
  ctx.restore();
}
/* ---------- 문신 2개마다 캐릭터 미세 발광 (drawKnightSheet 뒤에 부른다) ---------- */
function revGlow(sx, sy){
  var n = revCount();
  if(n < 2) return;
  var c = revGlowColor();
  if(!c) return;
  var lv = Math.min(3, Math.floor(n / 2));            /* 2개=1단, 4개=2단, 6개=3단 */
  var pulse = 0.5 + 0.5 * Math.sin(T * 2.6);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.15 * (0.7 + 0.3 * pulse);       /* 과하지 않게 — 상한 0.15 */
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.5;
  var i;
  for(i = 0; i < lv; i++){
    var rr = 10 + i * 4;
    ctx.beginPath(); ctx.ellipse(sx, sy - 10, rr, rr * 0.62, 0, 0, 6.283); ctx.stroke();
  }
  ctx.restore();
}
/* ---------- HUD 버프줄 문신 아이콘 (refreshHud 가 부른다) ---------- */
function revIcons(bicon){
  if(!RUN || !RUN.revs) return;
  var L = revList(), i;
  for(i = 0; i < L.length; i++){
    var r = L[i], st = RUN.revs[r.id] || 0;
    if(!st) continue;
    bicon("rev_" + r.id, "「" + r.n + "」" + (st >= 2 ? " 심화" : "") + " — " + r.desc,
          null, r.c, null, revSigilSVG(r.line, 16, r.c));
  }
}
