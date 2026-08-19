/* ================= 스킬 시전 ================= */
function castSkill(i){
 if(!P||!started||deadFlag)return;
 var sk=mySkills()[i];if(!sk)return;
 if(!skKnown(sk.id)){log(sk.n+"은(는) 영구 성장 상점에서 습득해야 합니다. ("+(sk.cost||100)+"P)","#888");return;}
 sk=skMod(sk);                              /* 강화 단계 반영 */
 if(T<(P.cd[sk.id]||0)){log(sk.n+" 재사용 대기 중입니다.","#888");return;}
 if(P.mp<sk.mp){log("마력이 부족합니다.","#88f");return;}
 var m=P.tgt,z=world[curZ];
 if(["melee","stun","bolt","multi","aoe","knife","chain","beam"].indexOf(sk.type)>=0){
   if(!m||m.dead){log("대상을 먼저 선택하십시오.","#888");return;}
   /* R18: sk.rng 이 있으면 그 사거리를 쓴다. 예전엔 stun 이 무조건 근접(1.6)이라
      "원거리 속박/정지" 같은 계열 스킬을 만들 수 없었다. */
   var rq=sk.rng?sk.rng:((sk.type==="melee"||sk.type==="stun")?1.6:pRange()+0.6);
   if(distE(P,m)>rq){log("대상이 너무 멉니다.","#888");return;}
 }
 P.mp-=sk.mp;P.cd[sk.id]=T+sk.cd;P.atkT=T;
 if(sk.type==="melee"){
   P.face=faceDir(m.fx-P.fx,m.fy-P.fy);sfx("hit");shake(2.0,.16);spark(m.fx,m.fy,"#ffd060",12,2);   /* P2: 일반 타격 흔들림 2.4->2.0 */
   var mh=pMaxHit(),dmg=Math.round(Math.max(1,ri(mh[0],mh[1])-Math.floor(m.d.ac*.5))*sk.mult);
   var fb=famBonus(m);
   if(fb>0){dmg+=fb;floaters.push({x:m.fx,y:m.fy-0.5,t:"특효 +"+fb,c:"#ffd24a",t0:T,big:1});}
   log("<b>"+sk.n+"!</b>","#ffd27a");hitMob(m,dmg,false,true);
 }else if(sk.type==="stun"){
   sfx("stun");
   if(m.d.noStun){log(iga(m.d.n)+" 스턴에 저항했습니다!","#f88");}
   else{m.stun=T+sk.dur;log("<b>"+sk.n+"!</b> "+iga(m.d.n)+" 기절했습니다.","#9fe2ff");
     floaters.push({x:m.fx,y:m.fy,t:"기절!",c:"#ffe97a",t0:T});}
 }else if(sk.type==="buff"){
   sfx("buff");spark(P.fx,P.fy,"#ffe97a",12,1.4);
   var bdur=sk.dur*(1+0.2*metaLv("bdur"));                     /* 메타: 버프 지속 */
   var beff=1+0.15*metaLv("beff");                             /* 메타: 버프 효율 */
   if(sk.bd)P.buffs.bd={v:Math.round(sk.bd*beff),t:T+bdur,n:sk.n};
   if(sk.bac)P.buffs.bac={v:sk.bac,t:T+bdur,n:sk.n};
   if(sk.bhs)P.buffs.bhs={v:1,t:T+bdur,n:sk.n};   /* R18 공격 속도 — pAtkMs 가 buffV("bhs") 를 본다 */
   log("<b>"+sk.n+"</b> 효과가 발동했습니다. ("+Math.round(bdur)+"초)","#ffd27a");
   refreshChar();
 }else if(sk.type==="heal"){
   sfx("heal");spark(P.fx,P.fy,"#9fffc0",12,1.2);
   var h=magDmg(sk);P.hp=Math.min(P.mhp,P.hp+h);
   floaters.push({x:P.fx,y:P.fy,t:"+"+h,c:"#8fd18f",t0:T});
   log("<b>"+sk.n+"</b> — 체력 "+h+" 회복","#8fd18f");
 }else if(sk.type==="bolt"){
   sfx("cast");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   shoot(P,m,{dmg:magDmg(sk),type:"bolt",c:sk.c,spd:17,fromP:1,mag:1});
   log("<b>"+sk.n+"</b>","#9fe2ff");
 }else if(sk.type==="aoe"){
   sfx("cast");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   /* R18 sk.phys — 물리 광역(정령마법사 화살비). 마법 계수(magDmg)가 아니라 무기 공격력으로 굴린다.
      물몸 마법사와 물리 궁수를 같은 aoe 타입으로 쓰면서 피해 출처만 갈라 준다. */
   var ad=sk.phys?(function(){var h=pMaxHit();return Math.round(ri(h[0],h[1])*(sk.mult||1));})():magDmg(sk);
   shoot(P,m,{dmg:ad,type:sk.phys?"arrow":"fire",c:sk.c,spd:sk.phys?18:11,aoe:sk.r,fromP:1,mag:sk.phys?0:1});
   log("<b>"+sk.n+"</b>",sk.phys?"#c8f0ff":"#ff9a4a");
 }else if(sk.type==="multi"){
   sfx("bow");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   var mh2=pMaxHit(),n;
   /* R18 sk.mult — 발수가 적은 고배율 저격을 같은 타입으로 만들 수 있게 한다(기본 1배) */
   var mmul=sk.mult||1;
   for(n=0;n<sk.cnt;n++)(function(n){setTimeout(function(){
     if(!m.dead&&started)shoot(P,m,{dmg:Math.round(ri(mh2[0],mh2[1])*mmul),type:"arrow",c:"#c8f0ff",spd:20,fromP:1});
   },n*110);})(n);
   log("<b>"+sk.n+"</b>","#9fe2ff");
 }else if(sk.type==="cry"){
   sfx("stun");shake(3,.3);spark(P.fx,P.fy,"#ffb060",20,2.4);
   var c=0;
   z.mobs.forEach(function(mm){if(mm.dead)return;
     if(distE(P,mm)<=sk.r){mm.slow=T+sk.dur;mm.na=Math.max(mm.na,T+1.2);c++;}});
   (z.fnpc||[]).forEach(function(nn){
     if(nn.dead||!isFoe(P.fac||"player",nn.fac))return;
     if(distE(P,nn)<=sk.r){nn.slow=T+sk.dur;nn.na=Math.max(nn.na,T+1.2);c++;}});
   log("<b>"+sk.n+"!</b> 주변 "+c+"마리가 위축되었습니다.","#ffd27a");
 }else if(sk.type==="spin"){
   /* 회전 베기 — 논타겟 광역. 주위 전부 벤다 */
   sfx("hit");shake(2.6,.2);spark(P.fx,P.fy,"#ffd060",22,2.4);
   var mh3=pMaxHit(),c2=0;
   z.mobs.forEach(function(mm){if(mm.dead)return;
     if(distE(P,mm)<=sk.r){
       var dg=Math.round(Math.max(1,ri(mh3[0],mh3[1])-Math.floor(mm.d.ac*.5))*sk.mult);
       var fb2=famBonus(mm);if(fb2>0)dg+=fb2;
       hitMob(mm,dg,false,true);c2++;}});
   (z.fnpc||[]).forEach(function(nn){if(nn.dead||!isFoe(P.fac||"player",nn.fac))return;
     if(distE(P,nn)<=sk.r){var mh4=pMaxHit();hitFNpc(nn,Math.round(ri(mh4[0],mh4[1])*sk.mult),P);c2++;}});
   log("<b>"+sk.n+"!</b> "+c2+"마리를 베었습니다.","#ffd27a");
 }else if(sk.type==="push"){
   /* 방패 밀치기 — 주위 적 넉백, 벽 충돌 시 추가 피해 */
   sfx("stun");shake(3,.25);spark(P.fx,P.fy,"#9fe2ff",18,2);
   var mh5=pMaxHit(),c3=0;
   z.mobs.forEach(function(mm){if(mm.dead)return;
     if(distE(P,mm)>sk.r)return;
     var vx=mm.fx-P.fx,vy=mm.fy-P.fy,vd=Math.sqrt(vx*vx+vy*vy)||1;
     vx/=vd;vy/=vd;
     var moved=0,step=0.25,total=sk.dist,crash=false;
     while(moved<total){
       var nx2=mm.fx+vx*step,ny2=mm.fy+vy*step;
       if(blocked(z,nx2,ny2)){crash=true;break;}
       mm.fx=nx2;mm.fy=ny2;moved+=step;}
     var dg2=Math.round(Math.max(1,ri(mh5[0],mh5[1])-Math.floor(mm.d.ac*.5))*sk.mult);
     if(crash){dg2=Math.round(dg2*1.5);
       floaters.push({x:mm.fx,y:mm.fy-0.7,t:"충돌!",c:"#9fe2ff",t0:T});}
     mm.na=Math.max(mm.na||0,T+0.8);
     hitMob(mm,dg2,true,true);c3++;});
   log("<b>"+sk.n+"!</b> "+c3+"마리를 밀쳐냈습니다.","#9fe2ff");
 }else if(sk.type==="knife"){
   /* 투척 단검 — 원거리 + 출혈 */
   sfx("bow");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   var mh6=pMaxHit();
   shoot(P,m,{dmg:Math.round(ri(mh6[0],mh6[1])*sk.mult),type:"arrow",c:"#d0d8e0",spd:19,fromP:1,bleed:sk.bleed});
   log("<b>"+sk.n+"</b>","#c8d0e0");
 }else if(sk.type==="chain"){
   /* R18 연쇄 감전 — 대상을 때린 뒤 가장 가까운 다른 적으로 옮겨 붙는다.
      "장거리 다수"의 핵심기. 옮길 때마다 sk.fall(감쇠)만큼 약해져 무한 연쇄가 되지 않는다.
      ★ 같은 적을 두 번 때리지 않도록 hit 집합으로 막는다 — 안 막으면 두 적 사이를 왕복한다. */
   sfx("cast");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   var foes=z.mobs.filter(function(mm){return !mm.dead;});
   var cur=m,hit=[],dmgC=magDmg(sk),jumps=sk.cnt||3,ji;
   for(ji=0;ji<jumps;ji++){
     if(!cur)break;
     hit.push(cur);
     var dv=Math.max(1,Math.round(dmgC*Math.pow(sk.fall||0.78,ji)));
     var prev=ji===0?{fx:P.fx,fy:P.fy}:hit[ji-1];
     zap(prev,cur,sk.c);                     /* 번개 줄기 연출 */
     hitMob(cur,dv,true,true,ji>0);          /* 2번째 이후는 히트스톱 없음 — 연타 정지 방지 */
     var best=null,bd2=1e9;
     foes.forEach(function(mm){
       if(mm.dead||hit.indexOf(mm)>=0)return;
       var d2=distE(cur,mm);
       if(d2<=(sk.jump||3.2)&&d2<bd2){bd2=d2;best=mm;}
     });
     cur=best;
   }
   log("<b>"+sk.n+"</b> — "+hit.length+"마리를 타고 흘렀습니다.","#a8e0ff");
 }else if(sk.type==="beam"){
   /* R18 관통 광선 — 대상 방향 직선상의 모든 적을 관통한다. 쿨이 길고 배율이 높은 일격기.
      "일격 제거 가능하나 물몸" 설계의 제거 담당. 뭉친 줄을 한 번에 지운다. */
   sfx("cast");P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
   var bx=m.fx-P.fx,by=m.fy-P.fy,bl=Math.sqrt(bx*bx+by*by)||1;
   bx/=bl;by/=bl;
   var reach=sk.rng||6.5,wide=sk.w||0.9,dmgB=magDmg(sk),cB=0;
   z.mobs.forEach(function(mm){
     if(mm.dead)return;
     var rx=mm.fx-P.fx,ry=mm.fy-P.fy;
     var along=rx*bx+ry*by;                  /* 광선 진행 방향 거리 */
     if(along<0||along>reach)return;
     var off=Math.abs(rx*by-ry*bx);          /* 광선 중심선에서의 이탈 거리 */
     if(off>wide)return;
     hitMob(mm,dmgB,true,true,cB>0);         /* 첫 한 마리만 히트스톱 */
     spark(mm.fx,mm.fy,sk.c||"#d8b0ff",10,1.8);cB++;
   });
   beamFx(P.fx,P.fy,P.fx+bx*reach,P.fy+by*reach,sk.c||"#d8b0ff");
   shake(2.4,.18);
   log("<b>"+sk.n+"</b> — "+cB+"마리를 관통했습니다.","#d8b0ff");
 }else if(sk.type==="summon"){
   /* R32 소환 — 필드 NPC(진영 player)를 임시로 세운다. 대상 지정이 필요 없다. */
   sfx("buff");spark(P.fx,P.fy,"#9fe2ff",18,2);
   var made=sumSpawn(sk.key,sk.cnt||1,sk.dur||10);
   if(made)log("<b>"+sk.n+"</b> — "+made+"체가 곁에 섰습니다. ("+Math.round((sk.dur||10)+sumLifeBonus())+"초)","#9fe2ff");
   else log(sk.n+" 시전에 실패했습니다.","#888");
 }else if(sk.type==="wall"){
   /* R32 임시 장애물 — 바라보는 쪽 앞에 직각으로 세운다. 카이팅의 핵심 도구. */
   sfx("ench");
   var life=(sk.dur||8)+conjLifeBonus();
   var put=conjWall(sk.kind||"thorn",sk.len||3,life,P.fx,P.fy,P.face||0);
   if(put)log("<b>"+sk.n+"</b> — "+put+"칸을 막았습니다. ("+Math.round(life)+"초)","#8fd18f");
   else log("세울 자리가 없습니다.","#888");
 }else if(sk.type==="field"){
   /* R32 장판 — 대상이 있으면 그 자리, 없으면 바라보는 쪽 2칸 앞에 깐다. */
   sfx("cast");
   var fx2,fy2;
   if(m&&!m.dead){fx2=m.fx;fy2=m.fy;P.face=faceDir(m.fx-P.fx,m.fy-P.fy);}
   else{var FF=[[0,1],[-1,0],[0,-1],[1,0]][P.face||0];fx2=P.fx+FF[0]*2;fy2=P.fy+FF[1]*2;}
   pfieldAdd(fx2,fy2,sk.r||2.2,sk.dur||8,sk.tick||12,sk.c);
   spark(fx2,fy2,sk.c||"#ff8a30",16,2);
   log("<b>"+sk.n+"</b> — 바닥이 타오릅니다. ("+Math.round(sk.dur||8)+"초)","#ff9a4a");
 }else if(sk.type==="blink"){
   /* R32 순간이동 — 바라보는(또는 대상) 방향으로 최대 dist 칸. 벽을 통과하지 않는다:
      끝점부터 0.25칸씩 물러나며 처음으로 빈 칸을 찾는다. 벽 안에 박히는 사고를 원천 차단. */
   var bdx,bdy;
   if(m&&!m.dead){bdx=m.fx-P.fx;bdy=m.fy-P.fy;}
   else if(P.dest){bdx=P.dest.x-P.fx;bdy=P.dest.y-P.fy;}
   else{var BF=[[0,1],[-1,0],[0,-1],[1,0]][P.face||0];bdx=BF[0];bdy=BF[1];}
   var bl2=Math.sqrt(bdx*bdx+bdy*bdy)||1;bdx/=bl2;bdy/=bl2;
   var far=sk.dist||5,step2=0.25,ok=null,dd;
   for(dd=far;dd>=1;dd-=step2){
     var tx2=P.fx+bdx*dd,ty2=P.fy+bdy*dd;
     if(!blocked(z,tx2,ty2)){ok={x:tx2,y:ty2};break;}
   }
   if(!ok){log("이동할 자리가 없습니다.","#888");P.mp+=sk.mp;P.cd[sk.id]=0;refreshQuick();return;}
   sfx("cast");spark(P.fx,P.fy,"#c9a6ff",16,2);
   P.fx=ok.x;P.fy=ok.y;P.dest=null;P.mv=T;P.evadeT=T+0.22;      /* 도착 순간 짧은 무적 — 회피기답게 */
   spark(P.fx,P.fy,"#d8b0ff",18,2.2);
   P.face=faceDir(bdx,bdy);
   log("<b>"+sk.n+"</b> — "+dd.toFixed(1)+"칸 이동","#c9a6ff");
 }else if(sk.type==="bstep"){
   /* R32 후퇴 사격 — 표적(없으면 바라보는 쪽) 반대편으로 물러나며 화살을 쏜다.
      대시와 같은 방식으로 순간 이동하되, 벽에 막히면 갈 수 있는 만큼만 간다. */
   var ax,ay;
   if(m&&!m.dead){ax=P.fx-m.fx;ay=P.fy-m.fy;}
   else{var AF=[[0,1],[-1,0],[0,-1],[1,0]][P.face||0];ax=-AF[0];ay=-AF[1];}
   var al2=Math.sqrt(ax*ax+ay*ay)||1;ax/=al2;ay/=al2;
   var moved2=0,st2=0.25,goal=sk.dist||3;
   while(moved2<goal){
     var nx3=P.fx+ax*st2,ny3=P.fy+ay*st2;
     if(blocked(z,nx3,P.fy)&&blocked(z,P.fx,ny3))break;
     if(!blocked(z,nx3,P.fy))P.fx=nx3;
     if(!blocked(z,P.fx,ny3))P.fy=ny3;
     moved2+=st2;
   }
   P.dest=null;P.mv=T;P.evadeT=T+0.24;
   sfx("bow");spark(P.fx,P.fy,"#bfe8ff",10,1.6);
   if(m&&!m.dead){
     P.face=faceDir(m.fx-P.fx,m.fy-P.fy);
     var mh7=pMaxHit(),n7,mul7=sk.mult||1;
     for(n7=0;n7<(sk.cnt||2);n7++)(function(n7){setTimeout(function(){
       if(!m.dead&&started)shoot(P,m,{dmg:Math.round(ri(mh7[0],mh7[1])*mul7),type:"arrow",c:"#c8f0ff",spd:20,fromP:1});
     },n7*100);})(n7);
   }
   log("<b>"+sk.n+"</b> — "+moved2.toFixed(1)+"칸 물러나며 사격","#bfe8ff");
 }else if(sk.type==="aura"){
   /* 오러 권역 — 따라다니는 범위 장판. 파고드는 플레이를 보상한다 */
   sfx("buff");spark(P.fx,P.fy,"#7fe2c9",24,2.2);
   P.aura={t:T+sk.dur,r:sk.r,dmg:sk.tick,next:T};
   log("<b>"+sk.n+"</b> — "+sk.dur+"초간 몸 주위가 빛납니다. 파고드십시오.","#7fe2c9");
 }
 refreshQuick();
}

