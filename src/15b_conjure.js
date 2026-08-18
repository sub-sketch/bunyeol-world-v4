/* ================= R32 소환 · 임시 장애물 · 장판 (계열 정체성 도구) =================
   대표 지시: "궁수는 임의로 짧은 시간 소환수나 벽을 만들어서 카이팅할수있는걸 만들어야할거같고
              마법사는 텔레포트와 같이 순간 이동기 빠른 이동기를 가지게 하고 마찬가지로 소환이나
              임시 장애물을 만들거나 장판형 공격기를 가지고 있어야 될거같음"

   왜 이 세 가지를 한 파일에 두는가
     · 셋 다 "몇 초 뒤 스스로 사라진다"는 같은 수명 규칙을 쓴다. 만료 처리를 한 곳에 모으면
       층 이동·런 종료·사망에서 지워야 할 목록이 하나로 끝난다(빠뜨리면 유령 벽이 남는다).
     · 셋 다 이미 있는 시스템에 얹는다 — 새 렌더러를 만들지 않는다.
         소환수 = 필드 NPC(13b_npc.js) 의 temp NPC. 진영을 player 로 두면
                  HOSTILE 표에 따라 마물·무법자·교단을 알아서 문다.
         임시 벽 = 지역 장애물 목록 z.obs + 충돌 격자 z.g 조작. 그리기는 기존 obs 패스가 한다.
         장판   = 이 파일의 PFIELD. hazards(14c) 는 **플레이어만** 때리는 적 장판이라 반대편이 없었다.

   ★ 임시 벽은 '원래 비어 있던 칸'에만 세운다. 원래 벽이던 칸에 세우면 만료 때 g 를 0 으로
     돌려놓아 지형에 구멍을 뚫어 버린다(첫 시제품에서 실제로 보스방 벽이 뚫렸다).
   ================================================================================= */

var CONJ = [];        /* 임시 장애물 — {z, x, y, t, ob} */
var SUMS = [];        /* 소환수 참조 — {z, n, t} (n 은 z.fnpc 안의 그 객체) */
var PFIELD = [];      /* 플레이어 장판 — {z, x, y, r, t, next, dmg, c} */

var CONJ_MAX = 8, SUM_MAX = 3, PFIELD_MAX = 4;

/* ---------- 수명 보정 (노드) ---------- */
function conjLifeBonus(){ return (typeof metaLv === "function") ? metaLv("conjdur") * 3 : 0; }
function sumLifeBonus(){ return (typeof metaLv === "function") ? metaLv("petdur") * 3 : 0; }
function fieldRBonus(){ return (typeof metaLv === "function") ? metaLv("hazr") * 0.4 : 0; }

/* ================= 임시 장애물 ================= */
/* 바라보는 방향 앞 1칸에, 진행 방향과 **직각**으로 len 칸을 세운다.
   직각으로 세우는 이유: 진행 방향으로 세우면 내 앞을 내가 막는다(길막). */
function conjWall(kind, len, life, cx, cy, face){
  var z = world[curZ], i, put = 0;
  var F = [[0,1],[-1,0],[0,-1],[1,0]][face || 0];
  var px = Math.round(cx + F[0]), py = Math.round(cy + F[1]);
  var ox = F[1], oy = F[0];                     /* 직각 방향 (x,y 를 바꿔 만든다) */
  var half = Math.floor(len / 2);
  for(i = -half; i <= half; i++){
    if(CONJ.length >= CONJ_MAX) break;
    conjPut(z, px + ox * i, py + oy * i, kind, life) && put++;
  }
  /* 정확히 앞칸만 막혀 하나도 못 세운 경우 — 한 칸 더 앞에서 다시 시도한다 */
  if(!put){
    px += F[0]; py += F[1];
    for(i = -half; i <= half; i++){
      if(CONJ.length >= CONJ_MAX) break;
      conjPut(z, px + ox * i, py + oy * i, kind, life) && put++;
    }
  }
  return put;
}

function conjPut(z, x, y, kind, life){
  x = Math.round(x); y = Math.round(y);
  if(x < 1 || y < 1 || x >= z.def.w - 1 || y >= z.def.h - 1) return false;
  if(z.g[y][x]) return false;                          /* ★ 원래 벽이던 칸은 건드리지 않는다 */
  if(P && Math.round(P.fx) === x && Math.round(P.fy) === y) return false;   /* 제자리에 갇히지 않게 */
  var i;
  for(i = 0; i < z.mobs.length; i++)
    if(!z.mobs[i].dead && Math.round(z.mobs[i].fx) === x && Math.round(z.mobs[i].fy) === y) return false;
  var ob = { x:x, y:y, k:kind, v:1, conj:1 };
  z.g[y][x] = 1;
  z.obs.push(ob);
  CONJ.push({ z:curZ, x:x, y:y, t:T + life, ob:ob });
  spark(x, y, kind === "icepil" ? "#bfe8ff" : "#8fd18f", 8, 1.4);
  return true;
}

function conjDrop(c){
  var z = world[c.z];
  if(z){
    if(z.g[c.y] && z.g[c.y][c.x]) z.g[c.y][c.x] = 0;
    var i = z.obs.indexOf(c.ob);
    if(i >= 0) z.obs.splice(i, 1);
    if(c.z === curZ) spark(c.x, c.y, "#8a8068", 6, 1.1);
  }
}

