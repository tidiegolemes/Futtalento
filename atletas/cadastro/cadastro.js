const $=id=>document.getElementById(id);
const status=msg=>{$('status').textContent=msg};
const auth=$('authForm'),profile=$('profileForm');
async function api(body,method='POST'){
 const res=await fetch('/api/captacao-lead?cadastroAtleta=1',{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Falha ao salvar');return data;
}
function collect(form){
 const f=new FormData(form),obj=Object.fromEntries(f.entries());
 return {name:obj.name,guardianName:obj.guardianName,guardianPhone:obj.guardianPhone,
 club:obj.club,position:obj.position,birthDate:obj.birthDate,titles:obj.titles,
 photoUrl:obj.photoUrl,highlights:obj.highlights,networks:{instagram:obj.instagram,tiktok:obj.tiktok,youtube:obj.youtube,site:obj.site},
 guardianAttested:true,consentToDisplay:f.has('consentToDisplay')};
}
function fill(p){
 if(!p)return;
 for(const name of ['name','guardianName','guardianPhone','club','position','birthDate','titles','photoUrl','highlights']){
  const x=profile.elements.namedItem(name);if(x)x.value=p[name]||'';
 }
 for(const n of ['instagram','tiktok','youtube','site']){
  const x=profile.elements.namedItem(n);if(x)x.value=p.networks?.[n]||'';
 }
 profile.elements.namedItem('consentToDisplay').checked=!!p.consentToDisplay;
}
async function load(){
 try{
  const response=await fetch('/api/captacao-lead?cadastroAtleta=1',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  $('authPanel').hidden=true;$('profilePanel').hidden=false;fill(data.profile);
  status(data.profile?.status==='revisao'?'Perfil enviado para revisão. A página ficará pública após aprovação.':
         data.profile?.status==='publicado'?'Seu perfil já está publicado. Para editar, solicite revisão à agência.':
         'Conta criada. Complete o perfil e salve.');
 }catch{status('Não foi possível carregar os dados agora.')}
}
auth.addEventListener('submit',async e=>{
 e.preventDefault();
 if(!auth.reportValidity())return;
 const f=new FormData(auth),button=e.submitter;
 const action=button?.dataset.action||'signup';
 const payload={action,email:f.get('email'),password:f.get('password'),guardianAttested:f.has('guardianAttested'),website:f.get('website')};
 try{status('Validando acesso...');await api(payload);auth.reset();await load()}
 catch(err){status(err.message)}
});
auth.querySelector('[data-action="login"]').addEventListener('click',async()=>{
 const f=new FormData(auth);if(!f.get('email')||!f.get('password'))return status('Informe e-mail e senha para entrar.');
 try{await api({action:'login',email:f.get('email'),password:f.get('password')});auth.reset();await load()}catch(err){status(err.message)}
});
profile.addEventListener('submit',async e=>{
 e.preventDefault();if(!profile.reportValidity())return;
 try{const data=await api({...collect(profile),action:'save'});status('Rascunho salvo. Prévia: '+location.origin+data.profileUrl)}catch(err){status(err.message)}
});
$('submitProfile').addEventListener('click',async()=>{
 if(!profile.reportValidity())return;
 try{const data=await api({...collect(profile),action:'submit'});status('Recebido! Perfil criado em modo privado e encaminhado para revisão. Link da página após aprovação: '+location.origin+data.profileUrl)}catch(err){status(err.message)}
});
$('logout').addEventListener('click',async()=>{try{await api({action:'logout'})}finally{location.reload()}});
load();