/* ================= 환경 설정 =================
   화면 배율 / 시야 범위 / 사운드 / HUD 표시 / 몬스터 밀도.
   세이브 파일과 별개로 브라우저에 보관된다(캐릭터가 아니라 '이 PC의 설정'이므로).

   시야(VIEWS)는 게임 캔버스의 내부 해상도다. 넓게 잡을수록 화면에 더 많은 맵이 들어오고
   대신 도트가 작아진다. 표시 크기는 항상 내부 해상도의 2배이므로 픽셀이 뭉개지지 않는다.
   ============================================= */
var VIEWS=[
 {n:"좁게",   w:480, h:288, d:"기본. 도트가 가장 큼"},
 {n:"보통",   w:560, h:336, d:"시야 +36%"},
 {n:"넓게",   w:640, h:384, d:"시야 +78%"},
 {n:"아주 넓게",w:720, h:432, d:"시야 +125%. 큰 모니터용"}
];
var SCALES=[
 {v:0,   n:"자동"},
 {v:1,   n:"100%"},
 {v:1.5, n:"150%"},
 {v:2,   n:"200%"},
 {v:2.5, n:"250%"},
 {v:3,   n:"300%"}
];
var DENS=[{v:1,n:"적게"},{v:1.6,n:"보통"},{v:2.2,n:"많게"},{v:3,n:"매우 많게"}];

var OPT={
 view:0, scale:0, crisp:true,
 bgm:true, bgmVol:0.7, sfxOn:true, sfxVol:0.8, music:"track",
 shake:true, dmgnum:true, minimap:true, qtrack:true,
 density:1.6, bigart:true,
 uiz:0,                        /* R30 UI 배율 — 0 = 자동(화면 크기에 맞춤), 그 외 1/1.15/1.3/1.5 */
 qpos:0,                       /* R30 퀵슬롯 자리 — 0 자동 / 1 하단 / 2 우측 레일 */
 mobile:false, mSet:false,     /* 모바일 모드 · 첫 실행 자동 감지 완료 여부 */
 mmSet:false                  /* R34f 음악 모드(실제음악/칩튠)를 사용자가 직접 고른 적 있는가 */
};
var VW=480, VH=288, curScale=1;
var OPTKEY="lc2_options";

function optLoad(){
 try{
   var s=localStorage.getItem(OPTKEY);
   if(!s)return;
   var o=JSON.parse(s),k;
   for(k in OPT)if(o[k]!==undefined&&typeof o[k]===typeof OPT[k])OPT[k]=o[k];
 }catch(e){}
}
function optSave(){try{localStorage.setItem(OPTKEY,JSON.stringify(OPT));}catch(e){}}
optLoad();
/* ================= R34f 음악 모드 자동 복구 =================
   증상: 음원이 10곡 다 박힌 빌드인데도 계속 칩튠만 나온다는 신고가 반복됐다.
   원인: musicMode() 가 "chip" 을 돌려주는 경로는 두 가지뿐인데(음원 없음 / OPT.music==="chip"),
         음원은 확인 결과 정상이었다. 즉 브라우저에 저장된 설정값이 칩튠으로 굳어 있는 경우다.
         이 값은 localStorage 에 남아 새 빌드를 열어도 그대로 따라오므로, 빌드를 아무리 다시 내도
         증상이 똑같이 재현된다(대표가 겪은 그대로).
   대책: '사용자가 음악 모드를 직접 고른 적이 있는가'(mmSet)를 따로 기록하고, 고른 적이 없는데
         값만 칩튠으로 남아 있으면 실제 음악으로 되돌린다. 직접 칩튠을 고르신 경우엔 건드리지 않는다.
   ========================================================== */
(function(){
 if(OPT.mmSet)return;                       /* 직접 고르신 설정은 존중한다 */
 if(OPT.music==="track")return;
 var n=0,k; if(typeof MUSICSRC!=="undefined")for(k in MUSICSRC)n++;
 if(n<=0)return;                            /* 음원이 없는 빌드면 칩튠이 맞다 */
 OPT.music="track"; optSave();
})();
/* 첫 실행이면 터치 기기 여부로 모바일 모드를 자동 결정한다. 이후엔 사용자의 선택을 따른다. */
if(!OPT.mSet){
 OPT.mSet=true;
 var _tc=("ontouchstart" in window)||navigator.maxTouchPoints>0;
 if(_tc){OPT.mobile=true;OPT.view=0;OPT.scale=0;OPT.crisp=false;}
 optSave();
}
VW=VIEWS[OPT.view].w; VH=VIEWS[OPT.view].h;

