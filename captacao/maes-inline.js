// Share the same secure guardian registration UI inside the Para Famílias page.
const host=document.getElementById('ftMotherSignup');
if(host){
 try{
  const response=await fetch('/atletas/cadastro/',{cache:'no-store'});
  if(!response.ok)throw Error('O cadastro não está disponível neste momento.');
  const page=new DOMParser().parseFromString(await response.text(),'text/html');
  const auth=page.getElementById('authPanel'),profile=page.getElementById('profilePanel');
  if(!auth||!profile)throw Error('Não foi possível abrir o cadastro.');
  host.replaceChildren(auth,profile);
  // Register only once, after both sections have been mounted.
  await import('/atletas/cadastro/cadastro.js');
 }catch(error){
  host.textContent='Não foi possível carregar o cadastro. ';
  const retry=document.createElement('a');
  retry.href='/atletas/cadastro/';
  retry.textContent='Abrir cadastro seguro ↗';
  host.append(retry);
 }
}