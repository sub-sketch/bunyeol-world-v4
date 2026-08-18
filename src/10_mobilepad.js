/* ================= 모바일 터치 패드 ================= */
var IS_TOUCH=("ontouchstart" in window)||navigator.maxTouchPoints>0;
var padOn=IS_TOUCH, padEls=null;
function togglePad(){padOn=!padOn;document.getElementById("mpad").className=padOn?"on":"";syncPad();
 try{fitScale();}catch(e){}}
function buildPad(){
 var wrap=document.getElementById("mpad");
 wrap.innerHTML="";padEls=[];
 var i;
 /* 물약 — 보유 중인 것만 (syncPad 가 수량 0이면 숨긴다) */
 for(i=0;i<POTSLOT.length;i++)(function(i){
   var k=POTSLOT[i];
   var b=document.createElement("div");b.className="mbtn";
   b.appendChild(icoEl(k));
   var n=document.createElement("b");n.textContent="0";b.appendChild(n);
   b.onclick=function(){usePotKey(k);};
   wrap.appendChild(b);padEls.push({el:b,cnt:n,type:"pt",i:i,k:k});
 })(i);
 /* 스킬 — 습득한 것만. 미습득 버튼은 자리만 차지한다 (모바일 재설계) */
 mySkills().forEach(function(sk,i2){
   if(!skKnown(sk.id))return;
   var b=document.createElement("div");b.className="mbtn";
   var t=document.createElement("span");t.textContent=sk.n;b.appendChild(t);
   var st=document.createElement("i");st.textContent="";b.appendChild(st);
   b.onclick=function(){castSkill(i2);};
   wrap.appendChild(b);padEls.push({el:b,cnt:st,type:"sk",i:i2,sk:sk});
 });
 /* 회피·교체 — 해금했을 때만 */
 if((typeof dashUnlocked==="function")&&dashUnlocked()){
   var bd=document.createElement("div");bd.className="mbtn";
   var td=document.createElement("span");td.textContent="회피";bd.appendChild(td);
   var sd=document.createElement("i");bd.appendChild(sd);
   bd.onclick=function(){tryDash();};
   wrap.appendChild(bd);padEls.push({el:bd,cnt:sd,type:"dash"});
 }
 if((typeof swapUnlocked==="function")&&swapUnlocked()){
   var bw=document.createElement("div");bw.className="mbtn";
   var tw=document.createElement("span");tw.textContent="교체";bw.appendChild(tw);
   var sw2=document.createElement("i");bw.appendChild(sw2);
   bw.onclick=function(){swapWeapon();};
   wrap.appendChild(bw);padEls.push({el:bw,cnt:sw2,type:"swap"});
 }
 [["가방",function(){toggleP("inv");}],["퀘스트",function(){toggleP("quest");}],
  ["성장",function(){openMeta();}]].forEach(function(o){
   var b=document.createElement("div");b.className="mbtn sys";
   var t=document.createElement("span");t.textContent=o[0];b.appendChild(t);
   b.onclick=o[1];wrap.appendChild(b);padEls.push({el:b,type:"sys"});
 });
 /* 게임 시작 전에는 패드를 숨긴다 */
 wrap.className=(padOn&&typeof started!=="undefined"&&started)?"on":"";
}
function syncPad(){
 if(!IS_TOUCH&&!padOn)return;
 var tg=document.getElementById("mpadtoggle");
 if(tg)tg.className=IS_TOUCH?"on":"";
 if(!padEls||!padEls.length)return;
 if(!P)return;
 padEls.forEach(function(o){
   if(o.type==="pt"){
     var c=cntItem(o.k);o.cnt.textContent=c;
     o.el.style.display=(c>0||o.i<2)?"":"none";   /* 0개 물약은 숨김 (주력 2칸은 유지) */
     o.el.className="mbtn"+(c?"":" dis");
   }else if(o.type==="sk"){
     var sk=o.sk,ok=skKnown(sk.id),cd=(P.cd[sk.id]||0)-T;
     o.cnt.textContent=ok?(cd>0?cd.toFixed(1)+"초":"MP "+sk.mp):"미습득";
     o.el.className="mbtn"+((!ok||cd>0||P.mp<sk.mp)?" dis":"");
   }else if(o.type==="dash"){
     var un=(typeof dashUnlocked==="function")&&dashUnlocked();
     var dcd=Math.max(0,(P.dashCd||0)-T);
     o.cnt.textContent=un?(dcd>0?dcd.toFixed(1)+"초":"준비됨"):"미습득";
     o.el.className="mbtn"+((!un||dcd>0)?" dis":"");
   }else if(o.type==="swap"){
     var sw=(typeof swapUnlocked==="function")&&swapUnlocked();
     o.cnt.textContent=sw?(weaponPool().length+"자루"):"미습득";
     o.el.className="mbtn"+(sw&&weaponPool().length>1?"":" dis");
   }
 });
}
