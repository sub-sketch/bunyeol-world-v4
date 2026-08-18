/* ================= 변신 =================
   R23 대표 지시 3건을 이 파일이 받는다:
   ① "변신도 지속시간 10-15분정도 어느정도 있도록"      → 지속은 데이터(TFS.dur, 600~900초). 여기서는 분으로 보여 준다.
   ② "보스를 잡으면 보스도 변신할수있는 해금 제도"       → MOBS[].tfkey + unlockTf(). 변종을 잡아도 원종 키로 열린다
                                                          (변종 데이터는 원종을 복사해 만들므로 tfkey 가 그대로 따라온다).
   ③ "변신시 외형도 변할건지 능력치만 습득할건지 물어보는 창"
        → applyTf 앞에 tfAsk() 가 끼어 두 갈래로 나눈다. 고른 값은 P.tfSkin 에 남는다:
             P.tfSkin = true  → 외형까지 (몹 시트로 그린다 + 노란 테두리 띠)
             P.tfSkin = false → 능력치만 (내 계열 시트를 그대로 쓴다)
          ★ 능력치는 어느 쪽이든 같다 — 외형 여부가 전투력에 영향을 주지 않는다(P.tf 하나로 계산하므로).
   ================================================================== */
function tfUnlocked(k){return !!(P&&P.tfUnlock&&P.tfUnlock.indexOf(k)>=0);}
function unlockTf(k){
 if(!P)return false;
 if(!P.tfUnlock)P.tfUnlock=[];
 if(P.tfUnlock.indexOf(k)>=0)return false;
 P.tfUnlock.push(k);
 return true;
}
/* 지속시간 표기 — 초로 적으면 "지속 900초" 라 감이 안 온다. 분 단위로 읽어 준다. */
function tfDurText(sec){
 sec=Math.max(0,Math.round(sec||0));
 if(sec>=60){
   var m=Math.floor(sec/60),s2=sec%60;
   return m+"분"+(s2?" "+s2+"초":"");
 }
 return sec+"초";
}
function openTf(scrollIt){
 openP("tf");
 var L=document.getElementById("tflist");L.innerHTML="";
 var shown=0;
 Object.keys(TFS).forEach(function(k){
   var t=TFS[k];
   /* scroll:1 변신은 **보스를 잡아** 영구 해금해야 목록에 나온다.
      전에는 목록에서 아예 숨기고 주문서 아이템으로만 진입할 수 있었다 (드랍 40%). */
   if(t.scroll&&!tfUnlocked(k))return;
   shown++;
   var row=document.createElement("div");row.className="irow";
   var ok=P.lv>=t.lv;
   var nm=document.createElement("span");nm.className="nm";
   nm.innerHTML=t.n+' <span style="color:#777;font-size:10px">Lv'+t.lv+" · 공+"+t.dmg+
     (t.asp<1?" 공속↑":"")+(t.ms>1?" 이속↑":"")+(t.ac?" AC-"+t.ac:"")+
     " · 지속 "+tfDurText(t.dur||600)+"</span>";
   if(!ok)nm.style.opacity=.4;
   row.appendChild(nm);
   if(ok){var b=document.createElement("button");b.className="ib";b.textContent="변신";
     b.onclick=function(){tfAsk(k,scrollIt);};row.appendChild(b);}
   L.appendChild(row);
 });
 if(!shown){
   var e0=document.createElement("div");e0.className="gnone";
   e0.style.cssText="color:#6b6046;font-size:11px;padding:6px 2px";
   e0.textContent="쓸 수 있는 형상이 없습니다. 보스를 쓰러뜨리면 그 형상이 열립니다.";
   L.appendChild(e0);
 }
 var r2=document.createElement("div");r2.className="irow";
 var b2=document.createElement("button");b2.className="ib";b2.textContent="변신 해제";
 b2.onclick=function(){if(P.tf){P.tf=null;P.tfT=0;log("변신이 해제되었습니다.","#aaa");refreshChar();refreshHud();}closeP("tf");};
 r2.appendChild(b2);L.appendChild(r2);
}

