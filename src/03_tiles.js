/* ================= 타일 / 지형 스프라이트 ================= */
var HW2=16,HH2=8;

var TILEC={};
function tileSprite(th,v){
  var k=th+v,cv=TILEC[k];
  if(cv)return cv;
  cv=document.createElement("canvas");cv.width=34;cv.height=20;
  var g=cv.getContext("2d"),T=THEME[th]||THEME.grass;
  var base=(v%3===0)?T.b:((v%5===4)?T.c:T.a);
  var rng=mulberry32(v*7919+th.length*131);
  g.save();
  g.beginPath();g.moveTo(17,1);g.lineTo(33,9);g.lineTo(17,17);g.lineTo(1,9);g.closePath();g.clip();
  g.fillStyle=hsl(base[0],base[1],base[2]);g.fillRect(0,0,34,20);
  var i,x,y,l;
  for(i=0;i<26;i++){
    x=1+Math.floor(rng()*32);y=1+Math.floor(rng()*16);
    l=base[2]+(rng()*7-3.5);
    g.fillStyle=hsl(base[0]+(rng()*10-5),base[1],l);
    g.fillRect(x,y,1+(rng()<0.2?1:0),1);
  }
  if(T.deco==="grass"){
    for(i=0;i<4;i++){x=4+Math.floor(rng()*26);y=4+Math.floor(rng()*10);
      g.fillStyle=hsl(base[0]+6,base[1]+10,base[2]+5);
      g.fillRect(x,y,1,2);}
  }else if(T.deco==="stone"){
    g.strokeStyle="rgba(0,0,0,.07)";g.lineWidth=1;
    if(v%2){g.beginPath();g.moveTo(9,5);g.lineTo(25,13);g.stroke();}
    else{g.beginPath();g.moveTo(9,13);g.lineTo(25,5);g.stroke();}
  }else if(T.deco==="crack"&&v%3===1){
    g.strokeStyle="rgba(0,0,0,.35)";g.beginPath();
    g.moveTo(6+rng()*8,6);g.lineTo(14+rng()*6,10);g.lineTo(20+rng()*6,8);g.stroke();
  }else if(T.deco==="dirt"){
    for(i=0;i<3;i++){x=5+Math.floor(rng()*24);y=4+Math.floor(rng()*10);
      g.fillStyle=hsl(base[0]-6,base[1]-4,base[2]-5);g.fillRect(x,y,2,1);}
  }
  g.restore();
  TILEC[k]=cv;return cv;
}
/* ============ R28b 바닥 깔개(decal) — 막지 않는 바닥 그림 ============
   대표 지시(원문): "마경은 검은 늪이나 해골 부스러기 시체 이런걸로 바닥에 깔면 될 것 같음."
   ★ 오브젝트가 아니라 **바닥 그림**이다. 충돌 격자를 건드리지 않으므로 걸리지 않는다.
   ★ 타일 마름모(34x20) 안쪽에 잘라 그린다 — 밖으로 삐져나오면 옆 칸 위로 번진다.
   새 종류를 넣는 순서 = 여기 한 덩어리 + 그 존 데이터의 fdec 한 줄. (그림 생성 비용 0) */
