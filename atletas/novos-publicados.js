/* FutTalento · Perfis publicados somente após revisão. Nunca renderizar dados privados. */
(()=>{
 const rail=document.getElementById('talentRail');if(!rail)return;
 const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const e=(tag,cls,value)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(value!==undefined)n.textContent=String(value);return n;
 };
 const append=(parent,...children)=>{parent.append(...children);return parent};
 const teamClass=club=>/cruzeiro/i.test(club)?'team-cruzeiro':/gr[eê]mio/i.test(club)?'team-gremio':/juventude/i.test(club)?'team-juventude':/internacional/i.test(club)?'team-inter':'team-outro';
 function createCard(p){
  if(!/^at-[a-f0-9]{20}$/.test(p?.slug)||typeof p.name!=='string'||!p.name.trim())return null;
  const name=p.name.trim().slice(0,110),club=String(p.club||'Clube em definição').slice(0,110);
  const link='/atletas/perfil/?id='+encodeURIComponent(p.slug);
  const card=e('article','talent-card ft-new-card ft-reel-card '+teamClass(club));
  card.dataset.athlete=p.slug;
  card.dataset.clubs=norm(club).replace(/[^a-z0-9]+/g,'-');
  card.dataset.keywords=[name,club,p.position,p.titles].join(' ');
  const stage=e('div','ft-new-stage');
  const photo=e('div','ft-new-poster');
  const img=e('img');img.alt='Imagem autorizada de '+name;img.loading='lazy';img.decoding='async';
  img.src=typeof p.photoUrl==='string'&&p.photoUrl.startsWith('https://')?p.photoUrl:'/futtalentologo.png';
  img.onerror=()=>{img.onerror=null;img.src='/futtalentologo.png'};
  const shade=e('span','ft-new-shade');
  const brand=e('span','ft-new-brand','✦ FUTTALENTO');
  const official=e('span','ft-new-mark','PERFIL PUBLICADO');
  const details=e('div','ft-new-details');
  append(details,e('span','ft-new-label','UM TALENTO PARA APOIAR'),e('h3','',name),
    e('p','',club+' · '+(p.position||'Atleta em formação')));
  const highlights=e('p','ft-new-highlights',p.highlights||p.titles||'Uma jornada esportiva em construção.');
  photo.append(img,shade,brand,official,details,highlights);
  const impact=e('div','ft-new-impact');
  const h=e('div','ft-new-impact-header');
  append(h,e('span','ft-new-brand','✦ FUTTALENTO'),e('small','','JORNADA · 2/2'));
  const cover=e('div','ft-new-impact-title');
  append(cover,e('span','','POTENCIAL DE APOIO'),e('h3','',name));
  const title=e('div','ft-new-data');
  append(title,e('strong','','Trajetória esportiva'),e('p','',p.titles||'Conquistas em documentação'),
    e('strong','','Acompanhamento e campanhas'),e('p','','Seu apoio pode transformar a jornada deste atleta. Métricas de alcance ainda não foram verificadas.'));
  impact.append(h,cover,title);
  const track=e('div','ft-new-track');track.append(photo,impact);
  const controls=e('div','ft-new-controls');const prev=e('button','','‹'),next=e('button','','›'),dots=e('span','','●  ○');
  prev.type='button';next.type='button';prev.setAttribute('aria-label','Slide anterior');next.setAttribute('aria-label','Próximo slide');
  let active=0;
  const go=n=>{active=Math.max(0,Math.min(1,n));track.scrollTo({left:active*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});prev.disabled=active===0;next.disabled=active===1;dots.textContent=active?'○  ●':'●  ○'};
  prev.addEventListener('click',()=>go(active-1));next.addEventListener('click',()=>go(active+1));
  track.addEventListener('scroll',()=>{active=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));prev.disabled=active===0;next.disabled=active===1;dots.textContent=active?'○  ●':'●  ○'},{passive:true});
  controls.append(prev,dots,next);stage.append(track,controls);
  const footer=e('div','ft-new-footer');
  const full=e('a','talent-more','Ver perfil completo ↗');full.href=link;
  const support=e('a','talent-cta','Quero apoiar '+name.split(' ')[0]+' →');
  // Plan access requires agency onboarding; do not falsely attribute an existing athlete checkout.
  support.href='/para-empresas/?atleta='+encodeURIComponent(p.slug)+'&utm_content=atleta_publicado';
  append(footer,full,support);
  card.append(stage,footer);
  return card;
 }
 fetch('/api/captacao-lead?cadastroAtleta=1&public=1',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{
  let added=0;
  for(const p of data.athletes||[]){
   if(rail.querySelector('[data-athlete="'+p.slug+'"]'))continue;
   const card=createCard(p);if(card){rail.append(card);added++}
  }
  if(added)window.dispatchEvent(new CustomEvent('ft:athletes-updated'));
 }).catch(()=>{/* Static verified athletes remain available. */});
})();
