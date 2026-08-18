/* ================= QoL 모듈 (v2) ================= */
/* 유사 2D MMO 표준 편의기능: 미니맵 / 타겟 정보 / 자동 물약 / 아이템 툴팁·착용비교 / 사냥 통계 */

/* ---------- 미니맵 ---------- */
var mapOn=true, mmapT=0;
var mcv=document.getElementById("mmap"), mctx=mcv.getContext("2d");
mctx.imageSmoothingEnabled=false;
function toggleMap(){mapOn=!mapOn;OPT.minimap=mapOn;optSave();applyHud();
 if(document.getElementById("opt").style.display==="block")renderOpt();}
function drawMinimap(){
 if(!mapOn||!started||!P)return;
 if(T-mmapT<0.18)return;
 mmapT=T;
 var z=world[curZ],d=z.def,W=mcv.width,H=mcv.height;
 var sc=Math.min((W-8)/d.w,(H-8)/d.h);
 var ox=(W-d.w*sc)/2, oy=(H-d.h*sc)/2;
 mctx.clearRect(0,0,W,H);
 mctx.fillStyle="rgba(10,8,18,.55)";mctx.fillRect(0,0,W,H);
 var x,y;
 for(y=0;y<d.h;y++)for(x=0;x<d.w;x++){
   mctx.fillStyle=z.g[y][x]?"rgba(38,32,56,.92)":"rgba(150,160,132,.62)";
   mctx.fillRect(ox+x*sc,oy+y*sc,Math.ceil(sc),Math.ceil(sc));
 }
 d.gates.forEach(function(g){mctx.fillStyle="#7fdfff";mctx.fillRect(ox+g.x*sc-1,oy+g.y*sc-1,sc+2,sc+2);});
 d.npcs.forEach(function(n){mctx.fillStyle="#ffd24a";mctx.fillRect(ox+n.x*sc-1,oy+n.y*sc-1,sc+2,sc+2);});
 var k;
 for(k in LORE){var l=LORE[k];
   if(l.z===curZ&&!P.lore[k]){mctx.fillStyle="#9fe2ff";mctx.fillRect(ox+l.x*sc-1,oy+l.y*sc-1,sc+2,sc+2);}}
 z.mobs.forEach(function(m){
   if(m.dead)return;
   mctx.fillStyle=m.d.boss?"#ff3020":(m.d.mini?"#ffb060":((m.d.ag||m.prov)?"#e05a5a":"#8fd18f"));
   var sz=(m.d.boss||m.d.mini)?sc+2:sc;
   mctx.fillRect(ox+m.fx*sc-sz/2,oy+m.fy*sc-sz/2,Math.max(2,sz),Math.max(2,sz));
 });
 (z.fnpc||[]).forEach(function(n){
   if(n.dead)return;
   mctx.fillStyle=isFoe(P.fac||"player",n.fac)?"#ff8a6a":facColor(n.fac);
   var ns=n.d.elite?sc+2:sc;
   mctx.fillRect(ox+n.fx*sc-ns/2,oy+n.fy*sc-ns/2,Math.max(2,ns),Math.max(2,ns));
 });
 mctx.fillStyle="#fff";mctx.fillRect(ox+P.fx*sc-1.5,oy+P.fy*sc-1.5,3,3);
 mctx.strokeStyle="rgba(255,255,255,.5)";mctx.lineWidth=1;
 mctx.strokeRect(ox+P.fx*sc-4,oy+P.fy*sc-4,8,8);
 document.getElementById("mmaplbl").textContent=d.name;
}
/* ---------- 타겟 정보 ---------- */
function drawTargetInfo(){
 var el=document.getElementById("tinfo");
 var m=P&&P.tgt;
 if(!m||m.dead){el.className="";return;}
 el.className="on";
 var d=m.d, mx=m.npc?m.mhp:d.hp, hp=clamp(m.hp/mx,0,1);
 var nc,tag;
 if(m.npc){nc=facColor(m.fac);tag=facName(m.fac);}
 else{
   nc=d.boss?"#ff6060":(d.mini?"#ffb060":((d.ag)?"#ff9a9a":(m.prov?"#ff8a6a":"#9fe0a0")));
   tag=d.ag?"선공":(m.prov?"격노":"비선공");
 }
 document.getElementById("tinfon").innerHTML="<span style='color:"+nc+"'>"+d.n+"</span> "+
   "<span style='color:#9a8f6a;font-size:10px'>Lv"+d.lv+" · "+tag+"</span>";
 document.getElementById("tinfof").style.width=(hp*100)+"%";
 document.getElementById("tinfop").textContent=Math.ceil(m.hp)+" / "+mx;
}
/* ---------- 자동 물약 ---------- */
var autoPotT=0;
function apDefault(){return {on:false,hp:50,mp:25};}
function toggleAutoPot(){
 if(!P)return;
 if(!P.ap)P.ap=apDefault();
 P.ap.on=!P.ap.on;
 log("자동 물약을 "+(P.ap.on?("켰습니다 — 체력 "+P.ap.hp+"% 이하에서 자동으로 마십니다"):"껐습니다")+".",
     P.ap.on?"#8fd18f":"#888");
 refreshSkillPanel();
 if(typeof refreshHud==="function")refreshHud();
}
/* R25 — 기준치 조절창 열기(상단바 ✚ 우클릭 / 스킬창 하단과 같은 절). */
function openAutoPot(){
 if(typeof openP!=="function")return;
 openP("skillp");
 var box=document.getElementById("skillp"),ap=document.getElementById("apot");
 if(box&&ap&&ap.scrollIntoView)try{ap.scrollIntoView({block:"center"});}catch(e){}
 log("자동 물약 기준치는 여기서 5% 단위로 조절합니다.","#9fe2ff");
}
function apAdj(kind,dv){
 P.ap[kind]=clamp(P.ap[kind]+dv,0,95);refreshSkillPanel();}
