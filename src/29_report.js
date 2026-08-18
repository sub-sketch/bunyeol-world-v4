/* ================= R26 A안 — 백업 · 플레이 기록 =================
   대표 지시: "1부 클리어까지 기사로 플레이해보고 … 다음 계획" → 그 플레이가 **데이터로 남게** 한다.

   여기 있는 것 세 가지:
     ① META(영구 성장) 백업/복원 — 지금까지 유일하게 되돌릴 수 없는 손실 경로였다.
        캐릭터는 .sav 내보내기가 있는데 META 는 없어서, 브라우저 데이터를 지우면 업적포인트·노드가
        통째로 사라졌다(인수인계 §3-A 의 ⚠ 항목). 파일 하나로 빼고 넣을 수 있게 한다.
     ② 런 기록 — 한 판이 끝나면 층별 소요·처치·피해·물약·획득을 **자동으로 쌓아 두고**(최근 20판),
        텍스트 파일로 내보낸다. 밸런스를 감이 아니라 수치로 고치기 위한 자료다.
     ③ 정산 화면·저장 화면에 그 버튼들.

   ★ 저장 위치는 localStorage 의 별도 키(REP_KEY)다 — META 와 섞지 않는다.
     기록이 망가져도 진행도에 영향이 없어야 하고, 반대로 META 를 초기화해도 기록은 남는 게 유용하다.
   ================================================================== */
var REP_KEY = "lc2_reports_v1", REP_MAX = 20;

/* ---------- 층별 타임라인 ----------
   RUN 은 저장되지 않으므로(사망 시 소멸) 층이 바뀔 때마다 스냅샷을 찍어 델타를 남긴다.
   runOnTravel 이 층을 바꾼 **뒤에** repFloor(f) 를 부른다. */
function repFloorClose(){
  if(!RUN || !RUN._rf) return;
  var r = RUN._rf;
  r.sec   = Math.max(0, Math.round(T - r.t0));
  r.kills = (RUN.kills || 0) - r.k0;
  r.dmg   = Math.round((RUN.dmgTaken || 0) - r.d0);
  r.gold  = (RUN.goldEarned || 0) - r.g0;
  r.pots  = (RUN.potsUsed || 0) - r.p0;
  (RUN.floors = RUN.floors || []).push(r);
  RUN._rf = null;
}
function repFloorOpen(f){
  if(!RUN) return;
  RUN._rf = { f:f, t0:T, k0:(RUN.kills||0), d0:(RUN.dmgTaken||0), g0:(RUN.goldEarned||0), p0:(RUN.potsUsed||0) };
}
function repOnFloor(f){
  if(!runActive()) return;
  repFloorClose();
  repFloorOpen(f);
}
/* 물약을 마신 횟수 — 자동 물약도 usePotKey 를 지나므로 한 곳에서 센다 */
function repOnPot(){ if(runActive()) RUN.potsUsed = (RUN.potsUsed || 0) + 1; }

/* ---------- 한 판 기록 만들기 (runEnd 에서 부른다) ---------- */
function repMake(r, sc){
  repFloorClose();
  var revs = [], k;
  if(r.revs) for(k in r.revs) revs.push(k + (r.revs[k] > 1 ? "×" + r.revs[k] : ""));
  var nodes = [], nk;
  if(typeof META !== "undefined" && META.nodes) for(nk in META.nodes) if(META.nodes[nk] > 0) nodes.push(nk + ":" + META.nodes[nk]);
  var sks = [];
  if(typeof META !== "undefined" && META.sk) for(nk in META.sk) if(META.sk[nk] > 0) sks.push(nk + ":" + META.sk[nk]);
  return {
    ts: (typeof Date !== "undefined") ? new Date().toISOString().slice(0, 19).replace("T", " ") : "",
    result: r.result, sec: Math.round(T - r.t0),
    cls: P ? P.cls : "?", clsN: (P && typeof CLS !== "undefined") ? CLS[P.cls].n : "?",
    lv: P ? P.lv : 0, name: P ? P.name : "",
    maxFloor: r.maxFloor, kills: r.kills, dmg: Math.round(r.dmgTaken),
    gold: r.goldEarned, pots: r.potsUsed || 0,
    noHit: r.noHitCount || 0,
    pt: sc ? sc.total : 0, ptHave: (typeof META !== "undefined") ? META.pt : 0,
    runs: (typeof META !== "undefined") ? META.runs : 0,
    mark: (typeof markOf === "function" && markOf()) ? markOf().n : "",
    revs: revs, nodes: nodes, sks: sks,
    aslot: (P && P.aslot) ? P.aslot.slice(0) : [],
    aauto: (P && P.aauto) ? P.aauto.slice(0) : [],
    ap: (P && P.ap) ? (P.ap.on ? ("HP" + P.ap.hp + (P.cls !== "k" ? "/MP" + P.ap.mp : "")) : "off") : "",
    floors: (r.floors || []).map(function(x){
      return { f:x.f, sec:x.sec, kills:x.kills, dmg:x.dmg, gold:x.gold, pots:x.pots };
    }),
    feats: (r.feats || []).slice(0),
    achv: (r.achieved || []).slice(0)
  };
}
function repList(){
  try{ var s = localStorage.getItem(REP_KEY); return s ? (JSON.parse(s) || []) : []; }
  catch(e){ return []; }
}
function repPush(rec){
  try{
    var L = repList();
    L.push(rec);
    while(L.length > REP_MAX) L.shift();
    localStorage.setItem(REP_KEY, JSON.stringify(L));
  }catch(e){}
}
function repClear(){
  try{ localStorage.removeItem(REP_KEY); }catch(e){}
  if(typeof log === "function") log("플레이 기록을 비웠습니다.", "#888");
  if(typeof renderSaveSlots === "function") renderSaveSlots();
}

