/* ================= 사운드 ================= */
var AC=null,bgmGain=null,sfxGain=null,noiseBuf=null;
function tone(f,d,type,vol,when){var o=AC.createOscillator(),g=AC.createGain();o.type=type||"square";o.frequency.value=f;
 g.gain.value=vol||.06;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(when||0)+d);
 o.connect(g);g.connect(sfxGain||AC.destination);o.start(AC.currentTime+(when||0));o.stop(AC.currentTime+(when||0)+d);}
function noiseHit(d,vol,f,when){
 if(!noiseBuf){noiseBuf=AC.createBuffer(1,Math.floor(AC.sampleRate*.3),AC.sampleRate);
   var cd=noiseBuf.getChannelData(0);for(var i=0;i<cd.length;i++)cd[i]=Math.random()*2-1;}
 var s=AC.createBufferSource();s.buffer=noiseBuf;
 var g=AC.createGain();g.gain.value=vol;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(when||0)+d);
 var fl=AC.createBiquadFilter();fl.type="lowpass";fl.frequency.value=f||1500;
 s.connect(fl);fl.connect(g);g.connect(sfxGain||AC.destination);
 s.start(AC.currentTime+(when||0));s.stop(AC.currentTime+(when||0)+d);}
function sfx(k){try{
 if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
 if(AC.state==="suspended")AC.resume();
 if(!bgmGain){bgmGain=AC.createGain();bgmGain.gain.value=OPT.bgm?OPT.bgmVol:0;bgmGain.connect(AC.destination);}
 if(!sfxGain){sfxGain=AC.createGain();sfxGain.gain.value=OPT.sfxOn?OPT.sfxVol:0;sfxGain.connect(AC.destination);}
 if(!OPT.sfxOn||OPT.sfxVol<=0)return;
 if(k==="hit"){noiseHit(.06,.1,2600);tone(112+Math.random()*30,.06,"sine",.1);}
 else if(k==="hurt"){noiseHit(.11,.11,700);tone(65,.16,"sawtooth",.08);}
 else if(k==="die"){tone(140,.3,"sawtooth",.07);tone(70,.5,"sawtooth",.07,.1);}
 else if(k==="gold"){tone(900,.05,"square",.04);tone(1200,.07,"square",.04,.05);}
 else if(k==="lvl"){tone(523,.12,"square",.06);tone(659,.12,"square",.06,.12);tone(784,.2,"square",.06,.24);}
 else if(k==="ench"){tone(880,.1,"triangle",.07);tone(1318,.25,"triangle",.07,.1);}
 else if(k==="boom"){tone(60,.5,"sawtooth",.1);tone(50,.6,"square",.08,.05);}
 else if(k==="stun"){tone(400,.06,"square",.07);tone(300,.08,"square",.07,.06);}
 else if(k==="port"){tone(600,.1,"triangle",.05);tone(900,.1,"triangle",.05,.08);tone(1300,.15,"triangle",.05,.16);}
 else if(k==="pot")tone(500,.08,"triangle",.05);
 else if(k==="roll"){tone(392,.5,"sine",.035);tone(523,.5,"sine",.035,.3);tone(659,.5,"sine",.04,.6);tone(784,.45,"sine",.045,.9);}
 else if(k==="bow"){noiseHit(.05,.07,3200);tone(240,.05,"triangle",.05);}
 else if(k==="cast"){tone(660,.09,"sine",.05);tone(990,.12,"sine",.05,.06);}
 else if(k==="fire"){noiseHit(.3,.12,900);tone(80,.35,"sawtooth",.08);}
 else if(k==="buff"){tone(523,.1,"triangle",.05);tone(784,.16,"triangle",.05,.09);}
 else if(k==="heal"){tone(784,.1,"sine",.05);tone(1046,.2,"sine",.05,.08);}
}catch(e){}}
var _=null;
var SONGS={
 town:{tempo:.20,base:220,bbase:55,lead:"triangle",bass:[0,-4,-5,-5],
  mel:[7,_,5,_,3,_,5,_, 7,_,7,_,5,_,3,_, 2,_,3,_,5,_,3,_, 0,_,0,_,_,_,_,_]},
 field:{tempo:.16,base:220,bbase:55,lead:"triangle",bass:[0,0,-4,-4,-2,-2,-5,-5],
  mel:[0,_,3,_,5,_,7,_, 8,_,7,_,5,_,3,_, 2,_,3,_,5,_,7,_, 8,_,10,_,7,_,_,_,
       0,_,3,_,5,_,7,_, 12,_,10,_,8,_,7,_, 5,_,3,_,2,_,3,_, 0,_,0,_,_,_,_,_]},
 dun:{tempo:.22,base:110,bbase:55,lead:"sine",bass:[0,0,-1,0],
  mel:[0,_,_,_,1,_,_,_, 0,_,_,_,_,_,_,_, 3,_,_,_,1,_,_,_, 0,_,_,_,-2,_,_,_]},
 dun2:{tempo:.18,base:110,bbase:55,lead:"sine",bass:[0,-1,0,-2],
  mel:[0,_,1,_,0,_,_,_, 6,_,_,_,_,_,_,_, 3,_,1,_,0,_,_,_, -2,_,_,_,-1,_,_,_]}
};
var BGM={on:true,song:"town",step:0,next:0};
function bnote(f,d,type,vol,when){var o=AC.createOscillator(),g=AC.createGain();
 o.type=type;o.frequency.value=f;
 g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(vol,when+.02);g.gain.exponentialRampToValueAtTime(.0001,when+d);
 o.connect(g);g.connect(bgmGain);o.start(when);o.stop(when+d+.03);}
