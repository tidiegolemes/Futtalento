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
const missionDefs=[
{id:'confirm_partners',title:'Conhecer os apoiadores',short:'Veja quem está nessa jornada.',description:'Conheça as marcas e projetos que acompanham o Lucas. Não precisa comprar nada nem seguir ninguém para concluir.',icon:'🤝',time:'1 minuto',link:'/apoiadores/lucas/',linkLabel:'Conhecer apoiadores'},
{id:'send_photo',title:'Enviar uma foto do treino',short:'Uma foto ou vídeo já ajuda!',description:'Escolha uma foto ou vídeo recente do treino, que você autorize utilizar, e envie à equipe pelo WhatsApp. Nós cuidamos da edição.',icon:'📸',time:'2 minutos',link:'https://wa.me/554832200260?text=Ol%C3%A1%21%20Sou%20a%20respons%C3%A1vel%20pelo%20Lucas%20e%20quero%20enviar%20uma%20foto%20ou%20v%C3%ADdeo%20para%20a%20jornada%20FutTalento.',linkLabel:'Enviar pelo WhatsApp'},
{id:'review_benefits',title:'Conferir os apoios',short:'Veja os benefícios combinados.',description:'Confira se os apoiadores estão corretos. Quando algum apoio for recebido, você poderá registrá-lo com dois toques.',icon:'🎁',time:'1 minuto',link:'#conquistas',linkLabel:'Ver nossos apoios'}
];
const todayISO=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const partner=id=>catalog.find(x=>x.id===id)||{name:'Parceiro',icon:'🤝'};
let state=null,role='family',activeView='hoje',installPrompt=null,busy=false;
const feedback=(text,bad=false)=>{const node=$('appFeedback');node.textContent=text||'';node.style.color=bad?'#9e2f29':'#386a55'};
const done=id=>state?.missions?.[id]?.done===true;
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
async function act(action,payload={},success='Pronto! Sua missão foi registrada.'){
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
function missionButtons(m,large=false){
const external=m.link.startsWith('https:');
const main='<a class="action '+(large?'full':'')+'" href="'+esc(m.link)+'"'+(external?' target="_blank" rel="noopener noreferrer"':'')+' data-mission-link="'+esc(m.id)+'">'+esc(m.linkLabel)+' →</a>';
const doneButton=agency()?'':'<button class="action secondary '+(large?'full':'')+'" type="button" data-done="'+esc(m.id)+'">✓ Já fiz essa missão</button>';
return '<div class="groupactions" style="margin-top:16px">'+main+doneButton+'</div>';
}
function renderToday(){
const completed=missionDefs.filter(m=>done(m.id)).length;
$('progressCount').textContent=completed+' de '+missionDefs.length;
$('progressBox').setAttribute('aria-valuenow',String(completed));
$('progressFill').style.width=(completed/missionDefs.length*100)+'%';
const todo=missionDefs.filter(m=>!done(m.id));
const main=todo[0];
if(main){
$('primaryMission').innerHTML='<p class="mission-kicker">⚡ Uma coisa de cada vez</p><div class="mission-grid"><div class="illustration" aria-hidden="true">'+main.icon+'</div><div class="mission-text"><h2>'+esc(main.title)+'</h2><p>'+esc(main.description)+'</p><span class="timechip">⏱️ '+esc(main.time)+'</span></div></div>'+missionButtons(main,true)+ '<button type="button" data-help-mission="'+esc(main.id)+'" style="display:block;margin:14px auto 0;background:none;border:0;color:#2a6b80;text-decoration:underline;font-size:.82rem;font-weight:800">Não consigo fazer / preciso de ajuda</button>';
$('missionEstimate').textContent=main.time;
}else{
$('primaryMission').innerHTML='<div style="text-align:center;padding:16px 0"><div style="font-size:3.3rem">🏆</div><h2>Você concluiu as primeiras missões!</h2><p class="muted" style="margin:10px 0">A agência continua preparando as próximas novidades. Sem cobranças nem sequência obrigatória.</p></div>';
$('missionEstimate').textContent='Missões concluídas';
}
$('smallMissions').innerHTML=todo.slice(1,3).map(m=>'<div class="nextcard"><span class="symbol">'+m.icon+'</span><div><strong>'+esc(m.title)+'</strong><small>'+esc(m.short)+'</small></div></div>').join('')||'<div class="nextcard" style="grid-column:1/-1"><span class="symbol">🎉</span><strong>Você está em dia com as missões.</strong></div>';
renderApprovals();
}
function renderApprovals(){
const pending=pendingDrafts();
if(!pending.length){$('approvalArea').innerHTML='';return;}
$('approvalArea').innerHTML='<div class="sectionTitle"><h2>✉️ Publicação para você ver</h2><small>'+pending.length+' aguardando</small></div>'+
pending.slice(0,2).map(d=>'<article class="panel approval" data-review-card="'+esc(d.id)+'"><p class="eyebrow">A agência preparou · '+esc(d.format)+'</p><h2 style="margin:8px 0">'+esc(d.title)+'</h2><p class="small muted">'+esc(partner(d.partner).name)+' · Planejado para '+esc(formatDate(d.date))+'</p><div class="preview"><strong>Legenda para conferir</strong><p>'+esc(d.caption)+'</p>'+(d.previewUrl?'<a class="linktext" href="'+esc(d.previewUrl)+'" target="_blank" rel="noopener noreferrer">👀 Abrir prévia da foto ou vídeo ↗</a>':'<p class="tiny muted" style="margin-top:8px">A equipe ainda não anexou uma prévia visual.</p>')+'</div><p class="small muted">Gostou? Você pode aprovar ou pedir uma alteração. Nada será publicado automaticamente.</p><div class="groupactions" style="margin-top:12px"><button type="button" class="action" data-approve="'+esc(d.id)+'" '+(!d.previewUrl||agency()?'disabled':'')+'>✓ Gostei, aprovar</button><button type="button" class="action secondary" data-request-change="'+esc(d.id)+'" '+(agency()?'disabled':'')+'>✏️ Pedir ajuste</button></div><form class="benefitForm" data-changes-form="'+esc(d.id)+'" hidden><label class="field-label" for="notes-'+esc(d.id)+'">O que a agência deve mudar?</label><textarea id="notes-'+esc(d.id)+'" class="field" name="familyNote" maxlength="450" placeholder="Ex.: Escolher outra foto"></textarea><button type="submit" class="action full">Enviar pedido de ajuste</button></form></article>').join('');
}
function formatDate(date){if(!/^20\d\d-\d\d-\d\d$/.test(date||''))return date||'a definir';const [y,m,d]=date.split('-');return d+'/'+m+'/'+y;}
function renderAgenda(){
const items=Array.isArray(window.FUTTALENTO_SCHEDULE)?window.FUTTALENTO_SCHEDULE:[];
const now=todayISO();
const upcoming=items.filter(x=>x.date>=now),list=upcoming.length?upcoming:items;
$('agendaList').innerHTML=list.map(x=>'<article class="event"><div class="date">'+esc(x.date.slice(8,10))+'<br>'+esc(x.date.slice(5,7))+'</div><div style="flex:1"><h3>'+({story:'📱 Story',reel:'🎬 Reel',post:'🖼️ Carrossel'}[x.type]||'📍 Conteúdo')+' · '+esc(partner(x.partner).name)+'</h3><p>'+esc(x.note)+'</p><p style="margin-top:6px">🟡 Em planejamento pela agência</p></div></article>').join('')||'<div class="panel">A agência ainda está organizando as próximas datas.</div>';
}
function renderConquistas(){
const achievements=[
{icon:'🌱',title:'Primeiro passo',desc:'Conheceu os apoiadores',unlocked:done('confirm_partners')},
{icon:'📸',title:'Compartilhou um momento',desc:'Enviou material para a equipe',unlocked:done('send_photo')},
{icon:'💌',title:'Primeira aprovação',desc:'Aprovou uma publicação real',unlocked:approvedDrafts().length>0},
{icon:'🎁',title:'Apoio recebido',desc:'Registrou um benefício',unlocked:(state.benefits||[]).length>0}
];
$('achievementGrid').innerHTML=achievements.map(a=>'<div class="achievement '+(a.unlocked?'unlocked':'')+'"><span class="badgeicon" aria-hidden="true">'+a.icon+'</span><strong>'+esc(a.title)+'</strong><small>'+esc(a.unlocked?'Conquistado!':a.desc)+'</small></div>').join('');
$('partnerCards').innerHTML=catalog.map(p=>'<article class="partnerCard"><span style="font-size:1.75rem">'+p.icon+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.kind)+'</small><a class="linktext tiny" href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">Conhecer ↗</a></article>').join('');
$('benefitList').innerHTML=(state.benefits||[]).length?state.benefits.slice().reverse().map(b=>'<div class="benefit"><span class="ico">'+partner(b.partner).icon+'</span><div><b>'+esc(b.description)+'</b><small>'+esc(partner(b.partner).name)+' · '+esc(formatDate(b.date))+'</small><small>'+(b.verification==='verified_by_agency'?'✅ Confirmado pela agência':'⏳ Aguardando conferência da equipe')+'</small></div></div>').join(''):'<p class="small muted" style="margin-top:13px">Ainda não registramos benefícios nesta jornada. Quando receber algo, basta tocar no botão abaixo.</p>';
}
function render(){renderToday();renderAgenda();renderConquistas();setView(activeView);}
function setView(name){
if(!['hoje','agenda','conquistas'].includes(name))name='hoje';activeView=name;
document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id==='view-'+name));
document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-current',x.dataset.view===name?'page':'false'));
}
function bindEvents(){
$('loginForm').addEventListener('submit',submit);
document.querySelectorAll('[data-view]').forEach(x=>x.addEventListener('click',()=>{setView(x.dataset.view);window.scrollTo({top:0,behavior:'smooth'})}));
$('primaryMission').addEventListener('click',async e=>{
const id=e.target.closest('[data-done]')?.dataset.done;
if(id){await act('complete_mission',{missionId:id,done:true},'Boa! Mais uma missão concluída. 🌟');return;}
const help=e.target.closest('[data-help-mission]')?.dataset.helpMission;
if(help){const mission=missionDefs.find(x=>x.id===help);if(!mission)return;
await act('request_help',{message:'Preciso de ajuda: '+mission.title},'Seu pedido de ajuda ficou registrado. A agência verá no painel; para resposta imediata use o WhatsApp.');
}
});
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
$('benefitToggle').addEventListener('click',()=>{
const shown=$('benefitForm').hidden;$('benefitForm').hidden=!shown;$('benefitToggle').setAttribute('aria-expanded',String(shown));if(shown)$('benefitPartner').focus();
});
$('benefitForm').addEventListener('submit',async e=>{
e.preventDefault();const description=$('benefitDescription').value.trim(),partnerId=$('benefitPartner').value,date=$('benefitDate').value;
if(description.length<3||!date){$('benefitMessage').textContent='Preencha o benefício e a data.';return;}
await act('confirm_benefit',{partner:partnerId,description,date},'Apoio registrado! A agência poderá confirmar as informações.');
$('benefitDescription').value='';$('benefitForm').hidden=true;$('benefitToggle').setAttribute('aria-expanded','false');$('benefitMessage').textContent='';
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
$('benefitDate').value=todayISO();
bindEvents();preparePWA();
load().catch(e=>{showLogin();$('loginMessage').textContent='Sem conexão com os registros no momento. Confira sua internet e tente novamente.';});
})();