/* ================= 유틸 ================= */
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1));}
function ch(p){return Math.random()<p;}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function josa(w,a,b){var c=w.charCodeAt(w.length-1);if(c<0xAC00||c>0xD7A3)return a;return((c-0xAC00)%28)>0?a:b;}
function iga(w){return w+josa(w,"이","가");}
function eul(w){return w+josa(w,"을","를");}
function hsl(h,s,l){return "hsl("+(((h%360)+360)%360)+","+clamp(s,0,100).toFixed(1)+"%,"+clamp(l,0,100).toFixed(1)+"%)";}
function hsh(x,y){var h=(x*374761393+y*668265263)|0;h=(h^(h>>13))*1274126177|0;return((h^(h>>16))>>>0)%1000/1000;}
