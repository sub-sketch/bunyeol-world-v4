/* ================= 마을 서비스 NPC — 차원문(유료) / 축복(시간제) ================= */
/* 데이터: data/npcs.json 의 PORTAL, BUFFS
   대사창(dlgtext/dlgbtn)을 그대로 재활용하므로 HTML 껍데기 수정이 필요 없다. */

var SVBTN="display:inline-block;padding:3px 8px;margin:0;border:1px solid #3a3350;background:#1b1730;"+
          "color:#e8e0d0;font:11px Gulim;cursor:pointer";
var SVOFF="display:inline-block;padding:3px 8px;margin:0;border:1px solid #2a2438;background:#141020;"+
          "color:#5a5468;font:11px Gulim;cursor:default";
var SVROW="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid #221d33";

/* ---------- 차원문 ---------- */
function openPortal(){
 DLG.mode="portal";
 var h='<div style="color:#a89c86;margin-bottom:4px">차원문은 은화를 먹습니다. 어디로 보내드릴까요?</div>';
 PORTAL.dest.forEach(function(d,i){
   var nm=ZONES[d.z]?ZONES[d.z].name:("지역 "+d.z);
   var here=(d.z===curZ), lvNo=(P.lv<d.lv), poor=(P.gold<d.cost);
   var ok=!here&&!lvNo&&!poor;
   var note=here?"<span style='color:#6b6046'>현재 위치</span>"
        :(lvNo?"<span style='color:#a06a6a'>Lv."+d.lv+" 필요</span>"
        :(poor?"<span style='color:#a06a6a'>은화 부족</span>"
        :"<span style='color:#f5c542'>"+(d.cost?d.cost.toLocaleString()+" 은화":"무료")+"</span>"));
   h+='<div style="'+SVROW+'"><span style="flex:1 1 auto;color:'+(ok?"#e8e0d0":"#7a7288")+'">'+nm+'</span>'+
      '<span style="flex:0 0 auto;font-size:10px">'+note+'</span>'+
      (ok?'<button style="'+SVBTN+'" onclick="usePortal('+i+')">이동</button>'
         :'<button style="'+SVOFF+'">이동</button>')+'</div>';
 });
 document.getElementById("dlgtext").innerHTML=h;
 /* v4: 차원문 관리인이 런 진입구를 겸한다. 마을에서만 노출. */
 var extra="";
 if(curZ===0&&!runActive())
   extra='<button class="ib" onclick="closeDialog();runStart();">⚔ 던전 진입 (런 시작)</button>'+
         '<button class="ib" onclick="closeDialog();openMeta();">✦ 영구 성장</button>';
 document.getElementById("dlgbtn").innerHTML=
   extra+'<button class="ib sell" onclick="closeDialog()">닫기</button>';
}
function usePortal(i){
 var d=PORTAL.dest[i];if(!d)return;
 if(d.z===curZ){log("이미 그곳에 있습니다.","#888");return;}
 if(P.lv<d.lv){log("아직 그곳까지 보낼 수 없습니다. (Lv."+d.lv+" 필요)","#f88");return;}
 if(P.gold<d.cost){log("은화가 부족합니다. ("+d.cost.toLocaleString()+" 필요)","#f88");return;}
 P.gold-=d.cost;
 closeDialog();sfx("port");spark(P.fx,P.fy,"#9fe2ff",18,1.8);
 if(d.cost)log("차원문 사용료 "+d.cost.toLocaleString()+" 은화를 지불했습니다.","#f5c542");
 travel(d.z,d.x,d.y);
 refreshInv();refreshChar();
}

/* ---------- 축복(시간제 버프) ----------
   무료 구간: BUFFS.free.freeLv 미만이면 기본 축복이 공짜.
   그 이상 레벨은 레벨 x costPerLv 은화. 상위 축복은 전부 유료. */
