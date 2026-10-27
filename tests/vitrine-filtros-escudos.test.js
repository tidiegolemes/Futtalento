import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../atletas/catalogo.js',import.meta.url),'utf8');
function setup(query=''){
 const node=(dataset={})=>({
  dataset,hidden:false,value:'',textContent:'',attributes:{},listeners:{},
  classList:{toggle(){}},
  addEventListener(event,listener){this.listeners[event]=listener},
  setAttribute(key,value){this.attributes[key]=value},
  querySelector(){return this.message??null},
  message:{textContent:''}
 });
 const chips=['todos','internacional','gremio','cruzeiro-rs','juventude'].map(club=>node({club}));
 const athletes=['lucas','ryan','thalles'];
 const cards=[
  node({clubs:'gremio',keywords:'lucas azambuja grêmio fbpa'}),
  node({clubs:'cruzeiro-rs',keywords:'ryan coelho cruzeiro-rs'}),
  node({clubs:'juventude',keywords:'thalles silvino juventude'})
 ];
 const search=node(),rail=node(),count=node(),empty=node(),reset=node();
 reset.hidden=true;
 const ids={talentRail:rail,athleteSearch:search,resultCount:count,emptyResults:empty,resetFilters:reset,emptyReset:node()};
 const document={
  getElementById:id=>ids[id]??null,
  querySelectorAll:s=>s==='.quick-chip[data-club]'?chips:s==='.talent-card[data-athlete]'?cards:[]
 };
 const history=[];
 const url='https://www.futtalento.com.br/atletas/?utm_source=test'+query;
 const context={document,window:{addEventListener(){},history:{replaceState:(a,b,v)=>history.push(v)}},
  location:{href:url,search:new URL(url).search},localStorage:{getItem:()=> 'denied'},
  URL,URLSearchParams};
 vm.runInNewContext(source,context,{filename:'atletas/catalogo.js'});
 const visible=()=>cards.flatMap((c,i)=>c.hidden?[]:[athletes[i]]);
 const pressed=()=>chips.filter(c=>c.attributes['aria-pressed']==='true').map(c=>c.dataset.club);
 return {chips,search,reset,empty,count,visible,pressed,history};
}

test('default page shows all three athletes without superfluous clear filter button',()=>{
 const ui=setup();
 assert.deepEqual(ui.visible(),['lucas','ryan','thalles']);
 assert.deepEqual(ui.pressed(),['todos']);
 assert.equal(ui.reset.hidden,true);
});
test('crest button filters athlete and creates shareable URL preserving campaign parameters',()=>{
 const ui=setup();
 ui.chips[2].listeners.click();
 assert.deepEqual(ui.visible(),['lucas']);
 assert.deepEqual(ui.pressed(),['gremio']);
 assert.equal(ui.count.textContent,'1 talento encontrado');
 assert.match(ui.history.at(-1),/utm_source=test&clube=gremio/);
});
test('search combines with selected club and works with accents',()=>{
 const ui=setup();
 ui.search.value='gremio';ui.search.listeners.input();
 assert.deepEqual(ui.visible(),['lucas']);
 ui.chips[4].listeners.click();
 assert.deepEqual(ui.visible(),[]);
 assert.equal(ui.empty.hidden,false);
});
test('Internacional filter deliberately returns informative empty state for no registered athlete',()=>{
 const ui=setup();
 ui.chips[1].listeners.click();
 assert.deepEqual(ui.visible(),[]);
 assert.match(ui.empty.message.textContent,/Internacional/);
});
test('reset clears search and club and hides its own button',()=>{
 const ui=setup('&clube=gremio');
 assert.deepEqual(ui.visible(),['lucas']);
 ui.search.value='thalles';ui.search.listeners.input();
 assert.deepEqual(ui.visible(),[]);
 ui.reset.listeners.click();
 assert.deepEqual(ui.visible(),['lucas','ryan','thalles']);
 assert.equal(ui.search.value,'');
 assert.equal(ui.reset.hidden,true);
 assert.match(ui.history.at(-1),/utm_source=test$/);
});
test('query parameter pre-selects Cruzeiro RS',()=>{
 const ui=setup('&clube=cruzeiro-rs');
 assert.deepEqual(ui.visible(),['ryan']);
 assert.deepEqual(ui.pressed(),['cruzeiro-rs']);
});
