/* ================= 인트로 시퀀스 ================= */
var icv=document.getElementById("introcv"), ictx=icv.getContext("2d");
ictx.imageSmoothingEnabled=false;
var introOn=false,introI=0,introT0=0,introRAF=null,introDur=6.2;
/* ---- R32 재생기 일반화 (T-P1-1) ----
   예전엔 이 파일의 모든 함수가 전역 INTRO 를 직접 참조해서 프롤로그 전용이었다.
   엔딩도 "장면 배열 -> 순차 재생 + 텍스트 오버레이"라는 같은 구조이므로,
   재생 중인 배열만 바꿔 끼울 수 있게 한 겹 씌운다(새 컷신 엔진을 만들지 않는다).
     introSeq   재생 중인 장면 배열 (null 이면 프롤로그 INTRO)
     introKind  "intro" | "ending" — 프롤로그만 '봤음' 플래그를 남긴다
     introAfter 재생이 끝난(또는 건너뛴) 뒤 이어서 할 일 */
var introSeq=null, introKind="intro", introAfter=null;
function introScenes(){ return introSeq||INTRO; }
function ifr(x,y,w,h,c){ictx.fillStyle=c;ictx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function igrad(y0,y1,c0,c1){var g=ictx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,c0);g.addColorStop(1,c1);
 ictx.fillStyle=g;ictx.fillRect(0,y0,480,y1-y0);}
function istar(seed,n,ymax){var i,x,y,b;
 for(i=0;i<n;i++){x=Math.floor(hsh(i+seed,3)*480);y=Math.floor(hsh(7,i+seed)*(ymax||288));
   b=0.25+0.75*Math.abs(Math.sin(introT()*1.3+i));
   ifr(x,y,1,1,"rgba(220,230,255,"+b.toFixed(2)+")");}}
