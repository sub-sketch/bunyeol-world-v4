/* ================= 아이템 아이콘 ================= */
var ICOC={};
function icoSprite(k){
  var cv=ICOC[k];if(cv)return cv;
  cv=document.createElement("canvas");cv.width=20;cv.height=20;
  var g=cv.getContext("2d"),d=ITEMS[k];if(!d){ICOC[k]=cv;return cv;}
  var t=d.t,i;
  var MT=RAMP(d.hue!==undefined?d.hue:210,d.sat!==undefined?d.sat:14,34,82);
  if(t==="weapon"&&d.wt==="bow"){
    for(i=0;i<15;i++){var tt=i/14,off=Math.round(Math.sin(tt*Math.PI)*3);
      fr(g,4+off,3+i,2,1,MT[i<7?2:1]);}
    for(i=0;i<15;i++)fr(g,4,3+i,1,1,"rgba(240,240,250,.8)");
    fr(g,3,10,14,1,"#c9b088");fr(g,15,9,3,3,"#e2e8f4");
  }else if(t==="weapon"&&d.wt==="staff"){
    pt(g,9,5,3,14,RAMP(28,42,20,50));
    pt(g,7,2,7,6,RAMP(d.hue||196,60,36,78));
    g.fillStyle="rgba(180,230,255,.4)";g.fillRect(5,0,12,10);
  }else if(t==="weapon"){
    pt(g,9,2,3,12,MT);
    g.fillStyle=MT[3];g.fillRect(9,3,1,10);
    fr(g,6,14,9,2,"#c9a227");pt(g,10,16,2,3,RAMP(28,40,18,38));
    if(d.wt==="axe")pt(g,4,3,7,7,MT);
  }else if(t==="armor"){
    var AR=RAMP(d.hue!==undefined?d.hue:214,d.sat!==undefined?d.sat:16,26,66);
    pt(g,5,4,10,12,AR);pt(g,3,3,4,5,AR);pt(g,13,3,4,5,AR);
    g.fillStyle=AR[0];g.fillRect(6,13,8,1);g.fillStyle="#c9a227";g.fillRect(5,11,10,2);
  }else if(t==="helm"){
    var HR=RAMP(d.hue!==undefined?d.hue:214,d.sat!==undefined?d.sat:14,30,72);
    pt(g,5,5,10,9,HR);fr(g,6,10,8,2,"#14151d");pt(g,4,4,12,3,HR);
  }else if(t==="shield"){
    var SR=RAMP(d.hue!==undefined?d.hue:30,d.sat!==undefined?d.sat:38,24,58);
    pt(g,5,3,10,13,SR);g.fillStyle=SR[3];g.fillRect(7,6,4,6);
    fr(g,8,8,4,4,"#c9a227");
  }else if(t==="cloak"){
    var CR=RAMP(d.hue!==undefined?d.hue:280,d.sat!==undefined?d.sat:34,20,52);
    g.fillStyle=CR.ol;g.beginPath();g.moveTo(10,2);g.lineTo(17,18);g.lineTo(3,18);g.closePath();g.fill();
    g.fillStyle=CR[1];g.beginPath();g.moveTo(10,3);g.lineTo(16,17);g.lineTo(4,17);g.closePath();g.fill();
    g.fillStyle=CR[2];g.beginPath();g.moveTo(10,3);g.lineTo(10,17);g.lineTo(4,17);g.closePath();g.fill();
  }else if(t==="boots"){
    var BR=RAMP(d.hue!==undefined?d.hue:28,d.sat!==undefined?d.sat:36,20,46);
    pt(g,4,5,5,9,BR);pt(g,3,13,8,4,BR);pt(g,11,5,5,9,BR);pt(g,11,13,8,4,BR);
  }else if(t==="glove"){
    var GR=RAMP(d.hue!==undefined?d.hue:28,d.sat!==undefined?d.sat:34,22,50);
    pt(g,5,6,9,9,GR);pt(g,4,4,3,4,GR);pt(g,8,3,3,5,GR);pt(g,12,4,3,4,GR);
  }else if(t==="ammo"){
    for(i=0;i<3;i++){fr(g,4+i*5,4,1,12,"#c9b088");fr(g,3+i*5,2,3,3,d.hue===200?"#dfe8f6":"#c8c8c8");
      fr(g,3+i*5,15,3,3,"#c0403c");}
  }else if(t==="potion"){
    /* 물약은 병 실루엣을 서로 다르게 — 색만이 아니라 모양으로 구분 */
    var pc=d.pc||"#e04040", gl=RAMP(200,12,40,72), cork=RAMP(28,34,24,46);
    var sh=d.shape||"round";
    if(sh==="round"){                 /* 체력 회복제: 둥근 플라스크 */
      pt(g,6,9,8,8,gl);
      g.fillStyle=pc;g.fillRect(7,11,6,5);
      g.fillStyle="rgba(255,255,255,.6)";g.fillRect(7,11,1,3);
      pt(g,8,4,4,5,gl);pt(g,8,2,4,2,cork);
    }else if(sh==="tall"){            /* 진한 체력: 길쭉한 큰 병 */
      pt(g,6,6,8,11,gl);
      g.fillStyle=pc;g.fillRect(7,8,6,8);
      g.fillStyle="rgba(255,255,255,.6)";g.fillRect(7,8,1,5);
      pt(g,8,2,4,4,cork);
      g.fillStyle="rgba(255,255,255,.35)";g.fillRect(6,12,8,1);
    }else if(sh==="angular"){         /* 마나 회복제: 각진 육각 병 */
      g.fillStyle=gl.ol;g.beginPath();g.moveTo(10,7);g.lineTo(15,11);g.lineTo(13,18);g.lineTo(7,18);g.lineTo(5,11);g.closePath();g.fill();
      g.fillStyle=pc;g.beginPath();g.moveTo(10,9);g.lineTo(13.5,12);g.lineTo(12,17);g.lineTo(8,17);g.lineTo(6.5,12);g.closePath();g.fill();
      g.fillStyle="rgba(255,255,255,.55)";g.fillRect(8,11,1,4);
      pt(g,9,3,3,4,gl);pt(g,8,1,5,2,cork);
    }else if(sh==="wide"){            /* 진한 마나: 넓은 항아리형 */
      pt(g,4,9,12,8,gl);
      g.fillStyle=pc;g.fillRect(5,11,10,5);
      g.fillStyle="rgba(255,255,255,.6)";g.fillRect(6,11,2,3);
      pt(g,8,4,4,5,gl);pt(g,7,2,6,2,cork);
    }else{                            /* 용기의 물약: 별 라벨 삼각 플라스크 */
      g.fillStyle=gl.ol;g.beginPath();g.moveTo(10,5);g.lineTo(16,18);g.lineTo(4,18);g.closePath();g.fill();
      g.fillStyle=pc;g.beginPath();g.moveTo(10,9);g.lineTo(14,16.5);g.lineTo(6,16.5);g.closePath();g.fill();
      pt(g,9,2,3,4,cork);
      g.fillStyle="#fff8c0";g.fillRect(9,13,2,2);g.fillRect(8,14,4,1);
    }
  }else if(t==="scroll"){
    pt(g,4,4,12,12,RAMP(46,26,54,84));
    g.fillStyle="rgba(60,40,20,.6)";for(i=0;i<4;i++)g.fillRect(6,7+i*2,8,1);
    fr(g,4,3,12,2,d.bless?"#7fc7ff":(d.ench?"#c9a227":"#a06a3a"));
    if(d.bless){g.fillStyle="rgba(150,215,255,.4)";g.fillRect(2,2,16,16);}
  }
  ICOC[k]=cv;return cv;
}
/* ================= R24 그림 아이콘 =================
   대표 지시: "아이템들 아이콘들도 그림 뽑아서 만들도록하자".
   공장에서 뽑은 아이콘은 assets/ui/item/<아이템키>.png 로 들어오고 build.py 가 ITEMART 로 내장한다.
   ★ 있으면 그림, 없으면 지금까지의 절차 아이콘(icoSprite) — 그림이 일부만 와도 화면이 깨지지 않는다.
     그래서 아이콘을 한 벌씩 나눠 출하할 수 있다(파일 하나 = 아이템 하나). */
function icoArtUrl(k){
  return (typeof ITEMART !== "undefined" && ITEMART && ITEMART[k]) ? ITEMART[k] : null;
}
function icoEl(k,cls){
  var u=icoArtUrl(k);
  if(u){
    var im=document.createElement("img");
    im.src=u;im.alt="";im.className=(cls||"ico")+" art";
    return im;                       /* 그림 아이콘 — CSS .ico.art 가 크기·보간을 정한다 */
  }
  var c=document.createElement("canvas");c.width=20;c.height=20;c.className=cls||"ico";
  var g=c.getContext("2d");g.imageSmoothingEnabled=false;g.drawImage(icoSprite(k),0,0);
  return c;
}
