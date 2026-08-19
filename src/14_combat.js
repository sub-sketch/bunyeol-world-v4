/* ================= 이동 / 전투 ================= */
function travel(to,tx,ty){
 /* R32 — 층을 옮기기 전에 소환수·임시 벽·장판을 거둔다.
    남겨 두면 (가) 이전 층 격자에 벽이 박힌 채 남고 (나) 소환수가 빈 지역에서 계속 돈다. */
 if(typeof conjClearAll==="function")conjClearAll();
 curZ=to;P.zone=to;P.fx=tx;P.fy=ty;P.tgt=null;P.dest=null;portLock=T+1;projs=[];
 sfx("port");
 var ns=ZONES[to].song||"field";
 if(ns!==BGM.song){BGM.song=ns;BGM.step=0;if(AC)BGM.next=AC.currentTime+.3;}
 setMusicZone(ns);
 log("<b>["+ZONES[to].name+"]</b>에 들어섰습니다.","#e8d36e");
 if(WORLD.zoneIntro&&WORLD.zoneIntro[to])log(WORLD.zoneIntro[to],"#a89c86");
 if(P.q)qProgress("zone",to,99);
 refreshLore();
 if(to===5&&!P.bossKilled)log("칠흑 같은 살기가 감돕니다... 데스 나이트가 이곳에 있습니다.","#c07aff");
 tryNpcEvents(to);   /* 습격 / 배신 판정 */
 runOnTravel(to);    /* v4: 층 갱신 / 던전 이탈 시 런 종료 */
 /* R21 — 거점(존 0)에 도착하면 허브 화면을 띄운다(대표 지시: 마을 거점 = 배경 + 우측 레일).
    모듈이 없으면 아무 일도 안 한다 — 허브를 빼도 게임은 예전처럼 돈다. */
 if(typeof hubOnTravel==="function")hubOnTravel(to);
}
function distE(a,b){var dx=a.fx-b.fx,dy=a.fy-b.fy;return Math.sqrt(dx*dx+dy*dy);}
function faceDir(dx,dy){var sx=dx-dy,sy=dx+dy;
 if(Math.abs(sx)>=Math.abs(sy))return sx>0?3:1;return sy>0?0:2;}
/* 클릭 이동 경로찾기 — 방 구조에서 벽에 걸리지 않게 BFS 로 길을 찾는다.
   반환: 타일 중심 웨이포인트 배열(꺾이는 지점만). 못 찾으면 null → 직선 이동 폴백. */
