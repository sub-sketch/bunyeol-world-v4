/* ================= 상태 ================= */
var P=null,curZ=1,T=0,portLock=0,enchState=null,deadFlag=false,shopOpen=false,shopCat=0;
var floaters=[],projs=[],parts=[],started=false,lastAuto=0,pickCls="k";
/* R18 선 이펙트 — 연쇄 감전(zap)·관통 광선(beamFx)이 쓰는 짧은 선분. parts 와 같은 수명 방식. */
var beams=[];
function newPlayer(name,cls){
 var C=CLS[cls];
 return {name:name||"모험가",cls:cls,lv:1,xp:0,hp:C.hp,mhp:C.hp,mp:C.mp,mmp:C.mp,
  str:C.str,dex:C.dex,con:C.con,int:C.int,wis:C.wis,gold:TEST_GOLD,zone:0,fx:13,fy:13,
  inv:[],eq:{weapon:null,armor:null,helm:null,shield:null,cloak:null,boots:null,glove:null,ammo:null},
  tf:null,tfSkin:true,braveT:0,cd:{},buffs:{},na:0,tgt:null,dest:null,face:0,anim:0,mv:-9,atkT:-9,
  kills:0,bossKilled:false,tfUnlock:[],tfT:0,dot:{},hurtT:-9,sw:null,q:{},qd:{},lore:{},qcur:null,autoCounter:true,autoMode:"hunt",autoSkill:true,_acLast:null,ap:apDefault(),hunt:null,
  bind:defaultBind(),aslot:[null,null,null,null],aauto:[true,true,true,true],fac:"player",metaHpApplied:0,metaAtk:0,metaAc:0,markHpApplied:0,markAtk:0,markGiven:false};
}
function need(l){var n=52*l*l+80;return l<10?Math.floor(n/2):n;}
/* 단축키 — 스킬 4칸 + 물약 4칸. 사용자가 자유롭게 재지정 가능 */


function defaultBind(){return {sk:["q","w","e","r"],pt:["1","2","3","4","5"]};}
function bindLabel(k){return k?k.toUpperCase():"—";}
var bindWait=null; /* {type:"sk"|"pt", idx:n} */
function startBind(type,idx){
 bindWait={type:type,idx:idx};
 log("새 단축키로 사용할 키를 누르십시오. (ESC = 취소, Delete = 해제)","#9fe2ff");
 refreshSkillPanel();
}
function applyBind(key){
 if(!bindWait)return false;
 var w=bindWait;bindWait=null;
 if(key==="escape"){log("단축키 지정을 취소했습니다.","#888");refreshSkillPanel();return true;}
 if(key==="delete"||key==="backspace"){P.bind[w.type][w.idx]="";log("단축키를 해제했습니다.","#888");
   refreshSkillPanel();refreshQuick();return true;}
 if(key.length!==1&&["f1","f2","f3","f4","f5","f6","f7","f8"].indexOf(key)<0){
   log("사용할 수 없는 키입니다.","#f88");refreshSkillPanel();return true;}
 /* 중복 해제 */
 ["sk","pt"].forEach(function(t){P.bind[t].forEach(function(k,i){
   if(k===key){P.bind[t][i]="";}});});
 P.bind[w.type][w.idx]=key;
 log("단축키를 <b>"+bindLabel(key)+"</b> 로 지정했습니다.","#8fd18f");sfx("pot");
 refreshSkillPanel();refreshQuick();
 return true;
}
function resetBind(){P.bind=defaultBind();log("단축키를 기본값으로 되돌렸습니다.","#888");
 refreshSkillPanel();refreshQuick();}
/* 이능 등급 (canon/rules.yaml: 최하~최상급) */
var GRADES=[[1,"최하급","#8a8478"],[10,"하급","#9fc0a0"],[20,"중급","#7fc7ff"],[30,"상급","#c07aff"],[40,"최상급","#ffd24a"]];
function gradeOf(lv){var i,g=GRADES[0];for(i=0;i<GRADES.length;i++)if(lv>=GRADES[i][0])g=GRADES[i];return g;}
var TATTOO={
 k:{part:"오른 어깨",sign:"검과 저울",god:"빛 · 검신(무신/글라디우스)"},
 e:{part:"왼 손등",sign:"잎맥과 바람",god:"생명 · 정령신(스피리투스)"},
 m:{part:"목덜미",sign:"삼중 원환",god:"어둠 · 지혜신(문창신/소피아)"}};
