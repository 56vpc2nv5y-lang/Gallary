/* The Art of Noticing — original, dependency-free photo journal */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const source = window.PHOTO_JOURNAL || {photos:[]};
  const originalPhotos = [...source.photos];
  let photos = [...originalPhotos], filtered = [...photos], filter='all', view='editorial';
  let lightboxIndex=0, slideTimer=null, lastFocus=null, toastTimer=null;
  const localURLs = [], imported = [];
  const collageIDs = ['cat','opera','lizard','sunset','snow'];
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
    filtered=photos.filter(p=>filter==='all'||p.series===filter);
    root.classList.toggle('grid-mode',view==='grid');root.replaceChildren();
    filtered.forEach((photo,i)=>{
      const card=document.createElement('article');card.className='photo-card';
      const b=document.createElement('button');b.type='button';b.className='photo-card-button';b.setAttribute('aria-label','查看照片：'+photo.title);
      b.innerHTML='<div class="photo-figure"><img loading="lazy" decoding="async" alt="'+escapeHTML(photo.alt)+'"><span class="photo-counter">'+String(i+1).padStart(2,'0')+'</span><span class="photo-open-icon" aria-hidden="true">↗</span></div><div class="photo-details"><small>'+escapeHTML(photo.location||'A LITTLE MOMENT')+'</small><h3>'+escapeHTML(photo.title)+'</h3><p>'+escapeHTML(photo.en||'')+'</p></div>';
      $('img',b).src=photo.thumb||photo.src;
      b.addEventListener('click',()=>openLightbox(i));card.append(b);root.append(card);
    });
    $('#photoCount').textContent=String(photos.length).padStart(2,'0');
    $('#archiveSummary').textContent=String(filtered.length).padStart(2,'0')+' moments, still counting.';
  }
  function chooseFilter(name){
    filter=name;$$('[data-filter]').forEach(btn=>{
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
  function renderLightbox(){
    const p=filtered[lightboxIndex];if(!p)return;
    $('#lightboxImg').src=p.src;$('#lightboxImg').alt=p.alt||p.title;
    $('#lightboxNum').textContent=String(lightboxIndex+1).padStart(2,'0')+' / '+String(filtered.length).padStart(2,'0');
    $('#lightboxTitle').textContent=p.title;$('#lightboxEnglish').textContent=p.en||'';
    $('#lightboxNote').textContent=p.note||'';$('#lightboxPlace').textContent=p.location||'';
  }
  function openLightbox(i){
    const d=$('#lightbox');if(!filtered[i])return;lastFocus=document.activeElement;lightboxIndex=i;renderLightbox();
    d.showModal();document.body.classList.add('modal-open');
  }
  function closeLightbox(){const d=$('#lightbox');if(d.open)d.close()}
  function turn(delta){if(!filtered.length)return;lightboxIndex=(lightboxIndex+delta+filtered.length)%filtered.length;renderLightbox()}
  function stopSlides(){if(slideTimer)clearInterval(slideTimer);slideTimer=null;$('#lightboxPlay').textContent='自动播放 ▷'}
  function setupLightbox(){
    const d=$('#lightbox');$('#closeLightbox').addEventListener('click',closeLightbox);
    $('#prevPhoto').addEventListener('click',()=>turn(-1));$('#nextPhoto').addEventListener('click',()=>turn(1));
    $('#lightboxPlay').addEventListener('click',()=>{
      if(slideTimer){stopSlides();return;}slideTimer=setInterval(()=>turn(1),3600);$('#lightboxPlay').textContent='暂停播放 Ⅱ';
    });
    d.addEventListener('close',()=>{stopSlides();document.body.classList.remove('modal-open');lastFocus?.focus?.()});
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
  function setupSeasons(){
    let weather;try{weather=new Weather($('#seasonCanvas'))}catch(err){console.warn('No canvas effect:',err)}
    const messages={spring:'花瓣飘下来，日子也轻快了一点。',summer:'风吹过绿荫，夏天慢慢醒来。',autumn:'落叶轻轻落下来，像一封写给秋天的信。',winter:'初雪慢慢落下，回忆依然温暖。'};
    let selected='autumn';try{selected=localStorage.getItem('noticing-season')||'autumn'}catch(_){}
    function applySeason(name){if(!messages[name])return;document.documentElement.dataset.season=name;weather?.setSeason(name);$$('[data-season]').forEach(b=>{const active=b.dataset.season===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});$('#seasonDescription').textContent=messages[name];try{localStorage.setItem('noticing-season',name)}catch(_){}}
    $$('[data-season]').forEach(b=>b.addEventListener('click',()=>applySeason(b.dataset.season)));applySeason(selected);
    const motion=$('#motionToggle');let playing=!reduced.matches;function updateMotion(){weather?.setEnabled(playing);motion.textContent=playing?'暂停动态 Ⅱ':'开启动态 ✳';motion.setAttribute('aria-pressed',String(playing))}
    motion.addEventListener('click',()=>{playing=!playing;updateMotion()});updateMotion();
    reduced.addEventListener?.('change',e=>{if(e.matches){playing=false;updateMotion()}});
  }

  function collagePhoto(i){return photos.find(p=>p.id===collageIDs[i])||photos[i]}
  function saveCollage(){try{localStorage.setItem('noticing-collage-v2',JSON.stringify({mode:collageMode,positions}))}catch(_){}}
  function loadCollage(){try{const v=JSON.parse(localStorage.getItem('noticing-collage-v2')||'null');if(v&&v.positions?.length===5&&v.positions.every(p=>[p.x,p.y,p.r].every(Number.isFinite))){positions=v.positions.map(p=>({x:clamp(p.x,10,90),y:clamp(p.y,14,86),r:clamp(p.r,-30,30)}));collageMode=v.mode||'custom'}}catch(_){}}
  function placeTile(i){const p=positions[i],tile=collageTiles[i];tile.style.left=p.x+'%';tile.style.top=p.y+'%';tile.style.setProperty('--rotate',p.r+'deg')}
  function updateLayouts(){$$('[data-layout]').forEach(b=>{const active=b.dataset.layout===collageMode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
  function layout(name){if(!collageLayouts[name])return;positions=collageLayouts[name].map(p=>({...p}));collageMode=name;collageTiles.forEach((_,i)=>placeTile(i));updateLayouts();saveCollage()}
  function initCollage(){
    const board=$('#collageBoard');loadCollage();
    for(let i=0;i<5;i++){
      const p=collagePhoto(i),tile=document.createElement('div');tile.className='collage-tile';tile.dataset.index=String(i);tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label',p.title+'；拖动位置或按方向键微调；按回车查看大图');
      const img=document.createElement('img');img.src=p.thumb||p.src;img.alt=p.alt||p.title;img.draggable=false;
      const caption=document.createElement('span');caption.textContent=String(i+1).padStart(2,'0')+' / '+p.title;tile.append(img,caption);
      tile.addEventListener('click',()=>{if(suppressClick)return;chooseFilter('all');const idx=filtered.findIndex(x=>x.id===p.id);if(idx>=0)openLightbox(idx)});
      tile.addEventListener('keydown',e=>{
        const offsets={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};
        if(offsets[e.key]){e.preventDefault();positions[i].x=clamp(positions[i].x+offsets[e.key][0],10,90);positions[i].y=clamp(positions[i].y+offsets[e.key][1],14,86);collageMode='custom';placeTile(i);updateLayouts();saveCollage()}
        else if(e.key==='Enter'||e.key===' '){e.preventDefault();tile.click()}
      });
      board.append(tile);collageTiles.push(tile);placeTile(i);
    }
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
    updateLayouts();
  }
  async function loadImage(src){const img=new Image();img.crossOrigin='anonymous';img.src=src;if(img.decode)await img.decode();else await new Promise((res,rej)=>{img.onload=res;img.onerror=rej});return img}
  function fillImage(ctx,img,x,y,w,h){const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight),iw=w/scale,ih=h/scale;ctx.drawImage(img,(img.naturalWidth-iw)/2,(img.naturalHeight-ih)/2,iw,ih,x,y,w,h)}
  async function exportCollage(){
    const btn=$('#collageExport');btn.disabled=true;btn.textContent='正在生成…';
    try{
      const images=await Promise.all(Array.from({length:5},(_,i)=>loadImage(collagePhoto(i).src)));
      const cvs=document.createElement('canvas');cvs.width=1800;cvs.height=1200;const ctx=cvs.getContext('2d');
      ctx.fillStyle='#f8f1e6';ctx.fillRect(0,0,1800,1200);ctx.strokeStyle='#dbcabc';ctx.strokeRect(25,25,1750,1150);
      ctx.fillStyle='#513b34';ctx.font='italic 76px Georgia';ctx.fillText('The Art of Noticing',88,114);ctx.font='20px Georgia';ctx.fillText('A COLLECTION OF LITTLE MOMENTS / SUNNY',92,153);
      for(let i=0;i<5;i++){
        const p=positions[i],img=images[i],x=p.x/100*1800,y=180+p.y/100*870,w=325,h=272;
        ctx.save();ctx.translate(x,y);ctx.rotate(p.r*Math.PI/180);ctx.shadowColor='#2c1d1959';ctx.shadowBlur=29;ctx.shadowOffsetY=15;
        ctx.fillStyle='#fffdfa';ctx.fillRect(-w/2-13,-h/2-13,w+26,h+66);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
        fillImage(ctx,img,-w/2,-h/2,w,h);ctx.fillStyle='#6b534a';ctx.font='19px Georgia';ctx.fillText(String(i+1).padStart(2,'0')+' / '+collagePhoto(i).title,-w/2+7,h/2+30);ctx.restore();
      }
      ctx.fillStyle='#a18575';ctx.font='italic 21px Georgia';ctx.fillText('Collecting moments, not milestones.',92,1142);
      const blob=await new Promise((resolve,reject)=>cvs.toBlob(b=>b?resolve(b):reject(Error('No export')),'image/png'));
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='the-art-of-noticing-collage.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),7000);toast('已生成你的私人拼贴海报');
    }catch(err){console.warn('Collage export',err);toast('导出失败，请确认所有图片都已加载完毕')}
    finally{btn.disabled=false;btn.textContent='导出拼贴 PNG ↗'}
  }

  // Optional persistent browser-only uploads: no server, credentials, or external provider.
  function dbOpen(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){reject(Error('IndexedDB unavailable'));return}const req=indexedDB.open('noticing-personal-photos',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function localRecords(){const db=await dbOpen();return new Promise((resolve,reject)=>{const req=db.transaction('photos','readonly').objectStore('photos').getAll();req.onsuccess=()=>{db.close();resolve(req.result)};req.onerror=()=>{db.close();reject(req.error)}})}
  async function saveRecord(data){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(data);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)}})}
  async function optimizeFile(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob(b=>b?resolve(b):reject(Error('Encoding failed')),'image/webp',.83)};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Invalid image'))};img.src=url})}
  async function hydratePhotos(){try{const rows=await localRecords();for(const row of rows){const url=URL.createObjectURL(row.blob);localURLs.push(url);imported.push({...row,src:url,thumb:url});}photos=[...originalPhotos,...imported];renderGallery()}catch(err){console.warn('Local photos disabled',err)}}
  function setupImport(){
    const picker=$('#photoPicker'),dialog=$('#importDialog'),preview=$('#importPreview');const queue=[];let selected=null,temporaryURL=null;
    function next(){if(temporaryURL){URL.revokeObjectURL(temporaryURL);temporaryURL=null}selected=queue.shift()||null;if(!selected)return;
      temporaryURL=URL.createObjectURL(selected);preview.src=temporaryURL;$('#importTitleInput').value=selected.name.replace(/\.[^.]+$/,'').slice(0,45);$('#importNoteInput').value='';$('#importCategory').value='landscapes';dialog.showModal();}
    $('#addPhotos').addEventListener('click',()=>picker.click());
    picker.addEventListener('change',()=>{const files=[...picker.files].filter(f=>f.type.startsWith('image/')).slice(0,12);queue.push(...files);picker.value='';if(!dialog.open)next()});
    dialog.addEventListener('close',async()=>{
      const result=dialog.returnValue,file=selected;selected=null;
      if(result==='confirm'&&file){
        try{const blob=await optimizeFile(file);const id='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);const row={id,blob,title:$('#importTitleInput').value.trim()||'一张新照片',en:'A New Little Moment',series:$('#importCategory').value,season:'autumn',location:'我的私人收藏',note:$('#importNoteInput').value.trim(),alt:$('#importTitleInput').value.trim()||'私人照片'};
          await saveRecord(row);const url=URL.createObjectURL(blob);localURLs.push(url);imported.push({...row,src:url,thumb:url});photos=[...originalPhotos,...imported];chooseFilter('all');toast('已经收进你的浏览器私人画廊 ♡');
        }catch(err){console.warn('Photo import failed',err);toast('保存失败，可能是浏览器存储空间不足。')}}
      next();
    });
    $('#importSave').addEventListener('click',e=>{if(!$('#importTitleInput').value.trim()){e.preventDefault();$('#importTitleInput').focus()}});
    addEventListener('pagehide',()=>localURLs.forEach(u=>URL.revokeObjectURL(u)),{once:true});
  }
  function init(){handleMissingImages();reveal();setupFilters();setupLightbox();setupSeasons();initCollage();setupImport();hydratePhotos()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
