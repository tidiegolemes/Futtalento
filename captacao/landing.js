(()=>{
'use strict';
const form=document.getElementById('leadForm');
if(!form)return;
const persona=form.dataset.persona;
const submit=document.getElementById('submitLead');
const feedback=document.getElementById('formFeedback');
const success=document.getElementById('leadSuccess');
const urlParams=new URLSearchParams(location.search);
const clean=v=>String(v||'').slice(0,65);
const allowedFields=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const phoneField=document.getElementById('whatsapp');
const local=()=>{try{return localStorage.getItem('futtalento_analytics_consent')}catch{return null}};
function sendEvent(){
 const enabled=document.getElementById('metricsConsent')?.checked===true||local()==='granted';
 if(!enabled)return;
 if(document.getElementById('metricsConsent')?.checked===true){
   try{localStorage.setItem('futtalento_analytics_consent','granted')}catch(e){}
 }
 window.dataLayer=window.dataLayer||[];
 window.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
 const tag=document.createElement('script');
 tag.async=true;
 tag.src='https://www.googletagmanager.com/gtm.js?id=GTM-KWG5W6XZ';
 document.head.appendChild(tag);
 window.dataLayer.push({
   event:'futtalento_lead_submit',
   lead_persona:persona,
   lead_source:clean(urlParams.get('utm_source')||'site'),
   lead_medium:clean(urlParams.get('utm_medium')||'organic')
 });
}
const athleteSelect=document.getElementById('atleta');
const preset=urlParams.get('atleta');
if(athleteSelect&&['lucas','ryan','thalles'].includes(preset))athleteSelect.value=preset;
const planNames={'primeiro-passe':'Primeiro Passe - R$ 99/mês','time-titular':'Time Titular - R$ 249/mês','camisa-10':'Camisa 10 - R$ 499/mês'};
const athleteNames={lucas:'Lucas Azambuja',ryan:'Ryan Coelho',thalles:'Thalles Silvino'};
const planInput=document.getElementById('plano');
const planNote=document.getElementById('chosenPlanNote');
function syncAthlete(){const node=document.getElementById('selectedAthleteName');if(node)node.textContent=athleteNames[athleteSelect?.value]||'um atleta do FutTalento';}
athleteSelect?.addEventListener('change',syncAthlete);
syncAthlete();
document.querySelectorAll('[data-plan]').forEach(button=>button.addEventListener('click',()=>{
 const plan=button.dataset.plan;
 if(!planNames[plan])return;
 const selected=athleteSelect?.value||'lucas';
 const query=new URLSearchParams({plano:plan,atleta:['lucas','ryan','thalles'].includes(selected)?selected:'lucas'});
 location.assign('/checkout/?'+query.toString());
}));
const rail=document.getElementById('athleteRail');
if(rail){
  const slides=[...rail.querySelectorAll('.athlete-tile')],counter=document.getElementById('athleteCounter');
  function currentIndex(){let best=0,distance=Infinity;slides.forEach((s,i)=>{const x=Math.abs(s.offsetLeft-rail.scrollLeft-rail.offsetLeft);if(x<distance){distance=x;best=i;}});return best;}
  function updateCounter(){if(counter)counter.textContent=(currentIndex()+1)+' de '+slides.length;}
  rail.addEventListener('scroll',updateCounter,{passive:true});
  document.querySelectorAll('[data-slide]').forEach(button=>button.addEventListener('click',()=>{const delta=Number(button.dataset.slide)||0;const idx=Math.max(0,Math.min(slides.length-1,currentIndex()+delta));slides[idx]?.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});}));
  rail.querySelectorAll('[data-select-athlete]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.selectAthlete,select=document.getElementById('atleta');
    if(!select||!['lucas','ryan','thalles'].includes(id))return;
    select.value=id;
    syncAthlete();
    document.getElementById('planos')?.scrollIntoView({behavior:'smooth',block:'start'});
  }));
  rail.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const idx=Math.max(0,Math.min(slides.length-1,currentIndex()+(e.key==='ArrowRight'?1:-1)));slides[idx]?.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});});
  updateCounter();
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 feedback.textContent='';
 const digits=(phoneField.value||'').replace(/\D/g,'');
 if(digits.length<10||digits.length>13){feedback.textContent='Confira seu WhatsApp com DDD.';phoneField.focus();return;}
 const fields=new FormData(form);
 if(persona==='empresa'&&!planNames[fields.get('plano')||'']){
  feedback.textContent='Escolha um pacote antes de solicitar a proposta.';
  document.getElementById('planos')?.scrollIntoView({behavior:'smooth'});
  return;
 }
 const data={persona,nome:fields.get('nome'),whatsapp:digits,
   plano:persona==='empresa'?(fields.get('plano')||''):'',
   cidade:fields.get('cidade')||'',empresa:fields.get('empresa')||'',
   interesse:fields.get('interesse'),atleta:persona==='empresa'?(fields.get('atleta')||''):'',website:fields.get('website')||'',
   consent:fields.has('consent'),responsavel:persona==='familia'?fields.has('responsavel'):false};
 for(const key of allowedFields)data[key]=clean(urlParams.get(key));
 submit.disabled=true;
 const label=submit.textContent;submit.textContent='Registrando...';
 try{
   const res=await fetch('/api/captacao-lead',{
     method:'POST',credentials:'same-origin',cache:'no-store',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify(data)
   });
   const response=await res.json().catch(()=>({}));
   if(!res.ok||!response.ok)throw new Error(response.error||'Não foi possível enviar agora.');
   form.hidden=true;
   success.hidden=false;
   success.setAttribute('tabindex','-1');
   success.focus();
   sendEvent();
 }catch(error){
   feedback.textContent=error.message||'Houve uma falha. Tente novamente.';
 }finally{
   submit.disabled=false;submit.textContent=label;
 }
});
})();
