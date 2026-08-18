/* ================= 층 기능물 — 상인·제단·보물 상자 (R3 §4) =================
   런 골드는 죽으면 사라진다. 그래서 런 안에 쓸 곳이 있어야 골드가 의미를 가진다.

   RUN.feats = [{z, x, y, kind, used}]  — 런마다 새로 배치, 세이브 안 한다.
   kind: "merchant"(상인) / "altar"(제단) / "chest"(보물 상자)
   상호작용 = 걸어가 닿기 (LORE 와 같은 문법). 사용 후 잿빛 표식만 남는다.
   ========================================================================= */
var FEAT_DEF = {
  merchant: {n:"떠돌이 상인", c:"#ffd24a", icon:"◆"},
  altar:    {n:"핏빛 제단",   c:"#ff6a8a", icon:"▲"},
  chest:    {n:"보물 상자",   c:"#c9a227", icon:"■"}
};

/* 층 진입 때 부른다 — 이 층에 배치될 것들을 방 빈 칸에 심는다 */
function featSpawn(zone, f){
  if(!RUN || !RUN.feats) return;
  var have = RUN.feats.some(function(ft){ return ft.z === zone; });
  if(have) return;                                   /* 층당 1회만 배치 */
  var z = world[zone], wants = [];
  if(RUN.merchF === f) wants.push("merchant");
  if(RUN.altarF === f) wants.push("altar");
  if(ch(0.35)) wants.push("chest");
  if(!wants.length) return;
  var W = z.def.w, H = z.def.h, tries, x, y, k;
  wants.forEach(function(kind){
    for(tries = 0; tries < 200; tries++){
      x = ri(2, W - 3); y = ri(2, H - 3);
      if(blocked(z, x, y)) continue;
      /* 입구·게이트 근처는 피한다 */
      if(Math.abs(x - RUN_ENTRY.x) + Math.abs(y - RUN_ENTRY.y) < 4 && zone === RUN_ENTRY.z) continue;
      var clash = RUN.feats.some(function(ft){ return ft.z === zone && Math.abs(ft.x-x)+Math.abs(ft.y-y) < 3; });
      if(clash) continue;
      RUN.feats.push({z:zone, x:x, y:y, kind:kind, used:0});
      break;
    }
  });
  var here = RUN.feats.filter(function(ft){ return ft.z === zone && !ft.used; });
  if(here.length) log("이 층 어딘가 — " + here.map(function(ft){ return "<b>" + FEAT_DEF[ft.kind].n + "</b>"; }).join(", "), "#a89c86");
}

/* 매 틱 — 닿으면 발동 (checkLore 문법) */
function featCheck(){
  if(!RUN || !RUN.feats || !started || deadFlag) return;
  var i, ft;
  for(i = 0; i < RUN.feats.length; i++){
    ft = RUN.feats[i];
    if(ft.z !== curZ || ft.used) continue;
    if(Math.abs(P.fx - ft.x) < 0.9 && Math.abs(P.fy - ft.y) < 0.9) featUse(ft);
  }
}

function featUse(ft){
  if(ft.kind === "chest"){
    ft.used = 1; sfx("gold"); spark(ft.x, ft.y, "#ffd24a", 16, 1.8);
    if(ch(0.6)){ var g = ri(60, 160); P.gold += g; runOnGold(g);
      log("보물 상자 — 은화 <b>" + g + "</b>개!", "#f5c542"); }
    else if(ch(0.5)){ addItem("hpot", 2); log("보물 상자 — 체력 물약 2개.", "#8fd18f"); }
    else{ var fop = {f:["wild","demon","undead"][ri(0,2)], b:ri(8,12), m:2};
      addItem(RUN.floor >= 3 ? "katana" : "longsw", 1, 0, fop);
      log("보물 상자 — <b>[대" + FAMN[fop.f] + "] 무기</b>가 들어 있었다!", "#ffd24a"); }
    refreshInv(); refreshHud();
  }else if(ft.kind === "altar"){
    ft.used = 1;
    var cost = Math.floor(P.mhp * 0.3);
    if(P.hp <= cost + 5){ log("핏빛 제단이 요구하는 피(" + cost + ")를 감당할 수 없다 — 제단이 식는다.", "#888"); return; }
    P.hp -= cost; P.hurtT = T; sfx("hurt"); shake(3, .3);
    floaters.push({x:P.fx, y:P.fy, t:"-" + cost, c:"#ff6a8a", t0:T});
    var bs = [
      function(){ P.buffs.bd = {v:6, t:T+99999, n:"제단 · 전의"}; log("제단의 축복 — 이 런 동안 공격 +6", "#ff9a6a"); },
      function(){ P.buffs.bac = {v:3, t:T+99999, n:"제단 · 철갑"}; log("제단의 축복 — 이 런 동안 AC +3", "#9fe2ff"); },
      function(){ P.mhp += 25; P.hp = Math.min(P.mhp, P.hp + 25); log("제단의 축복 — 최대 HP +25", "#8fd18f"); },
      function(){ P.buffs.bhs = {v:1, t:T+99999, n:"제단 · 질풍"}; log("제단의 축복 — 이 런 동안 공격 속도 상승", "#ffe97a"); }
    ];
    bs[ri(0, bs.length - 1)]();
    sfx("buff"); spark(ft.x, ft.y, "#ff6a8a", 22, 2.2);
    refreshChar(); refreshHud();
  }else if(ft.kind === "merchant"){
    /* 소진되지 않는다 — 층에 머무는 동안 몇 번이고 살 수 있다. 재진입 쿨만 짧게. */
    if(T < (featUse.mcd || 0)) return;
    featUse.mcd = T + 1.2;
    openRunShop();
  }
}