/* ---------- R36 : Q·W·E·R 슬롯 시전 ----------
   대표 지시 2026-08-19: "스킬셋 넣는 것 qwer 만 넣을 수 있게 하고 (-)로 밑에 계속 추가로 붙는 건 없애줘".

   예전 구조의 문제: castSkill(i) 의 i 는 mySkills() 배열 인덱스였다. 그런데 퀵바는 습득한 스킬을
   전부 그렸고 단축키(P.bind.sk)는 4칸뿐이라, 5개째부터 라벨이 「—」로 뜨고 키로는 쓸 수 없는
   버튼이 아래로 계속 붙었다.
   이제 실사용은 P.aslot 네 칸이 전부다. 슬롯 번호(0~3) -> 스킬 id -> mySkills() 인덱스로 넘긴다.
   castSkill() 자체는 그대로 둔다 — 자동 사냥(18b_autohunt)이 인덱스로 부르고 있다. */
function castSlot(i){
 if(!P||!started||deadFlag)return;
 var id=(P.aslot&&P.aslot[i])||null;
 if(!id){
   log("["+(["Q","W","E","R"][i]||"?")+"] 칸이 비어 있습니다 — [V] 스킬 화면에서 등록하십시오.","#888");
   return;
 }
 var list=mySkills(),j;
 for(j=0;j<list.length;j++)if(list[j].id===id){castSkill(j);return;}
 log("등록된 스킬을 찾을 수 없습니다 — 계열이 바뀌었을 수 있습니다.","#f88");
}

