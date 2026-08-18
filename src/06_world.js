/* ================= 월드 ================= */
var world=[];
/* R2 — 엘리트 접두어 (서술형: 이름이 곧 능력 힌트다) */
var ELITE_PRE=[
 {pre:"굶주린",   asp:0.65, hp:2.2, dm:1.30},   /* 공격이 빠르다 */
 {pre:"사나운",   dm:1.60,  hp:2.2},            /* 아프게 때린다 */
 {pre:"강철가죽", ac:6,     hp:2.8, dm:1.15},   /* 단단하다 */
 {pre:"흡혈",     steal:0.5,hp:2.2, dm:1.25}    /* 준 피해만큼 되빤다.
                                                 ★ 예전 이름 "핏빛" 은 R19b 변종 계보 이름과 겹쳐
                                                   "핏빛 심연의 식시귀" 처럼 색 단어가 두 번 붙었다. */
];
function makeElite(m,rng){
 var e=ELITE_PRE[Math.floor(rng()*ELITE_PRE.length)],d=m.d,d2={},k;
 for(k in d)d2[k]=d[k];
 d2.n=e.pre+" "+d.n;
 d2.hp=Math.round(d.hp*(e.hp||2.2));
 d2.d1=Math.round(d.d1*(e.dm||1.3));d2.d2=Math.round(d.d2*(e.dm||1.3));
 d2.ac=(d.ac||0)+(e.ac||0);
 d2.xp=Math.round(d.xp*2.6);
 if(e.asp)d2.asp=e.asp;
 if(e.steal)d2.steal=e.steal;
 d2.elite=true;
 m.d=d2;m.hp=d2.hp;m.elite=true;
}

/* R2 — 방 기반 층 생성 (계획서 v3 §3)
   층은 방 3~5개 + 통로다. 시드 고정이라 같은 층은 늘 같은 모양.
   방 중심 목록을 돌려줘 스폰이 방 안에 떨어지게 한다. */
function carveRooms(def,rng,g){
 var K=3+Math.floor(rng()*3),rooms=[],tries=0,i;
 while(rooms.length<K&&tries<120){
   tries++;
   /* R19e — 방을 넓힌다 (대표 지시: "좀 넓어져도"). 옛 5~7 x 4~5 는 참고 이미지 같은
      '넓은 석판 광장' 느낌이 나지 않았다. 통로도 폭 2 → 3 으로 넓힌다(아래 hall). */
   var rw=7+Math.floor(rng()*4),rh=5+Math.floor(rng()*3);
   var rx=1+Math.floor(rng()*(def.w-rw-2)),ry=1+Math.floor(rng()*(def.h-rh-2));
   var bad=false;
   for(i=0;i<rooms.length;i++){var o=rooms[i];
     if(rx<o.x+o.w+1&&o.x<rx+rw+1&&ry<o.y+o.h+1&&o.y<ry+rh+1){bad=true;break;}}
   if(bad)continue;
   rooms.push({x:rx,y:ry,w:rw,h:rh,cx:rx+(rw>>1),cy:ry+(rh>>1)});
 }
 var yy,xx;
 for(yy=1;yy<def.h-1;yy++)for(xx=1;xx<def.w-1;xx++)g[yy][xx]=1;   /* 전부 벽에서 시작 */
 rooms.forEach(function(r){
   for(yy=r.y;yy<r.y+r.h;yy++)for(xx=r.x;xx<r.x+r.w;xx++)g[yy][xx]=0;});
 function hall(x1,y1,x2,y2){                        /* ㄴ자 통로, 폭 3 (R19e: 옛 2) */
   var cx=x1,cy=y1,s;
   for(s=0;s<2;s++){
     while(cx!==x2){cx+=(x2>cx?1:-1);
       if(cy>0&&cy<def.h-1&&cx>0&&cx<def.w-1){g[cy][cx]=0;
         if(cy+1<def.h-1)g[cy+1][cx]=0; if(cy-1>0)g[cy-1][cx]=0;}}
     while(cy!==y2){cy+=(y2>cy?1:-1);
       if(cy>0&&cy<def.h-1&&cx>0&&cx<def.w-1){g[cy][cx]=0;
         if(cx+1<def.w-1)g[cy][cx+1]=0; if(cx-1>0)g[cy][cx-1]=0;}}
   }
 }
 rooms.sort(function(a,b){return a.cx-b.cx;});
 for(i=1;i<rooms.length;i++)hall(rooms[i-1].cx,rooms[i-1].cy,rooms[i].cx,rooms[i].cy);
 def.gates.forEach(function(gt){                   /* 문마다 가장 가까운 방과 잇는다 */
   var best=rooms[0],bd=1e9;
   rooms.forEach(function(r){var dd=(r.cx-gt.x)*(r.cx-gt.x)+(r.cy-gt.y)*(r.cy-gt.y);
     if(dd<bd){bd=dd;best=r;}});
   hall(clamp(gt.x,1,def.w-2),clamp(gt.y,1,def.h-2),best.cx,best.cy);
 });
 return rooms;
}

