/* ================= 갱신 ================= */
var gateHintT=0;
/* ================= R27 선택 중 일시정지 =================
   대표 지시: "카드등 보상 고를때 게임 잠시 멈춰야 할듯 고르다 죽는일 있을거같음. 던전 상점들도 동일하게"
   ★ 게임 시계 T 를 아예 멈춘다 — 몹 공격 예약(m.na), 쿨타임, 버프 만료가 전부 T 기준이므로
     T 를 멈추면 그 순간 전투가 완전히 정지한다(따로 플래그를 뿌릴 필요가 없다).
   ★ 멈출 화면 목록만 여기 둔다. 새 선택 화면을 만들면 id 를 한 줄 추가하면 된다. */
/* R32 — "introov"(컷신 오버레이) 추가. 엔딩은 3부 보스층을 정리한 직후 화면을 덮고 30초쯤 재생되는데,
   그동안 게임 시계가 흐르면 남은 상태이상·버프 만료가 엔딩 뒤로 새고 런 시간에도 잡힌다.
   프롤로그는 started 가 false 인 타이틀에서 재생되므로(update 가 즉시 return) 영향이 없다. */
var PAUSE_IDS = ["frewov", "runshop", "settleov", "markov", "facov", "opt", "meta", "introov"];
function gamePaused(){
  if(typeof document === "undefined") return false;
  var i, el;
  for(i = 0; i < PAUSE_IDS.length; i++){
    el = document.getElementById(PAUSE_IDS[i]);
    if(el && el.style.display === "block") return true;
  }
  return false;
}
function update(dt){
 if(!started)return;
 /* 선택 화면이 떠 있는 동안은 시간이 흐르지 않는다(입자만 살짝 움직여 화면이 죽지 않게) */
 if(gamePaused()){ updParts(dt); return; }
 /* P2 히트스톱 — 게임 시계 T 는 멈추되, 남은 시간은 실시간 dt 로 깎아 반드시 풀리게 한다.
    (T 기준으로 마감 시각을 잡으면 T 가 안 늘어 영구 정지한다 — 05_sound.js 주석 참조) */
 if(hitstopLeft>0){ hitstopLeft-=dt; if(hitstopLeft<0)hitstopLeft=0; return; }
 T+=dt;
 if(deadFlag){updParts(dt);return;}
 var z=world[curZ],i,g;
 autoHuntTick(z,dt);   /* v4: 자동 사냥 (반격 포함) */
 if(P.tgt){
   var m=P.tgt;
   if(m.dead)P.tgt=null;
   else{
     var d=distE(P,m);
     if(d>pRange())moveEnt(P,m.fx,m.fy,pMS(),dt,z);
     else if(T>=P.na)playerAttack(m);
   }
 }else if(P.dest){
   if(P.path&&P.path.length){
     if(moveEnt(P,P.path[0].x,P.path[0].y,pMS(),dt,z))P.path.shift();
     if(P.path&&!P.path.length){P.path=null;}
   }else if(moveEnt(P,P.dest.x,P.dest.y,pMS(),dt,z)){P.dest=null;P.path=null;}
 }
 if(T>portLock)for(i=0;i<z.def.gates.length;i++){
   g=z.def.gates[i];
   if(Math.abs(P.fx-g.x)<.65&&Math.abs(P.fy-g.y)<.65){
     /* 더 깊은 층의 문은 이 층을 전멸시켜야 열린다 */
     if(FLOOR_OF[g.to]&&FLOOR_OF[curZ]&&FLOOR_OF[g.to]>FLOOR_OF[curZ]&&!floorCleared(z)){
       if(T>(gateHintT||0)){gateHintT=T+2;
         log(TX("run.gateLocked",floorLeft(z)),"#ff8a6a");sfx("stun");}
       break;
     }
     travel(g.to,g.tx,g.ty);break;
   }
 }
 var wisR=0.55+P.wis*0.05+eqBonus("mpr");
 P.mp=Math.min(P.mmp,P.mp+dt*wisR*(1+0.25*metaLv("mregen")));
 P.hp=Math.min(P.mhp,P.hp+dt*(0.3+P.con*0.02+buffV("brg"))*(1+0.25*metaLv("hregen"))
   *(1+(typeof revVal==="function"?revSum("hpregen"):0)/100));   /* 계시: 스스로 아무는 살 */
 z.mobs.forEach(function(m){
   if(m.dead){
     /* 던전 층은 런 중 리젠 없음 — 마을 다녀와 재진입(runBegin)해야 되살아난다 (대표 지시) */
     if(FLOOR_OF[curZ])return;
     if(T>=m.rt){m.dead=false;m.hp=m.d.hp;m.fx=m.hx;m.fy=m.hy;m.tgt=null;m.stun=0;m.slow=0;m.prov=false;
     m.tdmg=0;m.pdmg=0;}return;}
   if(T<m.stun)return;
   var dp=distE(m,P),spd=m.d.sp*(m.slow>T?0.55:1);
   var mr=m.d.rng||1.25;
   /* 표적 정리 — 죽었거나, 더 이상 유효하지 않은(불러오기로 교체된 옛 플레이어 등) 대상은 놓는다 */
   if(m.tgt&&m.tgt!==P&&(!m.tgt.npc||m.tgt.dead))m.tgt=null;
   /* ★ R25 — 추격을 놓은 직후에는 다시 달려들지 않는다(m.leash).
      이게 없으면 "표적 해제 → 같은 프레임에 재획득" 이 무한 반복되고, 아래 회복이 그때마다 돌아
      **체력이 줄지 않는 몬스터**가 된다(대표 리포트: "체력 무한? 재생 무한 몬스터가 가끔 생김"). */
   if(!m.tgt&&(m.d.ag||m.prov)&&T>=(m.leash||0)){
     if(dp<6.5)m.tgt=P;
     else m.tgt=mobPickNpc(z,m,6.5);          /* 근처 NPC도 사냥감 */
   }
   if(m.tgt){
     m.cbT=T;                                  /* 전투 중 표식 — 회복은 전투를 벗어난 뒤에만 */
     var tg=m.tgt,dtg=(tg===P)?dp:distE(m,tg);
     var dh=Math.abs(m.fx-m.hx)+Math.abs(m.fy-m.hy);
     /* ================= R25 무한 회복 버그 수리 =================
        옛 코드: if(dh>18||dtg>15){ m.tgt=null; m.hp += m.d.hp*0.05; }
        문제 두 가지가 겹쳐 있었다.
          ① dt 를 곱하지 않았다 — **프레임당** 최대 체력의 5%. 60fps 면 초당 300% 회복이다.
          ② 표적을 놓자마자 바로 위 블록이 다시 표적을 잡는다(플레이어가 6.5칸 안에 있으면).
             그래서 집에서 18칸 넘게 끌고 나온 몬스터는 **매 프레임 5%씩 회복**하며 죽지 않는다.
        수리: 회복을 여기서 하지 않고, "표적 없음 + 전투 이탈 4초" 상태에서 **초당** 4%로 한다.
              추격을 놓으면 3초간 재획득 금지(m.leash) — 붙었다 떨어졌다 하며 회복을 반복하지 못한다. */
     if(dh>18||dtg>15){m.tgt=null;m.prov=false;m.leash=T+3;}
     else if(dtg>mr)moveEnt(m,tg.fx,tg.fy,spd,dt,z);
     else if(T>=m.na){
       if(tg===P){if(!deadFlag)mobAttack(m);}
       else mobAttackNpc(m,tg);
     }
   }else{
     /* 전투를 벗어난 회복 — **초당** 최대 체력의 4%, 전투 이탈 4초 뒤부터.
        "때리다 도망갔다 오면 만피" 를 막으려면 두 조건(표적 없음 + 이탈 시간)이 둘 다 필요하다. */
     if(m.hp<m.d.hp&&T-(m.cbT||0)>4)
       m.hp=Math.min(m.d.hp,m.hp+m.d.hp*0.04*dt);
     if(T>=m.gt){m.gt=T+ri(3,7);
       m.goal={x:clamp(m.hx+ri(-3,3),1,z.def.w-2),y:clamp(m.hy+ri(-3,3),1,z.def.h-2)};}
     if(m.goal&&moveEnt(m,m.goal.x,m.goal.y,spd*.5,dt,z))m.goal=null;
   }
 });
 npcUpdate(dt,z);
 /* 겹침 방지 */
 var alive=z.mobs.filter(function(m){return !m.dead;}),a1,b1,A,B,dx,dy,d2,dd,push;
 if(z.fnpc)z.fnpc.forEach(function(n){if(!n.dead)alive.push(n);});
 for(a1=0;a1<alive.length;a1++){
   A=alive[a1];
   for(b1=a1+1;b1<alive.length;b1++){
     B=alive[b1];dx=B.fx-A.fx;dy=B.fy-A.fy;d2=dx*dx+dy*dy;
     if(d2<=0.0001){B.fx+=0.12;B.fy-=0.06;continue;}
     /* 분리 반경 0.7 -> 0.95 타일. 밀어내는 힘도 강화(/2 -> /1.4)해서 서로 겹쳐 통과하는 느낌을 줄인다. */
     if(d2<0.9025){dd=Math.sqrt(d2);push=(0.95-dd)/1.4;dx/=dd;dy/=dd;
       if(!blocked(z,A.fx-dx*push,A.fy-dy*push)){A.fx-=dx*push;A.fy-=dy*push;}
       if(!blocked(z,B.fx+dx*push,B.fy+dy*push)){B.fx+=dx*push;B.fy+=dy*push;}}
   }
   var px=A.fx-P.fx,py=A.fy-P.fy,pd2=px*px+py*py;
   /* 플레이어 밀어내기도 0.6 -> 0.8 타일. NPC 를 뚫고 지나가는 느낌이 가장 거슬리는 지점이다. */
   if(pd2>0.0001&&pd2<0.64){var pd=Math.sqrt(pd2),pp=(0.8-pd);
     if(!blocked(z,A.fx+px/pd*pp,A.fy+py/pd*pp)){A.fx+=px/pd*pp;A.fy+=py/pd*pp;}}
 }
 dashTick(dt);hazardTick(dt);if(typeof conjTick==="function")conjTick(dt);dotTick();tfTick();updProj(dt);updParts(dt);checkLore();if(typeof featCheck==="function")featCheck();if(typeof auraTick==="function")auraTick();autoPotTick();
 if(STOREOK&&T-lastAuto>90){lastAuto=T;saveSlot(0,true);}
 floaters=floaters.filter(function(f){return T-f.t0<1.1;});
}
function updParts(dt){
 var i,p;
 for(i=parts.length-1;i>=0;i--){p=parts[i];
   if(T-p.t0>p.life){parts.splice(i,1);continue;}
   p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*0.6;}
 /* R18 선 이펙트 수명 — 움직이지 않고 그 자리에서 흐려지다 사라진다 */
 for(i=beams.length-1;i>=0;i--) if(T-beams[i].t0>beams[i].life) beams.splice(i,1);
}
