/* ================= v4 로그라이트 — 런(Run) =================
   Phase R1 최소판. 기존 던전을 그대로 쓴다. 신규 지역·아트 0.

   코어 루프
     마을 → [던전 진입] → 층 진행 → 사망/클리어 → 정산 → 마을 → 메타 상점 → 재진입

   런 상태는 **저장하지 않는다.** 죽으면 사라진다.
   남는 것은 META(업적포인트·구매 내역)뿐이다. 세이브 로직이 오히려 단순해진다.

   층(Floor) — R1 에서는 기존 던전 존을 층으로 읽는다.
     zone 3 = 1층 / zone 4 = 2층 / zone 5 = 3층
   R2 에서 층 패턴 구조로 교체된다. 그때 FLOOR_OF 만 갈아끼우면 된다.
   ============================================================================ */
/* ================= 부(ACT) 체계 — R19a =================
   예전엔 여기에 `FLOOR_OF = {1:1,...,5:5}` 가 상수로 박혀 있어 "5층 단일 던전"이 전제였다.
   확장팩(2부 대륙·마경지대)을 붙이려면 이 전제를 풀어야 한다.
   이제 data/acts.json 의 ACTS 에서 파생한다 — 팩은 그 배열에 항목만 추가하면 된다.

   ★ 아래 FLOOR_OF / FLOOR_FAM / RUN_ENTRY 는 **이름을 그대로 유지**한다.
     18_update.js·19_render.js·24b_feats.js 등 6곳이 이 이름을 쓰고 있고, 그 코드는
     `FLOOR_OF[a] > FLOOR_OF[b]` 식 비교라 층이 몇 개든 그대로 옳게 동작한다.
     이름을 바꾸면 멀쩡한 코드를 건드려야 하므로 파생 결과만 갈아 끼운다.
   ★ 소유하지 않은 팩의 부는 애초에 합치지 않는다 — 존 자체가 없으므로 문도 안 열린다. */
function actOwned(a){
  if(!a || a.pack === "base") return true;
  if(typeof PACK_OWNED === "undefined") return false;
  return !!PACK_OWNED[a.pack];
}
/* 그 부가 해금됐는가 — 선행 부의 clearFlag 가 META 에 있어야 한다 */
function actUnlocked(a){
  if(!actOwned(a)) return false;
  if(!a.req) return true;
  return !!(typeof META !== "undefined" && META && META[a.req]);
}
function actList(){ return (typeof ACTS !== "undefined" && ACTS) ? ACTS.filter(actOwned) : []; }
/* 층번호 -> 부 */
function actOfFloor(f){
  var l = actList(), i;
  for(i = 0; i < l.length; i++) if(l[i].floors[f] !== undefined) return l[i];
  return null;
}
/* 존번호 -> 부 */
function actOfZone(z){
  var l = actList(), i, k;
  for(i = 0; i < l.length; i++) for(k in l[i].floors) if(l[i].floors[k] === z) return l[i];
  return null;
}
/* 이 층이 자기 부의 보스층인가 — 예전 `f === 5` 하드코딩을 대체한다 */
function isActBoss(f){ var a = actOfFloor(f); return !!(a && a.boss === f); }
/* 마지막 부의 보스층인가 — 여기까지 깨면 더 내려갈 곳이 없다 */
function isFinalBoss(f){
  if(!isActBoss(f)) return false;
  return !nextAct(actOfFloor(f));
}
/* 다음 부 — 소유·해금 조건을 통과한 것만 */
function nextAct(a){
  if(!a) return null;
  var l = actList(), i;
  for(i = 0; i < l.length; i++) if(l[i].req === a.clearFlag && actUnlocked(l[i])) return l[i];
  return null;
}
/* ACTS -> 기존 상수 3종 파생 */
var FLOOR_OF = {}, FLOOR_FAM = {}, RUN_ENTRY = {z:1, x:2, y:8};
(function buildActMaps(){
  var l = actList(), i, k;
  for(i = 0; i < l.length; i++){
    for(k in l[i].floors) FLOOR_OF[l[i].floors[k]] = parseInt(k, 10);   /* 존 -> 층 */
    for(k in (l[i].fam || {})) FLOOR_FAM[parseInt(k, 10)] = l[i].fam[k];
  }
  if(l.length && l[0].entry) RUN_ENTRY = l[0].entry;                    /* 첫 부의 진입점 */
})();
/* 층 계열 조회 — 예전엔 `FLOOR_FAM[Math.min(5, f+1)]` 로 5를 박아 놨다.
   이제 있는 층까지만 보고, 없으면 그 부의 마지막 계열로 떨어진다. */
function floorFam(f){
  if(FLOOR_FAM[f]) return FLOOR_FAM[f];
  var a = actOfFloor(f) || actOfFloor(f - 1);
  if(a && a.fam && a.fam[a.boss]) return a.fam[a.boss];
  return "undead";
}

var RUN = null;

function runActive(){ return !!(RUN && RUN.live); }

/* 런마다 던전을 새것으로 되돌린다.
   로그라이트에서 "지난 런에 잡아 둔 몹이 아직 죽어 있는" 상태는 루프를 망친다.
   R1 은 기존 존을 재사용하므로 몹만 되살린다. R2 에서 층 패턴 재생성으로 대체된다. */
function runResetFloors(){
  var z;
  for(z in FLOOR_OF){
    var W = world[z];
    if(!W) continue;
    W.mobs.forEach(function(m){
      m.dead = false; m.hp = m.d.hp; m.rt = 0;
      m.fx = m.hx; m.fy = m.hy;
      m.tgt = null; m.stun = 0; m.slow = 0; m.prov = false;
      m.tdmg = 0; m.pdmg = 0; m.lh = -9; m.na = 0;
    });
    (W.fnpc || []).forEach(function(n){
      n.dead = false; n.hp = n.mhp; n.tgt = null; n.betrayAt = 0;
    });
  }
}

/* ---------- 층 보상 2택 (계획서 v3 §4) ----------
   층을 전멸시키면 하나를 고른다. 즉시성 보상 vs 투자성 보상. */
