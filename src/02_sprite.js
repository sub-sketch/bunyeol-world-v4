/* ================= 스프라이트 엔진 ================= */
/* 그림체 정렬 파라미터 — 기사 스프라이트(41색)에서 측정한 값에 맞춘다.
   측정 결과: 채도 대부분 25% 미만, 어두운 색이 검정이 아니라 자주(H≈315, S≈42).
   STYLE.on=false 로 두면 예전 색감으로 즉시 되돌아간다. */
var STYLE={on:true, sat:0.58, plum:0.55, plumH:315, plumS:42};
function mixHue(a,b,k){
  var d=((b-a)%360+540)%360-180;      /* 최단 경로 */
  return a+d*k;
}
function RAMP(h,s,lo,hi){
  var S=STYLE.on?STYLE.sat:1, K=STYLE.on?STYLE.plum:0;
  var sa=s*S;
  var a=[],i,t;
  for(i=0;i<4;i++){t=i/3;a.push(hsl(h+16*(t-0.5)*2,sa*(0.72+0.28*Math.sin(Math.PI*t)),lo+(hi-lo)*t));}
  var ol_l=Math.max(5,lo*0.40);
  a.ol=hsl(mixHue(h+8,STYLE.plumH,K),
           Math.min(100,sa*0.95*(1-K)+STYLE.plumS*K),
           ol_l*(1-K)+Math.max(5,ol_l*0.75)*K);
  /* 가장 어두운 단계도 살짝 자주 쪽으로 — 기사 팔레트의 서명적인 부분 */
  if(K>0)a[0]=hsl(mixHue(h,STYLE.plumH,K*0.45),sa*0.72*(1-K*0.5)+STYLE.plumS*K*0.5,lo);
  return a;
}
function pt(g,x,y,w,h,r){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  if(w<=0||h<=0)return;
  g.fillStyle=r.ol;g.fillRect(x-1,y-1,w+2,h+2);
  g.fillStyle=r[1];g.fillRect(x,y,w,h);
  if(h>1){g.fillStyle=r[2];g.fillRect(x,y,w,1);}
  if(w>1){g.fillStyle=r[2];g.fillRect(x,y,1,h);}
  if(w>1&&h>1){g.fillStyle=r[3];g.fillRect(x,y,1,1);g.fillRect(x,y+1,1,1);g.fillRect(x+1,y,1,1);}
  if(w>2){g.fillStyle=r[0];g.fillRect(x+w-1,y+1,1,h-1);}
  if(h>2){g.fillStyle=r[0];g.fillRect(x+1,y+h-1,w-1,1);}
}
function ptR(g,x,y,w,h,r){pt(g,x,y,w,h,r);g.clearRect(x-1,y-1,1,1);g.clearRect(x+w,y-1,1,1);g.clearRect(x-1,y+h,1,1);g.clearRect(x+w,y+h,1,1);}
function fr(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
var POSES={
 i0:{bob:0,lf:0,lb:0,kf:0,kb:0,af:0,ab:0,wa:0,lun:0},
 i1:{bob:1,lf:0,lb:0,kf:0,kb:0,af:0,ab:0,wa:0,lun:0},
 w0:{bob:0,lf:2,lb:-2,kf:2,kb:0,af:-2,ab:2,wa:0,lun:0},
 w1:{bob:-1,lf:1,lb:-1,kf:0,kb:1,af:-1,ab:1,wa:0,lun:0},
 w2:{bob:0,lf:-2,lb:2,kf:0,kb:2,af:2,ab:-2,wa:0,lun:0},
 w3:{bob:-1,lf:-1,lb:1,kf:1,kb:0,af:1,ab:-1,wa:0,lun:0},
 a0:{bob:0,lf:-1,lb:1,kf:0,kb:0,af:-3,ab:1,wa:-1,lun:-1},
 a1:{bob:-1,lf:2,lb:-2,kf:1,kb:0,af:4,ab:-2,wa:1,lun:2},
 a2:{bob:0,lf:1,lb:-1,kf:0,kb:0,af:1,ab:0,wa:0.3,lun:1}
};
/* PXS = 전역 픽셀 배율. 기사 스프라이트(48px)에 키를 맞추기 위해 1.6배로 올렸다.
   drawHum/drawBeast 의 모든 치수가 s 에 비례하므로 이 값 하나로 전체가 확대된다. */
var PXS=1.6;
var SW=Math.round(34*PXS),SH=Math.round(42*PXS),FX=Math.round(17*PXS),FY=Math.round(36*PXS);
function drawHum(g,A,dir,ps){
  var s=(A.sz||1)*PXS,side=(dir===1),back=(dir===2);
  var cx=FX,fy=FY,bob=ps.bob||0;
  var HW=Math.round(4.0*s),HH=Math.round(7.6*s);
  var TW=side?Math.round(3.6*s):Math.round(5.0*s),TH=Math.round(10*s);
  var SHW=TW+Math.round(1.6*s);
  var LH=Math.round(9*s),LW=Math.max(2,Math.round(3.0*s)),AW=Math.max(2,Math.round(2.6*s));
  var lun=(ps.lun||0);
  var ly=fy-LH,ty=ly-TH+bob,hy=ty-HH+Math.round(1*s);
  var MA=A.main,SE=A.sec,SK=A.skin,MT=A.metal,AC=A.accent,LE=A.leg||SE;
  var HDC=A.head||SK,BT=A.boot||LE;
  var dk=[LE[0],LE[0],LE[1],LE[1]];dk.ol=LE.ol;
  var kb=(ps.kb||0),kf=(ps.kf||0);
  if(A.cape&&!back){
    if(side)pt(g,cx-TW-2,ty+1,Math.round(2.4*s),TH+Math.round(6*s),AC);
    else{pt(g,cx-SHW,ty+1,SHW*2,TH+Math.round(5*s),AC);g.fillStyle="rgba(0,0,0,.22)";g.fillRect(cx,ty+1,SHW,TH+Math.round(5*s));}
  }
  if(side){pt(g,cx-LW/2-1+(ps.lb||0)*1.1,ly+kb,LW,LH-kb,dk);pt(g,cx-LW/2-2+(ps.lb||0)*1.1,fy-2+kb,LW+2,2,dk);}
  else{pt(g,cx+1,ly+kb,LW,LH-kb,LE);pt(g,cx,fy-2+kb,LW+2,2,BT);}
  if(!side&&!A.robe)pt(g,cx+TW-1,ty+Math.round(2*s)+(ps.ab||0)*0.6,AW,Math.round(TH*0.72),SE);
  if(side){pt(g,cx-LW/2+1+(ps.lf||0)*1.1+lun,ly+kf,LW,LH-kf,LE);pt(g,cx-LW/2+(ps.lf||0)*1.1+lun,fy-2+kf,LW+2,2,BT);}
  else{pt(g,cx-TW+1,ly+kf,LW,LH-kf,LE);pt(g,cx-TW,fy-2+kf,LW+2,2,BT);}
  pt(g,cx-TW,ty+Math.round(2.4*s),TW*2,TH-Math.round(2.4*s),MA);
  pt(g,cx-SHW,ty,SHW*2,Math.round(3.4*s),MA);
  if(!side&&!back){g.fillStyle=MA[3];g.fillRect(cx-SHW+1,ty+1,Math.round(2*s),Math.round(2*s));
    g.fillStyle=MA[0];g.fillRect(cx+SHW-2,ty+1,1,Math.round(3*s));}
  if(A.robe){pt(g,cx-TW-1,ty+TH-Math.round(3*s),TW*2+2,Math.round(7*s),MA);
    g.fillStyle=MA[0];g.fillRect(cx-1,ty+TH-Math.round(2*s),1,Math.round(6*s));}
  else if(A.tasset)pt(g,cx-TW,ty+TH-Math.round(1.5*s),TW*2,Math.round(3.4*s),A.tassetR||MA);
  if(A.belt)fr(g,cx-TW,ty+TH-Math.round(3.2*s),TW*2,Math.max(1,Math.round(1.5*s)),A.belt);
  if(A.pauld){pt(g,cx-SHW-1,ty-1,Math.round(3.4*s),Math.round(3.6*s),MT);
    if(!side)pt(g,cx+SHW-Math.round(2.4*s),ty-1,Math.round(3.4*s),Math.round(3.6*s),MT);}
  var afy=ty+Math.round(2.6*s)+(ps.af||0)*0.55;
  if(side)pt(g,cx+Math.round(0.6*s)+lun,afy,AW,Math.round(TH*0.68),SE);
  else pt(g,cx-SHW-AW+1,afy,AW,Math.round(TH*0.72),SE);
  if(!A.robe){var hxx=side?cx+Math.round(0.6*s)+lun:cx-SHW-AW+1;pt(g,hxx,afy+Math.round(TH*0.68),AW,Math.round(1.8*s),SK);}
  ptR(g,cx-HW,hy,HW*2,HH,HDC);
  if(A.ears){fr(g,cx-HW-1,hy+Math.round(3*s),1,2,SK[1]);fr(g,cx-HW-1,hy+Math.round(2*s),1,1,SK[2]);
    if(!side){fr(g,cx+HW,hy+Math.round(3*s),1,2,SK[1]);fr(g,cx+HW,hy+Math.round(2*s),1,1,SK[2]);}}
  if(A.hair){pt(g,cx-HW,hy-1,HW*2,Math.round(3*s),A.hair);
    if(A.longhair){pt(g,cx-HW-1,hy+1,Math.round(1.8*s),Math.round(HH*1.15),A.hair);
      if(!side)pt(g,cx+HW-1,hy+1,Math.round(1.8*s),Math.round(HH*1.15),A.hair);}}
  var eyY=hy+Math.round(HH*0.46);
  if(!back){
    if(A.helm===2){fr(g,cx-HW+1,eyY,HW*2-2,Math.max(1,Math.round(1.8*s)),A.visor||"#14151d");
      if(A.eyeGlow){fr(g,cx-2,eyY,1,1,A.eyeGlow);fr(g,cx+1,eyY,1,1,A.eyeGlow);}}
    else if(A.skull){fr(g,cx-Math.round(2.4*s),eyY-1,Math.round(2*s),Math.round(2.2*s),"#0e0e16");
      fr(g,cx+Math.round(0.6*s),eyY-1,Math.round(2*s),Math.round(2.2*s),"#0e0e16");
      if(A.eyeGlow){fr(g,cx-Math.round(2*s),eyY,1,1,A.eyeGlow);fr(g,cx+Math.round(1*s),eyY,1,1,A.eyeGlow);}
      fr(g,cx-1,hy+HH-Math.round(2*s),Math.round(2.2*s),1,"#0e0e16");}
    else{var ec=A.eyeGlow||A.eyes||"#2b2230";
      if(side)fr(g,cx-HW+1,eyY,Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.4*s)),ec);
      else{fr(g,cx-Math.round(2.4*s),eyY,Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.6*s)),ec);
        fr(g,cx+Math.round(1.2*s),eyY,Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.6*s)),ec);
        g.fillStyle=HDC[0];g.fillRect(cx-1,eyY+Math.round(2.4*s),Math.round(2*s),1);}}
    if(A.tusk){fr(g,cx-Math.round(2.2*s),hy+HH-Math.round(1.6*s),1,Math.round(2.2*s),"#efe8d0");
      fr(g,cx+Math.round(1.4*s),hy+HH-Math.round(1.6*s),1,Math.round(2.2*s),"#efe8d0");}
  }
  if(A.helm===2){pt(g,cx-HW-1,hy-Math.round(2*s),HW*2+2,Math.round(HH*0.55),MT);
    g.fillStyle=MT[3];g.fillRect(cx-HW,hy-Math.round(1*s),Math.round(2*s),1);
    if(!side&&!back)fr(g,cx-1,hy+Math.round(HH*0.3),Math.round(2*s),Math.round(HH*0.5),MT[0]);
    if(A.plume){pt(g,cx-1,hy-Math.round(7.5*s),Math.round(2.2*s),Math.round(6*s),AC);
      g.fillStyle=AC[3];g.fillRect(cx-1,hy-Math.round(7*s),1,Math.round(4*s));}}
  else if(A.helm===1)pt(g,cx-HW-1,hy-1,HW*2+2,Math.round(3.2*s),A.hat||SE);
  else if(A.helm===3){pt(g,cx-HW-1,hy-Math.round(2*s),HW*2+2,Math.round(HH*0.95),A.hat||MA);
    fr(g,cx-HW+1,hy+Math.round(2*s),HW*2-2,Math.round(HH*0.5),"rgba(0,0,0,.6)");
    if(!back){fr(g,cx-2,eyY,1,1,A.eyeGlow||"#9fe2ff");fr(g,cx+1,eyY,1,1,A.eyeGlow||"#9fe2ff");}}
  else if(A.helm===4){pt(g,cx-HW-1,hy-Math.round(1.5*s),HW*2+2,Math.round(3.6*s),MT);
    var hn=A.horn||"#e6e0cc";
    fr(g,cx-HW-2,hy-Math.round(4*s),Math.round(1.8*s),Math.round(4*s),hn);
    fr(g,cx-HW-3,hy-Math.round(5.5*s),Math.round(1.6*s),Math.round(2.5*s),hn);
    if(!side){fr(g,cx+HW,hy-Math.round(4*s),Math.round(1.8*s),Math.round(4*s),hn);
      fr(g,cx+HW+1,hy-Math.round(5.5*s),Math.round(1.6*s),Math.round(2.5*s),hn);}}
  else if(A.helm===5){pt(g,cx-HW-Math.round(2.4*s),hy-1,HW*2+Math.round(4.8*s),Math.round(2.2*s),A.hat||MA);
    pt(g,cx-Math.round(2.6*s),hy-Math.round(5*s),Math.round(5.2*s),Math.round(4.4*s),A.hat||MA);
    pt(g,cx-Math.round(1.2*s),hy-Math.round(8.5*s),Math.round(2.4*s),Math.round(4*s),A.hat||MA);
    if(A.star)fr(g,cx-1,hy-Math.round(3.4*s),Math.round(2*s),Math.round(2*s),A.star);}
  if(A.shield&&!back){
    var sx2=side?cx-TW-Math.round(3.4*s):cx-SHW-AW-Math.round(2.4*s);
    var SR=A.shieldR||MT;
    pt(g,sx2,ty+Math.round(3*s),Math.round(4.4*s),Math.round(7*s),SR);
    g.fillStyle=SR[3];g.fillRect(sx2+1,ty+Math.round(5*s),Math.round(2.4*s),Math.round(3*s));
    g.fillStyle=A.belt||"#c9a227";g.fillRect(sx2+Math.round(1.6*s),ty+Math.round(6*s),Math.round(1.4*s),Math.round(1.4*s));}
  humDetail(g,A,ps,cx,ty,TW,SHW,TH,s,side,back,ly,LH,fy);
  drawWeapon(g,A,dir,ps,cx,ty,TW,SHW,TH,side,back,s,lun);
}
/* 48px 급에서만 보이는 추가 디테일 — 갑옷 판 하이라이트 / 무릎선 / 어깨 광택.
   작은 액터(s<1.25)에서는 노이즈가 되므로 건너뛴다. */
