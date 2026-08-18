/* ================= 플레이어 기사 스프라이트 시트 (Phase 1) =================
   코드 드로잉(drawHum) 대신 첨부 에셋을 drawImage 로 렌더한다.
   Phase 2: assets/ 폴더 분리 예정 — 지금은 build.py 가 base64 로 PCSHEET 에 주입한다.

   에셋 규격
     대기  knight_final_{south|west|north}_48px.png   낱장 1프레임
     걷기  knight_walk_{south|west|north}_sheet_48px.png  가로 4프레임
     공격  knight_attack_sheet_48px.png   가로 4프레임 (셀 52px, 검이 머리 위로 돌출)
     사망  knight_death_sheet_v2_48px.png 가로 4프레임 (1회 재생 후 마지막 유지)
     모든 프레임 앵커 = 하단 중앙(발 위치)

   방향: 게임 face 0=S 1=W 2=N 3=E.  E 는 W 를 ctx.scale(-1,1) 좌우반전.
   폴백: 이미지 하나라도 실패하면 pcSheetReady() 가 false → 기존 drawHum 으로 자동 전환.
   ========================================================================= */
var PCSHEET = (typeof PCSHEET !== "undefined") ? PCSHEET : {};

var PCS = {
  need: ["idle_s","idle_w","idle_n","walk_s","walk_w","walk_n","attack","death"],
  img: {},          /* key -> {img, ok, fw, fh, n} */
  loaded: 0, failed: 0, tried: false,
  ATK_DUR: 0.42,    /* 기존 poseOf 의 공격 표시 구간과 동일 — 공속/데미지에는 영향 없음 */
  DIE_DUR: 0.80,
  LUNGE: 3          /* 공격 시 타겟 방향 런지 픽셀 */
};

/* ================= R18b 계열별 시트 + 색 변경 =================
   기사만 전용 시트(assets/pc)가 있고, 정령마법사·마도학자는 전용 시트가 없었다.
   그래서 이미 빌드에 들어있는 세력 NPC 시트(MOBSHEET)를 재사용하고 **색만 바꿔** 구분한다.
   MOB_FILES 와 PC_FILES 의 키 이름(idle_s/walk_s/attack/death...)이 완전히 같아서
   MOBSHEET["npc_mc_witch"] 는 PCSHEET 와 모양이 동일하다 — 새 에셋 0개, 용량 증가 0.
   배정표는 data/classes.json 의 SPRITE 에 있다(전용 시트가 나오면 거기만 고치면 된다).

   ★ 색조를 통째로 돌리면 안 된다. 이 아트 스타일은 **그림자가 자주(plum) 계열**이라
     같이 돌아가면서 도트가 무너지고, 피부색까지 변해 사람으로 안 보인다.
     그래서 '옷으로 보이는 픽셀'만 고른다 — 그림자보다 밝고(V>=0.22) 무채색이 아닌(S>=0.15) 것,
     그리고 **피부·가죽 색역(H 350~52°)** 은 제외.
     ⚠ 처음엔 보호 범위를 H 10~46 으로 좁게 잡았다가, 가죽 갈색 #704038(H8) 이 범위 **바로 밖**이라
       초록으로 튀면서 부츠·다리에 밝은 반점이 생겼다(확대 시제품에서 발견). 이 팔레트는 피부와
       가죽이 같은 난색 대역에 붙어 있으므로 0° 를 감싸는 범위로 함께 보호해야 한다. */
