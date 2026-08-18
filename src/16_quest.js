/* ================= 퀘스트 / 대화 / 기록물 ================= */
function qState(id){return P.q[id]||(P.qd[id]?3:0);} /* 0=미수락 1=진행 2=완료가능 3=완료 */
/* ===== R27 지역별 퀘스트 사슬 =====
   대표 지시(원문): "동대륙오면 퀘스트가 새로워져야하는데 동일하게 연속으로 넘어와버림".
   예전에는 QORDER 가 한 줄짜리 사슬이라, 동대륙 길드에서도 노스가드 이야기가 계속 이어졌다.
   이제 퀘스트마다 reg(지역)를 두고 **지역마다 따로 이어지는 사슬**로 나눈다.
     · reg 가 없는 퀘스트 = 본편(서대륙, "seo")
     · 앞 이야기 판정도 같은 지역 안에서만 본다 → 동대륙에 오면 그 지역 1번 의뢰부터 새로 시작한다
     · 게시판도 지금 있는 지역 것만 붙인다(다른 지역 의뢰는 그 지역 길드에서) */
function qRegOf(id){ var Q=QUESTS[id]; return (Q&&Q.reg)||"seo"; }
function qCurReg(){
  if(typeof HUB!=="undefined"&&HUB.id)return HUB.id;      /* 거점에 있으면 그 지역 */
  return P&&P.qreg?P.qreg:"seo";
}
function qChain(reg){ reg=reg||qCurReg();
  return QORDER.filter(function(q){ return qRegOf(q)===reg; }); }
function qAvail(id){
 var Q=QUESTS[id];if(!Q)return false;
 if(P.qd[id]||P.q[id])return false;
 if(P.lv<Q.lv)return false;
 var ch=qChain(qRegOf(id)),i=ch.indexOf(id);
 if(i>0&&!P.qd[ch[i-1]])return false;
 return true;
}
function npcQuest(npcId){ /* [id,모드] 모드: 'give'|'done'|'prog'|null */
 var i,id,Q,ord=QORDER;
 for(i=0;i<ord.length;i++){id=ord[i];Q=QUESTS[id];
   if(Q.giver!==npcId)continue;
   if(P.q[id]){return [id,qReady(id)?"done":"prog"];}
   if(qAvail(id))return [id,"give"];
 }
 return [null,null];
}
function qReady(id){
 var st=P.q[id];if(!st)return false;
 var Q=QUESTS[id],i;
 for(i=0;i<Q.obj.length;i++)if((st.p[i]||0)<Q.obj[i].n)return false;
 return true;
}
function qAccept(id){
 var Q=QUESTS[id];
 P.q[id]={p:Q.obj.map(function(){return 0;})};
 P.qcur=id;
 /* 이미 달성된 조건 즉시 반영 */
 Q.obj.forEach(function(o,i){
   if(o.t==="collect")P.q[id].p[i]=Math.min(o.n,cntItem(o.k));
   if(o.t==="zone"&&curZ===o.k)P.q[id].p[i]=o.n;
 });
 log('퀘스트 수락 — <b>'+Q.n+'</b>',"#e8d36e");sfx("buff");
 refreshQuest();
 qSyncCollect();
}
function qTurnIn(id){
 var Q=QUESTS[id];
 if(!Q||!P.q[id]||!qReady(id))return;
 delete P.q[id];P.qd[id]=1;
 gainXp(Math.floor(Q.rew.xp/XP_MULT));
 P.gold+=Q.rew.gold;
 if(Q.rew.item)addItem(Q.rew.item[0],Q.rew.item[1],0,Q.rew.item[2]||null);   /* [2]=특효 옵션 (제작 퀘스트) */
 /* 수집형 목표 아이템 회수 */
 Q.obj.forEach(function(o){if(o.t==="collect"){
   var it=null,i;for(i=0;i<P.inv.length;i++)if(P.inv[i].k===o.k)it=P.inv[i];
   if(it)removeItem(it,o.n);}});
 sfx("lvl");spark(P.fx,P.fy,"#ffe97a",16,1.6);
 log('퀘스트 완료 — <b>'+Q.n+'</b>  (경험치 '+Q.rew.xp.toLocaleString()+' · 은화 '+Q.rew.gold.toLocaleString()+
     (Q.rew.item?" · "+ITEMS[Q.rew.item[0]].n:"")+")","#ffdf00");
 P.qcur=null;
 var nx=Q.next;
 if(nx&&QUESTS[nx])log("다음 이야기 — <b>"+QUESTS[nx].n+"</b> ("+npcName(QUESTS[nx].giver)+
   ", Lv."+QUESTS[nx].lv+" 이상)","#888");
 else log("★ 모든 이야기를 마쳤습니다. ★","#ffdf00");
 refreshQuest();refreshInv();
}
/* 수집 목표는 인벤토리 실보유량과 동기화한다 — 획득·사용·수락 시마다 부른다.
   (버그 수정: collect 를 올리는 호출이 어디에도 없어 수집 퀘스트 전부가 막혀 있었다) */
