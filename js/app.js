/* THE LAST GOLDEN DAYS. Original client-side photo gallery and four-season particle engine.
   No external JavaScript libraries, build tools, API keys, or server dependencies. */
(() => {
  'use strict';
  const $ = (s, parent=document) => parent.querySelector(s);
  const $$ = (s, parent=document) => [...parent.querySelectorAll(s)];
  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let photos = Array.isArray(window.GOLDEN_PHOTOS) ? [...window.GOLDEN_PHOTOS] : [];
  const ephemeralURLs = [];
  let filter = 'all';
  let view = 'editorial';
  let lightboxPhotos = [];
  let lightboxIndex = 0;
  let lightboxTimer = null;
  let toastTimeout = null;
  let lastLightboxFocus = null;

  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

  function showToast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.classList.remove('show'), 3100);
  }

  // Scroll progress + reveal animations.
  function setupScroll() {
    const bar = $('#scrollProgress');
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.width = `${max>0 ? Math.min(100,scrollY/max*100):100}%`;
    };
    addEventListener('scroll',update,{passive:true}); addEventListener('resize',update,{passive:true}); update();
    const reveals = $$('.reveal');
    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      reveals.forEach(el=>el.classList.add('visible'));
    } else {
      const io = new IntersectionObserver(entries=>{
        entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}});
      },{threshold:.07,rootMargin:'0px 0px -20px 0px'});
      reveals.forEach(el=>io.observe(el));
    }
    const halo = $('#cursorHalo');
    if (halo && matchMedia('(pointer:fine)').matches && !prefersReducedMotion.matches) {
      let x=innerWidth/2, y=innerHeight/2, dx=x,dy=y,raf;
      addEventListener('pointermove',(e)=>{x=e.clientX;y=e.clientY},{passive:true});
      const follow=()=>{dx+=(x-dx)*.07;dy+=(y-dy)*.07;halo.style.transform=`translate(${dx-140}px,${dy-140}px)`;raf=requestAnimationFrame(follow)};
      follow();
      addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
    }
  }

  // Build an entire editorial photo exhibition from one small manifest file.
  function visiblePhotos() {return photos.filter(p=>filter==='all'||p.place===filter)}
  function cardMarkup(p,idx) {
    return `<article class="photo-card" style="--idx:${idx}" data-card="${escapeHtml(p.id)}">
      <button class="photo-open" type="button" data-open-id="${escapeHtml(p.id)}" aria-label="放大查看 ${escapeHtml(p.title)}">
        <div class="photo-picture"><img loading="lazy" decoding="async" src="${escapeHtml(p.thumb||p.image)}" alt="${escapeHtml(p.alt||p.title)}"><span class="photo-number">${escapeHtml(p.number)}</span><span class="photo-expand" aria-hidden="true">↗︎</span></div>
        <div class="photo-meta"><div class="photo-location"><span>${escapeHtml(p.placeName)}</span><span>${escapeHtml(p.date)}</span></div><h3 class="photo-title">${escapeHtml(p.title)}</h3><p class="photo-note">${escapeHtml(p.note)}</p></div>
      </button></article>`;
  }
  function renderGallery() {
    const el = $('#photoGrid');
    const visible = visiblePhotos();
    el.classList.toggle('is-grid',view==='grid');
    el.innerHTML = visible.length?visible.map(cardMarkup).join(''):'<div class="gallery-empty">这里还没有照片。</div>';
    if ($('#totalCount')) $('#totalCount').textContent=String(photos.length).padStart(2,'0');
    $$('[data-open-id]',el).forEach(button=>button.addEventListener('click',()=>{
      openPhoto(button.dataset.openId,visible);
    }));
    $$('[data-filter]').forEach(b=>{
      const v=b.dataset.filter;
      const n=photos.filter(p=>v==='all'||p.place===v).length;
      const count=b.querySelector('span'); if(count)count.textContent=String(n).padStart(2,'0');
    });
  }
  function setupGallery() {
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
      filter=button.dataset.filter;
      $$('[data-filter]').forEach(b=>{const act=b===button;b.classList.toggle('active',act);b.setAttribute('aria-pressed',String(act))});
      renderGallery();
    }));
    $$('[data-view]').forEach(button=>button.addEventListener('click',()=>{
      view=button.dataset.view;
      $$('[data-view]').forEach(b=>{const act=b===button;b.classList.toggle('selected',act);b.setAttribute('aria-pressed',String(act))});
      renderGallery();
    }));
    $$('[data-open-photo]').forEach(button=>button.addEventListener('click',()=>openPhoto(button.dataset.openPhoto,photos)));
    const input=$('#uploadInput');
    $('#addPhotos').addEventListener('click',()=>input.click());
    input.addEventListener('change',e=>{
      const selected=[...(e.target.files||[])].filter(f=>/^image\/(jpeg|png|webp)$/.test(f.type)).slice(0,20);
      if(!selected.length) return;
      selected.forEach((file,i)=>{
        if(file.size>12*1024*1024) return;
        const url=URL.createObjectURL(file);ephemeralURLs.push(url);
        photos.push({id:`local-${Date.now()}-${i}`,number:String(photos.length+1).padStart(2,'0'),date:'LOCAL PREVIEW',place:'local',placeName:'本地预览 · 尚未保存',title:file.name.replace(/\.[^.]+$/,'').slice(0,35),en:'A new little memory',image:url,thumb:url,alt:file.name,note:'只在当前页面可见，刷新后消失。',story:'这是一张仅存在于当前浏览器会话的照片。将图片放入 assets/photos 并更新 data/gallery.js 后，可正式成为网站的一部分。'});
      });
      filter='all';$$('[data-filter]').forEach(b=>{const act=b.dataset.filter==='all';b.classList.toggle('active',act);b.setAttribute('aria-pressed',String(act))});
      renderGallery(); input.value='';
      showToast(`已临时添加 ${selected.length} 张照片 · 刷新页面后不会保留`);
    });
    addEventListener('pagehide',()=>ephemeralURLs.forEach(u=>URL.revokeObjectURL(u)),{once:true});
    renderGallery();
  }

  // Custom full-screen photo viewing with keyboard, touch and autoplay.
  function stopSlideShow() {
    if(lightboxTimer){clearInterval(lightboxTimer);lightboxTimer=null;}
    const play=$('#lightboxPlay'); if(play)play.textContent='自动播放 ▷';
  }
  function showLightboxFrame() {
    const p=lightboxPhotos[lightboxIndex];
    if(!p) return;
    const dialog=$('#lightbox');dialog.classList.remove('zoomed');
    $('#lightboxZoom').textContent='放大 ＋';
    const img=$('#lightboxImage');img.src=p.image;img.alt=p.alt||p.title;
    $('#lightboxCounter').textContent=`${String(lightboxIndex+1).padStart(2,'0')} / ${String(lightboxPhotos.length).padStart(2,'0')}`;
    $('#lightboxPlace').textContent=`${p.placeName} · ${p.date}`;
    $('#lightboxTitle').textContent=p.title;
    $('#lightboxStory').textContent=p.story||p.note||'';
  }
  function openPhoto(id, list=photos) {
    const found=list.findIndex(p=>p.id===id);
    if(found<0)return;
    lightboxPhotos=[...list];lightboxIndex=found;
    const dialog=$('#lightbox');lastLightboxFocus=document.activeElement;
    showLightboxFrame();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    document.body.classList.add('modal-open');
  }
  function closePhoto() {
    const dlg=$('#lightbox');stopSlideShow();
    if(dlg.open&&typeof dlg.close==='function')dlg.close();else dlg.removeAttribute('open');
    document.body.classList.remove('modal-open');
    lastLightboxFocus?.focus?.();
  }
  function changePhoto(delta) {if(!lightboxPhotos.length)return;lightboxIndex=(lightboxIndex+delta+lightboxPhotos.length)%lightboxPhotos.length;showLightboxFrame()}
  function setupLightbox() {
    const dlg=$('#lightbox');
    $('#lightboxClose').addEventListener('click',closePhoto);
    $('#lightboxPrev').addEventListener('click',()=>changePhoto(-1));
    $('#lightboxNext').addEventListener('click',()=>changePhoto(1));
    $('#lightboxZoom').addEventListener('click',toggleZoom);
    $('#lightboxImage').addEventListener('click',toggleZoom);
    $('#lightboxPlay').addEventListener('click',()=>{
      if(lightboxTimer){stopSlideShow();return;}
      lightboxTimer=setInterval(()=>changePhoto(1),3400);
      $('#lightboxPlay').textContent='暂停播放 Ⅱ';
    });
    function toggleZoom(){dlg.classList.toggle('zoomed');$('#lightboxZoom').textContent=dlg.classList.contains('zoomed')?'缩小 −':'放大 ＋';}
    dlg.addEventListener('close',()=>{stopSlideShow();document.body.classList.remove('modal-open');lastLightboxFocus?.focus?.()});
    addEventListener('keydown',e=>{
      if(!dlg.open)return;
      if(e.key==='ArrowLeft'){e.preventDefault();changePhoto(-1)}
      else if(e.key==='ArrowRight'){e.preventDefault();changePhoto(1)}
      else if(e.key==='Escape'){closePhoto()}
    });
    let xStart=0,yStart=0;
    dlg.addEventListener('touchstart',e=>{xStart=e.changedTouches[0].clientX;yStart=e.changedTouches[0].clientY},{passive:true});
    dlg.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-xStart,dy=e.changedTouches[0].clientY-yStart;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.25)changePhoto(dx>0?-1:1)},{passive:true});
  }

  // Canvas-driven atmosphere for the four seasons. Original procedural shapes.
  class Atmosphere {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true});this.season='autumn';this.density=52;
      this.running=!prefersReducedMotion.matches;this.items=[];this.frame=0;this.last=performance.now();this.wind=0;this.mouseX=0;
      this.width=innerWidth;this.height=innerHeight;this.dpr=1;
      this.resize();this.reset();this.loop=this.loop.bind(this);requestAnimationFrame(this.loop);
      addEventListener('resize',()=>{this.resize();this.reset()},{passive:true});
      addEventListener('pointermove',e=>{this.mouseX=(e.clientX/Math.max(1,innerWidth)-.5)*2},{passive:true});
      document.addEventListener('visibilitychange',()=>{this.last=performance.now()});
    }
    resize(){
      this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);
      this.canvas.width=Math.floor(this.width*this.dpr);this.canvas.height=Math.floor(this.height*this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    }
    desiredCount(){return Math.round(this.density*(this.width<600?.54:.92))}
    make(yRandom=true){
      const snow=this.season==='winter', spring=this.season==='spring';
      return {x:Math.random()*this.width,y:yRandom?Math.random()*this.height:-40-Math.random()*this.height*.25,
        r:(snow?1.3:3)+Math.random()*(snow?3.7:spring?4.6:6),speed:(snow ? .28 : .56)+Math.random()*(snow ? .95 : 1.2),
        ang:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.025,wobble:Math.random()*6.28,wave:.28+Math.random()*.72,
        alpha:.25+Math.random()*.55,side:(Math.random()-.5)*.65,colorSeed:Math.floor(Math.random()*5)};
    }
    reset(){this.items=Array.from({length:this.desiredCount()},()=>this.make(true));}
    setSeason(s){this.season=s;this.reset()}
    setDensity(n){this.density=n;this.reset()}
    setRunning(v){this.running=v;this.ctx.clearRect(0,0,this.width,this.height)}
    loop(now){
      requestAnimationFrame(this.loop);
      if(!this.running||document.hidden)return;
      const dt=Math.min((now-this.last)/16.6667,2.2);this.last=now;
      const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);
      this.frame+=dt;this.wind+=(this.mouseX*.50-this.wind)*.006;
      for(let i=0;i<this.items.length;i++){
        const p=this.items[i]; p.y+=p.speed*dt; p.x+=(p.side+this.wind+Math.sin(this.frame*.013+p.wobble)*p.wave)*dt;
        p.ang+=p.spin*dt;
        if(p.y>this.height+30||p.x>this.width+80||p.x< -100){this.items[i]=this.make(false);this.items[i].x=Math.random()*this.width;continue;}
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);
        if(this.season==='winter')this.snow(ctx,p);
        else if(this.season==='spring')this.petal(ctx,p);
        else if(this.season==='summer')this.leaf(ctx,p,true);
        else this.leaf(ctx,p,false);
        ctx.restore();
      }
    }
    snow(ctx,p){
      const a=p.alpha*.9;ctx.globalAlpha=a;const rr=p.r;
      ctx.fillStyle=p.colorSeed===0?'#d7eaf4':'#ffffff';ctx.beginPath();ctx.arc(0,0,rr,0,Math.PI*2);ctx.fill();
      if(rr>3.2){ctx.strokeStyle='rgba(255,255,255,.34)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-rr*2,0);ctx.lineTo(rr*2,0);ctx.moveTo(0,-rr*2);ctx.lineTo(0,rr*2);ctx.stroke();}
    }
    petal(ctx,p){
      ctx.globalAlpha=p.alpha;ctx.fillStyle=['#ffc4cc','#f1a5b9','#fce3dd','#e8aac3','#f7c7a6'][p.colorSeed];
      ctx.beginPath();ctx.moveTo(0,-p.r*1.5);ctx.bezierCurveTo(p.r*1.15,-p.r*1.45,p.r*1.5,p.r*.4,0,p.r*1.4);ctx.bezierCurveTo(-p.r*1.7,p.r*.4,-p.r*.95,-p.r*1.45,0,-p.r*1.5);ctx.fill();
      ctx.strokeStyle='rgba(132,64,82,.28)';ctx.lineWidth=.4;ctx.beginPath();ctx.moveTo(0,-p.r);ctx.lineTo(0,p.r);ctx.stroke();
    }
    leaf(ctx,p,green){
      const r=p.r;ctx.scale(1,.55+Math.abs(Math.sin(p.ang))*.45);ctx.globalAlpha=p.alpha;
      ctx.fillStyle=green?['#90b17d','#5e966f','#b4c986','#497963','#8cae68'][p.colorSeed]:['#c46f39','#d89a56','#a64c38','#e3aa5d','#b96946'][p.colorSeed];
      ctx.beginPath();ctx.moveTo(0,-r*1.9);ctx.bezierCurveTo(r*.6,-r*1.6,r*1.35,-r*1.1,r*1.25,-r*.25);ctx.bezierCurveTo(r*2,r*.25,r*.8,r*1.4,0,r*1.6);ctx.bezierCurveTo(-r*1.15,r*.8,-r*1.75,0,-r*1.25,-r*.35);ctx.bezierCurveTo(-r*1.1,-r*1.2,-r*.6,-r*1.65,0,-r*1.9);ctx.fill();
      ctx.strokeStyle=green?'rgba(24,72,38,.35)':'rgba(86,42,27,.37)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,-r*1.6);ctx.quadraticCurveTo(-r*.2,r*.1,0,r*1.95);ctx.stroke();
    }
  }
  const seasonText={
    autumn:'一阵风吹过，秋天落在你的屏幕上。',winter:'雪慢慢落下来，记忆依旧温暖。',
    spring:'让一场花瓣雨，落进北京的秋天。',summer:'风吹起绿叶，像把时间又倒回盛夏。'
  };
  function setupSeasons(){
    let atmo=null;
    try{atmo=new Atmosphere($('#seasonCanvas'))}catch(err){console.warn('Canvas atmosphere unavailable:',err)}
    let season='autumn';let ambient=!prefersReducedMotion.matches;
    try{const saved=localStorage.getItem('golden-season');if(saved in seasonText)season=saved}catch(_){/* storage may be disabled */}
    function selectSeason(name,announced=false){
      season=name;root.dataset.season=name;atmo?.setSeason(name);
      $$('[data-season-btn]').forEach(b=>{const active=b.dataset.seasonBtn===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      $('#seasonMessage').textContent=seasonText[name];
      try{localStorage.setItem('golden-season',name)}catch(_){/* optional */}
      if(announced)showToast(seasonText[name]);
    }
    $$('[data-season-btn]').forEach(b=>b.addEventListener('click',()=>selectSeason(b.dataset.seasonBtn,true)));
    const density=$('#density');density.addEventListener('input',()=>{const n=Number(density.value);$('#densityValue').textContent=String(n);atmo?.setDensity(n)});
    function syncAmbient(){atmo?.setRunning(ambient);$('#ambientToggle').setAttribute('aria-pressed',String(ambient));$('#ambientIcon').textContent=ambient?'✳':'Ⅱ';$('#ambientLabel').textContent=ambient?'AMBIENCE ON':'AMBIENCE OFF'}
    $('#ambientToggle').addEventListener('click',()=>{ambient=!ambient;syncAmbient();showToast(ambient?'飘落动画已开启':'飘落动画已暂停')});
    $('#heroExplore').addEventListener('click',()=>$('#seasons').scrollIntoView({behavior:prefersReducedMotion.matches?'auto':'smooth'}));
    selectSeason(season);syncAmbient();
    prefersReducedMotion.addEventListener?.('change',e=>{if(e.matches){ambient=false;syncAmbient()}});
  }

  function init(){
    setupScroll();setupSeasons();setupGallery();setupLightbox();
    const loader=$('#preload');
    const hide=()=>loader?.classList.add('is-hidden');
    addEventListener('load',hide,{once:true});setTimeout(hide,950);
    if(!photos.length)showToast('画廊照片清单尚未载入，请检查 data/gallery.js');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
