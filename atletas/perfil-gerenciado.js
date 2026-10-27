/* Aplica somente atualizações aprovadas do responsável, sem reescrever registros esportivos históricos. */
(()=>{
 'use strict';
 const slug=document.currentScript?.dataset.athlete;
 if(!['lucas','ryan','thalles'].includes(slug))return;
 const query='/api/captacao-lead?onboarding=1&action=managed-profile&slug='+encodeURIComponent(slug);
 fetch(query,{cache:'no-store'}).then(async response=>{
  if(response.status===404)return null;
  if(!response.ok)throw Error('Perfil indisponível');
  return response.json();
 }).then(result=>{
  if(!result?.ok||!result.profile)return;
  const p=result.profile,hero=document.querySelector('.profile-hero');
  if(!hero)return;
  if(p.image){
   const img=hero.querySelector('.portrait > img');
   if(img){img.removeAttribute('onerror');img.onerror=null;img.src=p.image;img.alt='Imagem autorizada de '+p.name;}
  }
  if(p.club){
   const club=hero.querySelector('.club-float span');
   if(club&&club.textContent.trim()!==p.club){
    club.textContent=p.club;
    const crest=hero.querySelector('.club-float img');
    if(crest)crest.hidden=true; // não atribuir escudo de outro clube
   }
  }
  const chips=hero.querySelectorAll('.chips span');
  if(chips[0]&&p.position)chips[0].textContent=p.position;
  if(chips[1]&&p.category)chips[1].textContent=p.category;
  const socials=hero.querySelector('.social-row');
  if(socials){
   socials.replaceChildren();
   for(const key of ['instagram','tiktok','youtube','website']){
    const raw=p.socials?.[key];
    if(!raw)continue;
    let u;try{u=new URL(raw);}catch{continue}
    if(u.protocol!=='https:'||u.username||u.password)continue;
    const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent=({instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',website:'Site'})[key]+' ↗';
    socials.append(a);
   }
  }
  if(p.titles){
   const box=document.createElement('section');
   box.className='container section-grid ft-guardian-update';
   const heading=document.createElement('h2');heading.textContent='Atualização autorizada do responsável';
   const detail=document.createElement('p');detail.textContent=p.titles;
   box.append(heading,detail);
   hero.insertAdjacentElement('afterend',box);
  }
 }).catch(()=>{/* O perfil histórico permanece acessível caso o complemento esteja indisponível. */});
})();
