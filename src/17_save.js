/* ================= 저장 ================= */
var STOREOK=(function(){try{localStorage.setItem("__t","1");localStorage.removeItem("__t");return true;}catch(e){return false;}})();
function packSave(){
 var s={v:3,cls:P.cls,name:P.name,lv:P.lv,xp:P.xp,hp:Math.ceil(P.hp),mhp:P.mhp,mp:Math.ceil(P.mp),mmp:P.mmp,
  str:P.str,dex:P.dex,con:P.con,int:P.int,wis:P.wis,gold:P.gold,kills:P.kills,bossKilled:P.bossKilled,
  tf:P.tf,tfR:(P.tf&&P.tfT>T)?Math.round(P.tfT-T):0,tfSkin:P.tfSkin!==false,tfUnlock:P.tfUnlock||[],dot:packDot(),lostXp:P.lostXp||0,q:P.q,qd:P.qd,lore:P.lore,qcur:P.qcur,bind:P.bind,autoCounter:P.autoCounter!==false,ap:P.ap,aslot:P.aslot||[null,null,null,null],aauto:P.aauto||[true,true,true,true],
  alloc:P.alloc||{str:0,dex:0,con:0,int:0,wis:0},
  bf:packBuffs(),
  /* R32 T-P1-3 — 이 저장이 "던전 안에서" 찍혔는가.
     RUN 은 의도적으로 저장하지 않는다(런은 저장 대상이 아니다). 그런데 자동저장은 던전
     안에서도 90초마다 돌기 때문에, 런 도중 브라우저를 닫고 이어하면 마을에서 시작하면서
     런에서 번 은화·계시·상태를 그대로 안고 나오는 길이 열려 있었다 — 정산·사망 페널티가
     통째로 우회된다(죽기 직전 새로고침도 같은 경로). 이제 이 플래그를 남겨,
     불러올 때 "도중 이탈(escape)"과 같은 정산을 적용한다(applyLoad 참조).
     goldIn 은 그 정산에 필요한 기준값이다 — 마을에서 들고 들어간 은화. */
  inRun:(typeof runActive==="function")?!!runActive():false,
  runGoldIn:(typeof RUN!=="undefined"&&RUN&&typeof RUN.goldIn==="number")?RUN.goldIn:0,
  inv:P.inv.map(function(it){var sl="";SLOTS.forEach(function(s2){if(P.eq[s2]===it)sl=s2;});
    return it.opt?[it.k,it.q,it.e,sl,it.opt]:[it.k,it.q,it.e,sl];})};
 return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}
/* 시간제 축복 — 남은 초로 저장한다(절대 시각은 세션마다 달라지므로).
   구버전 .sav 에는 이 항목이 없으며, 없으면 버프 없이 시작한다. 포맷 호환 유지. */
