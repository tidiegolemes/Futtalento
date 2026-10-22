(()=>{
'use strict';
const $=id=>document.getElementById(id);
const plans={'primeiro-passe':9900,'time-titular':24900,'camisa-10':49900};
const params=new URLSearchParams(location.search);
const athlete=String(params.get('atleta')||'lucas'),plan=String(params.get('plano')||'primeiro-passe');
if(['lucas','ryan','thalles'].includes(athlete))$('athlete').value=athlete;
if(plans[plan])$('plan').value=plan;
let id=params.get('pedido'),token=params.get('acesso'),poll=null;
const money=n=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function price(){$('price').innerHTML=money(plans[$('plan').value])+' <span>primeiros 30 dias</span>';}
$('plan').addEventListener('change',price);price();
function err(msg){$('message').textContent=msg||'';}
function show(data){
 const o=data.order;
 $('intro').hidden=true;$('pixPanel').hidden=false;
 $('plan').value=o.plan;$('athlete').value=Object.keys({lucas:1,ryan:1,thalles:1}).find(k=>({lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'}[k])===o.athlete)||'lucas';
 $('plan').disabled=true;$('athlete').disabled=true;price();
 $('copyValue').textContent=o.pix?.copyPaste||'';
 const link=$('payLink');link.hidden=!o.pix?.link;if(o.pix?.link)link.href=o.pix.link;
 $('expires').textContent=o.pix?.expiresAt?'Pix vence em: '+new Date(o.pix.expiresAt).toLocaleString('pt-BR'):'';
 if(o.status==='active'||o.status==='expired'){
  $('state').textContent=o.status==='active'?'Pagamento confirmado · Ativo':'Plano vencido · renovar com novo Pix';$('pixDetails').hidden=true;$('refresh').hidden=true;
  $('active').hidden=false;$('activeText').textContent='Plano '+o.planTitle+' para '+o.athlete+(o.status==='active'?' ativo até ':' encerrado em ')+new Date(o.activeUntil).toLocaleDateString('pt-BR')+'.';
  $('paidMessage').textContent='A confirmação foi verificada diretamente no Efí Bank.';
  if(poll){clearInterval(poll);poll=null;}
 }else{
  $('state').textContent='Aguardando confirmação do Pix';
  $('paidMessage').textContent='Não saia da página até confirmar, ou salve este endereço para consultar novamente.';
  if(!poll)poll=setInterval(check,9000);
 }
}
async function check(){
 if(!id||!token)return;
 $('refresh').disabled=true;
 try{const res=await fetch('/api/checkout-futtalento?id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token),{cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível verificar');show(data)}
 catch(e){$('paidMessage').textContent=e.message||'Consulta indisponível, tente novamente.'}
 finally{$('refresh').disabled=false}
}
$('refresh').addEventListener('click',check);
$('copyButton').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('copyValue').textContent);$('copyButton').textContent='Código copiado!'}catch(e){$('paidMessage').textContent='Selecione e copie o código exibido.';}});
$('form').addEventListener('submit',async event=>{
 event.preventDefault();err('');const button=$('pay');button.disabled=true;button.textContent='Preparando Pix...';
 const body={athlete:$('athlete').value,plan:$('plan').value,name:$('name').value,company:$('company').value,phone:$('phone').value,consent:$('consent').checked};
 try{
 const res=await fetch('/api/checkout-futtalento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json();if(!res.ok||!data.ok)throw Error(data.error||'Falha ao preparar Pix');
 id=data.order.id;token=data.token;
 history.replaceState(null,'','/checkout/?pedido='+id+'&acesso='+token);
 show(data);
 }catch(e){err(e.message||'Não foi possível emitir a cobrança.')}finally{button.disabled=false;button.textContent='Gerar Pix para o plano'}
});
if(id&&token)check();
})();