/* ================= 소환수 ================= */
function sumSpawn(key, cnt, life){
  var z = world[curZ], made = 0, i;
  life += sumLifeBonus();
  for(i = 0; i < cnt; i++){
    if(sumCount() >= SUM_MAX){ log("더 이상 부를 수 없습니다.", "#888"); break; }
    var sp = freeSpotNear(z, P.fx, P.fy, 2);
    var n = mkNpc(key, sp.x, sp.y, { temp:1, fac:"player" });
    if(!n) break;
    n.life = T + life;                 /* 수명 — sumTick 이 만료시킨다 */
    n.own = 1;                         /* 주인을 따라다닌다 */
    n.hx = P.fx; n.hy = P.fy;
    z.fnpc.push(n);
    SUMS.push({ z:curZ, n:n });
    spark(sp.x, sp.y, "#9fe2ff", 14, 1.8);
    made++;
  }
  return made;
}
function sumCount(){
  var n = 0, i;
  for(i = 0; i < SUMS.length; i++) if(SUMS[i].n && !SUMS[i].n.dead) n++;
  return n;
}

/* 소환수 갱신 — 수명 만료 + 주인 추종.
   npcUpdate 는 '집(hx,hy)에서 20칸 넘게 멀어지면 표적을 놓는' 규칙이 있다. 소환수의 집은
   따라다니는 주인이어야 하므로 매 프레임 hx,hy 를 플레이어 자리로 옮겨 준다. */
function sumTick(dt){
  var i, s;
  for(i = SUMS.length - 1; i >= 0; i--){
    s = SUMS[i];
    var n = s.n;
    if(!n || n.dead){ SUMS.splice(i, 1); continue; }
    if(s.z !== curZ){                                  /* 층을 옮기면 소환수는 남지 않는다 */
      n.dead = true; SUMS.splice(i, 1); continue;
    }
    if(T >= (n.life || 0)){
      n.dead = true; spark(n.fx, n.fy, "#7fa8c8", 12, 1.6);
      floaters.push({ x:n.fx, y:n.fy - 0.6, t:"흩어짐", c:"#9fe2ff", t0:T });
      SUMS.splice(i, 1); continue;
    }
    if(P){ n.hx = P.fx; n.hy = P.fy; }
    /* 표적이 없고 주인과 멀면 따라온다 (유휴 배회 대신) */
    if(!n.tgt && distE(n, P) > 3.2) moveEnt(n, P.fx, P.fy, n.d.sp, dt, world[curZ]);
  }
}

/* ================= 플레이어 장판 ================= */
function pfieldAdd(x, y, r, life, dmg, col){
  if(PFIELD.length >= PFIELD_MAX) PFIELD.shift();
  PFIELD.push({ z:curZ, x:x, y:y, r:r + fieldRBonus(), t:T + life, next:T + 0.15, dmg:dmg, c:col || "#ff8a30" });
}
function pfieldTick(){
  var z = world[curZ], i, f;
  for(i = PFIELD.length - 1; i >= 0; i--){
    f = PFIELD[i];
    if(f.z !== curZ || T >= f.t){ PFIELD.splice(i, 1); continue; }
    if(T < f.next) continue;
    f.next = T + 0.45;
    var c = 0;
    z.mobs.forEach(function(m){
      if(m.dead) return;
      var dx = m.fx - f.x, dy = m.fy - f.y;
      if(dx*dx + dy*dy <= f.r * f.r){ hitMob(m, f.dmg, true, false, true); c++; }   /* 지속 피해 — 히트스톱 없음 */
    });
    (z.fnpc || []).forEach(function(n){
      if(n.dead || !isFoe(P.fac || "player", n.fac)) return;
      var dx2 = n.fx - f.x, dy2 = n.fy - f.y;
      if(dx2*dx2 + dy2*dy2 <= f.r * f.r) hitFNpc(n, f.dmg, P);
    });
    if(c) spark(f.x, f.y, f.c, 3, 1.2);
  }
}
function pfieldDraw(){
  var i, f;
  for(i = 0; i < PFIELD.length; i++){
    f = PFIELD[i];
    if(f.z !== curZ) continue;
    var s = toScreen(f.x, f.y), k = 0.5 + 0.3 * Math.sin(T * 6 + i);
    var left = f.t - T, fade = left < 1 ? left : 1;                /* 꺼질 때 서서히 흐려진다 */
    ctx.save();
    ctx.fillStyle = "rgba(255,120,40," + (0.10 + 0.07 * k) * fade + ")";
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, f.r * HW2, f.r * HH2, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = "rgba(255,170,80," + (0.45 + 0.2 * k) * fade + ")";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 4, f.r * HW2, f.r * HH2, 0, 0, 6.283); ctx.stroke();
    ctx.restore();
  }
}

/* ================= 공용 갱신 · 청소 ================= */
function conjTick(dt){
  var i;
  for(i = CONJ.length - 1; i >= 0; i--){
    if(T >= CONJ[i].t){ conjDrop(CONJ[i]); CONJ.splice(i, 1); }
  }
  sumTick(dt);
  pfieldTick();
}

/* 층 이동·런 종료·사망에서 부른다 — 한 번에 다 지운다 */
function conjClearAll(){
  var i;
  for(i = 0; i < CONJ.length; i++) conjDrop(CONJ[i]);
  CONJ.length = 0;
  for(i = 0; i < SUMS.length; i++) if(SUMS[i].n) SUMS[i].n.dead = true;
  SUMS.length = 0;
  PFIELD.length = 0;
}
