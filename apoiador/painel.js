(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const names={
 oze:{name:'Barbearia do Oze',emoji:'💈',category:'Barbearia'},
 didi:{name:'Bolos da Didi',emoji:'🎂',category:'Confeitaria'},
 guimaraes:{name:'Guimarães Brasil',emoji:'🤝',category:'Parceiro esportivo'},
 realgaucho:{name:'Real Gaúcho Futsal',emoji:'⚽',category:'Formação esportiva'}
};
const proposedTasks=[
 {icon:'⚽',title:'Conhecer a trajetória do Lucas',desc:'Veja como sua parceria faz parte da formação do Lucas. Leva só um minuto.',time:'1 minuto'},
 {icon:'🎁',title:'Definir seu benefício exclusivo',desc:'Conte como sua empresa ajuda o Lucas e que vantagem gostaria de oferecer aos clientes.',time:'2 minutos'},
 {icon:'🧾',title:'Registrar seu primeiro resultado',desc:'Quando alguém usar um cupom ou houver uma compra, avise a agência aqui. Nós conferimos.',time:'1 minuto'}
];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const count=v=>Number(v||0).toLocaleString('pt-BR');
const dateLabel=d=>/^20\d\d-\d\d-\d\d$/.test(d||'')?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'a definir';
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
let partner=null,role=null,portal=null,summary=null,active='hoje',working=false,installPrompt=null;
const message=(s,bad=false)=>{$('appFeedback').textContent=s||'';$('appFeedback').style.color=bad?'#9e2f29':'#326f4a'};
const catalog=()=>names[partner]||names.oze;
const approvedOffers=()=>portal?.offer?.status==='approved';
const missionState=()=>[!!portal?.missions?.acknowledged,!!portal?.offer,(portal?.results||[]).length>0];
const ownerView=()=>role==='agency';
function selectView(id){
 active=['hoje','entregas','resultados'].includes(id)?id:'hoje';
 document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+active));
 document.querySelectorAll('[data-tab]').forEach(el=>el.setAttribute('aria-current',el.dataset.tab===active?'page':'false'));
}
function displayLogin(){
 $('loginScreen').hidden=false;$('partnerApp').hidden=true;$('partnerTabs').hidden=true;
 const requested=new URLSearchParams(location.search).get('parceiro');
 if(names[requested])$('partnerSelect').value=requested;
}
function displayApp(){
 $('loginScreen').hidden=true;$('partnerApp').hidden=false;$('partnerTabs').hidden=false;
 $('greeting').textContent='Olá, '+catalog().name+'! 👋';
 $('partnerIcon').textContent=catalog().emoji;
 $('agencyDashboard').hidden=!ownerView();
 $('copyPublicLink').disabled=false;
 renderAll();
}
async function fetchPortal(){
 const desired=new URLSearchParams(location.search).get('parceiro');
 const path='/api/partner-state'+(names[desired]?'?partner='+encodeURIComponent(desired):'');
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store'});
 if(res.status===401||res.status===403){displayLogin();return false;}
 const data=await res.json();
 if(!res.ok)throw Error(data.error||'Não foi possível abrir sua parceria.');
 partner=data.partner;role=data.role;portal=data.data;summary=data.summary;
 displayApp();return true;
}
async function signIn(e){
 e.preventDefault();
 const id=$('partnerSelect').value,pwd=$('partnerPassword').value;
 if(!pwd||!names[id])return;
 $('partnerLoginButton').disabled=true;$('loginError').textContent='Conferindo acesso...';
 try{
  const r=await fetch('/api/partner-login',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({partner:id,password:pwd})});
  const res=await r.json();
  if(!r.ok)throw Error(res.error||'Senha não reconhecida');
  $('partnerPassword').value='';$('loginError').textContent='';
  const q=new URLSearchParams(location.search);q.set('parceiro',id);history.replaceState(null,'',location.pathname+'?'+q.toString());
  if(!await fetchPortal())throw Error('Sua sessão não foi iniciada.');
 }catch(err){$('loginError').textContent=err.message||'Falha ao entrar'}
 finally{$('partnerLoginButton').disabled=false}
}
async function update(action,fields={},success='Registro salvo com sucesso!'){
 if(!portal||working||ownerView())return;
 working=true;message('Salvando...');
 try{
  const r=await fetch('/api/partner-state',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...fields,action,revision:portal.revision})});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível salvar.');
  await fetchPortal();message(success);
 }catch(err){message(err.message||'Falha ao salvar',true);
  if((err.message||'').includes('mudaram'))await fetchPortal().catch(()=>{});
 }finally{working=false}
}
function missionCard(){
 const status=missionState(),completed=status.filter(Boolean).length;
 $('progressNumber').textContent=completed+' de 3';
 $('progressBar').setAttribute('aria-valuenow',String(completed));
 $('progressValue').style.width=(completed/3*100)+'%';
 const current=status.findIndex(x=>!x);
 if(current<0){
  $('taskEstimate').textContent='Primeiras missões concluídas';
  $('nextMission').innerHTML='<div style="text-align:center;padding:15px 0"><div style="font-size:3rem" aria-hidden="true">🏆</div><h2>Você concluiu os primeiros passos!</h2><p class="small muted" style="margin-top:9px">A agência continua cuidando das publicações e das próximas campanhas. Sem cobranças diárias.</p></div>';
  return;
 }
 const item=proposedTasks[current];$('taskEstimate').textContent=item.time;
 let actions='';
 if(current===0)actions='<div class="inlineBtns"><a class="action secondary" href="/atletas/#lucas" target="_blank" rel="noopener noreferrer">Conhecer o Lucas ↗</a>'+
  (ownerView()?'':'<button class="action" data-action="acknowledge" type="button">✓ Já conheci</button>')+'</div>';
 if(current===1)actions='<button class="action full" data-action="show-offer" type="button" '+(ownerView()?'disabled':'')+'>🎁 Cadastrar minha oferta →</button>';
 if(current===2)actions='<button class="action full" data-action="show-result" type="button" '+(ownerView()?'disabled':'')+'>🧾 Informar resultado →</button>';
 $('nextMission').innerHTML='<span class="mission-kicker">Sua próxima missão</span><div class="mission-grid"><div class="illustration" aria-hidden="true">'+item.icon+'</div><div class="mission-text"><h2>'+item.title+'</h2><p>'+item.desc+'</p><span class="timechip">⏱️ '+item.time+'</span></div></div>'+actions+
  '<button class="linktext" data-action="help" type="button" style="border:0;background:transparent;display:block;margin:17px auto 0;font-size:.82rem">Não consigo fazer · pedir ajuda</button>';
}
function numberBox(value,label,missing=false){
 return '<div class="numberCard"><strong class="'+(missing?'isMissing':'')+'">'+esc(value)+'</strong><small>'+esc(label)+'</small></div>';
}
function renderImpactCycle(){
 const metrics=summary?.metrics||{};
 const offer=portal?.offer?.status==='approved'||summary?.agreement?.approved===true;
 const published=Number(metrics.publicationsLucas||0)>0;
 const proof=(portal?.results||[]).some(x=>x.status==='verified');
 const stages=[
  {done:offer,title:'Oferta aprovada',detail:offer?'Pronta para campanha':'A agência ainda precisa validar'},
  {done:published,title:'Conteúdo publicado',detail:published?'Registrado pela agência':'Aguardando registro de publicação'},
  {done:proof,title:'Resultado validado',detail:proof?'Conferido pela agência':'Ainda sem comprovação de venda, cupom ou apoio'}
 ];
 const completed=stages.filter(x=>x.done).length;
 const ring=$('partnerImpactRing');
 ring.style.setProperty('--impact',String(Math.round(completed/3*100))+'%');
 ring.setAttribute('aria-label','Progresso documentado: '+completed+' de 3 etapas');
 $('partnerImpactFraction').textContent=completed+'/3';
 $('partnerImpactSteps').innerHTML=stages.map((st,i)=>
  '<div class="partner-proof-step '+(st.done?'is-done':'')+'"><span class="partner-step-icon">'+(st.done?'✓':String(i+1))+'</span><div><b>'+esc(st.title)+'</b><small>'+esc(st.detail)+'</small></div></div>'
 ).join('');
 const coupon=portal?.offer?.status==='approved'?portal.offer.coupon:summary?.agreement?.approved?summary.agreement.coupon:'';
 $('partnerImpactCoupon').textContent=coupon?'🎟️ Cupom aprovado: '+coupon:'🎟️ Nenhum cupom aprovado para esta campanha.';
 const last=metrics.agencyUpdatedAt?new Date(metrics.agencyUpdatedAt).toLocaleDateString('pt-BR'):'não informado';
 $('partnerAttributionNotice').textContent='Atualização da agência: '+last+
  '. Publicação não comprova visualização. O alcance informado é dos Insights do período, não de um post isolado. '+
  'Cupons e vendas de fontes diferentes não são somados para evitar duplicidade. Cliques e pedidos automáticos ainda não estão integrados.';
}
function renderNumbers(){
 const metrics=summary?.metrics||{};
 const verified=(portal.results||[]).filter(x=>x.status==='verified');
 const reports=(portal.results||[]).filter(x=>x.status==='pending');
 $('quickNumbers').innerHTML=numberBox(count(metrics.publications||0),'Conteúdos publicados pela agência')+
  numberBox(count(verified.length),'Registros validados')+
  numberBox(reports.length?count(reports.length):'Nenhum','Enviados para conferência')+
  numberBox('Em integração','Cliques em links rastreados',true);
 const confirmedCoupons=(portal.results||[]).filter(x=>x.type==='cupom'&&x.status==='verified');
 const confirmedCouponQty=confirmedCoupons.reduce((n,x)=>n+Number(x.qty||0),0);
 const confirmedSales=(portal.results||[]).filter(x=>x.type==='compra'&&x.status==='verified');
 const confirmedQty=confirmedSales.reduce((s,x)=>s+Number(x.qty||0),0);
 const confirmedRevenue=confirmedSales.reduce((s,x)=>s+Number(x.amount||0),0);
 $('resultNumbers').innerHTML=numberBox(count(metrics.publications||0),'Publicações no Instagram do Lucas')+
  numberBox(count(metrics.publicationsFutTalento||0),'Publicações no Instagram FutTalento')+
  numberBox(count(metrics.coupons||0),'Resgates confirmados pela agência')+
  numberBox(verified.length?count(confirmedCouponQty):'A confirmar','Resgates confirmados pelo comércio',!verified.length)+
  numberBox(verified.length?count(confirmedQty):'A confirmar','Compras confirmadas pelo comércio',!verified.length)+
  numberBox(verified.length?money(confirmedRevenue):'A confirmar','Valor das compras confirmadas',!verified.length);
 $('legacyResults').hidden=!(Number(metrics.sales||0)>0||Number(metrics.revenue||0)>0);
 $('legacyResults').textContent='Registros comerciais anteriores da agência: '+count(metrics.sales||0)+' compra(s), '+money(metrics.revenue||0)+'. Os dois históricos não são somados automaticamente para evitar contar a mesma venda duas vezes.';
 const social=(metrics.social||[]).filter(s=>s.channel==='instagram-lucas');
 const periods=social.filter(s=>s.scope!=='post'),posts=social.filter(s=>s.scope==='post');
 const snap=periods.length?periods[periods.length-1]:null;
 const post=posts.length?posts[posts.length-1]:null;
 const history=periods.length>1?periods[0]:null;
 const delta=history&&snap?Number(snap.followers)-Number(history.followers):null;
 $('socialNumbers').innerHTML=[
  ['Seguidores na conta do Lucas',snap?count(snap.followers):'Não medido'],
  ['Variação total de seguidores',delta===null?'A integrar':(delta>0?'+':'')+count(delta)],
  ['Alcance da conta do Lucas no período',snap?count(snap.reach):'Não medido'],
   ['Alcance de post/Reel individual do Lucas',post?count(post.reach):'Não medido'],
  ['Visitas ao perfil do Lucas',snap?count(snap.visits):'Não medido'],
  ['Visitas vindas especificamente do Lucas','Ainda não mensurado']
 ].map(([k,v])=>'<div class="simpleRow"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>').join('')+
 '<div class="trackNotice">Dados de Instagram dependem de acesso autorizado e conferência do período. Atribuir seguidores a um único Story exige cautela; não há garantia de causalidade.</div>';
}
const statusCaption=x=>({pending:'Aguardando confirmação',verified:'Conferido pela agência',rejected:'Necessita revisão'}[x]||'Em análise');
function renderReports(){
 const rs=portal?.results||[];
 $('myReports').innerHTML=rs.length?rs.slice().reverse().map(r=>'<article class="event"><div class="deliveryIcon" aria-hidden="true">'+({compra:'🛍️',cupom:'🎟️',permuta:'🎁'}[r.type]||'🧾')+'</div><div><h3>'+esc({compra:'Compra informada',cupom:'Cupom utilizado',permuta:'Apoio entregue'}[r.type]||'Registro')+'</h3><p>'+dateLabel(r.date)+' · '+count(r.qty)+' registro(s) · '+esc(r.reference)+'</p>'+(r.type==='compra'?'<p>'+money(r.amount)+'</p>':'')+'<span class="statusFlag '+(r.status==='verified'?'verified':r.status==='rejected'?'rejected':'')+'">'+esc(statusCaption(r.status))+'</span>'+(r.reviewNote?'<p style="margin-top:8px">'+esc(r.reviewNote)+'</p>':'')+'</div></article>').join(''):'<p class="small muted">Ainda não há resultados registrados. Quando alguém comprar ou usar um cupom, registre aqui para a equipe conferir.</p>';
}
function renderDeliveries(){
 const all=summary?.activities||[];
 const posts=all.filter(a=>['story','reel','post'].includes(a.type)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,30);
 $('deliveriesList').innerHTML=posts.length?posts.map(a=>{
 const published=['publicado','confirmado'].includes(a.status),emoji={story:'📱',reel:'🎬',post:'🖼️'}[a.type];
 const name={story:'Story',reel:'Reel',post:'Carrossel/post'}[a.type],channel=a.channel==='instagram-lucas'?'Instagram do Lucas':'Instagram FutTalento';
 return '<article class="event"><div class="deliveryIcon" aria-hidden="true">'+emoji+'</div><div><h3>'+name+'</h3><p>'+dateLabel(a.date)+' · '+esc(channel)+'</p><span class="deliveryState '+(published?'live':'')+'">'+(published?'✓ Publicado':'Em planejamento')+'</span>'+(published&&a.postUrl?'<p><a class="action-link" href="'+esc(a.postUrl)+'" target="_blank" rel="noopener noreferrer">Ver publicação no Instagram ↗</a></p>':'')+'</div></article>';
 }).join(''):'<div class="panel"><h3>🎬 A agência está preparando as primeiras entregas</h3><p class="small muted" style="margin-top:10px">Assim que houver um conteúdo registrado e aprovado, a programação vai aparecer aqui. Por enquanto não há publicações confirmadas neste painel.</p></div>';
}
function renderOffer(){
 const offer=portal.offer,agreement=summary?.agreement||{approved:false};
 let summaryHtml='';
 if(offer){
  const flag={pending:'⏳ A agência vai conferir',approved:'✓ Aprovada pela agência',needs_changes:'✏️ Ajuste solicitado'}[offer.status]||'Em revisão';
  summaryHtml='<span class="statusFlag '+(offer.status==='approved'?'verified':offer.status==='needs_changes'?'rejected':'')+'">'+flag+'</span><p><b>O que sua empresa oferece:</b> '+esc(offer.offer)+'</p><p><b>Regras e validade:</b> '+esc(offer.validity)+'</p><p><b>Cupom:</b> '+esc(offer.coupon||'Ainda não definido')+'</p>'+(offer.reviewNote?'<p><b>Mensagem da agência:</b> '+esc(offer.reviewNote)+'</p>':'');
 }else if(agreement.approved){
  summaryHtml='<span class="statusFlag verified">✓ Apoio registrado pela agência</span><p><b>Oferta:</b> '+esc(agreement.offer||'Verificar com a agência')+'</p><p><b>Cupom:</b> '+esc(agreement.coupon||'A definir')+'</p>';
 }else summaryHtml='<p>Você ainda não enviou uma oferta. Isso é normal! Podemos construir uma vantagem simples para clientes adultos.</p>';
 $('offerSummary').innerHTML=summaryHtml;
 $('offerForm').hidden=ownerView()||!!offer;
 $('newOfferButton').hidden=ownerView()||!offer;
 $('newOfferButton').textContent=offer?.status==='approved'?'✏️ Propor nova promoção':'✏️ Atualizar minha proposta';
 if(!ownerView()){
 $('supportDescription').value=offer?.support||'';
 $('offerDescription').value=offer?.offer||'';
 $('offerValidity').value=offer?.validity||'';
 $('couponCode').value=offer?.coupon||'';
 }
}
function renderAll(){missionCard();renderNumbers();renderImpactCycle();renderReports();renderDeliveries();renderOffer();selectView(active)}
function openOffer(){
 $('offerPanel').hidden=false;
 $('offerPanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function showResult(){
 selectView('resultados');
 $('resultForm').hidden=false;
 $('newReportButton').setAttribute('aria-expanded','true');
 $('resultForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function init(){
 $('partnerLogin').addEventListener('submit',signIn);
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{selectView(b.dataset.tab);window.scrollTo({top:0,behavior:'smooth'})}));
 $('nextMission').addEventListener('click',async e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(action==='acknowledge')await update('acknowledge',{done:true},'Boa! Você concluiu o primeiro passo. 🌟');
  if(action==='show-offer')openOffer();
  if(action==='show-result')showResult();
  if(action==='help')await update('request_help',{message:'Preciso de ajuda com a próxima missão: '+proposedTasks[missionState().findIndex(x=>!x)]?.title},'A agência recebeu seu pedido no painel.');
 });
 $('openOfferButton').addEventListener('click',openOffer);
 $('newOfferButton').addEventListener('click',()=>{
  $('offerForm').hidden=!$('offerForm').hidden;
  if(!$('offerForm').hidden)$('supportDescription').focus();
 });
 $('printPartnerResults').addEventListener('click',()=>{
  if(!partner||!portal)return;
  document.body.classList.add('print-partner-results');
  window.print();
 });
 window.addEventListener('afterprint',()=>document.body.classList.remove('print-partner-results'));
 $('copyPublicLink').addEventListener('click',async()=>{
  const url='https://www.futtalento.com.br/apoiadores/lucas/?utm_source=parceiro&utm_medium=perfil&utm_campaign=rede-de-apoio&utm_content='+encodeURIComponent(partner);
  try{await navigator.clipboard.writeText(url);message('Link copiado! Pode compartilhar com seus clientes.');}catch{message('Não conseguimos copiar automaticamente. Peça o link à agência.',true)}
 });
 $('offerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const body={support:$('supportDescription').value,offer:$('offerDescription').value,validity:$('offerValidity').value,coupon:$('couponCode').value};
  $('saveOffer').disabled=true;
  await update('submit_offer',body,'Sua oferta foi enviada. Vamos analisar e avisar quando estiver pronta.');
  $('saveOffer').disabled=false;
 });
 $('resultDate').value=today();
 $('newReportButton').setAttribute('aria-expanded','false');
 $('newReportButton').addEventListener('click',()=>{
  $('resultForm').hidden=!$('resultForm').hidden;
  $('newReportButton').setAttribute('aria-expanded',String(!$('resultForm').hidden));
  if(!$('resultForm').hidden)$('resultForm').scrollIntoView({behavior:'smooth',block:'start'});
 });
 $('resultType').addEventListener('change',()=>{
  const isSale=$('resultType').value==='compra';
  $('amountContainer').hidden=!isSale;
  $('resultAmount').required=isSale;
  $('resultAmount').value=isSale?'':'0';
 });
 $('resultForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const body={type:$('resultType').value,date:$('resultDate').value,qty:Number($('resultQty').value),amount:Number($('resultAmount').value||0),reference:$('resultReference').value.trim()};
  $('saveReportButton').disabled=true;
  const oldRevision=portal?.revision;
  await update('report_result',body,'Resultado enviado! A agência vai conferir antes de contar no relatório.');
  if(portal?.revision!==oldRevision){$('resultForm').reset();$('resultForm').hidden=true;$('resultDate').value=today();}
  $('saveReportButton').disabled=false;
 });
 document.querySelectorAll('[data-help]').forEach(b=>b.addEventListener('click',()=>update('request_help',{message:b.dataset.help},'Pedido registrado para a agência.')));
}
function setupInstall(){
 if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/apoiador/sw.js',{scope:'/apoiador/'}).catch(()=>{}));
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').hidden=false;});
 $('installApp').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installApp').hidden=true;});
 window.addEventListener('appinstalled',()=>{$('installApp').hidden=true;});
}
init();setupInstall();
fetchPortal().catch(err=>{displayLogin();$('loginError').textContent='Não foi possível carregar o painel. Tente novamente.'});
})();