function qSyncCollect(){
 if(!P||!P.q)return;
 var id,st,Q,i,o,was,now;
 for(id in P.q){st=P.q[id];Q=QUESTS[id];if(!Q)continue;
   for(i=0;i<Q.obj.length;i++){o=Q.obj[i];
     if(o.t!=="collect")continue;
     was=st.p[i]||0;
     now=Math.min(o.n,cntItem(o.k));
     if(now===was)continue;
     st.p[i]=now;
     if(now>was){
       floaters.push({x:P.fx,y:P.fy-0.7,t:o.d+" "+now+"/"+o.n,c:"#e8d36e",t0:T});
       if(now>=o.n)log("목표 달성 — "+o.d,"#8fd18f");
       if(qReady(id))log('<b>'+Q.n+'</b> — <b>길드</b>에 보고하십시오. [J]',"#ffdf00");
     }
   }
 }
 refreshQuest();
}
/* 목표 키 매칭 — "wolf" = 원종만, "wolf@*" = 원종+모든 변종, "wolf@red" = 그 변종만 */
function qKeyMatch(want,got){
 want=String(want);got=String(got);
 if(want===got)return true;
 var i=want.indexOf("@*");
 if(i>0){
   var base=want.slice(0,i);
   return got===base||got.indexOf(base+"@")===0;
 }
 return false;
}
function qProgress(type,key,amt){
 if(!P||!P.q)return;
 var id,st,Q,i,o,ch2=false;
 for(id in P.q){st=P.q[id];Q=QUESTS[id];if(!Q)continue;
   for(i=0;i<Q.obj.length;i++){o=Q.obj[i];
     if(o.t!==type)continue;
     /* R26 — 변종까지 세는 와일드카드. 목표에 "wolf@*" 로 적으면 붉은/흑암 늑대가 다 세어진다.
        예전엔 정확히 일치만 봐서(String 비교) 확장팩 지역 의뢰를 쓰려면 변종 키를 하나하나
        나열해야 했다(늑대 색이 늘 때마다 의뢰를 고쳐야 하는 구조). */
     if(!qKeyMatch(o.k,key))continue;
     if((st.p[i]||0)>=o.n)continue;
     st.p[i]=Math.min(o.n,(st.p[i]||0)+(amt||1));
     ch2=true;
     floaters.push({x:P.fx,y:P.fy-0.7,t:o.d+" "+st.p[i]+"/"+o.n,c:"#e8d36e",t0:T});
     if(st.p[i]>=o.n)log("목표 달성 — "+o.d,"#8fd18f");
   }
   if(ch2&&qReady(id))log('<b>'+Q.n+'</b> — <b>길드</b>에 보고하십시오. [J]',"#ffdf00");
 }
 if(ch2)refreshQuest();
}
function qCollectSync(k){
 var id,st,Q,i,o,c=cntItem(k),ch2=false;
 for(id in P.q){st=P.q[id];Q=QUESTS[id];if(!Q)continue;
   for(i=0;i<Q.obj.length;i++){o=Q.obj[i];
     if(o.t!=="collect"||o.k!==k)continue;
     var v=Math.min(o.n,c);
     if(v!==st.p[i]){st.p[i]=v;ch2=true;
       floaters.push({x:P.fx,y:P.fy-0.7,t:o.d+" "+v+"/"+o.n,c:"#e8d36e",t0:T});
       if(v>=o.n&&qReady(id))log('<b>'+Q.n+'</b> — <b>길드</b>에 보고하십시오. [J]',"#ffdf00");}
   }}
 if(ch2)refreshQuest();
}
/* ================= R22 길드(의뢰 게시판) =================
   대표 지시: "퀘스트를 길드 화면으로 옮기는 작업" — 거점이 배경+레일로 바뀌면서
   걸어다니는 성읍의 NPC 머리 위 「!」를 찾아갈 수 없게 됐다. 그래서 **수락·보고를 이 화면에서** 한다.

   ★ 새 저장 필드도, 새 퀘스트 데이터도 만들지 않았다. qAvail/qAccept/qReady/qTurnIn 은 이미 있고
     NPC 대화가 그걸 부르고 있었을 뿐이다 — 여기서는 같은 함수를 버튼으로 부른다.
     그래서 걸어다니는 성읍(이행 기간)에서 NPC와 대화하는 길도 그대로 살아 있다. 둘이 같은 상태를 본다.

   퀘스트는 QORDER 로 **한 줄로 이어진 사슬**이다(앞 이야기를 끝내야 다음이 열린다).
   그래서 게시판에는 보통 '의뢰 가능 1개 + 진행 중 1개' 만 뜬다 — 잠긴 것은 조건을 보여 주는 게
   목표 제시가 된다(업적 목록과 같은 철학). 다만 전부 늘어놓으면 줄거리 스포일러라 앞 2개만 이름을 준다. */
