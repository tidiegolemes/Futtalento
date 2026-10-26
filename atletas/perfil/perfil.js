(()=>{
'use strict';const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const slug=params.get('id');const loading=$('ftProfileLoading');
if(!slug||!/^[a-z0-9-]{4,90}$/.test(slug)){loading.textContent='Link do atleta inválido.';return}
const text=(id,value)=>$(id).textContent=value||'';
(async()=>{
 try{
  const r=await fetch('/api/captacao-lead?onboarding=1&action=profile&slug='+encodeURIComponent(slug),{cache:'no-store'});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Perfil indisponível');
  const p=data.profile;
  if(!p){throw Error('Perfil não encontrado')}
  document.title=p.name+' — Perfil oficial | FutTalento';
  const key=p.clubKey||'';
  const theme=key.includes('cruzeiro')?'cruzeiro-rs':key.includes('gremio')?'gremio':key.includes('internacional')?'internacional':key.includes('juventude')?'juventude':'outro';
  document.body.dataset.club=theme;
  // Expor apenas dados autorizados de perfis publicados. Jamais serializar birthDate, contatos ou registros do responsável.
  const canonical='https://www.futtalento.com.br/atletas/perfil/?id='+encodeURIComponent(slug);
  const clean=v=>typeof v==='string'?v.trim():'';
  const plain=[clean(p.position),clean(p.club),clean(p.category)].filter(Boolean).join(' · ');
  const description=clean(p.name)+' — trajetória no futebol de base'+(plain?' ('+plain+')':'')+'. Perfil público autorizado no FutTalento.';
  const descriptionNode=document.querySelector('meta[name="description"]');
  if(descriptionNode)descriptionNode.content=description;
  let canonicalNode=document.querySelector('link[rel="canonical"]');
  if(!canonicalNode){canonicalNode=document.createElement('link');canonicalNode.rel='canonical';document.head.append(canonicalNode);}
  canonicalNode.href=canonical;
  const upsertMeta=(property,value)=>{
    let el=document.querySelector('meta[property="'+property+'"]');
    if(!el){el=document.createElement('meta');el.setAttribute('property',property);document.head.append(el);}
    el.content=value;
  };
  upsertMeta('og:type','profile');
  upsertMeta('og:title',clean(p.name)+' — Perfil FutTalento');
  upsertMeta('og:description',description);
  upsertMeta('og:url',canonical);
  const absoluteImage=new URL(p.image,location.origin);
  if(absoluteImage.protocol==='https:'&&absoluteImage.origin===location.origin)upsertMeta('og:image',absoluteImage.href);
  const person={
    '@type':'Person','@id':canonical+'#athlete',
    name:clean(p.name),url:canonical,
    identifier:'futtalento:'+slug,
    description,
    hasOccupation:{'@type':'Occupation',name:'Atleta de futebol de base'},
    knowsAbout:['Futebol']
  };
  if(clean(p.position)&&p.position!=='Atleta de base')person.jobTitle=clean(p.position)+' · atleta de futebol de base';
  if(clean(p.club)&&!['Sem clube','Formação esportiva'].includes(p.club))person.affiliation={
    '@type':'SportsTeam',name:clean(p.club),sport:'Futebol',
    description:'Clube informado pelo responsável no perfil público do atleta.'
  };
  if(absoluteImage.protocol==='https:'&&absoluteImage.origin===location.origin)person.image=absoluteImage.href;
  const socials=Object.values(p.socials||{}).filter(url=>{
    try{const parsed=new URL(url);return parsed.protocol==='https:';}catch{return false;}
  });
  if(socials.length)person.sameAs=socials;
  const graph={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'ProfilePage','@id':canonical+'#webpage',url:canonical,
       name:clean(p.name)+' — Perfil oficial | FutTalento',inLanguage:'pt-BR',
       mainEntity:{'@id':person['@id']}},
      person,
      {'@type':'BreadcrumbList','@id':canonical+'#breadcrumb',itemListElement:[
        {'@type':'ListItem',position:1,name:'Início',item:'https://www.futtalento.com.br/'},
        {'@type':'ListItem',position:2,name:'Atletas',item:'https://www.futtalento.com.br/atletas/'},
        {'@type':'ListItem',position:3,name:clean(p.name),item:canonical}
      ]}
    ]
  };
  const oldJsonLd=document.getElementById('ft-athlete-structured-data');
  if(oldJsonLd)oldJsonLd.remove();
  const jsonld=document.createElement('script');
  jsonld.id='ft-athlete-structured-data';jsonld.type='application/ld+json';
  jsonld.textContent=JSON.stringify(graph).replace(/</g,'\\u003c');
  document.head.append(jsonld);
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
  const resp=await fetch('/api/captacao-lead?onboarding=1&action=interest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
  const info=await resp.json();if(!resp.ok||!info.ok)throw Error(info.error||'Não foi possível enviar');
  $('ftInterestStatus').textContent=info.message;form.reset();
 }catch(e){$('ftInterestStatus').textContent=e.message}finally{btn.disabled=false}
});
})();