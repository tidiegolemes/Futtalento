import {ATHLETES,calculateIndex} from './score.js';
const fmt=new Intl.NumberFormat('pt-BR');
const athleteNames={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
const containers=[...document.querySelectorAll('[data-ft-index]')];
if(containers.length){
 const labels={followers:'Seguidores',reach28d:'Alcance · 28 dias',interactions28d:'Interações · 28 dias',growth28dPct:'Crescimento · 28 dias',titlesVerified:'Títulos documentados',competitionsVerified:'Competições documentadas',clubMonths:'Meses de clube',partnersActive:'Apoiadores ativos',deliveriesCompleted:'Entregas realizadas'};
 const e=(tag,cl,text)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=text;return n};
 function render(node,data){
  const v=data.index||{},m=data.metrics||{};
  node.replaceChildren();
  const compact=node.dataset.ftIndexStyle==='compact';
  const main=e('div',compact?'ft-score-compact':'ft-score-widget');
  const title=e('div','ft-score-heading');
  const heading=e(compact?'span':'h3','',compact?'Força FutTalento':'Índice FutTalento');
  const state=e('span','ft-score-state',v.value===null?'Em formação':v.level);
  title.append(heading,state);main.append(title);
  if(v.value!==null&&Number.isFinite(v.value)){
   const meter=e('div','ft-score-meter');
   const score=e('strong','ft-score-number',String(v.value));
   score.append(e('small','',' / 100'));
   const bar=e('div','ft-score-progress');
   const fill=e('div','ft-score-fill');fill.style.width=Math.max(0,Math.min(100,v.value))+'%';bar.append(fill);
   meter.append(score,bar);main.append(meter);
  }else{
   main.append(e('p','ft-score-empty',compact?'Coletando audiência e resultados verificados.':'O perfil ainda não possui métricas suficientes para um índice confiável.'));
  }
  if(!compact){
   const signals=e('div','ft-score-signals');
   const records=[['Audiência digital',v.components?.audience,'55'],['Jornada esportiva',v.components?.sports,'25'],['Parcerias e entregas',v.components?.partnership,'20']];
   records.forEach(([label,part,weight])=>{
    const item=e('div','ft-score-signal');item.append(e('span','',label),e('strong','',part?part.score+' / '+weight:'A integrar'));signals.append(item);
   });
   main.append(signals);
   const counts=e('div','ft-score-facts');
   const measured=[['followers',''],['reach28d',''],['partnersActive','']].filter(([k])=>Number.isFinite(m[k]));
   measured.forEach(([k])=>{const n=e('span','ft-score-fact');n.append(e('strong','',fmt.format(m[k])),e('small','',labels[k]));counts.append(n)});
   if(measured.length)main.append(counts);
   main.append(e('p','ft-score-foot','Pontuação proprietária baseada em registros informados e autorizados. Não equivale a previsão de alcance, valor de mercado ou desempenho esportivo. '+(v.observedAt?'Atualizado em '+v.observedAt.split('-').reverse().join('/')+'.':'')));
  }else{
   const foot=e('small','ft-score-coverage',v.value===null?'Sem nota até validação da audiência.':'Dados revisados · '+v.coverage+'% da fórmula');
   main.append(foot);
  }
  node.append(main);
 }
 async function load(){
  try{
   const data=await fetch('/api/indice-atletas?atleta=todos',{credentials:'omit',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('offline');return r.json()});
   for(const node of containers){
    const id=node.dataset.ftIndex;
    const athlete=data.athletes?.find(x=>x.athlete===id);
    if(ATHLETES.includes(id)&&athlete)render(node,athlete);
   }
  }catch(e){
   for(const node of containers){node.replaceChildren(eText());}
  }
 }
 function eText(){return e('span','ft-score-unavailable','Índice em atualização.')}
 load();
}
