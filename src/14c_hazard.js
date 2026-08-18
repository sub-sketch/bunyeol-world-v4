/* ================= v4 — 논타겟 지면 공격(장판) + 회피 =================
   자동 사냥이 '공격'을 맡았으므로, 조작의 재미는 '회피'에서 나와야 한다.

   적 장판 (텔레그래프)
     몹이 플레이어의 '그 순간 위치'에 붉은 원을 예고하고, 지연 후 그 자리를 때린다.
     유도가 아니다 — 밟고 서 있으면 크게 맞고, 걸어 나가면 0이다.
     피해는 평타의 약 1.8배. 피할 수 있는 공격은 아프게, 그래야 피할 이유가 생긴다.

   회피 (Space)
     이동 방향으로 짧게 도약. 0.3초 무적(장판·투사체·근접 전부).
     쿨 2.5초. 자동 사냥은 회피를 대신해 주지 않는다 — 이게 플레이어의 몫이다.

   데이터 (monsters.json 몹에 추가)
     "tele": { "r":1.6, "arm":0.9, "mult":1.8, "cd":5, "ch":0.5 }
       r    장판 반경(타일)   arm  예고 시간(초)   mult 피해 배율
       cd   재사용 대기(초)   ch   공격 기회마다 장판을 쓸 확률
   ==================================================================== */
var hazards = [];

var DASH = { cd: 2.5, dur: 0.16, dist: 2.6, iframes: 0.30 };

function hazardAdd(x, y, r, arm, dmg, srcName){
  hazards.push({ x:x, y:y, r:r, t0:T, tArm:T + arm, dmg:dmg, src:srcName, done:false });
}

function playerEvading(){ return P && T < (P.evadeT || 0); }

/* 회피는 처음부터 주어지지 않는다 — 첫 사망 뒤, 벌어 온 포인트로 산다.
   "죽어서 얻은 것으로 다음 죽음을 피한다"가 로그라이트 해금의 정석이다. */
function dashUnlocked(){ return typeof metaOwned === "function" && metaOwned("dash"); }

/* ---------- 회피 ---------- */
function tryDash(){
  if(!P || deadFlag || !started) return;
  if(!dashUnlocked()){
    if(T > (tryDash.hintT || 0)){ tryDash.hintT = T + 3; log(TX("dash.locked"), "#a89c86"); }
    return;
  }
  if(T < (P.dashCd || 0)){ log(TX("dash.cd", ((P.dashCd - T)).toFixed(1)), "#888"); return; }
  /* 방향: 이동 중이면 그쪽, 아니면 바라보는 쪽 */
  var dx = 0, dy = 0;
  if(P.dest){ dx = P.dest.x - P.fx; dy = P.dest.y - P.fy; }
  else if(P.tgt){ dx = P.fx - P.tgt.fx; dy = P.fy - P.tgt.fy; }   /* 표적 반대편으로 이탈 */
  else { var F = [[0,1],[-1,0],[0,-1],[1,0]][P.face || 0]; dx = F[0]; dy = F[1]; }
  var d = Math.sqrt(dx*dx + dy*dy);
  if(d < 0.01){ dx = 0; dy = 1; d = 1; }
  var dcd = [2.5, 2.1, 1.8][metaLv("dashcd")] || 1.8;          /* 메타: 회피 연마 */
  if(typeof revVal === "function") dcd *= (1 - revSum("dashcd") / 100);   /* 계시: 스치는 죽음 */
  var dlen = metaOwned("dashlen") ? 3.4 : DASH.dist;            /* 메타: 도약 거리 */
  P.dashCd = T + dcd;
  P.evadeT = T + DASH.iframes;
  P.dashUntil = T + DASH.dur;
  P.dashVx = dx / d * (dlen / DASH.dur);
  P.dashVy = dy / d * (dlen / DASH.dur);
  P.tgt = null;                                   /* 회피는 교전 이탈이다 */
  sfx("bow");
  spark(P.fx, P.fy, "#bfe8ff", 8, 1.8);
  if(typeof revOnDash === "function") revOnDash();   /* 계시: 회피 반격 */
}