/* ---------- 외형 / 능력치 선택 창 (대표 지시) ----------
   같은 패널(#tf) 안에서 물어본다. 별도 오버레이를 새로 만들면 모바일에서 또 겹침을 걱정해야 하고,
   이미 열려 있는 창에 이어서 묻는 편이 흐름이 짧다. 매번 묻는다 — 기억해 두지 않는다
   (대표 지시가 "물어보는 창 띄우도록" 이므로 기본값으로 굳히지 않는다). */
function tfAsk(k,scrollIt){
 var t=TFS[k],L=document.getElementById("tflist");
 if(!t||!L){applyTf(k,true);return;}
 if(typeof sfx==="function")sfx("click");
 L.innerHTML='<div style="color:#e8d36e;font-size:13px;letter-spacing:1px;margin-bottom:4px">'+t.n+'</div>'
  +'<div style="color:#a89c86;font-size:11px;line-height:16px;margin-bottom:8px">'
  +'술식을 어디까지 걸겠습니까? <b style="color:#cfc8e8">능력치는 어느 쪽이든 같습니다</b> — 겉모습만 갈립니다.<br>'
  +'지속 <b style="color:#9fe2ff">'+tfDurText(t.dur||600)+'</b></div>';
 var mk=function(label,desc,skin){
   var row=document.createElement("div");row.className="irow";
   var nm=document.createElement("span");nm.className="nm";
   nm.innerHTML='<b>'+label+'</b><div class="iinfo">'+desc+'</div>';
   row.appendChild(nm);
   var b=document.createElement("button");b.className="ib";b.textContent="선택";
   b.onclick=function(){
     applyTf(k,skin);
     if(scrollIt&&typeof removeItem==="function")removeItem(scrollIt);
     closeP("tf");
   };
   row.appendChild(b);L.appendChild(row);
 };
 mk("외형까지 바꾼다","마수의 몸을 그대로 빌립니다. 내 형상에 <b style=\"color:#ffd24a\">노란 띠</b>가 둘러져 남습니다.",true);
 mk("능력치만 습득한다","겉모습은 내 계열 그대로. 힘만 빌립니다.",false);
 var back=document.createElement("div");back.className="irow";
 var bb=document.createElement("button");bb.className="ib";bb.textContent="← 목록으로";
 bb.onclick=function(){openTf(scrollIt);};
 back.appendChild(bb);L.appendChild(back);
}

function applyTf(k,skin){
 var d=TFS[k].dur||600;
 P.tf=k;P.tfT=T+d;P.tfSkin=(skin!==false);sfx("ench");
 log("몸이 뒤틀리며... <b>"+TFS[k].n+"</b>"+(P.tfSkin?"":"의 힘")+"을 빌렸습니다! ("+tfDurText(d)+")","#c07aff");
 if(!P.tfSkin)log("겉모습은 그대로입니다 — 능력치만 얹혔습니다.","#a89c86");
 refreshChar();refreshHud();
}
/* 변신 만료 — update() 에서 매 프레임 확인.
   P.tf 는 문자열 그대로 두고 만료 시각만 P.tfT 로 따로 둔다.
   actorOf/pMaxHit/pAC/pAtkMs/pMS 다섯 곳을 건드리지 않기 위한 선택이다. */
function tfTick(){
 if(!P||!P.tf)return;
 if(P.tfT&&T>=P.tfT){
   P.tf=null;P.tfT=0;
   sfx("pot");log(TX("tf.expire"),"#a89c86");
   refreshChar();refreshHud();
 }
}
function tfRemain(){return (P&&P.tf&&P.tfT)?Math.max(0,Math.ceil(P.tfT-T)):0;}
/* 지금 외형까지 바꾼 변신 상태인가 — 렌더러(19_render.js)와 pcUseSheet(02c) 가 이걸 본다 */
function tfSkinOn(){return !!(P&&P.tf&&P.tfSkin);}
