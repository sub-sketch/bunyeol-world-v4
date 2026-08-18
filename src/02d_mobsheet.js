/* ================= 몬스터 / NPC 스프라이트 시트 (Phase 2) =================
   기사(02c_pcsheet.js)와 **같은 규격**을 쓴다. 스프라이트 공장이 뽑아 주는 파일명 그대로다.

     {몹}_final_south_48px.png        대기 남   (낱장)
     {몹}_final_west_48px.png         대기 서   (동은 서를 좌우반전)
     {몹}_final_north_48px.png        대기 북
     {몹}_walk_south_sheet_48px.png   걷기 남   (가로 4프레임)
     {몹}_walk_west_sheet_48px.png    걷기 서
     {몹}_walk_north_sheet_48px.png   걷기 북
     {몹}_attack_sheet_48px.png       공격     (가로 4프레임, 셀 52px)
     {몹}_death_sheet_v2_48px.png     사망     (가로 4프레임)

   앵커 = 하단 중앙(발). 방향 규약: 0=S 1=W 2=N 3=E, E 는 W 의 좌우반전.
   ★ 서쪽 에셋은 반드시 '왼쪽을 보고' 있어야 한다. 기사 초기 에셋이 이걸 어겨서
     좌우가 뒤집혀 보이는 버그가 있었다.

   폴백: 파일이 하나라도 없거나 로드 실패하면 그 몹은 기존 절차 생성(drawActor)으로 돌아간다.
        몹별로 독립이라, 늑대만 에셋이 있어도 늑대만 시트로 그린다.
   ========================================================================= */
var MOBSHEET = (typeof MOBSHEET !== "undefined") ? MOBSHEET : {};   /* build.py 주입 */

var MSH = {
  need: ["idle_s","idle_w","idle_n","walk_s","walk_w","walk_n","attack","death"],
  set: {},          /* name -> {img:{key:{img,fw,fh,n}}, ok, loaded, failed} */
  tried: false,
  ATK_DUR: 0.42,
  DIE_DUR: 0.80
};

function mobSheetInit(){
  if(MSH.tried) return;
  MSH.tried = true;
  var name;
  for(name in MOBSHEET)(function(nm){
    var srcs = MOBSHEET[nm];
    var rec = { img:{}, ok:false, loaded:0, failed:0, want:0 };
    MSH.set[nm] = rec;
    MSH.need.forEach(function(k){
      var src = srcs[k];
      if(!src){ rec.failed++; return; }
      rec.want++;
      var im = new Image();
      im.onload = function(){
        if(!im.naturalWidth){ rec.failed++; return; }
        var fh = im.naturalHeight;
        /* 걷기·공격·사망은 가로 4프레임, 대기는 1프레임 */
        var n = (k.indexOf("walk")===0 || k==="attack" || k==="death") ? 4 : 1;
        rec.img[k] = { img:im, fw:Math.round(im.naturalWidth/n), fh:fh, n:n };
        rec.loaded++;
        if(rec.loaded >= rec.want) rec.ok = true;
      };
      im.onerror = function(){ rec.failed++; };
      try{ im.src = src; }catch(e){ rec.failed++; }
    });
    if(rec.want === 0) rec.ok = false;
  })(name);
}

/* ================= R19b 변종 — 원종 시트를 색만 바꿔 재사용 =================
   대표 지시: "몬스터는 재사용하면서 색상만 변경 — 일반 늑대 / 붉은 늑대 / 검은 늑대".
   data/variants.json → build.py 가 MOBS["wolf@red"] 에 vb(원종 시트) / vt(색 보정)을 심어 둔다.
   여기서는 그 원종 시트 8장을 캔버스에 **한 번만** 다시 칠해 MSH.set 에 등록한다.
   에셋 파일은 늘지 않는다(용량 증가 0). 8장 × 48px 라 굽는 비용은 밀리초 단위다.

   ★ 02c 의 tintSheetImage 를 그대로 쓰면 안 된다. 그건 '사람 옷만' 칠하려고
     피부·가죽(난색)과 무채색을 **보호**한다. 몹은 정반대다 — 늑대 회색 털, 백골병 뼈처럼
     무채색이 몸의 대부분이라, 무채색을 보호하면 색이 하나도 안 바뀐다(실측: 늑대 변화 0).
     그래서 몹용은 (1) 색조를 절대값으로 고정(hset)하고 (2) 무채색을 tone 으로 착색한다. */
var MTINT_VMIN = 0.10;          /* 이보다 어두운 픽셀은 색조를 건드리지 않는다(윤곽 보존) */
var MTINT_SMIN = 0.15;          /* 이보다 채도가 낮으면 '무채색' — tone 으로 착색 */

