/* ================= 인벤토리 ================= */
function addItem(k,q,e,opt){
 q=q||1;var d=ITEMS[k],i,j;
 if(d.t==="potion"||d.t==="scroll"||d.t==="ammo"||d.t==="quest"){   /* 재료·퀘스트품도 한 줄로 쌓는다 */
   for(i=0;i<P.inv.length;i++)if(P.inv[i].k===k){P.inv[i].q+=q;refreshInv();if(P.q)qCollectSync(k);return;}
   P.inv.push({k:k,q:q,e:0});
 }else for(j=0;j<q;j++){var it={k:k,q:1,e:e||0};if(opt)it.opt=opt;P.inv.push(it);}
 refreshInv();
 if(P&&P.q)qCollectSync(k);
 if(typeof qSyncCollect==="function")qSyncCollect();
}
function removeItem(it,q){var i=P.inv.indexOf(it);if(i<0)return;it.q-=(q||1);if(it.q<=0)P.inv.splice(i,1);refreshInv();}
function itemName(it){var d=ITEMS[it.k];var s=(it.e>0?'<span class="ench">+'+it.e+' </span>':'')+famTag(it)+d.n;
 if(it.q>1)s+=" ("+it.q+")";return s;}
function isEquipped(it){var i;for(i=0;i<SLOTS.length;i++)if(P.eq[SLOTS[i]]===it)return true;return false;}
function itemInfo(it){
 var d=ITEMS[it.k],s="";
 if(d.t==="weapon"){var fm=it.opt?it.opt.m:0;
   s="공격 "+(d.d1+enchEffW(it.e)-fm)+"~"+(d.d2+enchEffW(it.e)-fm)+(d.mag?" · 마력 +"+d.mag:"");
   if(it.opt)s+=" · <span style='color:#ffd24a'>"+famDesc(it)+"</span>";}
 else if(d.t==="ammo")s="공격력 +"+d.dmg;
 else if(d.ac!==undefined)s="AC "+((d.ac+enchEffA(it.e))>=0?"-":"+")+Math.abs(d.ac+enchEffA(it.e))+
   (d.mag?" · 마력 +"+d.mag:"")+(d.dex?" · DEX "+(d.dex>0?"+":"")+d.dex:"");
 else if(d.heal)s="HP "+d.heal+" 회복";
 else if(d.mana)s="MP "+d.mana+" 회복";
 else if(d.brave)s="공격 속도 증가 (90초)";
 else if(d.lit)s="던전 시야 +"+d.lit+" ("+Math.floor(d.litdur/60)+"분)";
 else if(d.cure)s=(d.cure==="poison"?"중독":"출혈")+" 해제";
 else if(d.ret)s="마을로 즉시 귀환";
 else if(d.tf)s="변신 (레벨별 해금)";
 else if(d.tfdk)s="데스 나이트 변신을 영구 해금";
 else if(d.ench==="weapon")s=d.bless?"무기 강화 · 안전 +6, 고강화 성공률 3배":"무기 강화 · 안전 +6, 초과 실패 시 파괴";
 else if(d.ench==="acc")s="방어구 강화 · 안전 +4, 초과 실패 시 파괴";
 if(it.e>0&&d.t!=="weapon"&&d.ac!==undefined)s+=" (강화 +"+it.e+")";
 if(d.h2)s+=" 〔양손 — 방패 불가〕";
 if(d.cls&&d.cls.length<3)s+=" 〔"+d.cls.split("").map(function(c){return CLS[c].n;}).join("·")+" 전용〕";
 return s;
 if(typeof qSyncCollect==="function")qSyncCollect();
}
function equipIt(it){
 var d=ITEMS[it.k],slot=d.t;
 if(SLOTN[slot]===undefined){log("장착할 수 없는 물건입니다.","#888");return;}
 if(isEquipped(it)){P.eq[slot]=null;log(iga(d.n)+" 해제되었습니다.","#aaa");}
 else{
   if(!canUse(it.k)){log("<b>"+d.n+"</b>"+josa(d.n,"은","는")+" "+CLS[P.cls].n+"가 사용할 수 없습니다.","#f88");return;}
   /* 양손 무기 규칙 — 방패와 동시 장착 불가. 양손 무기는 그만큼 공격력이 높다. */
   if(slot==="weapon"&&d.h2&&P.eq.shield){
     log(ITEMS[P.eq.shield.k].n+"를 내려놓고 양손으로 잡습니다.","#ffb27a");P.eq.shield=null;}
   if(slot==="shield"&&P.eq.weapon&&ITEMS[P.eq.weapon.k].h2){
     log("양손 무기를 들고는 방패를 들 수 없습니다. 무기를 먼저 바꾸십시오.","#f88");return;}
   P.eq[slot]=it;log(eul(d.n)+" 장착했습니다.","#7CFC00");sfx("pot");
 }
 refreshInv();refreshChar();
}
function useIt(it){
 var d=ITEMS[it.k];
 if(d.t==="ammo"){equipIt(it);return;}
 if(d.t==="potion"){
   if(d.heal){if(P.hp>=P.mhp){log("체력이 이미 가득 찼습니다.","#888");return;}
     P.hp=Math.min(P.mhp,P.hp+d.heal+ri(0,5));log(eul(d.n)+" 마셨습니다.","#8fd18f");sfx("pot");removeItem(it);
     if(typeof repOnPot==="function")repOnPot();}   /* R26 플레이 기록 — 물약 사용 수 */
   else if(d.mana){if(P.mp>=P.mmp){log("마력이 이미 가득 찼습니다.","#888");return;}
     P.mp=Math.min(P.mmp,P.mp+d.mana+ri(0,4));log(eul(d.n)+" 마셨습니다.","#8fb0ff");sfx("pot");removeItem(it);}
   else if(d.brave){P.braveT=T+90;log("용기가 솟아오릅니다! (공격 속도 증가 90초)","#ffd27a");sfx("buff");removeItem(it);}
   else if(d.cure){
     if(!dotCure(d.cure)){log(TX("dot.none"),"#888");return;}
     removeItem(it);}
   else if(d.lit){
     /* 던전 광원. blit 버프값이 19_render.js 의 시야 반경에 그대로 더해진다. */
     if(buffV("blit")>=d.lit&&buffRemain("blit")>d.litdur*0.5){
       log("더 밝은 불이 이미 켜져 있습니다.","#888");return;}
     applyBuff(d.n,d.litdur,{blit:d.lit});removeItem(it);
     log("어둠이 물러납니다. ("+Math.floor(d.litdur/60)+"분)","#ffd27a");}
 }else if(d.t==="scroll"){
   if(d.ret){if(P.zone===0){log("이미 마을입니다.","#888");return;}removeItem(it);travel(0,10,9);
     log("귀환 주문서의 힘으로 마을로 돌아왔습니다.","#9fe2ff");}
   else if(d.tf)openTf(it);
   else if(d.tfdk){
     /* 소모형 변신에서 영구 해금형으로 변경. 이미 해금돼 있으면 소모하지 않는다. */
     if(unlockTf("dk")){removeItem(it);sfx("ench");
       log("각인이 살갗을 파고듭니다. <b>데스 나이트</b> 변신이 영구히 해금되었습니다.","#c07aff");}
     else log("이미 해금된 변신입니다. 변신창(주문서 없이)에서 언제든 쓸 수 있습니다.","#888");}
   else if(d.ench){enchState={scroll:it,type:d.ench,bless:d.bless||0};
     document.getElementById("enchhint").style.display="block";openP("inv");
     log("강화할 장비를 인벤토리에서 선택하십시오.","#ffb27a");}
 }
 refreshInv();
}
var enchBusy=false;
/* 강화 수치별 연출 색·강도. 안전 구간을 넘어설수록(=돌파) 뜨거워진다. */
var ENCHTIER=[
 {at:0,  c:"#4aa0ff", r:110, n:""},
 {at:5,  c:"#7ad8ff", r:140, n:""},
 {at:7,  c:"#c9a6ff", r:170, n:"돌파"},
 {at:9,  c:"#ffb35c", r:210, n:"고돌파"},
 {at:11, c:"#ff6a4a", r:250, n:"극돌파"}
];
function enchTier(lv){var t=ENCHTIER[0],i;for(i=0;i<ENCHTIER.length;i++)if(lv>=ENCHTIER[i].at)t=ENCHTIER[i];return t;}
function enchFx(lv,hot){
 var t=enchTier(lv),ov=document.getElementById("enchov"),ei=document.getElementById("enchitem"),
     rg=document.getElementById("enchring");
 ov.style.setProperty("--ec",t.c);
 ov.className="overlay"+(hot?" glow":"");
 ei.className=hot&&lv>=7?"hot":"";
 if(rg){
   var cnt=Math.min(4,1+Math.floor(lv/3));
   var kids=rg.children,i;
   for(i=0;i<kids.length;i++){
     kids[i].style.display=i<cnt?"block":"none";
     kids[i].style.width=kids[i].style.height=(t.r-i*18)+"px";
     kids[i].style.borderWidth=(lv>=9?3:2)+"px";
     kids[i].style.boxShadow="0 0 "+(10+lv*2)+"px "+t.c;
   }
   rg.style.display=hot?"block":"none";
 }
 return t;
}
function tryEnch(it){
 if(enchBusy)return;
 var st=enchState;if(!st)return;
 var d=ITEMS[it.k];
 var ok=(st.type==="weapon"&&d.t==="weapon")||(st.type==="acc"&&["armor","helm","shield","cloak","boots","glove"].indexOf(d.t)>=0);
 if(!ok){log("이 주문서로 강화할 수 없는 장비입니다.","#f88");return;}
 removeItem(st.scroll);enchState=null;document.getElementById("enchhint").style.display="none";
 enchBusy=true;
 var safe=(d.t==="weapon")?6:4;
 var nm=(it.e>0?"+"+it.e+" ":"")+d.n;
 var success=(it.e<safe)||ch(Math.min(0.9,(st.bless?0.5:1/3)+0.08*metaLv("enchp")));   /* 메타: 강화 확률 */
 var up=1;if(success&&st.bless&&ch(.15))up=2;
 var ov=document.getElementById("enchov"),ei=document.getElementById("enchitem"),er=document.getElementById("enchres");
 var tier=enchFx(it.e+up,true);
 ov.style.display="block";ei.textContent="✦ "+nm+" ✦";ei.style.color=tier.c;er.textContent="";
 log("주문서의 마력이 "+nm+"에 스며듭니다...","#9fe2ff");sfx("roll");
 if(it.e>=safe){log("<b>안전 구간을 넘어섭니다.</b> 실패하면 사라집니다...","#ff9a6a");shake(1.2,.5);}
 setTimeout(function(){
   if(success){
     it.e+=up;
     var tr=enchFx(it.e,true);
     ei.style.color="#ffffff";
     er.textContent=(tr.n?tr.n+" ":"")+"성 공 !  +"+it.e;
     er.style.color=tr.c;er.style.textShadow="0 0 26px "+tr.c+",0 0 60px "+tr.c;
     sfx("ench");shake(it.e>=7?3.4:1.5,it.e>=7?.4:.15);
     spark(P.fx,P.fy,tr.c,10+it.e*3,1.4+it.e*0.12);
     if(it.e>=7)log("<b style='color:"+tr.c+"'>"+nm.replace(/^\+\d+ /,"")+"</b>에서 "+
       (it.e>=11?"불길":(it.e>=9?"열기":"보랏빛"))+"이 피어오릅니다. <b>+"+it.e+"</b>","#ffd27a");
     var effN=(d.t==="weapon")?enchEffW(it.e):enchEffA(it.e);
     log(iga(nm)+" "+((d.t==="weapon")?"검푸른 빛":"하얀 빛")+"을 발합니다. <b>(+"+it.e+
         (effN>it.e?" · 실효 +"+effN:"")+")</b>","#7fc7ff");
     if(up===2)log("축복의 힘으로 강화 수치가 2 올랐습니다!","#e8d36e");
     if(it.e>=7)log("주위에서 감탄의 눈길이 느껴집니다...","#e8d36e");
   }else if(metaLv("charm")>0){
     /* 메타: 수호의 부적 — 파괴를 1회 막고 소진 */
     META.nodes.charm--;metaSave();
     ei.style.color="#c9a6ff";
     er.textContent="부적이 빛을 삼켰다";er.style.color="#c9a6ff";er.style.textShadow="0 0 24px #c9a6ff";
     sfx("buff");shake(2,.2);
     log("<b>수호의 부적</b>이 파괴를 막고 부서졌습니다. (남은 부적 "+META.nodes.charm+")","#c9a6ff");
   }else{
     if(isEquipped(it))P.eq[d.t]=null;
     removeItem(it);
     enchFx(0,false);
     ei.style.color="#553333";
     er.textContent="파 괴 . . .";er.style.color="#ff5555";er.style.textShadow="0 0 24px #a00";
     sfx("boom");shake(4,.4);
     log(iga(nm)+" 강렬한 빛을 내며 <b>파괴되었습니다.</b>","#ff5555");
   }
   refreshInv();refreshChar();
   setTimeout(function(){ov.style.display="none";ov.className="overlay";
     document.getElementById("enchring").style.display="none";enchBusy=false;},1000);
 },1300);
}

