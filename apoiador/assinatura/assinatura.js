(()=>{'use strict';
const $=s=>document.getElementById(s),p=new URLSearchParams(location.search),id=p.get('pedido'),token=p.get('acesso');
const date=v=>new Date(v).toLocaleDateString('pt-BR');
const currency=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function error(message){$('feedback').className='error';$('feedback').textContent=message;}
async function load(){
if(!/^[a-f0-9]{32}$/.test(id||'')||!/^[a-f0-9]{64}$/.test(token||'')){error('Este endereço não contém um acesso privado válido. Abra o painel pelo botão do checkout pago ou solicite à EyAgência um novo link. Não é necessário pagar novamente.');return;}
try{
const url='/api/captacao-lead?pixCheckout=1&mode=supporter&id='+encodeURIComponent(id)+'&token='+encodeURIComponent(token);
const r=await fetch(url,{cache:'no-store',credentials:'same-origin'}),a=await r.json();
if(!r.ok||!a.ok)throw Error(a.error||'Não foi possível abrir o painel.');
const o=a.plan;
$('planName').textContent=o.name;$('company').textContent=o.company;$('athlete').textContent='Atleta: '+o.athlete;
$('payment').textContent='Valor pago: '+currency(o.amount);
$('until').textContent='Vigência: '+date(o.startedAt)+' a '+date(o.activeUntil);
const ul=$('deliverables');ul.replaceChildren();for(const item of o.deliverables){const li=document.createElement('li');li.textContent=item;ul.append(li);}
$('app').hidden=false;$('feedback').textContent='Pagamento confirmado pelo Efí. Seu plano está ativo.';
}catch(e){error(e.message||'Falha ao consultar a assinatura.');}
}
load();
})();