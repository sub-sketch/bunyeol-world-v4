/* ================= 입력 ================= */
function gameTap(mx,my){
 if(!started||deadFlag)return;
 sfx("");
 var z=world[curZ],best=null,bd=(IS_TOUCH?24:15),npc=null;
 z.mobs.forEach(function(m){
   if(m.dead)return;
   var s=toScreen(m.fx,m.fy);
   var d=Math.max(Math.abs(mx-s.x),Math.abs(my-(s.y-4)));
   if(d<bd){bd=d;best=m;}});
 var fn=null,fnd=bd;
 (z.fnpc||[]).forEach(function(n){
   if(n.dead)return;
   var s=toScreen(n.fx,n.fy);
   var d=Math.max(Math.abs(mx-s.x),Math.abs(my-(s.y-4)));
   if(d<fnd){fnd=d;fn=n;}});
 if(fn&&(!best||fnd<bd)){
   if(isFoe(P.fac||"player",fn.fac)){P.tgt=fn;P.dest=null;log(eul(fn.d.n)+" 공격합니다.","#ccc");return;}
   /* 아군/중립 — 한마디 던진다 */
   var sy=fn.d.say||[];
   if(sy.length&&T-(fn.sayT||0)>3){fn.sayT=T;
     floaters.push({x:fn.fx,y:fn.fy-1.1,t:"…",c:"#cfd8e0",t0:T});
     log("<b style='color:"+facColor(fn.fac)+"'>"+fn.d.n+"</b>: "+sy[ri(0,sy.length-1)],"#a89c86");}
   return;
 }
 if(best){P.tgt=best;P.dest=null;log(eul(best.d.n)+" 공격합니다.","#ccc");return;}
 z.def.npcs.forEach(function(n){
   var s=toScreen(n.x,n.y);
   var nr=IS_TOUCH?20:13;
   if(Math.abs(mx-s.x)<nr&&Math.abs(my-(s.y-4))<nr+3)npc=n;});
 if(npc){
   if(Math.abs(P.fx-npc.x)+Math.abs(P.fy-npc.y)>4.5){
     log("너무 멉니다. 가까이 가십시오.","#888");
     P.dest={x:npc.x+1,y:npc.y+1,t0:T};P.tgt=null;
     P.path=findPath(world[curZ],P.fx,P.fy,npc.x+1,npc.y+1);return;}
   openDialog(npc);
   return;
 }
 var c=camOff();
 var fx=((mx-c.ox)/HW2+(my-c.oy)/HH2)/2, fy=((my-c.oy)/HH2-(mx-c.ox)/HW2)/2;
 fx=clamp(fx,1,z.def.w-1.2);fy=clamp(fy,1,z.def.h-1.2);
 P.dest={x:fx,y:fy,t0:T};P.tgt=null;   /* t0 = 클릭 마커 애니메이션 시작 시각 */
 P.path=findPath(world[curZ],P.fx,P.fy,fx,fy);   /* 방 구조 — 벽을 돌아가는 길 */
}
cv.addEventListener("mousedown",function(ev){
 var r=cv.getBoundingClientRect();
 gameTap((ev.clientX-r.left)*VW/r.width,(ev.clientY-r.top)*VH/r.height);});
cv.addEventListener("touchstart",function(ev){
 ev.preventDefault();var t=ev.touches[0];if(!t)return;
 var r=cv.getBoundingClientRect();
 gameTap((t.clientX-r.left)*VW/r.width,(t.clientY-r.top)*VH/r.height);},{passive:false});
document.addEventListener("keydown",function(ev){
 if(!started)return;
 var k=ev.key.toLowerCase();
 if(bindWait&&applyBind(k)){ev.preventDefault();return;}
 var bi;
 if(P&&P.bind){
   bi=P.bind.sk.indexOf(k); if(k&&bi>=0){castSlot(bi);return;}   /* R36 — 슬롯 시전 */
   bi=P.bind.pt.indexOf(k); if(k&&bi>=0){usePotKey(POTSLOT[bi]);return;}
 }
 if(k===" "){ev.preventDefault();tryDash();}
 else if(k==="tab"){ev.preventDefault();swapWeapon();}
 else if(k==="p"){if(curZ===0)openMeta();else log("영구 성장은 마을에서만 볼 수 있습니다.","#888");}
 else if(k==="g")useReturnScroll();          /* 귀환 각인 단축키 */
 else if(k==="i")toggleP("inv");
 else if(k==="c")toggleP("char");
 else if(k==="v")toggleP("skillp");
 else if(k==="j")toggleP("quest");
 else if(k==="b")toggleP("lorep");
 else if(k==="t")toggleP("hunt");
 else if(k==="m")toggleMap();
 else if(k==="z")openSave();
 else if(k==="h")toggleP("help");
 else if(k==="o"){toggleP("opt");if(document.getElementById("opt").style.display==="block")renderOpt();}
 else if(k==="escape"){
   /* R23 — 시설 화면이 열려 있으면 그것부터 닫는다(패널을 제자리로 돌려놓아야 한다).
      closeP 만 부르면 패널은 display:none 이 되지만 시설 화면 안에 도킹된 상태로 남는다. */
   if(typeof FAC!=="undefined"&&FAC.open){facClose();hideTip();return;}
   ["inv","char","shop","save","tf","help","skillp","quest","lorep","hunt","opt","meta"].forEach(closeP);hideTip();shopOpen=false;closeDialog();}
});
