import {getReelStats} from './reels-metrics.js';
const cards=[...document.querySelectorAll('#talentRail .talent-card[data-athlete]')];
const FACT_NODE=document.getElementById('ftAthleteFacts');
let facts={};try{facts=JSON.parse(FACT_NODE?.textContent||'{}')}catch{}
const elt=(tag,cls,txt)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=String(txt);
 return node;
};
const attach=(parent,...children)=>{parent.append(...children);return parent};
const shortName=(name)=>String(name||'').split(' ')[0]||'atleta';
const tag=(symbol,title)=>attach(elt('span','ft-r-strength'),elt('span','ft-r-strength-icon',symbol),elt('span','',title));
const metric=(symbol,title,key,placeholder='A validar')=>{
 const cell=elt('div','ft-r-metric');
 attach(cell,elt('span','ft-r-metric-icon',symbol));
 const body=elt('span','ft-r-metric-body');
 attach(body,elt('small','',title),elt('strong','ft-r-metric-number',placeholder));
 body.querySelector('strong').dataset.ftReelMetric=key;
 cell.append(body);
 return cell;
};
function safeSocial(parent,record,label){
 const data=(record.socials||[]).find(s=>s.label===label&&/^https:\/\//.test(s.url));
 if(!data)return;
 const a=elt('a','ft-r-social-link',label+' ↗');
 a.href=data.url;a.target='_blank';a.rel='noopener noreferrer';
 parent.append(a);
}
function makeCard(card){
 const athlete=card.dataset.athlete,record=facts[athlete];
 const photo=card.querySelector('.talent-poster'),info=card.querySelector('.talent-card-info');
 const originalImage=photo?.querySelector(':scope > img');
 if(!record||!photo||!info||!originalImage)return;
 const currentHeading=info.querySelector('.talent-topline h3');
 if(currentHeading?.id)currentHeading.id='athlete-original-'+athlete;
 const reel=elt('div','ft-r-stage');
 reel.tabIndex=0;
 reel.setAttribute('aria-label','Carrossel de '+record.name+'. Use as setas ou deslize para navegar.');
 reel.setAttribute('aria-roledescription','carrossel');
 const track=elt('div','ft-r-track');
 reel.append(track);
 photo.classList.add('ft-r-slide');
 photo.setAttribute('aria-label','1 de 2 · Foto e trajetória de '+record.name);
 photo.setAttribute('aria-roledescription','slide');
 // Preserve the original photo <img> and link for the inline checkout and profile.
 const shade=elt('div','ft-r-shade');
 const top=elt('div','ft-r-brandline');
 const brand=elt('span','ft-r-brand','✦ FUTTALENTO');
 const upper=elt('span','ft-r-brand-kicker','TALENTOS EM EVOLUÇÃO');
 attach(top,brand,upper);
 const crest=photo.querySelector('.talent-crest');
 if(crest)crest.classList.add('ft-r-original-crest');
 const badge=elt('div','ft-r-rating');
 attach(badge,elt('span','ft-r-rating-label','ÍNDICE FUTTALENTO'),
  elt('strong','ft-r-rating-value','—'),elt('small','ft-r-rating-sub','Em formação'));
 const details=elt('div','ft-r-hero-details');
 attach(details,elt('span','ft-r-eyebrow','A jornada começa aqui'),
  elt('h3','ft-r-athlete-name',record.name),
  elt('p','ft-r-athlete-meta',record.club+' · '+record.category),
  elt('span','ft-r-position',record.position));
 details.querySelector('h3').id='athlete-title-'+athlete;
 const highlight=elt('div','ft-r-highlight');
 attach(highlight,elt('span','ft-r-highlight-icon','★'),
  elt('p','',card.querySelector('.talent-one-fact')?.textContent?.trim()||record.milestones?.[0]?.title||'História em construção'));
 const factsPanel=elt('div','ft-r-hero-facts');
 attach(factsPanel,metric('🏆','Títulos','titles'),metric('✦','Competições','competitions'),
  metric('⚡','Nota esportiva','sports','Em formação'));
 photo.append(shade,top,badge,details,highlight,factsPanel);
 // Second slide: real public metrics, with unanswered fields visibly pending.
 const slide=elt('section','ft-r-slide ft-r-slide-impact');
 slide.setAttribute('aria-roledescription','slide');
 slide.setAttribute('aria-label','2 de 2 · Audiência e potencial de '+record.name);
 const bg=elt('img','ft-r-impact-photo');
 bg.src=originalImage.getAttribute('src');bg.alt='';bg.loading='lazy';bg.decoding='async';
 const fallback=originalImage.dataset.fallback;
 if(fallback)bg.addEventListener('error',()=>{if(bg.src!==new URL(fallback,location.href).href)bg.src=fallback},{once:true});
 const head=elt('div','ft-r-impact-head');
 attach(head,elt('span','ft-r-brand','✦ FUTTALENTO'),
  elt('span','ft-r-impact-kicker','2 / 2  ·  AUDIÊNCIA E POTENCIAL'));
 const hero=elt('div','ft-r-impact-hero');
 attach(hero,elt('span','ft-r-impact-pre','POTENCIAL DE PATROCÍNIO'),
  elt('strong','ft-r-impact-title',shortName(record.name)),
  elt('span','ft-r-impact-sub',record.club+' · '+record.category));
 const impactBadge=elt('div','ft-r-impact-badge');
 attach(impactBadge,elt('span','','POTENCIAL'),elt('strong','ft-r-impact-value','—'),elt('small','ft-r-impact-note','Em validação'));
 hero.append(impactBadge);
 const detail=elt('div','ft-r-impact-data');
 const subtitle=elt('p','ft-r-data-eyebrow','NÚMEROS E CANAIS');
 const grid=elt('div','ft-r-impact-metrics');
 attach(grid,metric('◎','Instagram · seguidores','followers'),
  metric('↗','Alcance · 28 dias','reach'),metric('♪','TikTok','tiktok','Métricas pendentes'),
  metric('◉','Site','site','Acervo online'));
 const strength=elt('div','ft-r-strengths');
 attach(strength,elt('strong','ft-r-section-title','✦ Pontos da trajetória'));
 const tags=elt('div','ft-r-strength-tags');
 attach(tags,tag('⚽',record.position),tag('🏆',record.milestones?.[0]?.title||'Histórico esportivo'),
  tag('↗','Canais para acompanhar'));
 strength.append(tags);
 const pitch=elt('div','ft-r-sponsor-pitch');
 attach(pitch,elt('strong','','APOIE ESSA HISTÓRIA'),
  elt('p','','Acompanhe a evolução do atleta e participe de projetos de conteúdo com gestão da EyAgência.'));
 const social=elt('div','ft-r-socials');
 safeSocial(social,record,'Instagram');safeSocial(social,record,'TikTok');
 const source=elt('small','ft-r-evidence-note','Dados não confirmados permanecem em validação. Sem previsão de resultados.');
 attach(detail,subtitle,grid,strength,pitch,social,source);
 slide.append(bg,head,hero,detail);
 track.append(photo,slide);
 const nav=elt('div','ft-r-navigation');
 const previous=elt('button','ft-r-arrow','‹');previous.type='button';previous.setAttribute('aria-label','Slide anterior');
 const dots=elt('div','ft-r-dots');dots.setAttribute('aria-label','Selecionar slide');
 const buttons=[0,1].map((value)=>{
  const b=elt('button','ft-r-dot');
  b.type='button';b.setAttribute('aria-label','Mostrar slide '+(value+1)+' de 2');
  b.addEventListener('click',()=>go(value));dots.append(b);return b;
 });
 const counter=elt('span','ft-r-counter','1 / 2');
 const next=elt('button','ft-r-arrow','›');next.type='button';next.setAttribute('aria-label','Próximo slide');
 attach(nav,previous,dots,counter,next);
 reel.append(nav);
 card.insertBefore(reel,info);
 info.classList.add('ft-r-footer');
 card.classList.add('ft-reel-card');
 const scoreNote=elt('p','ft-r-footer-note','Arraste para conhecer o potencial deste atleta.');
 info.insertBefore(scoreNote,info.querySelector('.talent-bottomline'));
// Realce de pontuação com estrelas PROPORCIONAIS ao índice esportivo documentado.
// Não representa avaliações de usuários, reputação pública ou nota geral da plataforma.
 const spotlight=elt('section','ft-r-score-spotlight');
 spotlight.setAttribute('aria-label','Nota esportiva documentada; não são avaliações de usuários');
 const topLine=elt('div','ft-r-spotlight-head');
 topLine.append(elt('span','ft-r-spotlight-label','✦ POTENCIAL DE PATROCÍNIO'),
  elt('span','ft-r-spotlight-source','Índice FutTalento 2.0'));
 const mainLine=elt('div','ft-r-spotlight-content');
 const starsBox=elt('div','ft-r-spotlight-stars');
 starsBox.setAttribute('aria-hidden','true');
 starsBox.append(elt('span','ft-r-spotlight-stars-empty','★★★★★'));
 const starsFill=elt('span','ft-r-spotlight-stars-fill');
 starsFill.textContent='★★★★★';
 starsBox.append(starsFill);
 const scoreNumber=elt('div','ft-r-spotlight-score');
 scoreNumber.append(elt('strong','ft-r-spotlight-value','—'),
  elt('span','ft-r-spotlight-max','/100'));
 mainLine.append(starsBox,scoreNumber);
 const spotFoot=elt('p','ft-r-spotlight-foot','Aguardando alcance e engajamento da Meta oficial; estrelas são apenas uma escala ilustrativa, não avaliações de pessoas.');
 spotlight.append(topLine,mainLine,spotFoot);
 info.insertBefore(spotlight,scoreNote);

 const explain=elt('details','ft-r-score-details');
 explain.append(elt('summary','','Entenda a pontuação esportiva'));
 const scoreBody=elt('div','ft-r-score-body');
 explain.append(scoreBody);
 info.insertBefore(explain,info.querySelector('.talent-bottomline'));
 const methodology=elt('details','ft-r-score-details ft-r-potential-details');
 methodology.append(elt('summary','','Como funciona o Potencial 2.0'));
 const potentialBody=elt('div','ft-r-score-body');
 methodology.append(potentialBody);
 info.insertBefore(methodology,explain);


 let active=0,raf=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 function sync(){
  const nextIndex=Math.max(0,Math.min(1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))));
  active=nextIndex;
  buttons.forEach((b,i)=>{b.classList.toggle('is-active',i===active);b.setAttribute('aria-current',i===active?'true':'false')});
  previous.disabled=active===0;next.disabled=active===1;
  counter.textContent=(active+1)+' / 2';
  photo.inert=active!==0;slide.inert=active!==1;
 }
 function go(index){
  track.scrollTo({left:Math.max(0,Math.min(1,index))*track.clientWidth,behavior:reduced.matches?'instant':'smooth'});
  active=Math.max(0,Math.min(1,index));
  buttons.forEach((b,i)=>{b.classList.toggle('is-active',i===active);b.setAttribute('aria-current',i===active?'true':'false')});
  counter.textContent=(active+1)+' / 2';
  previous.disabled=active===0;next.disabled=active===1;
  photo.inert=active!==0;slide.inert=active!==1;
 }
 previous.addEventListener('click',()=>go(active-1));
 next.addEventListener('click',()=>go(active+1));
 reel.addEventListener('keydown',event=>{
  if(event.target.closest('a,button'))return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
   event.preventDefault();go(active+(event.key==='ArrowRight'?1:-1));
  }
 });
 track.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync)},{passive:true});
 window.addEventListener('resize',()=>go(active),{passive:true});
 sync();
 return {athlete,card,badge,impactBadge,note:source,scoreBody,spotlight,starsFill,scoreNumber,potentialBody,spotFoot};
}
const live=cards.map(makeCard).filter(Boolean);
function show(record,entry){
 const stats=getReelStats(record,entry.athlete);
 const nodes=entry.card.querySelectorAll('[data-ft-reel-metric]');
 for(const el of nodes){
  const key=el.dataset.ftReelMetric;
  if(key==='sports')el.textContent=stats.sportsScore100===null?'Em formação':stats.sportsScore100+' / 100';
  else if(key==='followers'&&stats.followers===null&&stats.publicFollowerDisplay)el.textContent=stats.publicFollowerDisplay;
  else if(key==='tiktok')el.textContent='Métricas pendentes';
  else if(key==='site')el.textContent='Acervo online';
  else el.textContent=stats.display[key]||'A validar';
 }

 const verified=record?.potential?.status==='validated'&&
   Number.isInteger(record.potential.value)&&record.potential.value>=0&&record.potential.value<=100;
 const potential=verified?record.potential.value:null;
 const meta=record?.potential||{};
 // Never promote the documented sports component to the overall sponsorship index.
 entry.badge.querySelector('.ft-r-rating-label').textContent='POTENCIAL 2.0';
 entry.badge.querySelector('.ft-r-rating-value').textContent=potential===null?'—':String(potential);
 entry.badge.querySelector('.ft-r-rating-sub').textContent=potential===null?'Em validação':'de 100 · validado';
 entry.badge.classList.toggle('ft-r-rating-sport',false);
 const value=entry.scoreNumber.querySelector('.ft-r-spotlight-value');
 value.textContent=potential===null?'—':String(potential);
 entry.spotlight.classList.toggle('ft-r-spotlight-unavailable',potential===null);
 entry.starsFill.style.width=potential===null?'0%':potential+'%';
 entry.spotlight.setAttribute('aria-label',potential===null?
  'Potencial de patrocínio em validação, sem nota até conectar e autorizar os dados':
  'Potencial de patrocínio '+potential+' de 100 pontos; estrelas ilustrativas, não avaliações de usuários.');
 entry.spotFoot.textContent=potential===null?
  'Em validação · alcance, engajamento e ativação aguardam fontes autorizadas. Não é nota esportiva.':
  'Índice 2.0 validado · estrelas ilustram pontuação de potencial, não avaliações de usuários.';
 entry.impactBadge.querySelector('strong').textContent=potential===null?'—':String(potential);
 entry.impactBadge.querySelector('small').textContent=potential===null?'Em validação':'Potencial validado';
 const potentialPanel=entry.potentialBody;
 potentialPanel.replaceChildren();
 potentialPanel.append(elt('p','ft-r-score-summary','Potencial de Patrocínio · '+(potential===null?'Em validação':potential+' / 100')));
 for(const [title,points,key] of [
  ['Audiência e alcance',35,'audience'],
  ['Engajamento e qualidade',30,'engagement'],
  ['Trajetória esportiva',20,'sports'],
  ['Capacidade de ativação',15,'activation']
 ]){
  const part=meta.components?.[key];
  const row=elt('div','ft-r-score-row');
  row.append(elt('span','',title),
   elt('strong','',verified&&part?.complete?part.score+' / '+points:'A validar · '+points+' pts'));
  potentialPanel.append(row);
 }
 potentialPanel.append(elt('p','ft-r-score-note',
  'Comparação comercial somente com Insights Meta autorizados, resultados esportivos revisados, dados atuais e autorização do responsável. Sem dados completos, a nota fica indisponível.'));
 potentialPanel.append(elt('p','ft-r-score-note',
  'Não representa valor de mercado, habilidade futebolística, avaliações de usuários ou garantia de vendas.'));
 const label=stats.verifiedSource?
  'Parcial esportiva do '+stats.sourceLabel+'; sem auditoria independente'+(stats.sportsStale?' · atualização pendente':''):
  'Estatísticas aguardando comprovação';
 entry.note.textContent=label+'. '+(stats.publicFollowerSource?
  'Instagram: seguidores públicos aproximados observados em '+stats.publicFollowerObservedAt+'; alcance e engajamento ainda não validados pela Meta. ':
  'Instagram e alcance somente após autorização. ')+'Sem previsão de resultados.';
 const panel=entry.scoreBody;
 panel.replaceChildren();
 if(stats.sportsPoints===null||!stats.sportsBreakdown){
  panel.append(elt('p','ft-r-score-note','Ainda não há registros esportivos suficientes para uma parcial documentada.'));
  return;
 }
 panel.append(elt('p','ft-r-score-summary','Nota esportiva: '+stats.sportsScore100+' / 100 ('+stats.sportsPoints+' de 25 pontos da componente esportiva). Não é o Índice FutTalento geral.'));
 const list=elt('dl','ft-r-score-breakdown');
 const fmtScore=n=>Number.isFinite(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n):'—';
 const rows=[
  ['Títulos da trajetória',stats.sportsBreakdown.titles,'registros','12'],
  ['Competições',stats.sportsBreakdown.competitions,'registros','5'],
  ['Tempo de clube (proporcional à geração)',stats.sportsBreakdown.clubMonths,'meses mínimos','8']
 ];
 for(const [label,part,unit,maximum] of rows){
  const wrapper=elt('div','ft-r-score-row');
  const dt=elt('dt','',label);
  const dd=elt('dd','',part.count===null?'Não documentado':
   part.count+' '+unit+' · '+fmtScore(part.score)+' / '+maximum+' pts');
  wrapper.append(dt,dd);list.append(wrapper);
 }
 panel.append(list);
 panel.append(elt('p','ft-r-score-note','Nota esportiva = (pontos documentados / 25) × 100. Títulos: até 12 pontos; competições: até 5 pontos; tempo de clube: até 8 pontos, proporcional à geração do atleta.'));
 if(stats.sportsBreakdown.clubMonths.count!==null){
  const ref=stats.sportsBreakdown.clubMonths.referenceMonths;
  const generation=stats.cohortYear?'geração '+stats.cohortYear:'geração não confirmada';
  panel.append(elt('p','ft-r-score-note','Tempo documentado: '+stats.sportsBreakdown.clubMonths.count+' meses. Referência proporcional: '+ref+' meses ('+generation+'). Sem data de nascimento exata; datas de vínculo incompletas usam mínimos conservadores.'));
 }
 panel.append(elt('p','ft-r-score-note','Registros publicados em fonte vinculada ao atleta; não representam avaliação técnica, auditoria independente ou comparação justa de habilidade.'));
 if(entry.athlete==='lucas'&&record?.evidence?.historicalArchiveUsed)
  panel.append(elt('p','ft-r-score-note','Os títulos New Cup, IberLeague RS, Liga Canoense e LINF constavam em versão anterior do site oficial do atleta. São registros históricos atribuídos à fonte do próprio atleta, ainda sem homologação independente.'));
 if(potential===null)panel.append(elt('p','ft-r-score-pending','O Potencial de Patrocínio 2.0 ainda não tem pontuação validada. Esta nota esportiva é um dado complementar, não a nota principal.'));
 if(stats.verifiedSource){
  const sourceLink=elt('a','ft-r-score-source','Conferir registros de origem ↗');
  sourceLink.href=stats.verifiedSource;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
  panel.append(sourceLink);
 }

}
async function refresh(){
 try{
  const response=await fetch('/api/captacao-lead?indice=1&atleta=todos',{credentials:'omit',cache:'no-store'});
  if(!response.ok)throw Error('Fonte indisponível');
  const data=await response.json();
  for(const entry of live){
   const match=data.athletes?.find(row=>row.athlete===entry.athlete);
   if(match)show(match,entry);
  }
 }catch{
  for(const entry of live)entry.note.textContent='Indicadores em atualização. Consulte o perfil para ver a trajetória documentada.';
 }
}
if(live.length)refresh();
