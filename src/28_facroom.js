/* ================= R23 시설 화면 (거점 → 시설 입장) =================
   대표 지시:
     "상점에서 상점창 인벤토리가 겹치는 현상이 있어 판매하기가 어려움"
     "상점 버프 각인등 우측에 메뉴들은 누르면 **새로운 배경화면에서**(상점은 상점주인이 보이는 형태의
      그림 — 각 지역별 특색이 담긴 — 노스가드는 대장간에 간 것 같이 표현하는 등의 그림이 변경되면서)
      **좌측 상점 우측 인벤토리** 이런식으로 크게 정렬해야할듯"

   ── 어떻게 짰는가 ────────────────────────────────────────────────
   ① **패널을 새로 만들지 않는다.** 기존 #shop / #inv / #quest / #meta 엘리먼트를 이 화면의
      좌·우 슬롯으로 **옮겨 붙였다가**(도킹) 닫을 때 제자리로 돌려놓는다. 그래서 구매·판매·퀘스트·
      노드 로직이 한 줄도 복제되지 않는다. 렌더 함수(renderShop/refreshInv/…)는 id 로 찾으므로
      부모가 바뀌어도 그대로 동작한다.
   ② 겹침의 원인: #shop 은 화면 중앙 고정 모달(fixed)이고 #inv 는 #wrap 안(scale 되는 좌표)에
      떠 있었다. 서로 다른 좌표계라 배율·해상도에 따라 겹쳤고, 겹치면 판매 버튼이 가려졌다.
      이제 둘 다 같은 flex 행의 형제로 들어가므로 **구조적으로 겹칠 수 없다.**
   ③ 배경 그림은 `fac_<지역>_<시설>.jpg` 를 assets/ui 에 넣으면 HUBART 로 들어온다(build.py).
      없으면 mood 색으로 실내(절차 배경)를 그려 자리를 채운다 — 그림이 들어오면 이 함수는 안 불린다.
   ================================================================== */
var FAC = { open:false, k:null, step:null, home:{} };

/* 시설별 도킹 구성 — 어떤 패널을 놓을지.
   ★ R24 — 상점은 세 걸음으로 나눴다(대표 지시: "그림 뽑았는데 하나도 안 보이니깐 …
     첫 대사로 지역별 특색 멘트를 한번 하고, 구매하기/판매하기를 고르고, 그 목록만 띄우고,
     창을 반투명하게"). 그래서 상점의 슬롯 구성은 **단계(FAC.step)** 가 정한다:
        greet → 패널 없음(그림 전체 + 인사말) · buy → #shop 하나 · sell → #inv 하나
     신전은 대화창(#dlg)이 하단 고정이라 도킹하지 않는다. */
var FAC_DOCK = {
  shop:   [],                   /* 단계별로 결정 — facStepDock() */
  inv:    ["inv"],
  guild:  ["quest"],
  node:   ["meta"],
  warp:   ["warp"],
  shrine: []
};
function facStepDock(k, step){
  if(k !== "shop") return FAC_DOCK[k] || [];
  if(step === "buy")  return ["shop"];
  if(step === "sell") return ["inv"];
  return [];                    /* greet — 그림을 가리지 않는다 */
}
/* 배경 그림 파일명 규칙 — 지역별 특색을 파일로 갈아 끼운다.
   예) fac_seo_shop.jpg (노스가드 대장간 느낌) / fac_dong_shrine.jpg (굿청) */
function facArtName(hubId, k){ return "fac_" + hubId + "_" + k + ".jpg"; }

/* ---------- 절차 실내 배경 (그림이 없을 때) ----------
   허브의 절차 배경(27_hub.js) 위에 '실내' 느낌을 얹는다 — 어둡게 깔고, 카운터 실루엣과
   등불 한 점, 그리고 주인 자리에 사람 실루엣. 그림이 들어오면 안 불린다. */
