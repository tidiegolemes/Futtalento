/* FutTalento: same-page athlete sponsorship checkout. Financial processing stays inside the existing /checkout/ route. */
(()=>{
'use strict';
const dialog=document.getElementById('ftInlineCheckout');
const frame=document.getElementById('ftCheckoutFrame');
const plans=document.getElementById('ftInlinePlans');
const payment=document.getElementById('ftInlinePayment');
const barter=document.getElementById('ftInlineBarter');
const barterForm=document.getElementById('ftBarterForm');
const barterStatus=document.getElementById('ftBarterStatus');
const wait=document.getElementById('ftFrameWait');
const close=document.getElementById('ftCloseCheckout');
const back=document.getElementById('ftBackToPlans');
const separate=document.getElementById('ftCheckoutStandalone');
if(!dialog||!frame||!plans||!payment||typeof dialog.showModal!=='function')return;
const athletes={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
const clubLabel={lucas:'Grêmio FBPA',ryan:'Cruzeiro-RS · registros 2026',thalles:'E.C. Juventude'};
const moneyPlans=new Set(['primeiro-passe','time-titular','camisa-10']);
const safeAthlete=id=>Object.hasOwn(athletes,id)?id:null;
let activeAthlete=null,activePlan=null,previousFocus=null,issued=false;
const isOpen=()=>dialog.open;
const showStep=step=>{
 const paymentActive=step==='payment',barterActive=step==='barter';
 plans.hidden=paymentActive||barterActive;
 payment.hidden=!paymentActive;
 barter.hidden=!barterActive;
 if(barterActive){document.getElementById('ftBarterName')?.focus({preventScroll:true});}
 else if(paymentActive){back.focus({preventScroll:true})}
 else{dialog.querySelector('[data-ft-plan]')?.focus({preventScroll:true})}
};
const srcFor=(athlete,plan)=>'/checkout/?'+new URLSearchParams({atleta:athlete,plano:plan,embed:'1'}).toString();
function openWith(athlete,plan=null){
 if(!safeAthlete(athlete))return;
 if(issued&&activeAthlete!==athlete){
  // Preserve the original issued Pix. It can still be paid and must not be silently discarded.
  dialog.dataset.locked='true';
  document.getElementById('ftSelectedAthleteName').textContent=athletes[activeAthlete];
  if(!isOpen())dialog.showModal();
  showStep('payment');
  wait.hidden=false;wait.textContent='Já existe uma cobrança Pix nesta sessão. Confira o pagamento antes de gerar outra. Você pode abrir a contratação separadamente, se necessário.';
  return;
 }
 const sameAthlete=activeAthlete===athlete;
 activeAthlete=athlete;
 document.getElementById('ftSelectedAthleteName').textContent=athletes[athlete];
 document.getElementById('ftSelectedAthleteClub').textContent=clubLabel[athlete];
 const card=document.querySelector('.talent-card[data-athlete="'+athlete+'"]');
 const photo=card?.querySelector('.talent-poster>img');
 const preview=document.getElementById('ftSelectedAthleteImage');
 if(photo){
  preview.src=photo.currentSrc||photo.src;
  preview.alt='Foto de '+athletes[athlete];
 }
 if(!isOpen()){
  previousFocus=document.activeElement;
  dialog.showModal();
  document.documentElement.classList.add('ft-dialog-is-open');
 }
 if(moneyPlans.has(plan)){
  choose(plan);
 }else if(plan==='permuta'){
  document.getElementById('ftBarterAthlete').textContent=athletes[athlete];
  barterForm.hidden=false;
  document.getElementById('ftBarterSuccess').hidden=true;
  barterStatus.textContent='';
  showStep('barter');
 }else if(issued&&sameAthlete&&activePlan){
  showStep('payment');
 }else{
  showStep('plans');
 }
}
function choose(plan){
 if(!moneyPlans.has(plan)||!activeAthlete)return;
 if(issued){
  if(activePlan===plan){showStep('payment');return;}
  wait.hidden=false;
  wait.textContent='Existe um Pix em andamento. Conclua ou verifique a cobrança antes de escolher outro plano.';
  showStep('payment');return;
 }
 activePlan=plan;
 frame.hidden=false;
 frame.title='Checkout Pix do atleta '+athletes[activeAthlete];
 wait.hidden=false;wait.textContent='Carregando checkout seguro...';
 frame.src=srcFor(activeAthlete,plan);
 separate.href='/checkout/?'+new URLSearchParams({atleta:activeAthlete,plano:plan}).toString();
 showStep('payment');
}
function closeDialog(){
 if(isOpen())dialog.close();
}
document.addEventListener('click',event=>{
 const action=event.target.closest('[data-inline-athlete], [data-ft-plan], [data-inline-permuta], [data-ft-permuta]');
 if(action&&action.hasAttribute('data-inline-permuta')){
  event.preventDefault();
  openWith(action.dataset.inlinePermuta,'permuta');
  return;
 }
 if(action&&action.hasAttribute('data-ft-permuta')){
  event.preventDefault();
  if(!issued){
   document.getElementById('ftBarterAthlete').textContent=athletes[activeAthlete]||'o atleta';
   barterForm.hidden=false;
   document.getElementById('ftBarterSuccess').hidden=true;
   barterStatus.textContent='';
   showStep('barter');
  }else{
   wait.hidden=false;wait.textContent='Primeiro confira o Pix já emitido antes de iniciar outra proposta nesta sessão.';
  }
  return;
 }
 if(action&&action.hasAttribute('data-inline-athlete')){
  const athlete=action.dataset.inlineAthlete;
  if(!safeAthlete(athlete))return;
  if(action.tagName==='A')event.preventDefault();
  openWith(athlete,moneyPlans.has(action.dataset.inlinePlan)?action.dataset.inlinePlan:null);
  return;
 }
 const plan=action?.dataset.ftPlan;
 if(moneyPlans.has(plan)){event.preventDefault();choose(plan);}
});
document.getElementById('ftBackFromBarter')?.addEventListener('click',()=>showStep('plans'));
document.getElementById('ftBarterDone')?.addEventListener('click',closeDialog);
barterForm?.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!activeAthlete||!barterForm.reportValidity())return;
 const fd=new FormData(barterForm);
 const whatsapp=String(fd.get('whatsapp')||'').replace(/\\D/g,'');
 const descricaoPermuta=String(fd.get('descricaoPermuta')||'').trim();
 if(whatsapp.length<10||whatsapp.length>13){barterStatus.textContent='Informe um WhatsApp válido com DDD.';return;}
 if(descricaoPermuta.length<15||descricaoPermuta.length>400){barterStatus.textContent='Descreva sua proposta entre 15 e 400 caracteres.';return;}
 const button=document.getElementById('ftBarterSend');
 button.disabled=true;button.textContent='Enviando proposta...';barterStatus.textContent='';
 try{
  const data={
   persona:'empresa',plano:'permuta',interesse:'permuta',atleta:activeAthlete,
   nome:String(fd.get('nome')||''),empresa:String(fd.get('empresa')||''),
   whatsapp,tipoPermuta:String(fd.get('tipoPermuta')||''),descricaoPermuta,
   consent:fd.has('consent'),website:String(fd.get('website')||''),
   utm_source:'marketplace-atletas',utm_medium:'organic',utm_campaign:'permuta'
  };
  const res=await fetch('/api/captacao-lead',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const response=await res.json().catch(()=>({}));
  if(!res.ok||!response.ok)throw Error(response.error||'Não foi possível registrar sua permuta.');
  if(response.ignored)throw Error('Não foi possível registrar o pedido. Tente novamente.');
  barterForm.hidden=true;document.getElementById('ftBarterSuccess').hidden=false;
  document.getElementById('ftBarterSuccess').focus();
  barterForm.reset();
 }catch(e){barterStatus.textContent=e.message||'Falha de conexão. Tente novamente.';}
 finally{button.disabled=false;button.textContent='Enviar proposta de permuta →';}
});

close?.addEventListener('click',closeDialog);
back?.addEventListener('click',()=>{
 if(issued){wait.hidden=false;wait.textContent='Você já gerou um Pix. Consulte esta cobrança antes de tentar outra.';return;}
 frame.removeAttribute('src');frame.hidden=true;
 activePlan=null;showStep('plans');
});
frame.addEventListener('load',()=>{
 // Explicit messages come only from our own checkout origin.
 if(!issued)wait.hidden=true;
});
dialog.addEventListener('click',event=>{if(event.target===dialog)closeDialog()});
dialog.addEventListener('close',()=>{
 document.documentElement.classList.remove('ft-dialog-is-open');
 dialog.dataset.locked='';
 if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
 if(!event.data||event.data.type!=='futtalento.checkout.status')return;
 if(event.data.status==='issued'){issued=true;back.hidden=true;wait.hidden=true;}
 if(event.data.status==='active'){issued=true;back.hidden=true;wait.hidden=true;}
});
const query=new URLSearchParams(location.search);
const presetSupport=query.get('apoio'),presetBarter=query.get('permuta');
if(safeAthlete(presetSupport)){
 const choice=query.get('plano');
 openWith(presetSupport,moneyPlans.has(choice)?choice:null);
}else if(safeAthlete(presetBarter)){openWith(presetBarter,'permuta');}

// Direct one-step checkout links remain valid when JavaScript is unavailable.
})();