/* ⚠ 여기 있던 `var FLOOR_FAM = {1:"wild",...}` 는 제거했다 — 위(부 체계)에서 ACTS 로부터
   파생하는데, 이 줄이 나중에 실행되며 그 결과를 **통째로 덮어썼다**. 지금은 값이 같아
   증상이 없지만 팩이 6~10층을 추가하면 그 층들의 계열이 사라진다. 층 계열은 floorFam() 으로 조회한다. */

var FLOOR_REWARDS = [
  {id:"heal", n:"전열 정비",   desc:"HP 전부 회복 + 체력 물약 2",
   f:function(){ P.hp = P.mhp; addItem("hpot", 2); }},
  /* P4 수급 조정(집중패스): 계시(문신)가 층당 메인 보상이 되었으므로 물자 쪽 은화를 140->120 으로 낮춘다.
     은화는 런 안에서만 쓰는 자원이고(정산 때 0으로 사라진다) 상인·제단이 주 소비처다.
     체감이 빡빡하면 이 줄의 120 두 곳만 140 으로 되돌리면 원복된다. */
  {id:"gold", n:"전리품 자루", desc:"은화 120",
   f:function(){ P.gold += 120; runOnGold(120); sfx("gold"); }},
  {id:"wsc",  n:"무기 각인서", desc:"무기 강화 주문서 1장",
   f:function(){ addItem("wscroll", 1); }},
  {id:"atk",  n:"전의(戰意)",  desc:"이 런이 끝날 때까지 공격 +3",
   f:function(){ var cur = (P.buffs.bd && T < P.buffs.bd.t) ? P.buffs.bd.v : 0;
     P.buffs.bd = {v:cur + 3, t:T + 99999, n:"전의"}; refreshChar(); }},
  {id:"fam",  n:"특효 무기",   desc:"다음 층의 적에게 잘 드는 무기",
   f:function(){ var nf = floorFam((RUN ? RUN.floor : 1) + 1);
     var wk = (RUN && RUN.floor >= 3) ? "katana" : "longsw";
     addItem(wk, 1, 0, {f:nf, b:ri(9, 12), m:2}); }}
];

/* ---------- 물자 보상 — 완전 뒷면 카드 ----------
   계시와 달리 물자는 전략층이 아니라 보급이라(회복/은화/주문서/전의/특효무기 중 무엇이 와도
   런이 크게 갈리지 않는다) 정보를 가려도 잃는 게 없고 뒤집는 재미만 남는다.
   그래서 계시는 '계열만 공개', 물자는 '완전 비공개'로 성격을 다르게 뒀다. */
var FREW_FLIP = 125, FREW_READ = 620;
function showFloorReward(){
  if(!runActive() || deadFlag) return;
  var pool = FLOOR_REWARDS.slice(), picks = [];
  var nPick = metaOwned("eye3") ? 3 : 2;          /* 메타: 눈썰미 */
  while(picks.length < nPick && pool.length)
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  RUN._frew = picks.map(function(r){ return r.id; });   /* 검증·디버그용 */
  RUN._frewBusy = 0;

  var h = '<div style="color:#6b6046;font-size:10px;margin-bottom:2px">한 장을 집는다</div><div class="rcrow">';
  picks.forEach(function(r, i){
    h += '<button class="rcard" id="fc_' + i + '" onclick="pickFloorCard(' + i + ')">'
       + '<span class="rcsym">' + revSigilSVG("물자", 54, "#c9a227") + '</span></button>';
  });
  h += '</div>';
  if(typeof revTitle === "function") revTitle("층 정 리", "#ffd24a");
  document.getElementById("frewbody").innerHTML = h;
  document.getElementById("frewov").style.display = "block";
  sfx("lvl");
}
/* 카드를 고르면 뒤집어 내용을 보여 준 뒤 적용한다 */
function pickFloorCard(i){
  if(!RUN || RUN._frewBusy) return;
  var id = (RUN._frew || [])[i];
  var r = FLOOR_REWARDS.filter(function(x){ return x.id === id; })[0];
  if(!r) return;
  RUN._frewBusy = 1;
  var el = document.getElementById("fc_" + i);
  var all = document.querySelectorAll("#frewbody .rcard"), k;
  for(k = 0; k < all.length; k++) if(all[k] !== el) all[k].classList.add("dim");
  if(!el){ pickFloorReward(id); return; }
  sfx("pot");
  el.classList.add("flip");
  setTimeout(function(){
    el.style.borderColor = "#ffd24a"; el.style.color = "#ffd24a";
    el.innerHTML = '<span class="rcname">' + r.n + '</span>'
                 + '<span class="rcdesc">' + r.desc + '</span>';
    el.classList.remove("flip");
    el.classList.add("done");
    setTimeout(function(){ pickFloorReward(id); }, FREW_READ);
  }, FREW_FLIP);
}
function pickFloorReward(id){
  var r = FLOOR_REWARDS.filter(function(x){ return x.id === id; })[0];
  document.getElementById("frewov").style.display = "none";
  if(r){ r.f(); log("층 보상 — <b>" + r.n + "</b>", "#ffd24a"); }
  refreshHud(); refreshInv();
  setTimeout(showNextFloor, 500);      /* 보상 다음 — 다음 층 이동 확인 (일방향 진행) */
}