/* ---------- 적용 ---------- */
function applyView(){
 var V=VIEWS[OPT.view]||VIEWS[0];
 VW=V.w;VH=V.h;
 var g=document.getElementById("game");
 g.width=VW;g.height=VH;
 g.style.width=(VW*2)+"px";g.style.height=(VH*2)+"px";
 var gb=document.getElementById("gamebox");
 gb.style.width=(VW*2)+"px";gb.style.height=(VH*2)+"px";
 document.getElementById("wrap").style.width=(VW*2+4)+"px";
 var ic=document.getElementById("introcv");
 if(ic){ic.style.width=(VW*2)+"px";ic.style.height=(VH*2)+"px";}
 if(typeof ctx!=="undefined"&&ctx)ctx.imageSmoothingEnabled=false;
 if(typeof lcv!=="undefined"&&lcv){lcv.width=VW;lcv.height=VH;}
 if(typeof SPRC!=="undefined");   /* 스프라이트 캐시는 해상도와 무관 */
 if(typeof fitScale==="function")fitScale();
}
function applyHud(){
 var m=document.getElementById("mmapwrap"),q=document.getElementById("qtrack");
 if(m)m.style.display=OPT.minimap?"block":"none";
 if(q)q.style.display=OPT.qtrack?"":"none";
 if(typeof mapOn!=="undefined")mapOn=OPT.minimap;
}
function applySound(){
 BGM.on=OPT.bgm;
 var b=document.getElementById("bgmbtn");
 if(b)b.textContent=OPT.bgm?"♪ BGM ON":"♪ BGM OFF";
 try{
   if(typeof bgmGain!=="undefined"&&bgmGain)bgmGain.gain.value=(OPT.bgm&&musicMode()==="chip")?OPT.bgmVol:0;
   if(typeof musicApplyVol==="function"){if(musicMode()==="track")musicApplyVol();else musicStopAll();}
   if(typeof sfxGain!=="undefined"&&sfxGain)sfxGain.gain.value=OPT.sfxOn?OPT.sfxVol:0;
 }catch(e){}
 if(OPT.bgm&&typeof AC!=="undefined"&&AC)BGM.next=AC.currentTime+.1;
}
/* 캐릭터/오브젝트 확대(48px 급) + 팔레트 정렬 토글.
   SW/SH/FX/FY 와 스프라이트 캐시를 통째로 다시 만든다. */
function applyArt(){
  var want=OPT.bigart?1.6:1;
  if(PXS===want&&STYLE.on===!!OPT.bigart)return;
  PXS=want; STYLE.on=!!OPT.bigart;
  SW=Math.round(34*PXS);SH=Math.round(42*PXS);FX=Math.round(17*PXS);FY=Math.round(36*PXS);
  rebuildActorPalettes();
  SPRC={};OBJC={};
  if(typeof buildClassCards==="function")buildClassCards();
}
/* 모바일 모드 — 스마트폰 기준 화면·조작 일괄 적용 */
function applyMobile(){
 var on=!!OPT.mobile;
 try{document.body.classList[on?"add":"remove"]("mobile");}catch(e){}
 if(typeof padOn!=="undefined"){
   padOn=on||IS_TOUCH;
   var mp=document.getElementById("mpad");if(mp)mp.className=padOn?"on":"";
   if(typeof syncPad==="function")syncPad();
 }
 if(typeof fitScale==="function")fitScale();
}
/* ================= R30 UI 배율 =================
   대표 리포트: 초광폭 모니터(2600x1007)에서 상점·가방 글씨와 아이콘이 너무 작다.
   패널 글씨는 고정 px 이라 화면이 커질수록 상대적으로 작아진다(회귀가 아니라 구조 문제).
   여기서 계산한 값을 CSS 변수 --uiz 로 넘기고, 템플릿이 오버레이·패널 층에 zoom 으로 적용한다.
   zoom 은 레이아웃과 클릭 판정이 함께 커지므로 버튼이 어긋나지 않는다(transform 과 다르다).
   자동값은 **가로·세로 중 작은 쪽 기준**이다 — 초광폭에서 가로만 보고 키우면 세로가 잘린다. */
