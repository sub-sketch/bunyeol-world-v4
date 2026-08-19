/* R34h — 음악 겹침 회귀 검증 (대표 신고: 사냥하다 마을로 돌아오면 노래가 겹친다)
   실행: CHROME_PATH=... GAME_HTML=...빌드\분열된세계_v4_R34h_한글판.html node verify_r34h_music_overlap.js
   판정: 페이드가 다 끝난 뒤 '소리 나는 오디오 요소'가 1개를 넘으면 실패. */
const {chromium}=require('playwright');
const FILE=process.env.GAME_HTML;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
 const p=await b.newPage(); const errs=[]; let fail=0;
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+FILE.replace(/\\/g,'/')); await p.waitForTimeout(2200);
 await p.mouse.click(400,300); await p.waitForTimeout(600);
 const live=()=>p.evaluate(()=>{const o={};for(const k in MUS.el){const e=MUS.el[k];if(!e.paused&&e.volume>0.001)o[k]=+e.volume.toFixed(3);}return o;});
 const scenario=async(name,steps)=>{
   await p.evaluate(()=>{musicStopAll();});
   for(const s of steps){ await p.evaluate(s.js); await p.waitForTimeout(s.wait); }
   await p.waitForTimeout(1400);
   const l=await live(), n=Object.keys(l).length;
   if(n>1)fail++;
   console.log((n<=1?' PASS ':'*FAIL*')+' '+name+'  → 재생중 '+n+'곡  '+JSON.stringify(l));
 };
 await scenario('필드 → 마을(존곡+거점곡 연속)',[
   {js:()=>musicPlay('field',true),wait:1200},
   {js:()=>setMusicZone('town'),wait:120},
   {js:()=>{if(typeof hubMusic==='function'){HUB={id:'dong'};hubMusic();}else musicPlay('town');},wait:60}]);
 await scenario('전환 4연타(페이드 중 난입)',[
   {js:()=>musicPlay('field',true),wait:900},
   {js:()=>musicPlay('dun',true),wait:150},
   {js:()=>musicPlay('boss',true),wait:150},
   {js:()=>musicPlay('town',true),wait:150},
   {js:()=>musicPlay('town_dong',true),wait:60}]);
 await scenario('마을↔필드 왕복 3회',[
   {js:()=>musicPlay('town',true),wait:400},
   {js:()=>musicPlay('field',true),wait:400},
   {js:()=>musicPlay('town',true),wait:400},
   {js:()=>musicPlay('field',true),wait:400},
   {js:()=>musicPlay('town',true),wait:60}]);
 console.log('\n오류:',errs.slice(0,4).join(' | ')||'없음');
 await b.close(); process.exit(fail?1:0);
})();
