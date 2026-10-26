/* Mesmo fluxo verificado de cadastro, apresentado dentro da página Para Famílias. */
(()=>{
 const mount=document.getElementById('ftFamilyRegistration');
 if(!mount)return;
 fetch('/atletas/cadastrar/',{cache:'no-store',credentials:'same-origin'})
 .then(async response=>{if(!response.ok)throw Error('Cadastro indisponível');return response.text()})
 .then(html=>{
  const documentFragment=new DOMParser().parseFromString(html,'text/html');
  const panel=documentFragment.querySelector('.ft-onboard-panel');
  if(!panel||!panel.querySelector('#ftRegister')||!panel.querySelector('#ftVerify'))throw Error('Formulário indisponível');
  mount.replaceChildren(panel);
  // O código original tem validação, login, foto, confirmação por e-mail e estado da sessão.
  const script=document.createElement('script');
  script.src='/atletas/cadastrar/cadastro.js';
  script.defer=true;
  script.onerror=()=>{mount.textContent='Falha ao iniciar o cadastro. ';showFallback()};
  document.body.append(script);
 })
 .catch(()=>{mount.textContent='Não foi possível carregar o formulário neste momento. ';showFallback()});
 function showFallback(){
  const link=document.createElement('a');
  link.href='/atletas/cadastrar/';
  link.textContent='Abrir cadastro seguro do FutTalento ↗';
  mount.append(link);
 }
})();