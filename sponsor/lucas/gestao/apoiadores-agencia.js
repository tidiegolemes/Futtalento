(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={oze:'Barbearia do Oze',didi:'Bolos da Didi',guimaraes:'Guimarães Brasil',realgaucho:'Real Gaúcho Futsal'};
const formatMoney=x=>Number(x||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const statuses={pending:'Aguardando validação',approved:'Aprovado',needs_changes:'Solicitada alteração',verified:'Confirmado',rejected:'Recusado'};
let selected='oze',state=null,loading=false;
const note=t=>$('partnerManagementStatus').textContent=t;
async function load(){
if(loading)return;loading=true;note('Carregando registros do parceiro...');
try{
selected=$('partnerManagementSelect').value;
$('partnerPreviewLink').href='/apoiador/?parceiro='+encodeURIComponent(selected);
const res=await fetch('/api/partner-state?partner='+encodeURIComponent(selected),{credentials:'same-origin',cache:'no-store'});
const json=await res.json();
if(!res.ok)throw Error(json.error||'Não foi possível consultar o parceiro');
if(json.role!=='agency')throw Error('Este painel requer permissão de administrador');
state=json.data;render();note('Informações atualizadas em '+new Date().toLocaleTimeString('pt-BR'));
}catch(e){$('partnerManagementBody').innerHTML='<div class="record"><p>'+esc(e.message||'Falha')+'</p></div>';note(e.message);}
finally{loading=false}
}
async function change(action,payload={}){
if(!state)return;
const res=await fetch('/api/partner-state',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},cache:'no-store',
body:JSON.stringify({...payload,action,partner:selected,revision:state.revision})});
const json=await res.json();
if(!res.ok)throw Error(json.error||'Não foi possível salvar');
await load();
}
function render(){
const offer=state.offer;
let html='<div class="sponsor"><span class="kicker">Oferta proposta</span><h3>'+esc(names[selected])+'</h3>';
if(!offer)html+='<p>O estabelecimento ainda não apresentou oferta ou cupom.</p>';
else{
 html+='<p><b>Tipo de apoio:</b> '+esc(offer.support)+'</p><p><b>Oferta ao público:</b> '+esc(offer.offer)+'</p><p><b>Regras e validade:</b> '+esc(offer.validity)+'</p><p><b>Código:</b> '+esc(offer.coupon||'Não definido')+'</p>';
 html+='<p><b>Situação:</b> '+esc(statuses[offer.status]||offer.status)+'</p>';
 if(offer.status==='pending')html+='<div class="actions"><button class="btn btn-primary" data-offer-action="approved">Aprovar oferta</button><button class="btn btn-outline" data-offer-action="needs_changes">Pedir ajuste</button></div>';
 if(offer.status==='needs_changes')html+='<p class="mini">Observação enviada: '+esc(offer.reviewNote||'Sem observação')+'</p>';
}
html+='</div><h3 style="margin:25px 0 14px">Vendas, cupons e entregas informadas</h3>';
if(!state.results?.length)html+='<div class="record"><p>Nenhum resultado informado por este apoiador até agora.</p></div>';
else html+='<div class="sponsors">'+state.results.slice().reverse().map(x=>'<article class="sponsor"><h3>'+esc({compra:'🛍️ Compra',cupom:'🎟️ Cupom',permuta:'🎁 Apoio entregue'}[x.type]||x.type)+'</h3><p>'+esc(x.date)+' · '+esc(String(x.qty))+' registro(s)</p>'+(x.type==='compra'?'<p><b>Faturamento declarado:</b> '+formatMoney(x.amount)+'</p>':'')+'<p><b>Comprovação:</b> '+esc(x.reference)+'</p><p><b>Situação:</b> '+esc(statuses[x.status]||x.status)+'</p>'+(x.status==='pending'?'<div class="actions"><button class="btn btn-primary" data-result-action="verified" data-result-id="'+esc(x.id)+'">Confirmar após conferir</button><button class="btn btn-outline" data-result-action="rejected" data-result-id="'+esc(x.id)+'">Solicitar correção</button></div>':'')+(x.reviewNote?'<p class="mini">'+esc(x.reviewNote)+'</p>':'')+'</article>').join('')+'</div>';
html+='<h3 style="margin:25px 0 14px">Solicitações de ajuda</h3>';
html+=(state.help?.length?'<div class="sponsors">'+state.help.slice().reverse().map(h=>'<div class="sponsor"><p>'+esc(h.message)+'</p><small>'+esc(h.status==='resolved'?'Resolvida':'Aguardando retorno')+'</small>'+(h.status!=='resolved'?'<div class="actions"><button class="btn btn-outline" data-help-id="'+esc(h.id)+'">Marcar atendida</button></div>':'')+'</div>').join('')+'</div>':'<p class="mini">Nenhum pedido de ajuda pendente.</p>');
$('partnerManagementBody').innerHTML=html;
}
async function handleClick(e){
const b=e.target.closest('button');if(!b||loading)return;
const offerDecision=b.dataset.offerAction,resDecision=b.dataset.resultAction,id=b.dataset.resultId,helpId=b.dataset.helpId;
if(!offerDecision&&!resDecision&&!helpId)return;
b.disabled=true;note('Salvando...');
try{
if(offerDecision){
 const noteText=offerDecision==='needs_changes'?(prompt('Que ajuste você pede à empresa? (sem dados de clientes)')||''):'';
 if(offerDecision==='needs_changes'&&!noteText.trim()){note('Escreva o motivo antes de solicitar ajuste.');return;}
 await change('agency_review_offer',{decision:offerDecision,reviewNote:noteText});
}else if(resDecision){
 const noteText=resDecision==='rejected'?(prompt('O que precisa ser corrigido?')||''):'';
 if(resDecision==='rejected'&&!noteText.trim()){note('Informe o motivo para a empresa.');return;}
 if(resDecision==='verified'&&!confirm('Você já conferiu a comprovação no sistema do estabelecimento? Este registro será marcado como validado.'))return;
 await change('agency_review_result',{resultId:id,decision:resDecision,reviewNote:noteText});
}else if(helpId)await change('agency_resolve_help',{helpId});
note('Revisão registrada. A empresa verá a atualização no painel.');
}catch(error){note(error.message||'Não foi possível atualizar');}
finally{b.disabled=false;}
}
$('partnerManagementBody').addEventListener('click',handleClick);
$('partnerManagementSelect').addEventListener('change',()=>load());
$('partnerRefresh').addEventListener('click',()=>load());
document.querySelector('[data-tab="apoiadores"]')?.addEventListener('click',()=>load());
})();