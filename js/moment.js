/* A quiet, click-to-play photograph reassembly.
   Image itself remains untouched; canvas temporarily draws its tiles. */
(() => {
  'use strict';
  function init(){
    const stage=document.getElementById('momentStage');
    const canvas=document.getElementById('momentTiles');
    const still=document.getElementById('momentFallback');
    const replay=document.getElementById('momentReplay');
    const selector=document.getElementById('momentPhotoSelect');
    const status=document.getElementById('momentStatus');
    if(!stage||!canvas||!still||!replay||!selector||!status)return;
    const ctx=canvas.getContext?.('2d');
    if(!ctx){status.textContent='这里仍可以查看原始照片。';replay.disabled=true;return;}
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const catalog=window.PHOTO_JOURNAL?.photos||[];
    const embedded=window.NOTICING_EMBEDDED||{};
    let activePhoto=null,image=null,request=0,frame=0,tiles=[],rect=null;
    let started=0;
    const withSource=p=>embedded[p.src]||p.src;
    const options=catalog.filter(p=>p&&p.id&&p.src);
    selector.replaceChildren();
    for(const p of options){
      const o=document.createElement('option');
      o.value=p.id;o.textContent=p.title||p.id;selector.append(o);
    }
    const stop=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;stage.classList.remove('is-playing');replay.disabled=false;
    };
    function size(){
      const bounds=stage.getBoundingClientRect();
      const W=Math.max(1,Math.round(bounds.width));
      const H=Math.max(1,Math.round(bounds.height));
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const scale=Math.min(W/image.naturalWidth,H/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      rect={W,H,x:(W-w)/2,y:(H-h)/2,w,h,scale};
      ctx.clearRect(0,0,W,H);
      const cols=W<650?8:Math.min(14,Math.max(10,Math.floor(W/70)));
      const step=w/cols,rows=Math.ceil(h/step);
      tiles=[];
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const left=rect.x+col*step,top=rect.y+row*step;
        const tw=Math.min(step,rect.x+w-left),th=Math.min(step,rect.y+h-top);
        if(tw<=0||th<=0)continue;
        const centerDist=Math.hypot(left+tw/2-W/2,top+th/2-H/2);
        const maxDist=Math.hypot(W,H)/2;
        tiles.push({x:left,y:top,w:tw,h:th,
          delay:centerDist/maxDist*.26+Math.random()*.15,
          dx:(Math.random()-.5)*Math.min(W*.55,290),
          dy:(Math.random()-.5)*Math.min(H*.68,215),
          angle:(Math.random()-.5)*.85});
      }
    }
    function draw(t){
      const {W,H,x,y,scale}=rect;
      ctx.clearRect(0,0,W,H);
      let done=true;
      for(const p of tiles){
        const f=Math.max(0,Math.min(1,(t-p.delay)/.9));
        if(f<1)done=false;
        if(f===0)continue;
        const eased=1-(1-f)**3;
        const left=p.x-x,top=p.y-y;
        const sx=Math.max(0,left/scale),sy=Math.max(0,top/scale);
        const sw=Math.min(image.naturalWidth-sx,p.w/scale);
        const sh=Math.min(image.naturalHeight-sy,p.h/scale);
        if(sw<=0||sh<=0)continue;
        ctx.save();ctx.globalAlpha=eased;
        ctx.translate(p.x+p.w/2+p.dx*(1-eased),p.y+p.h/2+p.dy*(1-eased));
        ctx.rotate(p.angle*(1-eased));
        ctx.drawImage(image,sx,sy,sw,sh,-p.w/2,-p.h/2,p.w+.35,p.h+.35);
        ctx.restore();
      }
      return done;
    }
    function play(){
      stop();
      if(reduced.matches){
        status.textContent='当前设备开启了减少动态效果；正在显示完整照片。';return;
      }
      if(!image?.naturalWidth){status.textContent='照片还在加载。';return;}
      size();
      const beginning=performance.now();
      status.textContent='正在把这一刻拼回来…';
      replay.disabled=true;
      stage.classList.add('is-playing');
      const animate=now=>{
        frame=0;
        const done=draw((now-beginning)/1000);
        if(done){
          stop();status.textContent='拼好了。还想再看一次吗？';
        }else frame=requestAnimationFrame(animate);
      };
      frame=requestAnimationFrame(animate);
    }
    function selectPhoto(id){
      const p=options.find(x=>x.id===id)||options[0];
      if(!p)return;
      stop();const token=++request;
      activePhoto=p;selector.value=p.id;image=null;
      const src=withSource(p);
      still.src=src;still.alt=p.alt||p.title||'摄影作品';
      status.textContent='照片加载中…';
      const next=new Image();
      next.onload=()=>{
        if(token!==request)return;
        image=next;status.textContent='点击「把照片拼好」开始。';
      };
      next.onerror=()=>{if(token===request)status.textContent='图片暂时无法加载，请选另一张。';};
      next.src=src;
    }
    replay.addEventListener('click',play);
    selector.addEventListener('change',()=>selectPhoto(selector.value));
    window.addEventListener('resize',()=>{
      if(frame)stop();
    },{passive:true});
    reduced.addEventListener?.('change',e=>{
      if(e.matches&&frame){stop();status.textContent='已切换为静态照片。';}
    });
    selectPhoto(options.some(p=>p.id==='beijing-05')?'beijing-05':options[0]?.id);
    // Public probe to verify interaction without editing or moving source images.
    stage.dataset.animationReady='true';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
