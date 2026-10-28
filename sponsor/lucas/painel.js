(()=>{
'use strict';
const partnerCatalog=[
{id:'guimaraes',name:'Guimarães Brasil',type:'Parceria divulgada no site oficial',link:'https://www.instagram.com/guimaraes.brasil/'},
{id:'didi',name:'Bolos da Didi',type:'Parceria divulgada · confirmar permuta',link:'https://www.instagram.com/bolos_da_didi/'},
{id:'oze',name:'Barbearia do Oze',type:'Parceria divulgada · confirmar cortes',link:'https://www.instagram.com/barbeariadooze/'},
{id:'realgaucho',name:'Real Gaúcho Futsal',type:'Formação complementar · não presumir patrocínio comercial',link:'https://www.instagram.com/realgauchofutsal/'}
];
const tasks=[
 ['permissions','Agência','Solicitar e arquivar autorizações de uso de imagem e comunicação publicitária, somente quando aplicáveis','Antes de veicular'],
 ['contracts','Agência','Confirmar contratos, pacotes e contrapartidas de cada apoiador','Início de mês'],
 ['materials','Agência','Solicitar por WhatsApp imagens e vídeos à família e aos parceiros, sem tarefas no painel familiar','Início de mês'],
 ['calendar','Agência','Fechar calendário editorial do mês seguinte no Instagram do Lucas e/ou FutTalento','Mensal'],
 ['creative','Agência','Redigir legendas, criar artes, Stories, Reels e carrosséis do mês','Mensal'],
 ['approval','Agência','Organizar revisões pontuais de imagem e publicidade antes da veiculação','Quando necessário'],
 ['partnercolab','Agência + parceiro','Convidar perfis de apoiadores para Collab em Reels/posts elegíveis','Conforme cronograma'],
 ['schedule','Agência','Programar publicações nas ferramentas do Instagram e registrar confirmação no painel','Mensal'],
 ['check','Agência','Conferir se as publicações programadas saíram conforme combinado','Semanal'],
 ['coupon','Agência + comércio','Validar cupons e condições comerciais com os estabelecimentos','Mensal'],
 ['insights','Agência','Coletar insights reais dos conteúdos e perfis autorizados','Mensal'],
 ['report','Agência','Enviar relatório das entregas e resultados comprovados aos apoiadores','Mensal'],
 ['renewal','Agência','Organizar a renovação dos pacotes e reajustes de cronograma','Mensal']
];
const defaults=()=>({partners:{},missions:{},activities:[],social:[],updatedAt:null});
let state=defaults(),ready=false;
const $=id=>document.getElementById(id);
const safe=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const label=id=>partnerCatalog.find(x=>x.id===id)?.name||'Não identificado';
const channelLabel=id=>id==='instagram-lucas'?'Instagram Lucas':id==='instagram-futtalento'?'Instagram FutTalento':'Canal não classificado';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number=v=>Number(v||0).toLocaleString('pt-BR');
const partnerOptions=()=>partnerCatalog.map(p=>'<option value="'+p.id+'">'+safe(p.name)+'</option>').join('');
function status(message,bad=false){$('saveStatus').textContent=message;$('saveStatus').style.color=bad?'#ffb9a1':'#c9fc54';}
function setTab(id){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===id)));document.querySelectorAll('.sectionpanel').forEach(s=>s.classList.toggle('active',s.id==='tab-'+id));}
function setToday(){const t=new Date(),d=new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,10);$('acDate').value=d;$('soDate').value=d;$('calendarMonth').value=d.slice(0,7);}
function renderPartners(){
$('partners').innerHTML=partnerCatalog.map(p=>{const x=state.partners[p.id]||{};return '<article class="sponsor" data-partner="'+p.id+'"><span class="eyebrow">Parceiro cadastrado</span><h3>'+safe(p.name)+'</h3><p>'+safe(p.type)+' · <a class="link" href="'+p.link+'" target="_blank" rel="noopener noreferrer">Perfil público ↗</a></p><label>Natureza do apoio</label><select data-key="kind"><option value="">A confirmar</option><option value="permuta">Permuta</option><option value="financeiro">Patrocínio financeiro</option><option value="institucional">Apoio institucional</option><option value="formacao">Formação esportiva</option></select><label>Oferta exclusiva / benefício</label><textarea data-key="offer" placeholder="Somente oferta aprovada pelo parceiro">'+safe(x.offer||'')+'</textarea><label>Cupom definido com a empresa</label><input data-key="coupon" maxlength="60" value="'+safe(x.coupon||'')+'" placeholder="Sem cupom aprovado"><label>Validade e regras</label><input data-key="validity" value="'+safe(x.validity||'')+'" placeholder="Período, lojas participantes, limites"><label>Frequência de posts acordada</label><input data-key="frequency" value="'+safe(x.frequency||'')+'" placeholder="Ex.: 1 Story/mês"><label>Observações e comprovações</label><textarea data-key="notes" placeholder="Tipo de permuta, responsável pela validação...">'+safe(x.notes||'')+'</textarea><label><input data-key="approved" type="checkbox" '+(x.approved?'checked':'')+'> Condições aprovadas pelo parceiro/responsável</label></article>'}).join('');
document.querySelectorAll('[data-partner]').forEach(card=>{const id=card.dataset.partner,select=card.querySelector('[data-key=kind]');select.value=state.partners?.[id]?.kind||'';});
}
function pullPartners(){document.querySelectorAll('[data-partner]').forEach(card=>{const obj={};card.querySelectorAll('[data-key]').forEach(f=>obj[f.dataset.key]=f.type==='checkbox'?f.checked:f.value);state.partners[card.dataset.partner]=obj;});}
function renderMissions(){
$('tasks').innerHTML=tasks.map(([id,who,desc,when])=>'<label class="task"><input type="checkbox" data-mission="'+id+'" '+(state.missions?.[id]?.done?'checked':'')+'><span><b>'+safe(desc)+'</b><small>Responsável: '+safe(who)+' · '+safe(when)+'</small></span></label>').join('');
$('nextTasks').innerHTML=tasks.filter(t=>!state.missions?.[t[0]]?.done).slice(0,5).map(t=>'<div class="task"><span>○</span><span><b>'+safe(t[2])+'</b><small>'+safe(t[1])+' · '+safe(t[3])+'</small></span></div>').join('')||'<p class="mini">Todas as atividades da agência foram concluídas.</p>';
}
function pullMissions(){document.querySelectorAll('[data-mission]').forEach(el=>state.missions[el.dataset.mission]={done:el.checked});}
function renderMetrics(){
let delivered=0,coupons=0,sales=0,revenue=0;
for(const a of state.activities||[]){if(['post','reel','story'].includes(a.type)&&['publicado','confirmado'].includes(a.status))delivered+=a.qty||1;if(['cupom','resgate'].includes(a.type)&&a.status==='confirmado')coupons+=a.qty||0;if(a.type==='venda'&&a.status==='confirmado'){sales+=a.qty||0;revenue+=a.revenue||0;}}
$('met-deliveries').textContent=number(delivered);$('met-coupons').textContent=number(coupons);$('met-sales').textContent=number(sales);$('met-revenue').textContent=money(revenue);
}
function renderActivities(){
$('activityRows').innerHTML=(state.activities||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>{
 const opts={planejado:'Planejado',em_producao:'Em produção',aguardando_autorizacao:'Aguardando autorização',pronto:'Pronto',agendado:'Agendado (manual)',publicado:'Publicado',confirmado:'Confirmado'};
 const select='<select aria-label="Etapa da publicação" data-status-activity="'+safe(a.id)+'">'+Object.entries(opts).map(([v,t])=>'<option value="'+v+'"'+(a.status===v?' selected':'')+'>'+t+'</option>').join('')+'</select>';
 const material='<select aria-label="Estado do material" data-material-activity="'+safe(a.id)+'">'+Object.entries({pendente:'A solicitar',solicitado:'Solicitado',recebido:'Recebido',aprovado:'Autorizado'}).map(([v,t])=>'<option value="'+v+'"'+(a.material===v?' selected':'')+'>'+t+'</option>').join('')+'</select>';
 return '<tr><td>'+safe(a.date)+'</td><td>'+safe(label(a.partner)) +'</td><td>'+safe(channelLabel(a.channel))+'</td><td>'+safe(a.type)+'</td><td>'+select+'</td><td>'+material+'</td><td><input aria-label="Collab previsto" type="checkbox" data-collab-activity="'+safe(a.id)+'"'+(a.collab?' checked':'')+(a.type==='story'?' disabled':'')+'></td><td>'+number(a.qty)+'</td><td>'+money(a.revenue)+'</td><td>'+safe(a.source||'—')+'</td><td><button type="button" data-rm-activity="'+safe(a.id)+'" aria-label="Excluir registro">Excluir</button></td></tr>';
 }).join('');
renderMetrics();
}
function renderSocial(){$('socialRows').innerHTML=(state.social||[]).slice().reverse().map((a,i)=>'<tr><td>'+safe(a.date)+'</td><td>'+safe(label(a.partner))+'</td><td>'+safe(channelLabel(a.channel))+'</td><td>'+safe(a.scope==='post'?'Post específico':'Período')+'</td><td>'+number(a.followers)+'</td><td>'+number(a.reach)+'</td><td>'+number(a.visits)+'</td><td>'+safe(a.source||'—')+'</td><td><button type="button" data-rm-social="'+(state.social.length-1-i)+'">Excluir</button></td></tr>').join('');}
function render(){renderPartners();renderMissions();renderActivities();renderSocial();renderCalendar();renderReport();}
function renderCalendar(){
 const month=$('calendarMonth').value;
 const contents=(state.activities||[]).filter(x=>['story','reel','post'].includes(x.type)&&x.date?.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
 const labels={planejado:'Planejado',em_producao:'Produção',aguardando_autorizacao:'Autorização',pronto:'Pronto',agendado:'Agendado (manual)',publicado:'Publicado',confirmado:'Confirmado'};
 $('calendarRows').innerHTML=contents.map(x=>'<tr><td>'+safe(x.date)+'</td><td>'+safe(label(x.partner))+'</td><td>'+safe(x.type)+'</td><td>'+safe(labels[x.status]||'Planejado')+'</td><td>'+safe(x.collab?'Previsto · confirmar aceite':'Não')+'</td><td>'+safe(({pendente:'A solicitar',solicitado:'Solicitado',recebido:'Recebido',aprovado:'Autorizado'}[x.material])||'A solicitar')+'</td></tr>').join('');
 if(!contents.length)$('calendarRows').innerHTML='<tr><td colspan="6">Nenhum conteúdo registrado para este mês. Use o botão de rascunho editorial ou registre uma publicação em Entregas e vendas.</td></tr>';
 $('calendarTotal').textContent=contents.length+' conteúdo(s) · '+contents.filter(x=>x.status==='agendado').length+' registrado(s) como agendado(s) · '+contents.filter(x=>['publicado','confirmado'].includes(x.status)).length+' publicado(s).';
}
function generateMonthlyDraft(){
 const month=$('calendarMonth').value;if(!/^20\d{2}-\d{2}$/.test(month))return status('Selecione um mês válido.',true);
 const days=[2,4,6,9,11,13,16,18,20,23,25,27,28,29];
 const base=window.FUTTALENTO_SCHEDULE||[];
 let added=0;
 days.forEach((day,i)=>{
  const item=base[i%base.length];if(!item)return;
  const maxDay=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  const date=month+'-'+String(Math.min(day,maxDay)).padStart(2,'0');
  if(state.activities.some(x=>x.date===date&&x.partner===item.partner&&x.type===item.type))return;
  state.activities.push({id:'editorial-'+date+'-'+item.partner+'-'+item.type,date,partner:item.partner,type:item.type,status:'planejado',channel:'instagram-lucas',collab:item.type!=='story',material:'pendente',source:'',qty:1,revenue:0,note:item.note||'Pauta a produzir pela agência'});
  added++;
 });
 renderActivities();renderCalendar();status(added+' pauta(s) incluída(s) no mês como rascunho interno. Revise pacotes e autorizações e clique Salvar atualizações.');
}

async function fetchData(){
try{const response=await fetch('/api/sponsor-state',{credentials:'same-origin',cache:'no-store'});if(response.status===401){$('login').classList.remove('hidden');$('app').classList.add('hidden');return}
const raw=await response.json();if(!response.ok)throw Error(raw.error||'Falha ao carregar');
state={...defaults(),...raw.data,partners:raw.data.partners||{},missions:raw.data.missions||{},activities:raw.data.activities||[],social:raw.data.social||[]};ready=true;
$('login').classList.add('hidden');$('app').classList.remove('hidden');$('logout').classList.remove('hidden');
$('session').textContent='Acesso: '+raw.user+' · Última atualização: '+(state.updatedAt?new Date(state.updatedAt).toLocaleString('pt-BR'):'nenhum registro salvo');
render();
}catch(err){$('login').innerHTML='<div class="notice">O painel está temporariamente indisponível. '+safe(err.message)+'</div><a class="btn btn-outline" href="/sponsor/lucas/">Tentar novamente</a>';}
}
async function save(){
if(!ready)return;pullPartners();pullMissions();status('Salvando...');$('save').disabled=true;
try{const res=await fetch('/api/sponsor-state',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(state)}),reply=await res.json();if(!res.ok)throw Error(reply.error||'Erro ao salvar');state.updatedAt=reply.updatedAt;status('Salvo com sucesso em '+new Date(reply.updatedAt).toLocaleString('pt-BR'));renderMissions();renderMetrics()}
catch(err){status(err.message,true)}finally{$('save').disabled=false}
}

