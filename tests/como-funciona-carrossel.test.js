import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('atletas/index.html');
const script=read('atletas/como-funciona/como-funciona.js');

test('Explainer exposes four illustrated and sourced steps with fixed CTA and transparent claims',()=>{
 assert.match(html,/id="supportHowCarousel"/);
 assert.match(html,/id="supportHowTrack"/);
 assert.equal((html.match(/class="support-how-slide"/g)||[]).length,4);
 for(const asset of ['escolha-atleta.svg','criacao-campanha.svg','visibilidade.svg','resultados.svg']){
  assert.match(html,new RegExp(asset.replace('.','\\.')));
  assert.match(read('atletas/como-funciona/'+asset),/^<svg/);
 }
 assert.match(html,/Os? crescimento apresentado é ilustrativo|O crescimento apresentado é ilustrativo/);
 assert.match(html,/não são garantidos/);
 assert.match(html,/href="#explorar"/);
});

test('Original paid support, permuta, profiles and club filtering remain connected',()=>{
 assert.match(html,/id="ftInlineCheckout"/);
 assert.match(html,/id="ftBarterForm"/);
 assert.match(html,/id="talentRail"/);
 assert.match(html,/id="athleteSearch"/);
 assert.match(html,/data-athlete="lucas"/);
 assert.match(html,/data-athlete="ryan"/);
 assert.match(html,/data-athlete="thalles"/);
 assert.match(html,/src="apoio-inline.js"/);
 assert.match(html,/src="catalogo.js"/);
 assert.match(html,/src="\/atletas\/como-funciona\/como-funciona.js"/);
});

test('Controls support buttons, dots and keyboard without escaping carousel boundaries',()=>{
 const create=()=>{
  const events={};return {
   events,disabled:false,attributes:{},classList:{active:false,toggle(name,value){if(name==='is-active')this.active=value}},
   addEventListener(type,fn){events[type]=fn},setAttribute(name,value){this.attributes[name]=value},
   removeAttribute(name){delete this.attributes[name]}
  };
 };
 const slides=Array.from({length:4},create),dots=Array.from({length:4},create);
 const track={...create(),clientWidth:320,scrollLeft:0,querySelectorAll:()=>slides,
  scrollTo({left}){this.scrollLeft=left}};
 const root={...create(),querySelectorAll:()=>dots};
 const previous=create(),next=create(),counter=create();
 const byId={supportHowCarousel:root,supportHowTrack:track,supportHowPrev:previous,supportHowNext:next,supportHowCounter:counter};
 const document={hidden:false,getElementById:id=>byId[id]||null,addEventListener(){}};
 const window={matchMedia:()=>({matches:true}),addEventListener(){},clearInterval(){},
  requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){}};
 vm.runInNewContext(script,{document,window,IntersectionObserver:null});
 assert.equal(previous.disabled,true);
 assert.equal(counter.textContent,'1 / 4');
 next.events.click();
 assert.equal(counter.textContent,'2 / 4');
 assert.equal(track.scrollLeft,320);
 assert.equal(previous.disabled,false);
 dots[3].events.click();
 assert.equal(counter.textContent,'4 / 4');
 assert.equal(next.disabled,true);
 next.events.click();
 assert.equal(counter.textContent,'4 / 4');
 track.events.keydown({key:'Home',preventDefault(){}});
 assert.equal(counter.textContent,'1 / 4');
 assert.equal(previous.disabled,true);
});