function canUse(k){var d=ITEMS[k];return !d.cls||d.cls.indexOf(P.cls)>=0;}
/* R23 — 변신은 두 갈래다(대표 지시: "외형도 변할건지 능력치만 습득할건지").
   **외형까지** 바꾼 변신만 액터(그림·크기·그림자)를 마수 것으로 바꾼다.
   능력치만 빌린 변신(P.tfSkin=false)은 내 계열 액터를 그대로 쓴다 — 능력치 계산은
   pMaxHit/pAC/pAtkMs/pMS 가 P.tf 만 보므로 어느 쪽이든 완전히 같다. */
function actorOf(){return (P.tf&&P.tfSkin!==false)?ACT[TFS[P.tf].act]:ACT[CLS[P.cls].act];}
function eqBonus(f){var s=0;SLOTS.forEach(function(sl){var it=P.eq[sl];if(it&&ITEMS[it.k][f])s+=ITEMS[it.k][f];});return s;}
/* ================= R26 세트 효과 (확장팩 지역 장비) =================
   아이템에 `set:"east"` 처럼 적고, SETS[그 키].tiers 에 "몇 부위부터 무엇" 을 적는다.
   ★ 데이터는 팩(pack_서륙.json)에 있다 — 본편 파일은 건드리지 않는다. SETS 가 없으면 전부 0이다.
   ★ 착용 수는 매번 센다(슬롯 8개짜리 루프라 비용이 없다) — 장착/해제마다 캐시를 갱신하는
     코드를 새로 만들면 그게 곧 버그 자리가 된다(강화·판매·사망 초기화 등 갱신 지점이 많다). */
function setCount(id){
  var n=0,i,it;
  for(i=0;i<SLOTS.length;i++){it=P.eq[SLOTS[i]];if(it&&ITEMS[it.k]&&ITEMS[it.k].set===id)n++;}
  return n;
}
/* 지금 착용 조합이 주는 합계 {atk, ac} — 티어는 "달성한 것 중 가장 높은 것" 하나만 적용한다 */
function setEff(){
  var out={atk:0,ac:0};
  if(typeof SETS==="undefined"||!SETS||!P||!P.eq)return out;
  var id,s,n,i,best;
  for(id in SETS){
    s=SETS[id];n=setCount(id);best=null;
    for(i=0;i<(s.tiers||[]).length;i++) if(n>=s.tiers[i].n) best=s.tiers[i];
    if(best){out.atk+=(best.atk||0);out.ac+=(best.ac||0);}
  }
  return out;
}
/* 아이템 정보창에 "세트 2/4" 를 적기 위한 한 줄 */
function setLine(k){
  var d=ITEMS[k];
  if(!d||!d.set||typeof SETS==="undefined"||!SETS[d.set])return "";
  var s=SETS[d.set],n=setCount(d.set),i,txt=[];
  for(i=0;i<(s.tiers||[]).length;i++)
    txt.push('<span style="color:'+(n>=s.tiers[i].n?"#7CFC00":"#6b6046")+'">'+s.tiers[i].d+'</span>');
  return '<span style="color:#c9a6ff">【'+s.n+' '+n+'부위】</span> '+txt.join(" · ");
}
function pMag(){return eqBonus("mag");}
function pDex(){return P.dex+eqBonus("dex");}
function isRanged(){var w=P.eq.weapon,wt=w?ITEMS[w.k].wt:null;
 if(P.tf)return false;
 if(P.cls==="e")return wt==="bow"||!w;
 if(P.cls==="m")return true;
 return false;}
function pRange(){return isRanged()?CLS[P.cls].rng:1.35;}
/* 강화 실효치 — 돌파 구간은 한 단계가 크다.
   무기: +6(안전 상한)까지 1씩, +7부터 한 단계당 +3.   +9 = 6 + 9 = +15
   방어: +4(안전 상한)까지 1씩, +5부터 한 단계당 +2.   +6 = 4 + 4 = +8
   돌파는 실패 시 파괴를 감수한 값이다 — 그만큼 확실히 세져야 도전할 이유가 된다.
   연출 티어(+7 돌파/+9 고돌파/+11 극돌파)와 같은 경계를 쓴다. */
