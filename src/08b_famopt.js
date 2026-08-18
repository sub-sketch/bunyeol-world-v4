/* ================= v4 R2 — 무기 특효 옵션 (계획서 v3 §1) =================
   상성표는 없다. 대신 무기에 「대(對)OO」 옵션이 붙는다.

   인스턴스 확장: {k,q,e} → {k,q,e,opt}
     opt = { f:"wild|demon|undead", b:추가피해, m:기본공격감소 }

   확정 규칙 — 만능 무기 금지:
     특효 무기는 기본 공격이 -2~-3 낮다. 맞는 가족에게만 +8~+12.
     맞으면 이득, 안 맞으면 손해 — 그래서 두 자루를 들고 다닐 이유가 생긴다.
   ======================================================================= */
var FAMN = { wild:"야생", demon:"마족", undead:"언데드" };

/* 드랍 시 특효 옵션 굴림 — 무기에만, 30% */
var FAMOPT_CH = 0.30;
function famRoll(k){
  if(!ITEMS[k] || ITEMS[k].t !== "weapon") return null;
  if(!ch(FAMOPT_CH)) return null;
  var fs = ["wild", "demon", "undead"];
  return { f: fs[ri(0, 2)], b: ri(8, 12), m: ri(2, 3) };
}

/* 현재 무기가 이 몹에게 내는 특효 추가 피해 (없으면 0) */
function famBonus(m){
  var w = P && P.eq.weapon;
  if(!w || !w.opt || !m || !m.d) return 0;
  return (m.d.fam === w.opt.f) ? (w.opt.b || 0) : 0;
}

/* ---------- 검 스위칭 ([Tab], 해금 노드 wswap) ----------
   해금 1단: 2자루 휴대 · 2단: 3자루. 인벤토리 앞쪽의 무기부터 센다. */
function swapUnlocked(){ return typeof metaOwned === "function" && metaOwned("wswap"); }

function weaponPool(){
  var n = 1 + metaLv("wswap"), pool = [], i;
  for(i = 0; i < P.inv.length && pool.length < n; i++){
    var it = P.inv[i];
    if(ITEMS[it.k].t === "weapon" && canUse(it.k)) pool.push(it);
  }
  return pool;
}

function swapWeapon(){
  if(!P || deadFlag || !started) return;
  if(!swapUnlocked()){
    if(T > (swapWeapon.hintT || 0)){ swapWeapon.hintT = T + 3; log(TX("swap.locked"), "#a89c86"); }
    return;
  }
  if(T < (P.swapCd || 0)) return;
  var pool = weaponPool();
  if(pool.length < 2){ log(TX("swap.none"), "#888"); return; }
  var idx = pool.indexOf(P.eq.weapon);
  var nxt = pool[(idx + 1) % pool.length];
  if(nxt === P.eq.weapon) return;
  if(ITEMS[nxt.k].h2 && P.eq.shield){
    log(ITEMS[P.eq.shield.k].n+"를 내려놓고 양손으로 잡습니다.","#ffb27a");P.eq.shield=null;}
  P.eq.weapon = nxt;
  P.swapCd = T + 0.5;                              /* 교체 딜레이 — 전투 중 무한 스왑 방지 */
  sfx("pot"); spark(P.fx, P.fy, "#e8e0d0", 6, 1.2);
  log(TX("swap.done", itemName(nxt)), "#e8e0d0");
  refreshInv(); refreshChar(); refreshQuick();
}

/* 자동 무기 교체 (기본 꺼짐) — 표적 가족에 특효 무기가 있으면 알아서 바꿔 든다 */
function toggleAutoSwap(){
  P.autoSwap = !P.autoSwap;
  log(TX(P.autoSwap ? "swap.autoOn" : "swap.autoOff"), "#ffb27a");
  refreshHud();
}

function autoSwapFor(m){
  if(!P.autoSwap || !swapUnlocked() || !m || !m.d) return;
  if(T < (P.swapCd || 0)) return;
  if(famBonus(m) > 0) return;                      /* 이미 맞는 무기 */
  var pool = weaponPool(), i;
  for(i = 0; i < pool.length; i++){
    if(pool[i].opt && pool[i].opt.f === m.d.fam){
      if(ITEMS[pool[i].k].h2 && P.eq.shield){
        log(ITEMS[P.eq.shield.k].n+"를 내려놓고 양손으로 잡습니다.","#ffb27a");P.eq.shield=null;}
      P.eq.weapon = pool[i]; P.swapCd = T + 0.5;
      log(TX("swap.auto", itemName(pool[i])), "#8a8068");
      refreshInv(); refreshChar();
      return;
    }
  }
}

function famTag(it){
  if(!it || !it.opt) return "";
  return '<span style="color:#ffd24a">[대' + (FAMN[it.opt.f] || "?") + ']</span> ';
}
function famDesc(it){
  if(!it || !it.opt) return "";
  return "대" + (FAMN[it.opt.f] || "?") + " +" + it.opt.b + " · 기본 공격 -" + it.opt.m;
}