function tintMobImage(img, sp){
  if(!sp) return img;
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  if(!(w > 0 && h > 0)) return img;
  var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  var g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  var dat;
  try{ dat = g.getImageData(0, 0, w, h); }catch(e){ return img; }   /* 보안 제약 시 원본 유지 */
  var px = dat.data, i;
  var HSET = (sp.hset === undefined || sp.hset === null) ? null : (((sp.hset % 360) + 360) % 360) / 360;
  var DH = (sp.dh || 0) / 360;
  var DS = (sp.ds === undefined ? 1 : sp.ds), DV = (sp.dv === undefined ? 1 : sp.dv);
  var TN = sp.tone || null, TH = TN ? ((((TN.h || 0) % 360) + 360) % 360) / 360 : 0;
  var TS = TN ? (TN.s === undefined ? 0.4 : TN.s) : 0;
  var VMIN = (sp.vMin === undefined ? MTINT_VMIN : sp.vMin);
  var SMIN = (sp.sMin === undefined ? MTINT_SMIN : sp.sMin);
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
    var h2 = hh, s2 = s, v2 = Math.max(0, Math.min(1, v * DV));   /* 명도는 전 픽셀에 적용 */
    if(v >= VMIN){
      if(s < SMIN){                       /* 무채색(털·뼈) — 착색해야 색이 바뀐다 */
        if(TN){ h2 = TH; s2 = TS; }
      }else{                              /* 채색 픽셀 — 계보 색으로 고정하거나 회전 */
        h2 = (HSET !== null) ? HSET : (hh + DH);
        s2 = Math.max(0, Math.min(1, s * DS));
      }
    }
    h2 = h2 % 1; if(h2 < 0) h2 += 1;
    var ii = Math.floor(h2 * 6), f = h2 * 6 - ii;
    var pp = v2 * (1 - s2), q = v2 * (1 - f * s2), t = v2 * (1 - (1 - f) * s2), R, G, B;
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

/* 변종 시트를 굽는다. 원종이 아직 로드 중이면 false — 다음 프레임에 다시 시도한다. */
function mobVariantEnsure(vk){
  var have = MSH.set[vk];
  if(have) return !!have.ok;
  var d = (typeof MOBS !== "undefined") ? MOBS[vk] : null;
  if(!d || !d.vt) return false;
  var bk = d.vb || String(vk).split("@")[0], bs = MSH.set[bk];
  if(!bs || !bs.ok) return false;                  /* 아직 원종 미로드 — 캐시하지 않는다 */
  var rec = { img:{}, ok:false, loaded:0, failed:0, want:0, variantOf:bk }, k;
  for(k in bs.img){
    var r = bs.img[k];
    rec.img[k] = { img: tintMobImage(r.img, d.vt), fw: r.fw, fh: r.fh, n: r.n };
    rec.want++; rec.loaded++;
  }
  rec.ok = rec.want > 0;
  MSH.set[vk] = rec;
  return rec.ok;
}

/* 몹 데이터에서 시트 이름을 찾는다. 몹 키(wolf) 우선, 없으면 act 키(wolf) */
function mobSheetName(m){
  if(!m) return null;
  if(m.k && MSH.set[m.k]) return m.k;
  if(m.k && String(m.k).indexOf("@") > 0){         /* R19b 변종 */
    if(mobVariantEnsure(m.k)) return m.k;
    var bk = (m.d && m.d.vb) || String(m.k).split("@")[0];
    if(MSH.set[bk]) return bk;                     /* 원종 로드 전 한두 프레임 — 원색으로 */
  }
  if(m.k && MSH.set["npc_" + m.k]) return "npc_" + m.k;   /* 공장 NPC 시트는 npc_ 접두 */
  if(m.d && m.d.act && MSH.set[m.d.act]) return m.d.act;
  return null;
}

function mobSheetReady(nm){
  var r = nm && MSH.set[nm];
  return !!(r && r.ok);
}

/* [세트키, 프레임번호, 좌우반전] — 기사 pcFrame 과 같은 규칙 */
function mobFrame(e, nm){
  var rec = MSH.set[nm];
  var face = e.face || 0, flip = (face === 3);
  var dk = (face === 1 || face === 3) ? "w" : (face === 2 ? "n" : "s");
  if(e.dead && typeof e.deathT === "number" && rec.img.death){
    /* P2 사망 연출 — 쓰러지는 첫 프레임을 0.12초 붙잡아 두어 무게감을 준 뒤
       나머지 프레임을 남은 시간에 균등 배분한다(기존엔 4프레임 균등 분할). */
    var de = T - e.deathT, rd = rec.img.death, HOLD0 = 0.12, fi;
    if(rd.n <= 1){ fi = 0; }
    else if(de < HOLD0){ fi = 0; }
    else{ var per = (MSH.DIE_DUR - HOLD0) / (rd.n - 1); fi = 1 + Math.floor((de - HOLD0) / per); }
    fi = Math.min(rd.n - 1, Math.max(0, fi));
    return ["death", fi, flip];
  }
  if(rec.img.attack && T - (e.atkT||-9) < MSH.ATK_DUR){
    var ae = T - e.atkT, ra = rec.img.attack;
    return ["attack", Math.min(ra.n-1, Math.floor(ae/(MSH.ATK_DUR/ra.n))), flip];
  }
  if(T - (e.mv||-9) < 0.16 && rec.img["walk_"+dk]){
    /* 핑퐁 재생: 0-1-2-3-2-1 — 4프레임을 6박자로 왕복시켜
       접지→통과→반대 접지의 흐름이 이어진다. '까닥까닥' 반감. */
    var PP = [0,1,2,3,2,1];
    return ["walk_"+dk, PP[Math.floor(Math.abs(e.anim||0)*1.4)%6], flip];
  }
  return ["idle_"+dk, 0, flip];
}

function drawMobSheet(nm, e, sx, sy, scale){
  var rec = MSH.set[nm];
  if(!rec || !rec.ok) return false;
  var f = mobFrame(e, nm), r = rec.img[f[0]];
  if(!r) r = rec.img.idle_s;
  if(!r) return false;
  scale = scale || 1;
  var w = r.fw*scale, h = r.fh*scale;
  var dx = sx - w/2, dy = sy - h;              /* 앵커 = 하단 중앙 */
  if(f[0].indexOf("walk")===0){                /* 보행 바운스 — 보폭의 무게감 */
    dy += Math.round(Math.sin(Math.abs(e.anim||0)*4.4)*1.2*scale);
  }
  /* 피격 반짝임은 기사와 같은 헬퍼를 쓴다 */
  drawSpriteFX(r.img, f[1]*r.fw, 0, r.fw, r.fh, dx, dy, f[2], hitTint(e), null, w, h);
  return true;
}

/* ================= R23 변신체 그리기 (유저가 쓴 형상) =================
   대표 지시: "변신이 예전 픽셀 캐릭터로 지정되어있음" → 이제 **몹 스프라이트 시트를 그대로 쓴다.**
             "유저가 변신한경우는 색상을 다르게 기본 색상에 테두리에 노란색 띠를 두르는 형태로"
             → 색을 바꾸지 않는다(원색 유지). 실루엣 바깥으로 1px 노란 띠만 두른다.
                같은 종의 몬스터가 옆에 서 있어도 "노란 테두리 = 플레이어" 로 즉시 구분된다.

   왜 프레임을 따로 굽는가: 시트는 프레임이 가로로 붙은 띠다. 띠 위에서 1px 씩 밀어 그리면
   옆 프레임 픽셀이 번져 들어온다. 그래서 프레임 하나를 (fw+2)x(fh+2) 캔버스로 떠내
   테두리를 두르고 캐시한다 — 변신은 한 마리뿐이라 캐시가 몇 장으로 끝난다. */
var TFRIM = {}, TF_RIM_COL = "#ffd24a";
function tfRimFrame(nm, set, fi){
  var key = nm + "|" + set + "|" + fi, hit = TFRIM[key];
  if(hit) return hit;
  var rec = MSH.set[nm]; if(!rec || !rec.ok) return null;
  var r = rec.img[set]; if(!r) return null;
  var W = r.fw + 2, H = r.fh + 2, i;
  var sil = document.createElement("canvas"); sil.width = W; sil.height = H;
  var sg = sil.getContext("2d"); sg.imageSmoothingEnabled = false;
  var OFF = [[0,1],[2,1],[1,0],[1,2],[0,0],[2,0],[0,2],[2,2]];
  for(i = 0; i < OFF.length; i++)
    sg.drawImage(r.img, fi*r.fw, 0, r.fw, r.fh, OFF[i][0], OFF[i][1], r.fw, r.fh);
  sg.globalCompositeOperation = "source-atop";       /* 실루엣을 통째로 노랗게 */
  sg.fillStyle = TF_RIM_COL; sg.fillRect(0, 0, W, H);
  sg.globalCompositeOperation = "source-over";
  var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  var g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(sil, 0, 0);
  g.drawImage(r.img, fi*r.fw, 0, r.fw, r.fh, 1, 1, r.fw, r.fh);   /* 원색 본체를 위에 */
  TFRIM[key] = cv;
  return cv;
}
/* 변신한 플레이어를 그린다. 성공하면 true — 실패하면 호출부가 예전 드로잉으로 폴백한다. */
function drawTfSheet(actKey, e, sx, sy, scale){
  var nm = (MSH.set[actKey] ? actKey : null);
  if(!nm) return false;
  var rec = MSH.set[nm];
  if(!rec.ok) return false;
  var f = mobFrame(e, nm), set = f[0];
  if(!rec.img[set]) set = "idle_s";
  var r = rec.img[set]; if(!r) return false;
  var cv = tfRimFrame(nm, set, f[1]); if(!cv) return false;
  scale = scale || 1;
  var w = cv.width*scale, h = cv.height*scale;
  /* 앵커 맞추기 — 본체는 캔버스 안에서 1px 들어가 있으므로 그만큼 내려 그려야 발이 같은 자리에 선다 */
  var dx = sx - w/2, dy = sy + scale - h;
  if(set.indexOf("walk") === 0) dy += Math.round(Math.sin(Math.abs(e.anim||0)*4.4)*1.2*scale);
  drawSpriteFX(cv, 0, 0, cv.width, cv.height, dx, dy, f[2], hitTint(e), null, w, h);
  return true;
}

/* 자동 초기화 — 파일이 없으면 조용히 폴백한다 */
mobSheetInit();