function renderReport(){
const id=$('reportPartner').value||'oze',p=state.partners[id]||{},events=(state.activities||[]).filter(x=>x.partner===id),snapshots=(state.social||[]).filter(x=>x.partner===id&&x.channel==='instagram-lucas'&&x.scope!=='post').sort((a,b)=>a.date.localeCompare(b.date));
const delivered=events.filter(x=>['story','reel','post'].includes(x.type)&&['publicado','confirmado'].includes(x.status));
const deliveries=delivered.filter(x=>x.channel==='instagram-lucas').reduce((n,x)=>n+(x.qty||1),0);
const deliveriesFutTalento=delivered.filter(x=>x.channel!=='instagram-lucas').reduce((n,x)=>n+(x.qty||1),0);
const coupons=events.filter(x=>['resgate','cupom'].includes(x.type)&&x.status==='confirmado').reduce((n,x)=>n+(x.qty||0),0);
const sales=events.filter(x=>x.type==='venda'&&x.status==='confirmado').reduce((n,x)=>n+(x.qty||0),0);
const value=events.filter(x=>x.type==='venda'&&x.status==='confirmado').reduce((n,x)=>n+(x.revenue||0),0);
const followerGain=snapshots.length>=2?snapshots[snapshots.length-1].followers-snapshots[0].followers:null;
const evidence=events.filter(x=>x.status==='confirmado'&&x.source).map(x=>'<li>'+safe(x.date)+' · '+safe(x.type)+' · '+safe(x.source)+'</li>').join('')||'<li>Sem comprovações confirmadas ainda.</li>';
$('reportContent').innerHTML='<div class="record"><span class="eyebrow">FutTalento Sponsor · Relatório de acompanhamento</span><h2>'+safe(label(id))+'</h2><p class="mini">Data: '+new Date().toLocaleDateString('pt-BR')+' · Atleta: Lucas Azambuja · Estado da parceria: '+(p.approved?'registrada como aprovada':'pendente de confirmação')+'</p><p><b>Modalidade:</b> '+safe(p.kind||'A confirmar')+'<br><b>Oferta:</b> '+safe(p.offer||'Não definida')+'<br><b>Cupom:</b> '+safe(p.coupon||'Não definido')+'<br><b>Período:</b> '+safe(p.validity||'Não definido')+'</p><div class="panels"><div class="metricbox"><small>Publicações no Instagram do Lucas</small><strong>'+number(deliveries)+'</strong></div><div class="metricbox"><small>Cupons/resgates</small><strong>'+number(coupons)+'</strong></div><div class="metricbox"><small>Compras confirmadas</small><strong>'+number(sales)+'</strong></div><div class="metricbox"><small>Vendas atribuídas</small><strong>'+money(value)+'</strong></div></div><p class="mini">Outras publicações no Instagram FutTalento: '+number(deliveriesFutTalento)+'. As contas não são confundidas.</p><h3>Instagram do Lucas / audiência do período</h3><p>Seguidores em data inicial: <b>'+(snapshots.length?number(snapshots[0].followers):'Sem dados')+'</b> · Última medição: <b>'+(snapshots.length?number(snapshots[snapshots.length-1].followers):'Sem dados')+'</b> · Variação observada: <b>'+(followerGain===null?'Sem série histórica':(followerGain>0?'+':'')+number(followerGain))+'</b></p><p class="mini">Variação total de seguidores não comprova que o crescimento veio de um post específico. Cliques e visitas originados de Stories/Reels dependerão de links instrumentados e integração GA4; visitas ao perfil do Instagram exigem Insights da conta autorizada.</p><h3>Cliques mensurados (últimos 30 dias)</h3><div id="liveCampaignCounts" class="mini">Consultando eventos consentidos...</div><h3>Comprovações</h3><ul>'+evidence+'</ul><p class="mini">Fonte de vendas: registro validado pelo comércio. Não representa lucro líquido, resultado causal ou retorno financeiro garantido. Este resumo não contém dados pessoais dos consumidores.</p></div>';
const selected=id;
fetch('/api/campaign-report?partner='+encodeURIComponent(selected),{credentials:'same-origin',cache:'no-store'})
.then(async response=>{if(!response.ok)throw Error('Medicao indisponivel');return response.json()})
.then(data=>{
 const target=$('liveCampaignCounts');if(!target||$('reportPartner').value!==selected)return;
 const n=data.counts||{},rows=(data.byCreative||[]).slice(0,8).map(x=>
  '<li>'+safe(x.campaign)+' / '+safe(x.creative)+' / '+safe(x.source)+' / '+safe(x.medium)+': '+number(x.landing_view)+' visitas, '+number(x.partner_click)+' cliques no parceiro, '+number(x.whatsapp_click)+' cliques WhatsApp</li>').join('');
 target.innerHTML='<p>Visitas consentidas: <b>'+number(n.landing_view||0)+'</b> · Cliques para a empresa: <b>'+number(n.partner_click||0)+'</b> · Cliques no WhatsApp rastreado: <b>'+number(n.whatsapp_click||0)+'</b></p>'+
 (data.truncated?'<p>Volume acima do limite do relatório piloto; totais parciais.</p>':'')+
 '<p>Cliques não comprovam novos seguidores, conversas nem vendas. WhatsApp só é contado quando existir link do parceiro identificado.</p>'+
 (rows?'<ul>'+rows+'</ul>':'');
}).catch(()=>{const target=$('liveCampaignCounts');if(target&&$('reportPartner').value===selected)target.textContent='Medição indisponível ou ainda não configurada.';});

}

