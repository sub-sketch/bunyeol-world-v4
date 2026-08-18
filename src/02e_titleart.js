/* ================= 타이틀 일러스트 배경 (5차 공장 산출물) =================
   build.py 가 assets/ui/title.jpg 를 TITLEART 전역으로 주입한다.
   없으면 빈 문자열 — 기존 라디얼 그라디언트가 그대로 남는다 (폴백).
   가독성: 일러스트 위에 어두운 그라디언트를 겹쳐 제목·카드가 묻히지 않게 한다.
   ========================================================================= */
(function(){
  if(typeof TITLEART === "undefined" || !TITLEART) return;
  /* 타이틀: 일러스트를 살리고, 캐릭터 선택: 카드가 주인공이라 더 어둡게 깐다 */
  [["startov", ".42,.62,.88"], ["charov", ".72,.82,.94"]].forEach(function(cfg){
    var ov = document.getElementById(cfg[0]);
    if(!ov) return;
    var a = cfg[1].split(",");
    ov.style.backgroundImage =
      "linear-gradient(rgba(5,5,8," + a[0] + ") 0%, rgba(5,5,8," + a[1] + ") 55%, rgba(5,5,8," + a[2] + ") 100%), url(" + TITLEART + ")";
    ov.style.backgroundSize = "cover";
    ov.style.backgroundPosition = "center 30%";
    ov.style.backgroundRepeat = "no-repeat";
  });
})();