function humDetail(g,A,ps,cx,ty,TW,SHW,TH,s,side,back,ly,LH,fy){
  if(s<1.25)return;
  var MA=A.main,MT=A.metal||A.main,LE=A.leg||A.sec;
  /* 흉갑 가로 분할선 2줄 */
  g.fillStyle=MA[3];
  g.fillRect(cx-TW+1,ty+Math.round(4.6*s),TW*2-2,1);
  g.fillStyle=MA[0];
  g.fillRect(cx-TW+1,ty+Math.round(4.6*s)+1,TW*2-2,1);
  if(!A.robe){
    g.fillStyle=MA[3];
    g.fillRect(cx-TW+1,ty+Math.round(7.4*s),TW*2-2,1);
  }
  /* 어깨 광택 */
  g.fillStyle=MT[3];
  g.fillRect(cx-SHW+1,ty+1,Math.round(2.4*s),1);
  if(!side&&!back)g.fillRect(cx+SHW-Math.round(3.4*s),ty+1,Math.round(2.4*s),1);
  /* 무릎선 */
  g.fillStyle=LE[0];
  g.fillRect(cx-TW+1,ly+Math.round(LH*0.45),Math.round(2.2*s),1);
  if(!side)g.fillRect(cx+1,ly+Math.round(LH*0.45),Math.round(2.2*s),1);
  /* 가슴 중앙 하이라이트(정면만) */
  if(!side&&!back){
    g.fillStyle="rgba(255,255,255,.10)";
    g.fillRect(cx-Math.round(1.2*s),ty+Math.round(3*s),Math.round(2.4*s),Math.round(3.4*s));
  }
}
function drawWeapon(g,A,dir,ps,cx,ty,TW,SHW,TH,side,back,s,lun){
  var MT=A.metal,W=A.wep;
  if(!W)return;
  var hx=side?cx+Math.round(1.4*s)+lun:cx-SHW-Math.round(2.4*s);
  var hy2=ty+Math.round(TH*0.72)+(ps.af||0)*0.55;
  var wa=ps.wa||0,i,L;
  if(W==="sword"||W==="axe"){
    L=Math.round((W==="axe"?11:14)*s);
    if(wa===0){
      pt(g,hx,hy2-L,Math.round(2.2*s),L,MT);
      g.fillStyle=MT[3];g.fillRect(hx,hy2-L+1,1,L-2);
      fr(g,hx-1,hy2-1,Math.round(4.4*s),Math.round(2*s),A.grip||"#c9a227");
      if(W==="axe")pt(g,hx-Math.round(2*s),hy2-L,Math.round(6*s),Math.round(5*s),MT);
    }else if(wa>0){
      var bx=side?hx:hx-L;
      pt(g,bx,hy2-Math.round(4*s),L,Math.round(2.2*s),MT);
      g.fillStyle=MT[3];g.fillRect(bx+1,hy2-Math.round(4*s),L-2,1);
      fr(g,hx-1,hy2-Math.round(5.4*s),Math.round(2*s),Math.round(4.6*s),A.grip||"#c9a227");
      if(W==="axe")pt(g,side?bx+L-Math.round(3*s):bx,hy2-Math.round(7*s),Math.round(5*s),Math.round(8*s),MT);
      g.fillStyle="rgba(255,255,255,.34)";g.fillRect(bx+2,hy2-Math.round(8*s),L-4,1);
      g.fillStyle="rgba(255,255,255,.18)";g.fillRect(bx+4,hy2-Math.round(11*s),L-8,1);
    }else{
      for(i=0;i<L;i++){var px=side?hx+i*0.66:hx-i*0.66;
        fr(g,px,hy2-2-i*0.75,Math.round(2*s),Math.round(1.6*s),i>L-3?MT[3]:MT[1]);}
      fr(g,hx-1,hy2-1,Math.round(3.4*s),Math.round(2.4*s),A.grip||"#c9a227");
    }
  }else if(W==="bow"){
    var bx2=side?cx+Math.round(3.4*s)+lun:cx-SHW-Math.round(3*s);
    var ah=Math.round(15*s),off,t;
    for(i=0;i<ah;i++){t=i/(ah-1);off=Math.round(Math.sin(t*Math.PI)*2.6)*(side?1:-1);
      fr(g,bx2+off+(side?-1:1),ty-Math.round(1*s)+i,1,1,MT.ol);
      fr(g,bx2+off,ty-Math.round(1*s)+i,1,1,MT[i<ah*0.45?2:1]);}
    var pull=(wa>0?Math.round(2.6*s):0)*(side?-1:1);
    for(i=0;i<ah;i++){t=i/(ah-1);fr(g,bx2+pull*Math.sin(t*Math.PI),ty-Math.round(1*s)+i,1,1,"rgba(235,238,248,.8)");}
    if(wa!==0){var ay=ty-Math.round(1*s)+Math.round(ah/2),adir=side?1:-1;
      fr(g,bx2-adir*Math.round(5*s),ay,Math.round(9*s),1,"#c9b088");
      fr(g,bx2+adir*Math.round(3*s),ay-1,Math.round(2.4*s),Math.round(2.6*s),"#e2e8f4");
      fr(g,bx2-adir*Math.round(6*s),ay-1,Math.round(2*s),Math.round(2.6*s),"#c0403c");}
  }else if(W==="staff"){
    var stx=side?cx+Math.round(2.4*s)+lun:cx-SHW-Math.round(3*s);
    var sl=Math.round(20*s),oy=ty-Math.round(5*s);
    pt(g,stx,oy,Math.round(2.2*s),sl,A.wood||RAMP(28,40,20,52));
    pt(g,stx-Math.round(1.4*s),oy-Math.round(4*s),Math.round(5*s),Math.round(4.6*s),A.orb||MT);
    if(wa!==0){g.fillStyle="rgba(150,215,255,.5)";g.fillRect(stx-Math.round(3.4*s),oy-Math.round(6.4*s),Math.round(9*s),Math.round(9*s));
      g.fillStyle="rgba(235,250,255,.95)";g.fillRect(stx-Math.round(0.6*s),oy-Math.round(3*s),Math.round(3*s),Math.round(3*s));}
    else{g.fillStyle="rgba(150,215,255,.26)";g.fillRect(stx-Math.round(2.4*s),oy-Math.round(5.4*s),Math.round(7*s),Math.round(7*s));}
  }else if(W==="claw"){
    var clx=side?cx+Math.round(1.4*s)+lun:cx-SHW-Math.round(2.4*s);
    for(i=0;i<3;i++)fr(g,clx-Math.round(1*s),ty+Math.round(TH*0.75)+i*2,Math.round(3.4*s),1,"#efe8d8");
  }
}
function drawBeast(g,A,dir,ps){
  var s=(A.sz||1)*PXS,MA=A.main,SE=A.sec,cx=FX,fy=FY,bob=ps.bob||0;
  var bl=Math.round(14*s),bh=Math.round(7*s);
  var lg=Math.round(6*s),lw=Math.max(2,Math.round(2.4*s));
  var by=fy-lg-bh+2+bob;
  var f=(dir===2)?-1:1,i;
  var dk=[MA[0],MA[0],MA[1],MA[1]];dk.ol=MA.ol;
  pt(g,cx-bl/2+Math.round(1.5*s)-(ps.lb||0),fy-lg,lw,lg,dk);
  pt(g,cx+bl/2-Math.round(3.5*s)+(ps.lb||0),fy-lg,lw,lg,dk);
  var tl=Math.round(7*s);
  for(i=0;i<tl;i++)fr(g,cx-bl/2-1-i*0.85*f,by+Math.round(1*s)-i*0.8,Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.4*s)),i%2?SE[1]:SE[2]);
  pt(g,cx-bl/2,by,bl,bh,MA);
  g.fillStyle=MA[3];g.fillRect(cx-bl/2+1,by+1,bl-3,Math.max(1,Math.round(1.2*s)));
  g.fillStyle=MA[0];g.fillRect(cx-bl/2+1,by+bh-1,bl-2,1);
  if(A.mane)pt(g,cx+bl/2-Math.round(6*s),by-Math.round(1.6*s),Math.round(6*s),Math.round(3*s),SE);
  pt(g,cx-bl/2+Math.round(2.6*s)+(ps.lf||0),fy-lg,lw,lg,MA);
  pt(g,cx+bl/2-Math.round(4.6*s)-(ps.lf||0),fy-lg,lw,lg,MA);
  var hx=cx+bl/2-Math.round(3*s)+(ps.lun||0),hy=by-Math.round(5.5*s);
  ptR(g,hx,hy,Math.round(6.5*s),Math.round(6*s),MA);
  g.fillStyle=MA[3];g.fillRect(hx+1,hy+1,Math.round(2*s),Math.round(2*s));
  pt(g,hx+Math.round(0.4*s),hy-Math.round(2.4*s),Math.round(1.8*s),Math.round(2.6*s),SE);
  pt(g,hx+Math.round(4.2*s),hy-Math.round(2.4*s),Math.round(1.8*s),Math.round(2.6*s),SE);
  pt(g,hx+Math.round(5.6*s),hy+Math.round(2.6*s),Math.round(3.4*s),Math.round(2.8*s),MA);
  fr(g,hx+Math.round(8*s),hy+Math.round(3*s),Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.4*s)),"#1c1c26");
  fr(g,hx+Math.round(4*s),hy+Math.round(2.4*s),Math.max(1,Math.round(1.4*s)),Math.max(1,Math.round(1.4*s)),A.eyeGlow||"#ffd24a");
  if(A.tusk)fr(g,hx+Math.round(7.4*s),hy+Math.round(5*s),1,Math.round(2*s),"#efe8d8");
  if((ps.wa||0)>0){g.fillStyle="rgba(255,255,255,.3)";
    g.fillRect(hx+Math.round(9*s),hy+Math.round(1*s),Math.round(4*s),1);
    g.fillRect(hx+Math.round(9*s),hy+Math.round(5*s),Math.round(4*s),1);}
}
/* 액터 정의 */
/* 팔레트(STYLE)가 바뀌면 ACT 를 다시 만들어야 하므로 함수로 감싼다.
   외부 모듈이 추가하는 액터는 ACT_EXT 에 등록해 두면 함께 재적용된다. */