/* killMob 이 부른다 — 층 전멸 순간 1회 */
/* 다음 층 워프 목적지 — gates 에서 위층으로 가는 문의 도착 좌표를 쓴다 */
function nextFloorDest(z){
  var f = FLOOR_OF[z], g, i, gs = ZONES[z].gates || [];
  if(!f) return null;
  for(i = 0; i < gs.length; i++){
    g = gs[i];
    if(FLOOR_OF[g.to] === f + 1) return {z:g.to, x:g.tx, y:g.ty, label:g.label};
  }
  return null;
}
function showNextFloor(){
  if(!runActive() || deadFlag) return;
  var nd = nextFloorDest(curZ);
  if(!nd) return;
  var h = '<div style="color:#8a8068;font-size:11px;margin-bottom:10px">층을 정리했다 — 길은 앞으로만 이어진다</div>'
        + '<button class="bigbtn" style="display:block;width:100%;margin:6px 0;padding:9px 12px" onclick="goNextFloor()">'
        + '<b>다음 층으로 이동</b><br><span style="font-size:11px;color:#9a8f6a;letter-spacing:0">' + nd.label + '</span></button>'
        + '<button class="ib" style="margin-top:4px" onclick="document.getElementById(\'frewov\').style.display=\'none\'">'
        + '이 층에 더 머문다 (상인·상자 정리)</button>';
  if(typeof revTitle === "function") revTitle("다 음 층", "#9fe2ff");
  document.getElementById("frewbody").innerHTML = h;
  document.getElementById("frewov").style.display = "block";
}
function goNextFloor(){
  var nd = nextFloorDest(curZ);
  document.getElementById("frewov").style.display = "none";
  if(!nd) return;
  sfx("port"); spark(P.fx, P.fy, "#9fe2ff", 20, 2.2);
  travel(nd.z, nd.x, nd.y);
  log("빛이 감싸며 다음 층으로 이동했습니다.", "#9fe2ff");
}
/* ---------- 계열 해금 알림 (R19a, 대표님 지시) ----------
   1부를 처음 깨면 정령마법사·마도학자가 열린다. 예전에는 로그 한 줄뿐이라 지나치기 쉬웠다 —
   두 계열을 카드로 보여 주고, **새 캐릭터를 만들 때** 고를 수 있다는 걸 못박는다.
   런 상태(레벨·계시)는 캐릭터에 묶여 있어 지금 갈아탈 수는 없다. 그 점을 문구로 분명히 한다.
   ★ 알림을 닫으면 이어서 갈림길(정산/더 깊이)이 뜬다 — 순서: 해금 알림 → 갈림길. */
var RUN_UNLOCK_AFTER = null;
function showClassUnlock(after){
  if(typeof CLS === "undefined"){ if(after) after(); return; }
  var news = [], ck;
  for(ck in CLS) if(ck !== "k") news.push(ck);
  if(!news.length){ if(after) after(); return; }
  RUN_UNLOCK_AFTER = after || null;
  var h = '<div style="color:#ffd24a;font-size:12px;margin-bottom:2px">봉인이 풀렸다</div>'
        + '<div style="color:#8a8068;font-size:11px;margin-bottom:8px">'
        + '두 계열의 계시가 열렸다 — <b>새 캐릭터를 만들 때</b> 고를 수 있다</div><div class="rcrow">';
  news.forEach(function(k){
    var C = CLS[k], col = (k === "e") ? "#7fe2c9" : "#a8b4ff";
    h += '<button class="rcard" style="border-color:' + col + ';cursor:default;padding:8px 6px">'
       + '<span class="rcname" style="color:' + col + '">' + C.n + '</span>'
       + '<span class="rcdesc">' + C.desc + '</span>'
       + '<span class="rctag" style="color:#6b6046">HP ' + C.hp + ' · MP ' + C.mp + ' · '
       + (C.rng > 2 ? '원거리 ' + C.rng.toFixed(1) : '근접') + '</span></button>';
  });
  h += '</div><div style="color:#6b6046;font-size:10px;margin-top:6px">'
     + '지금 캐릭터는 이 런을 계속한다. 계열 변경은 새 캐릭터 생성부터.</div>'
     + '<button class="bigbtn" style="display:block;width:100%;margin:8px 0 0;padding:8px 12px" '
     + 'onclick="closeClassUnlock()"><b>알겠다</b></button>';
  if(typeof revTitle === "function") revTitle("계 열 해 금", "#ffd24a");
  document.getElementById("frewbody").innerHTML = h;
  document.getElementById("frewov").style.display = "block";
  sfx("lvl");
  if(typeof buildClassCards === "function") try{ buildClassCards(); }catch(e){}   /* 타이틀 카드도 갱신 */
}
function closeClassUnlock(){
  document.getElementById("frewov").style.display = "none";
  var fn = RUN_UNLOCK_AFTER; RUN_UNLOCK_AFTER = null;
  if(fn) setTimeout(fn, 260);
}

/* ---------- 부 보스를 깬 뒤 — 정산이냐 더 깊이냐 (R19a) ----------
   후속부를 그냥 이어 붙이면 한 런이 두 배로 길어진다(5층 완주가 이미 한 판이다).
   그래서 보스를 깬 시점에 **플레이어가 런 길이를 정한다** — 여기서 끊고 정산하거나,
   레벨·계시·은화를 그대로 안고 다음 부로 계속 내려간다.
   ★ 다음 부가 없거나(마지막 보스) 미소유·미해금이면 이 창은 뜨지 않고 예전처럼 정산이다. */
function showActChoice(){
  if(!runActive() || deadFlag) return;
  var act = actOfFloor(FLOOR_OF[curZ]), nx = nextAct(act);
  if(!nx) return;
  var nf = nx.floors[String(nx.boss)] !== undefined ? null : null;   /* 표시용 계산은 아래에서 */
  var firstFloor = null, k;
  for(k in nx.floors){ if(firstFloor === null || parseInt(k,10) < firstFloor) firstFloor = parseInt(k,10); }
  var h = '<div style="color:#8a8068;font-size:11px;margin-bottom:10px">'
        + '<b>' + act.n + '</b> 를 끝냈다 — 여기서 돌아갈 수도, 더 내려갈 수도 있다</div>'
        + '<button class="bigbtn" style="display:block;width:100%;margin:6px 0;padding:9px 12px" onclick="actGoDeeper()">'
        + '<b>더 깊이 내려간다</b><br><span style="font-size:11px;color:#9a8f6a;letter-spacing:0">'
        + nx.n + ' · ' + firstFloor + '층부터 · 지금 상태를 그대로 안고 간다</span></button>'
        + '<button class="bigbtn" style="display:block;width:100%;margin:6px 0;padding:9px 12px;border-color:#6b6046" onclick="actSettleHere()">'
        + '<b>여기서 정산하고 돌아간다</b><br><span style="font-size:11px;color:#7a7060;letter-spacing:0">'
        + '업적포인트를 챙기고 마을로. 다음 런에 다시 도전할 수 있다</span></button>';
  if(typeof revTitle === "function") revTitle("갈 림 길", "#c9a6ff");
  document.getElementById("frewbody").innerHTML = h;
  document.getElementById("frewov").style.display = "block";
  sfx("lvl");
}
function actGoDeeper(){
  document.getElementById("frewov").style.display = "none";
  var act = actOfFloor(FLOOR_OF[curZ]), nx = nextAct(act);
  if(!nx || !nx.entry) return;
  sfx("port"); spark(P.fx, P.fy, "#c9a6ff", 24, 2.4);
  log("── <b>" + nx.n + "</b> ──", "#c9a6ff");
  travel(nx.entry.z, nx.entry.x, nx.entry.y);
}
function actSettleHere(){
  document.getElementById("frewov").style.display = "none";
  runEnd("clear");
}

