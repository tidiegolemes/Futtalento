(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const partner=id=>({oze:'Barbearia do Oze',didi:'Bolos da Didi',guimaraes:'Guimarães Brasil',realgaucho:'Real Gaúcho Futsal'}[id]||'Parceiro');
const status=s=>({awaiting_review:'Aguardando a Juliana',approved:'Aprovado pela família',needs_changes:'Precisa de ajuste'}[s]||s);
let family=null,role=null;
const feedback=t=>$('fdMessage').textContent=t;
async function load(){
 const r=await fetch('/api/family-state',{credentials:'same-origin',cache:'no-store'});
 if(!r.ok)throw new Error('É necessário entrar com a conta administrativa.');
 const result=await r.json();
 if(result.role!=='agency')throw new Error('Somente administradores podem gerenciar os conteúdos.');
 family=result.data;role=result.role;render();
}
async function action(payload){
 if(!family)return;
 const body={...payload,revision:family.revision};
 const r=await fetch('/api/family-state',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await r.json();
 if(!r.ok)throw new Error(result.error||'Falha ao atualizar.');
 await load();
}
function render(){
 $('fdDrafts').innerHTML=family.drafts.length?family.drafts.slice().reverse().map(d=>{
 const edit=d.status==='needs_changes'?'<div class="record" data-draft-edit="'+esc(d.id)+'"><label>Nova legenda corrigida</label><textarea data-edit-caption>'+esc(d.caption)+'</textarea><label>Link HTTPS da nova prévia</label><input type="url" data-edit-preview value="'+esc(d.previewUrl||'')+'"><div class="actions"><button type="button" class="btn btn-primary" data-save-edit="'+esc(d.id)+'">Salvar ajustes e reenviar</button></div></div>':'';
 return '<article class="sponsor"><span class="role">'+esc(status(d.status))+'</span><h3>'+esc(d.title)+'</h3><p>'+esc(partner(d.partner))+' · '+esc(d.format)+' · '+esc(d.date)+'</p><p>'+esc(d.caption)+'</p>'+(d.previewUrl?'<a href="'+esc(d.previewUrl)+'" target="_blank" rel="noopener noreferrer" class="link">Ver prévia ↗</a>':'<p class="mini">Sem link de prévia anexado</p>')+(d.familyNote?'<p class="notice">Observação da família: '+esc(d.familyNote)+'</p>':'')+edit+'</article>';
 }).join(''):'<p class="mini">Nenhuma peça foi enviada para aprovação. Prepare o primeiro Story acima.</p>';
 $('fdBenefits').innerHTML=family.benefits.length?family.benefits.slice().reverse().map(b=>'<div class="task"><div style="flex:1"><b>'+esc(partner(b.partner))+' — '+esc(b.description)+'</b><small>'+esc(b.date)+' · '+(b.verification==='verified_by_agency'?'Validado pela agência':'Informado pela família — verificar')+'</small></div>'+(b.verification!=='verified_by_agency'?'<button class="btn btn-outline" data-verify="'+esc(b.id)+'">Confirmar recebimento</button>':'')+'</div>').join(''):'<p class="mini">Nenhum benefício recebido foi informado.</p>';
 $('fdHelp').innerHTML=family.help.length?family.help.slice().reverse().map(h=>'<div class="task"><div style="flex:1"><b>'+esc(h.message)+'</b><small>'+esc(new Date(h.createdAt).toLocaleDateString('pt-BR'))+' · '+(h.status==='resolved'?'Resolvido':'Aguardando atendimento')+'</small></div>'+(h.status!=='resolved'?'<button class="btn btn-outline" data-resolve="'+esc(h.id)+'">Marcar atendido</button>':'')+'</div>').join(''):'<p class="mini">Nenhuma solicitação de ajuda.</p>';
}
async function submit(){
 const payload={action:'staff_draft',title:$('fdTitle').value.trim(),caption:$('fdCaption').value.trim(),date:$('fdDate').value,partner:$('fdPartner').value,format:$('fdFormat').value,previewUrl:$('fdPreview').value.trim()};
 if(!payload.title||!payload.caption||!payload.date||!payload.previewUrl){feedback('Preencha título, legenda, data e link da prévia visual.');return;}
 $('fdCreate').disabled=true;feedback('Preparando missão...');
 try{await action(payload);$('fdTitle').value='';$('fdCaption').value='';$('fdPreview').value='';feedback('Publicação enviada para aprovação da Juliana.');}
 catch(e){feedback(e.message||'Não foi possível salvar.');}finally{$('fdCreate').disabled=false}
}
function start(){
 const now=new Date(),iso=new Date(now-Date.now()%86400000-now.getTimezoneOffset()*60000).toISOString().slice(0,10);$('fdDate').value=iso;
 $('fdCreate').addEventListener('click',submit);
 $('fdDrafts').addEventListener('click',async e=>{const id=e.target?.dataset?.saveEdit;if(!id)return;const item=e.target.closest('[data-draft-edit]');if(!item)return;const caption=item.querySelector('[data-edit-caption]').value.trim(),previewUrl=item.querySelector('[data-edit-preview]').value.trim();try{await action({action:'staff_edit_draft',draftId:id,caption,previewUrl});feedback('Peça corrigida e reenviada para aprovação da família.');}catch(err){feedback(err.message)}});
 $('fdBenefits').addEventListener('click',async e=>{const id=e.target?.dataset?.verify;if(!id)return;try{await action({action:'staff_verify_benefit',benefitId:id,verified:true});feedback('Benefício validado.');}catch(err){feedback(err.message)}});
 $('fdHelp').addEventListener('click',async e=>{const id=e.target?.dataset?.resolve;if(!id)return;try{await action({action:'staff_resolve_help',helpId:id});feedback('Atendimento concluído.');}catch(err){feedback(err.message)}});
 document.querySelector('[data-tab="familia"]').addEventListener('click',()=>{load().catch(e=>feedback(e.message))});
}
start();
})();