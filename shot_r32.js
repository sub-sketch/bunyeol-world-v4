const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const url='file://'+path.resolve(process.cwd(),'dist/game_분열된세계_ONLINE_배포.html');
  async function open(cls){
    const p=await b.newPage({viewport:{width:1500,height:950}});
    p.on('pageerror',e=>console.log('ERR',e.message));
    await p.goto(url); await p.waitForTimeout(1200);
    await p.evaluate(()=>{try{META.clear1=1;META.clear2=1;metaSave();}catch(e){}});
    try{await p.locator('text=건너뛰기').first().click({timeout:1200});}catch(e){}
    for(let i=0;i<3;i++){try{await p.mouse.click(750,430);}catch(e){} await p.waitForTimeout(150);}
    await p.evaluate(c=>{pickCls=c; if(!P) startGame();},cls);
    await p.waitForTimeout(800);
    return p;
  }
  /* 노드판 3장 */
  for(const [cls,nm] of [['k','1_기사'],['e','2_정령'],['m','3_마도']]){
    const p=await open(cls);
    await p.evaluate(()=>{
      META.pt=4000; META.sk={}; META.nodes={};
      document.querySelectorAll('.overlay').forEach(o=>{o.style.display='none';});
      openMeta();
      const t=document.getElementById('introov'); if(t)t.style.display='none';
    });
    await p.waitForTimeout(700);
    await p.screenshot({path:'shot_r32_노드판_'+nm+'.png'});
    await p.close();
  }
  /* 정령 — 벽 + 소환수, 마도 — 장판 + 결계 */
  for(const [cls,nm,ids] of [['e','4_정령_벽소환',['spwolf','thorn']],['m','5_마도_장판결계',['iceward','flamef','mirror']]]){
    const p=await open(cls);
    await p.evaluate((ids)=>{
      if(RUN){RUN.live=false;RUN=null;}
      travel(0,10,9); hubShow('seo'); hubDepart();
      document.querySelectorAll('.panel,.overlay').forEach(el=>{if(el.id!=='game')el.style.display='none';});
      const z=world[curZ];
      z.def.npcs.length=0; if(z.fnpc)z.fnpc.length=0;
      P.mp=P.mmp=999; P.hp=P.mhp; P.dest=null;
      ids.forEach(id=>{META.sk[id]=1;});
      /* 몹 몇 마리를 앞에 세운다 */
      const keep=z.mobs.filter(m=>!m.dead).slice(0,3);
      z.mobs.forEach(m=>{m.dead=true;});
      keep.forEach((m,i)=>{m.dead=false;m.hp=m.mhp=m.d.hp=9999;m.fx=P.fx+2.2+i*0.9;m.fy=P.fy+0.6*i;m.stun=T+30;});
      P.tgt=keep[0]||null; P.face=3;
      const idx=id=>{const l=mySkills();for(let i=0;i<l.length;i++)if(l[i].id===id)return i;return -1;};
      ids.forEach(id=>{P.cd={};P.mp=999;castSkill(idx(id));});
      P.tgt=null;
    }, ids);
    await p.waitForTimeout(700);
    await p.locator('#game').screenshot({path:'shot_r32_'+nm+'.png'});
    await p.close();
  }
  console.log('done'); await b.close();
})();
