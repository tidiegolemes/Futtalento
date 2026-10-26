import {ATHLETES,calculateIndex} from './score.js';
const fmt=new Intl.NumberFormat('pt-BR');
const athleteNames={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
const containers=[...document.querySelectorAll('[data-ft-index]')];
if(containers.length){
 const labels={followers:'Seguidores',reach28d:'Alcance · 28 dias',interactions28d:'Interações · 28 dias',growth28dPct:'Crescimento · 28 dias',titlesVerified:'Títulos documentados',competitionsVerified:'Competições documentadas',clubMonths:'Meses de clube',partnersActive:'Apoiadores ativos',deliveriesCompleted:'Entregas realizadas'};
 const e=(tag,cl,text)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(text!==undefined)n.textContent=text;return n};
 function render(node,data){
  const v=data.potential||{},m=data.metrics||{},evidence=data.evidence;
  node.replaceChildren();
  const compact=node.dataset.ftIndexStyle==='compact';
  const main=e('div',compact?'ft-score-compact':'ft-score-widget');
  const title=e('div','ft-score-heading');
  const heading=e(compact?'span':'h3','',compact?'Potencial de Patrocínio':'Potencial de Patrocínio · FutTalento 2.0');
  const state=e('span','ft-score-state',v.value===null?'Em validação':'Validado');
  title.append(heading,state);main.append(title);
  if(v.status==='validated'&&v.value!==null&&Number.isFinite(v.value)){
   const meter=e('div','ft-score-meter');
   const score=e('strong','ft-score-number',String(v.value));
   score.append(e('small','',' / 100'));
   const bar=e('div','ft-score-progress');
   const fill=e('div','ft-score-fill');fill.style.width=Math.max(0,Math.min(100,v.value))+'%';bar.append(fill);
   meter.append(score,bar);main.append(meter);
  }else{
   main.append(e('p','ft-score-empty',compact?'Potencial 2.0 em validação · aguardando dados oficiais.':'Potencial de patrocínio em validação. Ainda precisamos de Insights oficiais, histórico revisado e autorização para comparação.'));
  }
  const sportsSources={
    lucas:'https://www.lucasazambuja.com.br/',
    ryan:'https://www.futtalento.com.br/atletas/ryan/',
    thalles:'https://thallessilvino.com.br/'
  };
  if(evidence?.athlete===data.athlete&&evidence?.source===sportsSources[data.athlete]&&
     Number.isInteger(evidence.sports?.points)&&evidence.sports.points>=0&&evidence.sports.points<=25){
    const partial=e('div',compact?'ft-evidence-partial ft-evidence-mini':'ft-evidence-partial');
    const normalized=Math.round(evidence.sports.points*100/25);
    const points=e('strong','ft-evidence-score','Nota esportiva: '+normalized+' / 100');
    points.title=evidence.sports.points+' de 25 pontos do componente esportivo — não é a nota geral';
    const counts=e('span','ft-evidence-counts',
      [Number.isInteger(evidence.sports.titlesDocumented)?evidence.sports.titlesDocumented+' título(s) documentado(s)':null,
       Number.isInteger(evidence.sports.competitionsDocumented)?evidence.sports.competitionsDocumented+' competição(ões) documentada(s)':null,
       Number.isInteger(evidence.sports.clubMonthsDocumented)?evidence.sports.clubMonthsDocumented+' meses de clube (mínimo documentado)':null].filter(Boolean).join(' · '));
    const sourceLabel=data.athlete==='ryan'?'acervo FutTalento':'site do atleta';
    const attribution=e('small','ft-evidence-note','Fonte: '+sourceLabel+' · sem validação independente da competição'+
      (evidence.stale?' · atualização pendente':''));
    partial.append(points,e('small','ft-evidence-note','Equivale a '+evidence.sports.points+' / 25 pontos esportivos. Nota geral pendente de outros dados.'));
    if(counts.textContent)partial.append(counts);
    partial.append(attribution);
    if(!compact){
      const link=e('a','ft-evidence-link','Consultar fonte ↗');
      link.href=data.athlete==='ryan'?sportsSources.ryan+'#jornada':sportsSources[data.athlete]+'#conquistas';
      link.target='_blank';link.rel='noopener noreferrer';
      partial.append(link);
    }
    main.append(partial);
  }
  if(!compact){
   const signals=e('div','ft-score-signals');
   const records=[['Audiência e alcance',v.components?.audience,'35'],['Engajamento e qualidade',v.components?.engagement,'30'],['Trajetória esportiva',v.components?.sports,'20'],['Ativação comercial',v.components?.activation,'15']];
   records.forEach(([label,part,weight])=>{
    const item=e('div','ft-score-signal');item.append(e('span','',label),e('strong','',part?.complete?part.score+' / '+weight:'A integrar'));signals.append(item);
   });
   main.append(signals);
   const counts=e('div','ft-score-facts');
   const measured=[['followers',''],['reach28d',''],['partnersActive','']].filter(([k])=>Number.isFinite(m[k]));
   measured.forEach(([k])=>{const n=e('span','ft-score-fact');n.append(e('strong','',fmt.format(m[k])),e('small','',labels[k]));counts.append(n)});
   if(measured.length)main.append(counts);
   main.append(e('p','ft-score-foot','Índice 2.0 usa audiência e engajamento autenticados e registros revisados. Não equivale a previsão de vendas, valor de mercado ou habilidade técnica. '+(v.observedAt?'Atualizado em '+v.observedAt.split('-').reverse().join('/')+'.':'')));
  }else{
   const foot=e('small','ft-score-coverage',v.value===null?'Potencial sem nota até validação das fontes.':'Índice 2.0 validado · '+v.coverage+'% de cobertura');
   main.append(foot);
  }
  node.append(main);
 }
 async function load(){
  try{
   const data=await fetch('/api/captacao-lead?indice=1&atleta=todos',{credentials:'omit',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('offline');return r.json()});
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
