/* ================= 시작 ================= */
/* 계열 잠금 — 1부(5층) 클리어 전에는 기사만 (대표 지시) */
function clsLocked(ck){
 if(ck==="k")return false;
 /* ★ 저장소를 다시 읽는 건 **타이틀/캐릭터 선택에서만** 해야 한다.
    이 함수는 buildClassCards 를 타고 런 중에도 불린다(1부 클리어 직후 계열 해금 팝업이
    타이틀 카드를 갱신한다). 그때 metaLoad 를 하면 아직 저장 전인 메모리 상태를 저장본으로
    되돌려 버린다 — 방금 세운 clear1 이 사라지는 식이다. 실제로 R19a 검증에서 이 되돌림이
    관측됐다(런 중 metaLoad -> clear1 0 -> 다음 부가 안 열림). */
 if(typeof started==="undefined"||!started){ try{metaLoad();}catch(e){} }
 return !(typeof META!=="undefined"&&META&&META.clear1);
}
var CARD_RETRY=0;      /* 시트 로드 대기용 — buildClassCards 재호출 상한 */
function buildClassCards(){
 var row=document.getElementById("clsrow");row.innerHTML="";
 if(typeof buildStatAlloc==="function")setTimeout(buildStatAlloc,0);
 if(clsLocked(pickCls))pickCls="k";
 ["k","e","m"].forEach(function(ck){
   var C=CLS[ck], lk=clsLocked(ck);
   var d=document.createElement("div");d.className="ccard"+(ck===pickCls?" on":"")+(lk?" lock":"");
   /* R19b — 계열을 바꾸면 그 계열이 마지막에 쓴 배분을 불러온다(0으로 밀지 않는다).
      대표 지시: "새로 시작할 때 캐릭터 변경 아니면 초기 스탯 배분을 고정" */
   d.onclick=lk?function(){log("이 계열은 <b>1부 클리어 후</b> 해금됩니다.","#ffb27a");}
              :function(){if(pickCls!==ck){allocRecall(ck);}pickCls=ck;buildClassCards();allocLabel();};
   var pc=document.createElement("canvas");pc.width=68;pc.height=84;
   var g=pc.getContext("2d");g.imageSmoothingEnabled=false;
   /* R31f — 세 계열 모두 '그려 놓은 시트'를 카드에 쓴다.
      대표 지적: "2캐릭터다 새로 캐릭터 그린걸로 아는데 픽셀로 뜨는상태"
      → 기사는 PCS(assets/pc), 궁수·마법사는 SPRITE[계열].src = "mob:pc_elf"/"mob:pc_wiz" 시트를 쓴다.
        시트는 비동기 로드라 타이틀이 먼저 그려질 수 있다 → 아직이면 절차 생성으로 그린 뒤
        cardRetry 횟수 안에서 한 번 더 그린다(무한 재호출 방지). */
   var kimg=null;
   if(ck==="k"){ if(typeof PCS!=="undefined"&&PCS.img.idle_s&&PCS.img.idle_s.ok) kimg=PCS.img.idle_s; }
   else{
     var ssrc=(typeof SPRITE!=="undefined"&&SPRITE[ck]&&SPRITE[ck].src)||"";
     if(ssrc.indexOf("mob:")===0&&typeof MSH!=="undefined"){
       var mrec=MSH.set[ssrc.slice(4)];
       if(mrec&&mrec.ok&&mrec.img.idle_s) kimg=mrec.img.idle_s;
     }
   }
   if(!kimg&&ck!=="k"&&!lk&&CARD_RETRY<8){ CARD_RETRY++; setTimeout(buildClassCards,320); }
   if(kimg){
     var sc=Math.min(68/kimg.fw,80/kimg.fh);
     g.drawImage(kimg.img,0,0,kimg.fw,kimg.fh,
       Math.round((68-kimg.fw*sc)/2),Math.round(84-kimg.fh*sc),Math.round(kimg.fw*sc),Math.round(kimg.fh*sc));
   }else{
     var ck2=Math.min(68/SW,84/SH);
     g.drawImage(sprite("sel_"+ck,ACT[C.act],0,"i0"),0,0,SW,SH,
       Math.round((68-SW*ck2)/2),Math.round(84-SH*ck2),Math.round(SW*ck2),Math.round(SH*ck2));
   }
   d.appendChild(pc);
   var h=document.createElement("h4");h.textContent=lk?"???":C.n;d.appendChild(h);
   var p=document.createElement("p");p.textContent=lk?"봉인된 계시. 1부를 클리어하면 계열이 열립니다.":C.desc;d.appendChild(p);
   var st=document.createElement("div");st.className="st";
   st.innerHTML=lk?"🔒 1부 클리어 후 해금"
     :"STR "+C.str+" · DEX "+C.dex+" · CON "+C.con+"<br>INT "+C.int+" · WIS "+C.wis+
      " · "+(ck==="k"?"근접":"원거리");
   d.appendChild(st);
   row.appendChild(d);
 });
}
/* 생성 시 자유 스탯 배분 — 8포인트, 스탯당 최대 +5 (대표 지시: 차별성) */
var ALLOC_POOL=8, ALLOC_CAP=5, ALLOC={str:0,dex:0,con:0,int:0,wis:0};
var ALLOC_INFO=[["str","STR · 힘","물리 공격력"],["dex","DEX · 민첩","명중·회피"],
 ["con","CON · 체력","HP +3 / 레벨업 HP"],["int","INT · 지능","마법 공격력·MP +1"],["wis","WIS · 지혜","마법 저항·MP +1"]];
