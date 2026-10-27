(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
let rows=[],cursor=null,busy=false;
const statuses={novo:'Novo',contatado:'Contatado',qualificado:'Qualificado',encerrado:'Encerrado'};
const athlete={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
const label=x=>x==='empresa'?'Empresa':'Família';
function getDate(s){try{return new Date(s).toLocaleString('pt-BR')}catch{return '—'}}
function show(text){$('status').textContent=text}
function render(){
 const filter=$('filterAudience').value;
 const shown=rows.filter(x=>filter==='todos'||x.persona===filter);
 $('summary').innerHTML='<span><b>'+rows.length+'</b> contato(s) carregados</span><span><b>'+rows.filter(x=>x.persona==='familia').length+'</b> famílias</span><span><b>'+rows.filter(x=>x.persona==='empresa').length+'</b> empresas</span>';
 $('leads').innerHTML=shown.length?shown.map(l=>{
 const phone=String(l.whatsapp||'').replace(/\D/g,'');
 const url='https://wa.me/'+(phone.startsWith('55')?phone:'55'+phone)+'?text='+encodeURIComponent('Olá, '+String(l.nome||'').slice(0,45)+'! Aqui é a equipe FutTalento. Recebemos seu interesse pelo nosso site e gostaria de conversar sobre os próximos passos.');
 const origin=[l.origem?.utm_source,l.origem?.utm_medium,l.origem?.utm_campaign].filter(Boolean).map(esc).join(' / ')||'Não informado';
 const options=Object.entries(statuses).map(([v,t])=>'<option value="'+v+'"'+(l.status===v?' selected':'')+'>'+t+'</option>').join('');
 return '<article class="lead-card"><div class="lead-head"><div><h2>'+esc(l.nome)+'</h2><span class="tag">'+esc(label(l.persona))+'</span><span class="tag">'+esc(statuses[l.status]||l.status)+'</span></div><small>'+esc(getDate(l.createdAt))+'</small></div>'+
 '<p><b>Contato:</b> '+esc(l.whatsapp)+' · <b>Cidade:</b> '+esc(l.cidade||'Não informada')+'</p>'+
 (l.persona==='empresa'?'<p><b>Empresa:</b> '+esc(l.empresa||'—')+' · <b>Atleta de interesse:</b> '+esc(athlete[l.atletaInteresse]||'Aberto a conhecer')+'</p>':'')+
 (l.pacoteSolicitado?'<p><b>Proposta:</b> '+esc(l.pacoteSolicitado.nome)+' / R$ '+esc(l.pacoteSolicitado.valorReferenciaMensalBRL)+' mensais; pendente de acordo</p>':'')+
 (l.propostaPermuta?'<p><b>Permuta proposta:</b> '+esc(l.propostaPermuta.tipo)+' — '+esc(l.propostaPermuta.descricao)+' · <b>Situação:</b> Em avaliação; sem Pix ou contrato automático</p>':'')+
 '<p><b>Interesse:</b> '+esc(l.interesse||'—')+' · <b>Origem:</b> '+origin+'</p>'+
 '<div class="actions"><a href="'+url+'" target="_blank" rel="noopener noreferrer">Conversar pelo WhatsApp ↗</a>'+
 '<label>Situação <select data-key="'+esc(l.key)+'">'+options+'</select></label><button type="button" data-save="'+esc(l.key)+'">Salvar etapa</button></div></article>';
 }).join(''):'<div class="lead-card"><p>Nenhum contato nesta seleção.</p></div>';
 $('loadNext').hidden=!cursor;
}
async function load(reset=false){
 if(busy)return;busy=true;
 if(reset){rows=[];cursor=null;}
 $('refresh').disabled=true;show('Carregando contatos...');
 try{
  const url='/api/captacao-admin'+(cursor?'?cursor='+encodeURIComponent(cursor):'');
  const res=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(res.status===401){$('locked').hidden=false;$('inbox').hidden=true;show('Acesso restrito.');return;}
  const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível carregar.');
  rows.push(...data.leads.filter(x=>!rows.some(y=>y.key===x.key)));
  cursor=data.hasMore?data.cursor:null;
  $('locked').hidden=true;$('inbox').hidden=false;render();
  show('Lista atualizada. '+(cursor?'Há mais contatos para carregar.':'Todos os contatos desta consulta foram carregados.'));
 }catch(e){show(e.message||'Falha ao consultar.');}
 finally{busy=false;$('refresh').disabled=false;}
}
async function save(key,button){
 if(busy)return;
 const select=[...document.querySelectorAll('select[data-key]')].find(x=>x.dataset.key===key);
 if(!select)return;
 busy=true;button.disabled=true;show('Salvando etapa...');
 try{
  const res=await fetch('/api/captacao-admin',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,status:select.value})});
  const data=await res.json();if(!res.ok)throw Error(data.error||'Não foi possível salvar.');
  const lead=rows.find(x=>x.key===key);if(lead)lead.status=data.status;
  render();show('Etapa atualizada.');
 }catch(e){show(e.message||'Falha ao salvar.');}
 finally{busy=false;button.disabled=false;}
}

