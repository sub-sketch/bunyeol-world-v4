/* ================= 렌더 ================= */
var cv=document.getElementById("game"),ctx=cv.getContext("2d");
ctx.imageSmoothingEnabled=false;
var lcv=document.createElement("canvas");lcv.width=VW;lcv.height=VH;
var lctx=lcv.getContext("2d");
function camOff(){return {ox:VW/2-(P.fx-P.fy)*HW2, oy:VH*0.52-(P.fx+P.fy)*HH2};}
/* ===== R28b 바닥 깔개 배치 규칙 (한 곳에 모아 둔다 — 그리기와 검증이 같은 판정을 본다) =====
   반환: 그 칸에 깔 종류 이름, 없으면 null.
     · 벽 칸에는 깔지 않는다.
     · 문 칸에도 깔지 않는다 — 문 표시(▶ 라벨·마름모)가 묻히면 길을 잃는다.
     · 자리는 좌표 해시라 층마다 항상 같은 자리다(시드 고정과 같은 성질). */
function fdecAt(z,x,y){
 var FD=z.def.fdec;
 if(!FD||!FD.length)return null;
 if(x<0||y<0||x>=z.def.w||y>=z.def.h)return null;
 if(z.g[y][x])return null;
 var gs=z.def.gates||[],i;
 for(i=0;i<gs.length;i++)if(gs[i].x===x&&gs[i].y===y)return null;
 var p=(typeof z.def.fdecp==="number")?z.def.fdecp:0.18;
 var hv=hsh(x*7+3,y*13+5);                    /* 타일 무늬와 다른 씨앗 */
 if(hv>=p)return null;
 var tot=0;for(i=0;i<FD.length;i++)tot+=(FD[i][1]||0);
 var pick=(hv/p)*tot,acc=0;
 for(i=0;i<FD.length;i++){acc+=(FD[i][1]||0);if(pick<acc)return FD[i][0];}
 return FD[FD.length-1][0];
}
function toScreen(fx,fy){var c=camOff();return {x:(fx-fy)*HW2+c.ox, y:(fx+fy)*HH2+c.oy};}
function otext(t,x,y,c,f){ctx.font=f||"8px Gulim";ctx.textAlign="center";ctx.lineWidth=2;
 ctx.strokeStyle="rgba(0,0,0,.85)";ctx.strokeText(t,x,y);ctx.fillStyle=c;ctx.fillText(t,x,y);}
function poseOf(e,isP){
 if(T-e.atkT<0.42){var el=T-e.atkT;return el<0.12?"a0":(el<0.28?"a1":"a2");}
 if(T-e.mv<0.16){var f=Math.floor((e.anim||0)%4);return ["w0","w1","w2","w3"][f];}
 return (Math.floor(T*2.2+(e.ph||0))%2)?"i1":"i0";
}
function drawActor(key,A,e,sx,sy,isP){
 var sp=sprite(key,A,e.face||0,poseOf(e,isP));
 ctx.drawImage(sp,sx-FX,sy-FY);
}
function drawShadowAt(x,y,w){ctx.fillStyle="rgba(0,0,0,.45)";ctx.beginPath();
 ctx.ellipse(x,y,w,w*0.45,0,0,6.2832);ctx.fill();}
/* 그림자 반지름 — 예전엔 `6.5*ACT.sz` 고정 상수였다. 아트를 전면 교체하면서 스프라이트는
   커졌는데 이 상수는 그대로여서 29종 중 25종이 실제 발 너비보다 좁은 그림자를 달고 있었고
   (고블린 31%·곰 41%), 발보다 작은 그림자 위에 서 있으니 캐릭터가 떠 보였다(대표님 리포트).
   이제 data/footprint.json 의 실측 접지 폭에서 산출한다. 값이 없으면 옛 계산식으로 폴백. */
function shadowR(name, spriteScale, fallback){
 var fw = (typeof FOOTPRINT!=="undefined" && name) ? FOOTPRINT[name] : 0;
 if(!fw) return fallback;
 return fw * 0.5 * (spriteScale||1) * 1.12;   /* 발보다 약간 넓게 — 접지가 자연스러워 보인다 */
}
/* 타겟 지정 표시 — 발밑에 얇은 흰 고리를 두른다(그림자와 같은 기준점, sz에 맞춰 자동으로 커짐).
   스프라이트 실제 가로/세로 픽셀은 시트마다 달라 몸통을 사각형으로 감싸면 캐릭터를 덮어버리는
   문제가 있어(사용자 확인), 몸에 겹치지 않는 발밑 링 방식으로 바꿨다. */