function dashTick(dt){
  if(!P || !P.dashUntil || T >= P.dashUntil) return;
  var z = world[curZ];
  var nx = P.fx + P.dashVx * dt, ny = P.fy + P.dashVy * dt;
  if(!blocked(z, nx, P.fy)) P.fx = nx;
  if(!blocked(z, P.fx, ny)) P.fy = ny;
  P.mv = T; P.anim = (P.anim || 0) + dt * 10;
}

/* ---------- 장판 갱신 ---------- */
function hazardTick(dt){
  var i, h;
  for(i = hazards.length - 1; i >= 0; i--){
    h = hazards[i];
    if(!h.done && T >= h.tArm){
      h.done = true;
      h.tGone = T + 0.22;                        /* 짧은 폭발 잔상 */
      spark(h.x, h.y, "#ff7a4a", 14, 2.2);
      sfx("boom"); shake(2.2, .18);
      var dx = P.fx - h.x, dy = P.fy - h.y;
      if(!deadFlag && dx*dx + dy*dy <= h.r * h.r){
        if(playerEvading()){
          floaters.push({x:P.fx, y:P.fy, t:TX("dash.evade"), c:"#bfe8ff", t0:T});
        }else{
          var dmg = Math.max(1, h.dmg - Math.floor(pAC() * .4));
          dmg = absorbShield(dmg);
          P.hp -= dmg; P.hurtT = T; runOnHurt(dmg);
          floaters.push({x:P.fx, y:P.fy, t:"-" + dmg, c:"#ff8a3a", t0:T});
          sfx("hurt"); shake(3.4, .3);
          dotFromMob({d:{n:h.src}});             /* 장판 출처 몹의 도트는 걸지 않되 훅 유지 */
          if(P.hp <= 0) playerDie(null);
        }
      }
    }
    if(h.done && T >= h.tGone) hazards.splice(i, 1);
  }
}

/* ---------- 렌더 (지면, 엔티티보다 먼저) ---------- */
function hazardDraw(){
  var i, h;
  for(i = 0; i < hazards.length; i++){
    h = hazards[i];
    var s = toScreen(h.x, h.y);
    var rw = h.r * HW2 * 2, rh = h.r * HH2 * 2;
    if(!h.done){
      var p = clamp((T - h.t0) / (h.tArm - h.t0), 0, 1);
      ctx.strokeStyle = "rgba(255,80,40,.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, rw/2, rh/2, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(255,60,20," + (0.10 + p * 0.22) + ")";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, rw/2 * p, rh/2 * p, 0, 0, 6.283); ctx.fill();
    }else{
      ctx.fillStyle = "rgba(255,140,60,.5)";
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, rw/2, rh/2, 0, 0, 6.283); ctx.fill();
    }
  }
}

/* mobAttack 에서 부른다 — true 를 돌려주면 이번 공격은 장판으로 대체된 것 */
function tryTeleAttack(m){
  var t = m.d.tele;
  if(!t) return false;
  if(T < (m.teleCd || 0)) return false;
  if(!ch(t.ch === undefined ? 0.5 : t.ch)) return false;
  m.teleCd = T + (t.cd || 5);
  m.atkT = T;                                     /* 공격 모션 재생 */
  m.na = T + 1.9;                                 /* 장판 후엔 살짝 긴 후딜 */
  var dmg = Math.round(ri(m.d.d1, m.d.d2) * (t.mult || 1.8));
  hazardAdd(P.fx, P.fy, t.r || 1.6, t.arm || 0.9, dmg, m.d.n);
  floaters.push({x:m.fx, y:m.fy - 0.6, t:"!", c:"#ff7a4a", t0:T});
  return true;
}
