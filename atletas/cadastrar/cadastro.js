(()=>{
'use strict';
const $=id=>document.getElementById(id);
const register=$('ftRegister'),login=$('ftLogin'),verify=$('ftVerify'),status=$('ftSignupStatus');
const entry=$('ftEntry'),passwordPane=$('ftPasswordPane'),emailStart=$('ftEmailStart'),passwordStart=$('ftPasswordStart');
const claim=$('ftClaimForm'),claimPending=$('ftClaimPending');
const stages=[entry,passwordPane,register,login,verify,claim,claimPending];
register.elements.birthDate.max=new Date().toISOString().slice(0,10);
const route='/api/captacao-lead?onboarding=1';
const show=(element,scroll=true)=>{
 stages.forEach(el=>{el.hidden=el!==element});
 status.hidden=true;
 if(element&&scroll)element.scrollIntoView({behavior:'smooth',block:'nearest'});
};
const say=(message,link)=>{
 status.hidden=false;status.textContent=message;
 if(link){
  const a=document.createElement('a');a.href=link;a.textContent='Abrir página do atleta →';
  a.style.display='block';a.style.marginTop='12px';status.append(a);
 }
 status.scrollIntoView({behavior:'smooth',block:'nearest'});
};
const request=async(action,body)=>{
 const response=await fetch(route+'&action='+encodeURIComponent(action),{
  method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
 });
 const data=await response.json();
 if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível concluir');
 return data;
};
async function showEditor(){
 try{
  const response=await fetch(route+'&action=my-profile',{credentials:'same-origin',cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok||!data.profile)throw Error(data.error||'Perfil indisponível');
  const profile=data.profile;
  for(const key of ['athleteName','guardianName','guardianPhone','club','position','category','titles','birthDate'])
   if(register.elements[key])register.elements[key].value=profile[key]||'';
  for(const key of ['instagram','tiktok','youtube','website'])
   register.elements[key].value=profile.socials?.[key]||'';
  for(const key of ['adultGuardian','guardianConsent','publicationConsent'])
   register.elements[key].checked=true;
  register.elements.athleteName.readOnly=true;
  register.elements.guardianName.readOnly=true;
  register.elements.guardianPhone.readOnly=true;
  register.elements.birthDate.readOnly=true;
  register.elements.photoFile.required=false;
  register.dataset.editing='true';
  $('ftOpenClaim').hidden=true;
  $('ftPhotoLabel').textContent='Atualizar foto (opcional)';
  $('ftProfileIntro').textContent='Seu perfil já foi publicado. Edite seus dados esportivos sem criar uma nova página.';
  $('ftProfileSubmit').firstChild.textContent='Salvar alterações ';
  show(register,false);say('Gerenciamento do perfil ativo.',profile.page);
  if(data.managedAthlete==='lucas'){
   const link=document.createElement('a');
   link.href='/sponsor/lucas/';
   link.textContent='Abrir Minha Jornada do Lucas →';
   link.style.display='block';link.style.marginTop='10px';
   status.append(link);
  }
 }catch(error){show(null);say(error.message)}
}
async function afterLogin(data,scroll=true){
 if(data.claimStatus==='pending'){
  show(data.verified?claimPending:verify,scroll);
  if(!data.verified)$('ftVerifyDescription').textContent='Confirme seu e-mail para validar o pedido de vínculo.';
  return;
 }
 if(data.claimStatus==='approved'||(data.verified&&!data.needsProfile)){
  await showEditor();return;
 }
 if(data.claimStatus==='rejected'){
  show(claim,scroll);say('A solicitação anterior não foi aprovada. Fale com a equipe.');return;
 }
 if(data.needsProfile){show(register,scroll);return}
 show(verify,scroll);
}
$('ftOpenClaim').addEventListener('click',()=>show(claim));
$('ftBackFromClaim').addEventListener('click',()=>show(register));
claim.addEventListener('submit',async event=>{
 event.preventDefault();if(!claim.reportValidity())return;
 const button=claim.querySelector('[type=submit]');button.disabled=true;
 try{
  const f=new FormData(claim),body=Object.fromEntries(f);
  for(const key of ['adultGuardian','guardianConsent','publicationConsent'])body[key]=f.has(key);
  const data=await request('request-claim',body);
  show(data.requiresEmailVerification?verify:claimPending);
  if(data.requiresEmailVerification)$('ftVerifyDescription').textContent=data.emailSent?
   'Digite o código enviado ao seu e-mail para validar o pedido.':
   'O código não pôde ser enviado. Solicite suporte à equipe.';
  say(data.message);
 }catch(error){say(error.message)}finally{button.disabled=false}
});
const setEmailForLogin=email=>{login.elements.email.value=email||''};
const openLogin=()=>{setEmailForLogin(emailStart.elements.email.value);show(login);login.elements.email.focus({preventScroll:true})};
$('ftShowLogin').addEventListener('click',openLogin);
$('ftBackFromLogin').addEventListener('click',()=>show(entry));
$('ftBackToEmail').addEventListener('click',()=>show(entry));
emailStart.addEventListener('submit',event=>{
 event.preventDefault();if(!emailStart.reportValidity())return;
 $('ftChosenEmail').textContent=emailStart.elements.email.value.trim();
 show(passwordPane);
 passwordStart.elements.password.focus({preventScroll:true});
});
passwordStart.addEventListener('submit',async event=>{
 event.preventDefault();if(!passwordStart.reportValidity())return;
 const button=passwordStart.querySelector('[type=submit]');button.disabled=true;
 try{
  await request('start',{email:emailStart.elements.email.value.trim(),password:passwordStart.elements.password.value});
  passwordStart.reset();show(register);
 }catch(error){
  if(/já tem cadastro/i.test(error.message)){openLogin();say('Este e-mail já está cadastrado. Entre para continuar.')}
  else say(error.message);
 }finally{button.disabled=false}
});
async function photoData(file){
 if(!file||file.size>8_000_000||!/^image\/(jpeg|png|webp)$/.test(file.type))
  throw Error('Escolha uma imagem JPG, PNG ou WebP com até 8 MB');
 const image=await createImageBitmap(file);
 const ratio=Math.min(1,900/image.width,1200/image.height),w=Math.round(image.width*ratio),h=Math.round(image.height*ratio);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);image.close();
 let quality=.85,result;
 do{result=canvas.toDataURL('image/jpeg',quality);quality-=.12}while(result.length>460000&&quality>.25);
 if(result.length>470000)throw Error('Imagem muito grande. Escolha outra foto mais leve.');
 return result;
}
const photo=register.elements.photoFile;
photo.addEventListener('change',()=>{
 const file=photo.files?.[0],preview=$('ftPhotoPreview');
 if(!file){preview.hidden=true;return}
 const url=URL.createObjectURL(file);preview.onload=()=>URL.revokeObjectURL(url);preview.src=url;preview.hidden=false;
});
register.addEventListener('submit',async event=>{
 event.preventDefault();if(!register.reportValidity())return;
 const button=register.querySelector('[type=submit]');button.disabled=true;status.hidden=true;
 try{
  const f=new FormData(register);
  const body=Object.fromEntries([...f.entries()].filter(([key])=>key!=='photoFile'));
  for(const key of ['adultGuardian','guardianConsent','publicationConsent'])body[key]=f.has(key);
  body.photo=photo.files?.[0]?await photoData(photo.files[0]):null;
  if(register.dataset.editing==='true'){
   const saved=await request('update-profile',body);
   say(saved.message||'Alterações salvas',saved.page);return;
  }
  const data=await request('complete',body);
  if(data.verified){await showEditor();say(data.message||'Página publicada!',data.profile?.page);return}
  show(verify);
  $('ftVerifyDescription').textContent=data.emailSent?
   'Enviamos um código para o seu e-mail. Confirme para publicar o atleta.':
   'Seu perfil está salvo, mas a verificação de e-mail ainda não foi ativada. Nenhum dado do atleta será publicado até a confirmação.';
  say(data.message);
 }catch(error){
   if(/já possui perfil oficial/i.test(error.message)){
    const name=register.elements.athleteName.value.toLowerCase();
    claim.elements.athlete.value=name.includes('lucas')?'lucas':name.includes('ryan')?'ryan':'thalles';
    show(claim);
   }
   say(error.message);
  }finally{button.disabled=false}
});
login.addEventListener('submit',async event=>{
 event.preventDefault();if(!login.reportValidity())return;
 const button=login.querySelector('[type=submit]');button.disabled=true;
 try{
  const f=new FormData(login),data=await request('login',Object.fromEntries(f));
  await afterLogin(data);
  if(!data.verified&&!data.claimStatus)say('Você entrou. O perfil permanece privado até a confirmação do e-mail.')
 }catch(error){say(error.message)}finally{button.disabled=false}
});
$('ftVerifyForm').addEventListener('submit',async event=>{
 event.preventDefault();if(!event.currentTarget.reportValidity())return;
 const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const code=String(new FormData(event.currentTarget).get('code')||'');
  const data=await request('verify',{code});
  if(data.claimPending){show(claimPending);say(data.message||'E-mail confirmado. Aguarde validação da equipe.')}
  else{await showEditor();say('Página criada e publicada! Seu atleta já pode aparecer na vitrine.',data.profile?.page);}
 }catch(error){say(error.message)}finally{button.disabled=false}
});
$('ftResendCode').addEventListener('click',async()=>{
 const button=$('ftResendCode');button.disabled=true;
 try{const data=await request('resend',{});say(data.message||'Código enviado.')}
 catch(error){say(error.message)}finally{button.disabled=false}
});
async function initGoogle(){
 try{
  const response=await fetch(route+'&action=google-config',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  if(!data.clientId||typeof data.clientId!=='string')return;
  const googleArea=$('ftGoogleSignIn');
  const script=document.createElement('script');
  script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
  script.onload=()=>{
   if(!window.google?.accounts?.id)return;
   window.google.accounts.id.initialize({
    client_id:data.clientId,callback:async response=>{
     if(!response?.credential)return;
     try{
      const result=await request('google',{credential:response.credential});
      await afterLogin(result);
      if(!result.verified&&!result.claimStatus)say('Confirme seu e-mail para publicar o atleta.')
     }catch(error){say(error.message)}
    }
   });
   window.google.accounts.id.renderButton($('ftGoogleButton'),{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width:300});
   googleArea.hidden=false;
  };
  document.head.append(script);
 }catch(_){/* O fluxo por e-mail permanece disponível. */}
}
fetch(route+'&action=session',{credentials:'same-origin',cache:'no-store'})
 .then(x=>x.json()).then(data=>{
  if(!data.loggedIn){show(entry,false);return}
  if(data.needsProfile){show(register,false);return}
  if(data.verified||data.claimStatus){afterLogin(data,false);return}
  show(verify,false);
  $('ftVerifyDescription').textContent=data.emailVerificationConfigured?
   'Digite o código enviado ao e-mail para publicar a página.':
   'Seu cadastro está salvo. A verificação por e-mail ainda precisa ser ativada pelo FutTalento.';
 }).catch(()=>show(entry,false));
initGoogle();
})();
