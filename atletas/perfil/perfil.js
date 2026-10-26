(()=>{
'use strict';const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const slug=params.get('id');const loading=$('ftProfileLoading');
if(!slug||!/^[a-z0-9-]{4,90}$/.test(slug)){loading.textContent='Link do atleta inválido.';return}
const text=(id,value)=>$(id).textContent=value||'';
(async()=>{
 try{
  const r=await fetch('/api/athlete-onboarding?action=profile&slug='+encodeURIComponent(slug),{cache:'no-store'});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Perfil indisponível');
  const p=data.profile;
  if(!p){throw Error('Perfil não encontrado')}
  document.title=p.name+' — Perfil oficial | FutTalento';
  const key=p.clubKey||'';
  const theme=key.includes('cruzeiro')?'cruzeiro-rs':key.includes('gremio')?'gremio':key.includes('internacional')?'internacional':key.includes('juventude')?'juventude':'outro';
  document.body.dataset.club=theme;
  text('ftAthleteName',p.name);text('ftAthleteClub',p.club||'Formação esportiva');text('ftClubBadge',p.club||'FutTalento');
  text('ftAthletePosition',p.position);text('ftAthleteCategory',p.category);
  text('ftAthleteIntro','Conheça a trajetória de '+p.name+' no futebol de base, preparada a partir das informações autorizadas pelo responsável.');
  text('ftAthleteHistory',p.name+' constrói sua jornada esportiva com treinamentos, competições e experiências de formação.');
  text('ftAthleteTitles',p.titles||'Títulos e conquistas aguardando documentação.');
  const img=$('ftAthletePhoto');img.src=p.image;img.alt='Foto esportiva de '+p.name;
  const social=$('ftAthleteSocials');
  for(const [key,url] of Object.entries(p.socials||{})){
   if(!['instagram','tiktok','youtube','website'].includes(key))continue;
   const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=({instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',website:'Site'})[key]+' ↗';social.append(a);
  }
  if(!social.children.length)social.textContent='Redes sociais ainda não cadastradas.';
  $('ftPublicProfile').hidden=false;loading.hidden=true;
 }catch(error){loading.textContent=error.message||'Perfil temporariamente indisponível'}
})();
$('ftInterestForm').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
 const btn=form.querySelector('button');btn.disabled=true;
 try{
  const d=Object.fromEntries(new FormData(form));d.slug=slug;d.consent=!!form.elements.consent.checked;
  const resp=await fetch('/api/athlete-onboarding?action=interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  const info=await resp.json();if(!resp.ok||!info.ok)throw Error(info.error||'Não foi possível enviar');
  $('ftInterestStatus').textContent=info.message;form.reset();
 }catch(e){$('ftInterestStatus').textContent=e.message}finally{btn.disabled=false}
});
})();