function campaignUrl(){const medium=$('linkMedium').value,partner=$('reportPartner').value||'oze',campaign=($('linkCampaign').value||'futtalento').toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,60),creative=($('linkCreative').value||'publicacao-01').toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,60);return 'https://www.futtalento.com.br/apoiadores/lucas/?'+new URLSearchParams({partner,utm_source:$('linkChannel').value,utm_medium:medium,utm_campaign:campaign,utm_content:creative}).toString()}
async function signInTemporary(event){
  event.preventDefault();
  const passwordField=$('temporary-password');
  const feedback=$('password-feedback');
  const submit=$('temporary-login-button');
  const password=passwordField.value;
  if(!password){feedback.textContent='Informe a senha temporária.';return;}
  submit.disabled=true;feedback.style.color='#c9fc54';feedback.textContent='Conferindo acesso...';
  try{
    const result=await fetch('/api/sponsor-password',{
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password}),
      cache:'no-store'
    });
    const reply=await result.json();
    if(!result.ok)throw new Error(reply.error||'Não foi possível entrar');
    passwordField.value='';
    feedback.textContent='Acesso autorizado. Carregando painel...';
    await fetchData();
  }catch(error){
    feedback.style.color='#ffc7a1';
    feedback.textContent=error.message||'Falha de autenticação';
  }finally{
    submit.disabled=false;
  }
}
function init(){
const passwordLogin=$('password-login-form');
if(passwordLogin)passwordLogin.addEventListener('submit',signInTemporary);
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(ready){pullPartners();pullMissions()}setTab(b.dataset.tab)}));
$('save').addEventListener('click',save);
const syncLink=()=>$('campaignLink').textContent=campaignUrl();$('linkMedium').addEventListener('change',syncLink);$('linkChannel').addEventListener('change',syncLink);$('linkCreative').addEventListener('input',syncLink);$('reportPartner').addEventListener('change',syncLink);$('linkCampaign').addEventListener('input',syncLink);syncLink();
$('copyCampaign').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(campaignUrl());status('Link da campanha copiado.')}catch(e){status('Não foi possível copiar. Selecione o link exibido.',true)}});
$('adoptCalendar').addEventListener('click',generateMonthlyDraft);
$('calendarMonth').addEventListener('change',renderCalendar);
$('acPartner').innerHTML=partnerOptions();$('soPartner').innerHTML=partnerOptions();$('reportPartner').innerHTML=partnerOptions();$('reportPartner').addEventListener('change',()=>{pullPartners();renderReport()});$('printReport').addEventListener('click',()=>window.print());setToday();
$('addActivity').addEventListener('click',()=>{pullPartners();pullMissions();const type=$('acType').value,statusVal=$('acStatus').value,qty=Number($('acQty').value||0),revenue=Number($('acRevenue').value||0),source=$('acSource').value.trim();
if(!$('acDate').value||qty<0||revenue<0)return alert('Verifique data, quantidade e valor.');
if(['cupom','resgate','venda'].includes(type)&&statusVal==='confirmado'&&!source)return alert('Para confirmar venda ou cupom, inclua a fonte da comprovação.');
if(['story','reel','post'].includes(type)&&['publicado','confirmado'].includes(statusVal)&&!source)return alert('Para marcar publicação como realizada, informe um link ou referência verificável da entrega.');
state.activities.push({id:'a-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date:$('acDate').value,partner:$('acPartner').value,type,status:statusVal,qty,revenue,source,note:$('acNote').value.trim(),channel:$('acChannel').value,collab:($('acCollab').checked&&['post','reel'].includes(type)),material:$('acMaterial').value});
$('acSource').value='';$('acNote').value='';renderActivities();renderCalendar();renderReport();status('Registro adicionado; clique Salvar atualizações para persistir.')});
$('activityRows').addEventListener('click',e=>{const id=e.target.dataset.rmActivity;if(!id)return;state.activities=state.activities.filter(x=>x.id!==id);renderActivities();renderCalendar();renderReport();status('Exclusão pendente de salvar.')});
$('activityRows').addEventListener('change',e=>{const id=e.target.dataset.statusActivity||e.target.dataset.materialActivity||e.target.dataset.collabActivity;if(!id)return;const item=state.activities.find(x=>x.id===id);if(!item)return;if(e.target.dataset.statusActivity)item.status=e.target.value;if(e.target.dataset.materialActivity)item.material=e.target.value;if(e.target.dataset.collabActivity)item.collab=e.target.checked&&['post','reel'].includes(item.type);renderCalendar();renderMetrics();status('Etapa atualizada; clique Salvar atualizações para persistir.');});
$('addSocial').addEventListener('click',()=>{const s={date:$('soDate').value,partner:$('soPartner').value,followers:Number($('soFollowers').value),reach:Number($('soReach').value),visits:Number($('soVisits').value),source:$('soSource').value.trim(),channel:$('soChannel').value,
scope:$('soScope').value,postUrl:$('soPostUrl').value.trim()};
if(!s.date||!s.source||$('soReach').value.trim()===''||
  (s.scope==='periodo'&&$('soFollowers').value.trim()==='')||
  !Number.isFinite(s.reach)||s.reach<0||!Number.isFinite(s.followers)||s.followers<0)
 return alert('Informe data, alcance real, fonte e seguidores quando for um período da conta.');
if(s.scope==='post'&&!/^https:\/\/(www\.)?instagram\.com\//.test(s.postUrl))return alert('Para medir um post específico, inclua o permalink HTTPS do Instagram.');
state.social.push(s);renderSocial();renderReport();status('Insight adicionado; clique Salvar.')});
$('socialRows').addEventListener('click',e=>{const i=e.target.dataset.rmSocial;if(i===undefined)return;state.social.splice(Number(i),1);renderSocial();renderReport();status('Exclusão pendente de salvar.')});
fetchData();
}
init();
})();