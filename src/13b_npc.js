/* ================= 필드 NPC / 진영 시스템 =================
   데이터: data/npcs.json (FACTION / HOSTILE / FNPC / NSPAWN / AMBUSH)

   설계 요지
   - NPC는 몬스터와 같은 형태의 액터다. d(=템플릿), fx/fy, hp, tgt ... 전부 동일 규약.
     그래서 playerAttack / shoot / moveEnt 같은 기존 함수를 그대로 쓸 수 있다.
   - 적대 판정은 오직 fac(진영) 값 하나로 결정된다  →  isFoe(a,b)
     추후 세력전은 코드를 고칠 필요 없이 setWar("guard","cult",true) 한 줄이면 된다.
   - 보스/중간보스(m.d.boss / m.d.mini)는 NPC가 건드리지 않는다. 보스는 플레이어 몫.
   - 보스층(지역 5)에는 NSPAWN 항목도 없고 습격도 발생하지 않는다.
   ========================================================= */

/* ---------- 액터 외형 ---------- */
function buildNpcACT(){
ACT.npc_guard={shape:"hum",sz:1.02,main:RAMP(214,26,26,56),sec:RAMP(214,20,20,42),leg:RAMP(214,18,22,46),
 skin:RAMP(28,42,54,82),metal:RAMP(210,12,42,80),accent:RAMP(214,34,24,50),helm:2,pauld:1,belt:"#8a6d2b",
 wep:"sword",shield:1,shieldR:RAMP(214,30,24,52),boot:RAMP(28,34,16,34),visor:"#14151d",grip:"#c9a227"};
ACT.npc_merc={shape:"hum",sz:1.05,main:RAMP(28,34,24,50),sec:RAMP(24,28,18,38),leg:RAMP(24,26,20,42),
 skin:RAMP(28,42,52,80),metal:RAMP(34,26,32,60),accent:RAMP(14,44,22,44),helm:1,hat:RAMP(26,28,18,38),
 pauld:1,wep:"axe",belt:"#7a5a28",boot:RAMP(24,32,14,30),hair:RAMP(20,26,16,32)};
ACT.npc_hunter={shape:"hum",sz:0.99,main:RAMP(128,28,24,52),sec:RAMP(110,22,18,40),leg:RAMP(110,20,20,42),
 skin:RAMP(30,44,54,82),metal:RAMP(34,34,28,56),accent:RAMP(120,30,22,46),helm:0,hair:RAMP(38,40,26,50),
 ears:0,wep:"bow",belt:"#7a6a3a",boot:RAMP(28,34,16,32)};
ACT.npc_mage={shape:"hum",sz:0.98,main:RAMP(196,34,22,50),sec:RAMP(196,26,16,38),leg:RAMP(196,22,14,34),
 skin:RAMP(28,40,54,82),metal:RAMP(44,44,38,70),accent:RAMP(196,40,24,52),helm:5,hat:RAMP(196,32,16,40),
 robe:1,wep:"staff",orb:RAMP(180,70,40,80),wood:RAMP(28,40,20,48),belt:"#c9a227",star:"#bfe9ff",
 hair:RAMP(40,16,42,70)};
ACT.npc_bandit={shape:"hum",sz:1.04,main:RAMP(4,30,18,40),sec:RAMP(20,26,14,32),leg:RAMP(20,22,14,32),
 skin:RAMP(28,40,48,76),metal:RAMP(20,20,28,52),accent:RAMP(0,52,18,38),helm:1,hat:RAMP(0,34,12,28),
 wep:"sword",belt:"#6b3a24",boot:RAMP(20,30,12,26),eyes:"#2a1010",hair:RAMP(14,24,10,24)};
ACT.npc_cult={shape:"hum",sz:1.03,main:RAMP(280,34,14,36),sec:RAMP(280,26,10,26),leg:RAMP(280,22,10,26),
 skin:RAMP(284,12,42,68),metal:RAMP(280,20,24,50),accent:RAMP(292,50,20,44),helm:5,hat:RAMP(280,32,12,32),
 robe:1,cape:1,wep:"staff",orb:RAMP(292,64,32,66),wood:RAMP(280,20,14,32),eyeGlow:"#c07aff",star:"#e0b0ff"};
/* 마을 서비스 NPC */
ACT.npc_portal={shape:"hum",sz:1,main:RAMP(196,40,22,50),sec:RAMP(196,30,16,38),skin:RAMP(28,40,54,82),
 metal:RAMP(190,44,40,76),accent:RAMP(186,52,32,64),helm:5,hat:RAMP(196,36,18,42),robe:1,wep:"staff",
 orb:RAMP(186,74,44,86),wood:RAMP(30,36,22,50),belt:"#7fdfff",star:"#bfe9ff",hair:RAMP(40,18,40,68)};
ACT.npc_bless={shape:"hum",sz:0.99,main:RAMP(52,30,58,88),sec:RAMP(52,20,46,74),skin:RAMP(28,42,56,84),
 metal:RAMP(48,52,46,82),accent:RAMP(44,56,44,78),helm:3,hat:RAMP(52,26,52,82),robe:1,wep:null,
 hair:RAMP(44,34,40,70),belt:"#c9a227"};
}
ACT_EXT.push(buildNpcACT); buildNpcACT();

