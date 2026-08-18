/* ================= R27 캐릭터 보관 정책 (서버 전용) =================
   대표 지시(원문): "캐릭터 내보내기는 서버구축되면 내 서버로만 가능하게 로컬 pc에 내보내면
   뜯어서 핵쓸수있을거같은 우려있음."

   그래서 이렇게 나눴다:
     · 로컬 .sav 내보내기 → **막는다**(버튼은 남기되 왜 막혔는지 알려 준다).
     · 대신 자체 서버 보관 자리를 미리 만들어 둔다 → SRV.on 을 켜고 SRV.url 만 넣으면 열린다.
     · 불러오기는 남긴다(이미 가진 파일을 잃게 만들지 않는다) — 단 **변조 검사**를 통과해야 한다.
     · 업적포인트·노드(.meta)와 슬롯 저장은 그대로다. 기기를 옮길 때 필요한 건 그쪽이다.

   ★ 솔직히 적어 둔다: 브라우저 안에서 하는 서명 검사는 마음먹은 사람은 뚫는다.
     이건 "메모장으로 열어 은화를 고치는" 손쉬운 변조를 막는 자물쇠이고,
     진짜 방어선은 서버가 값을 들고 판정하는 구조다(SRV 붙일 때 서버에서 다시 검사).
   ==================================================================== */
var SRV = {
  on: false,                    /* 서버가 준비되면 true */
  url: "",                      /* 예: "https://<대표님 서버>/api/char" */
  name: "분열된 세계 보관소",
  token: ""                     /* 로그인 토큰(서버 붙일 때 채운다) */
};
function charStoreReady(){ return !!(SRV.on && SRV.url); }

/* ---- 변조 검사용 서명 ---- */
var SAV_SALT = "lc2-v4-char";
function savSig(s){
  var h1 = 0x811c9dc5, h2 = 0x1000193, i, c;
  var t = SAV_SALT + s + SAV_SALT;
  for(i = 0; i < t.length; i++){
    c = t.charCodeAt(i);
    h1 = ((h1 ^ c) * 16777619) >>> 0;
    h2 = ((h2 + c * (i + 7)) * 2654435761) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}
/* 저장 문자열에 서명을 붙인다 — 형식: <base64>~<서명> */
function savSeal(code){ return code + "~" + savSig(code); }
/* 검사 결과: {ok, code, state:"sealed"|"legacy"|"tampered"} */
function savOpen(text){
  text = (text || "").trim();
  var i = text.lastIndexOf("~");
  if(i < 0) return { ok:true, code:text, state:"legacy" };      /* 서명 이전 파일 — 받아 준다 */
  var body = text.slice(0, i), sig = text.slice(i + 1);
  if(savSig(body) === sig) return { ok:true, code:body, state:"sealed" };
  return { ok:false, code:body, state:"tampered" };
}

/* ---- 내보내기(=보관) ---- */
function charExport(){
  if(!P || !started){ log("보관할 캐릭터가 없습니다.", "#888"); return; }
  if(!charStoreReady()){
    log("<b>캐릭터 파일 내보내기는 잠겨 있습니다.</b>", "#ffb27a");
    log("파일로 빼내면 수치를 고쳐 되돌려 넣을 수 있어(핵) 막아 두었습니다. " +
        "서버가 열리면 <b>계정 보관</b>으로 옮겨 드립니다.", "#a89c86");
    log("지금 백업이 필요하면 <b>영구 성장 내보내기(.meta)</b>를 쓰십시오 — 업적포인트·노드·업적·도감이 담깁니다.", "#9fe2ff");
    return;
  }
  charUpload();
}
/* 서버 보관 — SRV 를 켜면 이 경로로 간다. 실패는 조용히 넘기지 않는다. */
function charUpload(){
  var body = savSeal(packSave());
  log("보관소에 올리는 중입니다...", "#9fe2ff");
  try{
    fetch(SRV.url, {
      method: "POST",
      headers: { "Content-Type": "text/plain", "X-Auth": SRV.token || "" },
      body: body
    }).then(function(r){
      if(!r.ok) throw new Error("HTTP " + r.status);
      log("<b>" + SRV.name + "</b>에 보관했습니다. (" + P.name + " · Lv" + P.lv + ")", "#7CFC00");
    }).catch(function(e){
      log("보관에 실패했습니다 — " + e.message + ". 잠시 뒤 다시 시도해 주십시오.", "#f88");
    });
  }catch(e){ log("보관에 실패했습니다. 연결을 확인해 주십시오.", "#f88"); }
}
/* 저장 화면의 안내문 — 정책이 바뀌면 여기 한 곳만 고친다 */
function charStoreNote(){
  return charStoreReady()
    ? "캐릭터는 <b>" + SRV.name + "</b>에 보관됩니다. 파일로는 빼낼 수 없습니다(변조 방지)."
    : "캐릭터 <b>파일 내보내기는 잠겨 있습니다</b> — 파일을 고쳐 되돌려 넣는 길(핵)을 막기 위함입니다."
      + "<br>서버가 열리면 <b>계정 보관</b>으로 열립니다. 그때까지 백업은 아래 <b>영구 성장(.meta)</b>을 쓰십시오.";
}