var TINT_SHADOW_V = 0.22, TINT_MIN_S = 0.15;
var TINT_KEEP_H1 = 350/360, TINT_KEEP_H2 = 52/360;   /* 0° 를 감싸는 난색 보호대(피부+가죽) */
function tintSheetImage(img, dh, ds, dv){
  if(!dh && (ds === undefined || ds === 1) && (dv === undefined || dv === 1)) return img;
  var w = img.width, h = img.height;
  if(!(w > 0 && h > 0)) return img;
  var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  var g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  var dat, i;
  try{ dat = g.getImageData(0, 0, w, h); }catch(e){ return img; }   /* 보안 제약 시 원본 유지 */
  var px = dat.data, DH = (dh || 0) / 360, DS = (ds === undefined ? 1 : ds), DV = (dv === undefined ? 1 : dv);
  for(i = 0; i < px.length; i += 4){
    if(px[i+3] < 8) continue;
    var r = px[i]/255, gg = px[i+1]/255, b = px[i+2]/255;
    var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), df = mx - mn;
    var v = mx, s = mx === 0 ? 0 : df / mx, hh = 0;
    if(df !== 0){
      if(mx === r) hh = ((gg - b) / df) % 6;
      else if(mx === gg) hh = (b - r) / df + 2;
      else hh = (r - gg) / df + 4;
      hh /= 6; if(hh < 0) hh += 1;
    }
    if(v < TINT_SHADOW_V || s < TINT_MIN_S) continue;                 /* 그림자·중립색 보존 */
    /* 피부·가죽 보존 — 0° 를 감싸는 범위라 (h<=상한 || h>=하한) 로 판정한다 */
    if((hh <= TINT_KEEP_H2 || hh >= TINT_KEEP_H1) && s >= 0.15 && s <= 0.70 && v >= 0.22) continue;
    var h2 = (hh + DH) % 1; if(h2 < 0) h2 += 1;
    var s2 = Math.max(0, Math.min(1, s * DS)), v2 = Math.max(0, Math.min(1, v * DV));
    var ii = Math.floor(h2 * 6), f = h2 * 6 - ii, pp = v2 * (1 - s2), q = v2 * (1 - f * s2), t = v2 * (1 - (1 - f) * s2);
    var R, G, B;
    switch(ii % 6){
      case 0: R = v2; G = t; B = pp; break;
      case 1: R = q; G = v2; B = pp; break;
      case 2: R = pp; G = v2; B = t; break;
      case 3: R = pp; G = q; B = v2; break;
      case 4: R = t; G = pp; B = v2; break;
      default: R = v2; G = pp; B = q;
    }
    px[i] = (R*255+0.5)|0; px[i+1] = (G*255+0.5)|0; px[i+2] = (B*255+0.5)|0;
  }
  g.putImageData(dat, 0, 0);
  return cv;
}
/* 그림자 폭 조회용 이름 — FOOTPRINT 는 시트 이름으로 키가 잡혀 있다(knight / npc_mc_witch ...) */
function pcSheetFootName(){
  var cls = (P && P.cls) || PCS.cls || "k";
  var sp = (typeof SPRITE !== "undefined" && SPRITE && SPRITE[cls]) ? SPRITE[cls] : null;
  if(sp && typeof sp.src === "string" && sp.src.indexOf("mob:") === 0) return sp.src.slice(4);
  return "knight";
}
/* 현재 계열의 시트 출처와 색 보정을 고른다 */
function pcSheetSpec(cls){
  var sp = (typeof SPRITE !== "undefined" && SPRITE && SPRITE[cls]) ? SPRITE[cls] : null;
  if(!sp) return {map: PCSHEET, dh: 0, ds: 1, dv: 1};
  var map = PCSHEET;
  if(typeof sp.src === "string" && sp.src.indexOf("mob:") === 0){
    var nm = sp.src.slice(4);
    map = (typeof MOBSHEET !== "undefined" && MOBSHEET[nm]) ? MOBSHEET[nm] : PCSHEET;
  }
  return {map: map, dh: sp.dh || 0, ds: (sp.ds === undefined ? 1 : sp.ds), dv: (sp.dv === undefined ? 1 : sp.dv)};
}
/* 계열이 바뀌면(캐릭터 생성) 그 계열 시트로 다시 읽는다. 한 판에 한 계열만 쓰므로 낭비 없다. */
function pcSheetEnsure(cls){
  if(!cls) return;
  if(PCS.cls === cls) return;
  PCS.cls = cls; PCS.tried = false; PCS.loaded = 0; PCS.failed = 0; PCS.img = {};
  pcSheetInit(cls);
}
function pcSheetInit(cls){
  if(PCS.tried) return;
  PCS.tried = true;
  var spec = pcSheetSpec(cls || PCS.cls || "k");
  PCS.cls = cls || PCS.cls || "k";
  PCS.need.forEach(function(k){
    var src = spec.map[k];
    if(!src){ PCS.failed++; return; }
    var rec = {img:null, ok:false, fw:0, fh:0, n:(k.indexOf("idle")===0?1:4)};
    PCS.img[k] = rec;
    var im = new Image();
    im.onload = function(){
      /* 색 보정이 있으면 캔버스로 한 번 구워 둔다 — 매 프레임 다시 계산하지 않는다.
         drawImage 는 캔버스도 그대로 받으므로 아래 렌더 코드는 손댈 필요가 없다. */
      var use = (spec.dh || spec.ds !== 1 || spec.dv !== 1) ? tintSheetImage(im, spec.dh, spec.ds, spec.dv) : im;
      rec.img = use; rec.fh = use.height; rec.fw = Math.floor(use.width / rec.n);
      rec.ok = (rec.fw > 0 && rec.fh > 0);
      if(rec.ok) PCS.loaded++; else PCS.failed++;
    };
    im.onerror = function(){ PCS.failed++; };
    im.src = src;
  });
}
function pcSheetReady(){
  if(PCS.failed > 0) return false;
  if(PCS.loaded < PCS.need.length) return false;
  var i;
  for(i = 0; i < PCS.need.length; i++){
    var r = PCS.img[PCS.need[i]];
    if(!r || !r.ok) return false;
  }
  return true;
}
/* 이 액터를 시트로 그릴 수 있는가.
   R18b: 예전엔 `P.cls === "k"` 로 기사만 허용했다 — 그래서 다른 두 계열은 무조건 절차 생성
   실루엣으로 그려져 평면 색 블록처럼 보였다. 이제 계열마다 배정된 시트를 쓴다.
   R23: 변신은 **외형까지 바꾼 경우에만** 시트를 비운다(그 때는 몹 시트로 그린다 — 19_render.js).
   "능력치만 습득" 변신은 내 계열 시트를 그대로 써야 한다 — 예전엔 P.tf 만 보고 무조건 비워서
   능력치만 빌려도 옛 절차 드로잉(픽셀 실루엣)으로 돌아갔다(대표 리포트: "변신이 예전 픽셀 캐릭터"). */
