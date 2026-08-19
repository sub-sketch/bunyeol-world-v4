/* ================= 캐릭터 / 스킬 ================= */
function refreshChar(){
 if(!P)return;
 var mh=pMaxHit();
 var g=gradeOf(P.lv),tt=TATTOO[P.cls];
 var rows=[["이름",P.name],["직업",CLS[P.cls].n],
  ["이능 등급","<span style='color:"+g[2]+"'>"+g[1]+"</span>"],
  ["신앙 계열",tt.god],
  ["문신","<span style='color:"+g[2]+"'>"+tt.part+" · "+tt.sign+"</span>"],
  ["문신 발색",g[1]+" (크기 "+Math.min(9,1+Math.floor(P.lv/6))+"단)"],
  ["레벨",P.lv],
  ["경험치",P.xp.toLocaleString()+" / "+need(P.lv).toLocaleString()],
  ["HP",Math.ceil(P.hp)+" / "+P.mhp],["MP",Math.ceil(P.mp)+" / "+P.mmp],
  ["힘 STR",P.str],["민첩 DEX",pDex()],["체력 CON",P.con],["지능 INT",P.int],["지혜 WIS",P.wis],
  ["공격력",mh[0]+" ~ "+mh[1]],["Armor Class",acShow()],["마력 보너스","+"+pMag()],
  ["영구 성장","<span style='color:#ffd24a'>공 +"+(P.metaAtk||0)+" · 방 +"+(P.metaAc||0)+" · HP +"+(P.metaHpApplied||0)+"</span>"],
  ["각인 보정",markOf()?"<span style='color:#c9a6ff'>"+markOf().n+" (공 +"+(P.markAtk||0)+" · HP +"+(P.markHpApplied||0)+")</span>":"없음"],
  ["공격 방식",isRanged()?"원거리 "+pRange().toFixed(1)+"m":"근접"],
  ["변신",P.tf?(TFS[P.tf].n+" <span style='color:#8a8068;font-size:10px'>"+
     (P.tfSkin!==false?"외형+능력치":"능력치만")+" · 남은 "+tfDurText(tfRemain())+"</span>"):"없음"],["처치 수",P.kills],["은화",P.gold.toLocaleString()]];
 document.getElementById("chtb").innerHTML=rows.map(function(r){
   return "<tr><td>"+r[0]+"</td><td>"+r[1]+"</td></tr>";}).join("");
 refreshSkillPanel();refreshQuick();
}
function mySkills(){return SKILLS[P.cls];}
function refreshSkillPanel(){
 if(!P)return;
 if(!P.bind)P.bind=defaultBind();
 var L=document.getElementById("sklist");L.innerHTML="";
 var head=document.createElement("div");
 head.style.cssText="color:#9a8f6a;font-size:11px;margin-bottom:5px";
 head.innerHTML="키 버튼을 누른 뒤 원하는 키를 입력하면 단축키가 바뀝니다. (Delete=해제)";
 L.appendChild(head);
 function keyBtn(type,idx){
   var kb=document.createElement("button");kb.className="key";
   var waiting=bindWait&&bindWait.type===type&&bindWait.idx===idx;
   kb.textContent=waiting?"?":bindLabel(P.bind[type][idx]);
   if(waiting)kb.style.cssText="border-color:#9fe2ff;color:#9fe2ff";
   kb.onclick=function(){startBind(type,idx);};
   return kb;
 }
 var t1=document.createElement("div");t1.style.cssText="color:#e8d36e;font-size:11px;margin:6px 0 2px";
 t1.textContent="■ 스킬 / 마법";L.appendChild(t1);
 mySkills().forEach(function(sk,i){
   var row=document.createElement("div");row.className="skrow";
   row.appendChild(keyBtn("sk",i));
   var d=document.createElement("div");d.className="sk";
   var ok=skKnown(sk.id);
   d.innerHTML="<b style='"+(ok?"":"opacity:.45")+"'>"+sk.n+"</b> <span style='color:#7a7060'>MP "+sk.mp+
     " · 재사용 "+sk.cd+"초</span><div>"+sk.desc+"</div>";
   row.appendChild(d);
   var lk=document.createElement("span");lk.style.fontSize="10px";
   /* R18 — 계열 스킬은 레벨 해금이라 "미습득 · 100P" 가 거짓말이 된다(상점에 없다).
      레벨 해금 계열은 몇 레벨에 열리는지를 보여 준다. 기사만 포인트 표기. */
   if(!ok && typeof skLvGated==="function" && skLvGated(sk.id)){
     lk.style.color="#7a6a6a";lk.textContent="Lv "+(sk.lv||1)+" 해금";
   }else if(!ok){lk.style.color="#7a6a6a";lk.textContent="미습득 · "+(sk.cost||100)+"P";}
   else{lk.style.color="#9fe2ff";lk.textContent=skLv(sk.id)>1?("강화 "+(skLv(sk.id)-1)+"단"):"습득";}
   row.appendChild(lk);
   L.appendChild(row);
 });
 var t2=document.createElement("div");t2.style.cssText="color:#e8d36e;font-size:11px;margin:8px 0 2px";
 t2.textContent="■ 물약 단축키";L.appendChild(t2);
 POTSLOT.forEach(function(k,i){
   var row=document.createElement("div");row.className="skrow";
   row.appendChild(keyBtn("pt",i));
   row.appendChild(icoEl(k));
   var d=document.createElement("div");d.className="sk";
   d.innerHTML="<b>"+ITEMS[k].n+"</b> <span style='color:#7a7060'>보유 "+cntItem(k)+"</span><div>"+itemInfo({k:k,e:0,q:1})+"</div>";
   row.appendChild(d);
   L.appendChild(row);
 });
 var rb=document.createElement("button");rb.className="ib";rb.style.marginTop="8px";
 rb.textContent="기본 단축키로 되돌리기";rb.onclick=resetBind;L.appendChild(rb);
 /* 자동 물약 */
 if(!P.ap)P.ap=apDefault();
 var t3=document.createElement("div");t3.style.cssText="color:#e8d36e;font-size:11px;margin:10px 0 2px";
 t3.textContent="■ 자동 물약";L.appendChild(t3);
 var ap=document.createElement("div");ap.id="apot";
 var ob=document.createElement("button");ob.className="ib";
 ob.textContent=P.ap.on?"자동 물약 ON":"자동 물약 OFF";
 ob.style.borderColor=P.ap.on?"#7fc7ff":"#6b5a2e";
 ob.onclick=toggleAutoPot;ap.appendChild(ob);
 function mk(kind,label){
   var w=document.createElement("span");w.style.cssText="color:#bfe8bf;font-size:11px";
   w.textContent=label+" "+P.ap[kind]+"% 이하";
   var m=document.createElement("button");m.className="ib";m.textContent="−";
   m.onclick=function(){apAdj(kind,-5);};
   var pl=document.createElement("button");pl.className="ib";pl.textContent="+";
   pl.onclick=function(){apAdj(kind,5);};
   ap.appendChild(m);ap.appendChild(w);ap.appendChild(pl);
 }
 mk("hp","HP");
 if(P.cls!=="k")mk("mp","MP");
 L.appendChild(ap);
 /* ---------- R25 자동 스킬 칸 (Q·W·E·R 우선순위) ----------
    대표 지시: "qwer 4개만 등록해서 쓰고싶은것만 쓸수있는구조로 두고, 우선순위로 q->w->e->r 순서".
    <select> 로 만든다 — 습득한 스킬이 계열마다 다르고 늘어나므로 목록형이 가장 안 헷갈린다. */
 if(!P.aslot)P.aslot=[null,null,null,null];
 var t4=document.createElement("div");t4.style.cssText="color:#e8d36e;font-size:11px;margin:12px 0 2px";
 t4.textContent="■ 스킬 칸 (Q·W·E·R) — 여기 넣은 네 개만 쓸 수 있습니다";L.appendChild(t4);
 var note4=document.createElement("div");
 note4.style.cssText="color:#6b6046;font-size:10px;line-height:14px;margin-bottom:4px";
 note4.innerHTML="<b style='color:#ffd27a'>실제로 쓸 수 있는 스킬은 이 네 칸이 전부입니다.</b> 배운 스킬이 많아도 여기 넣은 것만 나갑니다."
  +" 자동 사냥은 <b style='color:#9fe2ff'>Q → W → E → R</b> 순서로 먼저 되는 것을 씁니다."
  +" 칸마다 <b style='color:#7fc7ff'>자동</b>/<b>수동</b>을 고를 수 있습니다 — 수동 칸은 키로만 나가고 자동에서는 건너뜁니다."
  +" 네 칸을 다 비우면 예전처럼 <b>습득한 스킬 중 마나가 큰 것</b>부터 씁니다.";
 L.appendChild(note4);
 var known=mySkills().filter(function(sk){return skKnown(sk.id);});
 ["Q","W","E","R"].forEach(function(kk,i){
   var row=document.createElement("div");row.className="skrow";
   var key=document.createElement("span");key.className="key";key.textContent=kk;row.appendChild(key);
   var pr=document.createElement("span");
   pr.style.cssText="color:#9a8f6a;font-size:10px;width:38px;flex:0 0 auto";
   pr.textContent=(i+1)+"순위";row.appendChild(pr);
   var sel=document.createElement("select");
   sel.style.cssText="flex:1;background:#0c0a18;border:1px solid #6b5a2e;color:#ffe9a0;font-family:inherit;font-size:11px;padding:3px 4px";
   var o0=document.createElement("option");o0.value="";o0.textContent="— 비움 —";sel.appendChild(o0);
   known.forEach(function(sk){
     var o=document.createElement("option");o.value=sk.id;
     o.textContent=sk.n+" (MP "+sk.mp+")";
     sel.appendChild(o);
   });
   sel.value=P.aslot[i]||"";
   sel.onchange=function(){aslotSet(i,sel.value);};
   row.appendChild(sel);
   /* R30 — 칸마다 자동/수동 (대표 지시: "필요한 1개만 자동, 나머진 수동으로") */
   if(!P.aauto||P.aauto.length!==4)P.aauto=[true,true,true,true];
   var au=document.createElement("button");
   var on=P.aauto[i]!==false;
   au.className="ib"+(on?" on":"");
   au.style.cssText="flex:0 0 auto;padding:3px 8px;font-size:10px;"+
     (on?"background:#2a4356;color:#cfe9ff;border-color:#7fc7ff":"color:#8a8068");
   au.textContent=on?"자동":"수동";
   au.title=on?"자동 사냥·자동 스킬이 이 칸을 씁니다":"키로만 씁니다 — 자동에서는 건너뜁니다";
   au.onclick=function(){aautoSet(i,!on);};
   row.appendChild(au);
   L.appendChild(row);
 });
 if(!known.length){
   var w0=document.createElement("div");
   w0.style.cssText="color:#a06a6a;font-size:10px;margin-top:2px";
   w0.textContent="아직 습득한 스킬이 없습니다 — 영구 성장(노드)에서 스킬을 사면 여기에 나타납니다.";
   L.appendChild(w0);
 }
 var cb=document.createElement("button");cb.className="ib";cb.style.marginTop="6px";
 cb.textContent="스킬 칸 전부 비우기";cb.onclick=aslotClear;L.appendChild(cb);
 var note=document.createElement("div");
 note.style.cssText="color:#6b6046;font-size:10px;margin-top:4px";
 note.innerHTML="설정 체력 이하로 떨어지면 자동으로 물약을 마십니다. 위급할 때는 진한 회복제를 우선 사용합니다.";
 L.appendChild(note);
}
function refreshQuick(){
 if(!P)return;
 if(!P.bind)P.bind=defaultBind();
 var q=document.getElementById("quick"),html="",i;
 for(i=0;i<POTSLOT.length;i++){
   var pk=POTSLOT[i],c=cntItem(pk);
   html+='<div class="qbtn'+(c?"":" dis")+'" onclick="usePotKey(\''+pk+'\')" title="'+ITEMS[pk].n+'">['+
     bindLabel(P.bind.pt[i])+'] '+(POTSHORT[pk]||ITEMS[pk].n)+' <b>'+c+'</b></div>';
 }
 /* R36 — 스킬은 등록한 Q·W·E·R 네 칸만 그린다.
    예전엔 습득한 스킬을 전부 그려서, 5개째부터 P.bind.sk(4칸)에 대응하는 키가 없어
    라벨이 「—」로 뜨고 키보드로는 쓸 수 없는 버튼이 계속 아래로 붙었다.
    등록은 [V] 스킬 화면의 Q·W·E·R 칸에서 한다(aslotSet). */
 if(!P.aslot||P.aslot.length!==4)P.aslot=[null,null,null,null];
 (function(){
   var list=mySkills(),i,j,sk,id,cd,cls;
   for(i=0;i<4;i++){
     id=P.aslot[i]; if(!id)continue;
     sk=null; for(j=0;j<list.length;j++)if(list[j].id===id){sk=list[j];break;}
     if(!sk||!skKnown(id))continue;
     cd=(P.cd[id]||0)-T;
     cls="qbtn"+((cd>0||P.mp<sk.mp)?" dis":"");
     html+='<div class="'+cls+'" onclick="castSlot('+i+')" title="'+sk.desc+' (MP '+sk.mp+')">['+
       bindLabel(P.bind.sk[i])+'] '+sk.n+(cd>0?" "+cd.toFixed(1):"")+'</div>';
   }
 })();
 /* 회피 — 해금했을 때만 슬롯이 생긴다. 쿨타임 바 포함. */
 if(typeof dashUnlocked==="function"&&dashUnlocked()){
   var dcd=Math.max(0,(P.dashCd||0)-T),dp=clamp(1-dcd/DASH.cd,0,1);
   html+='<div class="qbtn'+(dcd>0?" dis":"")+'" onclick="tryDash()" '
     +'title="이동 방향으로 도약 · 0.3초 무적 · 쿨 '+DASH.cd+'초">'
     +'[Space] 회피'+(dcd>0?' '+dcd.toFixed(1):'')
     +'<div style="height:3px;margin-top:3px;background:#3a3450;border-radius:2px;overflow:hidden">'
     +'<div style="height:3px;width:'+Math.round(dp*100)+'%;background:'+(dp>=1?"#9fe2ff":"#5a7a9a")+'"></div></div></div>';
 }
 q.innerHTML=html;
 /* R24b — 같은 내용을 우측 레일에도 넣는다. 어느 쪽을 보여줄지는 railSync() 가 정한다
    (여백이 있으면 레일, 없으면 하단 퀵바). 내용을 두 번 만들지 않기 위해 html 을 재사용한다. */
 var r=document.getElementById("srail");
 if(r) r.innerHTML='<div class="srh">스킬 · 물약</div>'+html;
 if(typeof railSync==="function") railSync();
 syncPad();
}
/* 하단 퀵바 ↔ 우측 레일 전환.
   RAIL_ON 은 fitScale() 이 정한다 — 게임 틀 좌우에 남는 검은 여백이 레일보다 넓을 때만 켠다.
   레일이 켜지면 하단 퀵바는 감춘다(같은 버튼이 두 벌 보이면 헷갈린다). */
var RAIL_ON=false;
function railSync(){
 var r=document.getElementById("srail"), q=document.getElementById("quick");
 if(r) r.className=RAIL_ON?"on":"";
 if(q) q.style.display=RAIL_ON?"none":"flex";
}
