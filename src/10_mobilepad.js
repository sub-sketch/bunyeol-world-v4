/* ================= 모바일 터치 패드 — R36 비활성화 =================
   대표 지시(2026-08-19): "모바일 버전 없애줘". PC 전용으로 간다.

   ★ 파일을 지우지 않고 '아무 일도 하지 않는 껍데기'로 바꾼 이유:
     IS_TOUCH / padOn / togglePad / buildPad / syncPad 를 부르는 곳이
     01b_options.js · 05c_uiclick.js · 21_input.js · 23_main.js · shell/template.html 에 흩어져 있다.
     파일을 빼면 그 호출부를 전부 고쳐야 하고, 나중에 되살릴 때 또 되돌려야 한다.
     껍데기로 두면 호출부는 그대로 살아 있고 아무 동작도 하지 않는다.

   되살리는 법: _보관/모바일/10_mobilepad.js.원본 을 이 파일 위에 덮어쓰고,
                shell/template.html 의 #mpad / #mpadtoggle / #rotatehint 숨김(R36)을 지운다.
   =================================================================== */
var IS_TOUCH = false;      /* 터치 기기여도 PC 조작으로 간다 */
var padOn = false;
var padEls = null;
function togglePad(){ }
function buildPad(){ }
function syncPad(){ }