/* 안전 구간(무기 +6 / 방어구 +4)까지 주문서 연속 사용 — 이 구간은 성공 100%, 파괴 없음 */
function bulkEnch(it,n){
 if(enchBusy)return;
 var st=enchState;if(!st)return;
 var d=ITEMS[it.k];
 var ok=(st.type==="weapon"&&d.t==="weapon")||(st.type==="acc"&&["armor","helm","shield","cloak","boots","glove"].indexOf(d.t)>=0);
 if(!ok){log("이 주문서로 강화할 수 없는 장비입니다.","#f88");return;}
 var safe=(d.t==="weapon")?6:4;
 n=Math.min(n,safe-it.e,st.scroll.q||1);
 if(n<=0){log("이미 안전 구간입니다. 그 이상은 한 장씩 확인하며 진행하십시오.","#888");return;}
 var from=it.e;
 removeItem(st.scroll,n);
 enchState=null;document.getElementById("enchhint").style.display="none";
 enchBusy=true;
 var ov=document.getElementById("enchov"),ei=document.getElementById("enchitem"),er=document.getElementById("enchres");
 ov.style.display="block";ei.style.color="#9fe2ff";er.textContent="";
 var i=0;
 function step(){
   if(i>=n){
     er.textContent="+"+it.e+" 완료";er.style.color="#7fc7ff";er.style.textShadow="0 0 24px #4aa0ff";
     log("주문서 "+n+"장을 사용해 <b>"+d.n+"</b> +"+from+" → <b>+"+it.e+"</b> (안전 구간)","#7fc7ff");
     if(it.e>=safe)log("여기서부터는 실패 시 파괴됩니다. 한 장씩 신중히 진행하십시오.","#ffb27a");
     refreshInv();refreshChar();
     setTimeout(function(){ov.style.display="none";ov.className="overlay";
       document.getElementById("enchring").style.display="none";enchBusy=false;},900);
     return;
   }
   it.e++;i++;
   var tb=enchFx(it.e,true);
   ei.textContent="✦ +"+it.e+" "+d.n+" ✦";ei.style.color=tb.c;
   sfx("ench");shake(1,.1);
   setTimeout(step,260);
 }
 sfx("roll");setTimeout(step,320);
}
var dragIdx=-1;
function moveInv(a,b){if(a===b||a<0||b<0||a>=P.inv.length||b>=P.inv.length)return;
 var it=P.inv.splice(a,1)[0];P.inv.splice(b,0,it);refreshInv();}