function findPath(z,sx,sy,tx,ty){
 sx=Math.floor(sx);sy=Math.floor(sy);tx=Math.floor(tx);ty=Math.floor(ty);
 if(sx===tx&&sy===ty)return null;
 if(blocked(z,tx,ty))return null;
 var W=z.def.w,H=z.def.h;
 if(tx<0||ty<0||tx>=W||ty>=H)return null;
 var prev={},q=[sy*W+sx],seen={};seen[sy*W+sx]=1;
 var D=[[1,0],[-1,0],[0,1],[0,-1]],found=false,guard=0;
 while(q.length&&guard++<6000){
   var cur=q.shift(),cx=cur%W,cy=(cur-cx)/W;
   if(cx===tx&&cy===ty){found=true;break;}
   for(var i=0;i<4;i++){
     var nx=cx+D[i][0],ny=cy+D[i][1],key=ny*W+nx;
     if(nx<0||ny<0||nx>=W||ny>=H||seen[key])continue;
     seen[key]=1;
     if(blocked(z,nx,ny))continue;
     prev[key]=cur;q.push(key);
   }
 }
 if(!found)return null;
 /* 역추적 → 꺾이는 지점만 남긴다 */
 var path=[],k=ty*W+tx;
 while(k!==undefined&&k!==sy*W+sx){path.push(k);k=prev[k];}
 path.reverse();
 var pts=[],pdx=0,pdy=0;
 for(var j=0;j<path.length;j++){
   var px=path[j]%W,py=(path[j]-px)/W;
   var lx=j===0?sx:path[j-1]%W, ly=j===0?sy:(path[j-1]-(path[j-1]%W))/W;
   var ddx=px-lx,ddy=py-ly;
   if(j>0&&(ddx!==pdx||ddy!==pdy))pts.push({x:lx+0.5,y:ly+0.5});
   pdx=ddx;pdy=ddy;
 }
 pts.push({x:tx+0.5,y:ty+0.5});
 return pts.length?pts:null;
}
function moveEnt(e,tx,ty,sp,dt,z){
 var dx=tx-e.fx,dy=ty-e.fy,d=Math.sqrt(dx*dx+dy*dy);
 if(d<.05)return true;
 e.mv=T;e.face=faceDir(dx,dy);
 e.anim=(e.anim||0)+sp*dt*1.5;
 var vx=dx/d*sp*dt,vy=dy/d*sp*dt;
 if(Math.abs(vx)>Math.abs(dx))vx=dx;
 if(Math.abs(vy)>Math.abs(dy))vy=dy;
 var nx=e.fx+vx,ny=e.fy+vy;
 if(!blocked(z,nx+(vx>0?.3:-.3),e.fy)&&!blocked(z,nx,e.fy))e.fx=nx;
 if(!blocked(z,e.fx,ny+(vy>0?.3:-.3))&&!blocked(z,e.fx,ny))e.fy=ny;
 return false;
}
function spark(x,y,c,n,spd){
 for(var i=0;i<(n||6);i++){var a=Math.random()*6.283,v=(spd||1)*(0.5+Math.random());
   parts.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.5,t0:T,life:0.4+Math.random()*0.3,c:c});}
}
/* R18 선 이펙트 — 연쇄 감전의 줄기(zap)와 관통 광선의 몸통(beamFx).
   투사체(projs)가 아니라 그 자리에서 한 번 번쩍이는 선이다. 수명이 지나면 사라진다. */