function bgmTick(){try{
 if(!AC||!bgmGain||!BGM.on||!started)return;
 if(musicMode()!=="chip")return;   /* 실제 음악 모드면 칩튠 정지 */
 var song=SONGS[BGM.song]||SONGS.field;
 if(BGM.next<AC.currentTime)BGM.next=AC.currentTime+.05;
 while(BGM.next<AC.currentTime+.4){
   var st=BGM.step,m=song.mel[st%song.mel.length];
   if(m!==null&&m!==undefined)bnote(song.base*Math.pow(2,m/12),song.tempo*2.4,song.lead,.045,BGM.next);
   if(st%4===0){var b=song.bass[Math.floor(st/4)%song.bass.length];
     if(b!==null)bnote(song.bbase*Math.pow(2,b/12),song.tempo*3.6,"square",.028,BGM.next);}
   BGM.step=(BGM.step+1)%song.mel.length;BGM.next+=song.tempo;
 }}catch(e){}}
setInterval(bgmTick,100);
function toggleAC(){
 if(!P)return;
 P.autoCounter=(P.autoCounter===false);
 if(!P.autoCounter)P._acLast=null;
 refreshHud();
 log("자동 반격을 "+(P.autoCounter?"켰습니다":"껐습니다")+".","#888");
}
function toggleBgm(){OPT.bgm=!OPT.bgm;optSave();applySound();
 if(typeof renderOpt==="function")renderOpt();}
var shakeT=0,shakeD=1,shakeM=0;
function shake(m,d){if(m>=shakeM||T>=shakeT){shakeM=m;shakeD=d;shakeT=T+d;}}
/* P2 타격감 폴리싱 — 히트스톱. 타격 성공 시 짧게 게임 시계(T)를 멈춰 "때리는 순간"을 또렷하게 만든다.
   ⚠ 남은 시간을 **실시간(dt)** 으로 깎는다. 게임 시계 T 로 마감 시각을 잡으면
      (T 는 update() 안에서만 증가하므로) 멈춘 동안 T 가 안 늘어 히트스톱이 영원히 안 풀린다
      — 실제로 그 버그로 첫 타격에 게임이 통째로 멈췄다. 반드시 dt 기준으로 감산할 것. */
var hitstopLeft=0;
var HITSTOP_MAX=0.12;                 /* 안전 상한 — 어떤 경우에도 이 이상 멈추지 않는다 */
function hitstop(sec){
  if(!(sec>0))return;
  if(sec>HITSTOP_MAX)sec=HITSTOP_MAX;
  if(sec>hitstopLeft)hitstopLeft=sec;  /* 더 센 것만 갱신 — 연타로 누적되지 않는다 */
}
function hitstopActive(){return hitstopLeft>0;}
function hitstopClear(){hitstopLeft=0;}
