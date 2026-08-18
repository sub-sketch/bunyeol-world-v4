const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = 'file://' + path.resolve(__dirname, 'dist/game_분열된세계_ONLINE_배포.html');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto(url); await page.waitForTimeout(1200);
  try { await page.locator('text=건너뛰기').first().click({timeout:2000}); } catch(e){}
  await page.waitForTimeout(400);
  for(let i=0;i<3;i++){ try{await page.mouse.click(640,400);}catch(e){} await page.waitForTimeout(200); }
  try { await page.locator('text=모험 시작').first().click({timeout:2000}); } catch(e){}
  await page.waitForTimeout(400);
  try { await page.locator('input').first().fill('카드'); } catch(e){}
  try { await page.locator('text=모험 시작').first().click({timeout:2000,force:true}); } catch(e){}
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{ if(!P) startGame(); const m=document.getElementById('markov'); if(m)m.style.display='none'; });
  await page.waitForTimeout(400);

  const hide=()=>page.evaluate(()=>{const m=document.getElementById('markov'); if(m)m.style.display='none';});
  const box = await page.$eval('#game', el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};});
  const clip = { x: box.x+box.w*0.22, y: box.y+box.h*0.28, width: box.w*0.56, height: box.h*0.40 };

  // 1) 계시 카드 뒷면
  await page.evaluate(()=>{ deadFlag=false; hitstopClear(); travel(1,12,10); RUN.live=true; RUN.revs={}; P.lore={}; showRevelation(); });
  await page.waitForTimeout(400); await hide();
  await page.screenshot({path:'shot_card_1_계시뒷면.png', clip});

  // 2) 뒤집힌 직후
  await page.evaluate(()=>{ pickRevLine(RUN._revCards[0]); });
  await page.waitForTimeout(300); await hide();
  await page.screenshot({path:'shot_card_2_계시공개.png', clip});
  await page.waitForTimeout(900);

  // 3) 물자 뒷면
  await page.waitForTimeout(600); await hide();
  await page.screenshot({path:'shot_card_3_물자뒷면.png', clip});
  // 4) 물자 공개
  await page.evaluate(()=>{ pickFloorCard(0); });
  await page.waitForTimeout(300); await hide();
  await page.screenshot({path:'shot_card_4_물자공개.png', clip});
  console.log('오류:', errs.length?errs.join('\n'):'0건');
  await b.close();
})();