function runOnFloorClear(){
  if(!runActive()) return;
  var f = FLOOR_OF[curZ];
  /* R17 업적 — 이 층을 한 대도 안 맞고 정리했는가. 층당 한 번만 센다.
     이 함수는 마지막 한 마리를 잡을 때마다 다시 불릴 수 있어(killMob 에서 호출)
     아래 RUN.rew 처럼 층 단위 가드를 따로 둔다. 보스층(f>=5)도 세야 하므로
     조기 return 보다 위에 놓는다. */
  RUN._nhSeen = RUN._nhSeen || {};
  if(f && !RUN._nhSeen[curZ]){
    RUN._nhSeen[curZ] = 1;
    if(RUN.noHitFloor) RUN.noHitCount = (RUN.noHitCount || 0) + 1;
  }
  /* 부 클리어 — 그 부의 보스층을 정리하면 영구 기록.
     R19a: 예전엔 `f === 5` 로 5층만 인정했다. 이제 각 부가 자기 boss 층을 선언한다. */
  var act = actOfFloor(f), firstClear = false;
  if(act && act.boss === f && typeof META !== "undefined" && !META[act.clearFlag]){
    META[act.clearFlag] = 1; metaSave();
    firstClear = true;
    log("── <b>" + act.n + " 클리어!</b> ──", "#ffd24a");
    var nx0 = nextAct(act);
    if(nx0) log("<b>" + nx0.n + "</b> 로 가는 길이 열렸습니다.", "#c9a6ff");
  }
  if(!f) return;
  /* 보스층 — 층 보상 대신 '정산하고 돌아가기 / 더 깊이' 선택을 띄운다.
     ★ 1부를 처음 깬 판이라면 그 앞에 계열 해금 알림을 먼저 보여 준다(대표님 지시).
       다음 부가 없으면(마지막 보스) 갈림길 없이 예전처럼 정산이 보상이다. */
  if(act && act.boss === f){
    RUN.rew = RUN.rew || {};
    if(RUN.rew[curZ]) return;
    RUN.rew[curZ] = 1;
    var deeper = nextAct(act) ? showActChoice : null;
    if(firstClear && act.clearFlag === "clear1" && typeof showClassUnlock === "function")
      setTimeout(function(){ showClassUnlock(deeper); }, 700);
    else if(deeper) setTimeout(deeper, 700);
    /* R32 — 마지막 부의 보스층에는 갈림길이 없다. 여기서 런을 정산으로 끝낸다.
       예전엔 killMob 이 보스 처치 900ms 뒤 무조건 runEnd("clear") 를 걸었는데, 그러면
       ① 다음 부가 있어도 정산창이 갈림길을 덮었고
       ② 잡몹을 남기고 보스만 먼저 잡으면 이 함수가 아예 호출되지 않아 clearFlag 가 안 남았다.
       이제 "층이 실제로 정리되었을 때"만 이 함수가 돌고, 그 안에서 기록과 종료를 함께 처리한다.
       마지막 일격이 보스든 잡몹이든 상관없이 동작한다.

       R32 T-P1-1 — 마지막 부를 **처음** 깬 판이면 정산 앞에 엔딩을 재생한다.
       firstClear 는 위에서 META[clearFlag] 를 이번에 처음 세웠을 때만 참이다(재클리어는 바로 정산).
       playEnding() 은 재생하지 못한 경우에도 콜백을 부르도록 만들어 두었으므로 여기서 멈출 일은 없다. */
    else setTimeout(function(){
      /* '엔딩을 볼 자격'은 층을 정리한 시점에 확정된다 — 아래 900ms 사이에 무슨 일이 있어도
         타이틀의 '엔딩 감상'은 열어 둔다(그 900ms 안에 남은 잡몹에게 죽는 희귀한 경우에도
         엔딩을 영구히 놓치지 않게. 층 열림은 전멸이 아니라 75%+두목 처치라 잡몹이 남을 수 있다). */
      if(firstClear && typeof META !== "undefined"){
        META.endSeen = 1; if(typeof metaSave === "function") metaSave();
      }
      /* 재생은 런이 아직 살아 있을 때만 — 이미 사망 정산이 떴다면 그 위에 엔딩을 덮지 않는다. */
      if(firstClear && runActive() && typeof playEnding === "function")
        playEnding(function(){ runEnd("clear"); });
      else
        runEnd("clear");                       /* 런이 이미 끝났으면 runEnd 가 스스로 무시한다 */
    }, 900);
    return;
  }
  RUN.rew = RUN.rew || {};
  if(RUN.rew[curZ]) return;
  RUN.rew[curZ] = 1;
  /* 계시(빌드) → 물자(보급) → 다음 층 워프 순. 계시가 먼저 뜨고, 고른 뒤 물자 2택으로 이어진다.
     계시 모듈이 없으면(구버전 폴백) 기존처럼 물자 보상부터 띄운다. */
  setTimeout(typeof showRevelation === "function" ? showRevelation : showFloorReward, 650);
}

/* 층 클리어 조건 (계획서 v3 §3, R13 완화)
   예전에는 **존의 몹 전멸**을 요구했다. 그러다 보니 매 층 구석의 마지막 한 마리까지 찾아 죽이는
   전수 사냥이 강제돼 "층마다 같은 반복 작업"이 되고 난이도가 소모전으로 흘렀다(대표님 지적).
   이제 목표 처치 비율만 채우면 열린다 — 남은 몹을 더 잡을지 그냥 넘어갈지는 플레이어가 고른다.
   단, **보스·엘리트(mini)는 예외 없이 처치해야 한다** — 안 그러면 보스를 건너뛰고
   5층 클리어(META.clear1)가 인정되는 구멍이 생긴다. */
