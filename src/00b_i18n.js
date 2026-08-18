/* ================= 다국어 =================
   지금은 한국어만 채워져 있다. 영어는 data/lang.json 의 en 블록을 채우면 켜진다.

   쓰는 법
     TX("dot.poison.tick")                 단순 조회
     TX("buff.gain", 이름, 분)             {0} {1} 자리에 순서대로 끼워 넣음
     TX("아직 키가 없는 문장")               테이블에 없으면 그대로 반환 — 안전

   원칙: 앞으로 새로 쓰는 사용자 노출 문자열은 전부 TX 를 거친다.
        기존 812개는 화면 단위로 나눠 점진 이관한다. 한 번에 갈아엎지 않는다.
        (섞여 있어도 깨지지 않는다 — 미등록 키는 원문 그대로 나가기 때문)
   ========================================================================= */
var LANG = (typeof LANG !== "undefined") ? LANG : { ko: {} };
var LANGCUR = "ko";

function langAvail(){ var a=[],k; for(k in LANG) a.push(k); return a; }

function setLang(code){
 if(!LANG[code]) return false;
 LANGCUR = code;
 try{ localStorage.setItem("lc2_lang", code); }catch(e){}
 return true;
}

function langInit(){
 var s=null;
 try{ s=localStorage.getItem("lc2_lang"); }catch(e){}
 if(s&&LANG[s]){ LANGCUR=s; return; }
 /* 저장값이 없으면 브라우저 언어를 본다. 한국어가 아니고 en 이 준비돼 있으면 en. */
 var n=(navigator.language||"ko").toLowerCase();
 if(n.indexOf("ko")!==0&&LANG.en) LANGCUR="en";
}

function TX(key){
 var tbl=LANG[LANGCUR]||LANG.ko||{};
 var s=tbl[key];
 if(s===undefined&&LANGCUR!=="ko"&&LANG.ko) s=LANG.ko[key];   /* 번역 누락 시 한국어로 */
 if(s===undefined) s=key;                                     /* 그래도 없으면 원문 */
 if(arguments.length>1){
   for(var i=1;i<arguments.length;i++)
     s=s.split("{"+(i-1)+"}").join(String(arguments[i]));
 }
 return s;
}