function allocLeft(){var u=0,k;for(k in ALLOC)u+=ALLOC[k];return ALLOC_POOL-u;}
/* ---------- R19b 배분 기억 (대표 지시) ----------
   "새로 시작할 때 캐릭터 변경 아니면 초기 스탯 배분을 고정으로 해줘"
   → 계열별 마지막 배분을 META 에 남긴다. 같은 계열로 다시 시작하면 그대로 복원되므로
     죽고 재시작할 때마다 8포인트를 다시 찍는 반복 작업이 사라진다.
     계열을 바꾸면 그 계열이 쓰던 배분을 불러온다(처음 고르는 계열은 0에서 시작).
   ★ 저장값을 그대로 믿지 않고 상한(POOL/CAP)으로 다시 재단한다 — 나중에 POOL 을 줄이면
     옛 저장값이 초과 배분으로 남아 공짜 스탯이 되기 때문이다. */
function allocClamp(o){
  var out={str:0,dex:0,con:0,int:0,wis:0},left=ALLOC_POOL,i,k;
  for(i=0;i<ALLOC_INFO.length;i++){
    k=ALLOC_INFO[i][0];
    var v=Math.floor((o&&o[k])||0);
    if(!(v>0))v=0;
    if(v>ALLOC_CAP)v=ALLOC_CAP;
    if(v>left)v=left;
    out[k]=v;left-=v;
  }
  return out;
}
function allocRecall(cls){
  var saved=null;
  try{ /* clsLocked 와 같은 이유로 런 중에는 저장소를 다시 읽지 않는다 */
       if(typeof metaLoad==="function"&&(typeof started==="undefined"||!started))metaLoad();
       if(typeof META!=="undefined"&&META&&META.alloc)saved=META.alloc[cls]; }catch(e){}
  ALLOC=allocClamp(saved);
  return ALLOC;
}
function allocRemember(cls){
  try{
    if(typeof META==="undefined"||!META)return;
    if(!META.alloc)META.alloc={};
    META.alloc[cls]={str:ALLOC.str||0,dex:ALLOC.dex||0,con:ALLOC.con||0,int:ALLOC.int||0,wis:ALLOC.wis||0};
    if(typeof metaSave==="function")metaSave();
  }catch(e){}
}
function allocMod(k,d){
 if(d>0&&(allocLeft()<=0||ALLOC[k]>=ALLOC_CAP))return;
 if(d<0&&ALLOC[k]<=0)return;
 ALLOC[k]+=d;buildStatAlloc();allocLabel();
}
function allocLabel(){
 var b=document.getElementById("allocbtn");if(!b)return;
 var used=ALLOC_POOL-allocLeft();
 b.innerHTML=used>0?"✦ 스탯 배분 <b style='color:#7CFC00'>"+used+"</b> / "+ALLOC_POOL+"P"
                   :"✦ 추가 스탯 배분 ("+ALLOC_POOL+"P)";
}
function openAlloc(){buildStatAlloc();document.getElementById("allocov").style.display="block";}
function closeAlloc(){document.getElementById("allocov").style.display="none";allocLabel();}
function allocReset(){ALLOC={str:0,dex:0,con:0,int:0,wis:0};buildStatAlloc();allocLabel();}
function buildStatAlloc(){
 var el=document.getElementById("statalloc");if(!el)return;
 var C=CLS[pickCls],h='<div class="sh">추가 스탯 배분 — 남은 포인트 <b>'+allocLeft()+'</b> / '+ALLOC_POOL+'</div>';
 ALLOC_INFO.forEach(function(si){
   var k=si[0],base=C[k],a=ALLOC[k];
   h+='<div class="srow"><span class="sn">'+si[1]+'</span>'+
      '<span class="sv">'+base+(a?' <b>+'+a+'</b>':'')+'</span>'+
      '<span class="sbtn'+(a<=0?" dis":"")+'" onclick="allocMod(\''+k+'\',-1)">−</span>'+
      '<span class="sbtn'+((allocLeft()<=0||a>=ALLOC_CAP)?" dis":"")+'" onclick="allocMod(\''+k+'\',1)">+</span>'+
      '<span style="color:#6b6046;font-size:10px">'+si[2]+'</span></div>';
 });
 /* R19b — 지난 배분이 그대로 복원됐다는 걸 알려 준다. 안 알려 주면 "왜 이미 찍혀 있지?" 가 된다. */
 var sv=null;try{if(typeof META!=="undefined"&&META&&META.alloc)sv=META.alloc[pickCls];}catch(e){}
 if(sv&&allocLeft()<ALLOC_POOL)
   h+='<div style="margin-top:6px;color:#8a8068;font-size:10px">지난 배분을 그대로 불러왔습니다 — 바꾸지 않으면 이대로 시작합니다. (초기화로 다시 찍기)</div>';
 el.innerHTML=h;
}
/* 타이틀 → 캐릭터 선택 2단 흐름 */
function showCharSel(){
 document.getElementById("startov").style.display="none";
 document.getElementById("charov").style.display="block";
 if(typeof clsLocked==="function"&&clsLocked(pickCls))pickCls="k";
 allocRecall(pickCls);        /* R19b — 지난 배분 복원 (계열이 그대로면 손댈 필요가 없다) */
 buildClassCards();
 buildStatAlloc();
 allocLabel();
}
function backToTitle(){
 document.getElementById("charov").style.display="none";
 document.getElementById("allocov").style.display="none";
 document.getElementById("startov").style.display="block";
 titleExtraSync();
}
/* R32 T-P1-1 — 엔딩을 한 번 본 계정에만 타이틀에 '엔딩 감상'을 띄운다.
   플래그는 META(영구 저장)에 있으므로 캐릭터가 죽어도 남는다. */