var FLOOR_CLEAR_RATIO = 0.75;
function floorNeed(z){ return Math.ceil(z.mobs.length * FLOOR_CLEAR_RATIO); }
function floorCleared(z){
  var i, dead = 0, bigAlive = false;
  for(i = 0; i < z.mobs.length; i++){
    var m = z.mobs[i];
    if(m.dead) dead++;
    else if(m.d.boss || m.d.mini) bigAlive = true;
  }
  if(bigAlive) return false;
  return dead >= floorNeed(z);
}
/* 문에 표시할 "앞으로 몇 마리" — 남은 전체가 아니라 조건 달성까지 필요한 수 */
function floorLeft(z){
  var i, dead = 0, big = 0;
  for(i = 0; i < z.mobs.length; i++){
    var m = z.mobs[i];
    if(m.dead) dead++;
    else if(m.d.boss || m.d.mini) big++;
  }
  return Math.max(big, Math.max(0, floorNeed(z) - dead));
}

/* 런 상태 초기화 — 이동 없이 상태만. (차원문·도보 진입이 공유한다) */
function runBegin(){
  RUN = {
    live: true,
    t0: T,
    floor: 1,
    maxFloor: 1,
    kills: 0,
    dmgTaken: 0,
    goldEarned: 0,
    noHitFloor: true,        /* 이번 층에서 아직 안 맞았는가 — 업적용 */
    noHitCount: 0,           /* 무결하게 정리한 층 수 (R17 업적 nohit1/nohit3) */
    achieved: [],            /* 이번 런에 딴 업적 id */
    /* 계시(문신) — 런 한정 빌드. RUN 은 저장되지 않으므로 사망 시 통째로 소멸한다. */
    revs: {},                /* 계시id -> 단계(1 새김 / 2 심화) */
    chainT: 0, chainV: 0,    /* 이어지는 참격 — 처치 후 2초 공격력 버프 */
    burstT: 0, burstV: 0,    /* 회피 반격 — 회피 후 1.5초 공격력 버프 */
    mercyUsed: 0,            /* 자비의 유예 — 런 1회 */
    /* R26 플레이 기록 — 층별 타임라인·물약 사용 수(29_report.js 가 채운다) */
    potsUsed: 0,
    floors: []
  };
  /* ★ R31 — 마을에서 들고 들어간 은화를 적어 둔다.
     대표 리포트: "1스테이지 클리어하고 서대륙 넘어오니깐 골드가 0이 되버리는 문제".
     원래 규칙은 "런에서 번 은화는 정산 때 사라진다"(긴장 요소)였는데, 코드가 **지갑 전체**를 0으로 밀어
     마을에서 모아 둔 돈까지 함께 사라졌다. 이제 **가져간 만큼은 돌려준다**(던전에서 쓴 것은 차감). */
  RUN.goldIn = P.gold;
  /* 런 시작 = 소모품·상태 초기화. 마을 축복은 들고 들어갈 수 있게 남긴다. */
  dotClear();
  P.hp = P.mhp; P.mp = P.mmp;
  /* 메타: 저울 시작 자원 */
  var g0 = 100 * metaLv("gold0");
  if(g0 > 0){ P.gold += g0; log("노잣돈 — 은화 " + g0 + "개를 챙겨 들어갑니다.", "#f5c542"); }
  if(metaOwned("potbag")){ addItem("hpot", 3); log("물약 가방 — 체력 물약 +3", "#8fd18f"); }
  /* 런당 상인·제단이 나올 층을 미리 정해 둔다 (같은 층엔 안 겹침) */
  var mch = metaOwned("merchant") ? 0.9 : 0.45;
  RUN.merchF = ch(mch) ? ri(2, 4) : 0;
  RUN.altarF = ch(0.55) ? ri(2, 5) : 0;
  if(RUN.altarF && RUN.altarF === RUN.merchF) RUN.altarF = (RUN.altarF % 4) + 2;
  RUN.feats = [];
  runResetFloors();
  log("── <b>런 시작</b> ── 죽어도 업적포인트는 남습니다.", "#ffd27a");
  sfx("port");
  refreshHud();
}

function runStart(){
  if(runActive()) return false;
  runBegin();
  travel(RUN_ENTRY.z, RUN_ENTRY.x, RUN_ENTRY.y);
  return true;
}
/* ================= R27 워프 관리자 =================
   대표 지시: "클리어한곳은 넘어갈수있는 워프 관리자 필요한듯 오른쪽에 메뉴새로 만들어서 추가해줄것".
   ★ 클리어해서 **열린 부(ACT)** 의 진입층으로 바로 들어간다 — 1부를 다시 기어 내려가지 않아도 된다.
     해금 판정은 기존 actUnlocked(선행 부의 clearFlag 가 META 에 있는가)를 그대로 쓴다.
   ★ 런이 이미 돌고 있으면 거절한다(런 중간에 층을 건너뛰면 정산·업적이 뒤틀린다). */
function warpList(){
  return actList().filter(actUnlocked).map(function(a){
    var fl = Object.keys(a.floors).map(function(x){ return parseInt(x, 10); }).sort(function(p, q){ return p - q; });
    return { id:a.id, n:a.n, from:fl[0], to:fl[fl.length - 1], entry:a.entry,
             cleared: !!(typeof META !== "undefined" && META && META[a.clearFlag]) };
  });
}
function warpTo(actId){
  if(runActive()){ log("원정 중에는 워프할 수 없습니다. 정산하고 오십시오.", "#f88"); return false; }
  var l = warpList(), i, a = null;
  for(i = 0; i < l.length; i++) if(l[i].id === actId) a = l[i];
  if(!a){ log("아직 열리지 않은 길입니다.", "#f88"); return false; }
  if(typeof facClose === "function" && typeof FAC !== "undefined" && FAC.open) facClose();
  if(typeof hubHide === "function") hubHide();
  runBegin();
  log("<b>" + a.n + "</b> — " + a.from + "층으로 곧바로 내려갑니다.", "#9fe2ff");
  travel(a.entry.z, a.entry.x, a.entry.y);
  return true;
}
/* 워프 관리자 화면 — 시설 패널(#warp) 안에 그린다 */
function renderWarp(){
  var el = document.getElementById("warplist");
  if(!el) return;
  var l = warpList(), h = "";
  h += '<div style="color:#a89c86;font-size:12px;line-height:18px;margin-bottom:8px">'
     + '클리어해서 열린 곳으로 곧바로 내려갑니다. <b style="color:#9fe2ff">1부를 다시 지나지 않아도 됩니다.</b>'
     + '<br><span style="color:#6b6046">원정 중에는 쓸 수 없습니다 — 정산 후에 오십시오.</span></div>';
  l.forEach(function(a){
    h += '<div class="wrow"><span class="wn"><b>' + a.n + '</b>'
       + '<span> ' + a.from + '~' + a.to + '층' + (a.cleared ? ' · <span style="color:#ffd24a">클리어</span>' : '') + '</span></span>'
       + '<button class="ib" onclick="warpTo(\'' + a.id + '\')">내려가기</button></div>';
  });
  var locked = actList().filter(function(a){ return !actUnlocked(a); });
  if(locked.length)
    h += '<div style="color:#6b6046;font-size:11px;margin-top:8px;border-top:1px solid #35304a;padding-top:6px">'
       + '아직 잠긴 길 ' + locked.length + '곳 — 앞 부의 보스를 넘으면 열립니다.</div>';
  el.innerHTML = h;
}

