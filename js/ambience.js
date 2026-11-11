/* The Art of Noticing — seasonal ambient particles.
   Independent of the photographs, album catalog, map and scrapbook.
   No photo image is ever animated. This script only paints a transparent
   non-interactive canvas, respects reduced motion, and has a pause control. */
(() => {
  'use strict';
  const root = document.documentElement;
  const canvas = document.getElementById('seasonCanvas');
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const media = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : {matches:false,addEventListener(){}};
  const palette = {
    spring:['#e3a1b0','#f7d3dd','#db90a9','#f5c5ce'],
    summer:['#d1c16e','#f7d981','#a4bd72','#d9d48e'],
    autumn:['#b26a40','#d9a457','#c88642','#dfb66c'],
    winter:['#f9feff','#e4f2f8','#ffffff','#d6ecf5']
  };
  let season = palette[root.dataset.season] ? root.dataset.season : 'autumn';
  let w=0,h=0,dpr=1,items=[],raf=0,last=0,playing=false;
  let force=0,wind=0,pointerX=-9999,pointerY=-9999;
  try { force=localStorage.getItem('noticing-ambient-on')==='off' ? -1 : 0; } catch(_){}
  // Prefer no animation for people who asked their device to reduce motion.
  const shouldStart = force!==-1 && !media.matches;
  const randint=(a,b)=>a+Math.random()*(b-a);
  const len=()=>Math.min(58,Math.max(18,Math.floor(w/29)));
  function newParticle(randomStart=true){
    return {
      x:randint(-25,w+25),
      y:randomStart?randint(-20,h+20):randint(-85,-12),
      r:season==='winter'?randint(1.5,4.1):randint(2.7,7.1),
      vy:season==='summer'?randint(.18,.45):randint(.3,.85),
      vx:randint(-.3,.3),
      phase:randint(0,6.283),
      rot:randint(0,6.283),
      spin:randint(-.015,.015),
      opacity:randint(.30,.65),
      shade:Math.floor(randint(0,4))
    };
  }
  function refill(){
    items=Array.from({length:len()},()=>newParticle());
  }
  function resize(){
    w=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1200);
    h=Math.max(1,window.innerHeight||document.documentElement.clientHeight||700);
    dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(w*dpr);
    canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    refill();
  }
  function paintShape(p,t){
    if(season==='winter'){
      ctx.fillStyle=palette.winter[p.shade];
      ctx.beginPath();ctx.arc(0,0,p.r*.64,0,Math.PI*2);ctx.fill();
      return;
    }
    if(season==='summer'){
      // Summer's firefly shimmer is atmospheric; the pictures never move.
      const glow=.56+.44*Math.sin(t*.002+p.phase);
      ctx.globalAlpha*=Math.max(.20,glow);
      ctx.fillStyle=palette.summer[p.shade];
      ctx.shadowColor='#e3d27e';ctx.shadowBlur=p.r*4;
      ctx.beginPath();ctx.arc(0,0,p.r*.44,0,Math.PI*2);ctx.fill();
      return;
    }
    ctx.fillStyle=palette[season][p.shade];
    ctx.beginPath();
    if(season==='spring'){
      // Soft petal with a slightly asymmetrical tip.
      ctx.moveTo(0,-p.r*1.5);
      ctx.bezierCurveTo(p.r*1.5,-p.r*.85,p.r*1.2,p.r*.98,0,p.r*1.3);
      ctx.bezierCurveTo(-p.r*1.6,p.r*.9,-p.r*1.5,-p.r*.8,0,-p.r*1.5);
    } else {
      // An autumn leaf rather than a generic circle or an animated photo.
      ctx.moveTo(0,-p.r*1.8);
      ctx.quadraticCurveTo(p.r*.4,-p.r*.9,p.r*1.1,-p.r*.8);
      ctx.quadraticCurveTo(p.r*.7,0,p.r*1.4,p.r*.5);
      ctx.quadraticCurveTo(p.r*.3,p.r*.7,0,p.r*1.7);
      ctx.quadraticCurveTo(-p.r*.5,p.r*.55,-p.r*1.3,p.r*.5);
      ctx.quadraticCurveTo(-p.r*.8,0,-p.r*1.1,-p.r*.8);
      ctx.quadraticCurveTo(-p.r*.4,-p.r*.9,0,-p.r*1.8);
    }
    ctx.closePath();ctx.fill();
  }
  function frame(time){
    if(!playing || document.hidden){raf=0;return;}
    raf=requestAnimationFrame(frame);
    const dt=Math.min(2.2,Math.max(.25,(time-(last||time))/16.667));last=time;
    ctx.clearRect(0,0,w,h);
    wind+=(forceWind()-wind)*.028*dt;
    const px=pointerX,py=pointerY;
    for(let i=0;i<items.length;i++){
      const p=items[i];
      p.y+=p.vy*dt*(season==='summer'?.5:1);
      p.x+=(p.vx+wind+Math.sin(time*.00065+p.phase)*.28)*dt;
      p.rot+=p.spin*dt;
      const dx=p.x-px,dy=p.y-py;
      if(Math.abs(dx)<95 && Math.abs(dy)<95){
        const dist=Math.hypot(dx,dy)||1;
        if(dist<95){p.x+=dx/dist*.85*dt;p.y+=dy/dist*.6*dt;}
      }
      if(p.y>h+30||p.x>w+70||p.x<-70){items[i]=newParticle(false);continue;}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.globalAlpha=p.opacity;
      paintShape(p,time);
      ctx.restore();
    }
  }
  function forceWind(){return force===2?.15:0}
  function start(){
    if(playing)return;
    playing=true;last=0;
    canvas.classList.add('ambient-on');
    raf=requestAnimationFrame(frame);
  }
  function stop(){
    playing=false;
    if(raf)cancelAnimationFrame(raf);
    raf=0;canvas.classList.remove('ambient-on');
    ctx.clearRect(0,0,w,h);
  }
  function setPlaying(value,store=true){
    if(value)start();else stop();
    document.querySelectorAll('[data-ambience-toggle]').forEach(button=>{
      button.setAttribute('aria-pressed',String(playing));
      const label=playing?'暂停季节粒子':'开启季节粒子';
      button.setAttribute('aria-label',label);
      const textNode=button.querySelector('.ambient-state');
      if(textNode)textNode.textContent=playing?'暂停粒子':'开启粒子';
      else button.textContent=label;
    });
    if(store){try{localStorage.setItem('noticing-ambient-on',playing?'on':'off')}catch(_){}}
  }
  function setSeason(value){
    if(!palette[value]||value===season)return;
    season=value;refill();
    const canvasLabel=document.getElementById('seasonAtmosphereLabel');
    const names={spring:'樱色花瓣',summer:'微光萤火',autumn:'金色落叶',winter:'轻柔雪花'};
    if(canvasLabel)canvasLabel.textContent=names[value];
  }
  function init(){
    resize();
    document.querySelectorAll('[data-ambience-toggle]').forEach(button=>
      button.addEventListener('click',()=>setPlaying(!playing)));
    setPlaying(shouldStart,false);
    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('pointermove',e=>{pointerX=e.clientX;pointerY=e.clientY;force=2;},{passive:true});
    window.addEventListener('pointerleave',()=>{pointerX=-9999;pointerY=-9999;force=0;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;ctx.clearRect(0,0,w,h)}else if(playing&&!raf){last=0;raf=requestAnimationFrame(frame);}});
    new MutationObserver(()=>setSeason(root.dataset.season)).observe(root,{attributes:true,attributeFilter:['data-season']});
    setSeason(root.dataset.season||'autumn');
    media.addEventListener?.('change',e=>{if(e.matches)setPlaying(false,false)});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
