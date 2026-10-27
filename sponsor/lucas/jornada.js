(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalog=[
{id:'oze',name:'Barbearia do Oze',icon:'💈',kind:'Barbearia',url:'https://www.instagram.com/barbeariadooze/'},
{id:'didi',name:'Bolos da Didi',icon:'🎂',kind:'Confeitaria',url:'https://www.instagram.com/bolos_da_didi/'},
{id:'guimaraes',name:'Guimarães Brasil',icon:'🤝',kind:'Parceiro',url:'https://www.instagram.com/guimaraes.brasil/'},
{id:'realgaucho',name:'Real Gaúcho Futsal',icon:'⚽',kind:'Formação esportiva',url:'https://www.instagram.com/realgauchofutsal/'}
];
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const partner=id=>catalog.find(x=>x.id===id)||{name:'Parceiro',icon:'🤝'};
let state=null,role='family',activeView='hoje',installPrompt=null,busy=false;
const feedback=(text,bad=false)=>{const node=$('appFeedback');node.textContent=text||'';node.style.color=bad?'#9e2f29':'#386a55'};
const agency=()=>role==='agency';
const pendingDrafts=()=>state?.drafts?.filter(x=>x.status==='awaiting_review')||[];
const approvedDrafts=()=>state?.drafts?.filter(x=>x.status==='approved')||[];
function showLogin(){
$('loginSection').hidden=false;$('appSection').hidden=true;$('bottomNav').hidden=true;
}
function showApp(){
$('loginSection').hidden=true;$('appSection').hidden=false;$('bottomNav').hidden=false;
$('agencyLink').hidden=!agency();
render();
}
async function load(){
const res=await fetch('/api/family-state',{credentials:'same-origin',cache:'no-store'});
if(res.status===401||res.status===403){showLogin();return false;}
const data=await res.json();
if(!res.ok)throw Error(data.error||'Não foi possível abrir sua jornada.');
state=data.data;role=data.role;showApp();return true;
}
async function submit(event){
event.preventDefault();
const input=$('loginPassword'),pass=input.value,button=$('loginButton');if(!pass)return;
button.disabled=true;$('loginMessage').textContent='Conferindo acesso...';
try{
const res=await fetch('/api/sponsor-password',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass}),cache:'no-store'});
const payload=await res.json();
if(!res.ok)throw Error(payload.error||'Não foi possível entrar');
input.value='';$('loginMessage').textContent='';
if(!await load())throw Error('Sessão não iniciada. Tente novamente.');
}catch(e){$('loginMessage').textContent=e.message||'Falha no acesso';}
finally{button.disabled=false}
}
async function act(action,payload={},success='Registro atualizado.'){
if(busy||!state)return;
busy=true;feedback('Salvando...');
try{
const res=await fetch('/api/family-state',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({...payload,action,revision:state.revision})});
const result=await res.json();
if(!res.ok)throw Error(result.error||'Não foi possível concluir.');
await load();
feedback(success);
}catch(e){feedback(e.message||'Falha ao salvar',true);if(e.message?.includes('outro dispositivo'))await load().catch(()=>{});}
finally{busy=false}
}
const brl=value=>Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty=value=>Number(value||0).toLocaleString('pt-BR');
function renderImpact(){
 const entries=Array.isArray(state?.impact)?state.impact:[];
 const summary=$('ftFamilyImpactSummary'),grid=$('ftFamilyImpactCards');
 if(!entries.length){
  summary.textContent='O boletim de resultados ainda não está disponível.';
  grid.replaceChildren();return;
 }
 const published=entries.reduce((n,r)=>n+(Number(r.published)||0),0);
 const approved=entries.filter(r=>r.approved).length;
 const verified=entries.filter(r=>r.hasPartnerVerification||r.hasAgencySales).length;
 summary.innerHTML='<div class="ft-impact-snapshot"><strong>'+qty(published)+'</strong><span>publicações registradas como realizadas</span></div>'+
  '<div class="ft-impact-snapshot"><strong>'+qty(approved)+'</strong><span>parcerias com oferta aprovada</span></div>'+
  '<div class="ft-impact-snapshot"><strong>'+qty(verified)+'</strong><span>parceiros com comprovações comerciais</span></div>';
 grid.innerHTML=entries.map(r=>{
  const who=partner(r.id),step=[r.approved,r.published>0,r.hasPartnerVerification||r.hasAgencySales];
  const done=step.filter(Boolean).length,percent=Math.round(done/3*100);
  const line=(label,value,notice='')=>'<div class="ft-proof-line"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'+(notice?'<p class="ft-proof-note">'+esc(notice)+'</p>':'');
  const partnerSales=r.hasPartnerVerification?qty(r.salesVerifiedByPartner)+' compra(s)':'Aguardando comprovação';
  const partnerRevenue=r.hasPartnerVerification?brl(r.revenueVerifiedByPartner):'Aguardando comprovação';
  const agencySales=r.hasAgencySales?qty(r.salesReportedByAgency)+' compra(s)':'Sem registros validados';
  const reach=r.reachSnapshot===null?'Não informado':qty(r.reachSnapshot);
  return '<article class="ft-impact-card">'+
   '<div class="ft-impact-card-top"><span class="ft-impact-emoji" aria-hidden="true">'+esc(who.icon)+'</span>'+
   '<div><h3>'+esc(who.name)+'</h3><p class="small muted">Ciclo documentado · '+done+' de 3 marcos</p></div>'+
   '<div class="ft-impact-ring" role="img" aria-label="'+percent+'% dos marcos documentados" style="--impact-percent:'+percent+'"><span>'+done+'/3</span></div></div>'+
   '<div class="ft-impact-steps"><span class="'+(step[0]?'complete':'')+'">1 · Oferta</span><span class="'+(step[1]?'complete':'')+'">2 · Publicação</span><span class="'+(step[2]?'complete':'')+'">3 · Resultado</span></div>'+
   line('Conteúdos publicados',r.published?qty(r.published):'A confirmar')+
   line('Cupom aprovado',r.coupon||'Não cadastrado')+
   line('Alcance do período',reach,r.reachSnapshot===null?'Ainda sem captura autenticada.':'Fotografia da conta em '+(r.reachDate||'data não informada')+'; não significa alcance exclusivo do post.')+
   line('Resgates validados pelo parceiro',r.hasPartnerVerification?qty(r.couponsVerifiedByPartner):'Aguardando comprovação')+
   line('Vendas validadas pelo parceiro',partnerSales)+
   line('Valor de vendas validado pelo parceiro',partnerRevenue)+
   '<details class="ft-impact-details"><summary>Outros registros da agência</summary>'+
   line('Resgates registrados pela agência',r.couponsReportedByAgency?qty(r.couponsReportedByAgency):'Sem confirmação')+
   line('Vendas registradas pela agência',agencySales)+
   line('Faturamento registrado pela agência',r.hasAgencySales?brl(r.revenueReportedByAgency):'Sem confirmação')+
   '<p class="small muted">Fontes possivelmente sobrepostas. Não somamos estes registros aos resultados do estabelecimento.</p></details>'+
   '</article>';
 }).join('');
}
function renderToday(){
  const events=(state?.schedule||[]).filter(x=>x.date>=todayISO()).slice(0,3);
  $('monthPreview').innerHTML=events.length?events.map(renderEvent).join(''):'<p class="small muted">A equipe está preparando o próximo calendário. Quando houver datas registradas, elas aparecerão aqui.</p>';
  renderApprovals();
}
function renderApprovals(){
const pending=pendingDrafts();
if(!pending.length){$('approvalArea').innerHTML='';return;}
$('approvalArea').innerHTML='<div class="sectionTitle"><h2>✉️ Publicação para você ver</h2><small>'+pending.length+' aguardando</small></div>'+
pending.slice(0,2).map(d=>'<article class="panel approval" data-review-card="'+esc(d.id)+'"><p class="eyebrow">A agência preparou · '+esc(d.format)+'</p><h2 style="margin:8px 0">'+esc(d.title)+'</h2><p class="small muted">'+esc(partner(d.partner).name)+' · Planejado para '+esc(formatDate(d.date))+'</p><div class="preview"><strong>Legenda para conferir</strong><p>'+esc(d.caption)+'</p>'+(d.previewUrl?'<a class="linktext" href="'+esc(d.previewUrl)+'" target="_blank" rel="noopener noreferrer">👀 Abrir prévia da foto ou vídeo ↗</a>':'<p class="tiny muted" style="margin-top:8px">A equipe ainda não anexou uma prévia visual.</p>')+'</div><p class="small muted">Gostou? Você pode aprovar ou pedir uma alteração. Nada será publicado automaticamente.</p><div class="groupactions" style="margin-top:12px"><button type="button" class="action" data-approve="'+esc(d.id)+'" '+(!d.previewUrl||agency()?'disabled':'')+'>✓ Gostei, aprovar</button><button type="button" class="action secondary" data-request-change="'+esc(d.id)+'" '+(agency()?'disabled':'')+'>✏️ Pedir ajuste</button></div><form class="benefitForm" data-changes-form="'+esc(d.id)+'" hidden><label class="field-label" for="notes-'+esc(d.id)+'">O que a agência deve mudar?</label><textarea id="notes-'+esc(d.id)+'" class="field" name="familyNote" maxlength="450" placeholder="Ex.: Escolher outra foto"></textarea><button type="submit" class="action full">Enviar pedido de ajuste</button></form></article>').join('');
}
function formatDate(date){if(!/^20\d\d-\d\d-\d\d$/.test(date||''))return date||'a definir';const [y,m,d]=date.split('-');return d+'/'+m+'/'+y;}
function renderEvent(x){
  const format={story:'📱 Story',reel:'🎬 Reel',post:'🖼️ Publicação'}[x.type]||'📍 Conteúdo';
  const statusLabel={planejado:'Em planejamento',em_producao:'Em produção',aguardando_autorizacao:'Aguardando autorização',pronto:'Pronto para programar',agendado:'Agendamento informado pela agência',publicado:'Publicação informada pela agência',confirmado:'Confirmado'}[x.status]||'Em planejamento';
  return '<article class="event"><div class="date">'+esc(x.date.slice(8,10))+'<br>'+esc(x.date.slice(5,7))+'</div><div style="flex:1"><h3>'+format+' · '+esc(partner(x.partner).name)+'</h3><p>Canal: Instagram FutTalento'+(x.collab?' · Colab previsto':'')+'</p><p style="margin-top:6px">● '+esc(statusLabel)+'</p></div></article>';
}
function renderAgenda(){
  const events=(state?.schedule||[]).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const now=todayISO();
  const list=events.filter(x=>x.date.slice(0,7)>=now.slice(0,7)).slice(0,40);
  $('agendaList').innerHTML=list.length?list.map(renderEvent).join(''):'<div class="panel">Nenhuma publicação registrada para este período. A agência está organizando o cronograma mensal.</div>';
}
function renderConquistas(){
  $('partnerCards').innerHTML=catalog.map(p=>'<article class="partnerCard"><span style="font-size:1.75rem">'+p.icon+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.kind)+'</small><a class="linktext tiny" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">Conhecer ↗</a></article>').join('');
  $('benefitList').innerHTML=(state.benefits||[]).length?state.benefits.slice().reverse().map(b=>'<div class="benefit"><span class="ico">'+partner(b.partner).icon+'</span><div><b>'+esc(b.description)+'</b><small>'+esc(partner(b.partner).name)+' · '+esc(formatDate(b.date))+'</small><small>'+(b.verification==='verified_by_agency'?'✅ Confirmado pela equipe':'⏳ Em conferência pela equipe')+'</small></div></div>').join(''):'<p class="small muted" style="margin-top:13px">Ainda não há apoios recebidos registrados.</p>';
}
function render(){renderToday();renderImpact();renderAgenda();renderConquistas();setView(activeView);}
function setView(name){
if(!['hoje','agenda','conquistas'].includes(name))name='hoje';activeView=name;
document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+name));
document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-current',x.dataset.view===name?'page':'false'));
}
function bindEvents(){
$('loginForm').addEventListener('submit',submit);
document.querySelectorAll('[data-view]').forEach(x=>x.addEventListener('click',()=>{setView(x.dataset.view);window.scrollTo({top:0,behavior:'smooth'})}));
 $('seeCalendar').addEventListener('click',()=>{setView('agenda');window.scrollTo({top:0,behavior:'smooth'});});
 $('approvalArea').addEventListener('click',async e=>{
const approve=e.target.closest('[data-approve]')?.dataset.approve;
if(approve){await act('review_draft',{draftId:approve,decision:'approved',note:''},'Publicação aprovada! A agência foi informada pelo painel.');return;}
const change=e.target.closest('[data-request-change]')?.dataset.requestChange;
if(change){const card=e.target.closest('[data-review-card]'),form=card?.querySelector('[data-changes-form]');if(form){form.hidden=!form.hidden;if(!form.hidden)form.querySelector('textarea')?.focus();}}
});
$('approvalArea').addEventListener('submit',async e=>{
const form=e.target.closest('[data-changes-form]');if(!form)return;e.preventDefault();const note=form.querySelector('textarea')?.value.trim()||'';
if(note.length<4){feedback('Conte rapidamente qual ajuste deseja.',true);return;}
await act('review_draft',{draftId:form.dataset.changesForm,decision:'needs_changes',note},'Pedido enviado para a agência. Vamos ajustar a peça.');
});

}
function preparePWA(){
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sponsor/lucas/sw.js',{scope:'/sponsor/lucas/'}).catch(()=>{}));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').hidden=false});
$('installApp').addEventListener('click',async()=>{
if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installApp').hidden=true;
});
window.addEventListener('appinstalled',()=>{$('installApp').hidden=true;});
}
bindEvents();preparePWA();
load().catch(e=>{showLogin();$('loginMessage').textContent='Sem conexão com os registros no momento. Confira sua internet e tente novamente.';});
})();