/* ---------- 진영 ---------- */
var HOST={},WARLOG=[];
(function(){var k;for(k in HOSTILE)HOST[k]=HOSTILE[k].slice();})();
function isFoe(a,b){
 if(!a||!b||a===b)return false;
 var l=HOST[a];return !!(l&&l.indexOf(b)>=0);
}
/* 추후 세력전 스위치. 양방향으로 적대/화해를 켜고 끈다. 데이터 수정 불필요. */
function setWar(a,b,on){
 function ed(x,y){var l=HOST[x]||(HOST[x]=[]),i=l.indexOf(y);
   if(on&&i<0)l.push(y);if(!on&&i>=0)l.splice(i,1);}
 ed(a,b);ed(b,a);
 WARLOG.push([a,b,!!on]);
 if(started)log("【세력 관계 변동】 "+facName(a)+" ↔ "+facName(b)+" : "+(on?"적대":"화해"),"#c07aff");
 /* 이미 잡고 있던 대상이 더 이상 적이 아니면 놓아준다 */
 world.forEach(function(z){if(!z||!z.fnpc)return;
   z.fnpc.forEach(function(n){if(n.tgt&&!npcHates(n,n.tgt))n.tgt=null;});});
}
function facName(f){return (FACTION[f]&&FACTION[f].n)||f;}
function facColor(f){return (FACTION[f]&&FACTION[f].c)||"#ddd";}
function facOf(e){return e===P?(P.fac||"player"):(e.npc?e.fac:"monster");}
function npcHates(n,e){return !e.dead&&isFoe(n.fac,facOf(e));}

/* ---------- 생성 ---------- */
function mkNpc(key,x,y,opt){
 var d=FNPC[key];if(!d)return null;
 var n={k:key,d:d,npc:1,fac:d.fac,fac0:d.fac,
  fx:x,fy:y,hx:x,hy:y,hp:d.hp,mhp:d.hp,dead:false,rt:0,tgt:null,na:0,stun:0,slow:0,
  goal:null,gt:0,lh:-99,face:0,anim:0,mv:-9,atkT:-9,ph:Math.random()*6,
  tdmg:0,pdmg:0,temp:!!(opt&&opt.temp),sayT:0};
 if(opt&&opt.fac){n.fac=opt.fac;n.fac0=opt.fac;}
 return n;
}
function spawnFieldNpcs(zi,def,g){
 var out=[],list=NSPAWN[String(zi)];
 if(!list)return out;                       /* 지역 5(보스층) 등은 목록 자체가 없다 */
 list.forEach(function(s){
   var key=s[0],cnt=s[1],cx=s[2],cy=s[3],r=s[4],i;
   for(i=0;i<cnt;i++){
     var tx,ty,tries=0;
     do{tx=clamp(cx+ri(-r,r),1,def.w-2);ty=clamp(cy+ri(-r,r),1,def.h-2);tries++;}while(g[ty][tx]&&tries<40);
     g[ty][tx]=0;
     var n=mkNpc(key,tx,ty);
     if(n)out.push(n);
   }});
 return out;
}
function freeSpotNear(z,cx,cy,r){
 var i,tx,ty;
 for(i=0;i<60;i++){
   tx=clamp(Math.round(cx+ri(-r,r)),1,z.def.w-2);
   ty=clamp(Math.round(cy+ri(-r,r)),1,z.def.h-2);
   if(!blocked(z,tx,ty))return {x:tx,y:ty};
 }
 return {x:clamp(Math.round(cx),1,z.def.w-2),y:clamp(Math.round(cy),1,z.def.h-2)};
}

