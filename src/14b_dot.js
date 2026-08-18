/* ================= 지속 피해(도트) — 독 / 출혈 =================
   플레이어에게만 건다. 몬스터 쪽 도트가 필요해지면 같은 구조를 m.dot 으로 복제하면 된다.

   자료구조
     P.dot = { poison:{dmg, ivl, next, t, n}, bleed:{...} }
       dmg  틱당 피해   ivl  틱 간격(초)   next 다음 틱 시각   t 만료 시각   n 표시 이름

   데이터
     monsters.json 의 몹에 아래를 넣으면 근접 명중 시 확률로 걸린다.
       "poison": {"ch":0.35, "dmg":4, "ivl":2, "dur":16}
       "bleed":  {"ch":0.25, "dmg":3, "ivl":1.5, "dur":12}

   해제
     해독제(cure:"poison") / 붕대(cure:"bleed") 소모품.
   ============================================================================ */
var DOTDEF = {
  poison: { n:"중독", c:"#8ad86a", key:"poison" },
  bleed:  { n:"출혈", c:"#e05a5a", key:"bleed"  }
};

function dotClear(){ if(P) P.dot={}; }

function dotHas(k){ var d=P&&P.dot&&P.dot[k]; return !!(d&&T<d.t); }

function dotRemain(k){ var d=P&&P.dot&&P.dot[k]; return (d&&T<d.t)?Math.ceil(d.t-T):0; }

/* 몹의 공격이 명중했을 때 호출. 이미 걸려 있으면 지속시간을 늘리고 더 센 쪽 피해를 남긴다. */
function dotApply(k,spec,srcName){
  if(!P||!spec)return false;
  if(!P.dot)P.dot={};
  if(ri(1,1000)>Math.round((spec.ch||0)*1000))return false;
  var cur=P.dot[k], fresh=!(cur&&T<cur.t);
  P.dot[k]={
    dmg: Math.max(spec.dmg||1,(cur&&T<cur.t)?cur.dmg:0),
    ivl: spec.ivl||2,
    next: fresh?T+(spec.ivl||2):cur.next,
    t: Math.max(T+(spec.dur||10),(cur&&T<cur.t)?cur.t:0),
    n: DOTDEF[k]?DOTDEF[k].n:k
  };
  if(fresh){
    sfx("hurt");
    log(TX(k==="poison"?"dot.poison.on":"dot.bleed.on",srcName||""),DOTDEF[k].c);
  }
  return true;
}

/* 몹 근접 명중 지점에서 한 번에 처리 */
function dotFromMob(m){
  if(!m||!m.d)return;
  if(m.d.poison)dotApply("poison",m.d.poison,m.d.n);
  if(m.d.bleed) dotApply("bleed", m.d.bleed, m.d.n);
}

/* update() 에서 매 프레임 호출. 틱 간격이 지났을 때만 깎는다. */
function dotTick(){
  if(!P||!P.dot||P.hp<=0)return;
  var k,d,dirty=false;
  for(k in P.dot){
    d=P.dot[k];
    if(!d)continue;
    if(T>=d.t){delete P.dot[k];dirty=true;continue;}
    if(T>=d.next){
      d.next=T+d.ivl;
      /* 도트로는 죽지 않는다 — HP 1 에서 멈춘다.
         화면 밖 도트에 죽으면 원인을 알 수 없어 억울하기만 하다. */
      var dmg=Math.min(d.dmg,Math.max(0,Math.ceil(P.hp)-1));
      if(dmg>0){
        P.hp-=dmg;
        floaters.push({x:P.fx,y:P.fy,t:"-"+dmg,c:DOTDEF[k]?DOTDEF[k].c:"#fff",t0:T});
      }
      dirty=true;
    }
  }
  if(dirty)refreshHud();
}

/* 해독제 / 붕대 */
function dotCure(k){
  if(!P||!P.dot||!P.dot[k]||T>=P.dot[k].t)return false;
  delete P.dot[k];
  sfx("pot");
  log(TX(k==="poison"?"dot.poison.cure":"dot.bleed.cure"),"#8fd18f");
  refreshHud();
  return true;
}

/* 세이브 — 절대 시각 대신 남은 초로 저장한다(세션마다 T 가 달라진다) */
function packDot(){
  var o={},k,d;
  if(!P||!P.dot)return o;
  for(k in P.dot){d=P.dot[k];
    if(d&&d.t>T)o[k]={dmg:d.dmg,ivl:d.ivl,r:Math.round(d.t-T),n:d.n};}
  return o;
}
function unpackDot(o){
  P.dot={};
  if(!o)return;
  var k,d;
  for(k in o){d=o[k];
    if(d&&d.r>0)P.dot[k]={dmg:d.dmg,ivl:d.ivl||2,next:T+(d.ivl||2),t:T+d.r,n:d.n||k};}
}
