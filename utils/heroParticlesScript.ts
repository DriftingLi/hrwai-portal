/**
 * Hero 粒子连线网络的内联脚本（字符串，经 useHead 注入页面）。
 *
 * 背景：粒子原为 Vue 组件（HeroCanvas），必须等页面 JS 下载解析、Vue 水合后才
 * 挂载——首屏文字改为纯 CSS 入场后，粒子相对"慢半拍"。改为内联 vanilla 脚本：
 * 随 HTML 解析即执行，canvas 由 SSR 常驻渲染，粒子与首帧 paint 同步出现。
 *
 * 约定：
 * - 目标元素 id="hero-canvas"（SiteHero SSR 渲染）；脚本 rAF 轮询等待解析到位
 * - prefers-reduced-motion：不启动（canvas 保持透明，静态光斑兜底）
 * - 导航离开首页（canvas 被移除）自动停止并轮询等待重新出现
 * - dataset.p 防重复初始化（脚本被再次执行时安全）
 */
export const heroParticlesScript = /* js */ `(function(){
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
function init(c){
if(c.dataset.p)return;c.dataset.p='1';
var ctx=c.getContext('2d');if(!ctx)return;
var W=0,H=0,raf=0;
var mx=-9999,my=-9999;
var coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
var N=coarse?30:60;
var ps=[];
function resize(){
var r=c.getBoundingClientRect();
if(!r.width||!r.height)return;
W=r.width;H=r.height;
var dpr=Math.min(window.devicePixelRatio||1,2);
c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);
ctx.setTransform(dpr,0,0,dpr,0,0);
if(ps.length!==N)spawn();
}
function spawn(){
ps=[];
for(var i=0;i<N;i++)ps.push({
x:Math.random()*W,y:Math.random()*H,
vx:(Math.random()-.5)*.7,vy:(Math.random()-.5)*.7,
r:1+Math.random()*1.6,
c:Math.random()>.5?'125, 211, 252':'94, 234, 212'
});
}
function step(){
raf=0;
if(!c.isConnected){cleanup();return;}
ctx.clearRect(0,0,W,H);
for(var i=0;i<ps.length;i++){
var p=ps[i];
p.x+=p.vx;p.y+=p.vy;
if(p.x<-20)p.x=W+20;if(p.x>W+20)p.x=-20;
if(p.y<-20)p.y=H+20;if(p.y>H+20)p.y=-20;
ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.2832);
ctx.fillStyle='rgba('+p.c+', 0.55)';ctx.fill();
}
ctx.lineWidth=1;
for(var a=0;a<ps.length;a++){
for(var b=a+1;b<ps.length;b++){
var dx=ps[a].x-ps[b].x,dy=ps[a].y-ps[b].y,d=Math.sqrt(dx*dx+dy*dy);
if(d<130){
ctx.strokeStyle='rgba(125, 211, 252,'+((1-d/130)*.22)+')';
ctx.beginPath();ctx.moveTo(ps[a].x,ps[a].y);ctx.lineTo(ps[b].x,ps[b].y);ctx.stroke();
}
}
var mdx=ps[a].x-mx,mdy=ps[a].y-my,md=Math.sqrt(mdx*mdx+mdy*mdy);
if(md<170){
ctx.strokeStyle='rgba(45, 212, 191,'+((1-md/170)*.4)+')';
ctx.beginPath();ctx.moveTo(ps[a].x,ps[a].y);ctx.lineTo(mx,my);ctx.stroke();
}
}
c.classList.add('is-ready');
raf=requestAnimationFrame(step);
}
function start(){if(!raf)raf=requestAnimationFrame(step);}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
function onMove(e){
var r=c.getBoundingClientRect();
mx=e.clientX-r.left;my=e.clientY-r.top;
}
function onOut(e){
if(e.relatedTarget)return;
mx=-9999;my=-9999;
}
function onVis(){
if(document.hidden)stop();
else if(c.isConnected)start();
}
function cleanup(){
stop();
window.removeEventListener('mousemove',onMove);
window.removeEventListener('mouseout',onOut);
window.removeEventListener('resize',resize);
document.removeEventListener('visibilitychange',onVis);
setTimeout(poll,300);
}
window.addEventListener('mousemove',onMove,{passive:true});
window.addEventListener('mouseout',onOut);
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',onVis);
resize();start();
}
function poll(){
var c=document.getElementById('hero-canvas');
if(c)init(c);
else setTimeout(poll,200);
}
poll();
})();`