function qBlockReason(id){
  var Q = QUESTS[id];
  if(!Q) return "없는 의뢰";
  if(P.qd[id]) return null;                       /* 이미 완료 */
  if(P.q[id])  return null;                       /* 진행 중 */
  if(P.lv < Q.lv) return "Lv." + Q.lv + " 이상";
  var ch = qChain(qRegOf(id)), i = ch.indexOf(id);
  if(i > 0 && !P.qd[ch[i - 1]]) return "「" + QUESTS[ch[i - 1]].n + "」 먼저";
  return null;                                    /* 수락 가능 */
}
/* 게시판에서 수락 — 의뢰문 첫 줄을 로그에 남긴다(NPC 대화 대신 맥락을 준다) */
function qAcceptFrom(id){
  if(!qAvail(id)){ log("지금은 받을 수 없는 의뢰입니다.", "#f88"); return; }
  var Q = QUESTS[id];
  if(Q.s && Q.s.length) log('<b>' + npcName(Q.giver) + '</b> — ' + Q.s[0], "#c9c0a8");
  qAccept(id);
}
/* 게시판에서 보고 */
function qTurnInFrom(id){
  if(!qReady(id)){ log("아직 조건을 채우지 못했습니다.", "#f88"); return; }
  var Q = QUESTS[id];
  if(Q.e && Q.e.length) log('<b>' + npcName(Q.giver) + '</b> — ' + Q.e[0], "#c9c0a8");
  qTurnIn(id);
}

function qRewLine(Q){
  return '보상: 경험치 ' + Q.rew.xp.toLocaleString() + ' · 은화 ' + Q.rew.gold.toLocaleString()
       + (Q.rew.item ? ' · ' + ITEMS[Q.rew.item[0]].n : '');
}

