/**
 * Dependency-free runtime smoke test.
 * Catches silent gallery failures such as calling .forEach on querySelector().
 * Run: node scripts/check_gallery_runtime.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../data/photos.json',import.meta.url),'utf8'));
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
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
assert.equal(get('#momentPhotoSelect').children.length,catalog.photos.length,'The reassembly effect must offer all photos');
assert.ok(get('#momentStage'),'The cinematic reassembly area must be present');
const ids=[...app.matchAll(/\$\('#([a-zA-Z][\w-]+)'\)/g)].map(match=>match[1]);
const missing=[...new Set(ids)].filter(id=>!html.includes('id="'+id+'"'));
assert.deepEqual(missing,[],'All statically addressed HTML IDs must exist');
console.log('Gallery runtime smoke test passed: '+catalog.photos.length+' photographs, map, seasons, scrapbook and tile reveal.');