function enchEffW(e){e=e||0;return e<=6?e:6+(e-6)*3;}
function enchEffA(e){e=e||0;return e<=4?e:4+(e-4)*2;}

function pMaxHit(){
 var w=P.eq.weapon,e=w?enchEffW(w.e):0,d1=1,d2=3,base=0;
 if(w){d1=ITEMS[w.k].d1;d2=ITEMS[w.k].d2;
   if(w.opt){d1-=w.opt.m;d2-=w.opt.m;}}   /* 특효 무기의 대가 — 기본 공격 감소 */
 if(P.cls==="k"){base=(P.str-12)+e;}
 else if(P.cls==="e"){base=Math.floor((pDex()-10)*0.9)+Math.floor((P.str-10)*0.4)+e;
   var am=P.eq.ammo;if(am&&ITEMS[am.k].dmg)base+=ITEMS[am.k].dmg;}
 else{base=Math.floor((P.int-8)*0.9)+Math.floor(pMag()*0.5)+e;}
 if(P.tf)base+=TFS[P.tf].dmg;
 if(P.buffs.bd&&T<P.buffs.bd.t)base+=P.buffs.bd.v;
 base+=(P.metaAtk||0)+(P.markAtk||0);   /* v4 메타 영구 성장 + 각인 */
 if(typeof setEff==="function")base+=setEff().atk;   /* R26 세트 효과 */
 if(typeof revAtk==="function")base+=revAtk();   /* 계시: 벼려진 칼끝 + 이어지는 참격 + 회피 반격 */
 return [Math.max(1,d1+base),Math.max(2,d2+base)];
}
function pAC(){
 var a=0;SLOTS.forEach(function(sl){var it=P.eq[sl];if(it&&ITEMS[it.k].ac)a+=ITEMS[it.k].ac+(ITEMS[it.k].t==="weapon"?0:enchEffA(it.e));});
 a+=Math.floor(Math.max(0,pDex()-12)*0.5);
 if(P.tf)a+=TFS[P.tf].ac;
 if(P.buffs.bac&&T<P.buffs.bac.t)a+=P.buffs.bac.v;
 a+=(P.metaAc||0);                /* v4 메타 영구 성장 */
 if(typeof setEff==="function")a+=setEff().ac;   /* R26 세트 효과 (마경 저주 세트는 음수 = 방어 약화) */
 return a;
}
function acShow(){return 10-pAC();}
function pAtkMs(){var ms=CLS[P.cls].atk;if(P.tf)ms*=TFS[P.tf].asp;if(T<P.braveT)ms*=.75;
 if(buffV("bhs"))ms*=.78;
 if(typeof metaLv==="function")ms*=(1-0.04*metaLv("aspd"));   /* 메타: 공격 속도 */
 if(typeof revVal==="function")ms*=(1-revSum("aspd")/100);   /* 계시: 바람의 손목 */
 return ms;}
function pMS(){var s=CLS[P.cls].ms;if(P.tf)s*=TFS[P.tf].ms;
 if(typeof metaLv==="function")s*=(1+0.05*metaLv("mspd"));    /* 메타: 이동 속도 */
 if(typeof revVal==="function")s*=(1+revSum("mspd")/100);  /* 계시: 그림자 걸음 */
 return s;}
function magDmg(sp){return Math.round((ri(sp.d1,sp.d2)+P.int*sp.k+P.lv*0.5)*(1+pMag()*0.05));}
/* 로그 */
var logEl=document.getElementById("log"),logMode=0;
function log(msg,c){var d=document.createElement("div");d.style.color=c||"#ddd";d.innerHTML=msg;
 logEl.appendChild(d);while(logEl.children.length>60)logEl.removeChild(logEl.firstChild);logEl.scrollTop=99999;}
function cycleLog(){logMode=(logMode+1)%3;logEl.className=logMode===1?"big":(logMode===2?"hide":"");
 logEl.scrollTop=99999;document.getElementById("logtab").textContent=["로그 ▾","로그 ▴","로그 ×"][logMode];}
