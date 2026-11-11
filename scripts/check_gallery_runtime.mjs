/**
 * Dependency-free runtime smoke test.
 * Catches silent gallery failures such as calling .forEach on querySelector().
 * Run: node scripts/check_gallery_runtime.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../data/photos.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const embeddedCode=readFileSync(new URL('../data/embedded_photos.js',import.meta.url),'utf8');
const imageContext={window:{},document:{addEventListener(){}}};
runInNewContext(embeddedCode,imageContext,{filename:'data/embedded_photos.js',timeout:3000});
const embedded=imageContext.window.NOTICING_EMBEDDED||{};
for(const photo of catalog.photos){
  for(const path of [photo.src,photo.thumb].filter(Boolean)){
    const fileExists=existsSync(new URL('../'+path,import.meta.url));
    assert.ok(fileExists||typeof embedded[path]==='string'&&embedded[path].startsWith('data:image/'),
      'Photo image must exist as a real file or an embedded fallback: '+photo.id+' '+path);
  }
}
assert.ok(html.includes('css/editorial-v2.css'),'Editorial stylesheet must load');
assert.ok(html.includes('data/worldmap.js'),'Bundled world-map data must load');
assert.ok(!app.includes("class:'atlas-street'"),'City maps must not show invented streets');
assert.ok(html.includes('class="hero editorial-hero"'),'Photo-led cover must render');
assert.ok(html.includes('class="studio-disclosure"'),'Scrapbook must stay accessible on demand');

const elements=new Map();
const diagnostics=[];

class Element {
  constructor(tag='div'){
    this.tagName=tag.toUpperCase();
    this.children=[];
    this.attributes={};
    this.dataset={};
    this.style={setProperty(){}};
    this.classList={add(){},remove(){},toggle(){}};
    this.textContent='';
    this.value='';
    this.files=[];
    this.hidden=false;
  }
  addEventListener(name,fn){(this.listeners??={})[name]=fn}
  setAttribute(name,value){this.attributes[name]=String(value)}
  getAttribute(name){return this.attributes[name]??''}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=[...children]}
  querySelector(selector){return new Element(selector==='img'?'img':'div')}
  querySelectorAll(){return []}
  getContext(){return {setTransform(){},clearRect(){}}}
  getBoundingClientRect(){return {width:900,height:650}}
  scrollIntoView(){}
  showModal(){}
  close(){}
  focus(){}
  setPointerCapture(){}
}

const get=selector=>{
  if(!elements.has(selector))elements.set(selector,new Element(selector==='#seasonCanvas'?'canvas':'div'));
  return elements.get(selector);
};

let onReady;
const document={
  readyState:'loading',
  hidden:false,
  documentElement:{dataset:{},scrollHeight:1800},
  body:get('body'),
  querySelector:get,
  querySelectorAll:()=>[],
  createElement:tag=>new Element(tag),
  createElementNS:(_ns,tag)=>new Element(tag),
  addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')onReady=fn}
};
class PhotoImage {
  constructor(){this.naturalWidth=1200;this.naturalHeight=800;}
  set src(value){this._src=value;this.onload?.()}
  get src(){return this._src}
}
const environment={
  document,
  Image:PhotoImage,
  window:{PHOTO_JOURNAL:catalog,NOTICING_EMBEDDED:{},devicePixelRatio:1,addEventListener(){}},
  matchMedia:()=>({matches:true}),
  performance:{now:()=>0},
  requestAnimationFrame:()=>{},
  addEventListener:()=>{},
  innerWidth:1200,innerHeight:750,devicePixelRatio:1,
  localStorage:{getItem:()=>null,setItem:()=>{}},
  console:{
    error:(...parts)=>diagnostics.push('ERROR '+parts.map(String).join(' ')),
    warn:(...parts)=>diagnostics.push('WARN '+parts.map(String).join(' '))
  }
};

runInNewContext(app,environment,{filename:'js/app.js',timeout:3000});
assert.equal(typeof onReady,'function','DOMContentLoaded hook must be installed');
await onReady();
assert.deepEqual(diagnostics,[],'The app must initialize without runtime errors');
assert.equal(get('#photoWall').children.length,catalog.photos.length,'Every photo must appear in the gallery');
assert.ok(get('#footprintMap').children.length>0,'The interactive map must render');
assert.ok(get('#seasonPreview').children.length>0,'Season photos must render');
assert.equal(get('#collageBoard').children.length,5,'The scrapbook canvas must contain five tiles');
assert.ok(get('#collagePhotoPicker').children.length>=catalog.photos.length,'The scrapbook must offer all photos');
assert.ok(html.includes('class="still-feature-photo"'),'The Kunming Lake feature must be a static photograph');
assert.ok(!html.includes('id="momentTiles"'),'Animated tiles must be absent');
assert.ok(!html.includes('id="motionToggle"'),'Animated seasons must be absent');
assert.ok(!html.includes('id="lightboxPlay"'),'Autoplay must be absent');
assert.ok(!app.includes('requestAnimationFrame'),'Photo animations must be absent');
const ids=[...app.matchAll(/\$\('#([a-zA-Z][\w-]+)'\)/g)].map(match=>match[1]);
const missing=[...new Set(ids)].filter(id=>!html.includes('id="'+id+'"'));
assert.deepEqual(missing,[],'All statically addressed HTML IDs must exist');
console.log('Gallery runtime smoke test passed: '+catalog.photos.length+' static photographs, map, seasons and scrapbook.');
