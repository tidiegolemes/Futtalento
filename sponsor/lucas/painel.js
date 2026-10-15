(()=>{
'use strict';
const partnerCatalog=[
{id:'guimaraes',name:'Guimarães Brasil',type:'Parceria divulgada no site oficial',link:'https://www.instagram.com/guimaraes.brasil/'},
{id:'didi',name:'Bolos da Didi',type:'Parceria divulgada · confirmar permuta',link:'https://www.instagram.com/bolos_da_didi/'},
{id:'oze',name:'Barbearia do Oze',type:'Parceria divulgada · confirmar cortes',link:'https://www.instagram.com/barbeariadooze/'},
{id:'realgaucho',name:'Real Gaúcho Futsal',type:'Formação complementar · não presumir patrocínio comercial',link:'https://www.instagram.com/realgauchofutsal/'}
];
const tasks=[
['family_consent','Juliana','Revisar autorizações para imagens e comunicações publicitárias envolvendo o Lucas','Antes da 1ª entrega'],
['confirm_brands','Juliana','Confirmar contratos, nomes oficiais e natureza de cada parceiro','Semana 1'],
['follow_partners','Juliana','Seguir as contas dos parceiros na conta adulta responsável, se desejar','Semana 1'],
['confirm_permutas','Agência + Juliana','Documentar produtos, serviços, quantidades e custos econômicos de cada permuta','Semana 1'],
['create_coupons','Agência + Comércio','Definir um cupom exclusivo por parceiro, condicionado à aprovação do estabelecimento','Semana 1'],
['offers','Comércio','Aprovar oferta exclusiva, condições, elegibilidade e data de validade','Semana 1'],
['baseline','Agência','Registrar seguidores, alcance e visitas das contas profissionais autorizadas antes das ações','Semana 1'],
['briefing','Agência','Preparar roteiros e pedir aprovação das peças antes da publicação','Toda semana'],
['reel1','Agência','Publicar 1 Reel semanal de projeto/parceiros, com identificação de publicidade quando necessário','Semanal'],
['story1','Agência','Publicar 2 Stories semanais no total, distribuindo os parceiros','Semanal'],
['carousel','Agência','Publicar 1 carrossel quinzenal de jornada ou reconhecimento de parceiros','Quinzenal'],
['proof','Comércio','Validar resgates, pedidos e vendas com código sem dados pessoais do consumidor','Quinzenal'],
['insights','Agência','Capturar métricas de Instagram pelo mesmo intervalo de datas','Quinzenal'],
['report','Agência','Fechar relatório de 30 dias com desempenho, entregas e limitações','Mensal'],
['renewals','Agência','Solicitar feedback e proposta de renovação de cada parceria','Mensal'],
['giveaways','Agência','Submeter qualquer ideia de sorteio a análise jurídica e regulamento antes de anunciar','Antes de qualquer sorteio']
];
const defaults=()=>({partners:{},missions:{},activities:[],social:[],updatedAt:null});
let state=defaults(),ready=false;
const $=id=>document.getElementById(id);
const safe=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const label=id=>partnerCatalog.find(x=>x.id===id)?.name||'Não identificado';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number=v=>Number(v||0).toLocaleString('pt-BR');
const partnerOptions=()=>partnerCatalog.map(p=>'<option value="'+p.id+'">'+safe(p.name)+'</option>').join('');
function status(message,bad=false){$('saveStatus').textContent=message;$('saveStatus').style.color=bad?'#ffb9a1':'#c9fc54';}
function setTab(id){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===id)));document.querySelectorAll('.sectionpanel').forEach(s=>s.classList.toggle('active',s.id==='tab-'+id));}
function setToday(){const t=new Date(),d=new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,10);$('acDate').value=d;$('soDate').value=d;}
function renderPartners(){
$('partners').innerHTML=partnerCatalog.map(p=>{const x=state.partners[p.id]||{};return '<article class="sponsor" data-partner="'+p.id+'"><span class="eyebrow">Parceiro cadastrado</span><h3>'+safe(p.name)+'</h3><p>'+safe(p.type)+' · <a class="link" href="'+p.link+'" target="_blank" rel="noopener noreferrer">Perfil público ↗</a></p><label>Natureza do apoio</label><select data-key="kind"><option value="">A confirmar</option><option value="permuta">Permuta</option><option value="financeiro">Patrocínio financeiro</option><option value="institucional">Apoio institucional</option><option value="formacao">Formação esportiva</option></select><label>Oferta exclusiva / benefício</label><textarea data-key="offer" placeholder="Somente oferta aprovada pelo parceiro">'+safe(x.offer||'')+'</textarea><label>Cupom definido com a empresa</label><input data-key="coupon" maxlength="60" value="'+safe(x.coupon||'')+'" placeholder="Sem cupom aprovado"><label>Validade e regras</label><input data-key="validity" value="'+safe(x.validity||'')+'" placeholder="Período, lojas participantes, limites"><label>Frequência de posts acordada</label><input data-key="frequency" value="'+safe(x.frequency||'')+'" placeholder="Ex.: 1 Story/mês"><label>Observações e comprovações</label><textarea data-key="notes" placeholder="Tipo de permuta, responsável pela validação...">'+safe(x.notes||'')+'</textarea><label><input data-key="approved" type="checkbox" '+(x.approved?'checked':'')+'> Condições aprovadas pelo parceiro/responsável</label></article>'}).join('');
document.querySelectorAll('[data-partner]').forEach(card=>{const id=card.dataset.partner,select=card.querySelector('[data-key=kind]');select.value=state.partners?.[id]?.kind||'';});
}
function pullPartners(){document.querySelectorAll('[data-partner]').forEach(card=>{const obj={};card.querySelectorAll('[data-key]').forEach(f=>obj[f.dataset.key]=f.type==='checkbox'?f.checked:f.value);state.partners[card.dataset.partner]=obj;});}
function renderMissions(){
$('tasks').innerHTML=tasks.map(([id,who,desc,when])=>'<label class="task"><input type="checkbox" data-mission="'+id+'" '+(state.missions?.[id]?.done?'checked':'')+'><span><b>'+safe(desc)+'</b><small>Responsável: '+safe(who)+' · '+safe(when)+'</small></span></label>').join('');
$('nextTasks').innerHTML=tasks.filter(t=>!state.missions?.[t[0]]?.done).slice(0,5).map(t=>'<div class="task"><span>○</span><span><b>'+safe(t[2])+'</b><small>'+safe(t[1])+' · '+safe(t[3])+'</small></span></div>').join('')||'<p class="mini">Todas as missões iniciais foram marcadas como concluídas.</p>';
}
function pullMissions(){document.querySelectorAll('[data-mission]').forEach(el=>state.missions[el.dataset.mission]={done:el.checked});}
function renderMetrics(){
let delivered=0,coupons=0,sales=0,revenue=0;
for(const a of state.activities||[]){if(['post','reel','story'].includes(a.type)&&['publicado','confirmado'].includes(a.status))delivered+=a.qty||1;if(['cupom','resgate'].includes(a.type)&&a.status==='confirmado')coupons+=a.qty||0;if(a.type==='venda'&&a.status==='confirmado'){sales+=a.qty||0;revenue+=a.revenue||0;}}
$('met-deliveries').textContent=number(delivered);$('met-coupons').textContent=number(coupons);$('met-sales').textContent=number(sales);$('met-revenue').textContent=money(revenue);
}
function renderActivities(){
$('activityRows').innerHTML=(state.activities||[]).slice().reverse().map(a=>'<tr><td>'+safe(a.date)+'</td><td>'+safe(label(a.partner))+'</td><td>'+safe(a.type)+'</td><td>'+safe(a.status)+'</td><td>'+number(a.qty)+'</td><td>'+money(a.revenue)+'</td><td>'+safe(a.source||'—')+'</td><td><button type="button" data-rm-activity="'+safe(a.id)+'" aria-label="Excluir registro">Excluir</button></td></tr>').join('');
renderMetrics();
}
function renderSocial(){$('socialRows').innerHTML=(state.social||[]).slice().reverse().map((a,i)=>'<tr><td>'+safe(a.date)+'</td><td>'+safe(label(a.partner))+'</td><td>'+number(a.followers)+'</td><td>'+number(a.reach)+'</td><td>'+number(a.visits)+'</td><td>'+safe(a.source||'—')+'</td><td><button type="button" data-rm-social="'+(state.social.length-1-i)+'">Excluir</button></td></tr>').join('');}
function render(){renderPartners();renderMissions();renderActivities();renderSocial();renderCalendar();}
function renderCalendar(){const rows=window.FUTTALENTO_SCHEDULE||[];$('calendarRows').innerHTML=rows.map(x=>'<tr><td>'+safe(x.date)+'</td><td>'+safe(label(x.partner))+'</td><td>'+safe(x.type)+'</td><td>'+safe(x.note)+'</td></tr>').join('');}
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
function init(){
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{if(ready){pullPartners();pullMissions()}setTab(b.dataset.tab)}));
$('save').addEventListener('click',save);
$('adoptCalendar').addEventListener('click',()=>{const list=window.FUTTALENTO_SCHEDULE||[];const current=new Set(state.activities.map(x=>x.id));let added=0;for(const x of list){const id='calendar-'+x.date+'-'+x.partner+'-'+x.type;if(current.has(id))continue;state.activities.push({...x,id,status:'planejado',source:'',qty:1,revenue:0});added++;}renderActivities();status(added+' ações planejadas adicionadas. Clique em Salvar atualizações.');});
$('acPartner').innerHTML=partnerOptions();$('soPartner').innerHTML=partnerOptions();setToday();
$('addActivity').addEventListener('click',()=>{pullPartners();pullMissions();const type=$('acType').value,statusVal=$('acStatus').value,qty=Number($('acQty').value||0),revenue=Number($('acRevenue').value||0),source=$('acSource').value.trim();
if(!$('acDate').value||qty<0||revenue<0)return alert('Verifique data, quantidade e valor.');
if(['cupom','resgate','venda'].includes(type)&&statusVal==='confirmado'&&!source)return alert('Para confirmar venda ou cupom, inclua a fonte da comprovação.');
state.activities.push({id:'a-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),date:$('acDate').value,partner:$('acPartner').value,type,status:statusVal,qty,revenue,source,note:$('acNote').value.trim()});
$('acSource').value='';$('acNote').value='';renderActivities();status('Registro adicionado; clique Salvar atualizações para persistir.')});
$('activityRows').addEventListener('click',e=>{const id=e.target.dataset.rmActivity;if(!id)return;state.activities=state.activities.filter(x=>x.id!==id);renderActivities();status('Exclusão pendente de salvar.')});
$('addSocial').addEventListener('click',()=>{const s={date:$('soDate').value,partner:$('soPartner').value,followers:Number($('soFollowers').value),reach:Number($('soReach').value),visits:Number($('soVisits').value),source:$('soSource').value.trim()};
if(!s.date||!s.source||!Number.isFinite(s.followers)||s.followers<0)return alert('Informe data, dados válidos e a fonte real.');
state.social.push(s);renderSocial();status('Insight adicionado; clique Salvar.')});
$('socialRows').addEventListener('click',e=>{const i=e.target.dataset.rmSocial;if(i===undefined)return;state.social.splice(Number(i),1);renderSocial();status('Exclusão pendente de salvar.')});
fetchData();
}
init();
})();