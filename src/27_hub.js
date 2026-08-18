/* ================= R21 거점(허브) 화면 =================
   대표 지시: "마을 거점을 배경으로 넣고 지역별로 배경만 교체하고, 상점·버프신전·길드(퀘스트 받는곳)·
   노드설정·인벤토리를 우측에 배열해서 하나씩 입장해서 작업하는 방식이 더 구성하기 좋을듯.
   배경이미지로 동·서대륙·마경 느낌 넣고, 동대륙은 무당 베이스 / 서대륙은 신관 베이스라 분위기만 다르게."

   ── 왜 이렇게 짰는가 ──────────────────────────────────────────────
   ① **시설 5종은 이미 다 있다.** 상점(12_shop) · 축복(12b_service) · 퀘스트(16_quest) ·
      영구성장 노드(25_meta) · 인벤토리(08_inventory). 그래서 이 파일은 기능을 새로 만들지 않고
      **입장 방식만 바꾸는 껍데기**다 — 레일 버튼이 기존 패널을 연다. 로직 중복이 없다.
   ② **배경 그림은 여기서 못 만든다**(아트 생성은 PC 스프라이트 공장 전용). 그래서 HUBS[].bg 가
      비어 있으면 mood 색으로 **절차 배경**을 그려 자리를 채운다. 그림이 나오면 bg 에 파일명 한 줄.
   ③ 지역은 데이터(data/hubs.json)로만 늘어난다 — 확장팩이 merge.HUBS 로 거점을 하나 더 붙일 수 있다.

   ⚠ 지금은 **이행 단계**다. 성읍의 퀘스트·대화는 아직 걸어다니는 마을(존 0)의 NPC에 붙어 있어서,
     레일에 「마을 거닐기」를 남겨 두었다. 퀘스트를 길드 화면으로 옮기면 그 버튼을 지우면 된다.
   ================================================================== */
var HUBS = (typeof HUBS !== "undefined") ? HUBS : [];
var HUB = { id: null, open: false };

function hubDef(id){
  var i;
  for(i = 0; i < HUBS.length; i++) if(HUBS[i].id === id) return HUBS[i];
  return HUBS[0] || null;
}
/* 이 거점이 열렸는가 — req 는 META 플래그(clear1/clear2 …) */
function hubUnlocked(h){
  if(!h || !h.req) return true;
  return !!(typeof META !== "undefined" && META && META[h.req]);
}
function hubList(){ return HUBS.filter(hubUnlocked); }

/* ---------- 절차 배경 (그림이 없을 때) ----------
   그림 대신 '분위기'만이라도 지역마다 다르게 보이도록 하늘·원경 실루엣·근경을 색으로 깐다.
   실제 배경화(hub_*.jpg)가 들어오면 이 함수는 안 불린다. */