/* ---------- 사람이 읽는 리포트 ----------
   대표님이 파일만 주시면 밸런스를 수치로 고칠 수 있게, 층별 표를 그대로 적는다. */
function repText(one){
  var L = one ? [one] : repList(), out = [], i;
  out.push("═══ 분열된 세계 v4 — 플레이 기록 " + (one ? "(이번 판)" : "(최근 " + L.length + "판)") + " ═══");
  if(typeof BUILD_STAMP !== "undefined") out.push("빌드: " + BUILD_STAMP);
  out.push("");
  for(i = L.length - 1; i >= 0; i--){
    var r = L[i], rn = { clear:"클리어", death:"사망", escape:"귀환" }[r.result] || r.result;
    out.push("── [" + (i + 1) + "] " + r.ts + " · " + rn + " · " + r.clsN + " Lv" + r.lv +
             " · 최고 " + r.maxFloor + "층 · " + Math.floor(r.sec / 60) + "분 " + (r.sec % 60) + "초");
    out.push("   처치 " + r.kills + " · 받은피해 " + r.dmg + " · 은화 " + r.gold +
             " · 물약 " + r.pots + " · 무결층 " + r.noHit + " · 획득 " + r.pt + "P (보유 " + r.ptHave + "P)");
    if(r.mark) out.push("   각인: " + r.mark);
    if(r.revs && r.revs.length) out.push("   계시: " + r.revs.join(", "));
    if(r.sks && r.sks.length) out.push("   스킬: " + r.sks.join(", "));
    if(r.aslot && r.aslot.filter(function(x){ return !!x; }).length)
      out.push("   자동스킬 Q→R: " + r.aslot.map(function(x, i){
        var f = (r.aauto && r.aauto.length === 4) ? (r.aauto[i] !== false) : true;
        return (x || "-") + (x ? (f ? "(자동)" : "(수동)") : ""); }).join(" → ") + " · 자동물약 " + r.ap);
    if(r.nodes && r.nodes.length) out.push("   노드: " + r.nodes.join(", "));
    if(r.floors && r.floors.length){
      out.push("   층별 |  층 |   시간 | 처치 | 받은피해 | 은화 | 물약");
      r.floors.forEach(function(x){
        function pad(v, n){ v = "" + v; while(v.length < n) v = " " + v; return v; }
        out.push("        | " + pad(x.f, 2) + " | " + pad(Math.floor(x.sec / 60) + ":" + (x.sec % 60 < 10 ? "0" : "") + (x.sec % 60), 6) +
                 " | " + pad(x.kills, 4) + " | " + pad(x.dmg, 8) + " | " + pad(x.gold, 4) + " | " + pad(x.pots, 4));
      });
    }
    if(r.achv && r.achv.length) out.push("   달성 업적: " + r.achv.join(", "));
    out.push("");
  }
  /* 평균 — 여러 판이 쌓이면 곡선이 보인다 */
  if(L.length > 1){
    var sum = { sec:0, kills:0, dmg:0, gold:0, pots:0, pt:0, mf:0 };
    L.forEach(function(r){ sum.sec += r.sec; sum.kills += r.kills; sum.dmg += r.dmg;
      sum.gold += r.gold; sum.pots += r.pots || 0; sum.pt += r.pt; sum.mf += r.maxFloor; });
    var n = L.length;
    out.push("── 평균(" + n + "판): " + Math.round(sum.sec / n / 60) + "분 · 처치 " + Math.round(sum.kills / n) +
             " · 받은피해 " + Math.round(sum.dmg / n) + " · 은화 " + Math.round(sum.gold / n) +
             " · 물약 " + (Math.round(sum.pots / n * 10) / 10) + " · 획득 " + Math.round(sum.pt / n) + "P · 최고층 " +
             (Math.round(sum.mf / n * 10) / 10));
    out.push("");
  }
  return out.join("\n");
}
function repDownload(one){
  var txt = repText(one || null);
  try{
    var blob = new Blob([txt], { type:"text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "분열된세계_플레이기록" + (one ? "_이번판" : "") + ".txt";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    if(typeof log === "function") log("플레이 기록을 내려받았습니다. (다운로드 폴더 확인)", "#9fe2ff");
  }catch(e){ if(typeof log === "function") log("기록 저장에 실패했습니다.", "#f88"); }
}
var REP_LAST = null;                    /* 정산 화면의 「이 판 기록 저장」이 쓴다 */
function repDownloadLast(){ repDownload(REP_LAST); }

/* ================= META 백업 / 복원 ================= */
function metaExport(){
  try{
    var payload = { kind:"lc2meta", v:4, at:(typeof Date !== "undefined" ? new Date().toISOString() : ""), meta:META };
    var blob = new Blob([btoa(unescape(encodeURIComponent(JSON.stringify(payload))))],
                        { type:"application/octet-stream" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "분열된세계_영구성장_" + META.pt + "P_런" + META.runs + ".meta";
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    log("영구 성장 백업을 내려받았습니다. (업적포인트·노드·업적·도감 전부)", "#9fe2ff");
  }catch(e){ log("백업에 실패했습니다.", "#f88"); }
}
/* 파일 내용(base64) 을 받아 복원한다. 덮어쓰기 전에 반드시 확인을 받는다. */
function metaImportText(txt){
  var o;
  try{ o = JSON.parse(decodeURIComponent(escape(atob((txt || "").trim())))); }
  catch(e){ log("백업 파일이 올바르지 않습니다.", "#f88"); return false; }
  var m = o && (o.meta || (o.v === 4 ? o : null));
  if(!m || m.v !== 4){ log("이 파일은 영구 성장 백업이 아닙니다(또는 버전이 다릅니다).", "#f88"); return false; }
  var msg = "영구 성장을 백업으로 되돌립니다.\n\n" +
            "백업: " + (m.pt || 0) + "P · 런 " + (m.runs || 0) + "회 · 최고 " + (m.best || 0) + "층\n" +
            "현재: " + META.pt + "P · 런 " + META.runs + "회 · 최고 " + META.best + "층\n\n" +
            "현재 진행도는 사라집니다. 계속할까요?";
  if(typeof confirm === "function" && !confirm(msg)) return false;
  var keys = ["pt","spent","nodes","sk","skComp","achv","runs","best","tkills","mark",
              "clear1","clear2","clear3","dex","clsClear","alloc"], i;
  for(i = 0; i < keys.length; i++) if(m[keys[i]] !== undefined) META[keys[i]] = m[keys[i]];
  META.v = 4;
  metaSave();
  if(typeof metaApplyToPlayer === "function") metaApplyToPlayer();
  if(typeof renderMeta === "function") renderMeta();
  if(typeof refreshHud === "function") refreshHud();
  if(typeof refreshSkillPanel === "function") refreshSkillPanel();
  log("영구 성장을 복원했습니다 — " + META.pt + "P · 런 " + META.runs + "회.", "#8fd18f");
  return true;
}
(function(){
  if(typeof document === "undefined") return;
  var el = document.getElementById("metafile");
  if(!el) return;
  el.addEventListener("change", function(ev){
    var f = ev.target.files[0]; if(!f) return;
    var r = new FileReader();
    r.onload = function(){ metaImportText((r.result || "").toString()); };
    r.readAsText(f);
    ev.target.value = "";
  });
})();