function zap(a,b,c){
 if(!a||!b)return;
 /* 굵기 4 · 수명 0.28 — 처음 2/0.22 로 잡았더니 확대 스크린샷에서 경로가 거의 안 보였다.
    연쇄는 "여럿을 타고 흐른다"는 게 스킬의 정체라 경로가 읽혀야 한다. */
 beams.push({x1:a.fx,y1:a.fy,x2:b.fx,y2:b.fy,c:c||"#a8e0ff",t0:T,life:0.28,w:4});
 spark(b.fx,b.fy,c||"#a8e0ff",10,1.8);
}
function beamFx(x1,y1,x2,y2,c){
 beams.push({x1:x1,y1:y1,x2:x2,y2:y2,c:c||"#d8b0ff",t0:T,life:0.30,w:5});
}
function shoot(from,tgt,o){
 projs.push({x:from.fx,y:from.fy,tgt:tgt,dmg:o.dmg,type:o.type||"arrow",c:o.c||"#e2e8f4",
  spd:o.spd||16,aoe:o.aoe||0,t0:T,fromP:!!o.fromP,mag:o.mag,src:o.src||null});
}
function updProj(dt){
 var i,p,tg,dx,dy,d;
 for(i=projs.length-1;i>=0;i--){
   p=projs[i];
   if(!p){projs.splice(i,1);continue;}
   tg=p.tgt;
   if(!tg||(tg.dead&&tg!==P)||T-p.t0>4){projs.splice(i,1);continue;}
   dx=tg.fx-p.x;dy=tg.fy-p.y;d=Math.sqrt(dx*dx+dy*dy);
   if(d<0.42){projImpact(p,tg);projs.splice(i,1);continue;}
   p.x+=dx/d*p.spd*dt;p.y+=dy/d*p.spd*dt;
   p.ang=Math.atan2((dx+dy)*HH2,(dx-dy)*HW2);
   if(p.type==="fire"&&Math.random()<0.5)parts.push({x:p.x,y:p.y,vx:0,vy:-0.3,t0:T,life:0.3,c:"#ff9a30"});
 }
}
function projImpact(p,tg){
 if(p.src&&p.src!==P){npcProjImpact(p,tg);return;}   /* NPC가 쏜 것 */
 if(p.fromP){
   var z=world[curZ];
   if(p.aoe){
     sfx("fire");shake(2.5,.2);spark(p.x,p.y,p.c,18,2.2);
     z.mobs.forEach(function(m){
       if(m.dead)return;
       var dd=Math.sqrt((m.fx-p.x)*(m.fx-p.x)+(m.fy-p.y)*(m.fy-p.y));
       if(dd<=p.aoe)hitMob(m,Math.round(p.dmg*(dd<0.8?1:0.75)),true);});
     (z.fnpc||[]).forEach(function(n){
       if(n.dead||!isFoe(P.fac||"player",n.fac))return;
       var dd=Math.sqrt((n.fx-p.x)*(n.fx-p.x)+(n.fy-p.y)*(n.fy-p.y));
       if(dd<=p.aoe)hitFNpc(n,Math.round(p.dmg*(dd<0.8?1:0.75)),P);});
   }else{ if(!tg.dead){spark(tg.fx,tg.fy,p.c,7,1.4);hitMob(tg,p.dmg,!!p.mag);
     if(p.bleed&&!tg.dead)tg.bleed={t:T+4,next:T+1,dmg:p.bleed};} }
 }else{
   if(deadFlag)return;
   if(playerEvading()){floaters.push({x:P.fx,y:P.fy,t:TX("dash.evade"),c:"#bfe8ff",t0:T});return;}
   var dmg=Math.max(1,p.dmg-Math.floor(pAC()*.5));
   dmg=absorbShield(dmg);
   P.hp-=dmg;sfx("hurt");P.hurtT=T;shake(2.2,.2);runOnHurt(dmg);
   floaters.push({x:P.fx,y:P.fy,t:"-"+dmg,c:"#ff6666",t0:T});
   if(P.hp<=0)playerDie(null);
 }
}
/* 비선공형을 때리면 주변 동족이 함께 달려든다 */
function provokeKin(src){
 var z=world[curZ],r=linkR(src.k),n=0;
 z.mobs.forEach(function(o){
   if(o.dead||o===src||o.k!==src.k||o.prov)return;
   var dx=o.fx-src.fx,dy=o.fy-src.fy;
   if(dx*dx+dy*dy<=r*r){o.prov=true;o.tgt=P;o.gt=0;o.goal=null;n++;
     floaters.push({x:o.fx,y:o.fy-0.6,t:"!",c:"#ff6060",t0:T});}
 });
 if(n>0){log("<b>"+src.d.n+"</b>의 비명에 동족 "+n+"마리가 달려듭니다!","#ff8a6a");sfx("stun");}
 return n;
}
/* 메타: 쉴드 — HP보다 먼저 깎이는 보호막. 남은 피해를 돌려준다. */
function absorbShield(dmg){
 if(!P.shield||P.shield<=0)return dmg;
 var ab=Math.min(P.shield,dmg);
 P.shield-=ab;
 if(ab>0)floaters.push({x:P.fx,y:P.fy-0.7,t:"쉴드 -"+ab,c:"#9fe2ff",t0:T});
 if(P.shield<=0)log("보호막이 깨졌습니다.","#9fe2ff");
 return dmg-ab;
}
/* noStop=true 면 히트스톱을 걸지 않는다 — 오러 권역·출혈처럼 0.5~1초마다 자동으로 도는
   지속 피해는 히트스톱을 걸면 게임이 계속 딸꾹질한다(타격감이 아니라 끊김이 된다). */