function pcUseSheet(){
  if(!P) return false;
  if(P.tf && P.tfSkin !== false) return false;
  if(PCS.cls !== P.cls) pcSheetEnsure(P.cls);   /* 계열이 바뀌었으면 그 계열 시트로 교체 */
  return pcSheetReady();
}

/* ---------- 공용 스프라이트 출력 (틴팅/좌우반전) — 몬스터에도 그대로 재사용 가능 ---------- */
var FXCV = document.createElement("canvas"), FXCX = FXCV.getContext("2d");
FXCX.imageSmoothingEnabled = false;
/* dw/dh 를 주면 그 크기로 늘려 그린다(몹은 종류마다 크기가 다르다). 생략하면 원본 크기. */
function drawSpriteFX(img, sx, sy, sw, sh, dx, dy, flip, tint, tintColor, dw, dh){
  dx = Math.round(dx); dy = Math.round(dy);
  dw = Math.round(dw || sw); dh = Math.round(dh || sh);
  ctx.save();
  if(flip){ ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh); }
  else ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
  if(!(tint > 0)) return;
  if(FXCV.width < sw || FXCV.height < sh){ FXCV.width = Math.max(sw, FXCV.width); FXCV.height = Math.max(sh, FXCV.height); FXCX.imageSmoothingEnabled = false; }
  FXCX.clearRect(0, 0, FXCV.width, FXCV.height);
  FXCX.globalCompositeOperation = "source-over";
  FXCX.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  FXCX.globalCompositeOperation = "source-atop";
  FXCX.fillStyle = tintColor || ("rgba(255,255,255," + tint + ")");
  FXCX.fillRect(0, 0, sw, sh);
  FXCX.globalCompositeOperation = "source-over";
  ctx.save();
  if(flip){ ctx.translate(dx + dw, dy); ctx.scale(-1, 1); ctx.drawImage(FXCV, 0, 0, sw, sh, 0, 0, dw, dh); }
  else ctx.drawImage(FXCV, 0, 0, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}
/* 피격 표현 — 0.1초 화이트 틴팅 + 2px 넉백. 공용. (Phase 1 에서는 플레이어에만 적용) */
function hitTint(e){
  var t = (typeof e.hurtT === "number") ? e.hurtT : e.lh;
  if(typeof t !== "number") return 0;
  var el = T - t;
  return (el >= 0 && el < 0.10) ? (0.75 * (1 - el / 0.10)) : 0;
}
var FACE_PUSH = [[0,1],[-1,0],[0,-1],[1,0]];   /* S W N E — 바라보는 방향의 화면 벡터 */
function hitKnock(e){
  var t = (typeof e.hurtT === "number") ? e.hurtT : e.lh;
  if(typeof t !== "number") return {x:0, y:0};
  var el = T - t;
  if(!(el >= 0 && el < 0.10)) return {x:0, y:0};
  var v = FACE_PUSH[e.face || 0], k = 2 * (1 - el / 0.10);
  return {x: -v[0] * k, y: -v[1] * k};        /* 바라보는 반대 방향으로 밀림 */
}
/* P2 피격 넉백 강화(몹 전용) — hitKnock과 같은 문법(시각 전용, e.lh로부터 0.1초 감쇠)이지만
   기준 방향이 "e가 바라보는 반대"가 아니라 "플레이어의 반대 방향"이고 크기도 3px로 더 크다.
   실제 좌표(e.fx/fy)는 건드리지 않고 화면에 그릴 때만 밀린 것처럼 보이게 한다. */
function mobKnock(e){
  var t = (typeof e.hurtT === "number") ? e.hurtT : e.lh;
  if(typeof t !== "number" || !P) return {x:0, y:0};
  var el = T - t;
  if(!(el >= 0 && el < 0.10)) return {x:0, y:0};
  var dx = e.fx - P.fx, dy = e.fy - P.fy;
  if(Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4){var fv=FACE_PUSH[e.face||0];dx=-fv[0];dy=-fv[1];}
  var sx = dx - dy, sy = dx + dy, sd = Math.sqrt(sx * sx + sy * sy) || 1;   /* 등각 화면 방향으로 투영 */
  var k = 3 * (1 - el / 0.10);
  return {x: sx / sd * k, y: sy / sd * k};
}