/* ---------- 전투 ---------- */
function npcRange(n){return n.d.rng?n.d.rng:1.3;}
function npcAttack(n,tg){
 n.na=T+(n.d.atk||1.5);n.atkT=T;n.face=faceDir(tg.fx-n.fx,tg.fy-n.fy);
 var tlv=(tg===P)?P.lv:tg.d.lv;
 var hitC=clamp(80+(n.d.lv-tlv)*3,35,95);
 var dmg=(ri(1,100)<=hitC)?ri(n.d.d1,n.d.d2):0;
 if(n.d.rng){
   sfx(n.d.mag?"cast":"bow");
   shoot(n,tg,{dmg:dmg,type:n.d.mag?"bolt":"arrow",c:n.d.mag?"#c8a8ff":"#d8c8a0",
     spd:n.d.mag?15:18,src:n});
   return;
 }
 if(!dmg){floaters.push({x:tg.fx,y:tg.fy,t:"miss",c:"#888",t0:T});return;}
 npcDeal(n,tg,dmg);
}
/* NPC가 대상에게 실제로 피해를 준다 */
function npcDeal(n,tg,dmg){
 if(tg===P){
   if(deadFlag)return;
   var d2=Math.max(1,dmg-Math.floor(pAC()*.6));
   P.hp-=d2;sfx("hurt");P.hurtT=T;shake(3,.25);
   floaters.push({x:P.fx,y:P.fy,t:"-"+d2,c:"#ff6666",t0:T});
   if(P.hp<=0)playerDie(n);
   return;
 }
 if(tg.npc){hitFNpc(tg,Math.max(1,dmg-Math.floor((tg.d.ac||0)*.5)),n);return;}
 npcHitMob(tg,Math.max(1,dmg-Math.floor((tg.d.ac||0)*.5)),n);
}
/* NPC → 몬스터 피해. 플레이어 기여도(pdmg)는 건드리지 않는다. */
function npcHitMob(m,dmg,src){
 if(m.dead)return;
 m.hp-=dmg;m.lh=T;m.tdmg=(m.tdmg||0)+dmg;
 if(!m.prov){m.prov=true;m.goal=null;}
 if(!m.tgt)m.tgt=src;
 floaters.push({x:m.fx,y:m.fy,t:"-"+dmg,c:"#cfd8e0",t0:T});
 if(m.hp<=0)killMob(m,src);
}
/* 누군가가 NPC를 때렸다 */
function hitFNpc(n,dmg,src){
 if(n.dead)return;
 n.hp-=dmg;n.lh=T;sfx("hit");
 n.tdmg=(n.tdmg||0)+dmg;
 if(src===P)n.pdmg=(n.pdmg||0)+dmg;
 if(!n.tgt||n.tgt.dead)n.tgt=src;
 floaters.push({x:n.fx,y:n.fy,t:"-"+dmg,c:"#fff",t0:T});
 if(n.hp<=0)killFNpc(n,src);
}
function killFNpc(n,killer){
 n.dead=true;
 n.rt=n.temp?0:T+(n.d.resp||60);
 if(P.tgt===n)P.tgt=null;
 clearRefsTo(n);
 sfx("die");spark(n.fx,n.fy,"#9a8a8a",12,1.7);
 var tot=Math.max(1,n.tdmg||0),share=clamp((n.pdmg||0)/tot,0,1);
 if(share>0.02){
   P.kills++;if(P.hunt)P.hunt.kills++;
   log(eul(n.d.n)+" 쓰러뜨렸습니다."+(share<0.95?" (기여 "+Math.round(share*100)+"%)":""),"#ddd");
   gainXp(Math.floor(n.d.lv*n.d.lv*7*share));
   (n.d.drops||[]).forEach(function(dr){
     if(dr[0]==="adena"){var g=Math.floor(ri(dr[1],dr[2])*GOLD_MULT*share);
       if(g>0){P.gold+=g;sfx("gold");log(iga(n.d.n)+" 은화 "+g+"개를 떨어뜨렸습니다.","#f5c542");}}
     else{ if(!ch(Math.min(.85,dr[3]*DROP_MULT*share)))return;
       addItem(dr[0],ri(dr[1],dr[2]));if(P.hunt)P.hunt.drops++;
       log(iga(n.d.n)+" <b>"+ITEMS[dr[0]].n+"</b>"+josa(ITEMS[dr[0]].n,"을","를")+" 떨어뜨렸습니다!","#7fc7ff");}
   });
   if(n.d.elite){shake(4,.35);log("★ "+eul(n.d.n)+" 물리쳤습니다!","#ffdf00");}
   refreshInv();
 }else{
   log("<span style='color:#7a7288'>"+n.d.n+"이(가) 쓰러졌습니다.</span>","#7a7288");
 }
}
/* 죽은 액터를 참조하던 모든 타겟 정리 */
function clearRefsTo(e){
 var z=world[curZ];if(!z)return;
 z.mobs.forEach(function(m){if(m.tgt===e)m.tgt=null;});
 if(z.fnpc)z.fnpc.forEach(function(n){if(n.tgt===e)n.tgt=null;});
 if(P&&P.tgt===e)P.tgt=null;
 /* 배열을 갈아끼우면 updProj 순회 중 인덱스가 어긋난다. 표적만 지우고 정리는 updProj에 맡긴다. */
 projs.forEach(function(p){if(p.tgt===e)p.tgt=null;});
}