function facBgPaint(cv, h, k){
  var g = cv.getContext("2d"), W = cv.width, H = cv.height;
  var m = (h && h.mood) || { sky:[212,26,30], far:[220,18,20], near:[26,12,16], warm:[38,62,58] };
  var wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, hsl(m.near[0], m.near[1] + 4, Math.max(4, m.near[2] - 2)));
  wall.addColorStop(1, hsl(m.near[0], m.near[1], Math.max(2, m.near[2] - 8)));
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  var fy = Math.round(H * 0.72);
  g.fillStyle = hsl(m.near[0], Math.max(0, m.near[1] - 4), Math.max(3, m.near[2] + 3));
  g.fillRect(0, fy, W, H - fy);                             /* 바닥 */
  g.fillStyle = "rgba(0,0,0,.35)";
  g.fillRect(0, fy - 3, W, 3);
  /* 등불 — 시설 온기 */
  var lx = Math.round(W * 0.30), ly = Math.round(H * 0.26);
  var rad = g.createRadialGradient(lx, ly, 0, lx, ly, Math.round(W * 0.34));
  rad.addColorStop(0, "hsla(" + m.warm[0] + "," + m.warm[1] + "%," + m.warm[2] + "%,.42)");
  rad.addColorStop(1, "hsla(" + m.warm[0] + "," + m.warm[1] + "%," + m.warm[2] + "%,0)");
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  /* 카운터 + 주인 실루엣 — 상점/신전/길드 모두 '누가 앉아 있는' 자리를 만든다 */
  var cwd = Math.round(W * 0.34), cx0 = Math.round(W * 0.13), cy0 = fy - Math.round(H * 0.10);
  g.fillStyle = "rgba(6,4,10,.72)";
  g.fillRect(cx0, cy0, cwd, Math.round(H * 0.16));
  g.fillStyle = "rgba(10,7,14,.85)";
  var px = cx0 + Math.round(cwd * 0.5), ph = Math.round(H * 0.20);
  g.fillRect(px - Math.round(W * 0.035), cy0 - ph, Math.round(W * 0.07), ph);          /* 몸 */
  g.beginPath();
  g.arc(px, cy0 - ph - Math.round(H * 0.03), Math.round(H * 0.035), 0, 6.2832);
  g.fill();                                                                            /* 머리 */
  /* 위·아래 비네트 — 글자가 읽히게 (허브와 같은 처리) */
  var vg = g.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, "rgba(4,3,8,.80)"); vg.addColorStop(0.32, "rgba(4,3,8,.20)");
  vg.addColorStop(1, "rgba(4,3,8,.72)");
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
}

/* ---------- 도킹 ---------- */
function facDock(id, slot){
  var el = document.getElementById(id);
  if(!el || !slot) return false;
  if(!FAC.home[id]) FAC.home[id] = { parent: el.parentNode, next: el.nextSibling };
  slot.appendChild(el);
  el.classList.add("fdock");
  el.style.display = "block";
  return true;
}
function facUndockAll(){
  var id;
  for(id in FAC.home){
    var el = document.getElementById(id), h = FAC.home[id];
    if(el && h && h.parent){
      el.classList.remove("fdock");
      el.style.display = "none";
      h.parent.insertBefore(el, h.next || null);
    }
  }
  FAC.home = {};
}

