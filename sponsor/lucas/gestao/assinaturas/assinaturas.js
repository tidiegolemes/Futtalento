(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>x?new Date(x).toLocaleDateString('pt-BR'):'—';
const status=o=>o.status==='active'&&Date.parse(o.activeUntil)>Date.now()?'Ativo':o.status==='active'?'Expirado':'Aguardando Pix';
async function load(){
 $('refresh').disabled=true;$('notice').textContent='Consultando registros...';
 try{
 const res=await fetch('/api/checkout-futtalento?mode=admin',{credentials:'same-origin',cache:'no-store'});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao listar');
 $('orders').innerHTML=data.orders.length?data.orders.map(o=>'<tr><td><b>'+esc(o.company)+'</b><br>'+esc(o.name)+'</td><td>'+esc(o.athlete)+'</td><td>'+esc(o.plan)+'</td><td>R$ '+Number(o.amount||0).toFixed(2).replace('.',',')+'</td><td class="state '+(status(o)==='Ativo'?'active':'pending')+'">'+status(o)+'</td><td>'+date(o.paidAt)+' — '+date(o.activeUntil)+'</td><td>'+esc(o.phone)+'</td></tr>').join(''):'<tr><td colspan="7">Nenhuma cobrança registrada.</td></tr>';
 $('notice').textContent=data.orders.length+' cobrança(s) listada(s).'+(data.hasMore?' Pode haver outras páginas de histórico.':'');
 }catch(e){$('notice').textContent=e.message||'Falha na consulta';}
 finally{$('refresh').disabled=false}
}
$('refresh').addEventListener('click',load);load();
})();