async function loadClaims(){
 const area=$('claims'),button=$('refreshClaims');
 button.disabled=true;area.textContent='Consultando solicitações...';
 try{
  const res=await fetch('/api/captacao-lead?onboarding=1&action=admin-claims',{
   credentials:'same-origin',cache:'no-store'});
  const data=await res.json();
  if(!res.ok||!data.ok)throw Error(data.error||'Consulta indisponível');
  area.replaceChildren();
  if(!data.claims.length){area.textContent='Nenhuma solicitação registrada.';return}
  for(const claim of data.claims){
   const article=document.createElement('article');article.className='lead-card';
   const heading=document.createElement('h3');
   heading.textContent=(claim.athleteName||claim.athlete||'Atleta')+' — '+(claim.status||'pendente');
   const who=document.createElement('p');
   who.textContent='Solicitante: '+(claim.guardianName||'')+' · WhatsApp: '+(claim.guardianPhone||'')+' · Data: '+getDate(claim.createdAt);
   article.append(heading,who);
   if(claim.status==='pending'){
    const review=document.createElement('label');
    review.style.display='flex';review.style.gap='9px';review.style.alignItems='start';
    const checkbox=document.createElement('input');checkbox.type='checkbox';
    review.append(checkbox,document.createTextNode('Conferi a responsabilidade legal e a autorização com documentação por canal seguro.'));
    const actions=document.createElement('div');actions.className='actions';
    for(const decision of [{name:'Aprovar vínculo',approved:true},{name:'Rejeitar',approved:false}]){
     const btn=document.createElement('button');btn.type='button';btn.textContent=decision.name;
     btn.addEventListener('click',async()=>{
      if(decision.approved&&!checkbox.checked){show('Antes de aprovar, confira e marque a verificação da documentação.');return}
      if(!window.confirm(decision.approved?'Confirma que conferiu a documentação e autoriza a gestão do perfil existente?':'Rejeitar esta solicitação?'))return;
      btn.disabled=true;
      try{
       const response=await fetch('/api/captacao-lead?onboarding=1&action=admin-claim-review',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:claim.id,athlete:claim.athlete,approved:decision.approved,evidenceReviewed:checkbox.checked})
       });
       const result=await response.json();
       if(!response.ok||!result.ok)throw Error(result.error||'Falha na análise');
       show('Solicitação atualizada: '+result.status);await loadClaims();
      }catch(e){show(e.message||'Falha ao registrar decisão');btn.disabled=false}
     });
     actions.append(btn);
    }
    article.append(review,actions);
   }
   area.append(article);
  }
 }catch(e){area.textContent=e.message||'Não foi possível consultar solicitações'}
 finally{button.disabled=false}
}
$('refreshClaims').addEventListener('click',loadClaims);
$('leads').addEventListener('click',e=>{const btn=e.target.closest('button[data-save]');if(btn)save(btn.dataset.save,btn);});
$('filterAudience').addEventListener('change',render);
$('loadNext').addEventListener('click',()=>load(false));
$('refresh').addEventListener('click',()=>load(true));
load(true);
loadClaims();
})();