var ACT={}, ACT_EXT=[];
function buildACT(){
  ACT={
knight:{shape:"hum",sz:1,main:RAMP(222,16,34,80),sec:RAMP(222,14,26,62),leg:RAMP(222,14,28,64),skin:RAMP(28,42,52,80),
 metal:RAMP(216,12,44,86),accent:RAMP(354,68,28,52),helm:2,plume:1,pauld:1,tasset:1,belt:"#c9a227",wep:"sword",
 shield:1,shieldR:RAMP(30,42,24,54),boot:RAMP(28,38,16,34),visor:"#14151d",grip:"#c9a227"},
elf:{shape:"hum",sz:0.97,main:RAMP(140,32,26,62),sec:RAMP(120,26,22,48),leg:RAMP(120,24,24,50),skin:RAMP(30,44,56,84),
 metal:RAMP(34,40,30,62),accent:RAMP(120,36,26,54),helm:0,hair:RAMP(44,54,32,62),longhair:1,ears:1,belt:"#8a6d2b",
 wep:"bow",boot:RAMP(30,36,18,36),eyes:"#2a4a2a"},
mage:{shape:"hum",sz:0.97,main:RAMP(268,38,22,54),sec:RAMP(268,30,18,42),leg:RAMP(268,26,16,38),skin:RAMP(28,40,54,82),
 metal:RAMP(48,52,40,74),accent:RAMP(268,44,26,58),helm:5,hat:RAMP(268,40,18,46),robe:1,wep:"staff",
 orb:RAMP(196,70,40,80),wood:RAMP(28,42,20,50),belt:"#c9a227",star:"#ffe97a",hair:RAMP(40,20,44,72)},
goblin:{shape:"hum",sz:0.82,main:RAMP(70,26,22,46),sec:RAMP(30,30,18,38),skin:RAMP(78,38,30,56),head:RAMP(78,38,30,56),
 metal:RAMP(30,18,28,52),accent:RAMP(20,40,20,42),helm:0,ears:1,wep:"sword",eyes:"#401810"},
orc:{shape:"hum",sz:1.02,main:RAMP(96,30,24,54),sec:RAMP(30,34,20,44),skin:RAMP(96,34,30,58),head:RAMP(96,34,30,58),
 metal:RAMP(30,20,32,58),accent:RAMP(20,50,24,48),helm:0,tusk:1,wep:"sword",eyes:"#301818",belt:"#6b4a24",hair:RAMP(20,30,12,26)},
orcarch:{shape:"hum",sz:1,main:RAMP(104,28,26,52),sec:RAMP(34,30,20,42),skin:RAMP(100,32,32,58),head:RAMP(100,32,32,58),
 metal:RAMP(34,34,28,54),accent:RAMP(24,44,22,44),helm:1,hat:RAMP(30,30,18,38),tusk:1,wep:"bow",eyes:"#301818"},
orcwar:{shape:"hum",sz:1.12,main:RAMP(92,32,20,46),sec:RAMP(28,32,16,36),skin:RAMP(92,34,26,50),head:RAMP(92,34,26,50),
 metal:RAMP(28,22,30,56),accent:RAMP(16,52,20,42),helm:4,tusk:1,pauld:1,wep:"axe",eyes:"#3a1414",horn:"#d8d0b8"},
orcchief:{shape:"hum",sz:1.42,main:RAMP(88,34,18,42),sec:RAMP(26,30,14,32),skin:RAMP(88,36,24,48),head:RAMP(88,36,24,48),
 metal:RAMP(40,34,30,60),accent:RAMP(10,60,22,44),helm:4,tusk:1,pauld:1,cape:1,wep:"axe",eyeGlow:"#ff8a3a",horn:"#e8e0c4"},
skel:{shape:"hum",sz:0.98,main:RAMP(48,12,52,86),sec:RAMP(48,10,44,74),skin:RAMP(48,12,54,88),head:RAMP(48,12,56,90),
 metal:RAMP(210,8,40,74),accent:RAMP(0,0,20,40),helm:0,skull:1,wep:"sword"},
zombie:{shape:"hum",sz:1,main:RAMP(88,20,22,46),sec:RAMP(40,18,20,40),skin:RAMP(88,22,30,54),head:RAMP(88,22,30,54),
 metal:RAMP(30,16,26,50),accent:RAMP(0,30,18,36),helm:0,wep:"claw",eyeGlow:"#c8e070"},
ghoul:{shape:"hum",sz:1.05,main:RAMP(74,18,26,50),sec:RAMP(60,14,20,40),skin:RAMP(70,20,34,58),head:RAMP(70,20,34,58),
 metal:RAMP(30,14,24,46),accent:RAMP(0,26,16,32),helm:0,wep:"claw",eyeGlow:"#f0e060",tusk:1},
spartoi:{shape:"hum",sz:1.06,main:RAMP(40,14,40,70),sec:RAMP(40,10,32,58),skin:RAMP(44,10,46,78),head:RAMP(44,10,48,80),
 metal:RAMP(200,14,36,72),accent:RAMP(352,44,20,40),helm:4,skull:1,pauld:1,wep:"sword",eyeGlow:"#7fe0ff",horn:"#cfd8e0"},
wight:{shape:"hum",sz:1.05,main:RAMP(206,18,30,58),sec:RAMP(206,14,22,44),skin:RAMP(200,14,50,80),head:RAMP(200,14,50,80),
 metal:RAMP(200,12,40,76),accent:RAMP(196,40,26,52),helm:3,hat:RAMP(206,20,16,38),wep:"sword",eyeGlow:"#9fe2ff"},
vamp:{shape:"hum",sz:1.02,main:RAMP(262,22,14,38),sec:RAMP(262,18,12,30),skin:RAMP(282,14,44,70),head:RAMP(282,14,44,70),
 metal:RAMP(210,10,42,80),accent:RAMP(352,62,18,40),cape:1,helm:0,hair:RAMP(262,20,8,24),wep:"sword",eyeGlow:"#ff4040"},
dk:{shape:"hum",sz:1.38,main:RAMP(250,14,10,30),sec:RAMP(250,12,8,24),skin:RAMP(250,10,14,30),head:RAMP(250,10,12,28),
 metal:RAMP(250,14,16,44),accent:RAMP(352,60,14,34),cape:1,helm:4,pauld:1,tasset:1,wep:"axe",eyeGlow:"#ff2418",
 visor:"#0a0a10",boot:RAMP(250,10,6,18),horn:"#b8b0a0"},
wolf:{shape:"beast",sz:1,main:RAMP(220,8,32,58),sec:RAMP(220,8,22,42),eyeGlow:"#ffd24a",mane:1},
bear:{shape:"beast",sz:1.25,main:RAMP(24,32,20,42),sec:RAMP(24,28,14,32),eyeGlow:"#ff9a3a",tusk:1},
npc_shop:{shape:"hum",sz:1,main:RAMP(36,44,28,58),sec:RAMP(30,30,20,42),skin:RAMP(28,42,54,82),metal:RAMP(40,30,32,60),
 accent:RAMP(36,40,26,52),helm:0,hair:RAMP(30,30,20,40),belt:"#8a6d2b",wep:null},
npc_inn:{shape:"hum",sz:1,main:RAMP(212,34,26,54),sec:RAMP(212,24,20,40),skin:RAMP(28,42,56,84),metal:RAMP(40,20,32,60),
 accent:RAMP(212,30,24,48),helm:0,hair:RAMP(24,20,26,46),belt:"#7a6a3a",wep:null},
npc_priest:{shape:"hum",sz:1,main:RAMP(48,22,60,88),sec:RAMP(48,16,48,74),skin:RAMP(28,40,56,84),metal:RAMP(48,40,44,78),
 accent:RAMP(48,44,44,74),helm:3,hat:RAMP(48,20,54,82),robe:1,wep:null}
};
}
function rebuildActorPalettes(){ buildACT(); for(var i=0;i<ACT_EXT.length;i++)try{ACT_EXT[i]();}catch(e){} }
buildACT();