function introT(){return (performance.now()/1000)-introT0;}
/* --- 장면들 --- */
var ISC={
 stars:function(t){
   igrad(0,288,"#070a18","#02030a");
   istar(11,90);
   var cy=40+Math.min(1,t/5)*26, gl=0.55+0.45*Math.sin(t*1.6);
   var g=ictx.createRadialGradient(240,cy,2,240,cy,70+gl*14);
   g.addColorStop(0,"rgba(255,246,210,"+(0.85*gl+0.15)+")");g.addColorStop(0.35,"rgba(210,180,90,.18)");
   g.addColorStop(1,"rgba(0,0,0,0)");ictx.fillStyle=g;ictx.fillRect(140,cy-90,200,190);
   ifr(238,cy-2,4,4,"#fff8dc");
   var i;for(i=0;i<8;i++){var a=t*0.35+i*0.785;
     ictx.strokeStyle="rgba(255,240,190,"+(0.05+0.05*Math.sin(t*2+i))+")";ictx.lineWidth=1;
     ictx.beginPath();ictx.moveTo(240,cy);ictx.lineTo(240+Math.cos(a)*150,cy+Math.sin(a)*150);ictx.stroke();}
   ifr(0,250,480,38,"#04060e");
   /* 올려다보는 사람 */
   var A=ACT.knight;
   ictx.drawImage(sprite("pc_k",A,2,"i0"),222,250-FY+8);
 },
 tattoo:function(t){
   igrad(0,288,"#151020","#05040a");
   var sk=RAMP(24,30,16,40), i;
   /* 어깨 덩어리 */
   ictx.fillStyle=sk.ol;ictx.beginPath();ictx.ellipse(196,214,124,96,0,0,6.2832);ictx.fill();
   ictx.fillStyle=sk[1];ictx.beginPath();ictx.ellipse(196,216,118,90,0,0,6.2832);ictx.fill();
   /* 위팔 */
   ictx.fillStyle=sk.ol;ictx.beginPath();ictx.ellipse(316,252,76,62,-0.34,0,6.2832);ictx.fill();
   ictx.fillStyle=sk[1];ictx.beginPath();ictx.ellipse(314,254,70,56,-0.34,0,6.2832);ictx.fill();
   /* 근육 명암 */
   ictx.fillStyle="rgba(0,0,0,.30)";ictx.beginPath();ictx.ellipse(236,254,116,66,0,0,6.2832);ictx.fill();
   ictx.fillStyle=sk[2];ictx.beginPath();ictx.ellipse(168,186,64,42,-0.3,0,6.2832);ictx.fill();
   /* 림 라이트 */
   ictx.strokeStyle="rgba(170,196,240,.20)";ictx.lineWidth=3;
   ictx.beginPath();ictx.ellipse(196,216,118,90,0,Math.PI*1.02,Math.PI*1.78);ictx.stroke();
   /* 문신 — 검과 저울(빛·검신 계열) */
   var gl=Math.min(1,t/2.4), pu=0.55+0.45*Math.sin(t*2.3), a=(gl*pu);
   var cx=204,cy=178;
   var gg=ictx.createRadialGradient(cx,cy,1,cx,cy,72*gl);
   gg.addColorStop(0,"rgba(150,215,255,"+(0.42*a).toFixed(2)+")");
   gg.addColorStop(0.45,"rgba(90,170,255,"+(0.14*a).toFixed(2)+")");
   gg.addColorStop(1,"rgba(0,0,0,0)");
   ictx.fillStyle=gg;ictx.fillRect(cx-80,cy-80,160,160);
   ictx.strokeStyle="rgba(160,220,255,"+a.toFixed(2)+")";ictx.lineWidth=2.4;
   ictx.beginPath();ictx.moveTo(cx,cy-34);ictx.lineTo(cx,cy+26);ictx.stroke();     /* 검신 */
   ictx.beginPath();ictx.moveTo(cx-20,cy-6);ictx.lineTo(cx+20,cy-6);ictx.stroke(); /* 가드 */
   ictx.lineWidth=1.6;
   ictx.beginPath();ictx.moveTo(cx-20,cy-6);ictx.lineTo(cx-26,cy+8);ictx.lineTo(cx-14,cy+8);ictx.closePath();ictx.stroke();
   ictx.beginPath();ictx.moveTo(cx+20,cy-6);ictx.lineTo(cx+14,cy+8);ictx.lineTo(cx+26,cy+8);ictx.closePath();ictx.stroke();
   ictx.beginPath();ictx.arc(cx,cy-38,4,0,6.2832);ictx.stroke();
   ictx.fillStyle="rgba(230,248,255,"+a.toFixed(2)+")";ictx.fillRect(cx-2,cy-34,4,6);
   /* 피어오르는 빛 */
   for(i=0;i<16;i++){var yy=(t*30+i*13)%140;
     ifr(cx-30+((i*41)%62),cy+20-yy,1,2,"rgba(170,225,255,"+(0.5*(1-yy/140)*gl).toFixed(2)+")");}
 },
 map:function(t){
   var i,j;
   igrad(0,288,"#101728","#070a12");
   for(i=0;i<46;i++){var wy=24+((i*89)%246);
     ifr(((i*67)%480),wy,12,1,"rgba(90,125,175,.09)");}
   var ox=-Math.min(1,t/6)*14;
   function land(pts,fill,edge){
     ictx.fillStyle=edge;ictx.beginPath();
     ictx.moveTo(pts[0][0]+ox,pts[0][1]);
     for(j=1;j<pts.length;j++)ictx.lineTo(pts[j][0]+ox,pts[j][1]);
     ictx.closePath();ictx.fill();
     ictx.save();ictx.clip();
     ictx.fillStyle=fill;ictx.fillRect(0,0,480,288);
     ictx.restore();
   }
   /* 서대륙 — 들쭉날쭉한 해안 */
   land([[16,120],[44,86],[86,72],[130,66],[172,80],[196,104],[204,140],[192,178],[160,206],
         [112,222],[66,214],[30,186],[14,152]],"#585234","#2e2b18");
   /* 동대륙 */
   land([[286,104],[318,74],[362,60],[410,66],[452,92],[468,132],[458,176],[424,208],
         [380,222],[334,212],[300,184],[286,146]],"#44553f","#1f2a1d","#1f2a1d");
   /* 해안선 */
   ictx.strokeStyle="rgba(210,225,255,.14)";ictx.lineWidth=1;
   ictx.beginPath();ictx.ellipse(108+ox,146,96,78,0,0,6.2832);ictx.stroke();
   ictx.beginPath();ictx.ellipse(376+ox,142,92,78,0,0,6.2832);ictx.stroke();
   /* 마역 — 남북으로 뻗은 산맥 장벽 */
   for(j=0;j<17;j++){
     var my=6+j*17, mh=20+((j*7)%12), mx=242+ox+Math.sin(j*0.9)*8;
     ictx.fillStyle="#1d1729";ictx.beginPath();
     ictx.moveTo(mx,my);ictx.lineTo(mx+19,my+mh);ictx.lineTo(mx-19,my+mh);ictx.closePath();ictx.fill();
     ictx.fillStyle="#332a48";ictx.beginPath();
     ictx.moveTo(mx,my+2);ictx.lineTo(mx,my+mh);ictx.lineTo(mx-15,my+mh);ictx.closePath();ictx.fill();
     ictx.fillStyle="rgba(206,160,255,.22)";ictx.beginPath();
     ictx.moveTo(mx,my+1);ictx.lineTo(mx+4,my+8);ictx.lineTo(mx-4,my+8);ictx.closePath();ictx.fill();
   }
   var hz=ictx.createLinearGradient(214+ox,0,272+ox,0);
   hz.addColorStop(0,"rgba(150,60,220,0)");hz.addColorStop(0.5,"rgba(170,80,240,"+(0.10+0.06*Math.sin(t*1.5)).toFixed(2)+")");
   hz.addColorStop(1,"rgba(150,60,220,0)");
   ictx.fillStyle=hz;ictx.fillRect(200+ox,0,90,288);
   /* 성·마을 표식 */
   ictx.fillStyle="rgba(240,225,180,.75)";
   [[74,132],[112,168],[148,112],[96,196]].forEach(function(q){
     ifr(q[0]+ox,q[1],3,3,"rgba(240,225,180,.8)");});
   [[344,120],[400,148],[372,186],[430,116]].forEach(function(q){
     ifr(q[0]+ox,q[1],3,3,"rgba(200,235,210,.8)");});
   ictx.font="10px Gulim";ictx.textAlign="center";
   ictx.fillStyle="rgba(240,226,170,.9)";ictx.fillText("서대륙",104+ox,150);
   ictx.fillStyle="rgba(200,240,210,.9)";ictx.fillText("동대륙",378+ox,146);
   ictx.fillStyle="rgba(214,160,255,.95)";ictx.fillText("마 역",244+ox,40);
 },
 north:function(t){
   igrad(0,180,"#243044","#4a5468");
   igrad(180,288,"#2a3040","#12161f");
   /* 먼 산 */
   var i;ictx.fillStyle="#1d2431";
   for(i=0;i<9;i++){var mx=i*62-20,mh=40+((i*13)%26);
     ictx.beginPath();ictx.moveTo(mx,180);ictx.lineTo(mx+34,180-mh);ictx.lineTo(mx+68,180);ictx.closePath();ictx.fill();}
   /* 성벽 */
   var wall=RAMP(220,8,20,40);
   pt(ictx,60,150,360,110,wall);
   for(i=0;i<12;i++)pt(ictx,66+i*30,138,18,14,wall);
   pt(ictx,80,120,54,140,wall);pt(ictx,346,120,54,140,wall);
   ifr(224,196,32,64,"#0d1018");           /* 성문 */
   ifr(228,200,24,10,"rgba(255,200,120,.25)");
   /* 깃발 */
   var fw=Math.sin(t*3)*3;
   pt(ictx,104,92,3,30,RAMP(30,20,26,44));
   ictx.fillStyle="#2e5a8a";ictx.beginPath();
   ictx.moveTo(107,94);ictx.lineTo(134+fw,102);ictx.lineTo(107,112);ictx.closePath();ictx.fill();
   /* 창문 불빛 */
   for(i=0;i<7;i++)ifr(96+i*44,176,6,8,"rgba(255,208,120,"+(0.5+0.3*Math.sin(t*2+i)).toFixed(2)+")");
   /* 눈 */
   for(i=0;i<70;i++){var sx2=(i*61+t*14)%480, sy2=(i*37+t*26)%288;
     ifr(sx2,sy2,1,1,"rgba(230,238,255,.55)");}
 },
 seal:function(t){
   ifr(0,0,480,288,"#0a0710");
   /* 벽·바닥 */
   igrad(0,200,"#1a1424","#120e1a");
   ifr(0,200,480,88,"#0e0b14");
   /* 봉인문 */
   var st=RAMP(258,10,14,32);
   pt(ictx,160,60,160,180,st);
   pt(ictx,150,48,180,16,st);
   ifr(239,60,3,180,"#0a0810");
   /* 룬 */
   var i,pu=0.35+0.35*Math.sin(t*1.5);
   for(i=0;i<6;i++){var ry=82+i*26;
     var rc="rgba(255,120,70,"+(0.35+pu*0.55).toFixed(2)+")";
     ictx.fillStyle=rc;
     ictx.fillRect(190,ry,34,3);ictx.fillRect(256,ry,34,3);
     ictx.fillRect(190+(i%2?0:30),ry-6,4,9);ictx.fillRect(256+(i%2?30:0),ry-6,4,9);}
   ictx.strokeStyle="rgba(255,140,80,"+(0.25+pu*0.3).toFixed(2)+")";ictx.lineWidth=2;
   ictx.strokeRect(178,72,124,156);
   /* 균열 */
   ictx.strokeStyle="rgba(255,80,40,"+(0.25+0.2*Math.sin(t*2.2)).toFixed(2)+")";ictx.lineWidth=1.4;
   ictx.beginPath();ictx.moveTo(240,70);ictx.lineTo(228,116);ictx.lineTo(244,152);ictx.lineTo(232,206);ictx.stroke();
   var g=ictx.createRadialGradient(240,150,6,240,150,120);
   g.addColorStop(0,"rgba(255,70,40,"+(0.10+0.07*Math.sin(t*1.8)).toFixed(2)+")");g.addColorStop(1,"rgba(0,0,0,0)");
   ictx.fillStyle=g;ictx.fillRect(120,40,240,220);
   /* 횃불 */
   for(i=0;i<2;i++){var tx=i?372:96, fl=Math.sin(t*9+i)*1.4;
     pt(ictx,tx,150,4,14,RAMP(26,34,18,34));
     ictx.fillStyle="#ff9820";ictx.beginPath();ictx.ellipse(tx+2,146+fl*.4,3.4,5+Math.abs(fl),0,0,6.2832);ictx.fill();
     var g2=ictx.createRadialGradient(tx+2,146,2,tx+2,146,46);
     g2.addColorStop(0,"rgba(255,150,40,.16)");g2.addColorStop(1,"rgba(0,0,0,0)");
     ictx.fillStyle=g2;ictx.fillRect(tx-44,100,92,92);}
   /* 먼지 */
   for(i=0;i<26;i++){var dy=(i*31+t*9)%230;
     ifr(150+((i*47)%180),240-dy,1,1,"rgba(200,180,160,"+(0.25*(1-dy/230)).toFixed(2)+")");}
 },
 you:function(t){
   igrad(0,170,"#1b2036","#3a3050");
   igrad(170,288,"#241d2e","#100c16");
   var i;
   /* 지평선의 마역 */
   ictx.fillStyle="#191426";
   for(i=0;i<10;i++){var mx=i*56-16,mh=44+((i*11)%22);
     ictx.beginPath();ictx.moveTo(mx,172);ictx.lineTo(mx+30,172-mh);ictx.lineTo(mx+60,172);ictx.closePath();ictx.fill();}
   ictx.fillStyle="#0f0c16";ictx.beginPath();
   ictx.moveTo(0,200);ictx.bezierCurveTo(140,182,340,214,480,192);ictx.lineTo(480,288);ictx.lineTo(0,288);ictx.closePath();ictx.fill();
   /* 뒷모습 */
   var A=ACT.knight;
   ictx.drawImage(sprite("pc_k",A,2,"i0"),240-FX,206-FY);
   /* 어깨 문신 발광 */
   var gl=Math.min(1,t/2);
   var g=ictx.createRadialGradient(246,186,1,246,186,26*gl);
   g.addColorStop(0,"rgba(150,215,255,"+(0.6*gl*(0.6+0.4*Math.sin(t*3))).toFixed(2)+")");
   g.addColorStop(1,"rgba(0,0,0,0)");
   ictx.fillStyle=g;ictx.fillRect(216,156,60,60);
   for(i=0;i<14;i++){var yy=(t*22+i*15)%120;
     ifr(230+((i*29)%30),190-yy,1,2,"rgba(160,220,255,"+(0.45*(1-yy/120)).toFixed(2)+")");}
 },
 /* ================= R32 엔딩 장면 (T-P1-1) =================
    프롤로그와 같은 절차 생성 방식이다(새 에셋 0). 프롤로그 일러스트(PROLOGART)와 키가
    겹치지 않으므로 여기 그린 것이 그대로 쓰인다. 남빛(#3a4abe 계열) = 계시가 닿지 않는 색
    — L15 "그 안에서는 우리 문신도 발색하지 않았다" 를 색으로 옮긴 것. */
 e_throne:function(t){
   /* ① 옥좌 — 남빛이 걷히고, 비어 있던 갑주가 드러난다
      ★ 자막 안전선: #introtx 는 bottom:78px 에 최대 4줄이 붙는다. 실측하니 4줄이면
        캔버스 y≈185 부터 아래를 덮는다. 그래서 보여줄 것은 전부 **y<180** 에 둔다.
        (1차 실측: 갑주 y=238 → 완전히 가림. 2차: y=190 → 첫 줄에 걸림. 3차에서 바닥선을 올렸다.) */
   igrad(0,150,"#0c1024","#141a3a");
   ifr(0,150,480,138,"#080a18");                             /* 바닥 — 위로 올렸다 */
   var i, st=RAMP(232,14,10,26);
   pt(ictx,96,26,24,124,st); pt(ictx,360,26,24,124,st);      /* 기둥 */
   ifr(224,22,34,42,"#0a0c1a");                              /* 등 뒤의 문 — 닫힌 채 */
   ictx.strokeStyle="rgba(120,150,255,.22)";ictx.lineWidth=1;ictx.strokeRect(224,22,34,42);
   pt(ictx,208,58,64,86,st);                                 /* 등받이 */
   ifr(216,66,48,72,"#05060f");                              /* 빈 자리 */
   pt(ictx,198,144,84,11,st);                                /* 좌판 */
   var ar=RAMP(220,10,16,38);                                /* 쓰러진 갑주 — 좌판 왼쪽 바닥 */
   pt(ictx,104,160,80,11,ar);                                /* 몸통 */
   pt(ictx,88,155,18,16,ar);                                 /* 투구 */
   pt(ictx,184,164,26,6,ar);                                 /* 다리 */
   ifr(176,152,48,3,"rgba(180,200,255,.34)");                /* 손에서 놓은 검 */
   var sg=0.34+0.3*Math.sin(t*1.1);                          /* 어깨 — 문신이 있던 자리의 흉터 */
   ifr(112,158,12,2,"rgba(255,168,148,"+sg.toFixed(2)+")");
   ifr(117,154,2,9,"rgba(255,168,148,"+(sg*0.66).toFixed(2)+")");
   var fade=Math.max(0,1-t/4.2);                             /* 남빛 안개 — 걷힌다 */
   var g=ictx.createLinearGradient(0,80,0,288);
   g.addColorStop(0,"rgba(58,74,190,0)");
   g.addColorStop(1,"rgba(58,74,190,"+(0.52*fade).toFixed(2)+")");
   ictx.fillStyle=g;ictx.fillRect(0,80,480,208);
   for(i=0;i<22;i++){ var mx=(i*97+t*11)%480;
     ifr(mx,118+((i*37)%54),3,1,"rgba(150,170,255,"+(0.17*fade).toFixed(2)+")"); }
 },
 e_twoknights:function(t){
   /* ② 갑주는 둘이었다 — 문 앞에 남은 자와, 잠근 자를 따라 들어간 자 (L11·L13) */
   igrad(0,200,"#161222","#0b0910");
   ifr(0,200,480,88,"#080610");
   var st=RAMP(258,10,12,30);
   pt(ictx,206,48,68,142,st); pt(ictx,198,38,84,12,st);      /* 문 */
   ifr(239,48,2,142,"#07060c");
   var pu=0.28+0.24*Math.sin(t*1.2);
   ictx.strokeStyle="rgba(255,130,80,"+pu.toFixed(2)+")";ictx.lineWidth=1.6;
   ictx.strokeRect(214,58,52,122);
   ifr(240,116,18,4,"rgba(212,192,162,.78)");                /* 쐐기 — 안쪽에서 박혔다 */
   ifr(252,113,8,9,"rgba(158,138,110,.82)");
   var a1=RAMP(220,10,16,40);                                /* 서쪽 갑주 — 서서 지킨다 */
   pt(ictx,132,130,22,50,a1); pt(ictx,134,112,18,18,a1);
   ifr(157,118,3,62,"rgba(190,205,255,.5)");
   ictx.globalAlpha=0.55;                                    /* 또 하나 — 문 안쪽으로 반쯤 삼켜졌다 */
   var a2=RAMP(232,12,10,28);
   pt(ictx,320,132,22,48,a2); pt(ictx,322,114,18,18,a2);
   ictx.globalAlpha=1;
   /* 남빛이 오른쪽 갑주를 삼킨다. 화면 높이 전체로 깔아 사각형 경계가 보이지 않게 한다
      (첫 실측에서 108~212 사각형의 위아래 선이 그대로 보였다). */
   var g=ictx.createLinearGradient(286,0,368,0);
   g.addColorStop(0,"rgba(50,64,170,0)");g.addColorStop(1,"rgba(50,64,170,.5)");
   ictx.fillStyle=g;ictx.fillRect(286,0,86,288);
   /* 긁힌 명부 두 줄은 자막 뒤(y>240)로 숨어 붉은 선만 삐져나왔다 → 뺐다.
      '기사는 둘이었다'는 두 실루엣으로 이미 읽힌다. */
 },
 e_silence:function(t){
   /* ③ 침묵 — 신탁신의 중계가 꺼지고, 곧바로 내려온 한 줄 (INTRO 1장·L7) */
   igrad(0,288,"#05070f","#02030a");
   istar(29,110);
   var i, dim=Math.max(0,1-t/3.4);
   var g=ictx.createRadialGradient(240,96,2,240,96,60*dim+6);
   g.addColorStop(0,"rgba(255,240,200,"+(0.72*dim+0.05).toFixed(2)+")");
   g.addColorStop(1,"rgba(0,0,0,0)");
   ictx.fillStyle=g;ictx.fillRect(158,34,164,124);
   for(i=0;i<7;i++){                                          /* 중계점에서 끊기던 선들 */
     ictx.strokeStyle="rgba(210,225,255,"+(0.14*dim).toFixed(2)+")";ictx.lineWidth=1;
     ictx.beginPath();ictx.moveTo(90+i*50,10);ictx.lineTo(240,94);ictx.stroke(); }
   var dl=Math.min(1,Math.max(0,(t-1.6)/2.0));                /* 중계를 건너뛴 한 줄 */
   if(dl>0){
     ictx.strokeStyle="rgba(255,255,255,"+(0.48*dl).toFixed(2)+")";ictx.lineWidth=1.6;
     ictx.beginPath();ictx.moveTo(240,10);ictx.lineTo(240,10+232*dl);ictx.stroke(); }
   var up=Math.min(1,t/4.4), uh=Math.round(150*up);           /* 아래에서 올라오는 남빛 */
   if(uh>0){
     var g2=ictx.createLinearGradient(0,288,0,288-uh);
     g2.addColorStop(0,"rgba(52,66,180,.62)");g2.addColorStop(1,"rgba(52,66,180,0)");
     ictx.fillStyle=g2;ictx.fillRect(0,288-uh,480,uh); }
   ifr(234,150,12,28,"#05060c");                              /* 그 아래 서 있는 사람 (자막 안전선 위로) */
   ifr(232,142,16,9,"#05060c");
 },
 e_wrongreturn:function(t){
   /* ④ 잘못된 환원 — 놓지 못한 손, 그 파동이 위로 새어 나간다 (L8·q5)
      ★ 첫 실측에서 손(이 장면의 핵심)이 y=246 이라 자막에 완전히 가렸다. 전체를 위로 올렸다. */
   igrad(0,92,"#12101c","#1a1424");                           /* 위층(성소) */
   ifr(0,92,480,196,"#0b0912");                               /* 아래층(봉인 안쪽) */
   var i, sk=RAMP(24,26,18,44);
   pt(ictx,224,160,32,18,sk);                                 /* 손등 */
   for(i=0;i<4;i++)pt(ictx,228+i*7,144,5,17,sk);              /* 손가락 — 붙들고 있다 */
   for(i=0;i<5;i++){                                          /* 파동 — 손에서 위로 */
     var rr=((t*26+i*34)%126), a=0.32*(1-rr/126);
     ictx.strokeStyle="rgba(150,120,255,"+a.toFixed(2)+")";ictx.lineWidth=1.4;
     ictx.beginPath();ictx.ellipse(240,160,rr*1.6,rr*0.56,0,Math.PI,Math.PI*2);ictx.stroke(); }
   ifr(0,88,480,4,"#241d2c");                                 /* 위층 바닥 = 두 층의 경계 */
   var bn=RAMP(48,12,34,72);
   [96,152,336,392].forEach(function(bx,bi){                  /* 그 위로 걸어 나오는 뼈 */
     var s2=Math.min(1,Math.max(0,(t-0.6-bi*0.5)/1.4));
     if(s2<=0)return;
     var h=Math.round(28*s2);
     pt(ictx,bx,88-h,7,h,bn);
     if(s2>0.75)pt(ictx,bx-2,88-h-9,11,9,bn); });
   var lk=0.24+0.2*Math.sin(t*2.1);                            /* 바닥 틈으로 새는 빛 */
   ifr(120,86,42,2,"rgba(160,130,255,"+lk.toFixed(2)+")");
   ifr(300,86,54,2,"rgba(160,130,255,"+lk.toFixed(2)+")");
   for(i=0;i<24;i++){ var dy=(i*29+t*13)%120;                  /* 손에서 피어오르는 먼지 */
     ifr(140+((i*53)%200),160-dy,1,1,"rgba(200,180,255,"+(0.3*(1-dy/120)).toFixed(2)+")"); }
 },
 e_inward:function(t){
   /* ⑤ 열둘째 층 — 계시는 살갗에 새겨진 문이었다 (L16). 안쪽이 이쪽을 본다 */
   igrad(0,288,"#10121e","#04050c");
   var sk=RAMP(24,28,16,40), i;
   ictx.fillStyle=sk.ol;ictx.beginPath();ictx.ellipse(196,198,128,100,0,0,6.2832);ictx.fill();
   ictx.fillStyle=sk[1];ictx.beginPath();ictx.ellipse(196,200,122,94,0,0,6.2832);ictx.fill();
   ictx.fillStyle="rgba(0,0,0,.32)";ictx.beginPath();ictx.ellipse(238,240,116,64,0,0,6.2832);ictx.fill();
   ictx.strokeStyle="rgba(150,170,240,.18)";ictx.lineWidth=3;
   ictx.beginPath();ictx.ellipse(196,200,122,94,0,Math.PI*1.02,Math.PI*1.78);ictx.stroke();
   /* 문신(문)은 타이틀(캔버스 y≈75~120)과 자막(y≈185~) 사이에 앉힌다 */
   var gl=Math.min(1,t/2.6), pu=0.6+0.4*Math.sin(t*1.7), a=gl*pu, cx=190, cy=150;
   var gg=ictx.createRadialGradient(cx,cy,1,cx,cy,78*gl);
   gg.addColorStop(0,"rgba(120,140,255,"+(0.46*a).toFixed(2)+")");
   gg.addColorStop(0.45,"rgba(70,90,240,"+(0.16*a).toFixed(2)+")");
   gg.addColorStop(1,"rgba(0,0,0,0)");
   ictx.fillStyle=gg;ictx.fillRect(cx-86,cy-86,172,172);
   ictx.strokeStyle="rgba(160,180,255,"+a.toFixed(2)+")";ictx.lineWidth=2.2;
   ictx.strokeRect(cx-22,cy-34,44,66);                                        /* 문틀 */
   ictx.beginPath();ictx.moveTo(cx-29,cy-34);ictx.lineTo(cx+29,cy-34);ictx.stroke();  /* 상인방 */
   var op=Math.min(1,Math.max(0,(t-2.6)/2.6)), w=Math.round(14*op);           /* 아주 조금 열린다 */
   if(w>0){
     ifr(cx-2,cy-30,w,58,"rgba(2,3,10,.92)");
     ifr(cx-2+w,cy-30,1,58,"rgba(190,205,255,"+(0.68*a).toFixed(2)+")");
     if(op>0.55){ var eb=0.4+0.4*Math.sin(t*3.1);                             /* 안쪽에서 보는 두 점 */
       ifr(cx+1,cy-6,2,2,"rgba(255,240,220,"+eb.toFixed(2)+")");
       ifr(cx+6,cy-6,2,2,"rgba(255,240,220,"+eb.toFixed(2)+")"); } }
   for(i=0;i<16;i++){ var yy=(t*28+i*13)%140;
     ifr(cx-30+((i*41)%62),cy+22-yy,1,2,"rgba(150,175,255,"+(0.45*(1-yy/140)*gl).toFixed(2)+")"); }
 }
};
/* ---- 프롤로그 일러스트 (공장 생성) — 있으면 이미지, 없으면 캔버스 연출 폴백 ---- */
var PRG={};
(function(){
 if(typeof PROLOGART==="undefined")return;
 var k;for(k in PROLOGART)(function(sc){
   var im=new Image();
   im.onload=function(){if(im.naturalWidth)PRG[sc]=im;};
   im.src=PROLOGART[sc];
 })(k);
})();
function drawPrologImg(im,t){
 /* 커버 맞춤 + 느린 줌 인 (켄 번즈) */
 var z=1+Math.min(1,t/introDur)*0.07;
 var s=Math.max(480/im.width,288/im.height)*z;
 var w=im.width*s,h=im.height*s;
 ictx.drawImage(im,(480-w)/2,(288-h)/2*0.6,w,h);
 /* 하단 자막 가독용 그라디언트 */
 var g=ictx.createLinearGradient(0,180,0,288);
 g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.72)");
 ictx.fillStyle=g;ictx.fillRect(0,180,480,108);
}
function introDraw(){
 if(!introOn)return;
 var sc=introScenes()[introI], t=introT();
 if(!sc){endIntro();return;}
 if(PRG[sc.sc])drawPrologImg(PRG[sc.sc],t);
 else (ISC[sc.sc]||ISC.stars)(t);
 /* 상하 레터박스 + 페이드 */
 ifr(0,0,480,20,"#000");ifr(0,268,480,20,"#000");
 var fin=Math.min(1,t/0.9), fout=Math.min(1,Math.max(0,(introDur-t))/0.7);
 var a=1-Math.min(fin,fout);
 if(a>0){ictx.fillStyle="rgba(0,0,0,"+a.toFixed(2)+")";ictx.fillRect(0,0,480,288);}
 if(t>=introDur){nextIntro();return;}
 introRAF=requestAnimationFrame(introDraw);
}
function showIntroText(){
 var tx=document.getElementById("introtx");
 tx.className="";
 setTimeout(function(){var s=introScenes()[introI];if(s)tx.innerHTML=s.t.join("<br>");tx.className="on";},260);
 var ti=document.getElementById("introtitle");
 ti.className=(introI===introScenes().length-1)?"on":"";
}
function nextIntro(){
 introI++;
 if(introI>=introScenes().length){endIntro();return;}
 introT0=performance.now()/1000;
 showIntroText();
 sfx("port");
 if(introRAF)cancelAnimationFrame(introRAF);
 introRAF=requestAnimationFrame(introDraw);
}
/* 장면 배열 하나를 처음부터 재생한다. 프롤로그·엔딩이 이 함수를 공유한다.
   opt = {kind:"intro"|"ending", music:트랙키, after:끝난 뒤 콜백}
   반환값 false = 재생하지 못했다(이미 다른 컷신 중이거나 장면이 없다). */
