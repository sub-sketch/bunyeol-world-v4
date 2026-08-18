/* ================= R27 상점·가방 상세 패널 =================
   대표 지시 4건을 한 곳에서 받는다:
     ① "상점에서 아이콘이 너무 멀고 작아서 pc에서 하는데도 불편함이 있음"
        → 아이콘 34px + 행을 좁혀 이름 바로 옆에 붙였다(CSS: #shoplist/#invlist .irow).
     ② "구매시에 내가 골드가 얼만가 있는지 안뜸 판매에는 뜨는데"
        → 구매 목록 머리에 **보유 은화**를 큰 글씨로 박았다(renderShop 이 매번 갱신).
     ③ "구매나 판매창에 글씨가 작게 위로 올라가는데 오른편중앙부쯤 반투명하게 떠도 공간 충분한듯"
        → 화면 오른쪽 중앙에 **반투명 상세 패널**(#facinfo). 행을 누르면 거기 크게 뜬다.
     ④ "아이템 구매시 현 착용 아이템과 비교하는 창이 뜨면 좋을거같음"
        → 그 패널이 **착용 중 장비와 증감을 나란히** 보여 준다(▲/▼).
   ★ 툴팁(showTip)은 마우스를 올려야 뜨고 손가락으로는 잡기 어렵다. 이 패널은 **눌러서 고정**된다.
   ================================================================== */
var FI = { k:null, it:null, mode:null };      /* 지금 보고 있는 것: 아이템키 / 실물(가방) / buy|sell */

