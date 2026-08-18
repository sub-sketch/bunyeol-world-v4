/* ================= 상점 / NPC ================= */
/* R23 — 상점은 **시설 화면**(28_facroom.js)으로 연다: 좌측 상점 · 우측 인벤토리 2단.
   예전엔 `openP("shop");openP("inv")` 로 창 둘을 그냥 띄웠는데, #shop 은 화면 중앙 고정 모달이고
   #inv 는 배율이 걸린 #wrap 안이라 좌표계가 달라 **서로 겹쳤다** — 겹치면 판매 버튼이 가려져
   판매가 불가능했다(대표 리포트). 시설 화면은 둘을 같은 flex 행의 형제로 넣어 구조적으로 겹치지 않는다.
   시설 화면을 못 쓰는 상황(파일 누락 등)에서는 예전 방식으로 폴백한다. */
function openShop(){
 if(typeof facShow==="function"&&document.getElementById("facov")){ facShow("shop"); return; }
 shopOpen=true;openP("shop");openP("inv");refreshInv();renderShop();
}
/* ================= R26 지역 전용 재고 =================
   대표 지시(C안): 지역마다 "그 지역에서만 파는 것" 이 있어야 지역을 옮겨 다닐 이유가 생긴다.
   데이터는 팩의 SHOP_HUB = { dong:[아이템키…], ma:[…] } — **본편 SHOPCAT 을 건드리지 않는다.**
   지금 있는 거점(HUB.id)에 목록이 있으면 맨 앞에 「이 땅의 물건」 칸이 하나 더 붙는다. */
/* ★ R27 — 지역 상점은 **그 지역 물건으로 갈아 끼운다**
   (대표 지시: "무기 상점도 동대륙만의 물건으로 변경 — 초보자 아이템은 판매할필요없이 추가 신규 무기들만.
    이건 마경도 동일"). 예전엔 지역 칸을 하나 **덧붙이기만** 해서, 동대륙에 와도 단검·가죽재킷 같은
   1층용 물건이 그대로 진열돼 있었다. 이제 장비 칸은 지역 것만 남기고, 소모품·주문서만 공통으로 둔다
   (물약·귀환 각인은 어느 땅에서나 필요하다). */
var SHOP_KEEP = ["소모품", "주문서"];
function shopCats(){
  var hid = (typeof HUB !== "undefined" && HUB) ? HUB.id : null;
  var reg = (hid && typeof SHOP_HUB !== "undefined" && SHOP_HUB && SHOP_HUB[hid]) ? SHOP_HUB[hid] : null;
  if(!reg || !reg.length) return SHOPCAT.slice(0);
  var keys = reg.filter(function(k){ return !!ITEMS[k]; });
  if(!keys.length) return SHOPCAT.slice(0);
  var keep = SHOPCAT.filter(function(c){ return SHOP_KEEP.indexOf(c[0]) >= 0; });
  return [["★ 이 땅의 물건", keys]].concat(keep);
}
function renderShop(){
 var tb=document.getElementById("shoptab");tb.innerHTML="";
 var CATS=shopCats();
 if(shopCat>=CATS.length)shopCat=0;
 CATS.forEach(function(c,i){
   var b=document.createElement("button");b.className="ib"+(i===shopCat?" on":"");b.textContent=c[0];
   b.onclick=function(){shopCat=i;renderShop();};tb.appendChild(b);});
 var L=document.getElementById("shoplist");L.innerHTML="";
 /* ★ R27 — 구매창에 **보유 은화**를 박는다(대표 리포트: "구매시에 내가 골드가 얼만가 있는지 안뜸").
    판매창은 인벤토리 머리에 있어서 보였는데 구매창에는 어디에도 없었다. */
 var gh=document.createElement("div");
 gh.className="shopgold";
 gh.innerHTML='보유 <b>'+P.gold.toLocaleString()+'</b> 은화';
 L.appendChild(gh);
 CATS[shopCat][1].forEach(function(k){
   var d=ITEMS[k],row=document.createElement("div");row.className="irow";
   var sic=icoEl(k);row.appendChild(sic);bindTip(sic,{k:k,e:0,q:1});
   /* 행을 누르면 오른쪽 상세 패널에 크게 뜬다(착용 중 장비와 비교까지) */
   if(typeof facPick==="function") row.onclick=function(ev){facPick(k,null,"buy");};
   var nm=document.createElement("span");nm.className="nm"+(canUse(k)?"":" no");
   nm.innerHTML=d.n+'<div class="iinfo">'+itemInfo({k:k,e:0,q:1})+"</div>";
   bindTip(nm,{k:k,e:0,q:1});
   row.appendChild(nm);
   var pr=document.createElement("span");pr.style.color="#f5c542";pr.style.flex="0 0 auto";
   pr.textContent=d.pr.toLocaleString();row.appendChild(pr);
   /* 묶음 구매 — 주문서·화살·물약처럼 여러 개 사는 물건은 한 번에 산다.
      장비(1개짜리)는 x1 만 둔다. */
   var stack=(d.t==="potion"||d.t==="scroll"||d.t==="ammo");
   var qtys=stack?[1,10,100]:[1];
   qtys.forEach(function(q){
     var b=document.createElement("button");b.className="ib";
     b.textContent=(q===1?"구매":"x"+q);
     b.style.minWidth=(q===1?"":"34px");
     b.onclick=function(){buyItem(k,q);};
     row.appendChild(b);
   });
   L.appendChild(row);
 });
}
function buyItem(k,q){
 var d=ITEMS[k];
 q=Math.max(1,q|0);
 var can=Math.floor(P.gold/d.pr);
 if(can<=0){log("은화가 부족합니다.","#f88");return;}
 if(q>can){          /* 가진 돈만큼만 산다 — 0개 사고 끝나는 것보다 낫다 */
   q=can;
   log("은화가 모자라 "+q+"개만 구매합니다.","#a89c86");
 }
 P.gold-=d.pr*q;
 addItem(k,q);
 sfx("gold");
 log(eul(d.n)+(q>1?" "+q+"개를":"")+" 구매했습니다. <span style='color:#8a8068'>(-"+
     (d.pr*q).toLocaleString()+")</span>","#e8d36e");
 refreshInv();renderShop();
}
function closeShop(){
 if(typeof FAC!=="undefined"&&FAC.open){facClose();return;}
 shopOpen=false;closeP("shop");refreshInv();}

