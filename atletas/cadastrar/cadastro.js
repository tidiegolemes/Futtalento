(()=>{
'use strict';
const $=id=>document.getElementById(id);
const register=$('ftRegister'),login=$('ftLogin'),verify=$('ftVerify'),status=$('ftSignupStatus');
const route='/api/captacao-lead?onboarding=1';
const say=(message,link)=>{
 status.hidden=false;status.textContent=message;
 if(link){const a=document.createElement('a');a.href=link;a.textContent='Abrir página do atleta →';a.style.display='block';a.style.marginTop='12px';status.append(a)}
 status.scrollIntoView({behavior:'smooth',block:'nearest'});
};
const request=async(action,body)=>{
 const response=await fetch(route+'?action='+action,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||'Não foi possível concluir');
 return data;
};
document.querySelectorAll('[data-auth-tab]').forEach(button=>button.addEventListener('click',()=>{
 const selected=button.dataset.authTab;
 register.hidden=selected!=='register';login.hidden=selected!=='login';verify.hidden=true;status.hidden=true;
 document.querySelectorAll('[data-auth-tab]').forEach(b=>{let on=b===button;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
}));
async function photoData(file){
 if(!file||file.size>8_000_000||!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('Escolha uma imagem JPG, PNG ou WebP com até 8 MB');
 const image=await createImageBitmap(file);
 const ratio=Math.min(1,900/image.width,1200/image.height),w=Math.round(image.width*ratio),h=Math.round(image.height*ratio);
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);image.close();
 let quality=.85,result;
 do{result=canvas.toDataURL('image/jpeg',quality);quality-=.12}while(result.length>460000&&quality>.25);
 if(result.length>470000)throw Error('Imagem muito grande. Escolha outra foto mais leve.');
 return result;
}
const photo=register.elements.photoFile;photo.addEventListener('change',()=>{
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
  const data=await request('register',body);
  register.hidden=true;verify.hidden=false;
  $('ftVerifyDescription').textContent=data.emailSent?
   'Enviamos um código para o email informado. Digite-o para ativar a página oficial do atleta.':
   'Seu cadastro privado foi criado. A publicação depende da configuração do envio de email pela equipe FutTalento.';
  say(data.message);
 }catch(error){say(error.message)}finally{button.disabled=false}
});
login.addEventListener('submit',async event=>{
 event.preventDefault();if(!login.reportValidity())return;
 const button=login.querySelector('[type=submit]');button.disabled=true;
 try{
  const f=new FormData(login),data=await request('login',Object.fromEntries(f));
  login.hidden=true;
  if(data.verified){say('Email confirmado. Você pode acompanhar a página oficial na vitrine.');location.href='/atletas/'}
  else{verify.hidden=false;say('Você entrou. Seu perfil permanece privado até a confirmação do email.')}
 }catch(error){say(error.message)}finally{button.disabled=false}
});
$('ftVerifyForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const code=String(new FormData(event.currentTarget).get('code')||'');
  const data=await request('verify',{code});
  verify.hidden=true;say('Página criada e publicada! Seu atleta já pode aparecer na vitrine.',data.profile?.page);
 }catch(error){say(error.message)}finally{button.disabled=false}
});
fetch(route+'?action=session',{credentials:'same-origin',cache:'no-store'}).then(x=>x.json()).then(data=>{
 if(data.loggedIn&&!data.verified){register.hidden=true;login.hidden=true;verify.hidden=false;
 $('ftVerifyDescription').textContent=data.emailVerificationConfigured?'Digite o código enviado ao seu email.':'Seu cadastro está salvo, mas a verificação por email ainda não foi ativada pelo FutTalento.';}
}).catch(()=>{});
})();