function facInfoEl(){ return document.getElementById("facinfo"); }
function facInfoClear(){
  FI = { k:null, it:null, mode:null };
  var el = facInfoEl();
  if(el){ el.style.display = "none"; el.innerHTML = ""; }
}
/* 같은 부위에 착용 중인 것과의 증감 한 줄 */
function fiCmpRows(k, e){
  var d = ITEMS[k];
  if(!d || !SLOTN[d.t]) return "";
  var cur = P.eq[d.t];
  if(!cur) return '<div class="fic up">비어 있는 부위 — 바로 채울 수 있습니다</div>';
  if(ITEMS[cur.k] === d && cur.e === e) return '<div class="fic gr">지금 착용 중인 것과 같은 물건입니다</div>';
  var out = '<div class="fihd">착용 중 (' + (cur.e > 0 ? "+" + cur.e + " " : "") + ITEMS[cur.k].n + ') 대비</div>';
  [["atk", "공격력"], ["ac", "AC"], ["mag", "마력"], ["dex", "민첩"]].forEach(function(f){
    var a = (typeof cmpVal === "function") ? cmpVal(k, e, f[0]) : 0;
    var b = (typeof cmpVal === "function") ? cmpVal(cur.k, cur.e, f[0]) : 0;
    var df = a - b;
    if(a === 0 && b === 0) return;
    var cls = df > 0 ? "up" : (df < 0 ? "dn" : "gr");
    var sg = df > 0 ? "▲ +" : (df < 0 ? "▼ " : "= ");
    out += '<div class="fic ' + cls + '">' + f[1] + ' ' + (df === 0 ? "동일" : sg + Math.abs(df)) + '</div>';
  });
  if(!canUse(k)) out += '<div class="fic dn">이 계열은 착용할 수 없습니다</div>';
  return out;
}
/* 상세 패널 본문 */
function fiHtml(){
  var k = FI.k, it = FI.it, d = ITEMS[k];
  if(!d) return "";
  var e = it ? (it.e || 0) : 0;
  var h = '<div class="fitop"><b>' + (e > 0 ? "+" + e + " " : "") + d.n + '</b>'
        + '<span>' + (SLOTN[d.t] || (d.t === "potion" ? "소모품" : d.t === "scroll" ? "주문서" : d.t === "quest" ? "재료" : d.t)) + '</span></div>';
  h += '<div class="fistat">' + itemInfo(it || { k:k, e:0, q:1 }) + '</div>';
  if(d.note) h += '<div class="finote">' + d.note + '</div>';
  if(typeof setLine === "function"){ var sl = setLine(k); if(sl) h += '<div class="fiset">' + sl + '</div>'; }
  h += fiCmpRows(k, e);
  /* 행동 버튼 — 구매/판매/장착을 이 패널에서 바로 */
  h += '<div class="fibtn">';
  if(FI.mode === "buy"){
    var pr = d.pr || 0, can = P.gold >= pr;
    var stack = (d.t === "potion" || d.t === "scroll" || d.t === "ammo");
    h += '<div class="fipr">' + pr.toLocaleString() + ' 은화 <span>보유 ' + P.gold.toLocaleString() + '</span></div>';
    h += '<button class="ib' + (can ? "" : " sell") + '" onclick="fiBuy(1)">구 매</button>';
    if(stack){
      h += '<button class="ib" onclick="fiBuy(10)">x10</button><button class="ib" onclick="fiBuy(100)">x100</button>';
    }
  }else if(FI.mode === "sell" && it){
    var sp = Math.max(5, Math.floor((d.pr || 0) * .4)) + e * 600;
    h += '<div class="fipr">판매가 ' + sp.toLocaleString() + ' 은화</div>';
    h += '<button class="ib sell" onclick="fiSell()">판 매</button>';
  }else if(FI.mode === "ench" && it){
    /* ===== R30 강화 확인창 (화면 가운데) =====
       예전 흐름의 문제: 격자에서 누르면 곧바로 한 장 소모 → 「안전 구간까지 한 번에」에 닿을 수 없었고,
       확인 버튼도 화면 오른쪽 끝이라 손이 멀었다. 이제 여기서 **단발 / 안전구간까지 / 취소**를 고른다. */
    var safe = (d.t === "weapon") ? 6 : 4;
    var have = (enchState && enchState.scroll) ? (enchState.scroll.q || 1) : 0;
    var need = safe - e;
    var risky = (e >= safe);
    h += '<div class="fihd">강화 — 지금 <b style="color:#7fc7ff">+' + e + '</b> → <b style="color:#7fc7ff">+' + (e + 1) + '</b></div>';
    h += '<div class="fic ' + (risky ? "dn" : "up") + '">'
       + (risky ? "★ 안전 구간(+" + safe + ")을 넘었습니다 — 실패하면 <b>파괴</b>됩니다"
                : "안전 구간(+" + safe + ") 안 — 성공 100%, 파괴 없음") + '</div>';
    h += '<div class="fic gr">보유 주문서 ' + have + '장</div>';
    if(need > 1 && have > 1){
      var bn = Math.min(need, have);
      h += '<div class="fic up">「+' + safe + '까지」를 쓰면 ' + bn + '장을 연속으로 사용합니다 (파괴 위험 없음)</div>';
    }
    h += '<div class="fibtn">';
    h += '<button class="ib" onclick="fiEnch()">강화 (1장)</button>';
    if(need > 1 && have > 1){
      var bn2 = Math.min(need, have);
      h += '<button class="ib" style="border-color:#7fc7ff;color:#cfe9ff" onclick="fiEnch(' + bn2 + ')">'
         + '+' + safe + '까지 (' + bn2 + '장)</button>';
    }
    h += '<button class="ib sell" onclick="facInfoClear()">취소</button></div>';
    return h;
  }else if(it){
    /* 강화 주문서를 쓰는 중이면 여기서 바로 강화한다(예전에는 줄마다 「강화」 버튼이 붙어 있었다) */
    var ENCHT = ["weapon","armor","helm","shield","cloak","boots","glove"];
    if(typeof enchState !== "undefined" && enchState && ENCHT.indexOf(d.t) >= 0){
      h += '<button class="ib" onclick="fiEnch()">강 화</button>';
      var sf = (d.t === "weapon") ? 6 : 4, need = sf - e, have = enchState.scroll.q || 1;
      if(need > 1 && have > 1){
        var bn = Math.min(need, have);
        h += '<button class="ib" style="border-color:#7fc7ff" title="파괴 위험이 없는 안전 구간까지 연속 사용합니다."'
           + ' onclick="fiEnch(' + bn + ')">+' + sf + '까지 (' + bn + '회)</button>';
      }
    }
    if(SLOTN[d.t]) h += '<button class="ib" onclick="fiEquip()">' + (isEquipped(it) ? "해 제" : "장 착") + '</button>';
    else if(d.t === "potion" || d.t === "scroll") h += '<button class="ib" onclick="fiUse()">사 용</button>';
    /* 상점 안(옛 경로 포함)에서는 가방 상세에서도 팔 수 있게 둔다 */
    if((typeof shopOpen !== "undefined" && shopOpen) && !isEquipped(it) && !(typeof enchState !== "undefined" && enchState)){
      var sp2 = Math.max(5, Math.floor((d.pr || 0) * .4)) + e * 600;
      h += '<button class="ib sell" onclick="fiSell()">판매 ' + sp2.toLocaleString() + '</button>';
    }
  }
  h += '<button class="ib" onclick="facInfoClear()">닫기</button></div>';
  return h;
}
/* ===== R30 상세창을 손 가까이 두기 =====
   대표 리포트: "장착하는 것도 마찬가지임 — 확인 아이콘이 너무 멀어짐."
   원래 이 패널은 시설(상점) 화면에서 **그림을 가리지 않게** 오른쪽 끝에 두기로 한 것이다(R27 지시).
   그런데 가방을 단독으로 열었을 때는 가릴 그림이 없고, 손은 왼쪽 가방에 있다 —
   그래서 자리를 셋으로 나눈다:
     · 강화 확인 → 화면 가운데(가장 중요한 결정)
     · 상점 구매·판매 → 오른쪽 끝(주인 그림을 살린다, 기존 지시 유지)
     · 단독 가방 → **가방 패널 바로 옆**(클릭한 손에서 가장 가깝다) */
