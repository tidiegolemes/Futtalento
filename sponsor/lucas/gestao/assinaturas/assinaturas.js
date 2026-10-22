(()=>{
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>x?new Date(x).toLocaleDateString('pt-BR'):'—';
const status=o=>o.status==='active'&&Date.parse(o.activeUntil)>Date.now()?'Ativo':o.status==='active'?'Expirado':'Aguardando Pix';
async function load(){
 $('refresh').disabled=true;$('notice').textContent='Consultando registros...';
 try{
 const res=await fetch('/api/captacao-lead?pixCheckout=1&mode=admin',{credentials:'same-origin',cache:'no-store'});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao listar');
 $('orders').innerHTML=data.orders.length?data.orders.map(o=>'<tr><td><b>'+esc(o.company)+'</b><br>'+esc(o.name)+'</td><td>'+esc(o.athlete)+'</td><td>'+esc(o.plan)+'</td><td>R$ '+Number(o.amount||0).toFixed(2).replace('.',',')+'</td><td class="state '+(status(o)==='Ativo'?'active':'pending')+'">'+status(o)+'</td><td>'+date(o.paidAt)+' — '+date(o.activeUntil)+'</td><td>'+esc(o.phone)+'</td></tr>').join(''):'<tr><td colspan="7">Nenhuma cobrança registrada.</td></tr>';
 $('notice').textContent=data.orders.length+' cobrança(s) listada(s).'+(data.hasMore?' Pode haver outras páginas de histórico.':'');
 }catch(e){$('notice').textContent=e.message||'Falha na consulta';}
 finally{$('refresh').disabled=false}
}
async function testEfi(){
 const button=$('checkEfi'),out=$('efiStatus');button.disabled=true;out.textContent='Validando certificado e autenticação do Efí, sem criar cobrança...';
 try{
  const response=await fetch('/api/captacao-lead?pixCheckout=1&mode=health',{credentials:'same-origin',cache:'no-store'});
  const result=await response.json();
  if(response.status===403){out.textContent='Faça login como agência no painel principal e tente novamente.';return;}
  if(!result.ok){out.textContent='Conexão pendente ('+(result.step||'configuração')+'): '+(result.message||'Confira as variáveis protegidas na Vercel.')+(result.missing?.length?' · Pendências: '+result.missing.join(', '):'');return;}
  const scopeNotice=result.availableScopes?.length?' Escopos concedidos: '+result.availableScopes.join(', ')+'.':'';
  out.textContent='Certificado válido e OAuth Efí autenticado em '+(result.environment==='production'?'PRODUÇÃO':'homologação')+'. '+(result.chargesEnabled?'Cobranças habilitadas.':'Cobranças ainda bloqueadas por segurança.')+scopeNotice;
 }catch(e){out.textContent='Falha ao concluir o teste: '+(e.message||'indisponível')}
 finally{button.disabled=false}
}
$('checkEfi').addEventListener('click',testEfi);
$('refresh').addEventListener('click',load);load();
})();