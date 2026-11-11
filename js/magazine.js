/* The Art of Noticing: rearrangeable, exportable photo collage.
   Everything runs locally; no tracking, services or image uploads. */
(() => {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];
  const board = $('#collageBoard');
  const status = $('#studioStatus');
  const photos = (Array.isArray(window.GOLDEN_PHOTOS) ? window.GOLDEN_PHOTOS : []).slice(0, 5);
  if (!board || !photos.length) return;
  const KEY = 'art-of-noticing-collage-v1';
  const layouts = {
    editorial: [{x:20,y:32,r:-12},{x:49,y:35,r:8},{x:78,y:29,r:-8},{x:34,y:71,r:9},{x:68,y:71,r:-6}],
    constellation: [{x:50,y:20,r:-4},{x:23,y:43,r:-15},{x:77,y:43,r:12},{x:35,y:77,r:6},{x:65,y:77,r:-11}],
    ribbon: [{x:15,y:48,r:-14},{x:33,y:43,r:9},{x:51,y:52,r:-5},{x:69,y:43,r:12},{x:85,y:48,r:-11}]
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  let mode = 'editorial';
  let positions = layouts.editorial.map(p => ({...p}));
  let dragging = null;
  let blockClick = false;
  let messageTimeout = null;
  const tiles = [];

  function announce(message) {
    if (!status) return;
    status.textContent = message;
    clearTimeout(messageTimeout);
    messageTimeout = setTimeout(() => {
      status.textContent = '排版只保存在这个浏览器，不会自动同步到 GitHub。';
    }, 4600);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({mode, positions})); } catch (_) {}
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || !Array.isArray(saved.positions) || saved.positions.length !== photos.length) return;
      if (!saved.positions.every(p => [p.x,p.y,p.r].every(Number.isFinite))) return;
      positions = saved.positions.map(p => ({x:clamp(p.x,10,90),y:clamp(p.y,14,86),r:clamp(p.r,-30,30)}));
      mode = layouts[saved.mode] ? saved.mode : 'custom';
    } catch (_) {}
  }
  function place(i) {
    const p = positions[i], tile = tiles[i];
    if (!p || !tile) return;
    tile.style.left = p.x + '%';
    tile.style.top = p.y + '%';
    tile.style.setProperty('--rotation', p.r + 'deg');
  }
  function updateButtons() {
    $$('[data-collage-layout]').forEach(b => {
      const on = b.dataset.collageLayout === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  function setLayout(name, silent = false) {
    if (!layouts[name]) return;
    positions = layouts[name].map(p => ({...p}));
    mode = name; tiles.forEach((_,i) => place(i)); updateButtons(); save();
    if (!silent) announce('已切换拼贴排版，可以继续拖动每一张照片。');
  }
  function openOriginal(id) {
    const all = $('[data-filter="all"]');
    if (all && !all.classList.contains('active')) all.click();
    $('[data-open-id="' + id + '"]')?.click();
  }
  function createTiles() {
    photos.forEach((p,i) => {
      const tile = document.createElement('div');
      tile.className = 'collage-tile';
      tile.dataset.index = String(i);
      tile.tabIndex = 0;
      tile.setAttribute('role','button');
      tile.setAttribute('aria-label', p.title + '。拖动移动，方向键微调，回车查看大图。');
      const img = document.createElement('img');
      img.src = p.thumb || p.image; img.alt = p.alt || p.title;
      img.loading = 'lazy'; img.draggable = false;
      const caption = document.createElement('span');
      caption.className = 'collage-tile-caption';
      caption.textContent = String(i+1).padStart(2,'0') + ' / ' + p.title;
      tile.append(img,caption);
      tile.addEventListener('click', () => { if (!blockClick) openOriginal(p.id); });
      tile.addEventListener('keydown', e => {
        const moves = {ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};
        if (moves[e.key]) {
          e.preventDefault();
          const [dx,dy] = moves[e.key];
          positions[i].x = clamp(positions[i].x+dx,10,90);
          positions[i].y = clamp(positions[i].y+dy,14,86);
          mode = 'custom';place(i);updateButtons();save();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();openOriginal(p.id);
        }
      });
      board.append(tile);tiles.push(tile);place(i);
    });
  }
  function makeDraggable() {
    board.addEventListener('pointerdown', e => {
      const tile = e.target.closest('.collage-tile');
      if (!tile || e.button !== 0) return;
      const i = Number(tile.dataset.index);
      const bounds = board.getBoundingClientRect();
      dragging = {i,id:e.pointerId,sx:e.clientX,sy:e.clientY,x:positions[i].x,y:positions[i].y,w:bounds.width,h:bounds.height,moved:false};
      tile.classList.add('is-dragging');
      tile.setPointerCapture?.(e.pointerId);
    });
    board.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragging.id) return;
      const d = dragging, dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
      if (!d.moved) return;
      e.preventDefault();
      positions[d.i].x = clamp(d.x+dx/Math.max(d.w,1)*100,10,90);
      positions[d.i].y = clamp(d.y+dy/Math.max(d.h,1)*100,14,86);
      place(d.i);
    });
    function finish(e) {
      if (!dragging || e.pointerId !== dragging.id) return;
      const d = dragging;tiles[d.i].classList.remove('is-dragging');dragging=null;
      if (d.moved) {
        blockClick = true;setTimeout(() => { blockClick = false; },200);
        mode = 'custom';updateButtons();save();
        announce('已保存你刚刚调整的拼贴位置。');
      }
    }
    board.addEventListener('pointerup',finish);
    board.addEventListener('pointercancel',finish);
    window.addEventListener('blur',() => {
      if (!dragging) return;
      tiles[dragging.i].classList.remove('is-dragging');dragging=null;save();
    });
  }
  function shuffle() {
    const old = positions.map(p=>({...p})).sort(() => Math.random()-.5);
    positions = old.map(p => ({
      x:clamp(p.x+(Math.random()-.5)*15,13,87),
      y:clamp(p.y+(Math.random()-.5)*15,17,83),
      r:(Math.random()-.5)*28
    }));
    mode='custom';tiles.forEach((_,i)=>place(i));updateButtons();save();
    announce('照片重新洗牌了。偶然之间，也有新的构图。');
  }
  async function getPhoto(src) {
    const img = new Image();img.src = src;
    if (img.decode) await img.decode();
    else await new Promise((resolve,reject) => {img.onload=resolve;img.onerror=reject;});
    return img;
  }
  function crop(ctx,img,x,y,w,h) {
    const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
    const sw=w/scale,sh=h/scale;
    ctx.drawImage(img,(img.naturalWidth-sw)/2,(img.naturalHeight-sh)/2,sw,sh,x,y,w,h);
  }
  async function exportPNG() {
    const btn=$('#collageExport');
    if (!btn) return;
    btn.disabled=true;btn.textContent='正在装订这页…';
    try {
      const images=await Promise.all(photos.map(p=>getPhoto(p.image)));
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1080;
      const ctx=canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas');
      ctx.fillStyle='#f5ede1';ctx.fillRect(0,0,1600,1080);
      ctx.strokeStyle='#d3c3b0';ctx.lineWidth=2;ctx.strokeRect(30,30,1540,1020);
      ctx.fillStyle='#45332c';ctx.font='italic 62px Georgia, serif';ctx.fillText('The Art of Noticing',83,112);
      ctx.font='22px Georgia, serif';ctx.fillText('A PERSONAL PHOTO JOURNAL   /   ISSUE 001',86,154);
      ctx.textAlign='right';ctx.fillText('BEIJING  ·  2026',1510,110);ctx.textAlign='left';
      images.forEach((img,i)=>{
        const p=positions[i],x=1600*p.x/100,y=180+780*p.y/100,w=295,h=237;
        ctx.save();ctx.translate(x,y);ctx.rotate(p.r*Math.PI/180);
        ctx.shadowColor='rgba(51,37,29,.23)';ctx.shadowBlur=25;ctx.shadowOffsetY=13;
        ctx.fillStyle='#fffdfa';ctx.fillRect(-w/2-15,-h/2-15,w+30,h+67);
        ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
        crop(ctx,img,-w/2,-h/2,w,h);
        ctx.fillStyle='#4d3935';ctx.font='20px Georgia, serif';
        ctx.fillText(String(i+1).padStart(2,'0') + ' / ' + photos[i].title.slice(0,11),-w/2+4,h/2+30);
        ctx.restore();
      });
      ctx.fillStyle='#816e60';ctx.font='italic 22px Georgia, serif';
      ctx.fillText('Collecting little pieces of ordinary magic.',86,1022);
      ctx.textAlign='right';ctx.fillText('© PERSONAL PHOTO JOURNAL',1510,1022);
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG failed')),'image/png'));
      const url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='the-art-of-noticing-collage.png';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),10000);
      announce('PNG 拼贴海报已生成。');
    } catch (error) {
      console.warn('Export failed',error);
      announce('生成海报失败，请检查照片是否正常加载后重试。');
    } finally {btn.disabled=false;btn.textContent='下载这页海报 ↗';}
  }
  function setupSeasons() {
    const all=Array.isArray(window.GOLDEN_PHOTOS)?window.GOLDEN_PHOTOS:[];
    $$('[data-season-count]').forEach(el=>{
      const n=all.filter(p=>(p.season||'autumn')===el.dataset.seasonCount).length;
      el.textContent=n?String(n).padStart(2,'0')+' FRAMES':'WAITING FOR STORIES';
    });
    $$('[data-journal-season]').forEach(el=>el.addEventListener('click',()=>{
      $('[data-season-btn="'+el.dataset.journalSeason+'"]')?.click();
      $('#seasons')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    }));
  }
  function init() {
    createTiles();restore();tiles.forEach((_,i)=>place(i));
    updateButtons();makeDraggable();setupSeasons();
    $$('[data-collage-layout]').forEach(btn=>btn.addEventListener('click',()=>setLayout(btn.dataset.collageLayout)));
    $('#collageShuffle')?.addEventListener('click',shuffle);
    $('#collageReset')?.addEventListener('click',()=>{
      try {localStorage.removeItem(KEY);} catch (_) {}
      setLayout('editorial',true);announce('恢复了最初的杂志散页排版。');
    });
    $('#collageExport')?.addEventListener('click',exportPNG);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();