/* 게시판 HTML — #qlist 에 들어간다. 거점 허브의 「길드」 버튼도 이 패널을 연다(openP("quest")). */
function guildBoardHtml(){
  var h = "", i, id, Q, st;
  /* 지역별 간판 — 허브가 있으면 그 지역 길드 이름·주인·한 줄을 머리에 얹는다 */
  if(typeof hubFacInfo === "function" && typeof HUB !== "undefined" && HUB.id){
    var inf = hubFacInfo("guild");
    if(inf && inf.n){
      h += '<div class="gsign"><b>' + inf.n + '</b>'
         + (inf.who ? ' <span>· ' + inf.who + '</span>' : '')
         + (inf.line ? '<i>' + inf.line + '</i>' : '') + '</div>';
    }
  }
  /* ① 의뢰 가능 — R27: 지금 있는 지역의 사슬만 본다 */
  var REG = qCurReg(), CH = qChain(REG);
  var open = CH.filter(function(q){ return qAvail(q); });
  h += '<div class="ghead">의뢰 게시판'
     + (typeof hubDef === "function" && hubDef(REG) ? ' <span class="glv">' + hubDef(REG).n + '</span>' : '')
     + '</div>';
  if(!open.length){
    h += '<div class="gnone">지금 받을 수 있는 의뢰가 없습니다.</div>';
  }
  open.forEach(function(id){
    Q = QUESTS[id];
    h += '<div class="qrow open"><div class="qt">' + Q.n
       + ' <span class="glv">Lv.' + Q.lv + '</span></div>';
    h += '<div class="qs">' + Q.sum + ' &nbsp;— 의뢰: ' + npcName(Q.giver) + '</div>';
    Q.obj.forEach(function(o){ h += '<div class="qo">· ' + o.d + (o.t === "zone" ? "" : " ×" + o.n) + '</div>'; });
    h += '<div class="qs">' + qRewLine(Q) + '</div>';
    h += '<div class="gbtnrow"><button class="ib" onclick="qAcceptFrom(\'' + id + '\')">수 락</button></div>';
    h += '</div>';
  });
  /* ② 진행 중 */
  /* R30 — 지금 데이터에 없는 퀘스트 id 는 건너뛴다. 옛 세이브가 그런 id 를 물고 있으면
     예전에는 여기서 예외가 나 **불러오기가 통째로 실패**했다(대표 리포트: 이어하기가 먹지 않음). */
  var live = Object.keys(P.q).filter(function(q){ return !!QUESTS[q]; });
  var act = live.filter(function(q){ return qRegOf(q) === REG; });
  var away = live.filter(function(q){ return qRegOf(q) !== REG; });
  h += '<div class="ghead">진행 중</div>';
  if(!act.length) h += '<div class="gnone">이 지역에서 진행 중인 의뢰가 없습니다.</div>';
  if(away.length) h += '<div class="gnone">다른 지역 의뢰 ' + away.length + '건은 그 지역 길드에서 보고하십시오 — '
     + away.map(function(q){ return QUESTS[q].n + '('
       + ((typeof hubDef === "function" && hubDef(qRegOf(q))) ? hubDef(qRegOf(q)).n : qRegOf(q)) + ')'; }).join(', ') + '</div>';
  act.forEach(function(id){
    Q = QUESTS[id]; st = P.q[id];
    var rdy = qReady(id);
    h += '<div class="qrow' + (rdy ? ' ready' : '') + '"><div class="qt">' + Q.n
       + (rdy ? ' <span style="color:#ffdf00">[완료 가능]</span>' : '') + '</div>';
    h += '<div class="qs">' + Q.sum + ' &nbsp;— 의뢰: ' + npcName(Q.giver) + '</div>';
    Q.obj.forEach(function(o, i){
      var v = st.p[i] || 0, dn = v >= o.n;
      h += '<div class="qo' + (dn ? " done" : "") + '">· ' + o.d + ' '
         + (o.t === "zone" ? (dn ? "(완료)" : "(미완)") : v + " / " + o.n) + '</div>';
    });
    h += '<div class="qs">' + qRewLine(Q) + '</div>';
    h += '<div class="gbtnrow"><button class="ib' + (rdy ? '' : ' sell') + '" '
       + 'onclick="qTurnInFrom(\'' + id + '\')">보 고</button></div>';
    h += '</div>';
  });
  /* ③ 아직 열리지 않은 의뢰 — 앞 2개만 이름을 준다(그 뒤는 개수만: 줄거리 스포일러 방지) */
  var locked = CH.filter(function(q){ return !P.qd[q] && !P.q[q] && !qAvail(q); });
  if(locked.length){
    h += '<div class="ghead dim">아직 열리지 않은 의뢰</div>';
    locked.slice(0, 2).forEach(function(q){
      h += '<div class="qrow locked"><div class="qt">🔒 ' + QUESTS[q].n + '</div>'
         + '<div class="qs">' + qBlockReason(q) + '</div></div>';
    });
    if(locked.length > 2)
      h += '<div class="gnone">그 밖에 ' + (locked.length - 2) + '개의 이야기가 남아 있습니다.</div>';
  }
  /* ④ 완료 */
  var done = CH.filter(function(q){ return P.qd[q]; });
  if(done.length){
    h += '<div class="ghead dim">완료한 이야기 (' + done.length + '/' + CH.length + ')</div>';
    done.forEach(function(q){ h += '<div class="qrow cleared"><div class="qt">✔ ' + QUESTS[q].n + '</div></div>'; });
  }
  return h;
}