/* ---------- 던전 상인 — 물약·붕대·특효 무기 (기존 상점 UI 재사용) ---------- */
var RUNSHOP_STOCK = null;
function openRunShop(){
  if(!RUNSHOP_STOCK){
    RUNSHOP_STOCK = ["hpot", "mpot", "bandage"];
    /* 특효 무기 2자루 — 이 런의 다음 층들에 잘 드는 것 */
    RUNSHOP_STOCK._fam = [
      {k:(RUN.floor >= 3 ? "katana" : "longsw"), opt:{f:floorFam(RUN.floor + 1), b:ri(9, 13), m:2}, pr:420},
      {k:"silversw", opt:{f:["wild","demon","undead"][ri(0,2)], b:ri(8, 12), m:2}, pr:520}
    ];
  }
  var h = '<div style="color:#8a8068;font-size:11px;margin-bottom:8px">떠돌이 상인 — "죽으면 못 쓰는 돈, 여기서 쓰고 가시오."</div>';
  RUNSHOP_STOCK.forEach(function(k){
    var d = ITEMS[k];
    h += '<div class="irow"><span class="nm">' + d.n + '<div class="iinfo">' + (d.desc || "") + '</div></span>'
       + '<span style="color:#f5c542;flex:0 0 auto">' + d.pr + '</span>'
       + '<button class="ib" onclick="buyItem(\'' + k + '\',1);openRunShop()">구매</button>'
       + '<button class="ib" onclick="buyItem(\'' + k + '\',5);openRunShop()">x5</button></div>';
  });
  RUNSHOP_STOCK._fam.forEach(function(w, i){
    if(w.sold) return;
    var d = ITEMS[w.k];
    h += '<div class="irow"><span class="nm" style="color:#ffd24a">[대' + FAMN[w.opt.f] + '] ' + d.n
       + '<div class="iinfo">특효 +' + w.opt.b + ' · 피해 상한 -' + w.opt.m + '</div></span>'
       + '<span style="color:#f5c542;flex:0 0 auto">' + w.pr + '</span>'
       + '<button class="ib" onclick="buyRunFam(' + i + ')">구매</button></div>';
  });
  h += '<div style="margin-top:8px;text-align:right"><button class="ib" onclick="closeP(\'runshop\')">나가기</button></div>';
  var el = document.getElementById("runshopbody");
  if(el){ el.innerHTML = h; openP("runshop"); }
}
function buyRunFam(i){
  var w = RUNSHOP_STOCK._fam[i];
  if(!w || w.sold) return;
  if(P.gold < w.pr){ log("은화가 부족합니다.", "#f88"); return; }
  P.gold -= w.pr; w.sold = 1;
  addItem(w.k, 1, 0, w.opt);
  sfx("gold"); log("<b>[대" + FAMN[w.opt.f] + "] " + ITEMS[w.k].n + "</b>" + josa(ITEMS[w.k].n,"을","를") + " 샀습니다.", "#ffd24a");
  refreshInv(); openRunShop();
}

/* ---------- 렌더 (hazardDraw 와 같은 자리에서 부른다) ---------- */
function featDraw(){
  if(!RUN || !RUN.feats) return;
  var i, ft, d;
  for(i = 0; i < RUN.feats.length; i++){
    ft = RUN.feats[i];
    if(ft.z !== curZ) continue;
    d = FEAT_DEF[ft.kind];
    var sc = toScreen(ft.x, ft.y);
    var bob = ft.used ? 0 : Math.sin(T * 3 + i) * 2;
    ctx.save();
    ctx.globalAlpha = ft.used ? 0.35 : 1;
    ctx.font = "bold 13px Gulim";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.fillText(d.icon, sc.x + 1, sc.y - 8 + bob + 1);
    ctx.fillStyle = ft.used ? "#6a6a6a" : d.c;
    ctx.fillText(d.icon, sc.x, sc.y - 8 + bob);
    if(!ft.used){
      ctx.font = "9px Gulim";
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.fillText(d.n, sc.x + 1, sc.y - 22 + bob + 1);
      ctx.fillStyle = d.c;
      ctx.fillText(d.n, sc.x, sc.y - 22 + bob);
      ctx.strokeStyle = d.c; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(T * 2.4);
      ctx.beginPath(); ctx.ellipse(sc.x, sc.y + 4, HW2 * 0.8, HH2 * 0.8, 0, 0, 6.283); ctx.stroke();
    }
    ctx.restore();
  }
}
