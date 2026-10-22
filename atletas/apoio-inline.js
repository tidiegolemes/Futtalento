/* FutTalento: same-page athlete sponsorship checkout. Financial processing stays inside the existing /checkout/ route. */
(()=>{
'use strict';
const dialog=document.getElementById('ftInlineCheckout');
const frame=document.getElementById('ftCheckoutFrame');
const plans=document.getElementById('ftInlinePlans');
const payment=document.getElementById('ftInlinePayment');
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
 const paymentActive=step==='payment';
 plans.hidden=paymentActive;payment.hidden=!paymentActive;
 if(paymentActive){back.focus({preventScroll:true})}else{dialog.querySelector('[data-ft-plan]')?.focus({preventScroll:true})}
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
 const action=event.target.closest('[data-inline-athlete], [data-ft-plan]');
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
// Direct one-step checkout links remain valid when JavaScript is unavailable.
})();