function refreshQuest(){
 if(!P)return;
 var L=document.getElementById("qlist");
 /* R22 — 목록만 보여 주던 곳을 **수락·보고까지 되는 길드 게시판**으로 바꿨다(대표 지시).
    거점이 배경+레일로 바뀌어 NPC 머리 위 「!」를 찾아갈 수 없기 때문이다. */
 if(L) L.innerHTML = guildBoardHtml();
 /* HUD 추적기 */
 /* ★ R27 — 추적기에 **수락한 퀘스트를 전부** 띄운다
    (대표 리포트: "오른쪽에 퀘스트 목록이 다 안뜨고 한가지만 뜨고있는데 수락한 퀘스트는 다 뜨고
     클릭하면 자세한 내용나오는 형태로").
    예전엔 P.qcur 하나만 그렸다 — 여러 개를 동시에 받아 두면 나머지는 화면에서 사라졌다.
    이제 접힌 목록으로 전부 보여 주고, 누른 것 하나만 목표까지 펼친다(P.qcur 이 곧 펼친 것). */
 var tr=document.getElementById("qtrack");
 var ids=Object.keys(P.q).filter(function(q){ return !!QUESTS[q]; });   /* R30 — 없는 id 방어 */
 if(!ids.length){tr.style.display="none";tr.innerHTML="";}
 else{
   var cur=(P.qcur&&P.q[P.qcur])?P.qcur:ids[0];
   var h2='<div class="tth">의뢰 '+ids.length+'건</div>';
   ids.forEach(function(id){
     var Q2=QUESTS[id];if(!Q2)return;
     var st2=P.q[id],rdy=qReady(id),open=(id===cur);
     var done=0;Q2.obj.forEach(function(o,i){if((st2.p[i]||0)>=o.n)done++;});
     h2+='<div class="qtrow'+(open?" open":"")+(rdy?" rdy":"")+'" onclick="qTrackPick(\''+id+'\')">';
     h2+='<div class="tt">'+(rdy?"★ ":"")+Q2.n+' <span>'+done+'/'+Q2.obj.length+'</span></div>';
     if(open){
       Q2.obj.forEach(function(o,i){var v=st2.p[i]||0,dn=v>=o.n;
         h2+='<div class="to'+(dn?" done":"")+'">'+(dn?"✔":"·")+' '+o.d+' '+(o.t==="zone"?"":v+"/"+o.n)+'</div>';});
       if(Q2.sum)h2+='<div class="tsum">'+Q2.sum+'</div>';
       /* R22 — 보고는 길드 게시판에서 한다(예전엔 의뢰인 NPC를 찾아가야 했다) */
       if(rdy)h2+='<div style="color:#ffdf00">▶ 길드에 보고 [J]</div>';
     }
     h2+='</div>';
   });
   tr.innerHTML=h2;tr.style.display="block";
 }
}
/* 추적기에서 하나를 누르면 그것만 펼친다(같은 것을 다시 누르면 접는다 = 다음 것으로) */
function qTrackPick(id){
 if(!P||!P.q[id])return;
 P.qcur=(P.qcur===id)?null:id;
 if(typeof sfx==="function")sfx("click");
 refreshQuest();
}
function npcName(id){
 var z,i,n;
 for(z=0;z<ZONES.length;z++)for(i=0;i<ZONES[z].npcs.length;i++){n=ZONES[z].npcs[i];if(n.id===id)return n.n;}
 return id;
}
/* ---- 대화창 ---- */
var DLG={npc:null,lines:[],i:0,mode:null,qid:null,open:false};
function openDialog(npc){
 var qq=npcQuest(npc.id),id=qq[0],mode=qq[1];
 DLG.npc=npc;DLG.qid=id;DLG.mode=mode;DLG.i=0;DLG.open=true;
 if(mode==="give")DLG.lines=QUESTS[id].s.slice();
 else if(mode==="done")DLG.lines=QUESTS[id].e.slice();
 else if(mode==="prog"){
   var Q=QUESTS[id],st=P.q[id],rem=[];
   Q.obj.forEach(function(o,i){if((st.p[i]||0)<o.n)rem.push(o.d+" ("+(st.p[i]||0)+"/"+o.n+")");});
   DLG.lines=["아직인가? "+Q.n+" 말일세.","남은 것: "+rem.join(", ")];
 }else DLG.lines=[idleTalk(npc)];
 var pc=document.getElementById("dlgport"),g=pc.getContext("2d");
 pc.style.display="block";        /* R24: 시설 화면(신전)에서 숨겨 뒀을 수 있다 — NPC 대화는 다시 보여 준다 */
 g.imageSmoothingEnabled=false;g.clearRect(0,0,70,86);
 g.fillStyle="#0a0812";g.fillRect(0,0,70,86);
 /* 공장 NPC 시트가 있으면 그걸 초상화로 (마을과 같은 아트) */
 var psn="npc_"+npc.id, prec=(typeof MSH!=="undefined"&&MSH.set[psn]&&MSH.set[psn].ok)?MSH.set[psn].img.idle_s:null;
 if(prec&&prec.img){
   var pk2=Math.min(64/prec.fw,78/prec.fh);
   g.drawImage(prec.img,0,0,prec.fw,prec.fh,
     Math.round((70-prec.fw*pk2)/2),Math.round(84-prec.fh*pk2),
     Math.round(prec.fw*pk2),Math.round(prec.fh*pk2));
 }else{
   var pk=Math.min(70/SW,84/SH);
   g.drawImage(sprite("npc_"+npc.kind,ACT[npc.act],0,"i0"),0,0,SW,SH,
     Math.round((70-SW*pk)/2),2,Math.round(SW*pk),Math.round(SH*pk));
 }
 document.getElementById("dlgname").innerHTML=npc.n+" <i>【"+npc.title+"】</i>";
 document.getElementById("dlg").style.display="block";
 dlgStep();
}
function idleTalk(npc){
 if(npc.kind==="shop")return "필요한 게 있으면 말하게. 값은 정직하게 받네.";
 if(npc.kind==="inn")return "하룻밤 쉬어가겠나? 50 은화면 되네.";
 if(npc.kind==="portal")return "문을 여는 데엔 값이 듭니다. 어디로 가시겠습니까?";
 if(npc.kind==="bless")return "가호를 원하십니까? 오래 가지는 않습니다만.";
 return "그대의 앞길에 빛이 함께하기를.";
}
function dlgStep(){
 var t=document.getElementById("dlgtext"),b=document.getElementById("dlgbtn");
 t.innerHTML=DLG.lines[DLG.i]||"";
 var last=(DLG.i>=DLG.lines.length-1);
 var h="";
 if(!last)h='<button class="ib" onclick="dlgNext()">다음 ▶</button>';
 else{
   if(DLG.mode==="give")h='<button class="ib" onclick="dlgAccept()">수락</button><button class="ib sell" onclick="closeDialog()">나중에</button>';
   else if(DLG.mode==="done")h='<button class="ib" onclick="dlgComplete()">완료 보고</button>';
   else{
     h="";
     if(DLG.npc.kind==="shop")h+='<button class="ib" onclick="closeDialog();openShop()">상점 열기</button>';
     if(DLG.npc.kind==="inn")h+='<button class="ib" onclick="closeDialog();useInn()">휴식 (50)</button>';
     if(DLG.npc.kind==="portal")h+='<button class="ib" onclick="openPortal()">차원문 열기</button>';
     if(DLG.npc.kind==="bless")h+='<button class="ib" onclick="openBless()">축복 받기</button>';
     h+='<button class="ib sell" onclick="closeDialog()">닫기</button>';
   }
 }
 b.innerHTML=h;
}
function dlgNext(){DLG.i++;sfx("pot");dlgStep();}
function dlgAccept(){qAccept(DLG.qid);closeDialog();}
function dlgComplete(){qTurnIn(DLG.qid);closeDialog();
 var nq=npcQuest(DLG.npc.id);
 if(nq[1]==="give")setTimeout(function(){openDialog(DLG.npc);},420);}