function playCutscene(scenes,opt){
 if(introOn)return false;
 if(!scenes||!scenes.length)return false;
 opt=opt||{};
 introSeq=(scenes===INTRO)?null:scenes;
 introKind=opt.kind||"intro";
 introAfter=(typeof opt.after==="function")?opt.after:null;
 introOn=true;introI=0;introT0=performance.now()/1000;
 document.getElementById("introov").style.display="block";
 document.getElementById("introtitle").className="";
 showIntroText();
 try{sfx("pot");}catch(e){}
 musicPlay(opt.music||"intro");
 if(introRAF)cancelAnimationFrame(introRAF);
 introRAF=requestAnimationFrame(introDraw);
 return true;
}
function playIntro(){ return playCutscene(INTRO,{kind:"intro",music:"intro"}); }
/* 엔딩 — 3부를 처음 깬 순간(24_run.js)과 타이틀의 '엔딩 감상'에서 부른다.
   ★ 재생을 못 하는 상황(데이터 없음·다른 컷신 중)에도 after 는 반드시 부른다.
     안 그러면 런이 정산으로 넘어가지 못하고 그 자리에 멈춘다. */
function playEnding(after){
 var ok=false;
 if(typeof ENDING!=="undefined"&&ENDING&&ENDING.length)
   /* R33 — 엔딩 전용 곡 슬롯. ending.mp3 가 아직 없으면 musicResolve 가 intro 로 떨어뜨린다. */
   ok=playCutscene(ENDING,{kind:"ending",music:"ending",after:after});
 if(!ok&&typeof after==="function")after();
 return ok;
}
function endIntro(){
 if(!introOn)return;
 introOn=false;
 if(introRAF)cancelAnimationFrame(introRAF);
 document.getElementById("introov").style.display="none";
 document.getElementById("introtx").className="";
 document.getElementById("introtitle").className="";
 /* '봤음' 기록은 프롤로그 전용이다 — 엔딩이 이 플래그를 세우면 다음 신규 플레이에서 프롤로그가 통째로 생략된다 */
 if(introKind==="intro"){ try{if(STOREOK)localStorage.setItem("lc2_intro_seen","1");}catch(e){} }
 if(started&&P&&typeof ZONES!=="undefined"&&ZONES[curZ])setMusicZone(ZONES[curZ].song||"field"); else musicPlay("intro");
 /* 후속 처리는 상태를 되돌린 뒤에 부른다 — 콜백이 다시 컷신을 열 수도 있으므로 */
 var after=introAfter;
 introSeq=null;introKind="intro";introAfter=null;
 if(after){ try{ after(); }
   catch(e){ if(typeof console!=="undefined"&&console.error)console.error("[컷신 후속 처리 실패]",e); } }
}
(function(){
 var ov=document.getElementById("introov");
 ov.addEventListener("mousedown",function(e){
   if(e.target.id==="introskip")return;
   nextIntro();});
 ov.addEventListener("touchstart",function(e){
   if(e.target.id==="introskip")return;
   e.preventDefault();nextIntro();},{passive:false});
})();