function titleExtraSync(){
 var b=document.getElementById("endreplay");
 if(!b)return;
 if(typeof started==="undefined"||!started){ try{if(typeof metaLoad==="function")metaLoad();}catch(e){} }
 var seen=(typeof META!=="undefined"&&META&&META.endSeen);
 b.style.display=seen?"inline-block":"none";
}
function startGame(){
 var nm=document.getElementById("pname").value.trim()||"모험가";
 P=newPlayer(nm,pickCls);
 /* v4: 배분한 8P를 P에 스냅샷으로 저장 — 사망 시 레벨을 초기화해도
    최초 스탯 배분(대표 지시: 차별성)만은 다시 입혀 줄 수 있도록. */
 P.alloc={str:ALLOC.str||0,dex:ALLOC.dex||0,con:ALLOC.con||0,int:ALLOC.int||0,wis:ALLOC.wis||0};
 (function(){var k,hp=0,mp=0;
   for(k in ALLOC){if(!ALLOC[k])continue;P[k]+=ALLOC[k];
     if(k==="con")hp+=ALLOC[k]*3;
     if(k==="int"||k==="wis")mp+=ALLOC[k];}
   P.mhp+=hp;P.hp=P.mhp;P.mmp+=mp;P.mp=P.mmp;})();
 CLS[pickCls].start.forEach(function(k){addItem(k,ITEMS[k].t==="potion"?5:(ITEMS[k].t==="ammo"?1:1));});
 SLOTS.forEach(function(sl){
   for(var i=0;i<P.inv.length;i++){var d=ITEMS[P.inv[i].k];
     if(d.t===sl&&!P.eq[sl]&&canUse(P.inv[i].k)){P.eq[sl]=P.inv[i];break;}}});
 addItem("hpot",8);
 if(pickCls!=="k")addItem("mpot",5);
 metaLoad();
 allocRemember(pickCls);      /* R19b — 이번 배분을 계열별로 기억(다음 시작 때 그대로 복원) */
 metaApplyToPlayer();markApplyToPlayer();
 started=true;lastAuto=T;P.hunt=huntReset();P.ap=P.ap||apDefault();
 applyHud();
 document.getElementById("startov").style.display="none";
 document.getElementById("charov").style.display="none";
 document.getElementById("allocov").style.display="none";
 document.getElementById("hud").style.display="flex";
 if(typeof fitScale==="function")fitScale();
 travel(0,10,9);
 log("── <b>"+WORLD.title+"</b> · "+(WORLD.sub||"")+" ──","#e8d36e");
 if(WORLD.intro)WORLD.intro.forEach(function(t){log(t,"#a89c86");});
 log(nm+" — "+CLS[pickCls].n+" · 이능 등급 <b>최하급</b>. 문신은 아직 옅습니다.","#e8d36e");
 log(CLS[pickCls].desc,"#aaa");
 log("마을 사람들 머리 위의 <b style='color:#ffd24a'>!</b> 를 찾아 말을 거십시오. [J] 퀘스트 일지","#888");
 log("스킬과 회피는 <b>영구 성장 상점에서 구매</b>해 익힙니다. 던전에서 벌어 온 포인트가 재화입니다.","#888");
 if(!STOREOK)log("이 화면에서는 자동 저장이 불가합니다. [Z] → 파일로 저장을 이용하십시오.","#ffb27a");
 refreshInv();refreshChar();refreshQuest();refreshLore();buildPad();
 sfx("lvl");
 /* v4: 각인이 아직 없으면 의식을 띄운다. 신규 1회뿐 — META 에 남는다. */
 if(!markHas())setTimeout(markStart,320);
}
document.getElementById("hud").style.display="none";   /* 시작 전에는 하단 인터페이스 숨김 (대표 지시) */
for(var zi=0;zi<ZONES.length;zi++)world.push(buildZone(zi));
initSheets();
buildClassCards();
titleExtraSync();      /* R32 — 부팅 시 타이틀의 '엔딩 감상' 노출 여부 결정 */
(function(){
 var seen=false;
 try{seen=(STOREOK&&localStorage.getItem("lc2_intro_seen")==="1");}catch(e){}
 if(!seen)setTimeout(playIntro,320);
})();
var last=performance.now();
/* 한 프레임에서 예외가 나도 루프가 죽지 않게 한다.
   (과거 updProj 에서 예외가 나 requestAnimationFrame 재등록이 건너뛰어져 게임이 통째로 멈춘 적이 있음) */