function hitMob(m,dmg,noKnock,bySkill,noStop){
 if(m.npc){hitFNpc(m,dmg,P);return;}           /* 대상이 NPC면 NPC 쪽 처리로 */
 /* 메타: 처형 — 빈사(15% 이하) 적에게 +30% */
 if(metaOwned("execute")&&m.hp<=m.d.hp*0.15){
   dmg=Math.round(dmg*1.3);
   floaters.push({x:m.fx,y:m.fy-0.8,t:"처형!",c:"#ff6060",t0:T,big:1});}
 /* 계시: 목을 베는 눈 — HP 30% 이하 적에게 추가 피해. 메타 처형 노드와 합산(각각 따로 곱한다) */
 if(typeof revVal==="function"){
   var rex=revSum("exec");
   if(rex>0&&m.hp<=m.d.hp*0.30){
     dmg=Math.round(dmg*(1+rex/100));
     floaters.push({x:m.fx,y:m.fy-1.0,t:"베는 눈!",c:"#ff9a6a",t0:T,big:1});}}
 /* P2 히트스톱 — 타격 성공 시 짧게 시간을 멈춰 타격감을 준다. 스킬로 그 자리에서
    죽이면(스킬 킬) 더 묵직하게 90ms, 그 외 일반 타격은 60ms. */
 if(!noStop)hitstop((bySkill&&dmg>=m.hp)?0.09:0.06);
 var wasCalm=(!m.d.ag&&!m.prov);
 m.hp-=dmg;m.lh=T;m.knockOk=!noKnock;sfx("hit");
 m.cbT=T;m.leash=0;      /* R25 — 맞으면 전투 상태다: 이탈 회복 시계를 초기화하고 추격 금지도 푼다 */
 m.pdmg=(m.pdmg||0)+dmg;m.tdmg=(m.tdmg||0)+dmg;   /* 기여도 집계 */
 if(!m.prov){m.prov=true;m.goal=null;
   if(wasCalm){floaters.push({x:m.fx,y:m.fy-0.6,t:"격노!",c:"#ff6060",t0:T});provokeKin(m);}}
 if(!m.tgt)m.tgt=P;
 floaters.push({x:m.fx,y:m.fy,t:"-"+dmg,c:"#fff",t0:T});
 /* P2 피격 넉백 강화 — 기존에는 여기서 m.fx/fy를 직접 미세하게 밀었지만(누적되면
    위치가 흔들림), 플레이어 히트리액션과 같은 방식(hitKnock 문법)으로 렌더 시점에
    화면상으로만 3px 밀렸다가 0.1초에 걸쳐 되돌아오도록 바꿨다(19_render.js mobKnock). */
 if(m.hp<=0)killMob(m);
}
function playerAttack(m,mult){
 P.na=T+pAtkMs()/1000;P.atkT=T;P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
 var hitC=clamp(88+(P.lv-m.d.lv)*3+(pDex()-12),40,97);
 var mh=pMaxHit();
 var dmg=Math.round(Math.max(1,ri(mh[0],mh[1])-Math.floor(m.d.ac*.5))*(mult||1));
 var fb=famBonus(m);
 if(fb>0){dmg+=fb;floaters.push({x:m.fx,y:m.fy-0.5,t:"특효 +"+fb,c:"#ffd24a",t0:T,big:1});}
 if(isRanged()){
   sfx(P.cls==="e"?"bow":"cast");
   shoot(P,m,{dmg:(ri(1,100)<=hitC)?dmg:0,type:P.cls==="e"?"arrow":"bolt",
     c:P.cls==="e"?"#e2e8f4":"#a8e0ff",spd:P.cls==="e"?19:15,fromP:1,mag:P.cls==="m"});
   if(ri(1,100)>hitC)floaters.push({x:m.fx,y:m.fy,t:"miss",c:"#888",t0:T});
 }else{
   shake(1.3,.08);
   if(ri(1,100)<=hitC){spark(m.fx,m.fy,"#fff0a0",6,1.3);hitMob(m,dmg);}
   else floaters.push({x:m.fx,y:m.fy,t:"miss",c:"#888",t0:T});
 }
}
function mobAttack(m){
 /* ★ R27 — 보스가 등을 보이는 버그 수리 (대표 리포트: "보스가 방향을 반대로 보고 있음").
    원인: 아래 tryTeleAttack 이 **face 를 세팅하기 전에 return** 했다. 두 보스(무르갓·이름 없는 기사)는
    tele(예고 장판) 공격을 주로 쓰므로, 자리에서 장판만 깔 때는 방향이 갱신되지 않고
    스폰 당시 방향(기본 남쪽)으로 굳었다 — 플레이어가 위/옆에 서면 등을 보인다.
    이제 어느 공격이든 **먼저 플레이어를 본다.** */
 m.face=faceDir(P.fx-m.fx,P.fy-m.fy);
 if(tryTeleAttack(m))return;                 /* 논타겟 장판 — 유도 없이 자리를 때린다 */
 m.na=T+(m.slow>T?2.4:1.5)*(m.d.asp||1);m.atkT=T;
 var hitC=clamp(75+(m.d.lv-P.lv)*3,30,90);
 if(m.d.rng){
   sfx("bow");
   shoot(m,P,{dmg:(ri(1,100)<=hitC)?ri(m.d.d1,m.d.d2):0,type:"arrow",c:"#d8c8a0",spd:14});
   return;
 }
 if(playerEvading()){floaters.push({x:P.fx,y:P.fy,t:TX("dash.evade"),c:"#bfe8ff",t0:T});return;}
 if(ri(1,100)<=hitC){
   var dmg=Math.max(1,ri(m.d.d1,m.d.d2)-Math.floor(pAC()*.6));
   dmg=absorbShield(dmg);
   P.hp-=dmg;sfx("hurt");P.hurtT=T;shake(3,.25);runOnHurt(dmg);
   floaters.push({x:P.fx,y:P.fy,t:"-"+dmg,c:"#ff6666",t0:T});
   if(m.d.steal){var st=Math.round(dmg*m.d.steal);        /* 흡혈 정예 */
     /* ★ R25 — 한 방으로 빨아들이는 양을 최대 체력의 3% 로 묶는다.
        묶지 않으면 강타형 정예(피해가 큰 놈)가 플레이어의 초당 피해량보다 빨리 회복해
        **죽일 수 없는 몬스터**가 된다(무한 체력 리포트의 두 번째 원인). 연출은 그대로 남는다. */
     st=Math.min(st,Math.max(1,Math.round(m.d.hp*0.03)));
     if(st>0){m.hp=Math.min(m.d.hp,m.hp+st);
       floaters.push({x:m.fx,y:m.fy,t:"+"+st,c:"#e05a5a",t0:T});}}
   dotFromMob(m);                       /* 독·출혈 부여 */
   if(typeof revThorn==="function")revThorn(m);   /* 계시: 가시 문신 — 때린 놈에게 반사 */
   if(P.hp<=P.mhp*.2&&P.hp>0)log("체력이 위험합니다!","#ff5555");
   if(P.hp<=0)playerDie(m);
 }else floaters.push({x:P.fx,y:P.fy,t:"miss",c:"#888",t0:T});
}
/* 몬스터가 NPC를 공격 */
function mobAttackNpc(m,n){
 m.na=T+(m.slow>T?2.4:1.5);m.atkT=T;m.face=faceDir(n.fx-m.fx,n.fy-m.fy);
 var hitC=clamp(75+(m.d.lv-n.d.lv)*3,30,90);
 if(m.d.rng){
   sfx("bow");
   shoot(m,n,{dmg:(ri(1,100)<=hitC)?ri(m.d.d1,m.d.d2):0,type:"arrow",c:"#d8c8a0",spd:14,src:m});
   return;
 }
 if(ri(1,100)<=hitC)hitFNpc(n,Math.max(1,ri(m.d.d1,m.d.d2)-Math.floor((n.d.ac||0)*.6)),m);
 else floaters.push({x:n.fx,y:n.fy,t:"miss",c:"#888",t0:T});
}
/* killer 를 넘기지 않으면 플레이어가 잡은 것으로 본다.
   경험치/드랍은 누적 피해량 기준 기여도(share)로 나눈다 — NPC가 막타를 쳐도 손해 없음. */