/* travel() 이 부를 훅 — 층이 바뀌면 기록한다 */
function runOnTravel(zone){
  var f0 = FLOOR_OF[zone];
  if(!runActive()){
    /* 성읍 문으로 걸어 들어가도 런이다 — 1층 진입 = 런 시작 */
    if(f0 && !deadFlag) runBegin();
    else return;
  }
  var f = FLOOR_OF[zone];
  if(!f){
    /* 던전 밖으로 나가면 런은 그 자리에서 끝난다(도망 = 포기, 포인트는 준다) */
    runEnd("escape");
    return;
  }
  RUN.floor = f;
  RUN.noHitFloor = true;
  /* 메타: 쉴드 생성 — 층 진입마다. 계시 「빛의 장막」이 있으면 여기에 합산된다. */
  var sh = 0;
  if(metaOwned("shield")) sh += 15 + 10 * metaLv("shieldup");
  if(typeof revVal === "function") sh += revSum("shield");
  if(sh > 0){
    P.shield = Math.round(sh);
    floaters.push({x:P.fx, y:P.fy-0.6, t:"쉴드 " + P.shield, c:"#9fe2ff", t0:T});
  }
  featSpawn(zone, f);
  if(typeof repOnFloor === "function") repOnFloor(f);   /* R26 층별 기록 */
  if(f > RUN.maxFloor){
    RUN.maxFloor = f;
    log(TX("run.newFloor", f), "#9fe2ff");
  }
}

function runOnKill(){ if(runActive()) RUN.kills++; }
function runOnHurt(d){ if(runActive()){ RUN.dmgTaken += d; RUN.noHitFloor = false; } }
function runOnGold(g){ if(runActive()) RUN.goldEarned += g; }

/* ---------- 업적포인트 ----------
   R1 최소판: 도달 층 + 처치 수. 곡선 조정은 R3 에서 시뮬레이션으로 한다. */
var PT_PER_FLOOR = 20;
var PT_PER_KILL  = 2;
var PT_CLEAR_BONUS = 60;

/* ================= 업적 20종 (R17) =================
   test(r) 의 r 은 RUN 이다. 누적/수집형은 META 를 직접 본다(런이 아니라 계정 단위라서).
   판정은 runEnd 에서 한 번만 돈다 — 런 도중에는 달성되지 않는다.
   ★ 순서 = 난이도 순. nextGoalLine() 이 "아직 못 딴 첫 항목"을 다음 목표로 보여주기 때문에
     쉬운 것부터 놓아야 안내가 자연스럽다. 중간에 끼워 넣을 땐 난이도 위치를 지킬 것.
   ★ d 는 목록 화면에 뜨는 달성 조건 설명. 신규 항목엔 반드시 채운다. */
var ACHV = [
  /* — 걸음마 — */
  {id:"first_run", n:"첫 걸음",       p:20,  d:"런을 한 번 끝낸다",                  test:function(r){ return true; }},
  {id:"floor2",    n:"2층 도달",      p:30,  d:"2층에 발을 딛는다",                  test:function(r){ return r.maxFloor >= 2; }},
  {id:"kill20",    n:"스무 마리",     p:30,  d:"한 런에서 20마리 처치",              test:function(r){ return r.kills >= 20; }},
  {id:"dex5",      n:"낯선 것들",     p:40,  d:"마물 5종을 도감에 남긴다",           test:function(r){ return metaDexCount() >= 5; }},
  {id:"floor3",    n:"3층 도달",      p:50,  d:"3층에 발을 딛는다",                  test:function(r){ return r.maxFloor >= 3; }},
  /* — 익숙해질 무렵 — */
  {id:"runs5",     n:"다섯 번의 죽음", p:50,  d:"런을 5번 마친다",                    test:function(r){ return (META.runs || 0) + 1 >= 5; }},
  {id:"rev3",      n:"세 겹의 문신",   p:55,  d:"한 런에서 계시 3개를 새긴다",         test:function(r){ return revCount() >= 3; }},
  {id:"lore6",     n:"기록의 절반",   p:60,  d:"기록물 6종을 찾는다",                test:function(r){ return loreCount() >= 6; }},
  {id:"dex10",     n:"열 종의 마물",   p:60,  d:"마물 10종을 도감에 남긴다",          test:function(r){ return metaDexCount() >= 10; }},
  {id:"kill50",    n:"쉰 마리",       p:70,  d:"한 런에서 50마리 처치",              test:function(r){ return r.kills >= 50; }},
  {id:"floor4",    n:"4층 도달",      p:80,  d:"4층에 발을 딛는다",                  test:function(r){ return r.maxFloor >= 4; }},
  /* — 솜씨 — */
  {id:"nohit1",    n:"무결한 층",     p:90,  d:"한 대도 맞지 않고 한 층을 정리한다",  test:function(r){ return (r.noHitCount || 0) >= 1; }},
  {id:"rev_deep",  n:"짙어진 각인",   p:90,  d:"계시 하나를 심화(2단)까지 올린다",     test:function(r){
     var k; for(k in (r.revs || {})) if(r.revs[k] >= 2) return true; return false; }},
  {id:"tkill300",  n:"삼백의 마물",   p:100, d:"누적 300마리 처치",                  test:function(r){ return (META.tkills || 0) >= 300; }},
  {id:"rich",      n:"전리품 사냥꾼", p:100, d:"한 런에서 은화 600 획득",             test:function(r){ return (r.goldEarned || 0) >= 600; }},
  {id:"boss",      n:"이름을 잃은 기사 격파", p:150, d:"1부를 클리어한다",            test:function(r){ return r.result === "clear"; }},
  /* — 집념 — */
  {id:"lore_all",  n:"잊힌 것을 모두", p:200, d:"기록물 12종을 전부 찾는다",          test:function(r){ return loreCount() >= Object.keys(LORE).length; }},
  {id:"nohit3",    n:"그림자처럼",    p:220, d:"한 런에서 무결한 층 3개",             test:function(r){ return (r.noHitCount || 0) >= 3; }},
  {id:"dex_all",   n:"마물 도감 완성", p:260, d:"모든 마물을 도감에 남긴다",          test:function(r){ return metaDexTotal() > 0 && metaDexCount() >= metaDexTotal(); }},
  {id:"cls_all",   n:"세 계열",       p:400, d:"세 계열 전부로 1부를 클리어한다",     test:function(r){ return metaClsClearCount() >= 3; }}
];