/* ---------- 오러 권역 틱 + 몹 출혈 (update 루프가 부른다) ---------- */
function auraTick(){
 if(!P)return;
 var z=world[curZ];
 if(P.aura&&T<P.aura.t){
   if(T>=P.aura.next){
     P.aura.next=T+0.5;
     z.mobs.forEach(function(mm){if(mm.dead)return;
       if(distE(P,mm)<=P.aura.r){
         hitMob(mm,P.aura.dmg,true,false,true);mm.slow=Math.max(mm.slow||0,T+0.8);}});   /* 지속 피해 — 히트스톱 없음 */
     spark(P.fx,P.fy,"#7fe2c9",4,1.1);
   }
 }else if(P.aura&&T>=P.aura.t)P.aura=null;
 /* 몹 출혈 도트 */
 z.mobs.forEach(function(mm){
   if(mm.dead||!mm.bleed)return;
   if(T>=mm.bleed.t){mm.bleed=null;return;}
   if(T>=mm.bleed.next){mm.bleed.next=T+1;
     hitMob(mm,mm.bleed.dmg,true,false,true);   /* 지속 피해 — 히트스톱 없음 */
     floaters.push({x:mm.fx,y:mm.fy-0.4,t:"출혈",c:"#ff8a8a",t0:T});}
 });
}
function auraDraw(){
 if(!P||!P.aura||T>=P.aura.t)return;
 var sc=toScreen(P.fx,P.fy);
 var k=0.5+0.25*Math.sin(T*5);
 ctx.save();
 ctx.strokeStyle="rgba(127,226,201,"+(0.35+0.25*k)+")";
 ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(sc.x,sc.y+4,P.aura.r*HW2,P.aura.r*HH2,0,0,6.283);ctx.stroke();
 ctx.fillStyle="rgba(127,226,201,"+(0.05+0.04*k)+")";
 ctx.beginPath();ctx.ellipse(sc.x,sc.y+4,P.aura.r*HW2,P.aura.r*HH2,0,0,6.283);ctx.fill();
 ctx.restore();
}
