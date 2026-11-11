/* The Art of Noticing — original, dependency-free photo journal */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // data/photos.json is the published source of truth for every view.
  let originalPhotos = [], photos = [], filtered = [];
  let filter='all', seasonFilter='all', focusIDs=null, view='editorial';
  let lightboxIndex=0, slideTimer=null, lastFocus=null, toastTimer=null;
  let collageIDs = ['cat','opera','lizard','sunset','snow'], collageActiveSlot=0;
  const studioDrafts=[],studioDraftURLs=[];
  const studioPhotos=()=>[...photos,...studioDrafts];
  let scrap = {title:'在北京收集秋天',place:'北京 · 香山',date:'2026 年秋',note:'阳光从树梢落下来，我想把秋天慢慢收好。',theme:'paper'};
  const scrapPalettes={
    paper:{paper:'#f8f2e7',ink:'#49392f',accent:'#a67b5d',line:'#d9c8b5',frame:'#fffdf8'},
    postcard:{paper:'#ebf0ed',ink:'#3f574e',accent:'#67897c',line:'#c4d3c8',frame:'#fffefd'},
    editorial:{paper:'#efeeeb',ink:'#333033',accent:'#8d6a64',line:'#bab4af',frame:'#ffffff'}
  };
  const collageLayouts = {
    scattered:[{x:19,y:37,r:-12},{x:48,y:28,r:8},{x:79,y:39,r:-9},{x:34,y:73,r:10},{x:68,y:74,r:-7}],
    orbit:[{x:50,y:20,r:4},{x:22,y:47,r:-14},{x:78,y:47,r:12},{x:34,y:79,r:7},{x:66,y:79,r:-8}],
    ribbon:[{x:14,y:49,r:-12},{x:32,y:45,r:7},{x:50,y:49,r:-5},{x:68,y:45,r:9},{x:86,y:49,r:-12}]
  };
  let positions = collageLayouts.scattered.map(p=>({...p})), collageMode='scattered', drag=null, suppressClick=false;
  const collageTiles=[];
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function toast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3300)}
  async function loadCatalog(){
    // The static JS mirror is generated from the canonical photos.json.
    // It works on GitHub Pages, file:// previews and restrictive browsers
    // where fetch('data/photos.json') would otherwise leave a blank wall.
    let catalog=window.PHOTO_JOURNAL;
    if(!catalog?.photos?.length){
      try{
        const response=await fetch('data/photos.json',{cache:'no-store'});
        if(!response.ok)throw Error('HTTP '+response.status);
        catalog=await response.json();
      }catch(err){throw Error('照片目录加载失败。data/photos.js 和 data/photos.json 都不可用：'+err.message)}
    }
    if(!Array.isArray(catalog.photos))throw Error('照片目录格式无效');
    const embedded=window.NOTICING_EMBEDDED||{};
    originalPhotos=catalog.photos.map(p=>({
      ...p,
      src:embedded[p.src]||p.src,
      thumb:embedded[p.thumb]||p.thumb||embedded[p.src]||p.src
    }));
    photos=[...originalPhotos];
    $$('img[src^="assets/photos/"]').forEach(img=>{
      const path=img.getAttribute('src');if(embedded[path])img.src=embedded[path];
    });
    const featured={
      'feature-encounters':['v5-white-cat','cat'],
      'feature-architecture':['v5-illuminated-eaves','ceiling'],
      'feature-landscapes':['v5-rose-clouds','sunset'],
      'feature-beijing':['v5-golden-ginkgo','beijing-01']
    };
    Object.entries(featured).forEach(([className,ids])=>{
      const photo=ids.map(id=>photos.find(p=>p.id===id)).find(Boolean),card=$('.'+className);
      const img=card?$('.feature-image img',card):null;
      if(photo&&img){img.src=photo.thumb||photo.src;img.alt=photo.alt||photo.title}
    });
    $$('[data-target-filter]').forEach(card=>{
      const count=photos.filter(p=>p.series===card.dataset.targetFilter).length;
      const label=$('.feature-line span:last-child',card);
      if(label)label.textContent=String(count).padStart(2,'0')+' FRAMES ↗';
    });
  }
  function handleMissingImages(){
    document.addEventListener('error',e=>{
      if(!(e.target instanceof HTMLImageElement))return;
      const img=e.target,src=img.getAttribute('src')||'';
      if(src.startsWith('assets/photos/')&&!img.dataset.githubFallback){
        img.dataset.githubFallback='1';
        img.src='https://raw.githubusercontent.com/56vpc2nv5y-lang/Gallary/main/'+src;
      } else {img.classList.add('image-unavailable');img.alt=(img.alt||'')+'（图片暂时未能加载）';}
    },true);
  }
  function reveal(){
    const els=$$('.reveal');
    if(reduced.matches||!('IntersectionObserver' in window)){els.forEach(x=>x.classList.add('visible'));return;}
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.06});
    els.forEach(el=>io.observe(el));
    const bar=$('#scrollIndicator');
    const progress=()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.width=(max>0?scrollY/max*100:0)+'%'};
    addEventListener('scroll',progress,{passive:true});addEventListener('resize',progress,{passive:true});progress();
  }
  function renderGallery(){
    const root=$('#photoWall');if(!root)return;
    filtered=photos.filter(p=>(filter==='all'||p.series===filter)
      &&(seasonFilter==='all'||p.season===seasonFilter)
      &&(!focusIDs||focusIDs.has(p.id)));
    root.classList.toggle('grid-mode',view==='grid');root.replaceChildren();
    filtered.forEach((photo,i)=>{
      const card=document.createElement('article');card.className='photo-card frame-'+(['chinese','western'].includes(photo.style)?photo.style:'neutral');
      card.dataset.motion=getPhotoMotion(photo);
      const b=document.createElement('button');b.type='button';b.className='photo-card-button';b.setAttribute('aria-label','查看动态照片：'+photo.title);
      b.innerHTML='<div class="photo-figure"><img loading="lazy" decoding="async" alt="'+escapeHTML(photo.alt)+'"><span class="photo-counter">'+String(i+1).padStart(2,'0')+'</span><span class="photo-open-icon" aria-hidden="true">↗</span><span class="photo-motion-icon" aria-hidden="true">✳ 会动的瞬间</span></div><div class="photo-details"><small>'+escapeHTML(photo.location||'A LITTLE MOMENT')+'</small><h3>'+escapeHTML(photo.title)+'</h3><p>'+escapeHTML(photo.en||'')+'</p></div>';
      $('img',b).src=photo.thumb||photo.src;
      b.addEventListener('click',()=>openLightbox(i));card.append(b);root.append(card);
    });
    $('#photoCount').textContent=String(photos.length).padStart(2,'0');
    $('#archiveSummary').textContent=String(filtered.length).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0')+' photographs';
    $('#activeFilterNote').textContent=(seasonFilter==='all'?'全部季节':({spring:'春',summer:'夏',autumn:'秋',winter:'冬'}[seasonFilter]||seasonFilter))
      +' · '+(filter==='all'?'全部章节':filter)+' · '+(focusIDs?'地图精选 · ':'')+'共 '+filtered.length+' 张';
    if(!filtered.length)root.innerHTML='<p class="empty-gallery">这一组暂时没有照片。试试其他章节或季节。</p>';
  }
  function chooseFilter(name){
    filter=name;focusIDs=null;$$('[data-filter]').forEach(btn=>{
      const active=btn.dataset.filter===name;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
    });renderGallery();
  }
  function setupFilters(){
    $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>chooseFilter(b.dataset.filter)));
    $$('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
      view=b.dataset.mode;$$('[data-mode]').forEach(btn=>{const active=btn.dataset.mode===view;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});renderGallery();
    }));
    $$('[data-target-filter]').forEach(link=>link.addEventListener('click',()=>chooseFilter(link.dataset.targetFilter)));
    renderGallery();
  }
  // Eleven lightweight, photo-specific motion treatments. All effects are
  // optical interpretations of still images; never fabricated video footage.
  const livingMotionNames={
    focus:'寻找那个小小的身影',breeze:'风在绿色里轻轻经过',sunbeam:'把树梢的光留住',
    geometry:'光沿着建筑的线条移动',sunset:'晚霞正在慢慢变亮',leaves:'落叶从画面经过',
    golden:'午后的一道金色光',closeup:'镜头温柔地靠近',twinkle:'一点点夜色微光',
    snow:'雪花慢慢落下',ripples:'湖面亮起细碎的波光'
  };
  function getPhotoMotion(p){
    if(p.motion&&livingMotionNames[p.motion])return p.motion;
    if(p.season==='winter')return 'snow';
    if(p.series==='encounters')return 'closeup';
    if(p.series==='architecture')return 'geometry';
    if(p.season==='autumn')return 'leaves';
    return p.series==='landscapes'?'sunbeam':'focus';
  }
  let livingEnabled=true;
  try{livingEnabled=localStorage.getItem('noticing-living-motion')!=='off'}catch(_){}
  function livingCanMove(){return livingEnabled&&!reduced.matches&&!document.hidden}
  function syncLivingMotion(){
    const stage=$('#livingStage'),toggle=$('#livingToggle'),replay=$('#livingReplay'),dialog=$('#lightbox');
    if(!stage||!toggle||!replay)return;
    const enabled=livingCanMove()&&Boolean(dialog?.open);
    stage.classList.toggle('is-live',enabled);
    stage.classList.toggle('is-paused',!enabled);
    toggle.setAttribute('aria-pressed',String(livingEnabled));
    toggle.disabled=reduced.matches;
    replay.disabled=reduced.matches;
    toggle.textContent=reduced.matches?'系统已减少动态':livingEnabled?'暂停动态 Ⅱ':'播放动态 ▷';
  }
  function replayLivingMotion(){
    const stage=$('#livingStage');
    if(!stage||reduced.matches)return;
    livingEnabled=true;
    try{localStorage.setItem('noticing-living-motion','on')}catch(_){}
    stage.classList.remove('is-live');
    // Force a style reset, so CSS animations restart with no extra animation loop.
    void stage.offsetWidth;
    syncLivingMotion();
  }
  function makeLivingParticles(p,type){
    const host=$('#livingParticles');if(!host)return;
    host.replaceChildren();
    const counts={snow:24,leaves:14,twinkle:16,breeze:10};
    const count=counts[type]||0;
    let seed=Array.from(p.id||'photo').reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,12345);
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
    for(let i=0;i<count;i++){
      const part=document.createElement('span');
      part.className='living-particle';
      part.style.setProperty('--x',(random()*96+2).toFixed(1)+'%');
      part.style.setProperty('--y',(random()*90+5).toFixed(1)+'%');
      part.style.setProperty('--delay',(-random()*9).toFixed(2)+'s');
      part.style.setProperty('--duration',(5+random()*5).toFixed(2)+'s');
      part.style.setProperty('--size',(2+random()*7).toFixed(1)+'px');
      part.style.setProperty('--drift',((random()-.5)*150).toFixed(1)+'px');
      host.append(part);
    }
  }
  function renderLivingPhoto(photo){
    const stage=$('#livingStage');
    if(!stage)return;
    const type=getPhotoMotion(photo);
    stage.dataset.motion=type;
    const label=$('#livingEffectLabel');
    if(label)label.textContent=photo.motionLabel||livingMotionNames[type];
    const special=$('#livingToTiles');
    if(special)special.hidden=photo.id!=='beijing-05';
    makeLivingParticles(photo,type);
    replayLivingMotionIfEnabled();
  }
  function replayLivingMotionIfEnabled(){
    const stage=$('#livingStage');
    if(!stage)return;
    stage.classList.remove('is-live');
    void stage.offsetWidth;
    syncLivingMotion();
  }
  function renderLightbox(){
    const p=filtered[lightboxIndex];if(!p)return;
    $('#lightboxImg').src=p.src;$('#lightboxImg').alt=p.alt||p.title;
    $('#lightboxNum').textContent=String(lightboxIndex+1).padStart(2,'0')+' / '+String(filtered.length).padStart(2,'0');
    $('#lightboxTitle').textContent=p.title;$('#lightboxEnglish').textContent=p.en||'';
    $('#lightboxNote').textContent=p.note||'';$('#lightboxPlace').textContent=p.location||'';
    renderLivingPhoto(p);
  }
  function openLightbox(i){
    const d=$('#lightbox');if(!filtered[i])return;lastFocus=document.activeElement;lightboxIndex=i;
    d.showModal();document.body.classList.add('modal-open');renderLightbox();
  }
  function closeLightbox(){const d=$('#lightbox');if(d.open)d.close()}
  function turn(delta){if(!filtered.length)return;lightboxIndex=(lightboxIndex+delta+filtered.length)%filtered.length;renderLightbox()}
  function stopSlides(){if(slideTimer)clearInterval(slideTimer);slideTimer=null;$('#lightboxPlay').textContent='自动播放 ▷'}
  function setupLightbox(){
    const d=$('#lightbox');$('#closeLightbox').addEventListener('click',closeLightbox);
    $('#livingToggle').addEventListener('click',()=>{
      if(reduced.matches)return;
      livingEnabled=!livingEnabled;
      try{localStorage.setItem('noticing-living-motion',livingEnabled?'on':'off')}catch(_){}
      syncLivingMotion();
    });
    $('#livingReplay').addEventListener('click',replayLivingMotion);
    $('#livingToTiles').addEventListener('click',closeLightbox);
    document.addEventListener('visibilitychange',syncLivingMotion);
    reduced.addEventListener?.('change',syncLivingMotion);
    $('#prevPhoto').addEventListener('click',()=>turn(-1));$('#nextPhoto').addEventListener('click',()=>turn(1));
    $('#lightboxPlay').addEventListener('click',()=>{
      if(slideTimer){stopSlides();return;}slideTimer=setInterval(()=>turn(1),6500);$('#lightboxPlay').textContent='暂停播放 Ⅱ';
    });
    d.addEventListener('close',()=>{
      stopSlides();
      $('#livingStage').classList.remove('is-live');
      $('#livingParticles').replaceChildren();
      document.body.classList.remove('modal-open');lastFocus?.focus?.();
    });
    d.addEventListener('click',e=>{if(e.target===d)closeLightbox()});
    addEventListener('keydown',e=>{
      if(!d.open)return;
      if(e.key==='ArrowLeft'){e.preventDefault();turn(-1)}
      else if(e.key==='ArrowRight'){e.preventDefault();turn(1)}
    });
    let touchStart=0;d.addEventListener('touchstart',e=>{touchStart=e.changedTouches[0].screenX},{passive:true});
    d.addEventListener('touchend',e=>{const delta=e.changedTouches[0].screenX-touchStart;if(Math.abs(delta)>60)turn(delta>0?-1:1)},{passive:true});
  }

  class Weather {
    constructor(canvas){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.items=[];this.season='autumn';this.enabled=!reduced.matches;
      this.w=innerWidth;this.h=innerHeight;this.last=performance.now();this.frame=this.frame.bind(this);
      this.resize();this.fill();requestAnimationFrame(this.frame);
      addEventListener('resize',()=>{this.resize();this.fill()},{passive:true});
      document.addEventListener('visibilitychange',()=>{this.last=performance.now()});
    }
    resize(){this.w=innerWidth;this.h=innerHeight;const dpi=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*dpi;this.canvas.height=this.h*dpi;this.ctx.setTransform(dpi,0,0,dpi,0,0)}
    item(random=true){return {x:Math.random()*this.w,y:random?Math.random()*this.h:-30-Math.random()*90,r:2+Math.random()*5,speed:.25+Math.random()*.6,phase:Math.random()*6.28,rotation:Math.random()*6.28,alpha:.21+Math.random()*.32}}
    fill(){this.items=Array.from({length:this.w<650?25:43},()=>this.item())}
    setSeason(season){this.season=season;this.fill()}
    setEnabled(v){this.enabled=v;this.last=performance.now();if(!v)this.ctx.clearRect(0,0,this.w,this.h)}
    frame(now){requestAnimationFrame(this.frame);const dt=Math.min(2,(now-this.last)/16.67);this.last=now;if(!this.enabled||document.hidden)return;
      const ctx=this.ctx;ctx.clearRect(0,0,this.w,this.h);
      this.items.forEach((p,i)=>{p.y+=p.speed*dt;p.x+=Math.sin(now*.0004+p.phase)*.36*dt;p.rotation+=.006*dt;if(p.y>this.h+20){this.items[i]=this.item(false);return}
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.globalAlpha=p.alpha;
        if(this.season==='winter'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,p.r*.6,0,Math.PI*2);ctx.fill()}
        else{const palettes={spring:['#e7a4b4','#e2b6b6','#f4ccd4'],summer:['#4c8257','#76a56d','#a9b77e'],autumn:['#a65a34','#c88747','#d5aa64']};ctx.fillStyle=palettes[this.season][i%3];ctx.beginPath();ctx.moveTo(0,-p.r*1.5);ctx.bezierCurveTo(p.r*1.7,-p.r,p.r*1.4,p.r*1.1,0,p.r*1.4);ctx.bezierCurveTo(-p.r*1.4,p.r,-p.r*1.7,-p.r,0,-p.r*1.5);ctx.fill()}
        ctx.restore();});
    }
  }
  function renderSeasonPreview(){
    const root=$('#seasonPreview');root.replaceChildren();
    const shown=seasonFilter==='all'?photos:photos.filter(p=>p.season===seasonFilter);
    $('#seasonPreviewCount').textContent=(seasonFilter==='all'?'所有季节':'这个季节')+' · '+shown.length+' 张影像';
    shown.slice(0,6).forEach(p=>{
      const button=document.createElement('button');button.className='season-shot';button.type='button';
      const img=document.createElement('img');img.src=p.thumb||p.src;img.alt=p.alt||p.title;img.loading='lazy';
      const title=document.createElement('span');title.textContent=p.title;button.append(img,title);
      button.addEventListener('click',()=>{
        chooseFilter('all');const index=filtered.findIndex(x=>x.id===p.id);if(index>=0)openLightbox(index);
      });
      root.append(button);
    });
  }
  function setupSeasons(){
    let weather;try{weather=new Weather($('#seasonCanvas'))}catch(err){console.warn('No canvas effect:',err)}
    const messages={spring:'春天的照片，花瓣也轻轻落下来。',summer:'盛夏的影像，藏着树影和绿意。',autumn:'金色的照片，像北京的落叶。',winter:'雪里的瞬间，天地安静了下来。'};
    let visual='autumn';try{visual=localStorage.getItem('noticing-season')||'autumn'}catch(_){}
    function applySeason(name,filterPhotos=true){
      if(!messages[name])return;
      document.documentElement.dataset.season=name;weather?.setSeason(name);
      if(filterPhotos){seasonFilter=name;focusIDs=null;chooseFilter('all');}
      $$('[data-season]').forEach(b=>{const active=b.dataset.season===seasonFilter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
      $('#seasonDescription').textContent=filterPhotos?messages[name]:'点击季节，查看对应照片；秋叶只是眼前的氛围。';
      renderSeasonPreview();
      try{localStorage.setItem('noticing-season',name)}catch(_){}
    }
    $$('[data-season]').forEach(b=>b.addEventListener('click',()=>applySeason(b.dataset.season,true)));
    $('#resetSeason').addEventListener('click',()=>{seasonFilter='all';focusIDs=null;chooseFilter('all');$$('[data-season]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});$('#seasonDescription').textContent='四季的照片重新汇在一起。';renderSeasonPreview()});
    applySeason(visual,false);
    const motion=$('#motionToggle');let playing=!reduced.matches;function updateMotion(){weather?.setEnabled(playing);motion.textContent=playing?'暂停动态 Ⅱ':'开启动态 ✳';motion.setAttribute('aria-pressed',String(playing))}
    motion.addEventListener('click',()=>{playing=!playing;updateMotion()});updateMotion();
    reduced.addEventListener?.('change',e=>{if(e.matches){playing=false;updateMotion()}});
  }


  function setupFootprints(){
    const located=photos.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.city&&p.country);
    const cities=new Map();
    located.forEach(p=>{
      const key=p.country+'|'+p.city;
      if(!cities.has(key))cities.set(key,[]);
      cities.get(key).push(p);
    });
    const names={Beijing:'北京',Astana:'阿斯塔纳'};
    const back=$('#mapBack'),scope=$('#mapScopeTitle'),description=$('#mapScopeNote'),list=$('#mapPlaces'),mapHost=$('#footprintMap');
    const NS='http://www.w3.org/2000/svg';
    let active=null;
    const node=(tag,attrs={})=>{
      const el=document.createElementNS(NS,tag);
      Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));
      return el;
    };
    function svgText(svg,x,y,text,klass){
      const el=node('text',{x,y,class:klass});el.textContent=text;svg.append(el);return el;
    }
    function marker(svg,x,y,label,action){
      const g=node('g',{class:'travel-marker',role:'button',tabindex:'0','aria-label':'打开 '+label});
      const halo=node('circle',{cx:x,cy:y,r:27,class:'travel-marker-halo'});
      const outer=node('circle',{cx:x,cy:y,r:13,class:'travel-marker-outer'});
      const inner=node('circle',{cx:x,cy:y,r:5,class:'travel-marker-inner'});
      const text=node('text',{x:x+22,y:y-17,class:'travel-marker-label'});text.textContent=label;
      const title=node('title');title.textContent='点击查看 '+label;
      g.append(halo,outer,inner,text,title);svg.append(g);
      g.addEventListener('click',action);
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}});
    }
    function baseSvg(heading,mode){
      mapHost.replaceChildren();
      const svg=node('svg',{viewBox:'0 0 1000 590',preserveAspectRatio:'xMidYMid meet',
        class:'offline-geo','aria-label':mode==='world'?'世界照片足迹地图':'城市照片地点相对位置图'});
      const defs=node('defs');
      const grad=node('linearGradient',{id:'atlas-sea',x1:'0',y1:'0',x2:'1',y2:'1'});
      const stop1=node('stop',{offset:'0%','stop-color':'#e9eee8'});
      const stop2=node('stop',{offset:'100%','stop-color':'#dbe5db'});
      grad.append(stop1,stop2);
      const noise=node('pattern',{id:'atlas-lines',patternUnits:'userSpaceOnUse',width:'60',height:'60'});
      noise.append(node('path',{d:'M60 0H0V60',fill:'none',stroke:'#ffffff','stroke-width':'1',opacity:'.56'}));
      defs.append(grad,noise);svg.append(defs);
      svg.append(node('rect',{x:0,y:0,width:1000,height:590,fill:'url(#atlas-sea)'}));
      svg.append(node('rect',{x:0,y:0,width:1000,height:590,fill:'url(#atlas-lines)'}));
      svgText(svg,42,55,heading,'atlas-title');
      svgText(svg,43,82,mode==='world'?'A SMALL ATLAS OF MEMORIES':'PLACES SHOWN BY RELATIVE POSITION','atlas-subtitle');
      svgText(svg,44,557,mode==='world'?'世界 → 城市 → 具体地点 → 照片':'经确认的公开景点 · 不是拍摄 GPS 或导航路线','atlas-footnote');
      mapHost.append(svg);return svg;
    }
    function worldMap(){
      const svg=baseSvg('TRAVEL NOTES / WORLD','world');
      const lands=[
        'M68 173L92 122 144 96 203 115 248 144 267 188 244 213 207 204 187 238 153 245 140 217 108 222 80 199Z',
        'M255 255L289 271 323 307 345 342 334 388 313 429 287 472 272 441 282 391 268 355 249 314Z',
        'M450 135L490 106 539 110 565 124 606 102 655 113 707 93 776 113 841 138 905 167 925 208 898 246 855 227 818 252 774 226 733 236 696 215 651 239 603 216 564 239 530 206 494 209 465 184Z',
        'M491 240L551 237 592 268 620 302 609 352 578 408 549 425 520 374 510 325 480 280Z',
        'M811 380L844 361 889 376 921 403 907 437 864 451 827 431Z',
        'M320 73L344 42 389 46 411 71 395 102 358 109Z'
      ];
      lands.forEach(d=>svg.append(node('path',{d,class:'atlas-land'})));
      [
        [147,151,'NORTH AMERICA'],[290,347,'SOUTH AMERICA'],[540,175,'EUROPE'],
        [670,174,'ASIA'],[548,327,'AFRICA'],[870,414,'AUSTRALIA']
      ].forEach(([x,y,name])=>svgText(svg,x,y,name,'atlas-continent'));
      for(const [key,group] of cities){
        const {lat,lng,city}=group[0],x=(lng+180)/360*1000,y=(90-lat)/180*590;
        marker(svg,x,y,names[city]||city,()=>enterCity(key));
      }
    }
    function cityMap(group){
      const city=group[0].city;
      const svg=baseSvg((names[city]||city).toUpperCase()+' / PLACES','city');
      for(let i=0;i<10;i++){
        const off=i*90-120;
        svg.append(node('path',{d:'M'+off+' 105 Q'+(off+160)+' 290 '+(off+300)+' 510',
          class:'atlas-street'}));
      }
      for(let i=0;i<6;i++){
        const off=130+i*72;
        svg.append(node('path',{d:'M65 '+off+' Q480 '+(off+40)+' 925 '+(off-35),class:'atlas-street'}));
      }
      const places=new Map();
      group.forEach(p=>{
        const name=p.place||p.location||'未命名地点';
        if(!places.has(name))places.set(name,[]);
        places.get(name).push(p);
      });
      const uniq=[...places.values()];
      const minLat=Math.min(...uniq.map(v=>v[0].lat)),maxLat=Math.max(...uniq.map(v=>v[0].lat));
      const minLng=Math.min(...uniq.map(v=>v[0].lng)),maxLng=Math.max(...uniq.map(v=>v[0].lng));
      const rangeLat=Math.max(.05,maxLat-minLat),rangeLng=Math.max(.05,maxLng-minLng);
      const padX=(rangeLng-(maxLng-minLng))/2,padY=(rangeLat-(maxLat-minLat))/2;
      uniq.forEach(records=>{
        const p=records[0],x=170+(p.lng-minLng+padX)/rangeLng*660;
        const y=470-(p.lat-minLat+padY)/rangeLat*320;
        marker(svg,x,y,p.place||p.location,()=>openMappedPhoto(records.map(q=>q.id)));
      });
    }
    function item(title,subtitle,thumb,action){
      const button=document.createElement('button');button.className='map-place';button.type='button';
      const img=document.createElement('img');img.src=thumb;img.alt='';img.loading='lazy';
      const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent=title;
      const small=document.createElement('small');small.textContent=subtitle;copy.append(strong,small);
      const arrow=document.createElement('span');arrow.className='map-arrow';arrow.textContent='↗';
      button.append(img,copy,arrow);button.addEventListener('click',action);list.append(button);
    }
    function openMappedPhoto(ids){
      filter='all';seasonFilter='all';focusIDs=new Set(ids);
      $$('[data-filter]').forEach(b=>{const v=b.dataset.filter==='all';b.classList.toggle('active',v);b.setAttribute('aria-pressed',String(v))});
      $$('[data-season]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
      renderGallery();$('#archive').scrollIntoView({behavior:reduced.matches?'auto':'smooth',block:'start'});
    }
    function world(){
      active=null;back.hidden=true;list.replaceChildren();
      scope.textContent='从世界出发，收藏途经的城市。';
      description.textContent='点击地图标记或城市卡片，打开这趟旅程。';
      worldMap();
      for(const [key,group] of cities){
        const city=group[0].city,country=group[0].country;
        item((names[city]||city)+' / '+country,group.length+' 张照片 · 点击进入',group[0].thumb||group[0].src,()=>enterCity(key));
      }
    }
    function enterCity(key){
      const group=cities.get(key);if(!group)return;
      active=key;back.hidden=false;list.replaceChildren();
      scope.textContent=(names[group[0].city]||group[0].city)+' · '+group[0].country;
      description.textContent=group.length+' 张照片 · 点击地点查看作品。地图中的位置是公共地标示意。';
      const places=new Map();
      group.forEach(p=>{
        const name=p.place||p.location||'未命名地点';
        if(!places.has(name))places.set(name,[]);
        places.get(name).push(p);
      });
      for(const [name,records] of places){
        const p=records[0];
        item(name,records.length+' 张照片 · 看这一站',p.thumb||p.src,()=>openMappedPhoto(records.map(q=>q.id)));
      }
      cityMap(group);
    }
    back.addEventListener('click',world);world();
  }

  function collagePhoto(i){return studioPhotos().find(p=>p.id===collageIDs[i])||photos[i]||photos[0]}
  function openStudioPhoto(i){
    const p=collagePhoto(i);
    if(studioDrafts.some(x=>x.id===p.id)){
      const prev=filtered;filtered=[p];openLightbox(0);
      $('#lightbox').addEventListener('close',()=>{filtered=prev},{once:true});
    }else{
      chooseFilter('all');const idx=filtered.findIndex(x=>x.id===p.id);if(idx>=0)openLightbox(idx);
    }
  }
  function setupScrapbook(){
    const ids={scrapTitle:'title',scrapPlace:'place',scrapDate:'date',scrapNote:'note',scrapTheme:'theme'};
    try{
      const saved=JSON.parse(localStorage.getItem('noticing-scrapbook-v5')||'null');
      if(saved&&typeof saved==='object'){
        for(const key of Object.keys(scrap)){
          if(typeof saved[key]==='string'&&(key!=='theme'||scrapPalettes[saved[key]])){
            scrap[key]=saved[key].slice(0,key==='note'?130:60);
          }
        }
      }
    }catch(_){}
    function refresh(){
      const board=$('#collageBoard');board.dataset.paperTheme=scrap.theme;
      $('#scrapPreviewTop').textContent=[scrap.date,scrap.place].filter(Boolean).join(' · ')||'MY MEMORY PAGE';
      $('#scrapPreviewTitle').textContent=scrap.title||'这一页，留给回忆';
      $('#scrapPreviewNote').textContent=scrap.note||'把喜欢的瞬间留在这里。';
      try{localStorage.setItem('noticing-scrapbook-v5',JSON.stringify(scrap))}catch(_){}
    }
    Object.entries(ids).forEach(([id,key])=>{
      const el=$('#'+id);el.value=scrap[key];
      el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{
        scrap[key]=el.value;
        refresh();
      });
    });
    refresh();
  }
  function canvasWrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines){
    const chars=Array.from(text||'');let line='',lines=0;
    for(const char of chars){
      if(char==='\n'||(line&&ctx.measureText(line+char).width>maxWidth)){
        ctx.fillText(line,x,y+lines*lineHeight);lines++;line='';
        if(lines>=maxLines)return;
        if(char==='\n')continue;
      }
      line+=char;
    }
    if(line&&lines<maxLines)ctx.fillText(line,x,y+lines*lineHeight);
  }
  function saveCollage(){try{localStorage.setItem('noticing-collage-v2',JSON.stringify({mode:collageMode,positions,collageIDs}))}catch(_){}}
  function loadCollage(){try{const v=JSON.parse(localStorage.getItem('noticing-collage-v2')||'null');if(v&&v.positions?.length===5&&v.positions.every(p=>[p.x,p.y,p.r].every(Number.isFinite))){positions=v.positions.map(p=>({x:clamp(p.x,10,90),y:clamp(p.y,14,86),r:clamp(p.r,-30,30)}));collageMode=v.mode||'custom';if(Array.isArray(v.collageIDs)&&v.collageIDs.length===5&&v.collageIDs.every(id=>photos.some(p=>p.id===id))){collageIDs=v.collageIDs}}}catch(_){}}
  function placeTile(i){const p=positions[i],tile=collageTiles[i];tile.style.left=p.x+'%';tile.style.top=p.y+'%';tile.style.setProperty('--rotate',p.r+'deg')}
  function updateLayouts(){$$('[data-layout]').forEach(b=>{const active=b.dataset.layout===collageMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
  function layout(name){if(!collageLayouts[name])return;positions=collageLayouts[name].map(p=>({...p}));collageMode=name;collageTiles.forEach((_,i)=>placeTile(i));updateLayouts();saveCollage()}
  function updateCollageTiles(){
    collageTiles.forEach((tile,i)=>{
      const p=collagePhoto(i),img=$('img',tile),caption=$('span',tile);
      img.src=p.thumb||p.src;img.alt=p.alt||p.title;
      caption.textContent=String(i+1).padStart(2,'0')+' / '+p.title;
      tile.setAttribute('aria-label',p.title+'；拖动或方向键移动，回车查看大图');
    });
    renderCollagePicker();
    saveCollage();
  }
  function renderCollagePicker(){
    const picker=$('#collagePhotoPicker');
    if(!picker)return;
    picker.replaceChildren();
    const caption=document.createElement('div');caption.className='picker-status';
    caption.textContent='正在替换第 '+(collageActiveSlot+1)+' 张 · 选图后自动移到下一张';
    picker.append(caption);
    studioPhotos().forEach(p=>{
      const b=document.createElement('button');b.type='button';b.className='pick-photo';
      const selected=collageIDs.indexOf(p.id),active=selected===collageActiveSlot;
      b.classList.toggle('selected',selected>=0);b.classList.toggle('active-slot',active);
      b.setAttribute('aria-label','选用 '+p.title+(selected>=0?'（当前第 '+(selected+1)+' 张）':''));
      b.setAttribute('aria-pressed',String(selected>=0));
      const img=document.createElement('img');img.src=p.thumb||p.src;img.alt='';img.loading='lazy';
      const name=document.createElement('span');name.textContent=p.title;
      b.append(img,name);
      if(selected>=0){const check=document.createElement('i');check.textContent=String(selected+1);b.append(check)}
      b.addEventListener('click',()=>{
        if(selected>=0){
          collageActiveSlot=selected;renderCollagePicker();return;
        }
        collageIDs[collageActiveSlot]=p.id;
        collageActiveSlot=(collageActiveSlot+1)%5;
        updateCollageTiles();
      });
      picker.append(b);
    });
  }
  function initCollage(){
    const board=$('#collageBoard');loadCollage();setupScrapbook();
    for(let i=0;i<5;i++){
      const p=collagePhoto(i),tile=document.createElement('div');tile.className='collage-tile';tile.dataset.index=String(i);tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label',p.title+'；拖动位置或按方向键微调；按回车查看大图');
      const img=document.createElement('img');img.src=p.thumb||p.src;img.alt=p.alt||p.title;img.draggable=false;
      const caption=document.createElement('span');caption.textContent=String(i+1).padStart(2,'0')+' / '+p.title;tile.append(img,caption);
      tile.addEventListener('click',()=>{if(suppressClick)return;openStudioPhoto(i)});
      tile.addEventListener('keydown',e=>{
        const offsets={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};
        if(offsets[e.key]){e.preventDefault();positions[i].x=clamp(positions[i].x+offsets[e.key][0],10,90);positions[i].y=clamp(positions[i].y+offsets[e.key][1],14,86);collageMode='custom';placeTile(i);updateLayouts();saveCollage()}
        else if(e.key==='Enter'||e.key===' '){e.preventDefault();tile.click()}
      });
      board.append(tile);collageTiles.push(tile);placeTile(i);
    }
    $('#collageCollection').addEventListener('change',e=>{
      const group=e.target.value;
      const selected=group==='all'
        ?['cat','opera','lizard','sunset','snow'].map(id=>photos.find(p=>p.id===id)).filter(Boolean)
        :photos.filter(p=>p.series===group);
      const rest=photos.filter(p=>!selected.includes(p));
      collageIDs=[...selected,...rest].slice(0,5).map(p=>p.id);
      collageActiveSlot=0;updateCollageTiles();
      toast('已切换拼贴照片，可继续点缩略图替换');
    });
    $('#collageRandomPhotos').addEventListener('click',()=>{
      collageIDs=[...studioPhotos()].sort(()=>Math.random()-.5).slice(0,5).map(p=>p.id);
      collageActiveSlot=0;updateCollageTiles();toast('已选出新的五张照片');
    });
    $('#collageLocalFiles').addEventListener('change',e=>{
      const selected=[...e.target.files].filter(file=>file.type.startsWith('image/')).slice(0,12);
      e.target.value='';
      if(!selected.length)return;
      selected.forEach((file,i)=>{
        const src=URL.createObjectURL(file);
        studioDraftURLs.push(src);
        const title=file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' ').slice(0,50)||'我的一张照片';
        const p={id:'draft-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,6),
          src,thumb:src,title,en:'',series:'landscapes',season:'unknown',style:'neutral',location:'本地临时照片',
          note:'',alt:title,shape:'landscape'};
        studioDrafts.push(p);
      });
      // First new image goes straight onto the current free page slot.
      collageIDs[collageActiveSlot]=studioDrafts[studioDrafts.length-selected.length].id;
      collageActiveSlot=(collageActiveSlot+1)%5;
      updateCollageTiles();
      toast('已加入 '+selected.length+' 张本地素材；它们只用于当前手帐，不会公开上传');
    });
    addEventListener('pagehide',()=>studioDraftURLs.forEach(url=>URL.revokeObjectURL(url)),{once:true});
    board.addEventListener('pointerdown',e=>{
      const tile=e.target.closest('.collage-tile');if(!tile||e.button!==0)return;
      const i=Number(tile.dataset.index),r=board.getBoundingClientRect();drag={id:e.pointerId,i,x:e.clientX,y:e.clientY,sx:positions[i].x,sy:positions[i].y,w:r.width,h:r.height,moved:false};tile.setPointerCapture(e.pointerId);tile.classList.add('dragging');
    });
    board.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(!drag.moved)return;
      e.preventDefault();positions[drag.i].x=clamp(drag.sx+dx/drag.w*100,10,90);positions[drag.i].y=clamp(drag.sy+dy/drag.h*100,14,86);placeTile(drag.i);
    });
    const finish=e=>{if(!drag||e.pointerId!==drag.id)return;const moved=drag.moved;collageTiles[drag.i].classList.remove('dragging');drag=null;if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false},220);collageMode='custom';updateLayouts();saveCollage();$('#studioStatus').textContent='刚刚调整的位置已经保存。'}};
    board.addEventListener('pointerup',finish);board.addEventListener('pointercancel',finish);
    $$('[data-layout]').forEach(b=>b.addEventListener('click',()=>layout(b.dataset.layout)));
    $('#collageShuffle').addEventListener('click',()=>{positions=positions.map(p=>({x:clamp(p.x+(Math.random()-.5)*25,12,88),y:clamp(p.y+(Math.random()-.5)*24,17,83),r:(Math.random()-.5)*27}));collageMode='custom';collageTiles.forEach((_,i)=>placeTile(i));saveCollage();updateLayouts();toast('新的拼贴组合已经出现了 ✳')});
    $('#collageReset').addEventListener('click',()=>layout('scattered'));
    $('#collageExport').addEventListener('click',exportCollage);
    updateLayouts();renderCollagePicker();
  }
  async function loadImage(src){const img=new Image();img.crossOrigin='anonymous';img.src=src;if(img.decode)await img.decode();else await new Promise((res,rej)=>{img.onload=res;img.onerror=rej});return img}
  function fillImage(ctx,img,x,y,w,h){const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=w/scale,ih=h/scale;ctx.drawImage(img,(img.naturalWidth-iw)/2,(img.naturalHeight-ih)/2,iw,ih,x,y,w,h)}
  async function exportCollage(){
    const btn=$('#collageExport');btn.disabled=true;btn.textContent='正在生成…';
    try{
      const images=await Promise.all(Array.from({length:5},(_,i)=>loadImage(collagePhoto(i).src)));
      const cvs=document.createElement('canvas');cvs.width=1800;cvs.height=1350;
      const ctx=cvs.getContext('2d'),palette=scrapPalettes[scrap.theme]||scrapPalettes.paper;
      ctx.fillStyle=palette.paper;ctx.fillRect(0,0,cvs.width,cvs.height);
      ctx.strokeStyle=palette.line;ctx.lineWidth=2;ctx.strokeRect(30,30,1740,1290);
      ctx.fillStyle=palette.accent;ctx.font='23px Georgia,serif';
      ctx.fillText('SUNNY / MEMORY JOURNAL',90,98);
      ctx.textAlign='right';ctx.fillText(scrap.date||'AN UNDated DAY',1706,98);ctx.textAlign='left';
      ctx.fillStyle=palette.ink;ctx.font='bold 72px "Noto Serif SC","Microsoft YaHei",Georgia,serif';
      canvasWrapText(ctx,scrap.title||'这一页，留给回忆',90,186,1590,80,1);
      ctx.fillStyle=palette.accent;ctx.font='30px "Noto Serif SC","Microsoft YaHei",serif';
      ctx.fillText(scrap.place||'某个值得记住的地方',93,240);
      ctx.beginPath();ctx.moveTo(92,264);ctx.lineTo(1708,264);ctx.strokeStyle=palette.line;ctx.stroke();
      const noteTop=1153,usableTop=296,usableHeight=755;
      for(let i=0;i<5;i++){
        const p=positions[i],img=images[i],x=p.x/100*1800,y=usableTop+p.y/100*usableHeight,w=325,h=272;
        ctx.save();ctx.translate(x,y);ctx.rotate(p.r*Math.PI/180);
        ctx.shadowColor='#2c1d1944';ctx.shadowBlur=23;ctx.shadowOffsetY=12;
        ctx.fillStyle=palette.frame;ctx.fillRect(-w/2-13,-h/2-13,w+26,h+64);
        ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
        fillImage(ctx,img,-w/2,-h/2,w,h);
        ctx.fillStyle=palette.ink;ctx.font='19px "Noto Serif SC","Microsoft YaHei",serif';
        const caption=String(i+1).padStart(2,'0')+' / '+collagePhoto(i).title;
        let shortCaption=caption;
        while(ctx.measureText(shortCaption).width>w-10&&shortCaption.length>3)shortCaption=shortCaption.slice(0,-2)+'…';
        ctx.fillText(shortCaption,-w/2+7,h/2+32);
        ctx.restore();
      }
      ctx.beginPath();ctx.moveTo(92,1118);ctx.lineTo(1708,1118);ctx.strokeStyle=palette.line;ctx.stroke();
      ctx.fillStyle=palette.ink;ctx.font='30px "Noto Serif SC","Microsoft YaHei",serif';
      canvasWrapText(ctx,scrap.note||'愿这些时刻一直都在。',94,noteTop,1560,44,2);
      ctx.fillStyle=palette.accent;ctx.font='italic 26px Georgia,serif';
      ctx.fillText('The Art of Noticing · by Sunny',94,1282);
      const blob=await new Promise((resolve,reject)=>cvs.toBlob(b=>b?resolve(b):reject(Error('No export')),'image/png'));
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='Sunny-Memory-Journal-'+new Date().toISOString().slice(0,10)+'.png';
      document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),7000);
      $('#studioStatus').textContent='纪念手帐已生成，请在下载文件夹查看。';
      toast('纪念手帐 PNG 已导出 ✳');
    }catch(err){console.warn('Scrapbook export',err);toast('导出失败，请确认所有图片已经加载完成')}
    finally{btn.disabled=false;btn.textContent='导出纪念手帐 PNG ↗'}
  }

  // A moving photograph — adapted from the user's "四时画廊" Kunming Lake tile reveal.
  // Uses the SAME photos catalog as the archive, atlas, seasons and scrapbook.
  function initMomentTiles(){
    const stage=$('#momentStage'),canvas=$('#momentTiles'),fallback=$('#momentFallback');
    const select=$('#momentPhotoSelect'),replayButton=$('#momentReplay');
    const title=$('#momentPhotoTitle'),place=$('#momentPhotoPlace'),status=$('#momentStatus');
    if(!stage||!canvas||!fallback||!select||!replayButton||!photos.length)return;
    const context=canvas.getContext('2d');
    if(!context){status.textContent='当前浏览器不支持画布，已显示原照片。';return;}
    const choices=[...photos];
    select.replaceChildren();
    choices.forEach(p=>{
      const option=document.createElement('option');
      option.value=p.id;option.textContent=p.title+(p.location?' · '+p.location:'');
      select.append(option);
    });

    let photo=null,image=null,tiles=[],width=0,height=0,frame=0,loadId=0;
    let started=false,observer=null,resizeTimer=null;
    const abort=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=0;
      stage.classList.remove('is-playing');
    };
    const sizeCanvas=()=>{
      const rect=canvas.getBoundingClientRect();
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      const scale=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*scale);
      canvas.height=Math.round(height*scale);
      context.setTransform(scale,0,0,scale,0,0);
      context.clearRect(0,0,width,height);
      context.imageSmoothingEnabled=true;
      const columns=width<650?9:14;
      const cell=width/columns;
      const rows=Math.ceil(height/cell);
      const halfDiagonal=Math.hypot(width/2,height/2)||1;
      tiles=[];
      for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
        const left=x*cell,top=y*cell,w=Math.min(cell,width-left),h=Math.min(cell,height-top);
        if(w<=0||h<=0)continue;
        const dist=Math.hypot(left+w/2-width/2,top+h/2-height/2)/halfDiagonal;
        tiles.push({
          x:left,y:top,w,h,
          delay:dist*.54+Math.random()*.22,
          offsetX:(Math.random()-.5)*Math.min(width*.58,330),
          offsetY:(Math.random()-.5)*Math.min(height*.9,270)+45,
          angle:(Math.random()-.5)*1.25
        });
      }
    };
    const paint=seconds=>{
      if(!image||!image.naturalWidth)return true;
      context.clearRect(0,0,width,height);
      const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
      const cropX=(image.naturalWidth-width/scale)/2;
      const cropY=(image.naturalHeight-height/scale)/2;
      let finished=true;
      for(const tile of tiles){
        const fraction=Math.max(0,Math.min(1,(seconds-tile.delay)/.88));
        if(fraction<1)finished=false;
        if(fraction<=0)continue;
        const ease=1-Math.pow(1-fraction,3);
        context.save();
        context.globalAlpha=ease;
        context.translate(tile.x+tile.w/2+tile.offsetX*(1-ease),tile.y+tile.h/2+tile.offsetY*(1-ease));
        context.rotate(tile.angle*(1-ease));
        context.drawImage(image,
          cropX+tile.x/scale,cropY+tile.y/scale,tile.w/scale,tile.h/scale,
          -tile.w/2,-tile.h/2,tile.w+.6,tile.h+.6);
        context.restore();
      }
      return finished;
    };
    function play(){
      abort();
      if(!image||!image.naturalWidth){status.textContent='照片正在加载…';return;}
      if(reduced.matches){
        status.textContent='已遵循减少动态设置，显示完整照片。';
        return;
      }
      sizeCanvas();
      status.textContent='碎片正在回到它们的位置…';
      stage.classList.add('is-playing');
      const startTime=performance.now();
      const loop=now=>{
        frame=0;
        if(paint((now-startTime)/1000)){
          abort();
          status.textContent='拼好了。还可以再看一次。';
        }else{
          frame=requestAnimationFrame(loop);
        }
      };
      frame=requestAnimationFrame(loop);
    }
    function setPhoto(id){
      const next=choices.find(p=>p.id===id)||choices[0];
      if(!next)return;
      abort();
      photo=next;image=null;
      select.value=next.id;
      title.textContent=next.title;
      place.textContent=next.location||next.place||'一个值得收藏的瞬间';
      fallback.src=next.src;
      fallback.alt=next.alt||next.title;
      canvas.setAttribute('aria-label',next.title+'：碎片重新拼成完整照片');
      status.textContent='照片正在加载…';
      const token=++loadId;
      const nextImage=new Image();
      nextImage.onload=()=>{
        if(token!==loadId)return;
        image=nextImage;
        play();
      };
      nextImage.onerror=()=>{
        if(token!==loadId)return;
        status.textContent='这张照片暂时无法加载，可以换另一张。';
      };
      nextImage.src=next.src;
    }
    replayButton.addEventListener('click',()=>{
      if(!started){started=true;observer?.disconnect();setPhoto(select.value);return;}
      if(image)play();
      else setPhoto(select.value);
    });
    select.addEventListener('change',()=>{
      started=true;observer?.disconnect();setPhoto(select.value);
    });
    const start=()=>{
      if(started)return;
      started=true;
      observer?.disconnect();
      setPhoto(choices.some(p=>p.id==='beijing-05')?'beijing-05':choices[0].id);
    };
    if('IntersectionObserver' in window){
      observer=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting))start();
      },{threshold:.18});
      observer.observe(stage);
    }else{
      start();
    }
    window.addEventListener('resize',()=>{
      clearTimeout(resizeTimer);
      resizeTimer=setTimeout(()=>{
        if(!started)return;
        abort();
        context.clearRect(0,0,canvas.width,canvas.height);
        if(image&&image.naturalWidth)status.textContent='调整完窗口后，点击重新拼合还可以再看一次。';
      },140);
    },{passive:true});
    reduced.addEventListener?.('change',event=>{
      if(event.matches){
        abort();
        status.textContent='已切换为静态照片（减少动态）。';
      }
    });
  }

  // Publishing takes place through GitHub commits, not an isolated browser database.
  // Isolate optional features: a failure in one view must never hide the gallery or map.
  function safelyInitialize(label,fn){
    try{fn();return true}
    catch(err){console.error('[Gallery] '+label+' failed:',err);return false}
  }
  async function init(){
    safelyInitialize('image fallback',handleMissingImages);
    safelyInitialize('scroll reveal',reveal);
    safelyInitialize('photo lightbox',setupLightbox);
    try{await loadCatalog()}
    catch(err){
      console.error('[Gallery] photo data failed:',err);
      const message=$('#activeFilterNote');
      if(message)message.textContent='照片清单无法载入，请刷新网页；若仍然空白，可检查 data/photos.js 是否存在。';
      const fallback=$('#mapFallback');if(fallback)fallback.hidden=false;
      return;
    }
    // Gallery is the primary experience. Render immediately even if optional controls fail.
    if(!safelyInitialize('gallery filters',setupFilters))safelyInitialize('gallery render',renderGallery);
    safelyInitialize('season filters',setupSeasons);
    safelyInitialize('map footprints',setupFootprints);
    safelyInitialize('memory scrapbook',initCollage);
    safelyInitialize('photo reassembly',initMomentTiles);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