function runScore(r){
  var rows = [];
  rows.push(["도달 층 " + r.maxFloor, r.maxFloor * PT_PER_FLOOR]);
  rows.push(["처치 " + r.kills, r.kills * PT_PER_KILL]);
  if(r.result === "clear") rows.push(["클리어 보너스", PT_CLEAR_BONUS]);
  var newA = [];
  ACHV.forEach(function(a){
    if(metaHasAchv(a.id)) return;
    if(a.test(r)){ newA.push(a); rows.push(["★ " + a.n, a.p]); }
  });
  var total = 0;
  rows.forEach(function(x){ total += x[1]; });
  return {rows:rows, total:total, newA:newA};
}

/* ---------- 런 종료 ---------- */
function runEnd(result){
  if(!runActive()) return;
  RUN.live = false;
  RUN.result = result;                 /* "death" | "clear" | "escape" */
  /* R17 — 계열 클리어 기록은 채점보다 먼저. 세 번째 계열로 클리어한 그 런에서
     「세 계열」업적이 바로 달성되게 하려면 순서가 이래야 한다. */
  if(result === "clear" && P && typeof metaMarkClsClear === "function") metaMarkClsClear(P.cls);
  var sc = runScore(RUN);
  if(metaOwned("interest") && sc.total > 0){
    var bonus = Math.round(sc.total * 0.1);
    sc.rows.push(["정산 이자 +10%", bonus]);
    sc.total += bonus;
  }
  metaAddPoints(sc.total);
  sc.newA.forEach(function(a){ metaMarkAchv(a.id); });
  metaBumpRuns();
  metaSave();
  /* R26 — 이 판을 기록으로 남긴다(최근 20판). 밸런스를 수치로 보기 위한 자료다. */
  if(typeof repMake === "function"){
    try{ REP_LAST = repMake(RUN, sc); repPush(REP_LAST); }catch(e){}
  }
  showSettle(RUN, sc);
}

/* ---------- 정산 화면 ----------
   "죽음 = 손실" 을 "죽음 = 진행" 으로 바꾸는 화면. 반드시 다음 목표 한 줄을 보여준다. */
function nextGoalLine(){
  var i;
  for(i = 0; i < ACHV.length; i++)
    if(!metaHasAchv(ACHV[i].id))
      return TX("run.next", ACHV[i].n, ACHV[i].p);
  return TX("run.nextShop");
}

function showSettle(r, sc){
  var titleTx = r.result === "clear" ? "클리어" : (r.result === "escape" ? "귀환" : "사망");
  var col = r.result === "clear" ? "#ffd24a" : (r.result === "escape" ? "#9fe2ff" : "#ff6060");
  var h = '<div style="font-size:26px;letter-spacing:6px;color:' + col + ';margin-bottom:2px">' + titleTx + '</div>';
  h += '<div style="color:#8a8068;font-size:11px;margin-bottom:12px">' +
       Math.floor((T - r.t0) / 60) + '분 ' + Math.floor((T - r.t0) % 60) + '초 · 받은 피해 ' + Math.round(r.dmgTaken) + '</div>';
  h += '<table style="margin:0 auto;border-collapse:collapse;font-size:13px">';
  sc.rows.forEach(function(x){
    h += '<tr><td style="padding:3px 18px 3px 0;text-align:left;color:#cfc8e8">' + x[0] +
         '</td><td style="padding:3px 0;text-align:right;color:#ffd24a">+' + x[1] + '</td></tr>';
  });
  h += '<tr><td colspan="2"><div style="border-top:1px solid #4a4266;margin:6px 0"></div></td></tr>';
  h += '<tr><td style="text-align:left;color:#e8e0d0"><b>업적포인트</b></td>' +
       '<td style="text-align:right;color:#ffd24a;font-size:17px"><b>+' + sc.total + '</b></td></tr>';
  h += '<tr><td style="text-align:left;color:#8a8068;font-size:11px">보유</td>' +
       '<td style="text-align:right;color:#8a8068;font-size:11px">' + META.pt + 'P</td></tr>';
  h += '</table>';
  h += '<div style="margin-top:14px;color:#9fe2ff;font-size:12px">' + nextGoalLine() + '</div>';
  document.getElementById("settlebody").innerHTML = h;
  document.getElementById("settleov").style.display = "block";
  sfx(r.result === "clear" ? "lvl" : "die");
}