/* ---------- 화면 ---------- */
function facShow(k, step){
  var ov = document.getElementById("facov");
  if(!ov) return false;
  if(step === undefined) step = (k === "shop") ? "greet" : null;
  var list = facStepDock(k, step);
  facUndockAll();
  FAC.k = k; FAC.step = step; FAC.open = true;
  ov.style.display = "block";

  /* 배경 */
  var hb = (typeof hubDef === "function") ? hubDef(typeof HUB !== "undefined" ? HUB.id : null) : null;
  var cv = document.getElementById("facbg");
  if(cv){
    var rc = cv.getBoundingClientRect();
    var W2 = Math.max(320, Math.round(rc.width || 960)), H2 = Math.max(240, Math.round(rc.height || 600));
    if(cv.width !== W2 || cv.height !== H2){ cv.width = W2; cv.height = H2; }
    var fn = hb ? facArtName(hb.id, k) : null;
    /* R27 — 「짐 정리」(인벤토리)는 배경 그림을 두지 않는다(대표 지시: "짐정리에서 배경그림은 따로 두지말고").
       가방을 정리하는 화면은 그림이 필요 없고, 어두운 판 위가 아이콘·글자가 가장 잘 읽힌다. */
    if(k === "inv"){
      var gi = cv.getContext("2d");
      var lg = gi.createLinearGradient(0, 0, 0, cv.height);
      lg.addColorStop(0, "#0e0c16"); lg.addColorStop(1, "#07060c");
      gi.fillStyle = lg; gi.fillRect(0, 0, cv.width, cv.height);
    }else if(fn && typeof HUBART !== "undefined" && HUBART[fn]){
      var im = new Image();
      im.onload = function(){
        var g = cv.getContext("2d"), W3 = cv.width, H3 = cv.height;
        g.clearRect(0, 0, W3, H3);
        /* ★ R27 — 전체화면이 아닐 때 그림이 상하로 잘리는 문제 수리
           (대표 리포트: "전체화면이 아닐때 상하로 그림이 짤리는 현상이있는데 (상점 길드등에서)").
           원인: cover(짧은 쪽을 채우고 넘치는 쪽을 자름)로 그렸다. 그림은 16:9 인데 창을 세로로
           길게 쓰면 좌우를 채우려고 위아래를 크게 잘라내 상인 머리·간판이 날아간다.
           수리: **contain — 그림 전체가 반드시 들어간다.** 남는 자리는 같은 그림을 크게 늘려
           흐리게 깐 배경으로 채워 검은 띠가 보이지 않게 한다(요즘 세로 영상 배경과 같은 방식). */
        var scv = Math.min(W3 / im.width, H3 / im.height);
        var dw = im.width * scv, dh = im.height * scv;
        var dx = Math.round((W3 - dw) / 2), dy = Math.round((H3 - dh) / 2);
        if(dw < W3 - 1 || dh < H3 - 1){
          var sc2 = Math.max(W3 / im.width, H3 / im.height) * 1.08;   /* 채움용 확대본 */
          var bw = im.width * sc2, bh = im.height * sc2;
          g.save();
          /* R30 — 남는 자리 채움을 밝게. 실측(초광폭 2600x1007)에서 RGB 합 25 수준이라
             검은 띠처럼 보였다(대표 리포트: "그림이 롤백된 것 같다"). 0.55→0.85, 비네트도 낮춘다. */
          try{ g.filter = "blur(14px) brightness(0.85)"; }catch(e){}
          g.drawImage(im, Math.round((W3 - bw) / 2), Math.round((H3 - bh) / 2), Math.round(bw), Math.round(bh));
          g.restore();
          /* blur 를 지원하지 않는 브라우저(구형 사파리)용 — 어둡게 덮어 대비를 낮춘다 */
          g.fillStyle = "rgba(6,5,12,.26)";
          g.fillRect(0, 0, W3, H3);
        }
        g.drawImage(im, dx, dy, Math.round(dw), Math.round(dh));
        var vg = g.createLinearGradient(0, 0, 0, H3);
        vg.addColorStop(0, "rgba(4,3,8,.70)"); vg.addColorStop(0.34, "rgba(4,3,8,.18)");
        vg.addColorStop(1, "rgba(4,3,8,.62)");
        g.fillStyle = vg; g.fillRect(0, 0, W3, H3);
      };
      im.src = HUBART[fn];
    }else{
      facBgPaint(cv, hb, k);
    }
  }

  /* 간판 — 지역별 이름·주인·한 줄 대사 (data/hubs.json 한 곳에서 온다) */
  var inf = (typeof hubFacInfo === "function") ? hubFacInfo(k) : { n:k, who:"", line:"" };
  var nm = document.getElementById("facname");
  if(nm) nm.innerHTML = '<b>' + (inf.n || k) + '</b>'
    + '<span>' + (hb ? hb.n : "") + (inf.who ? ' · ' + inf.who : '') + '</span>'
    + (inf.line ? '<i>“' + inf.line + '”</i>' : '');

  /* 도킹 — 슬롯 개수에 따라 1단/2단 */
  var dock = document.getElementById("facdock");
  var A = document.getElementById("facslotA"), B = document.getElementById("facslotB");
  /* 1단(one) 은 가운데로 모아 1100px 로 묶는다 — 목록 하나가 초광폭으로 늘어나면 읽기 나쁘다.
     다만 노드판(node)은 4계열 + 설명 패널이라 폭을 풀어야 마지막 계열이 잘리지 않는다(wide).
     상점의 구매·판매 목록은 **한쪽으로 붙여**(side) 그림의 주인 쪽을 비워 둔다. */
  if(dock) dock.className = (list.length > 1) ? ""
    : ("one" + (k === "node" ? " wide" : "") + (k === "shop" ? " side" : ""));
  if(B) B.style.display = (list.length > 1) ? "flex" : "none";
  if(list[0]) facDock(list[0], A);
  if(list[1]) facDock(list[1], B);

  /* R24 상점 — 인사 → 구매/판매 → 목록. 말풍선과 버튼을 그림 위에 띄운다. */
  facTalkRender(k, step, inf);
  if(typeof facInfoClear === "function") facInfoClear();   /* R27 상세 패널은 화면을 바꿀 때 비운다 */

  /* 내용 채우기 — 각 패널의 기존 렌더 함수를 그대로 부른다 */
  if(k === "shop"){
    shopOpen = true;
    if(step === "buy" && typeof renderShop === "function") renderShop();
    if(step === "sell" && typeof refreshInv === "function") refreshInv();
  }else if(k === "inv"){
    if(typeof refreshInv === "function") refreshInv();
  }else if(k === "guild"){
    if(typeof refreshQuest === "function") refreshQuest();
  }else if(k === "node"){
    if(typeof renderMeta === "function") renderMeta();
  }else if(k === "warp"){
    if(typeof renderWarp === "function") renderWarp();
  }
  if(typeof sfx === "function") sfx("click");
  return true;
}