/* ================= R24b 잡템 일괄 판매 =================
   대표 지시: "퀘스트 이후 쌓이는 잡템은 일괄판매 와 같은 기능이 필요하고".
   ★ 무엇을 파는지 규칙을 좁게 못박아 둔다 — 일괄 처리에서 아까운 것이 섞여 나가면 되돌릴 수 없다:
       ① 장비류만 (물약·주문서·퀘스트 아이템은 절대 건드리지 않는다)
       ② 장착 중인 것 제외
       ③ 강화한 것(+1 이상) 제외 — 공들인 물건이다
       ④ [Tab] 무기 교체 대상(weaponPool) 제외 — 실전에서 쓰는 무기다
       ⑤ 「잡템」은 정가 1,500 은화 이하만. 그 이상은 「미장착 전부」 버튼으로 따로 판다.
   두 버튼 다 한 번 누르면 "몇 개 · 얼마" 를 보여 주고, 다시 눌러야 팔린다(오클릭 방지). */
var JUNK_EQT=["weapon","armor","helm","shield","cloak","boots","glove","ammo"];
var JUNK_MAX=1500;
function itemSellPrice(it){var d=ITEMS[it.k];return Math.max(5,Math.floor(d.pr*.4))+it.e*600;}
function junkList(all){
 if(!P)return [];
 var pool=(typeof swapUnlocked==="function"&&swapUnlocked()&&typeof weaponPool==="function")?weaponPool():[];
 return P.inv.filter(function(it){
   var d=ITEMS[it.k];
   if(!d||JUNK_EQT.indexOf(d.t)<0)return false;
   if(isEquipped(it))return false;
   if(it.e>0)return false;
   if(pool.indexOf(it)>=0)return false;
   if(!all&&(d.pr||0)>JUNK_MAX)return false;
   return true;
 });
}
function junkSum(list){var s=0;list.forEach(function(it){s+=itemSellPrice(it)*(it.q||1);});return s;}
function sellJunk(all){
 var list=junkList(all);
 if(!list.length){log("팔 잡템이 없습니다.","#888");return;}
 var sum=junkSum(list),n=list.length;
 list.forEach(function(it){removeItem(it,it.q||1);});
 P.gold+=sum;sfx("gold");
 log("잡템 "+n+"종을 정리해 <b>"+sum.toLocaleString()+"</b> 은화를 받았습니다."+
     (all?" <span style='color:#8a8068'>(미장착·강화0 장비 전부)</span>":
          " <span style='color:#8a8068'>(1,500 은화 이하 · 강화 0 · 미장착)</span>"),"#ffb27a");
 refreshInv();
 if(shopOpen&&typeof renderShop==="function")renderShop();
}
function useInn(){
 if(P.gold<50){log("숙박비 50 은화가 부족합니다.","#f88");return;}
 P.gold-=50;P.hp=P.mhp;P.mp=P.mmp;sfx("heal");
 log("따뜻한 식사와 휴식으로 체력과 마력이 모두 회복되었습니다. (-50 은화)","#8fd18f");
 refreshInv();refreshChar();
}