/* ===================== R28 지형 구성(layout) — 동대륙 전용 형태 =====================
   대표 지시(원문): "동대륙 맵이나 던전은 새로 구성하도록하자 컨셉에 맞게. 지금 기존에 서대륙거
   동일하게 연결되어있고 층수만 다르게 한거같음."
   맞는 지적이었다. 예전 동대륙은 서대륙과 **같은 생성기**(개활지 필드 / 방+통로 던전)에 색만
   바꿔 끼운 것이었다. 그래서 zones.json 에 layout 을 두고 **형태 자체를 다르게** 만든다:

     layout:"ridge"   산길   — 절벽 사이로 굽이치는 외길 + 길목마다 넓은 마당(평상·객잔 터)
     layout:"canyon"  협곡   — 위·아래 두 갈래 길이 갈라졌다 다시 만난다(고리) + 매복 주머니
     layout:"terrace" 산정   — 계단식 3단. 단마다 좁은 계단 하나로만 오른다(마지막 단 = 봉인단 광장)

   반환값은 carveRooms 와 같은 "방 목록"이다 — 스폰·장식·기록물 스냅이 그대로 재사용된다.
   layout 이 없는 존은 예전 그대로 동작한다(본편 무수정 원칙).
   ================================================================================= */
function carveLayout(def,rng,g){
 var yy,xx,spots=[];
 for(yy=1;yy<def.h-1;yy++)for(xx=1;xx<def.w-1;xx++)g[yy][xx]=1;      /* 통째로 암반에서 시작 */
 function dig(cx,cy,r){                                              /* 네모 구덩이 하나 */
   for(yy=Math.max(1,cy-r);yy<=Math.min(def.h-2,cy+r);yy++)
     for(xx=Math.max(1,cx-r);xx<=Math.min(def.w-2,cx+r);xx++)g[yy][xx]=0;
 }
 function road(x1,y1,x2,y2,w){                                       /* 두 점을 잇는 길(폭 w) */
   var cx=x1,cy=y1,r=Math.max(0,(w-1)>>1),guard=0;
   while((cx!==x2||cy!==y2)&&guard++<4000){
     if(cx!==x2)cx+=(x2>cx?1:-1);
     else if(cy!==y2)cy+=(y2>cy?1:-1);
     dig(cx,cy,r);
   }
 }
 function yard(cx,cy,r,w2,h2){                                       /* 넓은 마당 = 방으로 등록 */
   dig(cx,cy,r);
   spots.push({x:clamp(cx-r,1,def.w-2),y:clamp(cy-r,1,def.h-2),
               w:(w2||r*2+1),h:(h2||r*2+1),cx:clamp(cx,1,def.w-2),cy:clamp(cy,1,def.h-2)});
 }
 var G=def.gates||[],A=G[0]||{x:2,y:def.h-3},B=G[G.length-1]||{x:def.w-3,y:2};
 var ax=clamp(A.x,2,def.w-3), ay=clamp(A.y,2,def.h-3);
 var bx=clamp(B.x,2,def.w-3), by=clamp(B.y,2,def.h-3);
 var kind=def.layout;
 if(kind==="ridge"){
   /* 굽이치는 외길 — 문에서 문까지 4구비. 구비마다 마당을 열어 쉼터·매복지로 쓴다. */
   var N=4,px=ax,py=ay,i2;
   yard(ax,ay,2);
   for(i2=1;i2<=N;i2++){
     var t=i2/(N+1);
     var nx=Math.round(ax+(bx-ax)*t);
     /* 위·아래로 번갈아 크게 흔든다(산길 느낌) */
     var sw=(i2%2?1:-1)*Math.round(def.h*0.26);
     var ny=clamp(Math.round(ay+(by-ay)*t)+sw,3,def.h-4);
     road(px,py,nx,py,4);road(nx,py,nx,ny,4);
     yard(nx,ny,2+(i2%2));
     px=nx;py=ny;
   }
   road(px,py,bx,py,4);road(bx,py,bx,by,4);
   yard(bx,by,2);
 }else if(kind==="canyon"){
   /* 두 갈래 협곡 — 갈라졌다 다시 만난다. 사이사이 좁은 굴로 이어 매복이 성립하게. */
   var upY=clamp(Math.round(def.h*0.26),3,def.h-4);
   var loY=clamp(Math.round(def.h*0.74),3,def.h-4);
   var lx=3,rx2=def.w-4;
   yard(ax,ay,2);
   road(ax,ay,lx,upY,3);
   road(lx,upY,rx2,upY,3);            /* 윗길 */
   road(ax,ay,lx,loY,3);
   road(lx,loY,rx2,loY,4);            /* 아랫길 — 넓지만 멀다 */
   road(rx2,upY,rx2,loY,3);           /* 끝에서 합류 */
   road(rx2,loY,bx,by,3);
   var c1=Math.round(def.w*0.42),c2=Math.round(def.w*0.66);
   road(c1,upY,c1,loY,2);             /* 좁은 굴 두 개 */
   road(c2,upY,c2,loY,2);
   yard(c1,upY,2);yard(c2,loY,2);yard(rx2,Math.round((upY+loY)/2),2);
   yard(bx,by,2);
 }else{
   /* terrace — 계단식. 단은 넓고, 단 사이는 좁은 계단 하나뿐이라 위로 갈수록 압박이 온다. */
   var bands=3,bi,prevX=null;
   for(bi=0;bi<bands;bi++){
     var byY=clamp(Math.round(def.h-4-bi*Math.floor((def.h-6)/bands)),2,def.h-3);
     var x0=3,x1=def.w-4;
     for(xx=x0;xx<=x1;xx++)for(yy=byY-1;yy<=byY+1;yy++)
       if(yy>0&&yy<def.h-1)g[yy][xx]=0;                              /* 단 하나 = 가로 띠 */
     var stx=(bi%2)?x1-1:x0+1;                                       /* 계단은 좌우 번갈아 */
     if(prevX!==null)road(prevX,byY+Math.floor((def.h-6)/bands),stx,byY,2);
     prevX=stx;
     yard((bi%2)?x0+3:x1-3,byY,2,7,3);
   }
   yard(bx,by,3,9,5);                                                /* 마지막 단 = 봉인단 광장 */
   road(ax,ay,3,def.h-4,3);
 }
 /* 문·NPC 자리는 반드시 열어 둔다(못 나가는 층 방지).
    ★ 이을 곳은 **가장 가까운 마당**이다. 전부 첫 마당에 이으면 나가는 문에서 들어오는 문까지
      가로지르는 지름길이 뚫려 길 구조(외길·두 갈래·계단)가 무의미해진다. */
 (def.gates||[]).forEach(function(gt){
   dig(clamp(gt.x,1,def.w-2),clamp(gt.y,1,def.h-2),1);
   var bs=null,bd=1e9;
   spots.forEach(function(sp){var dd=(sp.cx-gt.x)*(sp.cx-gt.x)+(sp.cy-gt.y)*(sp.cy-gt.y);
     if(dd<bd){bd=dd;bs=sp;}});
   if(bs)road(clamp(gt.x,2,def.w-3),clamp(gt.y,2,def.h-3),bs.cx,bs.cy,3); });
 (def.npcs||[]).forEach(function(n){ dig(clamp(n.x,1,def.w-2),clamp(n.y,1,def.h-2),1); });
 if(!spots.length)spots.push({x:2,y:2,w:3,h:3,cx:Math.floor(def.w/2),cy:Math.floor(def.h/2)});
 return spots;
}

