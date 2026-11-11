/**
 * Dependency-free browser-like smoke test for ambient seasonal particles.
 * It verifies that particles render, respond to season changes and can be
 * paused, while the photo gallery's static images stay untouched.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const js=readFileSync(new URL('../js/ambience.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html,/id="seasonCanvas"/,'Canvas needs to be present in HTML');
assert.match(html,/js\/ambience\.js/,'Ambient JS must be loaded');
assert.match(html,/data-ambience-toggle/,'Pause control must exist');
assert.match(html,/class="hero-photo-peek/,'Photo magazine collage needs preview pages');
assert.match(html,/id="momentReplay"/,'Click-to-play photo feature must exist');
assert.match(html,/class="studio-disclosure" open/,'Scrapbook must be open by default');
assert.ok(!js.includes('querySelectorAll(\'img\'') && !js.includes('img.src'),'Particle renderer may not alter photos');

function runScenario(reduced=false){
  const documentEvents={},windowEvents={},scheduled=[],mutations=[];
  const props={};
  const shapeCalls={drawn:0,cleared:0};
  const ctx={
    globalAlpha:1,
    setTransform(){},clearRect(){shapeCalls.cleared++;},
    save(){},restore(){},translate(){},rotate(){},
    beginPath(){},arc(){},fill(){shapeCalls.drawn++;},
    moveTo(){},bezierCurveTo(){},quadraticCurveTo(){},closePath(){}
  };
  const flags=new Set();
  const canvas={
    width:0,height:0,
    classList:{add:(s)=>flags.add(s),remove:(s)=>flags.delete(s)},
    getContext:()=>ctx
  };
  const controls=Array.from({length:2},()=>({
    attributes:{},listener:{},label:{textContent:''},
    setAttribute(k,v){this.attributes[k]=v},
    querySelector(){return this.label},
    addEventListener(k,fn){this.listener[k]=fn},
    click(){this.listener.click?.()}
  }));
  const labels={seasonAtmosphereLabel:{textContent:''}};
  const root={dataset:{season:'autumn'}};
  const doc={
    readyState:'loading',documentElement:root,hidden:false,
    getElementById:(id)=>id==='seasonCanvas'?canvas:labels[id]||null,
    querySelectorAll:(sel)=>sel==='[data-ambience-toggle]'?controls:[],
    addEventListener:(name,fn)=>{documentEvents[name]=fn}
  };
  const win={
    innerWidth:1100,innerHeight:740,devicePixelRatio:2,
    addEventListener:(name,fn)=>{windowEvents[name]=fn}
  };
  let nextFrame=1;
  const scope={
    document:doc,window:win,
    matchMedia:()=>({matches:reduced,addEventListener(){}}),
    localStorage:{getItem:()=>null,setItem(){}},
    MutationObserver:class{
      constructor(cb){mutations.push(cb)}
      observe(){}
    },
    requestAnimationFrame:(cb)=>{scheduled.push(cb);return nextFrame++},
    cancelAnimationFrame:()=>{},
    console:{warn(){}}
  };
  runInNewContext(js,scope,{filename:'js/ambience.js',timeout:4000});
  assert.equal(typeof documentEvents.DOMContentLoaded,'function','Initialization hook is registered');
  documentEvents.DOMContentLoaded();
  assert.ok(canvas.width>0 && canvas.height>0,'Canvas should be sized');
  assert.equal(controls[0].attributes['aria-pressed'],String(!reduced));
  assert.equal(flags.has('ambient-on'),!reduced);
  if(!reduced){
    assert.ok(scheduled.length>0,'Animation frame should be queued');
    scheduled.shift()(16.6);
    assert.ok(shapeCalls.drawn>0,'Shapes should actually be rendered');
  }
  root.dataset.season='winter';
  mutations[0]();
  assert.equal(labels.seasonAtmosphereLabel.textContent,'轻柔雪花');
  controls[0].click();
  assert.equal(flags.has('ambient-on'),!!reduced,'Toggle should invert initial state');
  assert.equal(controls[1].attributes['aria-pressed'],String(!!reduced),'Controls must stay synced');
  controls[1].click();
  assert.equal(flags.has('ambient-on'),!reduced,'Second toggle restores initial state');
  return {reduced,drawn:shapeCalls.drawn};
}
const normal=runScenario(false);
const reduced=runScenario(true);
console.log('Ambient smoke test passed:',normal,reduced);