function freeBuffCost(){
 var f=BUFFS.free;
 return P.lv<f.freeLv?0:P.lv*f.costPerLv;
}
function buffRemain(k){var b=P.buffs[k];return (b&&T<b.t)?Math.ceil(b.t-T):0;}
/* 같은 효과 키를 쓰는 축복끼리 서로 덮어쓰던 버그를 막는다.
   전에는 전사의 축복(bd:4) 뒤에 변경의 축복(bd:1) 을 받으면 공격력이 오히려 내려갔다.
   이제 값이 더 낮으면서 남은 시간도 짧으면 무시한다(더 강하거나 더 길면 갱신). */
function applyBuff(name,dur,eff,quiet){
 var k,cur,kept=0,put=0;
 for(k in eff){
   cur=P.buffs[k];
   /* ★ R26 — 음수(대가) 효과는 위의 "더 센 것을 유지" 규칙을 타지 않는다.
      동대륙 「신 내림」처럼 **강한 대신 무언가를 깎는** 축복이 생겼는데, 예전 코드는
      Math.max(eff[k], 0) 이라 음수를 0으로 지워 버렸다(대가 없이 이득만 남는 버그).
      페널티는 그대로 걸고, 지속시간도 그 축복의 것으로 새로 쓴다. */
   if(eff[k]<0){
     P.buffs[k]={v:eff[k],t:T+dur,n:name};
     put++;continue;
   }
   if(cur&&T<cur.t&&cur.v>eff[k]&&(cur.t-T)>=dur){kept++;continue;}
   P.buffs[k]={v:Math.max(eff[k],(cur&&T<cur.t)?cur.v:0),t:Math.max(T+dur,(cur&&T<cur.t)?cur.t:0),n:name};
   put++;
 }
 if(!put){ if(!quiet)log(TX("bless.stack",name),"#888"); return false; }
 sfx("buff");spark(P.fx,P.fy,"#ffe97a",16,1.4);
 if(!quiet)log("<b>"+name+"</b>의 가호를 받았습니다. ("+Math.floor(dur/60)+"분)","#8fd18f");
 refreshChar();refreshHud();
 return true;
}
function openBless(){
 DLG.mode="bless";
 var fc=freeBuffCost(),f=BUFFS.free;
 var h='<div style="color:#a89c86;margin-bottom:4px">가호는 오래 가지 않습니다. 필요할 때 받으십시오.</div>';
 h+=blessRow(f.n,f.desc,f.dur,fc,1,"useFreeBuff()",P.gold>=fc);
 /* ★ R27 — 지역 신전은 **그 지역 축복으로 대체한다**
    (대표 지시: "버프도 굿청에서 여기만의 버프로 대체할수있고").
    예전엔 본편 축복 5종 뒤에 지역 축복을 덧붙여서, 굿청에 가도 「빛의 성소」 목록이 그대로 나왔다.
    지역 축복이 있는 거점에서는 본편 목록을 감춘다 — 무료 「변경의 축복」만 남긴다(그건 기본 지급이다). */
 var hubOnly=(typeof hubBuffList==="function")&&hubBuffList().length>0;
 if(!hubOnly) BUFFS.list.forEach(function(b,i){
   var ok=(P.lv>=b.lv)&&(P.gold>=b.cost);
   h+=blessRow(b.n,b.desc+(P.lv<b.lv?" · <span style='color:#a06a6a'>Lv."+b.lv+" 필요</span>":""),
     b.dur,b.cost,P.lv>=b.lv,"usePaidBuff("+i+")",ok);
 });
 /* ================= R26 지역 전용 축복 =================
    팩의 BUFFS_HUB 에서 **지금 거점(HUB.id)** 것만 골라 뒤에 붙인다.
    동대륙 「신 내림」은 강한 대신 대가가 있다(eff 에 음수를 넣어 표현 — bd:9, bac:-3).
    마경 「부서진 제단」은 도박이다(gamble). 본편 BUFFS 를 건드리지 않으므로 팩을 빼면 사라진다. */
 hubBuffList().forEach(function(b,i){
   var ok2=(P.lv>=(b.lv||1))&&(P.gold>=(b.cost||0));
   h+=blessRow("<span style='color:#c9a6ff'>"+b.n+"</span>",
     b.desc+(P.lv<(b.lv||1)?" · <span style='color:#a06a6a'>Lv."+b.lv+" 필요</span>":""),
     b.dur||300,b.cost||0,P.lv>=(b.lv||1),"useHubBuff("+i+")",ok2);
 });
 h+=respecRow();                     /* R34 — 계시 되짚기(노드 재분배) */
 document.getElementById("dlgtext").innerHTML=h;
 var need=blessAllCost();
 document.getElementById("dlgbtn").innerHTML=
   '<button class="ib'+(P.gold>=need?'':' sell')+'" onclick="useAllBuffs()">'+TX("bless.all")+
   ' ('+need.toLocaleString()+')</button>'+
   '<button class="ib sell" onclick="closeDialog()">닫기</button>';
}
/* ================= R34 계시 되짚기 — 성소 =================
   대표 지시: "성소가서 돈주고 노드를 새로 찍을수있게".
   축복과 성격이 달라 blessRow(지속시간 표시)를 쓰지 않고 별도 줄로 그린다.
   ★ 되돌릴 수 없는 조작이므로 **두 번 눌러 확인**한다(08_inventory.js 의 일괄 판매와 같은 방식).
     확인 상태는 버튼의 dataset 에만 두어, 창을 다시 그리면 자연히 풀린다. */