/* ---------- 표적 탐색 ---------- */
/* 사냥감 선택 규칙
   - 보스/중간보스는 건드리지 않는다 (플레이어 몫)
   - 플레이어가 지정한 대상(P.tgt)은 가로채지 않는다. 단 그 몹이 NPC를 때리고 있으면 예외
   - 다른 NPC가 이미 붙은 몹은 후순위 — 넷이 한 마리에 몰리지 않게 */
function npcPickTarget(z,n){
 var best=null,bd=n.d.agr||7,alt=null,ad=bd,i,dd;
 if(isFoe(n.fac,"monster"))for(i=0;i<z.mobs.length;i++){
   var m=z.mobs[i];
   if(m.dead||m.d.boss||m.d.mini)continue;
   if(m===P.tgt&&m.tgt!==n)continue;
   dd=distE(n,m);
   if(dd>=ad)continue;
   if(mobTakenBy(z,m,n)){if(dd<ad){ad=dd;alt=m;}continue;}
   if(dd<bd){bd=dd;best=m;}
 }
 if(best)return best;
 best=alt;bd=best?ad:(n.d.agr||7);
 if(z.fnpc)for(i=0;i<z.fnpc.length;i++){
   var o=z.fnpc[i];
   if(o===n||o.dead||!isFoe(n.fac,o.fac))continue;
   dd=distE(n,o);if(dd<bd){bd=dd;best=o;}
 }
 if(!deadFlag&&isFoe(n.fac,P.fac||"player")){
   dd=distE(n,P);if(dd<bd){bd=dd;best=P;}
 }
 return best;
}
function mobTakenBy(z,m,self){
 if(!z.fnpc)return false;
 var i;
 for(i=0;i<z.fnpc.length;i++){var o=z.fnpc[i];if(o!==self&&!o.dead&&o.tgt===m)return true;}
 return false;
}
/* 몬스터가 노릴 만한 NPC (18_update 의 몬스터 AI에서 사용) */
function mobPickNpc(z,m,r){
 if(!z.fnpc)return null;
 var best=null,bd=r,i,dd;
 for(i=0;i<z.fnpc.length;i++){
   var n=z.fnpc[i];
   if(n.dead||!isFoe("monster",n.fac))continue;
   dd=distE(m,n);if(dd<bd){bd=dd;best=n;}
 }
 return best;
}

/* ---------- 갱신 ---------- */
function npcUpdate(dt,z){
 if(!z.fnpc)return;
 var i;
 for(i=z.fnpc.length-1;i>=0;i--){
   var n=z.fnpc[i];
   if(n.dead){
     if(n.temp){z.fnpc.splice(i,1);continue;}
     if(T>=n.rt){n.dead=false;n.hp=n.mhp;n.fx=n.hx;n.fy=n.hy;n.tgt=null;n.stun=0;n.slow=0;
       n.tdmg=0;n.pdmg=0;n.fac=n.fac0;n.betrayAt=0;}
     continue;
   }
   if(T<n.stun)continue;
   /* 배신 발동 */
   if(n.betrayAt&&T>=n.betrayAt){
     n.betrayAt=0;n.fac=AMBUSH.betrayTo;n.tgt=P;
     shake(3,.3);sfx("stun");
     floaters.push({x:n.fx,y:n.fy-0.7,t:"배신!",c:"#ff4040",t0:T});
     log("<b>"+n.d.n+"</b>이(가) 등 뒤에서 무기를 뽑습니다 — \"미안하군. 값을 더 쳐준 쪽이 있어서.\"","#ff5555");
   }
   /* 표적 유지/교체 */
   if(n.tgt&&(n.tgt.dead||!npcHates(n,n.tgt)))n.tgt=null;
   if(!n.tgt)n.tgt=npcPickTarget(z,n);
   var home=Math.abs(n.fx-n.hx)+Math.abs(n.fy-n.hy);
   if(n.tgt){
     if(home>20){n.tgt=null;}
     else{
       var d=distE(n,n.tgt),rr=npcRange(n);
       if(d>rr)moveEnt(n,n.tgt.fx,n.tgt.fy,n.d.sp,dt,z);
       else if(T>=n.na)npcAttack(n,n.tgt);
       continue;
     }
   }
   /* 유휴 — 자기 구역을 어슬렁거린다 */
   if(n.hp<n.mhp)n.hp=Math.min(n.mhp,n.hp+dt*n.mhp*0.012);
   if(T>=n.gt){n.gt=T+ri(3,8);
     n.goal={x:clamp(n.hx+ri(-4,4),1,z.def.w-2),y:clamp(n.hy+ri(-4,4),1,z.def.h-2)};}
   if(n.goal&&moveEnt(n,n.goal.x,n.goal.y,n.d.sp*.5,dt,z))n.goal=null;
 }
}
/* 발사체가 NPC에게서 나갔을 때 */
function npcProjImpact(p,tg){
 if(!p.dmg){floaters.push({x:tg.fx,y:tg.fy,t:"miss",c:"#888",t0:T});return;}
 spark(p.x,p.y,p.c,6,1.2);
 npcDeal(p.src,tg,p.dmg);
}

