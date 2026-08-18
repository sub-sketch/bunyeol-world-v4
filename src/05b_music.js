/* ================= 실제 음악(BGM 트랙) =================
   build.py --music 로 빌드하면 MUSICSRC 에 mp3 가 base64 로 주입된다.
   주입되지 않은(경량) 빌드에서는 MUSICSRC 가 비어 있고, 기존 칩튠 시퀀서로 자동 폴백한다.

   지역 song 키 -> 트랙 매핑은 MUSICMAP 하나만 고치면 된다.
     town = 마을/시작화면,  field = 필드,  dun/dun2 = 던전
   ======================================================= */
var MUSICSRC = (typeof MUSICSRC !== "undefined") ? MUSICSRC : {};
/* town 은 의도적으로 비어 있다.
   전에는 town 이 intro 와 같은 파일을 가리켜 마을에서 타이틀곡이 하드 루프로 돌았다.
   마을 전용 '고요한' 트랙(assets/music/town.mp3)이 준비되면 town:"town" 으로 바꾸면 된다.
   빈 문자열이면 musicPlay("") 가 재생을 멈춘다 — 마을은 조용해진다. */
/* R33 — 슬롯 8종. **존의 song 키 = 트랙 파일명 = 여기 키**로 통일했다.
   예전엔 존 키(dun)와 파일명(dungeon)이 달라 이 표가 그 번역만 하고 있었는데,
   곡이 3개에서 8개로 늘면 그 이중 이름이 사고의 원인이 된다.
   ★ 새 곡을 넣는 절차: assets/music/{키}.mp3 저장 → 여기 한 줄 추가 → 존의 song 키를 그 이름으로.
   ★ 값이 빈 문자열("")이면 '의도된 무음'이다 — 미등록 키(=field 폴백)와 구분된다(setMusicZone 참조). */
var MUSICMAP = { intro:"intro", title:"intro", ending:"ending",
                 town:"town", field:"field",
                 dun:"dun", dun2:"dun2", dun3:"dun3", boss:"boss" };
/* 옵션 화면의 "지금 나오는 곡" 표시. 곡 제목이 정해지면 채운다(없으면 키 이름이 그대로 뜬다). */
var MUSICNAME = { intro:"Velocity of Silver", field:"Cold Wind And A Faulty Heart", dun:"Teeth in the Dark" };

/* R33 슬롯 폴백 — 아직 안 만든 곡을 무엇으로 대신할 것인가.
   ★ 이게 있어야 "존 배치는 8슬롯으로 미리 해 두고, 곡은 되는 대로 하나씩 채워 넣는" 방식이 성립한다.
     곡이 들어오는 순간 그 구간만 새 곡으로 바뀌고, 없는 동안은 예전과 똑같이 들린다.
   ★ dun:"dungeon" 은 옛 파일명 호환이다(R33 이전 에셋 폴더를 그대로 써도 소리가 나게).
   ★ town 은 여기 없다 — 대체곡 없이 무음이 맞다(기존 동작 유지). */
var MUSICFALL = { dun2:"dun", dun3:"dun", boss:"dun", ending:"intro", dun:"dungeon" };

var MUS = { el:{}, cur:null, want:null, fade:null, unlocked:false, ready:false };

