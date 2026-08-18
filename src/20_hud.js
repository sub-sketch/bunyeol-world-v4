/* ================= HUD ================= */
var BUFFNOW={};
function buffTip(id,x,y){
 var b=BUFFNOW[id];if(!b||typeof ttipEl==="undefined")return;
 var h="<b>"+b.n+"</b>";
 if(b.sec===null)h+="<div class='gr'>지속 — 해제 시까지</div>";
 else{
   var pc=b.tot?Math.round(100*b.sec/b.tot):null;
   h+="<div>"+Math.ceil(b.sec)+"초 남음"+(pc!==null?" · "+pc+"%":"")+"</div>";
 }
 ttipEl.innerHTML=h;ttipEl.style.display="block";
 var w=ttipEl.offsetWidth,hh=ttipEl.offsetHeight;
 ttipEl.style.left=Math.min(window.innerWidth-w-8,x+14)+"px";
 ttipEl.style.top=Math.max(6,Math.min(window.innerHeight-hh-8,y-10))+"px";
}
function refreshHud(){
 if(!P)return;
 document.getElementById("hpb").style.width=clamp(P.hp/P.mhp*100,0,100)+"%";
 document.getElementById("mpb").style.width=clamp(P.mp/P.mmp*100,0,100)+"%";
 document.getElementById("hpt").textContent="HP : "+Math.ceil(P.hp)+" / "+P.mhp;
 document.getElementById("mpt").textContent="MP : "+Math.floor(P.mp)+" / "+P.mmp;
 document.getElementById("lvn").textContent=P.lv;
 var gg=gradeOf(P.lv);
 var gel=document.getElementById("gradelbl");
 if(gel){
   /* 계시: 런 중 문신 수만큼 이능 등급이 임시로 짙어 보인다 — 괄호 표기만, 저장 안 함 */
   var rg=(typeof revGradeLabel==="function")?revGradeLabel():null;
   gel.textContent=gg[1]+(rg?" ("+rg[1]+")":"");
   gel.style.color=rg?rg[2]:gg[2];
 }
 document.getElementById("xpp").textContent=(clamp(P.xp/need(P.lv)*100,0,100)).toFixed(2)+"%";
 document.getElementById("xpbar").style.width=clamp(P.xp/need(P.lv)*100,0,100)+"%";
 document.getElementById("tright").textContent="은화: "+P.gold.toLocaleString();
 document.getElementById("tleft").textContent="노스가드  |  "+P.name+" ("+CLS[P.cls].n+")"+
   (P.tf?" [변신: "+TFS[P.tf].n+"]":"")+"  |  AC "+acShow()+"  |  "+ZONES[curZ].name;
 var acb=document.getElementById("acbtn");
 if(acb){var am=autoMode();
   acb.textContent="⚔ "+AUTO_LABEL[am];
   acb.style.color=(am==="hunt")?"#ffb27a":(am==="react"?"#c8b070":"#6b6046");}
 var ask=document.getElementById("askbtn");
 if(ask){ask.textContent="✦ 자동 스킬 "+(P.autoSkill?"ON":"OFF");
   ask.style.color=P.autoSkill?"#c9a6ff":"#6b6046";}
 /* R25 — 자동 물약을 상단바로 끌어올렸다. 기능은 전부터 있었지만 스킬창 맨 아래에 숨어 있어
    "체력 %에 따라 자동으로 마시는 메뉴"를 못 찾으셨다(대표 리포트). 여기서 켜고, 기준치는
    누르면 열리는 스킬창(자동 물약 절)에서 5% 단위로 조절한다. */
 var apb=document.getElementById("apbtn");
 if(apb){
   if(!P.ap)P.ap=apDefault();
   apb.textContent="✚ 자동 물약 "+(P.ap.on?("HP "+P.ap.hp+"%"):"OFF");
   apb.style.color=P.ap.on?"#8fd18f":"#6b6046";
   apb.title=P.ap.on?("체력 "+P.ap.hp+"% 이하에서 회복제를 자동으로 마십니다"
     +(P.cls!=="k"?(" · 마나 "+P.ap.mp+"% 이하에서 마나 회복제"):"")+" — 우클릭: 기준치 조절창")
     :"체력이 일정 % 이하로 떨어지면 물약을 자동으로 마십니다 (클릭: 켜기)";
 }
 var asw=document.getElementById("aswbtn");
 if(asw){var swOk=(typeof swapUnlocked==="function")&&swapUnlocked();
   asw.style.display=swOk?"":"none";            /* 검 스위칭을 해금해야 보인다 */
   asw.textContent="⇄ 자동 무기 "+(P.autoSwap?"ON":"OFF");
   asw.style.color=P.autoSwap?"#ffd24a":"#6b6046";}
 /* 지속효과 — 아이콘으로 표시, 커서를 올리면 이름·남은 시간·잔여율 툴팁 (대표 지시) */
 var bl=[],seen={},bk;
 function bicon(id,n,sec,col,ch,svg){bl.push({id:id,n:n,sec:sec,col:col,ch:ch,svg:svg});}
 if(P.tf)bicon("tf","변신 "+TFS[P.tf].n,P.tfT?Math.max(0,P.tfT-T):null);
 if(P.dot){var dk;for(dk in P.dot){if(dotRemain(dk))bicon("dot_"+dk,TX("dot.hud."+dk),dotRemain(dk));}}
 if(T<P.braveT)bicon("brave","용기의 물약",P.braveT-T);
 for(bk in P.buffs){
   var bb=P.buffs[bk];
   if(!bb||T>=bb.t)continue;
   var nm=bb.n||bk;
   if(seen[nm])continue;                       /* 한 축복이 여러 효과를 줘도 하나만 */
   seen[nm]=1;bicon("bf_"+bk,nm,bb.t-T);
 }
 if(typeof revIcons==="function")revIcons(bicon);   /* 계시: 문신 아이콘(런 내 상시, 계열색) */
 var bel=document.getElementById("buffline");
 refreshHud.bmax=refreshHud.bmax||{};
 BUFFNOW={};
 bl.forEach(function(b){
   BUFFNOW[b.id]=b;
   if(b.sec!==null){
     if(!refreshHud.bmax[b.id]||b.sec>refreshHud.bmax[b.id])refreshHud.bmax[b.id]=b.sec;
     b.tot=refreshHud.bmax[b.id];
   }
 });
 var sig=bl.map(function(b){return b.id;}).join("|");
 if(sig!==refreshHud.bsig){                    /* 구성이 바뀔 때만 다시 만든다 — 호버 유지 */
   refreshHud.bsig=sig;
   bel.innerHTML="";
   bl.forEach(function(b){
     var d=document.createElement("div");d.className="bic";d.id="bic_"+b.id;
     var g=document.createElement("span");
     if(b.svg)g.innerHTML=b.svg;else g.textContent=b.ch||(b.n||"?").charAt(0);   /* 계시는 계열 문양(SVG) */
     d.appendChild(g);
     if(b.col){d.style.borderColor=b.col;g.style.color=b.col;}   /* 계시 문신 — 계열색 테두리 */
     var rb=document.createElement("i");rb.className="rb";d.appendChild(rb);
     d.addEventListener("mouseenter",function(e){buffTip(b.id,e.clientX,e.clientY);});
     d.addEventListener("mouseleave",function(){if(typeof hideTip==="function")hideTip();});
     d.addEventListener("touchstart",function(e){var t=e.touches[0];
       buffTip(b.id,t.clientX-120,t.clientY);setTimeout(function(){if(typeof hideTip==="function")hideTip();},2200);},{passive:true});
     bel.appendChild(d);
   });
 }
 bl.forEach(function(b){                        /* 매 프레임: 잔여 바·경고색만 갱신 */
   var d=document.getElementById("bic_"+b.id);if(!d)return;
   d.className="bic"+(b.sec!==null&&b.sec<30?" low":"");
   var rb=d.querySelector(".rb");
   if(rb)rb.style.width=(b.sec===null?100:Math.max(4,Math.round(100*b.sec/(b.tot||b.sec||1))))+"%";
 });
 bel.className=bl.length?"on":"";
 if(Math.floor(T*4)!==refreshHud.last){refreshHud.last=Math.floor(T*4);refreshQuick();refreshHunt();}
}