/* ---------- 사망 시 레벨·장비 초기화 (대표님 확정, 08-16) ----------
   진짜 로그라이트로: 레벨업·장비는 "이번 생의 임시 힘"이고 사망하면 사라진다.
   영구히 남는 것은 메타(META 45노드)·완료한 퀘스트·기록물·처치기록·변신 해금뿐이다.
   장비는 착용 슬롯은 물론 가방 속 미착용 장비류(무기·방어구)까지 함께 사라진다 —
   안 그러면 예비 장비를 가방에 넣어두는 것만으로 초기화를 무력화할 수 있다.
   물약·주문서·퀘스트 수집품 등 비장비 아이템은 그대로 남는다.
   최초 생성 시 배분한 8P(P.alloc)는 스탯에 다시 입혀 준다 — 그 선택 자체는 지워지지 않는다.

   08-16 추가(대표님 지적): "조건 달성 후 죽으면 부활해서 그대로 완료 보고 가능" 문제 —
   진행중 퀘스트(P.q)의 처치/수집 카운트까지 그대로 보존되면, 던전에서 목표를 채운 뒤
   일부러(또는 부주의로) 죽어도 마을로 돌아가 바로 보고할 수 있어 "살아서 돌아와야 보상"
   이라는 로그라이트 긴장이 사라진다. 완료해서 이미 보고까지 마친 퀘스트(P.qd)는 그대로
   영구 보존하되, 아직 보고 전인 진행중 퀘스트는 처치/수집 카운트만 0으로 되돌린다.
   collect형은 qSyncCollect()가 사망 후 실제 보유량으로 다시 맞춰준다(비장비 수집품은
   보존되므로 자연히 복구), zone형은 travel() 이 항상 부르는 qProgress("zone",...)로
   해당 구역을 다시 지나가면 자연히 복구된다 — 오직 kill형만 다시 사냥해야 한다. */
function resetCharacterOnDeath(){
  if(!P) return;
  var name = P.name, cls = P.cls, alloc = P.alloc || {str:0,dex:0,con:0,int:0,wis:0};
  var keep = {
    qd: P.qd, q: P.q, qcur: P.qcur, lore: P.lore, bind: P.bind, ap: P.ap, hunt: P.hunt,
    kills: P.kills, bossKilled: P.bossKilled, tfUnlock: P.tfUnlock,
    autoCounter: P.autoCounter, autoMode: P.autoMode, autoSkill: P.autoSkill, lostXp: P.lostXp,
    keepInv: P.inv.filter(function(it){ return SLOTN[ITEMS[it.k].t] === undefined; })
  };

  P = newPlayer(name, cls);
  P.alloc = alloc;
  (function(){var k,hp=0,mp=0;
    for(k in alloc){if(!alloc[k])continue;P[k]+=alloc[k];
      if(k==="con")hp+=alloc[k]*3;
      if(k==="int"||k==="wis")mp+=alloc[k];}
    P.mhp+=hp;P.hp=P.mhp;P.mmp+=mp;P.mp=P.mmp;})();

  P.qd=keep.qd; P.q=keep.q; P.qcur=keep.qcur; P.lore=keep.lore; P.bind=keep.bind; P.ap=keep.ap;
  P.hunt=keep.hunt; P.kills=keep.kills; P.bossKilled=keep.bossKilled; P.tfUnlock=keep.tfUnlock;
  P.autoCounter=keep.autoCounter; P.autoMode=keep.autoMode; P.autoSkill=keep.autoSkill; P.lostXp=keep.lostXp;

  /* 진행중 퀘스트 카운트 리셋 — 완료(P.qd)는 안 건드리고, 아직 보고 안 한 퀘스트만 0으로 */
  var qid; for(qid in P.q){ if(P.q[qid] && P.q[qid].p) P.q[qid].p = P.q[qid].p.map(function(){ return 0; }); }

  P.inv = keep.keepInv;
  CLS[cls].start.forEach(function(k){ addItem(k, ITEMS[k].t==="potion"?5:(ITEMS[k].t==="ammo"?1:1)); });
  SLOTS.forEach(function(sl){
    for(var i=0;i<P.inv.length;i++){var d=ITEMS[P.inv[i].k];
      if(d.t===sl && !P.eq[sl] && canUse(P.inv[i].k)){ P.eq[sl]=P.inv[i]; break; }}});
  if(typeof qSyncCollect==="function") qSyncCollect();   /* collect형은 사망 후 실제 보유량으로 재동기화 */

  P.markGiven = true;                       /* 각인 첫 지급은 신규 캐릭터 1회뿐 — 재지급 방지 */
  metaApplyToPlayer();
  if(typeof markApplyToPlayer==="function") markApplyToPlayer();
  P.hp = P.mhp; P.mp = P.mmp;

  if(typeof resetAllTargets==="function") resetAllTargets();   /* 옛 P를 물고 있던 몹/NPC 표적 해제 */
  refreshInv(); refreshChar(); refreshQuest(); refreshLore();
  if(typeof buildPad==="function") buildPad();
  log("사망의 대가로 이번 생에서 쌓은 <b>레벨과 장비</b>가 흩어졌습니다. 영구 성장(메타)·완료한 이야기·기록물은 그대로 남습니다.", "#c07aff");
}

/* 정산 닫기 → 마을 귀환. 런 내 골드는 사라진다(긴장 요소). 사망으로 끝난 런이면 레벨·장비도 초기화된다. */
function settleClose(){
  document.getElementById("settleov").style.display = "none";
  document.getElementById("deadov").style.display = "none";
  deadFlag = false;
  /* R31 — 가져간 은화(런 중 쓴 만큼 제외)는 남기고, **런에서 번 것만** 사라진다. */
  var broughtIn = (RUN && typeof RUN.goldIn === "number") ? RUN.goldIn : 0;
  var keepGold = Math.max(0, Math.min(P.gold, broughtIn));
  var lostGold = Math.max(0, P.gold - keepGold);
  var wasDeath = !!(RUN && RUN.result === "death");
  P.gold = keepGold;
  P.tf = null; P.tfT = 0; dotClear(); P.buffs = {};
  RUN = null;
  if(wasDeath){
    resetCharacterOnDeath();
  }else{
    P.hp = P.mhp; P.mp = P.mmp;
    metaApplyToPlayer();
  }
  travel(0, 10, 9);
  if(lostGold > 0) log(TX("run.goldLost", lostGold.toLocaleString()), "#a89c86");
  if(keepGold > 0) log("가져갔던 은화 <b>" + keepGold.toLocaleString() + "</b>는 그대로 남았습니다.", "#f5c542");
  log(TX("run.backTown"), "#9fe2ff");
  refreshHud(); refreshChar(); refreshInv();
}