/* ---------- R24 상점 인사말 + 구매/판매 선택 ----------
   대표 지시: "첫 대사로 지역별 특색 멘트를 한번 하고 (노스가드 — 추위를 뚫고온 용사로구만~! /
   마경 — 어차피 죽으러 가는 길에 장비가 중요한가 하하) 구매·판매 리스트 띄우고".
   대사는 data/hubs.json 의 fac.shop.greet 에 있다 — 지역을 늘리면 거기 한 줄만 적으면 된다.
   line 만 있고 greet 이 없으면 line 을 쓴다(빈 화면이 나오지 않게). */
function facGreetText(k){
  var inf = (typeof hubFacInfo === "function") ? hubFacInfo(k) : {};
  return inf.greet || inf.line || "";
}
function facTalkRender(k, step, inf){
  var box = document.getElementById("factalk");
  if(!box) return;
  if(k !== "shop"){ box.style.display = "none"; box.innerHTML = ""; return; }
  var who = (inf && inf.who) ? inf.who : "상인";
  box.style.display = "block";
  if(step === "greet"){
    box.className = "greet";
    box.innerHTML = '<div class="ftwho">' + who + '</div>'
      + '<div class="ftline">' + facGreetText(k) + '</div>'
      + '<div class="ftbtn">'
      + '<button class="ib" onclick="facStep(\'buy\')">구 매 하 기</button>'
      + '<button class="ib" onclick="facStep(\'sell\')">판 매 하 기</button>'
      + '<button class="ib sell" onclick="facClose()">나가기</button>'
      + '</div>';
  }else{
    /* 목록 단계 — 대사는 한 줄로 접고, 구매/판매를 탭처럼 바꿔 끼운다(다시 인사로도 갈 수 있다) */
    box.className = "bar";
    /* 띠에서는 줄바꿈을 지운다 — 인사말은 두 줄로 적혀 있어서 그대로 넣으면 띠가 두 줄로 부풀어
       간판 글자를 덮는다(실측 스크린샷에서 확인). */
    box.innerHTML = '<span class="ftmini">' + who + ' — '
      + String(facGreetText(k)).replace(/<br\s*\/?>/gi, " ") + '</span>'
      + '<span class="ftbtn">'
      + '<button class="ib' + (step === "buy" ? " on" : "") + '" onclick="facStep(\'buy\')">구매</button>'
      + '<button class="ib' + (step === "sell" ? " on" : "") + '" onclick="facStep(\'sell\')">판매</button>'
      + '<button class="ib" onclick="facStep(\'greet\')">대화</button>'
      + '</span>';
  }
}
/* 같은 시설 안에서 단계만 바꾼다 — 배경을 다시 그리고 슬롯을 다시 채운다 */
function facStep(step){
  if(!FAC.open || !FAC.k) return;
  facShow(FAC.k, step);
}

function facClose(){
  if(!FAC.open) return;
  var wasShop = (FAC.k === "shop");
  FAC.open = false; FAC.k = null; FAC.step = null;
  if(typeof facInfoClear === "function") facInfoClear();
  facUndockAll();
  var ov = document.getElementById("facov");
  if(ov) ov.style.display = "none";
  if(wasShop){ shopOpen = false; if(typeof refreshInv === "function") refreshInv(); }
  if(typeof closeDialog === "function" && typeof DLG !== "undefined" && DLG.open) closeDialog();
  if(typeof HUB !== "undefined" && HUB.open && typeof hubRender === "function") hubRender();
  if(typeof sfx === "function") sfx("click");
}

/* 창 크기가 바뀌면 배경을 다시 그린다(늘어난 그림이 남지 않게) */
(function(){
  if(typeof window === "undefined" || !window.addEventListener) return;
  window.addEventListener("resize", function(){ if(FAC.open) facShow(FAC.k, FAC.step); });
})();