function fiPlace(el){
  el.className = "";
  el.style.left = ""; el.style.top = ""; el.style.right = ""; el.style.transform = "";
  if(FI.mode === "ench"){ el.className = "mid"; return; }
  if(FI.mode === "buy" || FI.mode === "sell") return;          /* 시설 = 기존 오른쪽 자리 */
  var inv = document.getElementById("inv");
  var docked = !!(inv && inv.parentNode && /facslot/.test(inv.parentNode.id || ""));
  if(!inv || docked || inv.style.display !== "block") return;
  var r = inv.getBoundingClientRect();                 /* 화면 실좌표 (가방은 wrap 변형을 탄다) */
  /* ★ 이 패널에는 UI 배율(zoom)이 걸려 있다 — left/top 은 **줌 좌표계**로 넣어야 한다.
     화면 px 를 그대로 넣으면 배율만큼 밀려 엉뚱한 자리에 붙는다(실측에서 1000px 이상 어긋났다). */
  var z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--uiz")) || 1;
  /* 오른쪽을 먼저 쓴다(읽는 방향). 자리가 좁으면 **창을 줄여서라도** 오른쪽에 붙이고,
     그래도 240px 이 안 나오면 왼쪽으로 넘긴다 — 어느 쪽이든 가방에 **붙어 있어야** 한다. */
  var right = innerWidth - 8 - (r.right + 12);
  var left  = (r.left - 12) - 8;
  var wScreen, x;
  if(right >= 240 || right >= left){ wScreen = Math.max(240, Math.min(340 * z, right)); x = r.right + 12; }
  else { wScreen = Math.max(240, Math.min(340 * z, left)); x = Math.max(8, r.left - wScreen - 12); }
  var y = Math.max(8, Math.min(r.top + 8, innerHeight - 300 * z));
  el.className = "near";
  el.style.width = Math.round(wScreen / z) + "px";
  el.style.left = Math.round(x / z) + "px";
  el.style.top = Math.round(y / z) + "px";
}
function fiRender(){
  var el = facInfoEl();
  if(!el) return;
  if(!FI.k){ el.style.display = "none"; el.className = ""; return; }
  el.innerHTML = fiHtml();
  fiPlace(el);
  el.style.display = "block";
}
/* 목록에서 하나를 고른다 */
function facPick(k, it, mode){
  FI = { k:k, it:it || null, mode:mode || null };
  fiRender();
  if(typeof sfx === "function") sfx("click");
  /* 목록에서 고른 줄을 표시 */
  var rows = document.querySelectorAll("#shoplist .irow, #invlist .irow, #invlist .icell"), i;
  for(i = 0; i < rows.length; i++) rows[i].classList.remove("on");
  if(typeof event !== "undefined" && event && event.currentTarget && event.currentTarget.classList)
    event.currentTarget.classList.add("on");
}
function fiBuy(q){
  if(!FI.k) return;
  buyItem(FI.k, q || 1);
  fiRender();                        /* 보유 은화·수량이 바뀌므로 다시 그린다 */
}
function fiSell(){
  if(!FI.it) return;
  var d = ITEMS[FI.it.k], e = FI.it.e || 0;
  var sp = Math.max(5, Math.floor((d.pr || 0) * .4)) + e * 600;
  removeItem(FI.it, 1);
  P.gold += sp;
  if(typeof sfx === "function") sfx("gold");
  log(eul(d.n) + " " + sp.toLocaleString() + " 은화에 판매했습니다.", "#ffb27a");
  facInfoClear();
  refreshInv();
}
function fiEquip(){ if(FI.it){ equipIt(FI.it); fiRender(); refreshInv(); } }
function fiUse(){ if(FI.it){ useIt(FI.it); facInfoClear(); refreshInv(); } }
function fiEnch(n){
  if(!FI.it) return;
  var it = FI.it;
  facInfoClear();                       /* 연출 중에는 패널을 비운다(강화로 사라질 수도 있다) */
  if(n && typeof bulkEnch === "function") bulkEnch(it, n);
  else tryEnch(it);
}
/* 가방이 다시 그려질 때 상세 패널도 맞춘다 — 팔려서 없어진 물건이 남아 있지 않게 */
function facInfoRefresh(){
  if(!FI.k) return;
  if(FI.it && P && P.inv.indexOf(FI.it) < 0 && !isEquipped(FI.it)){ facInfoClear(); return; }
  fiRender();
}