/* ---------- 습격 / 배신 이벤트 ---------- */
var lastAmbush=-999;
function tryNpcEvents(zi){
 var z=world[zi];if(!z)return;
 if(!z.fnpc)z.fnpc=[];
 /* 다른 지역으로 이동했으므로 대기 중이던 배신은 취소 */
 world.forEach(function(w){if(w&&w.fnpc)w.fnpc.forEach(function(n){if(w!==z)n.betrayAt=0;});});
 if(zi===5)return;                                   /* 보스층 — NPC 없음 */
 if(P.lv<AMBUSH.minLv)return;
 /* 1) 습격 */
 if(AMBUSH.zones.indexOf(zi)>=0&&T-lastAmbush>AMBUSH.cd&&Math.random()<AMBUSH.chance){
   lastAmbush=T;
   var pack=AMBUSH.packs[ri(0,AMBUSH.packs.length-1)],names=[];
   pack.forEach(function(pr){
     var key=pr[0],c=pr[1],j;
     for(j=0;j<c;j++){
       var sp=freeSpotNear(z,P.fx+ri(-5,5),P.fy+ri(-5,5),3);
       var n=mkNpc(key,sp.x,sp.y,{temp:1});
       if(n){n.tgt=P;n.gt=T+99;z.fnpc.push(n);if(names.indexOf(n.d.n)<0)names.push(n.d.n);}
     }});
   shake(4,.45);sfx("stun");
   log("━━ <b style='color:#ff5555'>습격!</b> "+names.join(" · ")+"이(가) 길을 막아섭니다. ━━","#ff5555");
   if(pack.length>1||names.length>1)log("도망칠 수 있다면 지금입니다.","#a89c86");
   return;
 }
 /* 2) 배신 예약 — 중립 진영 NPC 중 하나 */
 if(P.lv<AMBUSH.betrayLv)return;
 if(Math.random()>=AMBUSH.betrayChance)return;
 var cands=z.fnpc.filter(function(n){
   return !n.dead&&!n.temp&&AMBUSH.betrayFrom.indexOf(n.fac)>=0;});
 if(!cands.length)return;
 var pick=cands[ri(0,cands.length-1)];
 pick.betrayAt=T+ri(AMBUSH.betrayDelay[0],AMBUSH.betrayDelay[1]);
}
/* 불러오기 등으로 P 객체가 통째로 교체되면, 옛 P를 가리키던 표적이 유령 참조로 남는다.
   applyLoad 직후 한 번 호출해 전부 끊는다. */
function resetAllTargets(){
 projs=[];
 world.forEach(function(z){
   if(!z)return;
   z.mobs.forEach(function(m){m.tgt=null;m.goal=null;m.prov=false;m.tdmg=0;m.pdmg=0;});
   (z.fnpc||[]).forEach(function(n){n.tgt=null;n.goal=null;n.betrayAt=0;n.tdmg=0;n.pdmg=0;
     if(n.fac!==n.fac0)n.fac=n.fac0;});
 });
}
/* ---------- 조회 ---------- */
function npcAlive(z){
 if(!z||!z.fnpc)return 0;
 var c=0;z.fnpc.forEach(function(n){if(!n.dead)c++;});return c;
}
function npcHostileNear(z,r){
 var out=[];if(!z.fnpc)return out;
 z.fnpc.forEach(function(n){
   if(n.dead||!isFoe(P.fac||"player",n.fac))return;
   if(distE(P,n)<r)out.push(n);});
 return out;
}