function musicAvailable(){ for(var k in MUSICSRC) return true; return false; }
function musicHas(k){ return !!(k && typeof MUSICSRC !== "undefined" && MUSICSRC[k]); }
/* 요청한 트랙이 없으면 폴백 사슬을 타고 내려간다. 끝까지 없으면 null(= 이 구간은 무음). */
function musicResolve(track){
 if(!track)return track;                      /* "" = 의도된 무음 */
 var t=track,guard=0;
 while(t&&!musicHas(t)&&MUSICFALL[t]&&guard++<5)t=MUSICFALL[t];
 return musicHas(t)?t:null;
}
/* OPT.music : "track"=실제 음악 / "chip"=칩튠 / "off"=끄기 */
function musicMode(){
 var m=(OPT&&OPT.music)||"track";
 if(m==="track"&&!musicAvailable())return "chip";
 return m;
}
function musicInit(){
 if(MUS.ready||!musicAvailable())return;
 MUS.ready=true;
 for(var k in MUSICSRC){
   var a=new Audio();
   a.src=MUSICSRC[k]; a.loop=true; a.preload="auto"; a.volume=0;
   MUS.el[k]=a;
 }
}
/* 브라우저 자동재생 차단 해제 — 최초 사용자 입력 때 한 번 */
function musicUnlock(){
 if(MUS.unlocked)return;
 MUS.unlocked=true;
 musicInit();
 if(MUS.want)musicPlay(MUS.want,true);
}
function musicVol(){
 if(!OPT.bgm||musicMode()!=="track")return 0;
 return Math.max(0,Math.min(1,OPT.bgmVol));
}
function musicPlay(track,force){
 MUS.want=track;
 if(musicMode()!=="track"){musicStopAll();return;}
 musicInit();
 if(!MUS.unlocked)return;                    /* 입력 대기 — unlock 때 다시 호출됨 */
 track=musicResolve(track);                  /* R33 — 없는 곡은 대체곡으로. 그것도 없으면 null */
 if(MUS.cur===track&&!force){musicApplyVol();return;}
 /* "" = 무음 구역(마을), null = 이 구간에 쓸 곡이 아직 없음. 둘 다 이전 곡을 확실히 끈다
    — 안 끄면 앞 지역 음악이 그대로 새어 나온다(슬롯이 비어 있는 동안 자주 생길 상황). */
 if(!track){musicStopAll();MUS.cur=null;return;}
 var prev=MUS.cur;
 MUS.cur=track;
 var a=MUS.el[track];
 if(!a)return;
 try{ if(a.paused){a.currentTime=0;var p=a.play();if(p&&p.catch)p.catch(function(){});} }catch(e){}
 musicCross(prev,track);
}
/* 부드러운 전환 — 지역 이동 시 뚝 끊기지 않게 */
function musicCross(from,to){
 if(MUS.fade)clearInterval(MUS.fade);
 var t0=Date.now(), dur=900, target=musicVol();
 var fromEl=from&&from!==to?MUS.el[from]:null, toEl=MUS.el[to];
 var fromV=fromEl?fromEl.volume:0;
 MUS.fade=setInterval(function(){
   var k=Math.min(1,(Date.now()-t0)/dur);
   if(toEl)toEl.volume=target*k;
   if(fromEl)fromEl.volume=fromV*(1-k);
   if(k>=1){
     clearInterval(MUS.fade);MUS.fade=null;
     if(fromEl){try{fromEl.pause();}catch(e){}fromEl.volume=0;}
   }
 },40);
}
function musicApplyVol(){
 var v=musicVol(),k;
 for(k in MUS.el)MUS.el[k].volume=(k===MUS.cur)?v:0;
 if(v<=0){for(k in MUS.el){try{MUS.el[k].pause();}catch(e){}}}
 else if(MUS.cur&&MUS.el[MUS.cur]&&MUS.el[MUS.cur].paused&&MUS.unlocked){
   try{var p=MUS.el[MUS.cur].play();if(p&&p.catch)p.catch(function(){});}catch(e){}
 }
}
function musicStopAll(){
 if(MUS.fade){clearInterval(MUS.fade);MUS.fade=null;}
 for(var k in MUS.el){try{MUS.el[k].pause();}catch(e){}MUS.el[k].volume=0;}
 MUS.cur=null;
}
/* 지역 song 키를 받아 트랙 전환. travel() 과 인트로에서 호출한다. */
function setMusicZone(songKey){
 /* 빈 문자열("무음")과 미등록 키를 구분해야 한다. ||"field" 로 하면 무음이 필드곡으로 새어나온다. */
 var t=MUSICMAP.hasOwnProperty(songKey)?MUSICMAP[songKey]:"field";
 musicPlay(t);
}
function musicNow(){
 if(musicMode()!=="track"||!MUS.cur)return null;
 return MUSICNAME[MUS.cur]||MUS.cur;
}
/* 최초 입력 훅 */
["pointerdown","keydown","touchstart"].forEach(function(ev){
 document.addEventListener(ev,musicUnlock,{once:false,passive:true});
});

/* ================= T-P1-6 백그라운드 전환 시 소리 정지 =================
   탭을 나가면 게임 루프(rAF)는 멈추지만 <audio loop> 트랙 음악은 계속 재생되고,
   칩튠의 setInterval(bgmTick,100) 도 백그라운드 스로틀 상태로 계속 돌아 음이 끊기며 나온다.
   결과: "게임은 멈췄는데 음악만 나오는" 상태 + 모바일 배터리 소모.

   설계 주의 두 가지
   ★ 복귀할 때 오디오 언락을 다시 요구하지 않는다 — 기존 MUS.unlocked 를 그대로 본다.
     (다시 요구하면 돌아온 사용자가 화면을 한 번 더 눌러야 음악이 나온다)
   ★ BGM.on 을 복귀 때 true 로 켜지 않는다. 이 값은 사용자 설정 OPT.bgm 의 거울이라
     (01b_options.js applySound), 켜 버리면 BGM 을 꺼 둔 사용자의 설정을 무시하게 된다.
     applySound() 를 부르면 BGM.on·게인·BGM.next 가 설정대로 한 번에 원복된다. */
var MUSBG = { hidden:false, want:null };
function musicSuspend(){
 if(MUSBG.hidden)return;
 MUSBG.hidden=true;
 MUSBG.want=MUS.want;                                     /* 돌아와서 다시 걸 곡(폴백 전 원래 키) */
 try{ musicStopAll(); }catch(e){}                         /* 실제 음원 정지 */
 if(typeof BGM!=="undefined"&&BGM)BGM.on=false;           /* 칩튠 정지 — bgmTick 이 즉시 return */
 try{ if(typeof AC!=="undefined"&&AC&&AC.state==="running"&&AC.suspend)AC.suspend(); }catch(e){}
}
function musicResume(){
 if(!MUSBG.hidden)return;
 MUSBG.hidden=false;
 try{ if(typeof AC!=="undefined"&&AC&&AC.resume){ var p=AC.resume(); if(p&&p["catch"])p["catch"](function(){}); } }catch(e){}
 try{ if(typeof applySound==="function")applySound(); }catch(e){}   /* BGM.on·게인·BGM.next 원복 */
 if(MUS.unlocked)musicPlay(MUSBG.want,true);
 else MUS.want=MUSBG.want;                                /* 아직 언락 전이면 조용히 대기 */
}
(function(){
 if(typeof document==="undefined"||!document.addEventListener)return;
 document.addEventListener("visibilitychange",function(){
   if(document.hidden)musicSuspend(); else musicResume();
 },false);
 /* iOS Safari 는 앱 전환·탭 정리에서 visibilitychange 대신 pagehide/pageshow 가 오는 경우가 있다 */
 window.addEventListener("pagehide",musicSuspend,false);
 window.addEventListener("pageshow",musicResume,false);
})();