function autoPotTick(){
 if(!P||!P.ap||!P.ap.on||deadFlag)return;
 if(T-autoPotT<1.0)return;
 var hpP=P.hp/P.mhp*100, mpP=P.mp/P.mmp*100;
 if(hpP<=P.ap.hp){
   var h=null;
   if(cntItem("hpot2")&&hpP<=P.ap.hp*0.6)h="hpot2";
   else if(cntItem("hpot"))h="hpot";
   else if(cntItem("hpot2"))h="hpot2";
   if(h){autoPotT=T;usePotKey(h);return;}
 }
 if(P.cls!=="k"&&mpP<=P.ap.mp){
   var mp=cntItem("mpot")?"mpot":(cntItem("mpot2")?"mpot2":null);
   if(mp){autoPotT=T;usePotKey(mp);}
 }
}
/* ---------- 아이템 툴팁 + 착용 비교 ---------- */
var ttipEl=document.getElementById("ttip");
function statLines(k,e){
 var d=ITEMS[k],L=[];
 if(d.t==="weapon"){L.push(["공격력",(d.d1+enchEffW(e))+"~"+(d.d2+enchEffW(e))]);if(d.mag)L.push(["마력",d.mag]);}
 /* R26 — 음수 AC(저주 장비)는 "감소 -3" 이라고 적으면 이득처럼 읽힌다. 페널티로 표시한다. */
 if(d.ac!==undefined){var acv=d.ac+enchEffA(e);
   L.push(acv>=0?["AC 감소",acv]:["AC <span style='color:#ff8a6a'>페널티</span>","+"+Math.abs(acv)+" (나빠짐)"]);}
 if(d.mag&&d.t!=="weapon")L.push(["마력",d.mag]);
 if(d.dex)L.push(["민첩",d.dex]);
 if(d.dmg)L.push(["화살 공격력",d.dmg]);
 return L;
}
function cmpVal(k,e,field){
 var d=ITEMS[k];
 if(field==="atk")return d.t==="weapon"?((d.d1+d.d2)/2+enchEffW(e)):0;
 if(field==="ac")return (d.ac||0)+(d.t==="weapon"?0:enchEffA(e));
 if(field==="mag")return d.mag||0;
 return 0;
}
function showTip(it,x,y){
 var d=ITEMS[it.k],h="";
 var rare=d.rare?"#c07aff":(d.cls&&d.cls.length<3?"#7fc7ff":"#e8d36e");
 h+="<b style='color:"+rare+"'>"+(it.e>0?"+"+it.e+" ":"")+d.n+"</b>";
 if(d.rare)h+=" <span class='gr'>희귀</span>";
 h+="<div class='gr'>"+(SLOTN[d.t]||(d.t==="potion"?"소모품":d.t==="scroll"?"주문서":d.t))+
    (d.cls&&d.cls.length<3?" · "+d.cls.split("").map(function(c){return CLS[c].n;}).join("·")+" 전용":"")+"</div>";
 var L=statLines(it.k,it.e),i;
 for(i=0;i<L.length;i++)h+="<div>"+L[i][0]+" <b>"+L[i][1]+"</b></div>";
 if(d.heal)h+="<div>HP <b>"+d.heal+"</b> 회복</div>";
 if(d.mana)h+="<div>MP <b>"+d.mana+"</b> 회복</div>";
 /* 착용 중인 같은 부위와 비교 */
 var cur=SLOTN[d.t]?P.eq[d.t]:null;
 if(cur&&cur!==it){
   h+="<div class='gr' style='margin-top:4px;border-top:1px solid #33294a;padding-top:3px'>착용 중 ("+
      (cur.e>0?"+"+cur.e+" ":"")+ITEMS[cur.k].n+") 대비</div>";
   [["atk","공격력"],["ac","AC"],["mag","마력"]].forEach(function(f){
     var a=cmpVal(it.k,it.e,f[0]), b=cmpVal(cur.k,cur.e,f[0]), df=a-b;
     if(a===0&&b===0)return;
     var cls=df>0?"up":(df<0?"dn":"gr"), sg=df>0?"▲ +":(df<0?"▼ ":"= ");
     h+="<div class='"+cls+"'>"+f[1]+" "+sg+(df===0?"동일":Math.abs(df).toFixed(df%1?1:0))+"</div>";
   });
   if(!canUse(it.k))h+="<div class='dn'>이 직업은 착용할 수 없습니다</div>";
 }else if(SLOTN[d.t]&&!canUse(it.k))h+="<div class='dn'>이 직업은 착용할 수 없습니다</div>";
 /* R26 — 세트 장비면 지금 몇 부위를 갖췄고 무엇이 열리는지 보여 준다(팩 지역 장비) */
 if(typeof setLine==="function"){
   var sl=setLine(it.k);
   if(sl)h+="<div style='margin-top:4px;border-top:1px solid #33294a;padding-top:3px;font-size:10px;line-height:15px'>"+sl+"</div>";
 }
 if(d.note)h+="<div class='gr' style='margin-top:3px;font-style:italic'>"+d.note+"</div>";
 if(d.pr)h+="<div class='gr' style='margin-top:3px'>상점가 "+d.pr.toLocaleString()+" · 판매 "+
   (Math.max(5,Math.floor(d.pr*.4))+it.e*600).toLocaleString()+"</div>";
 ttipEl.innerHTML=h;ttipEl.style.display="block";
 var w=ttipEl.offsetWidth,hh=ttipEl.offsetHeight;
 ttipEl.style.left=Math.min(window.innerWidth-w-8,x+16)+"px";
 ttipEl.style.top=Math.max(6,Math.min(window.innerHeight-hh-8,y-10))+"px";
}
function hideTip(){ttipEl.style.display="none";}
function bindTip(el,it){
 el.addEventListener("mouseenter",function(e){showTip(it,e.clientX,e.clientY);});
 el.addEventListener("mousemove",function(e){if(ttipEl.style.display==="block")
   {ttipEl.style.left=Math.min(window.innerWidth-ttipEl.offsetWidth-8,e.clientX+16)+"px";}});
 el.addEventListener("mouseleave",hideTip);
 el.addEventListener("touchstart",function(e){
   var t=e.touches[0];showTip(it,t.clientX-120,t.clientY);
   setTimeout(hideTip,2600);},{passive:true});
}
/* ---------- 사냥 통계 ---------- */
function huntReset(){return {t0:T,xp:0,gold:0,kills:0,drops:0,deaths:0};}
function resetHunt(){P.hunt=huntReset();refreshHunt();log("사냥 기록을 초기화했습니다.","#888");}
function refreshHunt(){
 if(!P||!P.hunt)return;
 var el=document.getElementById("hunttb");if(!el)return;
 var el2=document.getElementById("hunt");
 if(el2&&el2.style.display!=="block")return;
 var dt=Math.max(1/60,T-P.hunt.t0), hr=dt/3600;
 var xph=P.hunt.xp/hr, gph=P.hunt.gold/hr;
 var left=Math.max(0,need(P.lv)-P.xp);
 var eta=xph>0?(left/xph*3600):0;
 function hms(v){v=Math.floor(v);var h=Math.floor(v/3600),m=Math.floor(v%3600/60),s2=v%60;
   return (h?h+"시간 ":"")+(m?m+"분 ":"")+s2+"초";}
 var rows=[["사냥 시간",hms(dt)],["처치",P.hunt.kills.toLocaleString()+" 마리"],
  ["획득 경험치",P.hunt.xp.toLocaleString()],["시간당 경험치",Math.round(xph).toLocaleString()],
  ["획득 은화",P.hunt.gold.toLocaleString()],["시간당 은화",Math.round(gph).toLocaleString()],
  ["아이템 획득",P.hunt.drops+" 개"],["사망",P.hunt.deaths+" 회"],
  ["다음 레벨까지",left.toLocaleString()+" ("+(xph>0?hms(eta):"—")+")"]];
 el.innerHTML=rows.map(function(r){return "<tr><td>"+r[0]+"</td><td>"+r[1]+"</td></tr>";}).join("");
}

/* R31c — 틀 안쪽 패널 확대(transform)는 **철회**했다.
   이유: 패널이 지금 자리에서 오른쪽·아래로만 커지므로 다른 패널·HUD 와 겹치고,
   화면 밖으로 나가는 경우도 있었다(실측 2323x1209). 전체 크기는 「화면 배율」이 담당한다.
   호출부가 남아 있어도 안전하도록 빈 함수만 남긴다. */
function panelZoom(){}
function panelZoomAll(){}