var ORD={weapon:0,armor:1,helm:2,shield:3,cloak:4,boots:5,glove:6,ammo:7,potion:8,scroll:9};
function sortInv(){if(!P)return;
 P.inv.sort(function(a,b){
   var x=ORD[ITEMS[a.k].t],y=ORD[ITEMS[b.k].t];
   if(x===undefined)x=99;if(y===undefined)y=99;
   if(x!==y)return x-y;
   if(ITEMS[a.k].n<ITEMS[b.k].n)return -1;if(ITEMS[a.k].n>ITEMS[b.k].n)return 1;
   return b.e-a.e;});
 refreshInv();log("인벤토리를 종류별로 정렬했습니다.","#888");}
/* R27 — 부위별 자리 배치(사람 모양). 대표 지시: "왼쪽은 장비 착용상태 아이콘도 크게해서
   부위별로 위치에 장착하고있는 모양으로". 3열 격자에 머리-몸-손-발 순서로 앉힌다. */
var DOLL=[
 {sl:"helm",   r:1,c:2},{sl:"cloak", r:1,c:3},
 {sl:"weapon", r:2,c:1},{sl:"armor", r:2,c:2},{sl:"shield",r:2,c:3},
 {sl:"glove",  r:3,c:1},{sl:"boots", r:3,c:2},{sl:"ammo",  r:3,c:3}
];
function refreshInv(){
 if(!P)return;
 var eg=document.getElementById("eqdoll");
 eg.innerHTML="";
 DOLL.forEach(function(sp){
   var sl=sp.sl,it=P.eq[sl];
   var cell=document.createElement("div");cell.className="dcell"+(it?"":" empty");
   cell.style.gridRow=sp.r;cell.style.gridColumn=sp.c;
   var slot=document.createElement("div");slot.className="dslot";
   if(it){slot.appendChild(icoEl(it.k,"ico"));bindTip(slot,it);
     if(it.e>0){var e=document.createElement("i");e.className="eqench";e.textContent="+"+it.e;slot.appendChild(e);}
     slot.title=ITEMS[it.k].n+" — 누르면 해제";
     slot.onclick=function(){
       if(enchState){                                     /* 강화 대기 중이면 장착품도 강화 대상 */
         if(typeof facPick==="function"){facPick(it.k,it,"ench");return;}
         tryEnch(it);return;
       }
       if(typeof facPick==="function"&&typeof FAC!=="undefined"&&FAC.open){facPick(it.k,it,null);return;}
       equipIt(it);};
   }else{slot.innerHTML='<b class="eqx">·</b>';slot.title=SLOTN[sl]+" 자리 — 비어 있음";}
   cell.appendChild(slot);
   var lb=document.createElement("div");lb.className="dsl";lb.textContent=SLOTN[sl];
   cell.appendChild(lb);
   var nm=document.createElement("div");nm.className="dnm";
   nm.textContent=it?(it.e>0?"+"+it.e+" ":"")+ITEMS[it.k].n:"";
   cell.appendChild(nm);
   eg.appendChild(cell);
 });
 var tot=document.getElementById("eqtot");
 if(tot)tot.innerHTML="은화 <b>"+P.gold.toLocaleString()+"</b>　　Armor Class "+acShow();
 var L=document.getElementById("invlist");L.innerHTML="";
 /* R24 — 판매 모드(상점의 「판매하기」로 들어온 경우)에는 **팔 수 있는 것만** 보여 준다.
    장착 중인 것은 실수로 팔리면 안 되니 목록에서 빼고, 순서 이동(▲▼)·강화 버튼도 감춰
    "판매" 한 가지 행동만 남긴다. 대표 지시: "구매목록 / 판매 가능목록 을 띄우거나". */
 var sellOnly=(typeof FAC!=="undefined"&&FAC.open&&FAC.step==="sell");
 if(sellOnly){
   var hd0=document.createElement("div");hd0.className="invspan";
   hd0.style.cssText="color:#ffb27a;font-size:12px;letter-spacing:1px;padding:2px 2px 6px";
   hd0.textContent="판매 가능 목록 — 장착 중인 장비는 빠져 있습니다.";
   L.appendChild(hd0);
   /* R24b 일괄 판매 — 규칙과 예상 금액을 버튼에 적어 둔다(무엇이 팔리는지 눌러 보기 전에 보이게) */
   if(typeof junkList==="function"){
     var jb=document.createElement("div");jb.className="invspan";
     jb.style.cssText="display:flex;gap:6px;flex-wrap:wrap;padding:0 2px 8px;border-bottom:1px solid #221d33;margin-bottom:5px";
     [[false,"잡템 일괄 판매","정가 1,500 은화 이하 · 강화 0 · 미장착 장비만"],
      [true, "미장착 장비 전부 판매","강화 0 · 미장착 · [Tab] 교체 무기 제외"]].forEach(function(spec){
       var list=junkList(spec[0]),sum=junkSum(list);
       var b=document.createElement("button");
       b.className="ib"+(spec[0]?" sell":"");
       b.title=spec[2];
       b.disabled=!list.length;
       b.style.opacity=list.length?"1":".4";
       b.textContent=spec[1]+" ("+list.length+"종 · "+sum.toLocaleString()+")";
       b.onclick=function(){
         if(!list.length)return;
         if(b.dataset.c==="1"){sellJunk(spec[0]);return;}
         b.dataset.c="1";b.textContent="정말 팔까요? ("+list.length+"종 · "+sum.toLocaleString()+")";
         setTimeout(function(){if(b.isConnected){b.dataset.c="";b.textContent=spec[1]+" ("+list.length+"종 · "+sum.toLocaleString()+")";}},2600);
       };
       jb.appendChild(b);
     });
     L.appendChild(jb);
   }
 }
 /* R27 — 아이콘만 4열 격자로 쭉. 이름·수치·버튼은 누르면 오른쪽 상세 패널(#facinfo)에 크게 뜬다.
    대표 지시: "지금 일렬로 쭉있는데 아이콘만 병렬로 4줄 ... 클릭하면 자세하게 보이는 형태로". */
 P.inv.forEach(function(it,idx){
   if(sellOnly&&isEquipped(it))return;
   var d=ITEMS[it.k],eqd=isEquipped(it),usable=canUse(it.k);
   var cell=document.createElement("div");
   cell.className="icell"+(eqd?" eqd":"")+(usable?"":" no");
   cell.draggable=true;
   cell.addEventListener("dragstart",function(e){dragIdx=idx;try{e.dataTransfer.setData("text/plain",""+idx);}catch(ex){}});
   cell.addEventListener("dragover",function(e){e.preventDefault();cell.classList.add("dragover");});
   cell.addEventListener("dragleave",function(){cell.classList.remove("dragover");});
   cell.addEventListener("drop",function(e){e.preventDefault();cell.classList.remove("dragover");moveInv(dragIdx,idx);dragIdx=-1;});
   var ic=icoEl(it.k);cell.appendChild(ic);
   bindTip(cell,it);
   var poolMark=(d.t==="weapon"&&typeof swapUnlocked==="function"&&swapUnlocked()&&weaponPool().indexOf(it)>=0)?" ⇄":"";
   cell.title=itemName(it).replace(/<[^>]+>/g,"")+(eqd?" [장착]":"")+poolMark+" — "+itemInfo(it).replace(/<[^>]+>/g,"");
   if(it.q>1){var q=document.createElement("i");q.className="icq";q.textContent=it.q;cell.appendChild(q);}
   if(it.e>0){var en=document.createElement("i");en.className="ice";en.textContent="+"+it.e;cell.appendChild(en);}
   if(eqd){var em=document.createElement("i");em.className="iceq";em.textContent="착";cell.appendChild(em);}
   cell.onclick=function(){
     /* R30 — 강화 주문서를 쓰는 중이면 **확인창**을 띄운다.
        대표 리포트 2건을 여기서 함께 고친다:
          ① "안전 구간까지 한 번에 올리던 옵션이 사라졌다" — 예전 격자 클릭은 곧바로 단발 강화(tryEnch)로
             빠져서 「+6까지(n회)」 버튼에 닿을 길이 아예 없었다(그 버튼은 상세창에만 있었다).
          ② "확인 아이콘이 오른쪽 끝에 있어 클릭이 불편하다" — 이 창은 화면 **가운데**로 띄운다(mode:"ench"). */
     if(enchState&&["weapon","armor","helm","shield","cloak","boots","glove"].indexOf(d.t)>=0){
       if(typeof facPick==="function"){facPick(it.k,it,"ench");return;}
       tryEnch(it);return;
     }
     var q=document.querySelectorAll("#invlist .icell.on"),i;
     for(i=0;i<q.length;i++)q[i].classList.remove("on");
     cell.classList.add("on");
     if(typeof facPick==="function"){facPick(it.k,it,sellOnly?"sell":null);return;}
     /* 상세 패널이 없는 옛 경로 대비 — 바로 쓰거나 장착한다 */
     if(d.t==="potion"||d.t==="scroll")useIt(it);else if(SLOTN[d.t]!==undefined)equipIt(it);
   };
   /* 두 번 누르면 곧바로 장착/사용 — 정리할 때 빠르게 */
   cell.ondblclick=function(){
     if(sellOnly||enchState)return;
     if(d.t==="potion"||d.t==="scroll")useIt(it);else if(SLOTN[d.t]!==undefined)equipIt(it);
   };
   L.appendChild(cell);
 });
 if(!P.inv.length){
   var emp=document.createElement("div");emp.className="invspan";
   emp.style.cssText="color:#5a5270;font-size:11px;padding:10px 2px";
   emp.textContent="가진 것이 없습니다.";
   L.appendChild(emp);
 }
 if(typeof facInfoRefresh==="function")facInfoRefresh();
 refreshQuick();
}
function cntItem(k){var n=0;P.inv.forEach(function(it){if(it.k===k)n+=it.q;});return n;}   /* 합산 — 낱개 항목도 센다 */
function usePotKey(k){if(!P||!started)return;
 for(var i=0;i<P.inv.length;i++)if(P.inv[i].k===k){useIt(P.inv[i]);return;}
 log(iga(ITEMS[k].n)+" 없습니다.","#888");}
/* 귀환 각인 단축키(G). 종류가 늘어도 ret 플래그만 보므로 아이템 키에 의존하지 않는다. */
function useReturnScroll(){
 if(!P||!started)return;
 if(P.zone===0){log("이미 마을입니다.","#888");return;}
 for(var i=0;i<P.inv.length;i++){var d=ITEMS[P.inv[i].k];if(d&&d.ret){useIt(P.inv[i]);return;}}
 log("귀환 각인이 없습니다.","#888");
}