/* ---------- 검격 이펙트 (직업별 확장 지점) ---------- */
function drawAttackFx(e, sx, sy, cls){
  if(cls !== "k") return;
  var el = T - e.atkT;
  if(el < 0.12 || el > 0.30) return;
  var k = (el - 0.12) / 0.18;
  var v = FACE_PUSH[e.face || 0];
  var cx = sx + v[0] * 11, cy = sy - 15 + v[1] * 5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,246,200," + (0.55 * (1 - k)).toFixed(3) + ")";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 9 + k * 5, -0.9 + k * 1.5, 0.7 + k * 1.5);
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

/* ---------- 프레임 선택 ---------- */
function pcFrame(e){
  /* [set, frameIndex, flip] */
  var face = e.face || 0, flip = (face === 3), dk = (face === 1 || face === 3) ? "w" : (face === 2 ? "n" : "s");
  if(deadFlag && typeof P.deathT === "number"){
    var de = T - P.deathT, r = PCS.img.death;
    var fi = Math.min(r.n - 1, Math.floor(de / (PCS.DIE_DUR / r.n)));
    return ["death", Math.max(0, fi), flip];
  }
  if(T - e.atkT < PCS.ATK_DUR){
    /* knight_attack_sheet_48px.png 원본은 idle/walk(_west)와 반대로 "동쪽"을 기준으로 그려져 있다.
       그대로 flip(=face===3)을 쓰면 서쪽/동쪽 공격 스윙이 실제 진행 방향과 좌우 반대로 보인다
       (버그 리포트: "기사 공격 모션이 좌우가 반대로 설정되어있음" — Playwright로 west/east 스윙 방향을
       실측 후 확인). 공격만 flip 조건을 반전시켜 idle/walk와 같은 방향으로 스윙하게 한다. */
    /* P2 공격 선딜 — 내려치기 무게감을 주려고 첫 프레임(칼을 든 예비 동작)만 0.09초
       붙잡아 두고, 나머지 프레임은 남은 시간에 균등 배분한다(기존엔 4프레임 균등 분할). */
    var ae = T - e.atkT, ra = PCS.img.attack, HOLD0 = 0.09, fi;
    if(ra.n <= 1){ fi = 0; }
    else if(ae < HOLD0){ fi = 0; }
    else{ var per = (PCS.ATK_DUR - HOLD0) / (ra.n - 1); fi = 1 + Math.floor((ae - HOLD0) / per); }
    fi = Math.min(ra.n - 1, Math.max(0, fi));
    return ["attack", fi, face !== 3];
  }
  if(T - e.mv < 0.16){var PP=[0,1,2,3,2,1];return ["walk_" + dk, PP[Math.floor((e.anim || 0)*1.4)%6], flip];}
  return ["idle_" + dk, 0, flip];
}
/* 공격 런지 — 타겟 방향으로 3px 나갔다가 복귀 */
function pcLunge(e){
  var el = T - e.atkT;
  if(el < 0 || el > PCS.ATK_DUR) return {x:0, y:0};
  var k = el / PCS.ATK_DUR;
  var amt = (k < 0.5) ? (k / 0.5) : (1 - (k - 0.5) / 0.5);
  var v = FACE_PUSH[e.face || 0];
  return {x: v[0] * PCS.LUNGE * amt, y: v[1] * PCS.LUNGE * amt};
}

/* ---------- 메인 드로우 ---------- */
function drawKnightSheet(e, sx, sy){
  var f = pcFrame(e), rec = PCS.img[f[0]];
  if(!rec || !rec.ok) return false;
  var lu = pcLunge(e), kn = hitKnock(e);
  var dx = sx - rec.fw / 2 + lu.x + kn.x;
  var dy = sy - rec.fh + lu.y + kn.y;      /* 앵커 = 하단 중앙 */
  if(f[0].indexOf("walk")===0)dy += Math.round(Math.sin((e.anim||0)*4.4)*1.2);  /* 보행 바운스 */
  drawSpriteFX(rec.img, f[1] * rec.fw, 0, rec.fw, rec.fh, dx, dy, f[2], hitTint(e));
  if(f[0] === "attack") drawAttackFx(e, sx + lu.x, sy + lu.y, "k");
  return true;
}
/* 현재 프레임 높이 — 이름표/버프 아이콘을 스프라이트 위로 올리는 데 쓴다 */
function pcTopOffset(){
  if(!pcUseSheet()) return 0;
  var f = pcFrame(P), rec = PCS.img[f[0]];
  return (rec && rec.ok) ? rec.fh : 0;
}
pcSheetInit();