function uiZoom(){
 if(OPT.uiz&&OPT.uiz>0)return OPT.uiz;
 var w=window.innerWidth||1280, h=window.innerHeight||800;
 var z=Math.min(w/1280, h/760);
 /* R31c — 상한 1.6 → 1.25. 이 값은 시설·거점 화면에만 쓰이며, 크게 잡으면 목록이 넘친다. */
 z=Math.max(1, Math.min(1.25, z));
 return Math.round(z*20)/20;                      /* 0.05 단위로 정리 */
}
function applyUiZoom(){
 var z=uiZoom();
 try{ document.documentElement.style.setProperty("--uiz", z); }catch(e){}
 if(typeof panelZoomAll==="function")panelZoomAll();     /* 틀 안쪽 패널도 같이 맞춘다 */
 return z;
}
function applyAll(){applyArt();applyView();applyHud();applySound();applyMobile();applyUiZoom();}

/* ---------- 설정 패널 ---------- */
function openOpt(){openP("opt");renderOpt();}
function optSet(k,v){
 OPT[k]=v;optSave();
 if(k==="mobile"){
   if(v){OPT.view=0;OPT.scale=0;OPT.crisp=false;}   /* 폰 프리셋: 큰 도트 · 자동 배율 · 꽉 채움 */
   else{OPT.crisp=true;}
   optSave();applyView();applyMobile();renderOpt();return;
 }
 if(k==="uiz"){applyUiZoom();}
 else if(k==="qpos"){if(typeof fitScale==="function")fitScale();if(typeof railSync==="function")railSync();}
 else if(k==="view"){applyView();}
 else if(k==="scale"||k==="crisp"){fitScale();}
 else if(k==="minimap"||k==="qtrack"){applyHud();}
 else if(k==="density"){rebuildWorld();}
 else if(k==="bigart"){applyArt();}
 else if(k==="music"){OPT.mmSet=true;optSave();applySound();if(musicMode()==="track"&&MUS.want)musicPlay(MUS.want,true);if(typeof musicStamp==="function")musicStamp();}
 else applySound();
 renderOpt();
}
function optRow(title,desc,html){
 return '<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid #241f33">'+
   '<div style="flex:0 0 112px"><div style="color:#e8d36e">'+title+'</div>'+
   (desc?'<div style="color:#6b6046;font-size:10px;line-height:13px">'+desc+'</div>':'')+'</div>'+
   '<div style="flex:1 1 auto;display:flex;flex-wrap:wrap;gap:4px;align-items:center">'+html+'</div></div>';
}
function optBtn(label,on,fn){
 return '<button class="ib'+(on?" on":"")+'" style="padding:3px 9px;'+
   (on?"background:#4a3f28;color:#fff8d0;border-color:#c9a227":"")+'" onclick="'+fn+'">'+label+'</button>';
}
function optVol(k,val){
 var h="";
 [0,0.25,0.5,0.75,1].forEach(function(v){
   h+=optBtn(v===0?"0":Math.round(v*100)+"%",Math.abs(val-v)<0.01,"optSet('"+k+"',"+v+")");});
 return h;
}
function renderOpt(){
 var el=document.getElementById("optbody");if(!el)return;
 var h="";
 var eff=Math.round(curScale*100);
 /* R36 — 「모바일 모드」 항목 제거(PC 전용). OPT.mobile 값과 optSet 처리는 남겨 둔다 —
    기존 저장본에 true 로 남아 있어도 10_mobilepad.js 스텁이 아무 일도 하지 않는다. */
 h+=optRow("화면 배율","창 전체 크기",
   SCALES.map(function(s){return optBtn(s.n,OPT.scale===s.v,"optSet('scale',"+s.v+")");}).join("")+
   '<span style="color:#6b6046;font-size:10px;margin-left:4px">현재 '+eff+'% 적용</span>');
 h+=optRow("퀵슬롯 자리","스킬·물약 버튼을 어디에 둘지",
   [[0,"자동"],[1,"하단"],[2,"우측"]].map(function(u){
     return optBtn(u[1],OPT.qpos===u[0],"optSet('qpos',"+u[0]+")");}).join("")+
   '<span style="color:#6b6046;font-size:10px;margin-left:4px">'+
   ((typeof RAIL_ON!=="undefined"&&RAIL_ON)?"지금 우측 레일":"지금 하단 퀵바")+'</span>');
 h+=optRow("시설 화면 크기","상점·거점 화면의 글씨·아이콘 (전체 크기는 아래 「화면 배율」)",
   [[0,"자동"],[1,"100%"],[1.15,"115%"],[1.3,"130%"],[1.5,"150%"]].map(function(u){
     return optBtn(u[1],OPT.uiz===u[0],"optSet('uiz',"+u[0]+")");}).join("")+
   '<span style="color:#6b6046;font-size:10px;margin-left:4px">현재 '+Math.round(uiZoom()*100)+'% 적용</span>');
 h+=optRow("픽셀 선명도","도트가 뭉개지면 켜십시오",
   optBtn("선명 우선",OPT.crisp,"optSet('crisp',true)")+optBtn("화면 꽉 채우기",!OPT.crisp,"optSet('crisp',false)"));
 h+=optRow("시야 범위","화면에 보이는 맵 면적",
   VIEWS.map(function(v,i){return optBtn(v.n,OPT.view===i,"optSet('view',"+i+")");}).join("")+
   '<div style="color:#6b6046;font-size:10px;width:100%">'+(VIEWS[OPT.view].d||"")+' — 내부 '+VW+'×'+VH+'</div>');
 h+='<div style="height:6px"></div>';
 h+=optRow("배경음악","",optBtn("켜기",OPT.bgm,"optSet('bgm',true)")+optBtn("끄기",!OPT.bgm,"optSet('bgm',false)"));
 if(musicAvailable()){
   var nowp=musicNow();
   h+=optRow("음악 종류","트랙 = 실제 음원 / 칩튠 = 8비트 자동연주",
     optBtn("실제 음악",OPT.music==="track","optSet('music','track')")+
     optBtn("칩튠",OPT.music==="chip","optSet('music','chip')")+
     (nowp?'<div style="color:#6b6046;font-size:10px;width:100%">지금 재생 중 — '+nowp+'</div>':""));
 }
 h+=optRow("음악 음량","",optVol("bgmVol",OPT.bgmVol));
 h+=optRow("효과음","",optBtn("켜기",OPT.sfxOn,"optSet('sfxOn',true)")+optBtn("끄기",!OPT.sfxOn,"optSet('sfxOn',false)"));
 h+=optRow("효과음 음량","",optVol("sfxVol",OPT.sfxVol));
 h+='<div style="height:6px"></div>';
 h+=optRow("화면 흔들림","멀미가 나면 끄십시오",
   optBtn("켜기",OPT.shake,"optSet('shake',true)")+optBtn("끄기",!OPT.shake,"optSet('shake',false)"));
 h+=optRow("데미지 숫자","",optBtn("켜기",OPT.dmgnum,"optSet('dmgnum',true)")+optBtn("끄기",!OPT.dmgnum,"optSet('dmgnum',false)"));
 h+=optRow("미니맵","",optBtn("켜기",OPT.minimap,"optSet('minimap',true)")+optBtn("끄기",!OPT.minimap,"optSet('minimap',false)"));
 h+=optRow("퀘스트 추적","",optBtn("켜기",OPT.qtrack,"optSet('qtrack',true)")+optBtn("끄기",!OPT.qtrack,"optSet('qtrack',false)"));
 h+='<div style="height:6px"></div>';
 h+=optRow("캐릭터 그림체","기사 에셋(48px)에 맞춰 확대 + 채도·외곽선 정렬",
   optBtn("48px 정렬",OPT.bigart,"optSet('bigart',true)")+optBtn("이전 30px",!OPT.bigart,"optSet('bigart',false)")+
   '<div style="color:#6b6046;font-size:10px;width:100%">몬스터·NPC·나무를 기사와 같은 크기로 올리고 색감을 맞춥니다.</div>');
 h+=optRow("몬스터 밀도","바꾸면 모든 지역이 다시 배치됩니다",
   DENS.map(function(d){return optBtn(d.n,Math.abs(OPT.density-d.v)<0.01,"optSet('density',"+d.v+")");}).join("")+
   '<div style="color:#6b6046;font-size:10px;width:100%">필드 NPC가 함께 사냥하므로 기본값을 「보통」으로 올렸습니다.</div>');
 h+='<div style="margin-top:8px;padding-top:6px;border-top:1px solid #4a3f22">'+
    '<button class="ib" onclick="optReset()">기본값으로</button>'+
    '<span style="color:#6b6046;font-size:10px;margin-left:8px">설정은 이 브라우저에 저장되며 세이브 파일과 무관합니다.</span></div>';
 el.innerHTML=h;
}
function optReset(){
 OPT={view:0,scale:0,crisp:true,uiz:0,qpos:0,bgm:true,bgmVol:0.7,sfxOn:true,sfxVol:0.8,
      shake:true,dmgnum:true,minimap:true,qtrack:true,density:1.6,music:"track",bigart:true};
 optSave();applyAll();rebuildWorld();renderOpt();
 if(typeof log==="function"&&typeof started!=="undefined"&&started)log("설정을 기본값으로 되돌렸습니다.","#888");
}