function drawTargetRing(x,footY,sz){
 var s=sz||1,rw=9.5*s,rh=rw*0.48;
 ctx.save();ctx.strokeStyle="#fff";ctx.lineWidth=1.4;
 ctx.shadowColor="rgba(0,0,0,.75)";ctx.shadowBlur=3;
 ctx.beginPath();ctx.ellipse(x,footY+1,rw,rh,0,0,6.2832);ctx.stroke();
 ctx.restore();
}
function render(){
 ctx.fillStyle="#05050a";ctx.fillRect(0,0,VW,VH);
 if(!started||!P)return;
 ctx.save();
 /* 화면 흔들림. 히트스톱 중에는 T 가 멈춰 감쇠 계수 kk 가 최대치로 고정되는데, 여기서 매 프레임
    난수를 새로 뽑으면 "최대 진폭으로 계속 떠는" 그림이 된다(진동 과다 리포트의 원인).
    히트스톱 동안에는 직전 오프셋을 그대로 유지해 진짜 정지 화면처럼 보이게 한다. */
 if(OPT.shake&&T<shakeT&&shakeM>0){
   if(!(typeof hitstopActive==="function"&&hitstopActive())){
     var kk=(shakeT-T)/shakeD;
     render.sox=(Math.random()-.5)*2*shakeM*kk;
     render.soy=(Math.random()-.5)*2*shakeM*kk;
   }
   ctx.translate(render.sox||0,render.soy||0);
 }else{render.sox=0;render.soy=0;}
 var z=world[curZ],c=camOff(),th=z.def.theme;
 var isDun=th.indexOf("dun")===0;
 /* ================= R19f 지형 표현을 데이터로 뺀다 =================
    대표 지시: "거점 마을도 약간 이런식으로 베이스 설정" (= 던전처럼 떠 있는 석판 구조).
    예전엔 석판 렌더·조명이 **테마 이름이 dun 으로 시작하는가** 로만 결정됐다.
    그래서 마을이나 동대륙에 같은 표현을 주려면 코드를 고쳐야 했다. 이제 THEME 이 정한다:
      slab : true 면 벽 칸을 검은 공백으로 두고 바닥 판에 테두리를 그린다(던전 표현).
      dark : 0~1 조명 어둡기. 0(또는 미지정+비던전)이면 조명 오버레이 없음.
    지정하지 않으면 예전과 완전히 같다 — 기존 6테마는 값이 없으므로 아래 폴백을 탄다. */
 var TH1=(typeof THEME!=="undefined"&&THEME[th])?THEME[th]:null;
 var slab=(z.def.slab!==undefined)?!!z.def.slab
          :((TH1&&TH1.slab!==undefined)?!!TH1.slab:isDun);
 var darkV=(TH1&&TH1.dark!==undefined)?TH1.dark
           :(isDun?(th==="dun"?0.66:(th==="dun2"?0.76:0.84)):0);
 var x,y,sx,sy,i;
 for(y=0;y<z.def.h;y++)for(x=0;x<z.def.w;x++){
   sx=(x-y)*HW2+c.ox;sy=(x+y)*HH2+c.oy;
   if(sx<-40||sx>VW+40||sy<-30||sy>VH+32)continue;
   if(z.g[y][x]&&slab)continue;
   var v=Math.floor(hsh(x,y)*6);
   ctx.drawImage(tileSprite(th,v),sx-17,sy-1);
 }
 /* ================= R19e 던전 = 떠 있는 석판 (대표님 참고 이미지) =================
    지시: "가로벽 / 세로벽 / 십자벽으로 만들어서 벽이 두껍지 않게 시인성을 올려야 할 것 같다"
          + 참고 이미지("이런 느낌이면 좋겠는데. 좀 넓어져도")
    → 벽 칸에 **아무것도 세우지 않는다**(검은 공백). 대신 바닥 판의 경계에
      ① 얇은 밝은 테두리선 ② 앞면(우하·좌하) 두께 띠 를 그려 판이 떠 있는 것처럼 보이게 한다.
    시야를 막는 오브젝트가 사라지므로 방·통로 모양이 한눈에 읽히고, 뒤에 선 몹도 가려지지 않는다.
    ★ 판 경계선은 **두 번째 패스**로 그린다. 첫 패스에서 타일마다 바로 그리면 다음 줄 타일이
      두께 띠를 덮어 선이 끊긴다(같은 화면 깊이에 겹쳐 그려지기 때문). */
 if(slab){
   var ba=TH1?TH1.a:[262,8,22];
   var eRim =hsl(ba[0],Math.max(0,ba[1]-8),Math.min(96,ba[2]+40));   /* 갓돌 하이라이트 */
   var eSideR=hsl(ba[0],ba[1],Math.max(3,ba[2]*0.58));               /* 우하 측면 */
   var eSideL=hsl(ba[0],ba[1],Math.max(2,ba[2]*0.36));               /* 좌하 측면(더 어둡게) */
   var W0=z.def.w,H0=z.def.h,G0=z.g;
   var isWall=function(xx,yy){return xx<0||yy<0||xx>=W0||yy>=H0||G0[yy][xx]!==0;};
   var LIP=Math.max(4,Math.round(5*(typeof PXS!=="undefined"?PXS:1)/1.6));
   ctx.lineWidth=1.4;
   for(y=0;y<H0;y++)for(x=0;x<W0;x++){
     if(G0[y][x])continue;
     sx=(x-y)*HW2+c.ox;sy=(x+y)*HH2+c.oy;
     if(sx<-40||sx>VW+40||sy<-30||sy>VH+40)continue;
     var tX=sx,tY=sy, rX=sx+16,rY=sy+8, bX=sx,bY=sy+16, lX=sx-16,lY=sy+8;
     if(isWall(x+1,y)){                       /* 우하 면 — 판의 두께 */
       ctx.fillStyle=eSideR;ctx.beginPath();
       ctx.moveTo(rX,rY);ctx.lineTo(bX,bY);ctx.lineTo(bX,bY+LIP);ctx.lineTo(rX,rY+LIP);
       ctx.closePath();ctx.fill();
     }
     if(isWall(x,y+1)){                       /* 좌하 면 */
       ctx.fillStyle=eSideL;ctx.beginPath();
       ctx.moveTo(bX,bY);ctx.lineTo(lX,lY);ctx.lineTo(lX,lY+LIP);ctx.lineTo(bX,bY+LIP);
       ctx.closePath();ctx.fill();
     }
     ctx.strokeStyle=eRim;ctx.beginPath();
     if(isWall(x-1,y)){ctx.moveTo(lX+0.5,lY+0.5);ctx.lineTo(tX+0.5,tY+0.5);}
     if(isWall(x,y-1)){ctx.moveTo(tX+0.5,tY+0.5);ctx.lineTo(rX+0.5,rY+0.5);}
     if(isWall(x+1,y)){ctx.moveTo(rX+0.5,rY+0.5);ctx.lineTo(bX+0.5,bY+0.5);}
     if(isWall(x,y+1)){ctx.moveTo(bX+0.5,bY+0.5);ctx.lineTo(lX+0.5,lY+0.5);}
     ctx.stroke();
   }
 }
 /* 깔개 배치 규칙은 함수 하나로 모아 둔다 — 그리기와 검증이 같은 판정을 보게 하려고.
    (아래 주석의 규칙 설명 참고. 반환값 = 깔 종류 이름 또는 null) */
 /* ===================== R28b 바닥 깔개(fdec) — 지역 분위기를 바닥으로 =====================
    대표 지시(원문): "마경은 검은 늪이나 해골 부스러기 시체 이런걸로 바닥에 깔면 될 것 같음."
    ★ 오브젝트(obs)가 아니라 **바닥 그림**이다 — 막지 않는다(걸림 0). 존 데이터 한 줄로 붙는다:
        "fdec": [["bog",0.5],["skullbits",0.3],["corpse",0.2]],  "fdecp": 0.22
      fdecp = 걸을 수 있는 칸 중 몇 할에 깔지(기본 0.18). 자리는 좌표 해시라 층마다 고정된다.
    벽 칸·문 칸에는 깔지 않는다(문 표시가 묻히면 길을 잃는다). */
 if(z.def.fdec&&z.def.fdec.length){
   for(y=0;y<z.def.h;y++)for(x=0;x<z.def.w;x++){
     var kind=fdecAt(z,x,y);
     if(!kind)continue;
     sx=(x-y)*HW2+c.ox;sy=(x+y)*HH2+c.oy;
     if(sx<-40||sx>VW+40||sy<-30||sy>VH+40)continue;
     ctx.drawImage(decalSprite(kind,Math.floor(hsh(x*11+1,y*5+9)*3)),sx-17,sy-3);
   }
 }
 z.def.gates.forEach(function(g){
   var s=toScreen(g.x,g.y),gl=.5+.5*Math.sin(T*4),k;
   var lock=FLOOR_OF[g.to]&&FLOOR_OF[curZ]&&FLOOR_OF[g.to]>FLOOR_OF[curZ]&&!floorCleared(z);
   if(lock){                                       /* 잠긴 문 — 붉게, 조용히 */
     ctx.fillStyle="rgba("+Math.floor(150+40*gl)+",60,50,.38)";
     ctx.beginPath();ctx.moveTo(s.x,s.y-6);ctx.lineTo(s.x+15,s.y+2);ctx.lineTo(s.x,s.y+10);ctx.lineTo(s.x-15,s.y+2);
     ctx.closePath();ctx.fill();
     otext("🔒 "+g.label,s.x,s.y-14,"#ff8a6a");
     return;
   }
   ctx.fillStyle="rgba("+Math.floor(90+80*gl)+","+Math.floor(150+70*gl)+",255,.42)";
   ctx.beginPath();ctx.moveTo(s.x,s.y-6);ctx.lineTo(s.x+15,s.y+2);ctx.lineTo(s.x,s.y+10);ctx.lineTo(s.x-15,s.y+2);
   ctx.closePath();ctx.fill();
   for(k=0;k<4;k++){var an=T*2.2+k*1.57;
     ctx.fillStyle="rgba(190,235,255,"+(0.45+0.4*Math.sin(an*2))+")";
     ctx.fillRect(s.x+Math.cos(an)*10-1,s.y+Math.sin(an)*5-6-((T*8+k*4)%14),2,2);}
   otext("▶ "+g.label,s.x,s.y-14,"#9fe2ff");
 });
 /* 이동 클릭 마커 — 클릭한 지점에서 링이 퍼지고, 도착하면 P.dest 가 null 이 되어 자동으로 사라진다.
    P.dest.t0 는 21_input.js 에서 클릭 시각으로 채운다. */
 if(P.dest){
   var ds=toScreen(P.dest.x,P.dest.y), age=T-(P.dest.t0||T);
   ctx.save();
   var rings=[0,0.28];
   for(var ri2=0;ri2<rings.length;ri2++){
     var ph=((age-rings[ri2])%0.72)/0.72;
     if(ph<0)continue;
     var rr=(3+ph*11)*PXS, al=(1-ph)*0.85;
     ctx.strokeStyle="rgba(150,225,255,"+al.toFixed(3)+")";
     ctx.lineWidth=Math.max(1,Math.round(1.4*PXS));
     ctx.beginPath();ctx.ellipse(ds.x,ds.y+Math.round(3*PXS),rr,rr*0.5,0,0,6.283);ctx.stroke();
   }
   ctx.fillStyle="rgba(180,235,255,.9)";
   ctx.fillRect(ds.x-Math.round(PXS),ds.y+Math.round(2*PXS),Math.round(2*PXS),Math.round(2*PXS));
   ctx.restore();
 }
 hazardDraw();          /* 논타겟 장판 — 바닥에 그린다 */
 if(typeof featDraw==="function")featDraw();   /* 상인·제단·상자 표식 */
 if(typeof pfieldDraw==="function")pfieldDraw();  /* R32 플레이어 장판 */
 if(typeof auraDraw==="function")auraDraw();   /* 오러 권역 */
 var list=[],torches=[];
 z.obs.forEach(function(o){
   var s=toScreen(o.x,o.y);
   if(s.x<-50||s.x>VW+60||s.y<-60||s.y>VH+62)return;
   /* wallx(교차/모서리) 타일 중 v===2 인 것만 횃불을 단다 — 예전 torchpillar가 맡던
      길찾기 랜드마크 + 던전 조명(아래 lctx destination-out 홀) 역할을 그대로 이어받는다. */
   /* 횃불 자리는 06_world.js 가 o.torch 로 표시해 둔다(벽 종류와 무관하게 6칸 간격).
      예전엔 "wallx && v===2" 였는데, 방을 넓히자 모서리가 사라진 층에서 횃불이 0개가 됐다. */
   if(o.torch)torches.push({x:s.x+5*PXS,y:s.y-14*PXS});
   /* ★ R19e — 던전에서는 벽판을 아예 세우지 않는다(위 석판 테두리가 벽 역할을 한다).
      횃불 자리만 남겨 조명·랜드마크를 유지하되, 큰 판 대신 **벽걸이 등만** 그린다. */
   var dunWall=slab&&o.k.indexOf("wall")===0;
   if(dunWall&&!o.torch)return;
   list.push({z:o.x+o.y,f:function(){
     if(dunWall){                                  /* 벽걸이 횃불 — 판 없이 등만 */
       var pw=Math.max(2,Math.round(3*PXS/1.6));
       ctx.fillStyle="rgba(30,24,40,.9)";
       ctx.fillRect(s.x+4*PXS-1,s.y-14*PXS,pw,Math.round(9*PXS/1.6));
     }else{
       var _o=objSprite(o.k,o.v);
       ctx.drawImage(_o,s.x-_o.width/2,s.y+8-_o.height+Math.round(4*PXS));
     }
     if(o.torch){
       var fl=Math.sin(T*9+o.x)*1.2;
       ctx.fillStyle="#ff9820";ctx.beginPath();
       ctx.ellipse(s.x+5*PXS,s.y-16*PXS+fl*.4,2,3.2+Math.abs(fl),0,0,6.2832);ctx.fill();
       ctx.fillStyle="#ffe080";ctx.fillRect(s.x+4*PXS,s.y-17*PXS,2,2);
     }}});
 });
 z.def.npcs.forEach(function(n){
   var s=toScreen(n.x,n.y);
   list.push({z:n.x+n.y,f:function(){
     var tsn="npc_"+n.id;
     drawShadowAt(s.x,s.y+8,shadowR(mobSheetReady(tsn)?tsn:null,PXS/1.6,6));                     /* 공장 시트가 있으면 우선 사용 */
     if(mobSheetReady(tsn))drawMobSheet(tsn,{face:0,atkT:-9,mv:-9,anim:0,ph:n.x},s.x,s.y+8,PXS/1.6);
     else drawActor("npc_"+n.kind,ACT[n.act],{face:0,atkT:-9,mv:-9,ph:n.x},s.x,s.y+8);
     otext(n.n,s.x,s.y-24,"#fff");
     otext("【"+n.title+"】",s.x,s.y-16,"#7fdfff");
     var qq=npcQuest(n.id),bo=Math.sin(T*4)*1.6;
     if(qq[1]==="give")otext("!",s.x,s.y-32+bo,"#ffd24a","bold 13px Gulim");
     else if(qq[1]==="done")otext("?",s.x,s.y-32+bo,"#ffd24a","bold 13px Gulim");
     else if(qq[1]==="prog")otext("?",s.x,s.y-32+bo,"#8a8068","bold 13px Gulim");}});
 });
 z.mobs.forEach(function(m){
   /* P2 사망 연출 — 죽는 순간 바로 지우지 않고 사망 애니메이션(DIE_DUR)이 끝날 때까지
      계속 그린다. mobFrame()이 e.dead+e.deathT를 보고 사망 시트로 전환한다. */
   if(m.dead&&(!m.deathT||T-m.deathT>=MSH.DIE_DUR))return;
   var s=toScreen(m.fx,m.fy);
   if(s.x<-50||s.x>VW+60||s.y<-60||s.y>VH+62)return;
   list.push({z:m.fx+m.fy,f:function(){
     var d=m.d,A=ACT[d.act],sz=A.sz||1;
     if(d.boss){ctx.fillStyle="rgba(200,0,0,"+(0.14+0.09*Math.sin(T*3))+")";
       ctx.beginPath();ctx.ellipse(s.x,s.y+8,16,7,0,0,6.2832);ctx.fill();}
     var msn0=mobSheetName(m);
     drawShadowAt(s.x,s.y+8,shadowR(msn0,(d.sz||1)*PXS/1.6,6.5*sz));
     /* P2 피격 넉백 강화 — 랜덤 지터 대신 플레이어 반대방향으로 3px 밀렸다가
        0.1초에 걸쳐 되돌아오는 방향성 있는 넉백(hitKnock과 같은 문법, mobKnock). */
     var jx=0,jy=0;
     if(m.knockOk!==false&&T-m.lh<0.1){var mk=mobKnock(m);jx=mk.x;jy=mk.y;}
     var msn=msn0;
     if(msn&&mobSheetReady(msn))drawMobSheet(msn,m,s.x+jx,s.y+8+jy,(d.sz||1)*PXS/1.6);
     else if(sheetReady(d.act))drawSheetActor(d.act,m,s.x+jx,s.y+8+jy,(d.sz||A.sz||1)*PXS);
     else drawActor(d.act,A,m,s.x+jx,s.y+8+jy);
     if(d.boss||d.mini||P.tgt===m||T-m.lh<4){
       /* 이름표 색 = 성향. 붉은 계열 = 선공형 / 초록 = 비선공형 / 주황 = 격노한 비선공형 */
       var nmC = d.boss?"#ff6060" : (d.mini?"#ffb060"
                 : (d.ag?"#ff9a9a" : (m.prov?"#ff8a6a":"#9fe0a0")));
       var tag = d.ag?"" : (m.prov?" 격노":(P.tgt===m?" · 비선공":""));
       otext(d.n+" Lv"+d.lv+tag,s.x,s.y-22*PXS*sz-6,nmC);
       ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(s.x-13,s.y-21*PXS*sz-2,26,5);
       ctx.fillStyle="#4a0808";ctx.fillRect(s.x-12,s.y-21*PXS*sz-1,24,3);
       ctx.fillStyle=d.boss?"#ff3020":"#e22";ctx.fillRect(s.x-12,s.y-21*PXS*sz-1,24*clamp(m.hp/d.hp,0,1),3);
     }
     if(T<m.stun)otext("★ ★",s.x,s.y-27*PXS*sz,"#ffe97a");
     if(m.slow>T)otext("▼",s.x+11,s.y-16*PXS*sz,"#ffb060");
     if(P.tgt===m)drawTargetRing(s.x,s.y+8,d.sz||A.sz||1);
   }});
 });
 /* 필드 NPC */
 (z.fnpc||[]).forEach(function(n){
   if(n.dead)return;
   var s=toScreen(n.fx,n.fy);
   if(s.x<-50||s.x>VW+60||s.y<-60||s.y>VH+62)return;
   list.push({z:n.fx+n.fy,f:function(){
     var A=ACT[n.d.act]||ACT.npc_guard,sz=A.sz||1,hostile=isFoe(P.fac||"player",n.fac);
     if(n.d.elite){ctx.fillStyle="rgba(200,60,0,"+(0.12+0.08*Math.sin(T*3))+")";
       ctx.beginPath();ctx.ellipse(s.x,s.y+8,14,6,0,0,6.2832);ctx.fill();}
     var nsn0=mobSheetName(n);
     drawShadowAt(s.x,s.y+8,shadowR(nsn0,(n.d.sz||1)*PXS/1.6,6.4*sz));
     var jx=0,jy=0;
     if(T-n.lh<0.1){jx=(Math.random()-.5)*2.6;jy=(Math.random()-.5)*2.6;}
     var nsn=nsn0;
     if(nsn&&mobSheetReady(nsn))drawMobSheet(nsn,n,s.x+jx,s.y+8+jy,(n.d.sz||1)*PXS/1.6);
     else drawActor(n.d.act,A,n,s.x+jx,s.y+8+jy);
     var fc=facColor(n.fac);
     otext(n.d.n+" Lv"+n.d.lv,s.x,s.y-22*PXS*sz-6,fc);
     if(!hostile)otext("〈"+facName(n.fac)+"〉",s.x,s.y-22*PXS*sz-14,"rgba(160,160,180,.75)");
     if(n.hp<n.mhp||hostile){
       ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(s.x-13,s.y-21*PXS*sz-2,26,5);
       ctx.fillStyle="#0a2a12";ctx.fillRect(s.x-12,s.y-21*PXS*sz-1,24,3);
       ctx.fillStyle=hostile?"#e22":"#4ac06a";ctx.fillRect(s.x-12,s.y-21*PXS*sz-1,24*clamp(n.hp/n.mhp,0,1),3);
     }
     if(n.betrayAt)otext("…",s.x+11,s.y-16*PXS*sz,"rgba(255,90,90,"+(0.3+0.3*Math.sin(T*6))+")");
     if(P.tgt===n)drawTargetRing(s.x,s.y+8,n.d.sz||A.sz||1);
   }});
 });
 list.push({z:P.fx+P.fy,f:function(){
   var s=toScreen(P.fx,P.fy),A=actorOf(),sz=A.sz||1;
   /* R18b: 그림자 폭도 계열마다 다른 시트를 따라간다 — 예전엔 "knight" 고정이라
      다른 계열 시트를 써도 기사 발 너비(19)로 그려졌다. FOOTPRINT 에 세 시트 실측값이 다 있다. */
   drawShadowAt(s.x,s.y+8,shadowR(pcUseSheet()?pcSheetFootName():null,1,6.2*sz));
   /* Phase 1 — 기사 본체는 스프라이트 시트. 실패 시 기존 코드 드로잉으로 폴백.
      R23 — **외형까지 바꾼 변신**은 그 마수의 몹 시트로 그린다(옛 절차 픽셀 드로잉 폐지).
      노란 테두리 띠는 tfRimFrame 이 굽는다 — 원색 유지 + 실루엣 1px 만 노랗다. */
   var tfDrawn=false;
   if(typeof tfSkinOn==="function"&&tfSkinOn()&&typeof drawTfSheet==="function"&&TFS[P.tf])
     tfDrawn=drawTfSheet(TFS[P.tf].act,P,s.x,s.y+8,(A.sz||1)*PXS/1.6);
   if(!tfDrawn&&!(pcUseSheet()&&drawKnightSheet(P,s.x,s.y+8)))
     drawActor(P.tf?("tf_"+P.tf):("pc_"+P.cls),A,P,s.x,s.y+8,1);
   /* 계시 — 문신 2개마다 계열색 미세 발광 + 새김 순간 발광 링 */
   if(typeof revGlow==="function")revGlow(s.x,s.y+8);
   if(typeof revDraw==="function")revDraw();
   /* 스프라이트가 48px 로 커졌으므로 이름표를 실제 프레임 높이 위로 올린다 */
   var pt0=pcTopOffset(), nameY=pt0?(s.y+8-pt0-5):(s.y-24*PXS*sz), icoY=pt0?(s.y+8-pt0+10):(s.y-14);
   otext(P.name,s.x,nameY,"#aef0ae");
   if(P.buffs.bac&&T<P.buffs.bac.t){ctx.strokeStyle="rgba(140,220,255,.5)";ctx.lineWidth=1;
     ctx.beginPath();ctx.ellipse(s.x,s.y+8,13,6,0,0,6.2832);ctx.stroke();}
   if(P.buffs.bd&&T<P.buffs.bd.t)otext("↑",s.x-15,icoY,"#ff9a4a");
   if(T<P.braveT)otext("↯",s.x+15,icoY,"#ffd27a");
 }});
 var lk;
 for(lk in LORE){(function(lk){
   var l=LORE[lk];
   if(l.z!==curZ||P.lore[lk])return;
   var s2=toScreen(l.x,l.y);
   if(s2.x<-40||s2.x>VW+40)return;
   list.push({z:l.x+l.y,f:function(){
     var bo=Math.sin(T*2.6+l.x)*1.6, gl=0.5+0.5*Math.sin(T*3.4+l.y);
     ctx.fillStyle="rgba(120,200,255,"+(0.10+0.10*gl)+")";
     ctx.beginPath();ctx.ellipse(s2.x,s2.y+7,11,5,0,0,6.2832);ctx.fill();
     var bk=RAMP(42,26,44,76), bd=RAMP(28,34,20,44);
     pt(ctx,s2.x-5,s2.y-4+bo,10,6,bd);
     pt(ctx,s2.x-4,s2.y-6+bo,8,3,bk);
     ctx.fillStyle="rgba(200,235,255,"+(0.45+0.45*gl)+")";
     ctx.fillRect(s2.x-1,s2.y-9+bo,2,2);
     ctx.fillRect(s2.x-4+((T*8)%8),s2.y-12+bo,1,1);
     otext("기록물",s2.x,s2.y-16+bo,"rgba(159,226,255,"+(0.5+0.4*gl)+")");
   }});})(lk);}
 list.sort(function(a,b){return a.z-b.z;});
 for(i=0;i<list.length;i++)list[i].f();
 /* 투사체 */
 projs.forEach(function(p){
   var s=toScreen(p.x,p.y);
   if(p.type==="arrow"){
     ctx.save();ctx.translate(s.x,s.y-6);ctx.rotate(p.ang||0);
     ctx.fillStyle="#c9b088";ctx.fillRect(-6,0,11,1);
     ctx.fillStyle="#e2e8f4";ctx.fillRect(5,-1,3,3);
     ctx.fillStyle="#c0403c";ctx.fillRect(-7,-1,2,3);
     ctx.restore();
   }else{
     var r=p.type==="fire"?5:3.4;
     ctx.fillStyle=p.c;ctx.globalAlpha=.35;
     ctx.beginPath();ctx.arc(s.x,s.y-6,r*2,0,6.2832);ctx.fill();
     ctx.globalAlpha=1;ctx.beginPath();ctx.arc(s.x,s.y-6,r,0,6.2832);ctx.fill();
     ctx.fillStyle="#fff";ctx.fillRect(s.x-1,s.y-7,2,2);
   }
 });
 /* R18 선 이펙트 — 연쇄 감전 줄기 / 관통 광선.
    문양과 같은 방식으로 두 번 긋는다: 굵고 옅게(후광) → 가늘고 밝게(심지). */
 beams.forEach(function(b){
   var s1=toScreen(b.x1,b.y1),s2=toScreen(b.x2,b.y2);
   var a=clamp(1-(T-b.t0)/b.life,0,1);
   ctx.save();ctx.lineCap="round";
   ctx.globalAlpha=a*0.35;ctx.strokeStyle=b.c;ctx.lineWidth=b.w;
   ctx.beginPath();ctx.moveTo(s1.x,s1.y-7);ctx.lineTo(s2.x,s2.y-7);ctx.stroke();
   ctx.globalAlpha=a*0.95;ctx.lineWidth=Math.max(1,b.w*0.4);
   ctx.beginPath();ctx.moveTo(s1.x,s1.y-7);ctx.lineTo(s2.x,s2.y-7);ctx.stroke();
   ctx.restore();ctx.globalAlpha=1;
 });
 /* 파티클 */
 parts.forEach(function(p){
   var s=toScreen(p.x,p.y),a=1-(T-p.t0)/p.life;
   ctx.globalAlpha=clamp(a,0,1);ctx.fillStyle=p.c;
   ctx.fillRect(Math.round(s.x),Math.round(s.y-7),2,2);ctx.globalAlpha=1;
 });
 /* 데미지 텍스트 */
 if(OPT.dmgnum)floaters.forEach(function(f){
   var s=toScreen(f.x,f.y),age=T-f.t0;
   ctx.globalAlpha=Math.max(0,1-age*.85);
   /* P2 — 처형/특효 등 강조 판정은 1.4배로 팝했다가 0.15초에 걸쳐 원래 크기로 줄어든다 */
   var fsz=9;
   if(f.big){var pk=Math.max(0,1-age/0.15);fsz=Math.round(9*(1+0.4*pk));}
   ctx.font="bold "+fsz+"px Gulim";ctx.textAlign="center";
   ctx.lineWidth=2;ctx.strokeStyle="rgba(0,0,0,.85)";
   ctx.strokeText(f.t,s.x,s.y-20-age*18);
   ctx.fillStyle=f.c;ctx.fillText(f.t,s.x,s.y-20-age*18);
   ctx.globalAlpha=1;
 });
 /* 조명 */
 if(darkV>0){
   var dark=darkV;
   lctx.globalCompositeOperation="source-over";
   lctx.clearRect(0,0,VW,VH);
   lctx.fillStyle="rgba(0,0,0,"+dark+")";lctx.fillRect(0,0,VW,VH);
   lctx.globalCompositeOperation="destination-out";
   var ps=toScreen(P.fx,P.fy);
   /* 광원 소모품(횃불/등불) 버프가 걸려 있으면 시야 반경이 커진다. buffV("blit") = 추가 반경 px */
   var lr=88+(typeof buffV==="function"?buffV("blit"):0);
   var g1=lctx.createRadialGradient(ps.x,ps.y-8,10,ps.x,ps.y-8,lr);
   g1.addColorStop(0,"rgba(0,0,0,1)");g1.addColorStop(1,"rgba(0,0,0,0)");
   lctx.fillStyle=g1;lctx.fillRect(ps.x-lr-2,ps.y-lr-10,lr*2+4,lr*2+4);
   torches.forEach(function(t){
     var r=32+Math.sin(T*8+t.x)*3;
     var g2=lctx.createRadialGradient(t.x,t.y,2,t.x,t.y,r);
     g2.addColorStop(0,"rgba(0,0,0,.95)");g2.addColorStop(1,"rgba(0,0,0,0)");
     lctx.fillStyle=g2;lctx.fillRect(t.x-r,t.y-r,r*2,r*2);});
   ctx.drawImage(lcv,0,0);
   ctx.globalCompositeOperation="lighter";
   torches.forEach(function(t){
     var g3=ctx.createRadialGradient(t.x,t.y,1,t.x,t.y,24);
     g3.addColorStop(0,"rgba(255,140,30,.18)");g3.addColorStop(1,"rgba(0,0,0,0)");
     ctx.fillStyle=g3;ctx.fillRect(t.x-24,t.y-24,48,48);});
   ctx.globalCompositeOperation="source-over";
 }else{
   var R=Math.max(VW,VH),CX=VW/2,CY=VH/2;
   var vg=ctx.createRadialGradient(CX,CY,R*0.23,CX,CY,R*0.57);
   vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.34)");
   ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);
 }
 if(P.hurtT&&T-P.hurtT<.3){
   var ha=.3*(1-(T-P.hurtT)/.3);
   var rg=ctx.createRadialGradient(VW/2,VH/2,Math.max(VW,VH)*0.19,VW/2,VH/2,Math.max(VW,VH)*0.58);
   rg.addColorStop(0,"rgba(255,0,0,0)");rg.addColorStop(1,"rgba(255,0,0,"+ha+")");
   ctx.fillStyle=rg;ctx.fillRect(0,0,VW,VH);
 }
 ctx.restore();
 ctx.fillStyle="rgba(0,0,0,.5)";ctx.fillRect(0,0,VW,13);
 otext("[ "+z.def.name+" ]",62,10,"#e8d36e","9px Gulim");
}