function packBuffs(){
 var o={},k,b;
 for(k in P.buffs){b=P.buffs[k];
   if(b&&b.t>T)o[k]={v:b.v,n:b.n||"",r:Math.round(b.t-T)};}
 if(T<P.braveT)o.__brave={v:1,n:"용기의 물약",r:Math.round(P.braveT-T)};
 return o;
}
function unpackBuffs(bf){
 P.buffs={};P.braveT=-9;
 if(!bf||typeof bf!=="object")return;
 var k;
 for(k in bf){
   var b=bf[k];if(!b||!b.r||b.r<=0)continue;
   if(k==="__brave"){P.braveT=T+b.r;continue;}
   P.buffs[k]={v:b.v,n:b.n,t:T+b.r};
 }
}
function slotKey(n){return "lineage_lc2_save_"+n;}
function slotMeta(n){if(!STOREOK)return null;try{var s=localStorage.getItem(slotKey(n));return s?JSON.parse(s):null;}catch(e){return null;}}
function saveSlot(n,silent){
 if(!P||!started){log("저장할 캐릭터가 없습니다.","#888");return;}
 if(!STOREOK){if(!silent)log("이 화면에서는 브라우저 저장이 차단되어 있습니다. [파일로 저장]을 이용하십시오.","#f88");return;}
 /* R27 — 슬롯 저장도 서명해서 넣는다(브라우저 저장소를 직접 고치는 길을 막는다) */
 try{var _d=packSave();if(typeof savSeal==="function")_d=savSeal(_d);
  localStorage.setItem(slotKey(n),JSON.stringify({name:P.name,cls:P.cls,lv:P.lv,t:Date.now(),data:_d}));
  if(!silent){log((n===0?"[자동] ":"슬롯 "+n+"에 ")+"저장했습니다.","#9fe2ff");sfx("pot");}
  if(document.getElementById("save").style.display==="block")refreshSlots();
 }catch(e){log("저장에 실패했습니다.","#f88");}
}
function loadSlot(n){var m=slotMeta(n);if(!m){log("비어 있는 슬롯입니다.","#888");return;}applyLoad(m.data);}
function delSlot(n){if(!STOREOK)return;try{localStorage.removeItem(slotKey(n));}catch(e){}refreshSlots();}
function fmtT(t){var d=new Date(t);return (d.getMonth()+1)+"/"+d.getDate()+" "+("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
function refreshSlots(){
 var box=document.getElementById("slotbox");box.innerHTML="";
 var names=["자동 저장","슬롯 1","슬롯 2","슬롯 3"],n;
 for(n=0;n<4;n++)(function(n){
   var m=slotMeta(n),row=document.createElement("div");row.className="slotrow";
   var s=document.createElement("span");s.className="snm";
   s.innerHTML="<b>"+names[n]+"</b> — "+(m?(m.name+" ("+(CLS[m.cls]?CLS[m.cls].n:"기사")+") Lv."+m.lv+" <small>"+fmtT(m.t)+"</small>"):'<span style="color:#555">비어 있음</span>');
   row.appendChild(s);
   if(n>0&&started&&STOREOK){var b=document.createElement("button");b.className="ib";b.textContent="저장";
     b.onclick=function(){saveSlot(n);};row.appendChild(b);}
   if(m){var b2=document.createElement("button");b2.className="ib";b2.textContent="불러오기";
     b2.onclick=function(){loadSlot(n);};row.appendChild(b2);
     var b3=document.createElement("button");b3.className="ib sell";b3.textContent="삭제";
     b3.onclick=function(){delSlot(n);};row.appendChild(b3);}
   box.appendChild(row);
 })(n);
 /* R27 — 보관 버튼 이름은 정책 상태를 그대로 보여 준다(서버가 열리면 자물쇠가 풀린다) */
 var cs=document.getElementById("charstore");
 if(cs&&typeof charStoreReady==="function")
   cs.textContent=charStoreReady()?("캐릭터 보관 ("+SRV.name+")"):"캐릭터 보관 🔒 (서버 준비 중)";
 document.getElementById("storenote").innerHTML=STOREOK?
  ("저장은 이 PC/브라우저에 보관됩니다. <b>90초마다 자동 저장</b>됩니다.<br>"+
   (typeof charStoreNote==="function"?charStoreNote():"")):
  "이 미리보기 화면에서는 브라우저 저장이 차단되어 슬롯을 쓸 수 없습니다.<br>[파일로 저장]으로 내려받고 [저장 파일 불러오기]로 이어하십시오.<br><b>PC에 저장된 HTML 파일을 직접 열면 슬롯 자동 저장이 정상 작동합니다.</b>";
}
function openSave(){openP("save");refreshSlots();
 /* R26 — 쌓인 플레이 기록 수를 보여 준다(내보낼 게 있는지 한눈에) */
 var rc=document.getElementById("repcount");
 if(rc&&typeof repList==="function"){var n=repList().length;
   rc.textContent=n?("최근 "+n+"판 쌓임"):"아직 없음 — 한 판 끝내면 쌓입니다";}
}
/* ================= R30 세이브 청소 · 실패를 조용히 넘기지 않기 =================
   실제 사고(대표 리포트): "test 파일은 불러와지지 않고, 처음 시작할 때 이어하기를 눌러도 뭐 뜨는게 없음".
   원인은 두 가지였고 **둘 다 조용히** 실패했다:
     ① 지금 데이터에 없는 **퀘스트 id** 를 물고 있는 세이브 → 게시판/추적기가 QUESTS[id] 를 읽다 예외
     ② 지금 데이터에 없는 **변신 형상 키**(tf) 를 물고 있는 세이브 → 액터 조립에서 예외
   그리고 예외가 applyLoad 의 try 를 빠져나가 "저장 데이터가 올바르지 않습니다"만 로그에 남았다 —
   타이틀 화면에서는 로그창이 안 보이므로 **아무 일도 안 일어난 것처럼** 보였다.

   수리 방침
     · 없는 것은 **버리고 살린다**(캐릭터를 못 여는 것보다 낫다). 무엇을 버렸는지 알려 준다.
     · 화면 갱신(가방·퀘스트 등)은 하나씩 감싼다 — 그림 갱신 실패로 불러오기가 무너지지 않게.
     · 진짜 실패는 **저장 화면에 붉은 글씨로** 보여 준다(로그가 안 보이는 화면이 있으므로). */
function savClean(s){
 var dropped=[];
 /* 없는 퀘스트 */
 if(s.q&&typeof s.q==="object"){
   var q2={},k;
   for(k in s.q){ if(typeof QUESTS!=="undefined"&&QUESTS[k])q2[k]=s.q[k]; else dropped.push("퀘스트 "+k); }
   s.q=q2;
 }
 if(s.qd&&typeof s.qd==="object"){
   var d2={},k2;
   for(k2 in s.qd){ if(typeof QUESTS!=="undefined"&&QUESTS[k2])d2[k2]=s.qd[k2]; else dropped.push("완료기록 "+k2); }
   s.qd=d2;
 }
 if(s.qcur&&!(s.q&&s.q[s.qcur])) s.qcur=null;
 /* 없는 변신 형상
    R32 수리 — 예전엔 MOBS 키도 통과시켰다. 그런데 런타임은 TFS[P.tf] 만 본다
    (07_state.js 의 actorOf / pMaxHit / pAC / pAtkMs / pMS, 09_charskill.js, 20_hud.js 등).
    MOBS 14종 중 TFS 에 없는 8종(wolf, gob, bear, orcarch, skel, zombie, spartoi, wight)이
    세척을 통과하면, 로드 직후 매 프레임 TFS[P.tf].act 에서 TypeError 가 나고
    23_main.js 의 프레임 catch 가 받아 "내부 오류" 로그만 반복된다 = 캐릭터 사용 불가.
    변신 가능 여부의 유일한 진실은 TFS 다. */
 if(s.tf){
   var okTf=(typeof TFS!=="undefined"&&TFS[s.tf]);
   if(!okTf){ dropped.push("변신 "+s.tf); s.tf=null; s.tfR=0; }
 }
 if(s.tfUnlock&&s.tfUnlock.length){
   var tu=s.tfUnlock.filter(function(t){
     return (typeof TFS!=="undefined"&&TFS[t]); });
   if(tu.length!==s.tfUnlock.length)dropped.push("변신해금 "+(s.tfUnlock.length-tu.length)+"종");
   s.tfUnlock=tu;
 }
 /* 없는 자동 스킬 칸
    R32 수리 — 예전엔 `SKILLS[k3]` 로 검사했는데, SKILLS 는 data/classes.json 에서 온
    **직업 계열 키 객체**({k:[...], e:[...], m:[...]}) 라서 SKILLS["smash"] 는 항상 undefined 였다.
    그래서 이 "세척" 코드가 정상 세이브의 자동스킬 4칸을 매번 전멸시켰다(안내도 없이).
    스킬 id -> 정의 조회는 25_meta.js 의 skillDef()/isSkillId() 가 담당한다. */
 if(s.aslot&&s.aslot.length){
   var aDrop=0;
   s.aslot=s.aslot.map(function(k3){
     if(!k3)return null;
     if(typeof isSkillId==="function"&&!isSkillId(k3)){ aDrop++; return null; }
     return k3; });
   if(aDrop)dropped.push("자동스킬 "+aDrop+"칸");
 }
 /* 없는 기록물 */
 if(s.lore&&typeof s.lore==="object"&&typeof LORE!=="undefined"){
   var l2={},k4;
   for(k4 in s.lore){ if(LORE[k4])l2[k4]=s.lore[k4]; }
   s.lore=l2;
 }
 return dropped;
}
/* 불러오기 실패·경고를 눈에 보이게 (타이틀 화면에는 로그창이 없다) */
function savNote(msg,bad){
 var box=document.getElementById("loadnote");
 if(box){
   box.style.display="block";
   box.style.color=bad?"#ff8a6a":"#e8d36e";
   box.innerHTML=msg;
 }
 if(typeof log==="function")log(msg,bad?"#f88":"#e8d36e");
}
function applyLoad(code){
 if(!code){log("저장 데이터가 없습니다.","#f88");return;}
 /* R27 변조 검사 — 서명이 안 맞으면 거부한다. 서명 없는 옛 파일은 그대로 받아 준다. */
 if(typeof savOpen==="function"){
   var chk=savOpen(code);
   if(!chk.ok){
     log("이 저장 파일은 <b>내용이 변경된 것으로 보입니다.</b> 불러오지 않았습니다.","#f88");
     log("직접 고친 파일은 읽을 수 없습니다 — 원본을 쓰십시오.","#a89c86");
     return;
   }
   code=chk.code;
 }
 try{
   var s=JSON.parse(decodeURIComponent(escape(atob(code))));
   /* v3 부터 P 구조가 바뀌었다(변신 해금·상태이상·문신 등).
      구버전을 억지로 읽으면 조용히 깨진 캐릭터가 만들어지므로 명확히 거부한다. */
   if(!s.v||s.v<3){
     log("이 저장 파일은 <b>구버전(v"+(s.v||1)+")</b>입니다. 시스템 개편으로 더 이상 읽을 수 없습니다.","#f88");
     log("새 캐릭터로 시작해 주십시오. 지금 버전의 저장 파일은 앞으로 계속 호환됩니다.","#a89c86");
     return;
   }
   /* R30 — 지금 데이터에 없는 것들을 먼저 걸러낸다(없는 퀘스트·변신 등) */
   var _drop=[], _esc=null;
   try{ _drop=savClean(s); }catch(e){}
   var cls=s.cls||"k";
   if(!CLS[cls])throw new Error("알 수 없는 계열: "+cls);
   P=newPlayer(s.name,cls);
   P.lv=s.lv;P.xp=s.xp;P.mhp=s.mhp;P.hp=Math.min(s.hp,s.mhp);P.mmp=s.mmp;P.mp=s.mp;
   P.str=s.str;P.dex=s.dex;P.con=s.con;P.int=s.int||CLS[cls].int;P.wis=s.wis||CLS[cls].wis;
   P.gold=s.gold;P.kills=s.kills||0;P.bossKilled=!!s.bossKilled;P.tf=s.tf||null;P.tfT=(P.tf&&s.tfR)?T+s.tfR:0;if(P.tf&&!s.tfR)P.tf=null;P.tfSkin=s.tfSkin!==false;P.tfUnlock=s.tfUnlock||[];unpackDot(s.dot);P.lostXp=s.lostXp||0;
   P.alloc=(s.alloc&&typeof s.alloc==="object")?s.alloc:{str:0,dex:0,con:0,int:0,wis:0};   /* 구버전 저장은 배분 기록이 없음 — 0으로 폴백 */
   P.q=s.q||{};P.qd=s.qd||{};P.lore=s.lore||{};P.qcur=s.qcur||null;
   P.bind=(s.bind&&s.bind.sk&&s.bind.pt)?s.bind:defaultBind();
   (function(){var db=defaultBind(),i;            /* 퀵슬롯이 늘어난 경우 뒤를 기본값으로 메운다 */
     for(i=P.bind.pt.length;i<db.pt.length;i++)P.bind.pt[i]=db.pt[i];
     for(i=P.bind.sk.length;i<db.sk.length;i++)P.bind.sk[i]=db.sk[i];})();
   P.autoCounter=(s.autoCounter!==false);
   P.ap=(s.ap&&typeof s.ap.hp==="number")?s.ap:apDefault();
   /* R25 자동 스킬 칸 — 구버전 저장에는 없다(그 경우 빈 칸 = 예전 자동 스킬 방식) */
   P.aslot=(s.aslot&&s.aslot.length===4)?s.aslot:[null,null,null,null];
   /* R30 — 칸마다 자동/수동. 옛 세이브에는 없으므로 전부 자동으로 본다(예전 동작 유지). */
   P.aauto=(s.aauto&&s.aauto.length===4)?s.aauto.map(function(v){return v!==false;}):[true,true,true,true];
   P.hunt=huntReset();
   unpackBuffs(s.bf);   /* v2.2 이후 저장에만 존재. 없으면 그냥 버프 없음 */
   resetAllTargets();   /* 옛 P를 물고 있던 몬스터/NPC 표적 전부 해제 */
   applyHud();
   P.inv=[];
   s.inv.forEach(function(a){
     if(!ITEMS[a[0]])return;
     var it={k:a[0],q:a[1],e:a[2]||0};
     if(a[4]&&a[4].f)it.opt=a[4];
     P.inv.push(it);
     if(a[3]&&SLOTN[a[3]])P.eq[a[3]]=it;});
   if(P.gold<TEST_GOLD){P.gold=TEST_GOLD;log("[테스트 지원] 은화가 100만으로 채워졌습니다.","#ffd27a");}
   /* ★ R32 T-P1-3 — 던전 안에서 찍힌 저장을 불러왔다 = 런을 도중에 놓고 나간 것이다.
      기존 규칙을 새로 만들지 않고 **"도망 = 포기"(runOnTravel 의 runEnd("escape"))와 같은 정산**을 적용한다:
        · 런에서 번 은화는 사라지고 가져갔던 만큼만 남는다 — settleClose 의 goldIn 규칙 그대로
        · 계시(문신)는 RUN 에 있고 RUN 은 저장되지 않으므로 이미 소멸했다(여기서 지울 것이 없다)
        · 변신·상태이상·런 한정 버프도 정리한다 — settleClose 와 같은 한 줄
      업적포인트는 주지 않는다: RUN(도달 층·처치 수)이 없어 채점할 수 없고, 새로고침으로
      포인트를 버는 길을 새로 열 이유도 없다. 이 자리는 unpackBuffs 뒤여야 한다(안 그러면 버프가 되살아난다).
      ⚠ 이 정산은 "이탈"이지 "사망"이 아니다 — 레벨·장비는 남는다. 즉 사망 직전 새로고침으로
        레벨·장비 초기화(resetCharacterOnDeath)까지 피하는 길은 A안 범위 밖이다(보고서에 명시). */
   if(s.inRun){
     var _gin=(typeof s.runGoldIn==="number")?s.runGoldIn:0;
     var _keep=Math.max(0,Math.min(P.gold,_gin));
     _esc={lost:Math.max(0,P.gold-_keep),keep:_keep};
     P.gold=_keep;
     P.tf=null;P.tfT=0;dotClear();P.buffs={};
   }
   /* 메타는 별도 저장이다 — 이어하기에서도 반드시 불러온다.
      (안 부르면 빈 META 위에 다음 정산이 저장돼 영구 성장이 통째로 날아간다) */
   metaLoad();
   P.metaHpApplied=metaBonus("hp");          /* 저장된 mhp에 이미 포함 — 이중 가산 방지 */
   var _mk=markOf();
   P.markHpApplied=_mk?(_mk.hp||0):0;
   P.markGiven=true;                          /* 시작 지급은 예전에 이미 받았다 */
   metaApplyToPlayer();markApplyToPlayer();
   /* 스킬 구매 전환(계획서 v3 이행 ②) — 레벨 해금 시절 세이브에 1회 보상 */
   if(!META.skComp){
     META.skComp=1;
     if(P.lv>=5){var comp=P.lv*2;metaAddPoints(comp);
       log("시스템 개편 — 스킬은 이제 <b>영구 성장 상점에서 구매</b>합니다. 전환 보상 <b>"+comp+"P</b>를 드립니다.","#ffd24a");}
     metaSave();
   }
   deadFlag=false;document.getElementById("deadov").style.display="none";
   if(P.hp<=0)P.hp=Math.floor(P.mhp*.5);
   started=true;document.getElementById("startov").style.display="none";document.getElementById("charov").style.display="none";document.getElementById("hud").style.display="flex";if(typeof fitScale==="function")fitScale();
   travel(0,10,9);closeP("save");
   log("모험 기록을 불러왔습니다. 어서 오십시오, "+P.name+"님!","#e8d36e");
   if(_esc){
     log("<b>이전 탐험은 이탈로 처리되었습니다.</b> 던전 안에서 기록이 끊겼습니다.","#9fe2ff");
     if(_esc.lost>0)log("탐험 중 번 은화 <b>"+_esc.lost.toLocaleString()+"</b>는 남지 않았습니다. 계시(문신)도 함께 사라졌습니다.","#a89c86");
     else log("계시(문신)는 사라졌습니다. 은화는 가져갔던 만큼 그대로 남았습니다.","#a89c86");
   }
   /* R30 — 화면 갱신은 하나씩 감싼다. 여기서 예외가 나도 캐릭터는 이미 살아 있다. */
   ["refreshInv","refreshChar","refreshQuest","refreshLore","buildPad","qSyncCollect"].forEach(function(fn){
     try{ if(typeof window[fn]==="function")window[fn](); }
     catch(e){ if(typeof console!=="undefined"&&console.warn)console.warn("[불러오기] "+fn+" 갱신 실패: "+e.message); }
   });
   if(_drop&&_drop.length){
     savNote("불러왔습니다 — 지금 버전에 없는 항목 "+_drop.length+"개는 정리했습니다: "+_drop.slice(0,4).join(", ")+
             (_drop.length>4?" 외":"" ),false);
   }else{
     var ln=document.getElementById("loadnote"); if(ln)ln.style.display="none";
   }
 }catch(e){
   /* ★ 조용히 죽지 않는다 — 왜 못 읽었는지 화면에 적는다 */
   savNote("<b>저장 데이터를 읽지 못했습니다.</b> ("+(e&&e.message?e.message:e)+")<br>"+
           "이 내용을 알려 주시면 원인을 잡을 수 있습니다. 다른 슬롯은 정상일 수 있습니다.",true);
   if(typeof console!=="undefined"&&console.error)console.error("[불러오기 실패]",e);
 }
}
/* R27 — 로컬 .sav 내보내기는 정책상 막혔다(31_account.js). 서버가 열리면 그쪽으로 간다.
   대표 지시: "캐릭터 내보내기는 서버구축되면 내 서버로만 ... 뜯어서 핵쓸수있을거같은 우려" */
function fileSave(){
 if(typeof charExport==="function"){charExport();return;}
 log("캐릭터 파일 내보내기는 잠겨 있습니다.","#ffb27a");
}
document.getElementById("savefile").addEventListener("change",function(ev){
 var f=ev.target.files[0];if(!f)return;
 var r=new FileReader();r.onload=function(){applyLoad((r.result||"").toString().trim());};
 r.readAsText(f);ev.target.value="";});
/* 패널 */
/* ================= R31d 타이틀 화면 위로 패널 띄우기 =================
   오래된 버그: 타이틀에서 「이어하기」를 누르면 저장창이 **타이틀 그림(z-index 30) 뒤에** 깔려
   아무 일도 안 일어난 것처럼 보였다(대표 리포트 2회). 「설정」도 같은 증상이었다.
   ★ 단순히 z-index 만 올려서는 안 된다 — 패널은 #wrap 안에 있고 #wrap 에 transform 이 걸려 있어서
     transform 이 걸린 조상은 position:fixed 의 기준(포함 블록)이 된다. 그래서 화면 중앙 정렬이
     엉뚱한 자리로 간다(실측: top 이 -76px 로 화면 위로 잘렸다).
   → 그래서 **DOM 을 잠시 body 로 옮긴다**(시설 도킹과 같은 방식). 닫으면 제자리로 돌려놓는다. */
var PANEL_HOME = {};
function panelToTop(el){
  if(!el || PANEL_HOME[el.id]) return;
  /* ★ 원래 인라인 스타일을 통째로 적어 둔다. 일부 패널은 좌표가 **HTML 인라인**에 있다
     (예: #opt style="left:50%;top:26px;transform:translateX(-50%)").
     R31d 에서 이걸 모르고 좌표만 지웠다가, 설정창이 자리를 잃고 게임 틀 아래로 흘러내렸다
     (대표 리포트: "환경설정은 왜 저 아래로 꺼져있는거야?"). */
  PANEL_HOME[el.id] = { parent: el.parentNode, next: el.nextSibling,
                        style: el.getAttribute("style") || "" };
  document.body.appendChild(el);
  el.classList.add("overtitle");
  /* 좌표는 인라인으로 준다 — #save{left:230px;top:60px} 처럼 id 선택자가 클래스보다 세서
     CSS 클래스만으로는 중앙 정렬이 먹지 않는다(실측: top 이 -153px 로 화면 위로 잘렸다). */
  el.style.position = "fixed";
  el.style.left = "50%";
  el.style.top = "50%";
  el.style.transform = "translate(-50%,-50%)";
}
function panelToHome(el){
  if(!el) return;
  var h = PANEL_HOME[el.id];
  el.classList.remove("overtitle");
  /* ★ 옮긴 적이 없는 패널은 **손대지 않는다** — 인라인 좌표를 가진 패널을 망가뜨리지 않기 위함이다. */
  if(!h) return;
  el.setAttribute("style", h.style);        /* 옮기기 전 인라인 스타일 그대로 복원 */
  if(h.next && h.next.parentNode === h.parent) h.parent.insertBefore(el, h.next);
  else h.parent.appendChild(el);
  delete PANEL_HOME[el.id];
}
function openP(id){var _el=document.getElementById(id);
 if(typeof started!=="undefined"&&!started)panelToTop(_el); else panelToHome(_el);
 _el.style.display="block";
 if(id==="char")refreshChar();if(id==="inv")refreshInv();if(id==="skillp")refreshSkillPanel();if(id==="quest")refreshQuest();if(id==="lorep")refreshLore();if(id==="hunt")refreshHunt();}
function closeP(id){var _c=document.getElementById(id);_c.style.display="none";
 panelToHome(_c);
 if(id==="inv"&&enchState){enchState=null;document.getElementById("enchhint").style.display="none";}
 /* R27 — 가방/상점을 닫으면 오른쪽 상세 패널도 함께 치운다(허공에 남지 않게) */
 if((id==="inv"||id==="shop")&&typeof facInfoClear==="function")facInfoClear();}
function toggleP(id){var el=document.getElementById(id);
 if(el.style.display==="block")closeP(id);else openP(id);}
function toggleFull(){try{
 if(document.fullscreenElement)document.exitFullscreen();
 else document.documentElement.requestFullscreen();}catch(e){}}