function killMob(m,killer){
 m.dead=true;m.deathT=T;m.rt=T+(m.d.boss?420:(m.d.mini?240:36));
 if(P.tgt===m)P.tgt=null;
 clearRefsTo(m);
 sfx("die");shake(3.2,.22);       /* P2 — 킬 순간만 화면 흔들림을 키운다(과사용 절제와 대비) */
 var dx0=m.fx,dy0=m.fy;
 spark(dx0,dy0,"#8a8a9a",24,1.6);           /* P2 — 사망 파티클 10→24 */
 setTimeout(function(){spark(dx0,dy0,"#c8c0d0",10,2.1);},50);  /* P2 — 0.05초 뒤 2차 스파크 */
 if(runActive()&&FLOOR_OF[curZ]&&floorCleared(world[curZ]))runOnFloorClear();
 var tot=Math.max(1,m.tdmg||0),share=clamp((m.pdmg||0)/tot,0,1);
 if(killer===undefined||killer===null)share=1;
 if(share<=0.02){
   log("<span style='color:#7a7288'>"+m.d.n+"이(가) 쓰러졌습니다. (내 몫 없음)</span>","#7a7288");
   return;
 }
 P.kills++;runOnKill();
 if(typeof revOnKill==="function")revOnKill();   /* 계시: 승리의 성찬(처치 회복) + 이어지는 참격 */
 if(typeof META!=="undefined")META.tkills=(META.tkills||0)+1;   /* 조건 해금용 누적 처치 */
 /* R17 마물 도감 — 처치해 본 종을 영구 기록한다. 변종(wolf@red 등)도 원종 키로 센다. */
 if(typeof metaMarkDex==="function")metaMarkDex(m.k);
 if(P.hunt)P.hunt.kills++;
 if(share>=0.3)qProgress("kill",m.k,1);
 log(eul(m.d.n)+" 처치했습니다."+(share<0.98?" <span style='color:#8a8068'>(기여 "+Math.round(share*100)+"%)</span>":""),"#bbb");
 gainXp(m.d.xp*MOB_XP_MULT*share);
 m.d.drops.forEach(function(dr){
   if(dr[0]==="adena"){var g=Math.floor(ri(dr[1],dr[2])*GOLD_MULT*share*(1+0.1*metaLv("silver")));
     if(g<=0)return;
     P.gold+=g;runOnGold(g);sfx("gold");
     log(iga(m.d.n)+" 은화 "+g+"개를 떨어뜨렸습니다.","#f5c542");}
   else{ if(!ch(Math.min(.85,dr[3]*DROP_MULT*share*(1+0.1*metaLv("drop")))))return;
     var fop=famRoll(dr[0]);
     addItem(dr[0],ri(dr[1],dr[2]),0,fop);if(P.hunt)P.hunt.drops++;
     log(iga(m.d.n)+" <b>"+(fop?"[대"+FAMN[fop.f]+"] ":"")+ITEMS[dr[0]].n+"</b>"+josa(ITEMS[dr[0]].n,"을","를")+" 떨어뜨렸습니다!",fop?"#ffd24a":"#7fc7ff");}
 });
 /* R32 — 보스 처치 = 즉시 런 종료가 아니다.
    예전엔 여기서 층 클리어 여부와 무관하게 900ms 뒤 runEnd("clear") 를 걸었다. 두 가지가 깨졌다:
      ① 1부·2부에서도 발동해서 갈림길(showActChoice)을 정산창이 덮어버렸다.
      ② 2부 8층·3부 11층은 잡몹까지 잡아야 층이 열리는데(floorNeed=3), 보스만 먼저 잡으면
         runOnFloorClear 가 호출되지 않아 META.clear2/clear3 가 기록되지 않은 채 "클리어" 정산만 떴다.
    이제 런 종료는 runOnFloorClear() 가 "마지막 부의 보스층을 정리했을 때"만 건다(24_run.js).
    이 자리에서는 아무것도 하지 않는다. */
 if(m.d.boss){P.bossKilled=true;shake(5,.5);
   log("★★★ 이름을 잃은 기사가 무너집니다. 문신이 지워진 자리에 흉터만 남았습니다. ★★★","#ffdf00");
   log("문은 아직 닫혀 있습니다. 아직은.","#a89c86");sfx("lvl");}
 else if(m.d.mini)log("★ "+eul(m.d.n)+" 물리쳤습니다!","#ffdf00");
 /* ★ R23 — 보스·중간보스 변신 영구 해금 (대표 지시: "보스를 잡으면 보스도 변신할수있는 해금 제도").
    예전엔 이 줄이 `if(m.d.boss)` 블록 **안**에 있어서 최종 보스(데스 나이트)만 해금됐다 —
    중간보스 무르갓(orcchief)은 잡아도 아무 일이 없었다. 이제 tfkey 가 있는 모든 적이 해금한다.
    변종(orcchief@redhi 등)은 원종 데이터를 복사해 만들므로 tfkey 가 그대로 따라온다 = 같은 형상이 열린다. */
 if(m.d.tfkey&&typeof TFS!=="undefined"&&TFS[m.d.tfkey]&&unlockTf(m.d.tfkey)){
   sfx("ench");
   log("★ 쓰러진 것의 형상이 몸에 새겨졌습니다. <b>"+TFS[m.d.tfkey].n+"</b> 변신이 영구히 해금되었습니다."+
       " <span style='color:#8a8068'>(변신창에서 언제든 · 외형/능력치 선택)</span>","#c07aff");
 }
 refreshInv();
}
function gainXp(x){
 x=Math.floor(x*XP_MULT*(1+buffV("bxp")/100));   /* 학자의 통찰 등 경험치 축복 */
 if(P.hunt&&x>0)P.hunt.xp+=x;
 if(x>0)floaters.push({x:P.fx,y:P.fy-0.5,t:"+"+x+" EXP",c:"#e8d36e",t0:T});
 P.xp+=x;
 var C=CLS[P.cls];
 while(P.lv<52&&P.xp>=need(P.lv)){
   P.xp-=need(P.lv);P.lv++;
   var hpUp=ri(C.hpg[0],C.hpg[1])+Math.floor((P.con-12)/2);
   var mpUp=ri(C.mpg[0],C.mpg[1])+Math.floor((P.wis-9)/3);
   P.mhp+=hpUp;P.hp=Math.min(P.mhp,P.hp+Math.floor(P.mhp*.3));
   P.mmp+=mpUp;P.mp=P.mmp;
   if(P.lv%5===0){if(P.cls==="k")P.str++;else if(P.cls==="e")P.dex++;else P.int++;
     log("주 스탯이 1 올랐습니다.","#ffd27a");}
   if(P.lv%10===0){P.con++;log("체력(CON)이 1 올랐습니다.","#ffd27a");}
   var gPrev=gradeOf(P.lv-1),gNow=gradeOf(P.lv);
   sfx("lvl");spark(P.fx,P.fy,"#ffe97a",14,1.8);
   if(gPrev[1]!==gNow[1]){shake(3,.4);
     log("문신의 색이 짙어집니다 — 이능 등급 <b style='color:"+gNow[2]+"'>"+gNow[1]+"</b> 도달","#ffdf00");}
   log("<b>레벨이 올라갔습니다! (Lv."+P.lv+")</b> HP +"+hpUp+(mpUp?" MP +"+mpUp:""),"#ff9f2a");
   /* R35 수리 — 예전엔 여기서 "새로운 능력 [X]을 습득했습니다!" 를 찍었다.
      R32 에서 레벨 해금을 폐지한 뒤(skKnown = skLv>0, 노드에서 구매) 이 로그는 거짓이 되었다.
      레벨을 올려도 스킬은 열리지 않는데 열렸다고 말해서, 플레이어가 퀵바를 보고 혼란스러워했다.
      classes.json 의 sk.lv 값은 남아 있으나 스킬 습득에는 관여하지 않는다.
      ★ 아래 줄의 변신(TFS) 해금 로그는 13_transform.js 가 P.lv>=t.lv 로 실제 게이트하므로 참이다. 건드리지 말 것. */
   Object.keys(TFS).forEach(function(k){if(TFS[k].lv===P.lv&&!TFS[k].scroll)
     log("변신 ["+TFS[k].n+"]이 해금되었습니다.","#c07aff");});
 }
 refreshChar();
}
function playerDie(m){
 /* 계시: 자비의 유예 — 런당 1회, 불굴과 별개로 각각 1회씩 발동한다(계시가 먼저) */
 if(typeof revMercy==="function"&&runActive()&&revMercy())return;
 /* 메타: 불굴 — 런당 1회, 치명상에서 HP 30%로 버틴다 */
 if(metaOwned("undying")&&runActive()&&RUN&&!RUN.undyingUsed){
   RUN.undyingUsed=1;
   P.hp=Math.max(1,Math.floor(P.mhp*0.3));
   P.evadeT=T+1.0;
   sfx("lvl");shake(4,.4);spark(P.fx,P.fy,"#ffd24a",24,2.4);
   log("★ <b>불굴</b> — 쓰러지지 않았습니다! (이번 런 1회)","#ffd24a");
   floaters.push({x:P.fx,y:P.fy-0.8,t:"불굴!",c:"#ffd24a",t0:T});
   return;
 }
 deadFlag=true;P.hp=0;
 if(P.hunt)P.hunt.deaths++;
 /* v4: 런 중 사망은 경험치를 깎지 않는다. 죽음은 손실이 아니라 다음 런의 재료다.
    (런 밖 사망 — 마을·필드 — 은 기존 규칙 유지) */
 var loss=(!runActive()&&P.lv>=10)?Math.floor(need(P.lv)*.05):0;
 P.xp=Math.max(0,P.xp-loss);P.lostXp=(P.lostXp||0)+loss;
 P.tf=null;P.tfT=0;dotClear();   /* 사망 시 변신·도트 전부 해제 */
 P.buffs={};
 sfx("die");
 log("당신은 "+(m?m.d.n+"에게 ":"")+"사망했습니다..."+(loss?" 경험치 "+loss.toLocaleString()+" 손실":""),"#ff4444");
 document.getElementById("deadmsg").innerHTML=loss?
  ("경험치 "+loss.toLocaleString()+"를 잃었습니다."):
  "10레벨 미만은 경험치를 잃지 않습니다.";
 P.deathT=T;
 /* v4: 런 중 사망은 부활 화면이 아니라 정산 화면으로 간다. */
 if(runActive()){
   var showSet=function(){ if(deadFlag) runEnd("death"); };
   if(pcUseSheet())setTimeout(showSet,PCS.DIE_DUR*1000+40); else showSet();
   return;
 }
 if(pcUseSheet())setTimeout(function(){if(deadFlag)document.getElementById("deadov").style.display="block";},PCS.DIE_DUR*1000+40);
 else document.getElementById("deadov").style.display="block";
}
function respawn(){
 deadFlag=false;document.getElementById("deadov").style.display="none";
 P.deathT=null;
 if(typeof resetCharacterOnDeath==="function")resetCharacterOnDeath();   /* 런 밖 사망도 동일하게 레벨·장비 초기화 */
 else{P.hp=Math.floor(P.mhp*.5);P.mp=P.mmp;}
 travel(0,10,9);log("마을에서 부활했습니다.","#aaa");
}