function respecRow(){
 if(typeof metaRespecRefund!=="function")return "";
 var refund=metaRespecRefund(), cost=metaRespecCost(), can=(refund>0&&P.gold>=cost);
 var pr=cost?("<span style='color:#f5c542'>"+cost.toLocaleString()+"</span>")
            :"<span style='color:#8fd18f'>첫 회 무료</span>";
 var desc=refund>0
   ? "노드를 전부 풀고 <b style='color:#ffd24a'>"+refund.toLocaleString()+"P</b>를 돌려받습니다 · 스킬·업적은 그대로"
   : "되짚을 노드가 없습니다";
 return '<div style="'+SVROW+';margin-top:6px;border-top:1px solid #3a3350;padding-top:6px">'+
   '<span style="flex:1 1 auto"><span style="color:'+(can?"#c9a6ff":"#7a7288")+'">계시 되짚기</span>'+
   '<br><span style="font-size:10px;color:#8a8068">'+desc+'</span></span>'+
   '<span style="flex:0 0 auto;font-size:10px">'+pr+'</span>'+
   (can?'<button id="respecbtn" style="'+SVBTN+'" onclick="respecAsk(this)">되짚기</button>'
       :'<button style="'+SVOFF+'">되짚기</button>')+'</div>';
}
/* 1차 클릭 = 경고로 바뀜, 2차 클릭 = 실행 */
function respecAsk(b){
 if(!b)return;
 if(b.dataset.c!=="1"){
   b.dataset.c="1";
   b.textContent="정말 되짚을까요?";
   b.style.borderColor="#8a5aa8";
   return;
 }
 if(typeof metaRespec==="function"&&metaRespec()) openBless();   /* 창을 다시 그려 값·비용을 갱신 */
}
function blessRow(n,desc,dur,cost,lvok,fn,ok){
 var pr=cost?("<span style='color:#f5c542'>"+cost.toLocaleString()+"</span>"):"<span style='color:#8fd18f'>무료</span>";
 return '<div style="'+SVROW+'"><span style="flex:1 1 auto"><span style="color:'+(lvok?"#e8e0d0":"#7a7288")+'">'+n+
   '</span><br><span style="font-size:10px;color:#8a8068">'+desc+' · '+Math.floor(dur/60)+'분</span></span>'+
   '<span style="flex:0 0 auto;font-size:10px">'+pr+'</span>'+
   (ok?'<button style="'+SVBTN+'" onclick="'+fn+'">받기</button>':'<button style="'+SVOFF+'">받기</button>')+'</div>';
}
function useFreeBuff(){
 var f=BUFFS.free,c=freeBuffCost();
 if(P.gold<c){log("은화가 부족합니다.","#f88");return;}
 P.gold-=c;applyBuff(f.n,f.dur,f.eff);
 if(c===0)log("셀라: 아직 어린 문신이군요. 값은 받지 않겠습니다.","#a89c86");
 refreshInv();openBless();          /* 창을 닫지 않는다 — 연달아 받을 수 있게 */
}
/* 지금 거점에서 받을 수 있는 지역 축복 목록 (없으면 빈 배열) */
function hubBuffList(){
  if(typeof BUFFS_HUB==="undefined"||!BUFFS_HUB)return [];
  var hid=(typeof HUB!=="undefined"&&HUB)?HUB.id:null;
  if(!hid)return [];
  return BUFFS_HUB.filter(function(b){return b.hub===hid;});
}
function useHubBuff(i){
 var L=hubBuffList(),b=L[i];
 if(!b)return;
 if(P.lv<(b.lv||1)){log("아직 이 가호를 견딜 수 없습니다. (Lv."+b.lv+" 필요)","#f88");return;}
 if(P.gold<(b.cost||0)){log("은화가 부족합니다.","#f88");return;}
 P.gold-=(b.cost||0);
 if(b.gamble){
   /* 도박 — 본편 축복 + 지역 축복을 한 통에 넣고 하나를 뽑는다. 꽝도 있다(마경답게). */
   var pool=[],j;
   for(j=0;j<BUFFS.list.length;j++)pool.push(BUFFS.list[j]);
   L.forEach(function(x){if(!x.gamble)pool.push(x);});
   if(!pool.length){log("제단은 조용하다. 아무 일도 없었다.","#8a8068");refreshInv();openBless();return;}
   if(ch(0.18)){                        /* 꽝 18% */
     log("제단이 아무 응답도 하지 않는다. 은화만 사라졌다.","#a06a6a");
     sfx("die");refreshInv();openBless();return;
   }
   var pick=pool[Math.floor(Math.random()*pool.length)];
   /* 도박 보상은 지속시간을 1.5배로 — 위험을 감수한 값 */
   applyBuff("제단의 응답 · "+pick.n,Math.round((pick.dur||300)*1.5),pick.eff);
   log("부서진 제단이 응답했다 — <b>"+pick.n+"</b> (지속 1.5배)","#c9a6ff");
   refreshInv();openBless();
   return;
 }
 applyBuff(b.n,b.dur||300,b.eff);
 log("<b>"+b.n+"</b> — 몸이 뒤틀리며 힘이 앉는다.","#c9a6ff");
 refreshInv();openBless();
}
function usePaidBuff(i){
 var b=BUFFS.list[i];if(!b)return;
 if(P.lv<b.lv){log("아직 이 가호를 견딜 수 없습니다. (Lv."+b.lv+" 필요)","#f88");return;}
 if(P.gold<b.cost){log("은화가 부족합니다.","#f88");return;}
 P.gold-=b.cost;applyBuff(b.n,b.dur,b.eff);
 refreshInv();openBless();
}
/* 받을 수 있는 축복을 한 번에 전부 — 하나씩 누르고 창이 닫히는 게 가장 불편한 지점이었다 */
function blessAllCost(){
 var t=freeBuffCost(),i,b;
 for(i=0;i<BUFFS.list.length;i++){b=BUFFS.list[i];if(P.lv>=b.lv)t+=b.cost;}
 return t;
}
function useAllBuffs(){
 var need=blessAllCost();
 if(P.gold<need){log(TX("bless.poor",need.toLocaleString()),"#f88");return;}
 var f=BUFFS.free,n=0;
 P.gold-=freeBuffCost();
 if(applyBuff(f.n,f.dur,f.eff,true))n++;
 BUFFS.list.forEach(function(b){
   if(P.lv<b.lv)return;
   P.gold-=b.cost;
   if(applyBuff(b.n,b.dur,b.eff,true))n++;
 });
 sfx("buff");spark(P.fx,P.fy,"#ffe97a",26,1.8);
 log(TX("bless.allDone",n),"#8fd18f");
 refreshChar();refreshHud();refreshInv();openBless();
}
/* 버프 효과 헬퍼 — pAtkMs / gainXp / update 에서 호출 */
function buffV(k){var b=P&&P.buffs&&P.buffs[k];return (b&&T<b.t)?b.v:0;}
