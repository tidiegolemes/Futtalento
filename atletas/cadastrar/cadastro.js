(()=>{
'use strict';
const $=id=>document.getElementById(id);
const register=$('ftRegister'),login=$('ftLogin'),verify=$('ftVerify'),status=$('ftSignupStatus');
const entry=$('ftEntry'),passwordPane=$('ftPasswordPane'),emailStart=$('ftEmailStart'),passwordStart=$('ftPasswordStart');
const stages=[entry,passwordPane,register,login,verify];
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
  body.photo=await photoData(photo.files?.[0]);
  const data=await request('complete',body);
  if(data.verified){show(null);say(data.message||'Página publicada!',data.profile?.page);return}
  show(verify);
  $('ftVerifyDescription').textContent=data.emailSent?
   'Enviamos um código para o seu e-mail. Confirme para publicar o atleta.':
   'Seu perfil está salvo, mas a verificação de e-mail ainda não foi ativada. Nenhum dado do atleta será publicado até a confirmação.';
  say(data.message);
 }catch(error){say(error.message)}finally{button.disabled=false}
});
login.addEventListener('submit',async event=>{
 event.preventDefault();if(!login.reportValidity())return;
 const button=login.querySelector('[type=submit]');button.disabled=true;
 try{
  const f=new FormData(login),data=await request('login',Object.fromEntries(f));
  if(data.needsProfile){show(register);return}
  if(data.verified){show(null);say('Você já possui uma página publicada. Veja o perfil na vitrine.','/atletas/')}
  else{show(verify);say('Você entrou. Seu perfil permanece privado até a confirmação do e-mail.')}
 }catch(error){say(error.message)}finally{button.disabled=false}
});
$('ftVerifyForm').addEventListener('submit',async event=>{
 event.preventDefault();if(!event.currentTarget.reportValidity())return;
 const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const code=String(new FormData(event.currentTarget).get('code')||'');
  const data=await request('verify',{code});
  show(null);say('Página criada e publicada! Seu atleta já pode aparecer na vitrine.',data.profile?.page);
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
      if(result.needsProfile){show(register);return}
      if(result.verified){show(null);say('Você entrou com Google. Acesse sua página na vitrine.',result.page||'/atletas/')}
      else{show(verify);say('Confirme seu e-mail para publicar o atleta.')}
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
  if(data.verified){show(null,false);say('Você já tem um atleta cadastrado. Acesse a vitrine.','/atletas/');return}
  show(verify,false);
  $('ftVerifyDescription').textContent=data.emailVerificationConfigured?
   'Digite o código enviado ao e-mail para publicar a página.':
   'Seu cadastro está salvo. A verificação por e-mail ainda precisa ser ativada pelo FutTalento.';
 }).catch(()=>show(entry,false));
initGoogle();
})();