var DECC={};
function decalSprite(kind,v){
  var k=kind+v,cv=DECC[k];
  if(cv)return cv;
  var OS=(typeof PXS!=="undefined")?PXS:1;
  cv=document.createElement("canvas");cv.width=Math.round(34*OS);cv.height=Math.round(24*OS);
  var g=cv.getContext("2d");
  if(OS!==1)g.setTransform(OS,0,0,OS,0,0);
  g.imageSmoothingEnabled=false;
  var rng=mulberry32(v*6151+kind.length*97);
  g.save();
  g.beginPath();g.moveTo(17,2);g.lineTo(33,10);g.lineTo(17,18);g.lineTo(1,10);g.closePath();g.clip();
  var i,x,y,r;
  if(kind==="bog"){
    /* 검은 늪 — 기름처럼 검고 가장자리에 남빛 기포가 앉는다 */
    g.fillStyle="rgba(6,8,16,.82)";
    g.beginPath();g.ellipse(17,10,13,6.5,0,0,6.2832);g.fill();
    g.fillStyle="rgba(14,20,40,.85)";
    g.beginPath();g.ellipse(15+rng()*4,10,9,4.4,0,0,6.2832);g.fill();
    for(i=0;i<4;i++){
      x=7+rng()*20;y=6+rng()*8;r=0.8+rng()*1.4;
      g.fillStyle="rgba(90,120,190,"+(0.18+rng()*0.22)+")";
      g.beginPath();g.arc(x,y,r,0,6.2832);g.fill();
    }
    /* 어두운 던전 조명 아래에서도 "늪" 으로 읽히게 테두리 반사광을 조금 세게 준다
       (첫 실측 스크린샷에서 그냥 그림자처럼 보였다) */
    g.strokeStyle="rgba(130,165,235,.26)";g.lineWidth=1;
    g.beginPath();g.ellipse(17,10,11.5,5.5,0,0,6.2832);g.stroke();
    g.strokeStyle="rgba(150,185,245,.20)";
    g.beginPath();g.moveTo(10,8.5);g.quadraticCurveTo(17,6.4,24,8.5);g.stroke();
  }else if(kind==="skullbits"){
    /* 해골 부스러기 — 자잘한 뼈 조각 + 작은 두개골 하나 */
    for(i=0;i<7;i++){
      x=6+rng()*22;y=6+rng()*8;
      g.fillStyle="rgba("+(196+Math.floor(rng()*30))+","+(190+Math.floor(rng()*24))+",170,.72)";
      g.fillRect(x,y,1+Math.floor(rng()*2),1);
    }
    var sx2=12+rng()*8,sy2=8+rng()*4;
    g.fillStyle="rgba(214,208,186,.85)";
    g.beginPath();g.ellipse(sx2,sy2,3.2,2.4,0,0,6.2832);g.fill();
    g.fillStyle="rgba(24,22,30,.9)";
    g.fillRect(sx2-1.6,sy2-0.6,1.2,1.2);g.fillRect(sx2+0.5,sy2-0.6,1.2,1.2);
    g.fillStyle="rgba(0,0,0,.22)";
    g.beginPath();g.ellipse(sx2,sy2+2.6,3.6,1.4,0,0,6.2832);g.fill();
  }else if(kind==="corpse"){
    /* 시체 — 엎어진 형체와 흘러나온 자국. 험한 그림은 피하고 실루엣만 남긴다. */
    g.fillStyle="rgba(40,10,14,.34)";
    g.beginPath();g.ellipse(17,11,11,5,0,0,6.2832);g.fill();
    g.fillStyle="rgba(52,44,52,.9)";
    g.beginPath();g.ellipse(16+rng()*2,10,6.5,3,0.2,0,6.2832);g.fill();   /* 몸통(천) */
    g.fillStyle="rgba(70,60,66,.9)";
    g.beginPath();g.ellipse(10+rng()*1.5,11,2.4,1.6,0,0,6.2832);g.fill(); /* 머리 */
    g.strokeStyle="rgba(120,110,100,.75)";g.lineWidth=1;
    g.beginPath();g.moveTo(20,9);g.lineTo(25,7);g.stroke();               /* 뻗은 팔 */
    g.beginPath();g.moveTo(21,12);g.lineTo(26,13);g.stroke();
    g.fillStyle="rgba(180,170,150,.7)";g.fillRect(25,6,2,1);
  }
  g.restore();
  DECC[k]=cv;return cv;
}
/* 지형 오브젝트 */
var OBJC={};
function objSprite(kind,v){
  var k=kind+v,cv=OBJC[k];
  if(cv)return cv;
  var OS=(typeof PXS!=="undefined")?PXS:1;
  cv=document.createElement("canvas");cv.width=Math.round(44*OS);cv.height=Math.round(48*OS);
  var g=cv.getContext("2d");
  if(OS!==1)g.setTransform(OS,0,0,OS,0,0);   /* 같은 그리기 코드를 배율만 올려 재사용 */
  g.imageSmoothingEnabled=false;
  var cx=22,fy=44,i,x,y;
  var rng=mulberry32(v*104729+kind.length*31);
  if(kind==="tree"){
    var trunk=RAMP(26,38,14,34),leaf=RAMP(v%2?96:112,32,16,42);
    pt(g,cx-2,fy-12,4,12,trunk);
    g.fillStyle=trunk[0];g.fillRect(cx+1,fy-11,1,10);
    if(v%2){
      g.fillStyle=leaf.ol;
      g.beginPath();g.arc(cx,fy-21,10,0,6.2832);g.arc(cx-6,fy-16,7,0,6.2832);g.arc(cx+6,fy-16,7,0,6.2832);g.fill();
      g.fillStyle=leaf[1];
      g.beginPath();g.arc(cx,fy-21,9,0,6.2832);g.arc(cx-6,fy-16,6,0,6.2832);g.arc(cx+6,fy-16,6,0,6.2832);g.fill();
      g.fillStyle=leaf[2];g.beginPath();g.arc(cx-3,fy-24,6,0,6.2832);g.fill();
      g.fillStyle=leaf[3];g.beginPath();g.arc(cx-4,fy-26,3,0,6.2832);g.fill();
      g.fillStyle=leaf[0];g.beginPath();g.arc(cx+6,fy-14,4,0,6.2832);g.fill();
    }else{
      for(i=0;i<4;i++){
        var w=18-i*4, yy=fy-11-i*6;
        g.fillStyle=leaf.ol;
        g.beginPath();g.moveTo(cx,yy-9);g.lineTo(cx+w/2,yy+1);g.lineTo(cx-w/2,yy+1);g.closePath();g.fill();
        g.fillStyle=i===3?leaf[2]:leaf[1];
        g.beginPath();g.moveTo(cx,yy-8);g.lineTo(cx+w/2-1,yy);g.lineTo(cx-w/2+1,yy);g.closePath();g.fill();
        g.fillStyle=leaf[i>1?3:2];
        g.beginPath();g.moveTo(cx-1,yy-7);g.lineTo(cx-1,yy);g.lineTo(cx-w/2+2,yy);g.closePath();g.fill();
      }
    }
  }else if(kind==="rock"){
    var rk=RAMP(40,10,26,52);
    pt(g,cx-7,fy-9,14,9,rk);pt(g,cx-3,fy-13,8,6,rk);
    g.fillStyle=rk[3];g.fillRect(cx-5,fy-11,3,2);
    g.fillStyle="rgba(90,120,60,.45)";g.fillRect(cx-6,fy-3,3,1);g.fillRect(cx+3,fy-4,3,1);
  }else if(kind==="house"){
    var wall=RAMP(34,26,26,52),roof=RAMP(14,32,20,42),door=RAMP(26,30,10,22);
    pt(g,cx-13,fy-16,26,16,wall);
    g.fillStyle=wall[0];for(i=0;i<4;i++)g.fillRect(cx-12,fy-13+i*4,24,1);
    pt(g,cx-15,fy-25,30,10,roof);
    g.fillStyle=roof[3];g.fillRect(cx-14,fy-24,28,2);
    g.fillStyle=roof[0];for(i=0;i<6;i++)g.fillRect(cx-14+i*5,fy-23,1,8);
    pt(g,cx-4,fy-11,8,11,door);
    fr(g,cx+6,fy-13,5,4,"#ffd980");fr(g,cx-11,fy-13,5,4,"#ffd980");
    g.fillStyle="rgba(255,217,128,.18)";g.fillRect(cx+5,fy-14,7,6);g.fillRect(cx-12,fy-14,7,6);
    pt(g,cx+8,fy-31,4,7,RAMP(20,18,16,32));
  }else if(kind==="pillar"){
    var st=RAMP(258,10,14,34);
    pt(g,cx-7,fy-26,14,26,st);
    g.fillStyle=st[3];g.fillRect(cx-6,fy-25,3,24);
    pt(g,cx-9,fy-30,18,5,st);pt(g,cx-9,fy-4,18,4,st);
    g.strokeStyle="rgba(0,0,0,.4)";g.beginPath();g.moveTo(cx-2,fy-22);g.lineTo(cx,fy-14);g.lineTo(cx-3,fy-7);g.stroke();
  /* ================= 던전 벽 3종 + 갓돌 (R19d 시인성 개편) =================
     대표 지시: "가로벽 / 세로벽 / 십자벽으로 만들어서 벽이 두껍지 않게 시인성을 올려야 할 것 같다."
     방향 3종은 R9 에 이미 있었지만(분포 실측 가로 40% / 세로 38% / 교차 20% — 편중 없음)
     **판이 너무 높고 어두워서** 화면이 벽 덩어리로 읽혔다. 그래서 이번엔 색·높이를 손본다.
       ① 명도를 올린다: 옛 RAMP(258,9,15,35) → (258,10,20,50). 어두운 바닥 위에서 벽선이 보인다.
       ② 높이를 낮춘다(실측): 세로 32→20px · 가로 30→15px · 교차 34→22px · 갓돌 10px.
          뒤에 선 몹·상자·기록물이 벽에 가려지지 않는다.
       ③ 위쪽에 밝은 갓돌선, 아래쪽에 어두운 접지선을 넣어 **판끼리 서로 분리**돼 보이게 한다.
          (예전엔 같은 색 판이 붙어 있어 여러 칸이 한 덩어리로 뭉쳤다.)
     ★ 두께를 줄인다고 충돌 판정을 바꾼 것은 아니다. 벽 칸은 그대로 벽이다(g[y][x]===1). */
  }else if(kind==="wallh"){
    /* 가로(좌우)로 이어지는 벽 — 넓고 낮은 판. 통로의 위/아래 경계. */
    var whc=RAMP(258,10,20,50);
    pt(g,cx-17,fy-14,34,3,whc);                                 /* 갓돌 */
    pt(g,cx-15,fy-11,30,9,whc);                                 /* 몸체 — 옛 16 → 9 (실측 총높이 15px) */
    g.fillStyle=whc[3];g.fillRect(cx-15,fy-14,34,1);            /* 밝은 윗선 */
    g.fillStyle=whc[3];g.fillRect(cx-14,fy-10,28,1);
    g.fillStyle="rgba(0,0,0,.34)";g.fillRect(cx-15,fy-2,30,1);  /* 접지 그림자 */
    /* ★ 좌우 테두리를 지워 옆 칸과 이어 붙인다 — 테두리가 남아 있으면 벽 한 줄이
       '상자 여러 개'로 읽힌다(실측 스크린샷에서 이게 두꺼워 보이는 주된 원인이었다). */
    g.fillStyle=whc[1];g.fillRect(cx-18,fy-14,1,13);g.fillRect(cx+17,fy-14,1,13);
  }else if(kind==="wallv"){
    /* 세로(상하)로 이어지는 벽 — 좁고 (조금) 높은 판. 가로판과 실루엣이 달라 방향이 읽힌다. */
    var wvc=RAMP(258,10,20,50);
    pt(g,cx-6,fy-19,12,4,wvc);
    pt(g,cx-5,fy-15,10,13,wvc);                                 /* 몸체 — 옛 26 → 13 (실측 총높이 20px) */
    g.fillStyle=wvc[3];g.fillRect(cx-6,fy-19,12,1);             /* 밝은 윗선 */
    g.fillStyle=wvc[3];g.fillRect(cx-4,fy-14,2,11);
    g.fillStyle="rgba(0,0,0,.34)";g.fillRect(cx-5,fy-2,10,1);
  }else if(kind==="wallx"){
    /* 교차/모서리 — 가로+세로 벽이 만나는 지점(방 모서리·갈림길). v===2 타일에만 횃불을 달아
       길찾기 랜드마크 + 던전 조명(19_render.js torches) 역할을 유지한다. */
    var wxc=RAMP(258,10,20,50);
    pt(g,cx-5,fy-21,10,6,wxc);                                  /* 짧은 기둥 — 모서리 표시 */
    pt(g,cx-14,fy-16,28,4,wxc);
    pt(g,cx-12,fy-12,24,11,wxc);
    g.fillStyle=wxc[3];g.fillRect(cx-14,fy-16,28,1);
    g.fillStyle=wxc[3];g.fillRect(cx-11,fy-11,22,1);
    fr(g,cx-12,fy-2,24,1,"rgba(0,0,0,.34)");
    if(v===2)pt(g,cx+7,fy-20,3,9,RAMP(26,36,16,32));
  }else if(kind==="wallcap"){
    /* 갓돌 — 뒤쪽(서/북)에만 바닥이 붙은 벽. 높게 세우면 그 바닥을 가리므로 **눕힌다**.
       높이 11px 라 뒤쪽 방·몹·상자가 그대로 보인다. 벽이라는 건 윗면 갓돌선으로 읽힌다. */
    var wcc=RAMP(258,10,22,52);
    pt(g,cx-16,fy-9,32,3,wcc);
    pt(g,cx-14,fy-6,28,5,wcc);                                  /* 실측 총높이 10px */
    g.fillStyle=wcc[3];g.fillRect(cx-16,fy-9,32,1);
    g.fillStyle="rgba(0,0,0,.30)";g.fillRect(cx-14,fy-1,28,1);
    g.fillStyle=wcc[1];g.fillRect(cx-17,fy-9,1,9);g.fillRect(cx+16,fy-9,1,9);   /* 옆 칸과 이어 붙임 */
  }else if(kind==="planter"){
    var pl=RAMP(36,14,28,50),gr=RAMP(96,30,20,44);
    pt(g,cx-9,fy-6,18,6,pl);
    pt(g,cx-8,fy-10,16,5,gr);
    var fc=["#e06a6a","#e0c05a","#c07ae0","#f4f4f4"];
    for(i=0;i<6;i++)fr(g,cx-7+i*2.6,fy-12+((i*7)%3),2,2,fc[i%4]);
  }else if(kind==="cross"){
    var cs=RAMP(44,8,34,66);
    pt(g,cx-2,fy-34,5,34,cs);pt(g,cx-9,fy-28,19,5,cs);
    pt(g,cx-7,fy-3,15,3,RAMP(40,10,24,46));
  }else if(kind==="tent"){
    var tv=RAMP(30,30,22,44),po=RAMP(26,34,14,30);
    g.fillStyle=tv.ol;g.beginPath();g.moveTo(cx,fy-26);g.lineTo(cx+14,fy);g.lineTo(cx-14,fy);g.closePath();g.fill();
    g.fillStyle=tv[1];g.beginPath();g.moveTo(cx,fy-24);g.lineTo(cx+12,fy-1);g.lineTo(cx-12,fy-1);g.closePath();g.fill();
    g.fillStyle=tv[2];g.beginPath();g.moveTo(cx,fy-24);g.lineTo(cx,fy-1);g.lineTo(cx-12,fy-1);g.closePath();g.fill();
    g.fillStyle="#1a1208";g.beginPath();g.moveTo(cx,fy-13);g.lineTo(cx+5,fy-1);g.lineTo(cx-5,fy-1);g.closePath();g.fill();
    pt(g,cx-1,fy-30,2,7,po);
  }else if(kind==="totem"){
    var tw=RAMP(24,30,16,34);
    pt(g,cx-5,fy-26,10,26,tw);
    fr(g,cx-4,fy-23,8,3,"#c04030");fr(g,cx-4,fy-16,8,3,"#d0a030");
    fr(g,cx-3,fy-11,2,2,"#f0f0e0");fr(g,cx+1,fy-11,2,2,"#f0f0e0");
    pt(g,cx-8,fy-30,16,4,tw);
  }else if(kind==="bone"){
    var bn=RAMP(46,10,46,80);
    pt(g,cx-8,fy-4,16,3,bn);pt(g,cx-9,fy-6,3,6,bn);pt(g,cx+6,fy-6,3,6,bn);
    pt(g,cx-3,fy-12,7,7,bn);fr(g,cx-2,fy-10,2,2,"#14141c");fr(g,cx+1,fy-10,2,2,"#14141c");
  /* ===== R28 동대륙(무협) 지형물 3종 — 대표 지시: "동대륙 디자인은 약간 무협식 집으로" =====
     그림 생성 비용 0(절차 생성). 존 데이터의 obk 에 이름만 적으면 그 지역에 선다. */
  }else if(kind==="house_wx"){
    /* 기와집 — 처마가 양옆으로 치솟은 곡선 지붕 + 붉은 기둥 + 창호지 창 */
    var wwall=RAMP(36,22,30,56),wroof=RAMP(210,14,18,40),wpost=RAMP(8,46,18,38);
    pt(g,cx-12,fy-15,24,15,wwall);                                  /* 몸체 */
    g.fillStyle=wwall[0];for(i=0;i<3;i++)g.fillRect(cx-11,fy-12+i*4,22,1);
    pt(g,cx-3,fy-13,7,13,RAMP(26,30,12,24));                        /* 문 */
    g.fillStyle="rgba(255,232,180,.30)";g.fillRect(cx-10,fy-12,6,5);g.fillRect(cx+5,fy-12,6,5);
    fr(g,cx-10,fy-12,6,5,"#ffe6a8");fr(g,cx+5,fy-12,6,5,"#ffe6a8");
    pt(g,cx-12,fy-16,3,16,wpost);pt(g,cx+10,fy-16,3,16,wpost);      /* 붉은 기둥 */
    /* 곡선 지붕 — 가운데가 낮고 양 끝이 들린다 */
    g.fillStyle=wroof.ol;
    g.beginPath();g.moveTo(cx-19,fy-19);g.quadraticCurveTo(cx,fy-27,cx+19,fy-19);
    g.lineTo(cx+17,fy-15);g.quadraticCurveTo(cx,fy-22,cx-17,fy-15);g.closePath();g.fill();
    g.fillStyle=wroof[1];
    g.beginPath();g.moveTo(cx-17,fy-19);g.quadraticCurveTo(cx,fy-26,cx+17,fy-19);
    g.lineTo(cx+15,fy-16);g.quadraticCurveTo(cx,fy-22,cx-15,fy-16);g.closePath();g.fill();
    g.fillStyle=wroof[3];g.fillRect(cx-15,fy-21,30,1);
    for(i=0;i<7;i++)g.fillRect(cx-15+i*5,fy-20,1,4);                /* 기왓골 */
    g.fillStyle=wroof.ol;g.fillRect(cx-20,fy-21,3,2);g.fillRect(cx+17,fy-21,3,2);  /* 치솟은 처마 끝 */
  }else if(kind==="bamboo"){
    /* 대나무 — 마디가 있는 초록 대 3~4대 */
    var bm=RAMP(120,34,26,58),n2=3+(v%2);
    for(i=0;i<n2;i++){
      var bxo=cx-7+i*5, bh=22+((i*7+v*3)%10);
      pt(g,bxo,fy-bh,3,bh,bm);
      g.fillStyle=bm[3];
      for(y=1;y<bh;y+=6)g.fillRect(bxo,fy-bh+y,3,1);               /* 마디 */
      g.fillStyle=bm.ol;
      g.beginPath();g.moveTo(bxo+1,fy-bh);g.lineTo(bxo+7,fy-bh-4);g.lineTo(bxo+1,fy-bh+3);g.closePath();g.fill();
      g.beginPath();g.moveTo(bxo+2,fy-bh+4);g.lineTo(bxo-5,fy-bh+1);g.lineTo(bxo+2,fy-bh+7);g.closePath();g.fill();
    }
  }else if(kind==="thorn"){
    /* R32 가시덩굴 벽 — 정령마법사가 불러 세우는 임시 장애물.
       "임시로 솟은 것"이 한눈에 읽혀야 한다 → 뿌리에서 위로 뻗은 줄기 + 바깥으로 튄 가시. */
    var th=RAMP(104,46,20,52), tn=4;
    g.fillStyle="rgba(30,60,26,.45)";
    g.beginPath();g.ellipse(cx,fy-1,13,4,0,0,6.2832);g.fill();            /* 밑동 그늘 */
    for(i=0;i<tn;i++){
      var txo=cx-9+i*6, thh=16+((i*5+v*3)%9), sway=((i+v)%2)?1:-1;
      g.strokeStyle=th.ol;g.lineWidth=3;
      g.beginPath();g.moveTo(txo,fy-2);
      g.quadraticCurveTo(txo+sway*4,fy-thh*0.6,txo+sway*2,fy-thh);g.stroke();
      g.strokeStyle=th[1];g.lineWidth=1.5;
      g.beginPath();g.moveTo(txo,fy-2);
      g.quadraticCurveTo(txo+sway*4,fy-thh*0.6,txo+sway*2,fy-thh);g.stroke();
      g.fillStyle=th[3];
      for(y=4;y<thh;y+=5){                                                /* 가시 */
        g.beginPath();g.moveTo(txo+sway,fy-y);
        g.lineTo(txo+sway*5,fy-y-2);g.lineTo(txo+sway,fy-y-3);g.closePath();g.fill();
      }
    }
    g.fillStyle="rgba(190,240,170,.30)";g.fillRect(cx-10,fy-3,20,1);      /* 정령 기운 */
  }else if(kind==="icepil"){
    /* R32 빙결 결계 — 마도학자의 임시 장애물. 아래는 두껍고 위는 뾰족한 얼음 기둥 3개.
       색은 하늘빛 + 흰 하이라이트. 반투명 느낌을 주려고 몸통 위에 밝은 면을 얹는다. */
    var ic=RAMP(196,30,44,84), pn=3;
    g.fillStyle="rgba(120,180,220,.35)";
    g.beginPath();g.ellipse(cx,fy-1,13,4,0,0,6.2832);g.fill();
    for(i=0;i<pn;i++){
      var pxo=cx-8+i*8, ph2=15+((i*6+v*4)%11), pw=6-((i+v)%2);
      g.fillStyle=ic.ol;
      g.beginPath();g.moveTo(pxo-pw/2,fy-2);g.lineTo(pxo+pw/2,fy-2);
      g.lineTo(pxo+1,fy-ph2);g.closePath();g.fill();
      g.fillStyle=ic[1];
      g.beginPath();g.moveTo(pxo-pw/2+1,fy-3);g.lineTo(pxo+pw/2-1,fy-3);
      g.lineTo(pxo+1,fy-ph2+2);g.closePath();g.fill();
      g.fillStyle=ic[3];
      g.beginPath();g.moveTo(pxo-1,fy-4);g.lineTo(pxo+1,fy-4);g.lineTo(pxo,fy-ph2+3);g.closePath();g.fill();
      g.fillStyle="rgba(255,255,255,.55)";g.fillRect(pxo,fy-ph2+4,1,Math.max(2,ph2-8));
    }
    g.fillStyle="rgba(190,232,255,.22)";g.beginPath();g.arc(cx,fy-10,12,0,6.2832);g.fill();
  }else if(kind==="lantern"){
    /* 석등 — 돌기둥 위에 불이 든 등. 산길 길목 표시로 쓴다. */
    var ls=RAMP(250,8,22,46);
    pt(g,cx-6,fy-4,12,4,ls);pt(g,cx-3,fy-16,6,12,ls);
    pt(g,cx-8,fy-24,16,8,ls);
    g.fillStyle="rgba(255,196,90,.85)";g.fillRect(cx-5,fy-22,10,5);
    g.fillStyle="rgba(255,230,150,.55)";g.fillRect(cx-3,fy-21,6,3);
    pt(g,cx-9,fy-27,18,3,ls);
    g.fillStyle=ls[3];g.fillRect(cx-9,fy-27,18,1);
    g.fillStyle="rgba(255,196,90,.18)";g.beginPath();g.arc(cx,fy-20,11,0,6.2832);g.fill();
  }
  /* ★ 존 데이터(obk)에 없는 종류를 적으면 아래 if/else 어디에도 걸리지 않아 **빈 캔버스**가 나온다
     — 못 지나가는 칸인데 화면에는 아무것도 없어서 오타를 찾기가 어렵다. 그래서 '그려진 것이
     하나도 없으면' 바위로 대체하고 한 번만 경고한다. 종류 목록을 따로 두면 실제 그림과 어긋나므로
     (새 종류를 추가하고 목록을 잊으면 멀쩡한 지형물이 바위가 된다) 결과를 직접 검사한다. */
  if(kind!=="rock"&&objEmpty(cv)){
    if(!objSprite.warned)objSprite.warned={};
    if(!objSprite.warned[kind]){objSprite.warned[kind]=1;
      if(typeof console!=="undefined"&&console.warn)
        console.warn("[지형물] 그림이 없는 종류 '"+kind+"' — 바위로 대체합니다(존 데이터 obk 오타?)");}
    cv=objSprite("rock",v);
  }
  OBJC[k]=cv;return cv;
}
function objEmpty(cv){
  try{
    var g=cv.getContext("2d"),d=g.getImageData(0,0,cv.width,cv.height).data,i;
    for(i=3;i<d.length;i+=4)if(d[i]>8)return false;
    return true;
  }catch(e){ return false; }        /* 검사 자체가 막히면 원본을 그대로 쓴다 */
}