/* 팔레트 변주(변신/변종) */
function tintActor(base,h,s){
  var A={},k;
  for(k in base)A[k]=base[k];
  A.main=RAMP(h,s,22,54);A.sec=RAMP(h,s*0.8,18,42);A.leg=A.sec;
  return A;
}
/* 스프라이트 캐시 */
var SPRC={};
function sprite(key,A,dir,pose){
  var k=key+"|"+dir+"|"+pose,cv=SPRC[k];
  if(cv)return cv;
  cv=document.createElement("canvas");cv.width=SW;cv.height=SH;
  var g=cv.getContext("2d");g.imageSmoothingEnabled=false;
  var ps=POSES[pose]||POSES.i0;
  if(dir===3){g.save();g.translate(SW,0);g.scale(-1,1);}
  if(A.shape==="beast")drawBeast(g,A,dir===3?1:dir,ps);else drawHum(g,A,dir===3?1:dir,ps);
  if(dir===3)g.restore();
  SPRC[k]=cv;return cv;
}


/* ================= 스프라이트시트 렌더러 (Phase 1) =================
   규격: 가로 3프레임(걷기: 왼발-중립-오른발) x 세로 4행(0=아래 1=왼 2=오른 3=위)
        프레임 32x32, 배경 투명 PNG — `소설관련/스프라이트_가이드.md` 규격 준용
   폴백: 이미지 로드 실패 시 기존 코드 드로잉(drawActor)으로 자동 전환 (STOREOK 패턴)

   [Phase 2: assets/ 폴더 분리 예정] 아래 SHEETS[*].src 의 data:URI 를
      "assets/wolf.png" 같은 외부 경로 문자열로 교체하기만 하면 된다.
      로더·폴백·프레임 매핑 로직은 그대로 재사용. 시트 규격이 다른 팩(예: LPC 64x64)은
      SHEET_CFG 의 fw/fh/cols/rows 만 조정하고, 행 순서가 다르면 DIR2ROW 로 흡수한다.
================================================================= */
var SHEET_CFG={fw:32,fh:32,cols:3,rows:4,ax:0.5,ay:0.94};
var SHEETS={
 /* Phase 2: assets/ 폴더 분리 지점 — src 를 "assets/wolf.png" 로 교체 */
 wolf:{src:""   /* 48px 급으로 올리면서 32px 시트는 비활성. Phase 2 에서 규격 맞춘 시트로 교체 */,img:null,ok:false,tried:false}
};
function initSheets(){
 var k;
 for(k in SHEETS)(function(kk){
   var S=SHEETS[kk],im=new Image();
   im.onload=function(){ if(im.naturalWidth>0&&im.naturalHeight>0){S.img=im;S.ok=true;} S.tried=true; };
   im.onerror=function(){ S.ok=false;S.img=null;S.tried=true;
     try{log("["+kk+"] 스프라이트시트 로드 실패 — 기본 그래픽으로 표시합니다.","#ffb27a");}catch(e){} };
   try{ im.src=S.src; }catch(e){ S.ok=false;S.img=null;S.tried=true; }
 })(k);
}
function sheetReady(k){var S=SHEETS[k];return !!(S&&S.ok&&S.img);}
/* 게임 face(0=S,1=W,2=N,3=E) -> 시트 행(0=아래,1=왼,2=오른,3=위) */
var DIR2ROW=[0,1,3,2];
function sheetFrame(e){
 if(T-(e.mv||-9)<0.16){var i=Math.floor(Math.abs(e.anim||0)%4);return [0,1,2,1][i];}
 return 1; /* 정지 = 중립 프레임 */
}
function drawSheetActor(k,e,sx,sy,scale){
 var S=SHEETS[k],C=SHEET_CFG;
 var row=DIR2ROW[e.face||0]||0, col=sheetFrame(e);
 var w=C.fw*scale, h=C.fh*scale;
 ctx.drawImage(S.img, col*C.fw, row*C.fh, C.fw, C.fh,
   Math.round(sx-w*C.ax), Math.round(sy-h*C.ay), Math.round(w), Math.round(h));
}