function hubBgPaint(cv, h){
  var g = cv.getContext("2d"), W = cv.width, H = cv.height;
  var m = (h && h.mood) || { sky:[212,26,30], far:[220,18,20], near:[26,12,16], warm:[38,62,58] };
  var sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, hsl(m.sky[0], m.sky[1], m.sky[2]));
  sky.addColorStop(1, hsl(m.sky[0], Math.max(0, m.sky[1] - 6), Math.max(4, m.sky[2] * 0.45)));
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  var rng = mulberry32((h && h.id ? h.id.length * 977 : 7) + 13);
  var i, x, bw, bh, by = Math.round(H * 0.64);
  /* 원경 — 건물/산 실루엣 두 겹 */
  g.fillStyle = hsl(m.far[0], m.far[1], m.far[2]);
  for(x = -20; x < W + 20; ){
    bw = 40 + Math.floor(rng() * 90); bh = 40 + Math.floor(rng() * 120);
    g.fillRect(x, by - bh, bw, bh + 10);
    x += bw + 6;
  }
  g.fillStyle = hsl(m.far[0], m.far[1], Math.max(3, m.far[2] - 7));
  for(x = -30; x < W + 30; ){
    bw = 60 + Math.floor(rng() * 110); bh = 24 + Math.floor(rng() * 70);
    g.fillRect(x, by - bh + 26, bw, bh + 20);
    x += bw + 10;
  }
  /* 근경 바닥 */
  var gr = g.createLinearGradient(0, by, 0, H);
  gr.addColorStop(0, hsl(m.near[0], m.near[1], m.near[2] + 4));
  gr.addColorStop(1, hsl(m.near[0], m.near[1], Math.max(2, m.near[2] - 5)));
  g.fillStyle = gr; g.fillRect(0, by + 18, W, H - by);
  /* 등불 몇 개 — 지역 온기 */
  for(i = 0; i < 7; i++){
    var lx = Math.round(rng() * W), ly = by - Math.round(rng() * 90);
    var rad = g.createRadialGradient(lx, ly, 0, lx, ly, 26);
    rad.addColorStop(0, "hsla(" + m.warm[0] + "," + m.warm[1] + "%," + m.warm[2] + "%,.55)");
    rad.addColorStop(1, "hsla(" + m.warm[0] + "," + m.warm[1] + "%," + m.warm[2] + "%,0)");
    g.fillStyle = rad; g.fillRect(lx - 26, ly - 26, 52, 52);
    g.fillStyle = hsl(m.warm[0], m.warm[1], Math.min(88, m.warm[2] + 22));
    g.fillRect(lx - 1, ly - 2, 3, 4);
  }
  /* 위·아래 비네트 — 위의 자원바와 아래 버튼이 글자로 읽히게 */
  var vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, "rgba(4,3,8,.72)"); vg.addColorStop(0.28, "rgba(4,3,8,0)");
  vg.addColorStop(0.72, "rgba(4,3,8,0)"); vg.addColorStop(1, "rgba(4,3,8,.8)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/* ---------- 시설 정의 — 여는 것은 전부 기존 패널이다 ---------- */
var HUB_FAC = [
  { k:"guild",  ic:"scroll", d:"길드 · 퀘스트", fn:function(){ if(typeof openP === "function") openP("quest"); } },
  { k:"shop",   ic:"bag",    d:"상점",         fn:function(){ if(typeof openShop === "function") openShop(); } },
  { k:"shrine", ic:"chalice",d:"버프 신전",     fn:function(){ hubShrine(); } },
  { k:"node",   ic:"gem",    d:"노드 설정",     fn:function(){ if(typeof openMeta === "function") openMeta(); } },
  { k:"inv",    ic:"pack",   d:"인벤토리",      fn:function(){ if(typeof openP === "function") openP("inv"); } },
  /* R27 — 워프 관리자(대표 지시). 클리어해서 열린 부의 진입층으로 곧바로 내려간다. */
  { k:"warp",   ic:"gate",   d:"워프 관리자",   fn:function(){ if(typeof openP === "function") openP("warp"); } }
];

/* 레일 아이콘 — 노드판과 같은 방식으로 캔버스에 그려 dataURL 로 쓴다(폰트 글리프에 의존하지 않는다) */
var HICO = {};
function hubIcoUrl(kind, col){
  var key = kind + "|" + col, u = HICO[key];
  if(u) return u;
  var cv = document.createElement("canvas"); cv.width = 24; cv.height = 24;
  var g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  var L = "rgba(255,255,255,.92)", D = "rgba(0,0,0,.45)";
  function R(x,y,w,h,c){ g.fillStyle = c; g.fillRect(x,y,w,h); }
  switch(kind){
    case "scroll":                                  /* 두루마리 — 퀘스트 */
      R(4,3,16,3,col); R(5,6,14,12,col); R(4,18,16,3,col);
      R(7,9,10,1,D); R(7,12,10,1,D); R(7,15,7,1,D); R(5,6,2,12,L); break;
    case "bag":                                     /* 자루 — 상점 */
      R(8,3,8,3,col); R(6,6,12,4,col); R(4,10,16,10,col); R(6,20,12,2,D);
      R(7,12,3,6,L); break;
    case "chalice":                                 /* 성배 — 축복 */
      R(5,4,14,3,col); R(6,7,12,5,col); R(8,12,8,3,col); R(11,15,2,4,col);
      R(7,19,10,3,col); R(7,5,3,6,L); break;
    case "gem":                                     /* 원석 — 노드 */
      R(9,3,6,2,col); R(6,5,12,3,col); R(4,8,16,7,col); R(7,15,10,4,col); R(10,19,4,2,col);
      R(8,7,3,7,L); break;
    case "pack":                                    /* 배낭 — 인벤토리 */
      R(9,2,6,3,col); R(5,5,14,15,col); R(5,20,14,2,D);
      R(9,9,6,5,D); R(7,7,2,11,L); break;
    case "gate":                                    /* 문 — 워프 관리자 */
      R(4,4,16,3,col); R(4,7,3,14,col); R(17,7,3,14,col);
      R(7,9,10,12,D); R(9,11,6,8,L); R(11,19,2,2,col); break;
    case "walk":                                    /* 발자국 — 마을 거닐기(이행용) */
      R(5,5,5,7,col); R(5,12,5,2,col); R(13,10,5,7,col); R(13,17,5,2,col); break;
    default:
      R(6,6,12,12,col); R(8,8,4,4,L);
  }
  u = cv.toDataURL("image/png"); HICO[key] = u; return u;
}

/* ---------- 화면 ---------- */
function hubShow(id){
  if(!HUBS.length) return false;
  var h = hubDef(id || HUB.id || (HUBS[0] && HUBS[0].id));
  if(!hubUnlocked(h)) h = hubList()[0] || h;
  HUB.id = h.id; HUB.open = true;
  if(P) qRegEnter(h.id);
  var ov = document.getElementById("hubov");
  if(!ov) return false;
  ov.style.display = "block";
  hubRender();
  return true;
}
function hubHide(){
  HUB.open = false;
  var ov = document.getElementById("hubov");
  if(ov) ov.style.display = "none";
}
function hubSwitch(id){
  var h = hubDef(id);
  if(!hubUnlocked(h)){
    if(typeof log === "function") log("아직 닿지 않은 땅입니다.", "#ff8a6a");
    return;
  }
  HUB.id = id; hubRender();
  if(typeof sfx === "function") sfx("port");
  qRegEnter(id);
}
/* R27 — 지역을 옮기면 그 지역 의뢰 사슬로 갈아탄다.
   대표 지시: "동대륙오면 퀘스트가 새로워져야하는데 동일하게 연속으로 넘어와버림". */
function qRegEnter(id){
  if(!P || typeof qChain !== "function") return;
  P.qreg = id;
  if(typeof refreshQuest === "function") refreshQuest();
  var ch = qChain(id), open = ch.filter(function(q){ return qAvail(q); });
  if(!P.qseen) P.qseen = {};
  if(!P.qseen[id] && ch.length){
    P.qseen[id] = 1;
    var inf = (typeof hubFacInfo === "function") ? hubFacInfo("guild") : null;
    if(typeof log === "function")
      log("<b>" + ((inf && inf.n) || "길드") + "</b> — 이곳의 의뢰는 따로 걸려 있습니다. 게시판을 보십시오. [J]", "#e8d36e");
  }
  if(open.length && typeof log === "function")
    log("새 의뢰 " + open.length + "건 — <b>" + QUESTS[open[0]].n + "</b> 부터 받을 수 있습니다.", "#ffdf00");
}
function hubFacInfo(k){
  var h = hubDef(HUB.id);
  return (h && h.fac && h.fac[k]) ? h.fac[k] : { n:k, who:"", line:"" };
}
function hubEnter(k){
  var i, f = null;
  for(i = 0; i < HUB_FAC.length; i++) if(HUB_FAC[i].k === k) f = HUB_FAC[i];
  if(!f) return;
  var inf = hubFacInfo(k);
  if(typeof log === "function" && inf.line)
    log("<b>" + inf.n + "</b>" + (inf.who ? " · " + inf.who : "") + " — " + inf.line, "#c9c0a8");
  if(typeof sfx === "function") sfx("click");
  /* ★ R23 — 시설은 **자기 배경 화면**으로 들어간다(대표 지시: "누르면 새로운 배경화면에서 …
     좌측 상점 우측 인벤토리 이런식으로 크게 정렬"). 패널은 28_facroom.js 가 그 화면으로 옮겨 붙인다.
     신전만 예외로 배경을 깔고 그 위에 기존 대화창(#dlg)을 띄운다 — 축복 흐름이 대화창에 붙어 있다. */
  if(typeof facShow === "function" && typeof FAC_DOCK !== "undefined" && FAC_DOCK[k]){
    facShow(k);
    if(k === "shrine") hubShrine();
    return;
  }
  try{ f.fn(); }catch(e){ if(typeof log === "function") log("아직 열 수 없습니다.", "#f88"); }
}
/* 이행용 — 걸어다니는 성읍으로 (퀘스트 NPC가 아직 거기 있다) */
function hubWalk(){
  HUB_SKIP = true;                 /* 이번 도착에는 허브를 띄우지 않는다 */
  hubHide();
  if(typeof travel === "function") travel(0, 10, 9);
}

function hubRender(){
  var h = hubDef(HUB.id);
  if(!h) return;
  var cv = document.getElementById("hubbg");
  if(cv){
    /* ★ 캔버스 픽셀 크기를 화면 크기에 맞춘다. 안 맞추면 960x600 을 CSS 로 늘려 그리므로
       실루엣이 가로로 눌리고 등불이 번진다(첫 시제품에서 확인). */
    var rc = cv.getBoundingClientRect();
    var W2 = Math.max(320, Math.round(rc.width || 960)), H2 = Math.max(240, Math.round(rc.height || 600));
    if(cv.width !== W2 || cv.height !== H2){ cv.width = W2; cv.height = H2; }
    if(h.bg && typeof HUBART !== "undefined" && HUBART[h.bg]){
      var im = new Image();
      im.onload = function(){
        var g = cv.getContext("2d"), W3 = cv.width, H3 = cv.height;
        g.clearRect(0, 0, W3, H3);
        /* ★ 늘려 붙이지 않는다(cover). 공장 일러스트는 16:9 로 뽑는데(그 규격이 이미 검증된 경로다)
           허브 화면은 8:5 라, 통째로 늘리면 건물이 가로로 눌린다. 그래서 짧은 쪽을 채우고
           넘치는 부분을 가운데 기준으로 잘라낸다 — 비율이 안 망가진다.
           프롬프트에서 '오른쪽 1/3·상단 15%·하단 중앙은 단순하게' 를 요구해 두었으므로
           잘려도 중요한 것이 사라지지 않는다. */
        /* R27 — 시설 화면과 같은 규칙: **자르지 않는다(contain)**. 창을 세로로 길게 쓰면
           cover 는 위아래를 크게 잘라 간판·인물이 날아간다(대표 리포트). 남는 자리는
           같은 그림을 흐리게 깐 배경으로 채운다. */
        var scv = Math.min(W3 / im.width, H3 / im.height);
        var dw = im.width * scv, dh = im.height * scv;
        if(dw < W3 - 1 || dh < H3 - 1){
          var sc2 = Math.max(W3 / im.width, H3 / im.height) * 1.08;
          var bw = im.width * sc2, bh = im.height * sc2;
          g.save();
          try{ g.filter = "blur(14px) brightness(0.82)"; }catch(e){}
          g.drawImage(im, Math.round((W3 - bw) / 2), Math.round((H3 - bh) / 2), Math.round(bw), Math.round(bh));
          g.restore();
          g.fillStyle = "rgba(6,5,12,.24)"; g.fillRect(0, 0, W3, H3);
        }
        g.drawImage(im, Math.round((W3 - dw) / 2), Math.round((H3 - dh) / 2), Math.round(dw), Math.round(dh));
        /* 그림 위에도 같은 비네트 — UI 글자가 읽히게 (절차 배경과 같은 처리) */
        var vg2 = g.createLinearGradient(0, 0, 0, H3);
        vg2.addColorStop(0, "rgba(4,3,8,.66)"); vg2.addColorStop(0.26, "rgba(4,3,8,0)");
        vg2.addColorStop(0.74, "rgba(4,3,8,0)"); vg2.addColorStop(1, "rgba(4,3,8,.74)");
        g.fillStyle = vg2; g.fillRect(0, 0, W3, H3);
      };
      im.src = HUBART[h.bg];
    }else{
      hubBgPaint(cv, h);          /* 그림 없음 — 절차 배경 */
    }
  }
  /* 상단 — 지역 탭 + 자원 */
  var top = document.getElementById("hubtop");
  if(top){
    var t = '<div class="hubtabs">';
    HUBS.forEach(function(x){
      var on = (x.id === HUB.id), lk = !hubUnlocked(x);
      t += '<span class="hubtab' + (on ? ' on' : '') + (lk ? ' lk' : '') + '" '
         + 'onclick="hubSwitch(\'' + x.id + '\')">' + (lk ? '🔒 ' : '') + x.n + '</span>';
    });
    t += '</div><div class="hubres">';
    if(typeof P !== "undefined" && P){
      t += '<span>Lv <b>' + P.lv + '</b></span>';
      t += '<span>은화 <b style="color:#ffd24a">' + (P.gold || 0) + '</b></span>';
    }
    if(typeof META !== "undefined" && META) t += '<span>업적P <b style="color:#9fe2ff">' + META.pt + '</b></span>';
    t += '</div>';
    top.innerHTML = t;
  }
  var nm = document.getElementById("hubname");
  if(nm) nm.innerHTML = '<b>' + h.n + '</b><span>' + (h.tag || '') + '</span>';
  /* 우측 레일 */
  var rail = document.getElementById("hubrail");
  if(rail){
    var r = '';
    HUB_FAC.forEach(function(f){
      var inf = hubFacInfo(f.k);
      r += '<div class="hbtn" onclick="hubEnter(\'' + f.k + '\')" title="' + f.d + '">'
         + '<img src="' + hubIcoUrl(f.ic, "#e8d36e") + '" width="24" height="24" alt="">'
         + '<span>' + (inf.n || f.d) + '</span></div>';
    });
    r += '<div class="hbtn walk" onclick="hubWalk()" title="걸어다니는 성읍(이행용)">'
       + '<img src="' + hubIcoUrl("walk", "#9fe2ff") + '" width="24" height="24" alt="">'
       + '<span>마을 거닐기</span></div>';
    rail.innerHTML = r;
  }
}

/* 축복(버프 신전) — 기존 openBless() 를 그대로 쓴다. 그건 마을 사제 대화창(#dlg)에 그려지므로
   NPC 없이 그 창만 열어 준다. dlgStep() 은 부르지 않는다 — 그 함수만 DLG.npc 를 읽는다. */
function hubShrine(){
  if(typeof openBless !== "function"){
    if(typeof log === "function") log("이곳에서는 축복을 받을 수 없습니다.", "#ff8a6a");
    return;
  }
  var inf = hubFacInfo("shrine"), d = document.getElementById("dlg");
  if(!d) return;
  /* R24 — 시설 화면에서는 초상화 칸을 감춘다. 배경 그림에 사제·무당이 이미 크게 그려져 있어서
     빈 검은 사각형이 하나 더 붙으면 어색하다(실측 스크린샷). NPC 대화(16_quest.js)는 다시 켠다. */
  var pc = document.getElementById("dlgport");
  if(pc) pc.style.display = "none";
  var nmEl = document.getElementById("dlgname");
  if(nmEl) nmEl.innerHTML = inf.n + (inf.who ? ' <i>【' + inf.who + '】</i>' : '');
  if(typeof DLG !== "undefined"){ DLG.open = true; DLG.npc = null; DLG.lines = []; DLG.i = 0; }
  d.style.display = "block";
  openBless();
}

/* 원정 나서기 — 허브를 닫고 1부 진입점으로. runStart() 가 런을 열고 travel 한다. */
/* ================= R31 거점 = 그 지역의 부로 나선다 =================
   대표 리포트: "동대륙 넘어왔는데 맵이 서대륙이랑 동일하게 붙네 — 퀘스트는 새로운데."
   원인: 「원정 나서기」가 언제나 `RUN_ENTRY`(= **첫 부**의 진입점 = 서대륙 1층)로 들어갔다.
        거점을 동대륙으로 바꿔도 던전은 1부였다 — 그래서 지형이 서대륙과 똑같았다(퀘스트만 지역별로 갈렸다).
   수리: 거점 데이터에 `act` 를 두고(hubs.json), 그 부의 진입층으로 들어간다.
        아직 안 열린 부면 이유를 알려 주고 열린 마지막 부로 넣는다(길이 막혀 못 나가는 일 방지). */
function hubActId(){
  var h = hubDef(HUB.id);
  return (h && h.act) ? h.act : null;
}
function hubDepart(){
  var actId = hubActId();
  if(actId && typeof warpList === "function"){
    var open = warpList(), i, hit = null;
    for(i = 0; i < open.length; i++) if(open[i].id === actId) hit = open[i];
    if(hit){
      if(typeof warpTo === "function" && warpTo(actId)) return;
    }else if(typeof log === "function"){
      log("이 땅의 원정은 아직 열리지 않았습니다 — 앞 부의 보스를 넘으십시오.", "#ffb27a");
      if(open.length){                                  /* 열린 마지막 부로 넣어 준다 */
        if(typeof warpTo === "function" && warpTo(open[open.length - 1].id)) return;
      }
    }
  }
  hubHide();
  if(typeof runStart === "function" && runStart()) return;
  if(typeof travel === "function" && typeof RUN_ENTRY !== "undefined")
    travel(RUN_ENTRY.z, RUN_ENTRY.x, RUN_ENTRY.y);
}

/* ---------- travel 훅 ----------
   거점(존 0)에 도착하면 허브 화면을 띄운다 = "마을 거점을 배경 화면으로".
   ★ 「마을 거닐기」로 일부러 들어온 경우에는 띄우지 않는다 — 안 그러면 눌러도 허브가 다시 덮어
     걸어다니는 마을에 들어갈 수 없다. hubWalk 가 세운 표식을 한 번만 소모한다. */
var HUB_SKIP = false;
function hubOnTravel(zone){
  if(zone !== 0 || !HUBS.length) return;
  if(HUB_SKIP){ HUB_SKIP = false; return; }
  hubShow();
}

/* 창 크기가 바뀌면 절차 배경을 다시 그린다(늘어난 그림이 남지 않게) */
(function(){
  if(typeof window === "undefined" || !window.addEventListener) return;
  window.addEventListener("resize", function(){ if(HUB.open) hubRender(); });
})();