function buildZone(zi){
 var def=ZONES[zi],rng=mulberry32(def.seed),g=[],obs=[],y,x,i;
 for(y=0;y<def.h;y++){g[y]=[];for(x=0;x<def.w;x++){
   var b=0;
   if(x===0||y===0||x===def.w-1||y===def.h-1)b=1;else if(rng()<def.obst)b=1;
   g[y][x]=b;}}
 /* R28 — layout 이 있으면 그 형태로 깎는다(동대륙). 없으면 예전 규칙 그대로. */
 var rooms=def.layout?carveLayout(def,rng,g):(def.rooms?carveRooms(def,rng,g):null);
 if(def.cross){                                   /* 마을 — 십자 광장 (계획: 4방 역할 배치) */
   var cx=Math.floor(def.w/2),cy=Math.floor(def.h/2),yy2,xx2;
   for(yy2=1;yy2<def.h-1;yy2++)for(xx2=1;xx2<def.w-1;xx2++)g[yy2][xx2]=1;
   for(yy2=cy-2;yy2<=cy+2;yy2++)for(xx2=1;xx2<def.w-1;xx2++)g[yy2][xx2]=0;   /* 동서 대로 */
   for(xx2=cx-2;xx2<=cx+2;xx2++)for(yy2=1;yy2<def.h-1;yy2++)g[yy2][xx2]=0;   /* 남북 대로 */
   for(yy2=cy-3;yy2<=cy+3;yy2++)for(xx2=cx-4;xx2<=cx+4;xx2++)                 /* 중앙 광장 */
     if(yy2>0&&yy2<def.h-1&&xx2>0&&xx2<def.w-1)g[yy2][xx2]=0;
 }
 function clr(cx,cy,r){for(var yy=Math.max(0,cy-r);yy<=Math.min(def.h-1,cy+r);yy++)
   for(var xx=Math.max(0,cx-r);xx<=Math.min(def.w-1,cx+r);xx++)g[yy][xx]=0;}
 if(rooms){                                        /* 방 기반 층 — 스폰 중심을 방으로 옮긴다 */
   /* R28 — layout 층은 마당이 곧 방이다. 첫 마당(=들어오는 문)과 마지막 마당(=나가는 문)은
      비워 두고 가운데 마당들에 나눠 세운다. 그러지 않으면 들어서는 순간 전원이 눈앞에 뭉친다
      (실측 스크린샷: 산길 첫 마당에 늑대·곰·병졸 18마리). 반경도 3으로 넓혀 덜 겹치게 한다. */
   var mid=(def.layout&&rooms.length>2)?rooms.slice(1,rooms.length-1):rooms;
   def.spawns.forEach(function(s,si){
     var r;
     if(def.layout){
       /* 두목(보스·중간보스)은 마지막 마당에 앉힌다 — 들어서자마자 두목과 마주치지 않게 */
       var bd2=MOBS[s[0]]&&(MOBS[s[0]].boss||MOBS[s[0]].mini);
       if(bd2){
         /* 들어오는 문에서 **가장 먼** 마당. (보스층은 문이 하나뿐이라 "마지막 마당"으로는
            들어서는 자리에 두목이 앉는다 — 실측 스크린샷에서 잡았다.) */
         var gt0=(def.gates&&def.gates[0])||{x:1,y:1},far=rooms[rooms.length-1],fd=-1;
         rooms.forEach(function(sp){var dd=(sp.cx-gt0.x)*(sp.cx-gt0.x)+(sp.cy-gt0.y)*(sp.cy-gt0.y);
           if(dd>fd){fd=dd;far=sp;}});
         r=far;
       }else r=mid[si%mid.length];
     }else r=rooms[si%rooms.length];
     s[2]=r.cx;s[3]=r.cy;s[4]=def.layout?3:Math.min(s[4],2);});
   (def.deco||[]).forEach(function(d,di){          /* 장식도 방 구석으로 */
     var r=rooms[(di+1)%rooms.length];
     d.x=clamp(r.x+1+(di%2),1,def.w-2);d.y=clamp(r.y+1,1,def.h-2);});
   def.gates.forEach(function(gt){clr(gt.x,gt.y,1);});
   def.npcs.forEach(function(n){clr(n.x,n.y,1);});
 }else{
   def.gates.forEach(function(gt){clr(gt.x,gt.y,2);});
   def.npcs.forEach(function(n){clr(n.x,n.y,2);});
   (def.deco||[]).forEach(function(d){clr(d.x,d.y,2);});
   def.spawns.forEach(function(s){clr(s[2],s[3],2);});
   clr(Math.floor(def.w/2),Math.floor(def.h/2),3);
 }
 var isDun=def.theme.indexOf("dun")===0;
 /* 통행 가능 타일과 맞닿은 "벽면"에만 장식(기둥/바위/나무)을 세운다.
    예전에는 모든 벽 타일(내부 암반 포함)에 장식을 심어, 방 사이 빈 벽 덩어리까지
    전부 오브젝트로 그려지면서 화면이 장애물로 빽빽해 보였다(플레이 방해 리포트).
    통로/방 경계에 붙은 벽만 꾸며도 시야상 필요한 만큼은 충분히 나온다 — 충돌/길찾기는 불변. */
 function nearWalk(xx,yy){return g[yy-1][xx]===0||g[yy+1][xx]===0||g[yy][xx-1]===0||g[yy][xx+1]===0;}
 /* 던전 벽 타일 방향 판정 — "가로/세로/십자가 타일 3종" 요청 반영.
    벽끼리의 연결이 아니라 "어느 쪽에 통행 가능 바닥이 붙어있는가"로 판정해야 한다 — 던전은
    방 사이가 통짜 암반이라 벽-벽 인접만 보면 거의 모든 경계 타일이 상하좌우 모두 벽과 닿아
    "교차"로 몰린다(실측: 옛 성소 1층에서 wallx 57 / wallh 6 / wallv 2로 편중). 대신 열린 바닥이
    좌우에 있으면 그 경계선은 세로로 이어지는 벽(wallv), 위아래에 있으면 가로로 이어지는
    벽(wallh), 양쪽 다면 모서리/갈림길(wallx)로 판정한다 — 방 테두리를 실제로 따라 그리는
    방식. 필드(서리들녘·무너진 접경 초소)는 zones.json에서 rooms:false·obst:0으로 바꿔 벽 자체가
    생기지 않으므로(개활지) 이 분기는 타지 않는다. */
 function wallKind(xx,yy){
   var fW=(xx>0&&g[yy][xx-1]===0),      fE=(xx<def.w-1&&g[yy][xx+1]===0);
   var fN=(yy>0&&g[yy-1][xx]===0),      fS=(yy<def.h-1&&g[yy+1][xx]===0);
   var floorH=fW||fE, floorV=fN||fS;
   if(floorH&&floorV)return "wallx";    /* 모서리·갈림길 — 횃불 자리라 낮추지 않는다 */
   /* ★ R19d 시인성 — 카메라는 +x+y 쪽에서 내려다본다(그리기 깊이 z=fx+fy).
      그래서 **뒤쪽(서/북)에만 바닥이 붙은 벽**을 높게 세우면 그 바닥을 통째로 가린다.
      실측 스크린샷에서 방 안이 안 보이고 화면이 벽 덩어리로 덮이는 원인이 이것이었다
      (대표 지시: "벽이 두껍지 않게 시인성을 올려야할거같은데").
      이런 벽은 낮은 갓돌(wallcap)로 눕혀 시야를 연다. 앞쪽(동/남)에 바닥이 있으면
      플레이어가 실제로 서는 면이므로 방향이 읽히도록 판을 세운다. 충돌·길찾기는 불변. */
   if(!fE&&!fS)return "wallcap";
   if(floorV)return "wallh";
   return "wallv";
 }
 /* R19c — 지역별 바위 비율. 옛 값은 0.28 고정이라 어느 지역이든 나무 72% 짜리 '숲'이 됐다.
    동대륙(산중)처럼 돌 지형을 만들려면 이 비율을 존 데이터에서 올려야 한다(zones.json 의 rock).
    지정하지 않으면 0.28 — 기존 존들은 값이 없으므로 예전과 완전히 같다. */
 var ROCK_P=(typeof def.rock==="number")?def.rock:0.28;
 /* ================= R19f 지형물 종류를 데이터로 뺀다 =================
    대표 지시: "동대륙 디자인할 때는 약간 **무협식 집**으로 구성하는 걸로 고려."
    예전엔 종류가 코드에 박혀 있었다 — 마을이면 화단/집, 그 외엔 바위/나무. 그래서 지역마다
    다른 건물을 세우려면 이 줄을 고쳐야 했다. 이제 존 데이터의 obk 가 정한다:
        "obk": [["house_wx", 0.5], ["rock", 0.3], ["tree", 0.2]]     (가중치, 합은 자동 정규화)
    새 건물을 넣는 순서 = ① 03_tiles.js 의 objSprite 에 그림 한 종류 추가
                          ② 그 존의 obk 에 한 줄. 확장팩도 자기 존에 이렇게 적으면 된다.
    obk 가 없으면 옛 규칙 그대로다(기존 존들은 값이 없다). */
 function obKind(){
   var t=def.obk;
   if(t&&t.length){
     var tot=0,i;
     for(i=0;i<t.length;i++)tot+=(t[i][1]||0);
     if(tot>0){
       var r=rng()*tot,acc=0;
       for(i=0;i<t.length;i++){acc+=(t[i][1]||0);if(r<acc)return t[i][0];}
       return t[t.length-1][0];
     }
   }
   if(isDun)return null;                                        /* 던전은 wallKind 가 정한다 */
   if(def.theme==="town")return rng()<.3?"planter":"house";
   return rng()<ROCK_P?"rock":"tree";
 }
 for(y=1;y<def.h-1;y++)for(x=1;x<def.w-1;x++)if(g[y][x]&&nearWalk(x,y)){
   var ok=obKind();
   obs.push({x:x,y:y,k:(ok!==null)?ok:wallKind(x,y),v:Math.floor(rng()*3)});
 }
 /* R19e — 횃불 자리를 벽 종류와 분리한다.
    예전엔 "wallx(교차) 타일 중 v===2" 만 횃불이었다. 그런데 이번에 방·통로를 넓히자
    모서리 타일이 크게 줄어(실측: 봉인의 문 층의 wallx 3개 → 0개) **횃불이 0개인 층**이 생겼다
    — 던전 조명이 통째로 사라지는 회귀다. 이제 벽 칸 자체에서 일정 간격으로 고른다.
    좌표식이라 시드처럼 층마다 같은 자리에 고정되고, 6칸마다 하나꼴로 고르게 퍼진다. */
 if(isDun){
   var tn=0;
   obs.forEach(function(o){
     if(o.k.indexOf("wall")!==0) return;
     if((o.x + o.y*2) % 6 === 0){ o.torch=1; tn++; }
   });
   if(!tn) obs.forEach(function(o,oi){ if(o.k.indexOf("wall")===0 && oi%5===0) o.torch=1; });
 }
 /* ★ R23 — 보이지 않는 벽 제거 (대표 지시: "맵에 보이지않는벽 필드 모두 제거, 그냥 편하게 돌아다닐수있게")
    원인: 충돌 격자 g 와 그림(obs)이 **따로** 만들어진다. 장식은 "통행 칸과 맞닿은 벽"에만 세우는데
    (위 nearWalk — 화면이 장애물로 빽빽해 보이던 문제를 고친 규칙), 벽 덩어리 **안쪽** 칸은 그림이
    없는 채로 충돌만 남는다. 개활지인 필드에서 이게 곧 "아무것도 없는데 막히는 자리"였다
    (동대륙 잿빛 산길처럼 obst 가 있는 필드에서 뭉치면 눈에 보이게 나타난다).
    수리: 필드(rooms=false, 던전 아님)에서는 **그림이 있는 칸만 막는다.** 나무·바위처럼 눈에 보이는 것은
    그대로 막고(보이니까 납득이 된다), 그림이 없는 칸은 전부 통행 가능으로 돌린다.
    던전은 손대지 않는다 — 거기 벽 덩어리는 방을 나누는 구조물이고 애초에 안쪽으로 갈 수 없다. */
 /* 조건은 "필드로 선언된 존"만 — rooms:false + 십자 마을 아님 + 던전 아님.
    마을(cross:true)은 벽 덩어리가 곧 건물 안쪽이라 열어 주면 집 위를 걷게 된다. */
 /* R28 — layout 존(산길·협곡·계단)은 암반이 곧 절벽이다. 여기서 열어 주면 길 구조가 사라진다. */
 if(def.rooms===false&&!def.cross&&!isDun&&!def.layout){
   var seen={},cleared=0;
   obs.forEach(function(o){seen[o.x+","+o.y]=1;});
   for(y=1;y<def.h-1;y++)for(x=1;x<def.w-1;x++)
     if(g[y][x]&&!seen[x+","+y]){g[y][x]=0;cleared++;}
   def._noWall=cleared;                       /* 검증 스크립트가 읽는다 */
 }
 (def.deco||[]).forEach(function(d){g[d.y][d.x]=1;obs.push({x:d.x,y:d.y,k:d.k,v:1});});
 var mobs=[];
 def.spawns.forEach(function(s){
   var kk=s[0],cx=s[2],cy=s[3],r=s[4];
   /* 몬스터 밀도 배율 — 보스/중간보스는 제외한다(데스 나이트가 둘이 되면 안 되므로) */
   var bd=MOBS[kk]&&(MOBS[kk].boss||MOBS[kk].mini);
   var n=bd?s[1]:Math.max(1,Math.round(s[1]*((typeof OPT!=="undefined"&&OPT.density)?OPT.density:1)));
   for(i=0;i<n;i++){
     var tx,ty,tries=0;
     do{tx=clamp(cx+ri(-r,r),1,def.w-2);ty=clamp(cy+ri(-r,r),1,def.h-2);tries++;}while(g[ty][tx]&&tries<40);
     g[ty][tx]=0;
     var d=MOBS[kk];
     mobs.push({k:kk,d:d,fx:tx,fy:ty,hx:tx,hy:ty,hp:d.hp,dead:false,rt:0,tgt:null,na:0,stun:0,slow:0,
       goal:null,gt:0,lh:-99,face:0,anim:0,mv:-9,atkT:-9,ph:Math.random()*6,prov:false,
       tdmg:0,pdmg:0});
   }});
 if((def.rooms||def.layout)&&typeof LORE!=="undefined"){        /* 기록물을 걸을 수 있는 칸에 스냅 */
   var lk;
   for(lk in LORE){var l=LORE[lk];
     if(l.z!==zi)continue;
     var bx=clamp(l.x,1,def.w-2),by=clamp(l.y,1,def.h-2),rr,fx2,fy2,found=false;
     for(rr=0;rr<Math.max(def.w,def.h)&&!found;rr++){
       for(fy2=Math.max(1,by-rr);fy2<=Math.min(def.h-2,by+rr)&&!found;fy2++)
         for(fx2=Math.max(1,bx-rr);fx2<=Math.min(def.w-2,bx+rr)&&!found;fx2++)
           if(!g[fy2][fx2]){l.x=fx2;l.y=fy2;found=true;}
     }
   }
 }
 if((def.rooms||def.layout)&&def.elites){                       /* 층당 엘리트 승격 */
   var cand=mobs.filter(function(m){return !m.d.boss&&!m.d.mini;});
   for(i=0;i<def.elites&&cand.length>0;i++){
     var mi=Math.floor(rng()*cand.length);
     makeElite(cand[mi],rng);cand.splice(mi,1);
   }
 }
 return {def:def,g:g,obs:obs,mobs:mobs,fnpc:spawnFieldNpcs(zi,def,g)};
}
function blocked(z,x,y){x=Math.floor(x);y=Math.floor(y);
 if(x<0||y<0||x>=z.def.w||y>=z.def.h)return true;return !!z.g[y][x];}
/* 설정(몬스터 밀도 등)이 바뀌면 모든 지역을 다시 배치한다. 플레이어 상태는 건드리지 않는다. */
function rebuildWorld(){
 var keep=curZ, kx=P?P.fx:13, ky=P?P.fy:13;
 world.length=0;
 for(var zz=0;zz<ZONES.length;zz++)world.push(buildZone(zz));
 projs=[];parts=[];floaters=[];beams=[];
 if(P){P.tgt=null;P.dest=null;
   if(typeof started!=="undefined"&&started){curZ=keep;P.zone=keep;P.fx=kx;P.fy=ky;
     if(typeof log==="function")log("지역이 다시 배치되었습니다. (몬스터 밀도 변경)","#9fe2ff");}}
}
