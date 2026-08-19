/* ================= UI 클릭음 (R34g) =================
   대표 지시: "아이콘 메뉴부분과 상점부분 전투관련등은 클릭시 클릭음을 간단하게 추가"

   설계 — 버튼마다 onclick 에 소리 호출을 심지 않는다.
     화면을 만드는 곳이 12_shop / 08_inventory / 30_shopui / 10_mobilepad / 27_hub ... 로 흩어져 있고,
     대부분 innerHTML 문자열로 버튼을 찍어낸다. 거기에 하나씩 손대면 새 버튼이 생길 때마다 빠진다.
     그래서 document 한 곳에서 클릭을 가로채고(캡처 단계), 눌린 요소의 '생김새'로 소리를 고른다.
     새로 만드는 버튼도 같은 클래스만 쓰면 자동으로 소리가 난다.

   소리는 전부 기존 칩튠 합성기(sfx)로 만든다 — 새 에셋이 없어 용량이 늘지 않는다.
   효과음 끄기·음량은 기존 설정(OPT.sfxOn / OPT.sfxVol)을 그대로 따른다. 별도 옵션을 만들지 않았다.
   ==================================================== */

/* 클래스 -> 소리 종류. 위에서부터 먼저 맞는 것을 쓴다(구체적인 것이 위). */
var UICLICK_MAP = [
 ["qbtn","ui_act"],  ["mbtn","ui_act"],  ["qs","ui_act"],     /* 퀵슬롯·모바일패드 = 전투 조작 */
 ["sell","ui_buy"],  ["sbtn","ui_buy"],  ["up","ui_buy"],  ["dn","ui_buy"],  /* 상점·강화 */
 ["bigbtn","ui_big"],["ccard","ui_big"], ["rcard","ui_big"],  /* 큰 결정 버튼·선택 카드 */
 ["x","ui_off"],     ["cls","ui_off"],                        /* 닫기 */
 ["ib","ui"],        ["hbtn","ui"],      ["mtab","ui"]        /* 일반 아이콘/메뉴 버튼 */
];

var UICLICK_LAST = 0;          /* 연타·중복 발생 방지 (같은 클릭이 두 번 울리지 않게) */

function uiClickKind(el){
 var hop = 0, cn, i;
 while(el && el.nodeType === 1 && hop++ < 5){
   cn = " " + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : (el.className || "")) + " ";
   for(i = 0; i < UICLICK_MAP.length; i++)
     if(cn.indexOf(" " + UICLICK_MAP[i][0] + " ") >= 0) return UICLICK_MAP[i][1];
   /* 클래스가 없어도 버튼이거나 onclick 이 달려 있으면 기본 클릭음을 준다 */
   if(el.tagName === "BUTTON" || (el.getAttribute && el.getAttribute("onclick"))) return "ui";
   el = el.parentNode;
 }
 return null;
}

(function(){
 if(typeof document === "undefined" || !document.addEventListener) return;
 document.addEventListener("click", function(e){
   try{
     var t = e.target || e.srcElement;
     if(!t) return;
     if(t.disabled) return;
     var k = uiClickKind(t);
     if(!k) return;
     /* 게임 캔버스(공격 입력)는 버튼이 아니므로 여기까지 오지 않는다 */
     var now = (typeof T === "number") ? T : 0;
     var ms = (window.performance && performance.now) ? performance.now() : 0;
     if(ms && ms - UICLICK_LAST < 45) return;
     UICLICK_LAST = ms;
     if(typeof sfx === "function") sfx(k);
   }catch(err){}
 }, true);                                  /* 캡처 단계 — 중간에서 전파를 끊어도 소리는 난다 */
})();