var frameErr=0;
function frame(t){
 var dt=Math.min(.05,(t-last)/1000);last=t;
 try{ update(dt);render();refreshHud();drawMinimap();drawTargetInfo(); }
 catch(e){
   frameErr++;
   if(frameErr<=3){try{console.error("frame error:",e);log("내부 오류가 발생했지만 계속 진행합니다.","#f88");}catch(_){}}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.getElementById("pname").addEventListener("keydown",function(e){
 if(e.key==="Enter")startGame();e.stopPropagation();});
/* 화면 맞춤
   - 창 크기는 레이아웃 실측(offsetWidth/Height)으로 잡는다. 시야 설정에 따라 달라지므로 상수를 쓰지 않는다.
   - 배율 상한을 없앴다. 예전에는 1로 묶여 있어 큰 모니터에서도 작게 나왔다.
   - 캔버스 표시 배율 = 2 x s 이므로, s 가 0.5의 배수일 때 도트가 정확히 정수배로 확대된다.
     OPT.crisp 가 켜져 있으면 그 값으로 내림해 글자·도트가 뭉개지지 않게 한다. */
function fitScale(){
 var el=document.getElementById("wrap");
 var w=window.innerWidth,h=window.innerHeight;
 /* 터치 패드 자리 — 가로 화면에서만 옆을 비운다. 세로 폰에서는 패드가 화면 위에 겹뜨므로
    옆을 비우면 게임만 작아진다. */
 var reserve=(typeof padOn!=="undefined"&&padOn&&w>h)?142:0;
 var aw=w-reserve;
 var natW=el.offsetWidth||964, natH=el.offsetHeight||712;
 var fit=Math.min((aw-4)/natW,(h-6)/natH);
 var s=(OPT.scale>0)?Math.min(OPT.scale,fit):fit;
 if(OPT.crisp&&s>=0.5)s=Math.floor(s*2)/2;   /* 0.5 단위로 내림 → 정수배 픽셀 */
 s=Math.max(s,0.28);
 curScale=s;
 el.style.transform="scale("+s+")";
 el.style.left=Math.max(0,(aw-natW*s)/2)+"px";
 el.style.top=Math.max(0,(h-natH*s)/2)+"px";
 var isTouch=("ontouchstart" in window)||navigator.maxTouchPoints>0;
 document.getElementById("rotatehint").style.display=(isTouch&&h>w&&w<760)?"block":"none";
 /* R24b — 스킬·물약을 우측 검은 여백으로 옮길지 결정한다(대표 지시: 하단 퀵바가 잘린다).
    게임 틀은 화면 가운데 놓이므로 한쪽 여백 = (화면폭 - 틀폭*배율)/2 다.
    그 여백이 레일(158px)보다 넉넉할 때만 켠다 — 아니면 레일이 게임 위에 겹친다.
    모바일 패드를 켠 상태에서는 그쪽이 우측을 쓰므로 레일을 켜지 않는다. */
 if(typeof RAIL_ON!=="undefined"){
   var side=(w-natW*s)/2;
   /* R30 — 대표 지시로 자리를 직접 고를 수 있게 했다(설정 → 퀵슬롯 자리).
      자동일 때의 기준도 낮췄다(172 → 150): 초광폭에서 여백이 충분한데도 하단에 남아
      버튼이 여러 줄로 접히는 경우가 있었다. */
   var padBusy=(typeof padOn!=="undefined"&&padOn);
   var qp=(typeof OPT!=="undefined"&&OPT.qpos)?OPT.qpos:0;
   var want;
   if(qp===1) want=false;
   else if(qp===2) want=!padBusy&&w>1000;
   else want=(side>=150)&&!padBusy&&w>820;
   if(want!==RAIL_ON){RAIL_ON=want;if(typeof railSync==="function")railSync();}
 }
}
window.addEventListener("resize",fitScale);
window.addEventListener("orientationchange",function(){setTimeout(fitScale,300);});
applyAll();
fitScale();
musicPlay("intro");   /* 시작 화면 = 접속 음악 */

/* R30 — 창 크기가 바뀌면 UI 배율(자동)도 다시 잡는다 */
window.addEventListener("resize",function(){ if(typeof applyUiZoom==="function")applyUiZoom(); });
if(typeof applyUiZoom==="function")applyUiZoom();