function closeDialog(){DLG.open=false;document.getElementById("dlg").style.display="none";}
/* ---- 기록물 ---- */
function loreCount(){var n=0,k;for(k in LORE)if(P.lore[k])n++;return n;}
function pickLore(k){
 if(P.lore[k])return;
 P.lore[k]=1;sfx("ench");spark(LORE[k].x,LORE[k].y,"#9fe2ff",12,1.2);
 log('기록물 발견 — <b>'+LORE[k].n+'</b>  ('+loreCount()+"/"+Object.keys(LORE).length+")","#9fe2ff");
 /* 기록물은 이제 계시(문신) 후보를 넓힌다 — 읽을 이유를 만든다 */
 if(typeof revUnlockedByLore==="function")revUnlockedByLore();
 log('"'+LORE[k].t+'"',"#a89c86");
 openP("lorep");refreshLore();
}
function refreshLore(){
 if(!P)return;
 var keys=Object.keys(LORE),L=document.getElementById("llist"),h="";
 document.getElementById("lcount").innerHTML="수집 <b style='color:#9fe2ff'>"+loreCount()+"</b> / "+keys.length+
   " &nbsp;·&nbsp; 맵에서 반짝이는 물건을 밟으면 수집됩니다.";
 keys.forEach(function(k){
   var l=LORE[k],got=P.lore[k];
   h+='<div class="lrow'+(got?"":" lock")+'"><div class="lt">'+(got?l.n:"??? ")+
      ' <span style="color:#6b6046;font-size:10px">'+ZONES[l.z].name+'</span></div>';
   if(got)h+='<div class="lx">"'+l.t+'"</div>';
   h+='</div>';});
 L.innerHTML=h;
}
function checkLore(){
 var k,l;
 for(k in LORE){l=LORE[k];
   if(l.z!==curZ||P.lore[k])continue;
   if(Math.abs(P.fx-l.x)<0.9&&Math.abs(P.fy-l.y)<0.9)pickLore(k);}
}
